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

test("normalizeDigit does not duplicate a four-pixel digit into a five-pixel grid", () => {
  const pixels = [
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 0 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 7 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 0, y: index + 1 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 3, y: index + 1 }))
  ];

  assert.deepEqual(normalizeDigit(pixels, { x: 0, y: 0, w: 4, h: 8 }, 5), [
    "11011",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "11011"
  ]);
});
