import { isQuantityPixel } from "../../domain/ocr/quantity-ocr";
import { channelDistance, colorDistance, sameColor } from "../../domain/shared/color";
import { pixelColorAt, readImageDataChannel } from "./image-data";

const BANK_CELL_SIZE = 44;
const BANK_GRID_SHIFT_X = 0;
const BANK_GRID_SHIFT_Y = 0;

export interface BankGridBox {
  x: number;
  y: number;
  w: number;
  h: number;
  area?: number;
}

export interface BankGrid {
  readonly x: number;
  readonly y: number;
  readonly cell: number;
  readonly columns: number;
  readonly rows: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly lastOccupiedRow: number;
  readonly lastOccupiedColumn: number;
  readonly contentArea: (BankGridBox & { readonly infinity?: BankGridBox | null }) | null;
  readonly infinityArea: BankGridBox | null;
}

export interface EstimateBankGridOptions {
  readonly trimLastColumn?: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export function detectItemBoxes(imageData: ImageData, grid = estimateBankGrid(imageData)): BankGridBox[] {
  const boxes: BankGridBox[] = [];

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box) || isBeforeLastDetectedItem(row, column, grid)) boxes.push(box);
    }
  }

  return boxes;
}

export function estimateBankGrid(imageData: ImageData, options: EstimateBankGridOptions = {}): BankGrid {
  const bankContent = findBankContentArea(imageData);
  const centerSearchArea = bankContent
    ? { x: bankContent.x, y: bankContent.y + 8, w: bankContent.w, h: Math.max(1, bankContent.h - 8) }
    : null;
  const itemCenters = estimateItemCenters(imageData, centerSearchArea);
  const cell = getGridCellSize();
  const anchor = findFirstItemAnchor(itemCenters, cell);
  const x = bankContent ? bankContent.x : Math.max(0, Math.round(anchor.x - cell / 2 + getGridOffsetX()));
  const y = bankContent ? bankContent.y : Math.max(0, Math.round(anchor.y - cell / 2 + getGridOffsetY()));
  const content = bankContent
    ? { minX: bankContent.x, minY: bankContent.y, maxX: bankContent.x + bankContent.w - 1, maxY: bankContent.y + bankContent.h - 1 }
    : foregroundBounds(imageData);
  if (!bankContent) content.maxX = Math.min(content.maxX, bankContentRightLimit(imageData));

  const contentColumns = getGridColumns(countGridColumnsWithinContent(content.maxX - x + 1, cell));
  const contentRows = getGridRows(Math.max(1, Math.ceil((content.maxY - y + 1) / cell)));
  const itemExtent = gridExtentFromItemCenters(itemCenters, x, y, cell);
  const occupiedExtent = lastOccupiedGridCell(imageData, x, y, cell, content);
  const last = maxGridExtent(itemExtent, occupiedExtent);
  const columns = Math.max(1, contentColumns - (options.trimLastColumn ? 1 : 0));
  const rows = Math.min(contentRows, Math.max(1, last.row + 1));
  return {
    x,
    y,
    cell,
    columns,
    rows,
    maxX: content.maxX,
    maxY: content.maxY,
    lastOccupiedRow: last.row,
    lastOccupiedColumn: last.column,
    contentArea: bankContent,
    infinityArea: bankContent?.infinity || null
  };
}

function maxGridExtent(
  first: { readonly row: number; readonly column: number } | null,
  second: { readonly row: number; readonly column: number }
): { row: number; column: number } {
  if (!first) return second;
  if (second.row > first.row || (second.row === first.row && second.column > first.column)) return second;
  return first;
}

