import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDigit } from "../src/domain/ocr/digit-templates";

test("normalizeDigit keeps a one-pixel vertical stroke one cell wide", () => {
  const pixels = Array.from({ length: 8 }, (_, y) => ({ x: 2, y }));

  assert.deepEqual(normalizeDigit(pixels, { x: 0, y: 0, w: 5, h: 8 }, 5), [
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100"
  ]);
});
