import type { BoundingBox } from "../../domain/shared/geometry";
import { connectedComponents, dilate, getGridCellSize } from "./bank-grid";
import { readImageDataChannel } from "./image-data";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const MIN_COMPONENT_AREA = 24;
const MAX_COMPONENT_SIZE = 42;

export function detectStorageMaterialBoxes(imageData: ImageData): BoundingBox[] {
  const cell = getGridCellSize();
  const centers = clusterCenters(detectStorageMaterialCenters(imageData), cell);
  return makeCellBoxesFromCenters(centers, cell, imageData.width, imageData.height);
}

export function storageMaterialContentArea(boxes: readonly BoundingBox[]): BoundingBox | null {
  if (!boxes.length) return null;
  const bounds = boxes.reduce<Bounds>(
    (current, box) => ({
      minX: Math.min(current.minX, box.x),
      minY: Math.min(current.minY, box.y),
      maxX: Math.max(current.maxX, box.x + box.w - 1),
      maxY: Math.max(current.maxY, box.y + box.h - 1)
    }),
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: -1, maxY: -1 }
  );
  return {
    x: bounds.minX,
    y: bounds.minY,
    w: bounds.maxX - bounds.minX + 1,
    h: bounds.maxY - bounds.minY + 1
  };
}

function detectStorageMaterialCenters(imageData: ImageData): Point[] {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (
        isStorageMaterialPixel(
          readImageDataChannel(data, offset),
          readImageDataChannel(data, offset + 1),
          readImageDataChannel(data, offset + 2)
        )
      ) {
        mask[y * width + x] = 1;
      }
    }
  }

  return connectedComponents(dilate(mask, width, height, 2), width, height)
    .filter((box) => isMaterialComponent(box))
    .map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }));
}

function clusterCenters(centers: readonly Point[], cell: number): Point[] {
  const clusters: { x: number; y: number; count: number }[] = [];
  const maxDistance = cell * 0.55;

  for (const center of centers) {
    const cluster = clusters.find(
      (candidate) => Math.abs(candidate.x - center.x) <= maxDistance && Math.abs(candidate.y - center.y) <= maxDistance
    );
    if (cluster) {
      cluster.x = (cluster.x * cluster.count + center.x) / (cluster.count + 1);
      cluster.y = (cluster.y * cluster.count + center.y) / (cluster.count + 1);
      cluster.count += 1;
    } else {
      clusters.push({ x: center.x, y: center.y, count: 1 });
    }
  }

  return clusters.map(({ x, y }) => ({ x, y }));
}

function makeCellBoxesFromCenters(centers: readonly Point[], cell: number, imageWidth: number, imageHeight: number): BoundingBox[] {
  const columns = clusterAxis(centers.map((center) => center.x), cell);
  const rows = clusterAxis(centers.map((center) => center.y), cell);
  const boxesByKey = new Map<string, BoundingBox>();

  for (const center of centers) {
    const column = closestAxisValue(columns, center.x);
    const row = closestAxisValue(rows, center.y);
    if (column === null || row === null) continue;
    const x = Math.max(0, Math.min(imageWidth - cell, Math.round(column - cell / 2)));
    const y = Math.max(0, Math.min(imageHeight - cell, Math.round(row - cell / 2)));
    boxesByKey.set(`${x}:${y}`, {
      x,
      y,
      w: Math.min(cell, imageWidth - x),
      h: Math.min(cell, imageHeight - y)
    });
  }

  return [...boxesByKey.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

function clusterAxis(values: readonly number[], cell: number): number[] {
  const clusters: { value: number; count: number }[] = [];
  const maxDistance = cell * 0.45;

  for (const value of [...values].sort((a, b) => a - b)) {
    const cluster = clusters.find((candidate) => Math.abs(candidate.value - value) <= maxDistance);
    if (cluster) {
      cluster.value = (cluster.value * cluster.count + value) / (cluster.count + 1);
      cluster.count += 1;
    } else {
      clusters.push({ value, count: 1 });
    }
  }

  return clusters.map((cluster) => cluster.value);
}

function closestAxisValue(values: readonly number[], target: number): number | null {
  let closest: number | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const value of values) {
    const distance = Math.abs(value - target);
    if (distance < closestDistance) {
      closest = value;
      closestDistance = distance;
    }
  }
  return closest;
}

function isMaterialComponent(box: BoundingBox): boolean {
  const area = box.area || 0;
  if (area < MIN_COMPONENT_AREA) return false;
  if (box.w > MAX_COMPONENT_SIZE || box.h > MAX_COMPONENT_SIZE) return false;
  return box.w >= 4 && box.h >= 4;
}

function isStorageMaterialPixel(r: number, g: number, b: number): boolean {
  if (isStorageBackgroundPixel(r, g, b)) return false;
  if (isFramePixel(r, g, b)) return false;
  if (isQuantityTextPixel(r, g, b)) return false;
  const tooDark = r < 24 && g < 24 && b < 24;
  return !tooDark;
}

function isStorageBackgroundPixel(r: number, g: number, b: number): boolean {
  return Math.abs(r - 48) + Math.abs(g - 43) + Math.abs(b - 38) <= 28;
}

function isFramePixel(r: number, g: number, b: number): boolean {
  const isBrightFrame = r > 175 && g > 155 && b > 120;
  const isGreenDivider = g > 150 && r < 120 && b < 140;
  return isBrightFrame || isGreenDivider;
}

function isQuantityTextPixel(r: number, g: number, b: number): boolean {
  return r > 145 && g > 145 && b < 95;
}