export function foregroundAlphaBounds(imageData: ImageData): BankGridBox | null {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = readImageDataChannel(imageData.data, offset);
      const g = readImageDataChannel(imageData.data, offset + 1);
      const b = readImageDataChannel(imageData.data, offset + 2);
      if (!isScreenshotShapePixel(r, g, b)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function getGridOffsetX(): number {
  return BANK_GRID_SHIFT_X;
}

export function getGridOffsetY(): number {
  return BANK_GRID_SHIFT_Y;
}

export function getGridCellSize(): number {
  return BANK_CELL_SIZE;
}

export function isFrameOrScrollbarPixel(r: number, g: number, b: number): boolean {
  const isFrameGold = r > 85 && g > 50 && g < 135 && b < 55;
  const isScrollbar = r > 145 && g > 100 && b > 45 && r > b + 45;
  const isBankLine = r > 55 && r < 120 && g > 40 && g < 95 && b < 55;
  return isFrameGold || isScrollbar || isBankLine;
}

export function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
}

export function connectedComponents(mask: Uint8Array, width: number, height: number): BankGridBox[] {
  const visited = new Uint8Array(mask.length);
  const boxes: BankGridBox[] = [];
  const queue: number[] = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    for (let qi = 0; qi < queue.length; qi += 1) {
      const current = queue[qi];
      if (current === undefined) continue;
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      area += 1;

      const neighbors: number[] = [current - 1, current + 1, current - width, current + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % width;
        if (Math.abs(nx - x) > 1) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }

    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }

  return boxes;
}

export function mergeCloseBoxes(boxes: readonly BankGridBox[], width: number, height: number): BankGridBox[] {
  const merged: BankGridBox[] = [];
  for (const box of boxes) {
    const target = merged.find((candidate) => boxesAreClose(candidate, box));
    if (target) {
      const minX = Math.min(target.x, box.x);
      const minY = Math.min(target.y, box.y);
      const maxX = Math.max(target.x + target.w, box.x + box.w);
      const maxY = Math.max(target.y + target.h, box.y + box.h);
      target.x = minX;
      target.y = minY;
      target.w = Math.min(maxX - minX, width - minX);
      target.h = Math.min(maxY - minY, height - minY);
      target.area = (target.area || 0) + (box.area || 0);
    } else {
      merged.push({ ...box });
    }
  }
  return merged.map((box) => expandBox(box, 2, width, height));
}

function isBeforeLastDetectedItem(row: number, column: number, grid: BankGrid): boolean {
  const lastColumn = Math.min(grid.columns - 1, grid.lastOccupiedColumn);
  return row < grid.lastOccupiedRow || (row === grid.lastOccupiedRow && column <= lastColumn);
}

function gridExtentFromItemCenters(centers: readonly Point[], gridX: number, gridY: number, cell: number): { row: number; column: number } | null {
  let last = null;
  for (const center of centers) {
    const column = Math.floor((center.x - gridX) / cell);
    const row = Math.floor((center.y - gridY) / cell);
    if (column < 0 || row < 0) continue;
    if (!last || row > last.row || (row === last.row && column > last.column)) last = { row, column };
  }
  return last;
}

function findBankContentArea(imageData: ImageData): (BankGridBox & { readonly infinity?: BankGridBox | null }) | null {
  const { width, height, data } = imageData;
  const framePixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (
        isFrameOrScrollbarPixel(
          readImageDataChannel(data, offset),
          readImageDataChannel(data, offset + 1),
          readImageDataChannel(data, offset + 2)
        )
      ) {
        framePixels[y * width + x] = 1;
      }
    }
  }

  const horizontalRuns = [];
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) count += framePixels[y * width + x] ?? 0;
    if (count > width * 0.45) horizontalRuns.push(y);
  }

  const verticalRuns = [];
  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = 0; y < height; y += 1) count += framePixels[y * width + x] ?? 0;
    if (count > height * 0.45) verticalRuns.push(x);
  }

  const topCandidates = horizontalRuns.filter((y) => y > 20 && y < height * 0.35);
  const bottomCandidates = horizontalRuns.filter((y) => y > height * 0.45);
  const leftCandidates = verticalRuns.filter((x) => x < width * 0.2);
  const rightCandidates = verticalRuns.filter((x) => x > width * 0.75);

  const top = topCandidates.length ? Math.max(...topCandidates) + 1 : null;
  const bottom = bottomCandidates.length ? Math.max(...bottomCandidates.filter((y) => y < height - 20)) - 1 : null;
  const left = leftCandidates.length ? Math.min(...leftCandidates) + 1 : null;
  const right = rightCandidates.length ? Math.max(...rightCandidates.filter((x) => x < width - 4)) - 1 : null;
  const infinity = findInfinitySymbolBounds(imageData);

  if (infinity && bottom !== null && right !== null) {
    const anchoredLeft = findContentLeftFromInfinity(imageData, infinity) ?? Math.max(0, infinity.x - 10);
    const anchoredTop = findContentTopAfterInfinity(imageData, infinity) ?? infinity.y + infinity.h + 8;
    const anchoredRight = findContentRightBeforeScrollbar(imageData, anchoredTop, bottom) ?? right;
    if (bottom > anchoredTop && right > anchoredLeft) {
      return { x: anchoredLeft, y: anchoredTop, w: anchoredRight - anchoredLeft + 1, h: bottom - anchoredTop + 1, infinity };
    }
  }

  if (top === null || bottom === null || left === null || right === null || bottom <= top || right <= left) return null;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function findInfinitySymbolBounds(imageData: ImageData): BankGridBox | null {
  const { width, height, data } = imageData;
  const maxX = Math.min(width - 1, 95);
  const maxY = Math.min(height - 1, 95);
  const minY = Math.min(maxY, 5);
  const mask = new Uint8Array(width * height);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      const r = readImageDataChannel(data, offset);
      const g = readImageDataChannel(data, offset + 1);
      const b = readImageDataChannel(data, offset + 2);
      const isInfinityPixel = r >= 90 && g >= 65 && b >= 30 && r > b + 25 && g > b + 8;
      if (isInfinityPixel) mask[y * width + x] = 1;
    }
  }

  return connectedComponents(dilate(mask, width, height, 1), width, height)
    .filter((box) => box.x >= 5 && box.x < 60 && box.y >= minY && box.w >= 16 && box.w <= 56 && box.h >= 10 && box.h <= 38)
    .sort((a, b) => infinitySymbolScore(b) - infinitySymbolScore(a))[0] || null;
}

