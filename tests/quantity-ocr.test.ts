import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_DIGIT_TEMPLATES } from "../src/domain/ocr/digit-templates";
import { detectQuantity, quantityCandidatesAreClose } from "../src/domain/ocr/quantity-ocr";

test("detectQuantity can match the corrected zero reference template", () => {
  const imageData = { width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) } as ImageData;
  const yellow = [230, 210, 60, 255];
  const rows = ["00100", "01010", "10001", "10001", "10001", "10001", "01011", "00110"];
  const points = rows.flatMap((row, y) =>
    [...row].flatMap((value, x) => (value === "1" ? [{ x, y }] : []))
  );

  for (const point of points) {
    imageData.data.set(yellow, (point.y * imageData.width + point.x) * 4);
  }

  const result = detectQuantity(imageData, { x: 0, y: 0, w: 44, h: 44 }, "damaged", FALLBACK_DIGIT_TEMPLATES);

  assert.equal(result.debug.matches[0]?.digit, "0");
  assert.deepEqual(result.debug.pixels[0]?.color, { r: 230, g: 210, b: 60 });
});

test("detectQuantity strict mode rejects orange artefact pixels", () => {
  const imageData = { width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) } as ImageData;
  const orange = [190, 120, 40, 255];
  const rows = ["111", "101", "101", "101", "111"];
  const points = rows.flatMap((row, y) =>
    [...row].flatMap((value, x) => (value === "1" ? [{ x, y }] : []))
  );

  for (const point of points) {
    imageData.data.set(orange, (point.y * imageData.width + point.x) * 4);
  }

  const result = detectQuantity(imageData, { x: 0, y: 0, w: 44, h: 44 }, "restored", FALLBACK_DIGIT_TEMPLATES);

  assert.equal(result.debug.pixelCount, 0);
});

test("detectQuantity rejects dull yellow artefact pixels in damaged mode", () => {
  const imageData = { width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) } as ImageData;
  const dullYellow = [165, 135, 65, 255];
  const rows = ["111", "101", "101", "101", "111"];
  const points = rows.flatMap((row, y) =>
    [...row].flatMap((value, x) => (value === "1" ? [{ x, y }] : []))
  );

  for (const point of points) {
    imageData.data.set(dullYellow, (point.y * imageData.width + point.x) * 4);
  }

  const result = detectQuantity(imageData, { x: 0, y: 0, w: 44, h: 44 }, "damaged", FALLBACK_DIGIT_TEMPLATES);

  assert.equal(result.debug.pixelCount, 0);
});

test("detectQuantity strict mode keeps a connected two as one digit", () => {
  const imageData = { width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) } as ImageData;
  const yellow = [230, 210, 60, 255];
  const rows = ["01110", "10001", "00001", "00010", "00100", "01000", "10000", "11111"];
  const points = rows.flatMap((row, y) =>
    [...row].flatMap((value, x) => (value === "1" ? [{ x, y }] : []))
  );

  for (const point of points) {
    imageData.data.set(yellow, (point.y * imageData.width + point.x) * 4);
  }

  const result = detectQuantity(imageData, { x: 0, y: 0, w: 44, h: 44 }, "restored", FALLBACK_DIGIT_TEMPLATES);

  assert.equal(result.debug.digitBoxes.length, 1);
  assert.equal(result.quantity, 2);
});

test("quantityCandidatesAreClose only marks per-digit gaps of two percent or less", () => {
  const baseDebug = {
    mode: "damaged" as const,
    strict: false,
    scanBox: { x: 0, y: 0, w: 10, h: 10 },
    pixelCount: 0,
    pixels: [],
    digitBoxes: [],
    rejectedBoxes: [],
    text: "88",
    confidence: 0.9
  };

  assert.equal(
    quantityCandidatesAreClose({
      quantityDebug: {
        ...baseDebug,
        matches: [
          { index: 1, digit: "8", score: 0.9, normalized: [], options: [{ digit: "8", score: 0.9, template: [], width: 5, height: 8 }, { digit: "6", score: 0.87, template: [], width: 5, height: 8 }] },
          { index: 2, digit: "8", score: 0.91, normalized: [], options: [{ digit: "8", score: 0.91, template: [], width: 5, height: 8 }, { digit: "9", score: 0.88, template: [], width: 5, height: 8 }] }
        ]
      }
    }),
    false
  );

  assert.equal(
    quantityCandidatesAreClose({
      quantityDebug: {
        ...baseDebug,
        matches: [
          { index: 1, digit: "8", score: 0.9, normalized: [], options: [{ digit: "8", score: 0.9, template: [], width: 5, height: 8 }, { digit: "6", score: 0.879, template: [], width: 5, height: 8 }] },
          { index: 2, digit: "8", score: 0.91, normalized: [], options: [{ digit: "8", score: 0.91, template: [], width: 5, height: 8 }, { digit: "9", score: 0.895, template: [], width: 5, height: 8 }] }
        ]
      }
    }),
    true
  );
});
