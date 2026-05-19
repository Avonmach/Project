import type { BoundingBox, PixelPoint } from "../shared/geometry";
import { alphaBounds } from "../../infrastructure/image-processing/image-data";

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type DigitTemplate = readonly string[];
export type DigitTemplateMap = Record<Digit, DigitTemplate>;

export const DIGIT_TEMPLATE_WIDTH = 5;
export const DIGIT_TEMPLATE_HEIGHT = 8;

export const FALLBACK_DIGIT_TEMPLATES: DigitTemplateMap = {
  0: ["00100", "01010", "10001", "10001", "10001", "10001", "01011", "00110"],
  1: ["0100", "1100", "0100", "0100", "0100", "0100", "0100", "1110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "10000", "11111"],
  3: ["11110", "00001", "00001", "00110", "00001", "00001", "10001", "01110"],
  4: ["0010", "0110", "1010", "1010", "1111", "0010", "0010", "0010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00010", "00100", "00100", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "10001", "01111", "00001", "00010", "00100"]
};

export function buildDigitTemplatesFromFont(fontFamily: string): DigitTemplateMap {
  const templates = { ...FALLBACK_DIGIT_TEMPLATES };
  for (let digit = 0; digit <= 9; digit += 1) {
    const key = String(digit) as Digit;
    if (key === "0" || key === "8") continue;
    templates[key] = thinDigitTemplate(renderDigitTemplate(key, fontFamily));
  }
  return templates;
}

export function thinDigitTemplate(template: DigitTemplate): string[] {
  const height = template.length;
  const width = templateWidth(template);
  const values = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (templateValueAt(template, y, x) === "1" ? 1 : 0))
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const remove: Array<[number, number]> = [];
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          if (!values[y]?.[x]) continue;
          const n = thinningNeighbors(values, x, y);
          const count = n.reduce((sum, value) => sum + value, 0);
          const transitions = n.filter((value, index) => value === 0 && n[(index + 1) % n.length] === 1).length;
          if (count < 2 || count > 6 || transitions !== 1) continue;
          const [north, , east, , south, , west] = n as [number, number, number, number, number, number, number, number];
          if (step === 0 && north * east * south === 0 && east * south * west === 0) remove.push([x, y]);
          if (step === 1 && north * east * west === 0 && north * south * west === 0) remove.push([x, y]);
        }
      }
      for (const [x, y] of remove) {
        const row = values[y];
        if (row) row[x] = 0;
        changed = true;
      }
    }
  }

  return values.map((row) => row.map((value) => (value ? "1" : "0")).join(""));
}

function thinningNeighbors(values: readonly (readonly number[])[], x: number, y: number): number[] {
  return [
    values[y - 1]?.[x] ?? 0,
    values[y - 1]?.[x + 1] ?? 0,
    values[y]?.[x + 1] ?? 0,
    values[y + 1]?.[x + 1] ?? 0,
    values[y + 1]?.[x] ?? 0,
    values[y + 1]?.[x - 1] ?? 0,
    values[y]?.[x - 1] ?? 0,
    values[y - 1]?.[x - 1] ?? 0
  ];
}

export function digitTemplateWidth(digit: Digit | string): number {
  return ["1", "4"].includes(String(digit)) ? 4 : DIGIT_TEMPLATE_WIDTH;
}

export function templateWidth(template: DigitTemplate): number {
  return Math.max(1, ...template.map((row) => row.length));
}

export function shiftedTemplateScore(normalized: DigitTemplate, template: DigitTemplate): number {
  let best = 0;
  const height = template.length;
  const width = templateWidth(template);
  for (let shiftY = -1; shiftY <= 1; shiftY += 1) {
    for (let shiftX = -1; shiftX <= 1; shiftX += 1) {
      let same = 0;
      let total = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const templateY = y - shiftY;
          const templateX = x - shiftX;
          const expected =
            templateY >= 0 && templateY < height && templateX >= 0 && templateX < width
              ? templateValueAt(template, templateY, templateX)
              : "0";
          total += expected === "1" ? 2 : 1;
          if (templateValueAt(normalized, y, x) === expected) same += expected === "1" ? 2 : 1;
        }
      }
      best = Math.max(best, same / total);
    }
  }
  return best;
}

export function normalizeDigit(
  pixels: readonly PixelPoint[],
  box: BoundingBox,
  width = DIGIT_TEMPLATE_WIDTH
): string[] {
  const grid = Array.from({ length: DIGIT_TEMPLATE_HEIGHT }, () => Array.from({ length: width }, () => "0"));
  const inside = new Set(
    pixels
      .filter((pixel) => pixel.x >= box.x && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h)
      .map((pixel) => `${pixel.x},${pixel.y}`)
  );

  for (let gy = 0; gy < DIGIT_TEMPLATE_HEIGHT; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const row = grid[gy];
      if (!row) continue;
      const startX = box.x + Math.floor((gx / width) * box.w);
      const endX = box.x + Math.max(1, Math.floor(((gx + 1) / width) * box.w));
      const startY = box.y + Math.floor((gy / DIGIT_TEMPLATE_HEIGHT) * box.h);
      const endY = box.y + Math.max(1, Math.floor(((gy + 1) / DIGIT_TEMPLATE_HEIGHT) * box.h));
      let hits = 0;
      let samples = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          samples += 1;
          if (inside.has(`${x},${y}`)) hits += 1;
        }
      }
      row[gx] = hits / Math.max(1, samples) >= 0.28 ? "1" : "0";
    }
  }

  return grid.map((row) => row.join(""));
}

function renderDigitTemplate(digit: Digit, fontFamily: string): string[] {
  const scale = 6;
  const width = digitTemplateWidth(digit);
  const source = document.createElement("canvas");
  source.width = width * scale;
  source.height = DIGIT_TEMPLATE_HEIGHT * scale;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return [...FALLBACK_DIGIT_TEMPLATES[digit]];

  sourceCtx.clearRect(0, 0, source.width, source.height);
  sourceCtx.fillStyle = "#fff200";
  sourceCtx.textBaseline = "top";
  sourceCtx.font = `${source.height}px ${fontFamily}`;
  sourceCtx.fillText(digit, -1, -2);

  const imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
  const bounds = alphaBounds(imageData, 1);
  if (!bounds) return [...FALLBACK_DIGIT_TEMPLATES[digit]];

  const normalized = document.createElement("canvas");
  normalized.width = width;
  normalized.height = DIGIT_TEMPLATE_HEIGHT;
  const normalizedCtx = normalized.getContext("2d", { willReadFrequently: true });
  if (!normalizedCtx) return [...FALLBACK_DIGIT_TEMPLATES[digit]];

  normalizedCtx.imageSmoothingEnabled = true;
  normalizedCtx.clearRect(0, 0, normalized.width, normalized.height);
  normalizedCtx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, width, DIGIT_TEMPLATE_HEIGHT);
  const normalizedData = normalizedCtx.getImageData(0, 0, width, DIGIT_TEMPLATE_HEIGHT).data;
  const rows: string[] = [];
  for (let y = 0; y < DIGIT_TEMPLATE_HEIGHT; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      row += (normalizedData[offset + 3] ?? 0) > 30 ? "1" : "0";
    }
    rows.push(row);
  }
  return rows;
}

function templateValueAt(template: DigitTemplate, y: number, x: number): string {
  return template[y]?.[x] ?? "0";
}