function infinitySymbolScore(box: BankGridBox): number {
  const aspect = box.w / Math.max(1, box.h);
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - 1.9) / 1.9);
  const positionScore = 1 - Math.min(1, (Math.abs(box.x - 18) + Math.abs(box.y - 18)) / 80);
  return (box.area || 0) + aspectScore * 120 + positionScore * 80;
}

function findContentTopAfterInfinity(imageData: ImageData, infinity: BankGridBox): number | null {
  const { width, height, data } = imageData;
  const startY = Math.min(height - 1, infinity.y + infinity.h + 8);
  const endY = Math.min(height - 1, startY + 60);

  for (let y = startY; y <= endY; y += 1) {
    let contentPixels = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (
        isBankContentBackgroundPixel(
          readImageDataChannel(data, offset),
          readImageDataChannel(data, offset + 1),
          readImageDataChannel(data, offset + 2)
        )
      ) {
        contentPixels += 1;
      }
    }
    if (contentPixels > width * 0.55) return y;
  }

  return null;
}

function findContentLeftFromInfinity(_imageData: ImageData, infinity: BankGridBox): number {
  return Math.max(0, infinity.x - 10);
}

function findContentRightBeforeScrollbar(imageData: ImageData, top: number, bottom: number): number | null {
  const { width, data } = imageData;
  const minY = Math.max(0, top);
  const maxY = Math.min(imageData.height - 1, bottom);
  let runEnd = null;

  for (let x = width - 1; x >= Math.floor(width * 0.75); x -= 1) {
    let edgePixels = 0;
    for (let y = minY; y <= maxY; y += 1) {
      const offset = (y * width + x) * 4;
      const r = readImageDataChannel(data, offset);
      const g = readImageDataChannel(data, offset + 1);
      const b = readImageDataChannel(data, offset + 2);
      if (isFrameOrScrollbarPixel(r, g, b)) edgePixels += 1;
    }
    if (edgePixels > (maxY - minY + 1) * 0.22) {
      if (runEnd === null) runEnd = x;
      continue;
    }
    if (runEnd !== null) return Math.max(0, x - 3);
  }

  return null;
}

function isBankContentBackgroundPixel(r: number, g: number, b: number): boolean {
  return Math.abs(r - 48) <= 8 && Math.abs(g - 43) <= 8 && Math.abs(b - 38) <= 8;
}

function lastOccupiedGridCell(imageData: ImageData, gridX: number, gridY: number, cell: number, content: Bounds): { row: number; column: number } {
  const maxColumns = Math.max(1, Math.ceil((content.maxX - gridX + 1) / cell));
  const maxRows = Math.max(1, Math.ceil((content.maxY - gridY + 1) / cell));
  let last = { row: 0, column: 0 };

  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < maxColumns; column += 1) {
      const x = gridX + column * cell;
      const y = gridY + row * cell;
      const w = Math.min(cell, imageData.width - x);
      const h = Math.min(cell, imageData.height - y);
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box)) last = { row, column };
    }
  }

  return last;
}

function getGridRows(autoRows: number): number {
  return autoRows;
}

function getGridColumns(autoColumns: number): number {
  return Math.max(1, autoColumns);
}

function countGridColumnsWithinContent(contentWidth: number, cell: number): number {
  const width = Math.max(1, contentWidth);
  const fullColumns = Math.floor(width / cell);
  const remainder = width % cell;
  return Math.max(1, fullColumns + (remainder >= cell * 0.75 ? 1 : 0));
}

