export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type DigitTemplate = readonly string[];
export type DigitTemplateMap = Record<Digit, DigitTemplate>;

export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const DIGIT_TEMPLATE_WIDTH = 5;
export const DIGIT_TEMPLATE_HEIGHT = 8;

export const FALLBACK_DIGIT_TEMPLATES: DigitTemplateMap = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "10001", "01110"],
  1: ["0100", "1100", "0100", "0100", "0100", "0100", "0100", "1110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "10000", "11111"],
  3: ["11110", "00001", "00001", "00110", "00001", "00001", "10001", "01110"],
  4: ["0010", "0110", "1010", "1010", "1111", "0010", "0010", "0010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00010", "00100", "00100", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "10001", "01111", "00001", "00010", "11100"]
};

export function buildDigitTemplatesFromFont(fontFamily: string): DigitTemplateMap {
  const templates = { ...FALLBACK_DIGIT_TEMPLATES };
  for (let digit = 0; digit <= 9; digit += 1) {
    const key = String(digit) as Digit;
    templates[key] = renderDigitTemplate(key, fontFamily);
  }
  return templates;
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
              ? template[templateY][templateX]
              : "0";
          total += expected === "1" ? 2 : 1;
          if (normalized[y][x] === expected) same += expected === "1" ? 2 : 1;
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
      let hits = 0;
      let samples = 0;
      const startX = box.x + Math.floor((gx / width) * box.w);
      const endX = box.x + Math.max(1, Math.floor(((gx + 1) / width) * box.w));
      const startY = box.y + Math.floor((gy / DIGIT_TEMPLATE_HEIGHT) * box.h);
      const endY = box.y + Math.max(1, Math.floor(((gy + 1) / DIGIT_TEMPLATE_HEIGHT) * box.h));
      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          samples += 1;
          if (inside.has(`${x},${y}`)) hits += 1;
        }
      }
      grid[gy][gx] = hits / Math.max(samples, 1) > 0.18 ? "1" : "0";
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
  const bounds = alphaBounds(imageData);
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
      row += normalizedData[offset + 3] > 30 ? "1" : "0";
    }
    rows.push(row);
  }
  return rows;
}

function alphaBounds(imageData: ImageData): BoundingBox | null {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3];
      if (alpha <= 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
