import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_DIGIT_TEMPLATES } from "../src/domain/ocr/digit-templates";
import { detectQuantity } from "../src/domain/ocr/quantity-ocr";

test("detectQuantity can match a four-pixel-wide zero against the zero template", () => {
  const imageData = { width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) } as ImageData;
  const yellow = [230, 210, 60, 255];
  const points = [
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 0 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 7 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 0, y: index + 1 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 3, y: index + 1 }))
  ];

  for (const point of points) {
    imageData.data.set(yellow, (point.y * imageData.width + point.x) * 4);
  }

  const result = detectQuantity(imageData, { x: 0, y: 0, w: 44, h: 44 }, "damaged", FALLBACK_DIGIT_TEMPLATES);

  assert.equal(result.debug.matches[0]?.digit, "0");
}
