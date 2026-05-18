import { isQuantityPixel } from "../../domain/ocr/quantity-ocr";
import { channelDistance, colorDistance, sameColor } from "../../domain/shared/color";
import type { BankGrid } from "./bank-grid";
import { isFrameOrScrollbarPixel } from "./bank-grid";
import { pixelColorAt, readImageDataChannel } from "./image-data";

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface CellBackgroundOptions {
  readonly includeSimilar?: boolean;
}

export function makeFullShapeImageData(imageData: ImageData, grid: BankGrid, mode = "damaged"): ImageData {
  const out = new ImageData(imageData.width, imageData.height);
  const removeSimilarBackground = mode === "restored";

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;

      const backgroundColors = cellBackgroundColors(imageData, x, y, w, h, { includeSimilar: removeSimilarBackground });
      const backgroundMask = removeSimilarBackground ? connectedCellBackgroundMask(imageData, x, y, w, h, backgroundColors) : null;
      for (let py = y; py < y + h; py += 1) {
        for (let px = x; px < x + w; px += 1) {
          const offset = (py * imageData.width + px) * 4;
          const r = readImageDataChannel(imageData.data, offset);
          const g = readImageDataChannel(imageData.data, offset + 1);
          const b = readImageDataChannel(imageData.data, offset + 2);
          const a = readImageDataChannel(imageData.data, offset + 3);
          const backgroundRemoved = backgroundMask
            ? backgroundMask[(py - y) * w + (px - x)]
            : matchesCellBackground(r, g, b, backgroundColors, removeSimilarBackground);
          const visible =
            a > 20 &&
            !backgroundRemoved &&
            !isQuantityPixelInCell(r, g, b, px - x, py - y);
          out.data[offset] = 0;
          out.data[offset + 1] = 0;
          out.data[offset + 2] = 0;
          out.data[offset + 3] = visible ? 255 : 0;
        }
      }
    }
  }

  return out;
}

export function connectedGridBackgroundMask(imageData: ImageData, grid: BankGrid, backgroundColor: RgbColor): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue: number[] = [];
  const minX = Math.max(0, grid.x);
  const minY = Math.max(0, grid.y);
  const maxX = Math.min(width - 1, grid.x + grid.columns * grid.cell - 1);
  const maxY = Math.min(height - 1, grid.y + grid.rows * grid.cell - 1);

  const add = (x: number, y: number) => {
    if (x < minX || y < minY || x > maxX || y > maxY) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (
      !sameColor(
        readImageDataChannel(data, offset),
        readImageDataChannel(data, offset + 1),
        readImageDataChannel(data, offset + 2),
        backgroundColor
      )
    ) {
      return;
    }
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = minX; x <= maxX; x += 1) {
    add(x, minY);
    add(x, maxY);
  }
  for (let y = minY + 1; y < maxY; y += 1) {
    add(minX, y);
    add(maxX, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    if (index === undefined) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    add(x + 1, y);
    add(x - 1, y);
    add(x, y + 1);
    add(x, y - 1);
  }

  return mask;
}

function cellBackgroundColors(imageData: ImageData, x: number, y: number, w: number, h: number, options: CellBackgroundOptions = {}): RgbColor[] {
  const counts = new Map<string, number>();
  const addSample = (px: number, py: number) => {
    if (options.includeSimilar && !isCellBackgroundSamplePoint(px - x, py - y, w, h)) return;
    const color = pixelColorAt(imageData, px, py);
    if (isQuantityPixel(color.r, color.g, color.b)) return;
    if (isFrameOrScrollbarPixel(color.r, color.g, color.b)) return;
    if (!isSlotBackgroundCandidate(color.r, color.g, color.b)) return;
    const key = `${color.r},${color.g},${color.b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const minX = x;
  const maxX = x + w - 1;
  const minY = y;
  const maxY = y + h - 1;
  const step = 2;

  for (let py = minY; py <= maxY; py += step) {
    for (let px = minX; px <= maxX; px += step) {
      addSample(px, py);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return [pixelColorAt(imageData, x, y)];

  const topCount = ranked[0]?.[1] ?? 0;
  const minimumCount = options.includeSimilar ? Math.max(2, topCount * 0.08) : topCount;
  return ranked
    .filter((entry) => entry[1] >= minimumCount)
    .slice(0, options.includeSimilar ? 3 : 1)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
    });
}

function matchesCellBackground(r: number, g: number, b: number, backgroundColors: readonly RgbColor[], includeSimilar: boolean): boolean {
  if (!includeSimilar) return backgroundColors.some((color) => sameColor(r, g, b, color));
  if (!isSlotBackgroundCandidate(r, g, b)) return false;
  return backgroundColors.some((color) => channelDistance(r, g, b, color) <= 5 && colorDistance(r, g, b, color) <= 14);
}

function connectedCellBackgroundMask(imageData: ImageData, x: number, y: number, w: number, h: number, backgroundColors: readonly RgbColor[]): Uint8Array {
  const mask = new Uint8Array(w * h);
  const queue: number[] = [];
  const add = (localX: number, localY: number) => {
    if (localX < 0 || localY < 0 || localX >= w || localY >= h) return;
    const index = localY * w + localX;
    if (mask[index]) return;
    const offset = ((y + localY) * imageData.width + x + localX) * 4;
    const r = readImageDataChannel(imageData.data, offset);
    const g = readImageDataChannel(imageData.data, offset + 1);
    const b = readImageDataChannel(imageData.data, offset + 2);
    if (!matchesCellBackground(r, g, b, backgroundColors, true)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let px = 0; px < w; px += 1) {
    add(px, 0);
    add(px, h - 1);
  }
  for (let py = 1; py < h - 1; py += 1) {
    add(0, py);
    add(w - 1, py);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    if (index === undefined) continue;
    const localX = index % w;
    const localY = Math.floor(index / w);
    add(localX + 1, localY);
    add(localX - 1, localY);
    add(localX, localY + 1);
    add(localX, localY - 1);
  }

  return mask;
}

function isSlotBackgroundCandidate(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 24 && max <= 88 && max - min <= 18 && r <= g + 12 && g <= r + 12;
}

function isCellBackgroundSamplePoint(x: number, y: number, w: number, h: number): boolean {
  const band = Math.max(6, Math.floor(Math.min(w, h) * 0.18));
  return x < band || y < band || x >= w - band || y >= h - band;
}

function isQuantityPixelInCell(r: number, g: number, b: number, x: number, y: number): boolean {
  return x < 26 && y < 17 && isQuantityPixel(r, g, b);
}