function findFirstItemAnchor(centers: readonly Point[], cell: number): Point {
  if (!centers.length) return { x: cell / 2, y: cell / 2 };

  const sorted = [...centers].sort((a, b) => a.y - b.y || a.x - b.x);
  const firstSortedCenter = sorted[0];
  if (!firstSortedCenter) return { x: cell / 2, y: cell / 2 };
  const firstRowY = firstSortedCenter.y;
  const firstRow = sorted
    .filter((center) => Math.abs(center.y - firstRowY) < cell / 2)
    .sort((a, b) => a.x - b.x);

  return firstRow[0] || firstSortedCenter;
}

function estimateItemCenters(imageData: ImageData, bounds: BankGridBox | null = null): Point[] {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const minX = bounds?.x ?? 0;
  const minY = bounds?.y ?? 0;
  const maxX = bounds ? bounds.x + bounds.w - 1 : width - 1;
  const maxY = bounds ? bounds.y + bounds.h - 1 : height - 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      if (
        isGridItemPixel(
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
    .filter((box) => (box.area || 0) > 45 && box.w >= 6 && box.h >= 6 && box.w <= 38 && box.h <= 38)
    .map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function foregroundBounds(imageData: ImageData): Bounds {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (
        !isGridItemPixel(
          readImageDataChannel(imageData.data, offset),
          readImageDataChannel(imageData.data, offset + 1),
          readImageDataChannel(imageData.data, offset + 2)
        )
      ) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX > maxX || minY > maxY) {
    return { minX: 0, minY: 0, maxX: imageData.width - 1, maxY: imageData.height - 1 };
  }

  return { minX, minY, maxX, maxY };
}

function bankContentRightLimit(imageData: ImageData): number {
  for (let x = imageData.width - 1; x >= 0; x -= 1) {
    let borderPixels = 0;
    for (let y = 0; y < imageData.height; y += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (
        isFrameOrScrollbarPixel(
          readImageDataChannel(imageData.data, offset),
          readImageDataChannel(imageData.data, offset + 1),
          readImageDataChannel(imageData.data, offset + 2)
        )
      ) {
        borderPixels += 1;
      }
    }
    if (borderPixels > imageData.height * 0.45) return Math.max(0, x - 1);
  }
  return imageData.width - 1;
}

function isGridItemPixel(r: number, g: number, b: number): boolean {
  if (!isForeground(r, g, b)) return false;
  const isTitleText = r > 160 && g > 115 && b < 70;
  return !isTitleText && !isFrameOrScrollbarPixel(r, g, b);
}

function isScreenshotShapePixel(r: number, g: number, b: number): boolean {
  if (isBankBackgroundPixel(r, g, b)) return false;
  if (isQuantityPixel(r, g, b)) return false;
  return true;
}

function countCellForeground(imageData: ImageData, x: number, y: number, w: number, h: number): number {
  let count = 0;
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const offset = (py * imageData.width + px) * 4;
      if (
        isForeground(
          readImageDataChannel(imageData.data, offset),
          readImageDataChannel(imageData.data, offset + 1),
          readImageDataChannel(imageData.data, offset + 2)
        )
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function isOccupiedCell(imageData: ImageData, box: BankGridBox): boolean {
  let itemPixels = 0;
  let borderPixels = 0;

  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = readImageDataChannel(imageData.data, offset);
      const g = readImageDataChannel(imageData.data, offset + 1);
      const b = readImageDataChannel(imageData.data, offset + 2);
      if (isGridItemPixel(r, g, b)) itemPixels += 1;
      if (isFrameOrScrollbarPixel(r, g, b)) borderPixels += 1;
    }
  }

  if (itemPixels < 70) return false;
  return borderPixels < itemPixels * 1.3;
}

function isForeground(r: number, g: number, b: number): boolean {
  const bgDistance = Math.abs(r - 48) + Math.abs(g - 43) + Math.abs(b - 38);
  const tooDark = r < 24 && g < 24 && b < 24;
  return bgDistance > 28 && !tooDark;
}

function isBankBackgroundPixel(r: number, g: number, b: number): boolean {
  return r === 48 && g === 43 && b === 38;
}

function boxesAreClose(a: BankGridBox, b: BankGridBox): boolean {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.abs(ax - bx) < 28 && Math.abs(ay - by) < 28;
}

function expandBox(box: BankGridBox, padding: number, width: number, height: number): BankGridBox {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(width, box.x + box.w + padding);
  const bottom = Math.min(height, box.y + box.h + padding);
  return { x, y, w: right - x, h: bottom - y, area: box.area };
}
