import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_DIGIT_TEMPLATES } from "../src/domain/ocr/digit-templates";
import { detectQuantity } from "../src/domain/ocr/quantity-ocr";

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
