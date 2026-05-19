import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_DIGIT_TEMPLATES, normalizeDigit, thinDigitTemplate } from "../src/domain/ocr/digit-templates";

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

test("normalizeDigit keeps a four-pixel digit narrow when scored as four columns", () => {
  const pixels = [
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 0 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x, y: 7 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 0, y: index + 1 })),
    ...Array.from({ length: 6 }, (_, index) => ({ x: 3, y: index + 1 }))
  ];

  assert.deepEqual(normalizeDigit(pixels, { x: 0, y: 0, w: 4, h: 8 }, 4), [
    "1111",
    "1001",
    "1001",
    "1001",
    "1001",
    "1001",
    "1001",
    "1111"
  ]);
});

test("normalizeDigit keeps the uploaded zero sample hollow", () => {
  const rows = [
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "...............................",
    "............####...............",
    "............####...............",
    "............####...............",
    "........####....####...........",
    "........####....####...........",
    "........####....####...........",
    "........####....####...........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    ".....###............###........",
    "........####....####...........",
    "........####....####...........",
    "........####....####...........",
    "........####....####...........",
    "............####...............",
    "............####...............",
    "............####...............",
    "..............................."
  ];
  const pixels = pixelsFromMask(rows);

  assert.deepEqual(normalizeDigit(pixels, { x: 5, y: 10, w: 18, h: 30 }, 5), [
    "00100",
    "01010",
    "10001",
    "10001",
    "10001",
    "10001",
    "01011",
    "00110"
  ]);
});

test("normalizeDigit keeps a thick source zero hollow", () => {
  const pixels = [
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 7, y: 0 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 7, y: 1 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 7, y: 2 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 3, y: 3 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 11, y: 3 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 3, y: 4 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 11, y: 4 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x, y: 5 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x: x + 15, y: 5 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x, y: 6 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x: x + 15, y: 6 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x, y: 7 })),
    ...Array.from({ length: 3 }, (_, x) => ({ x: x + 15, y: 7 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 7, y: 8 })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 7, y: 9 }))
  ];

  const normalized = normalizeDigit(pixels, { x: 0, y: 0, w: 18, h: 10 }, 5);

  assert.notEqual(normalized[0], "11111");
  assert.match(normalized.slice(2, 7).join(""), /0/);
});

test("thinDigitTemplate thins a thick nine without removing its shape", () => {
  const template = [
    "11111",
    "11111",
    "11011",
    "11111",
    "11111",
    "00011",
    "00110",
    "01100"
  ];

  const thinned = thinDigitTemplate(template);

  assert.ok(thinned.some((row) => row.includes("0")));
  assert.ok(thinned.join("").replaceAll("0", "").length < template.join("").replaceAll("0", "").length);
  assert.ok(thinned.slice(0, 5).some((row) => row.startsWith("1")));
  assert.ok(thinned.slice(0, 7).some((row) => row.endsWith("1")));
});

test("thinDigitTemplate thins a thick eight into narrow loops", () => {
  const template = [
    "11111",
    "11011",
    "11011",
    "11111",
    "11011",
    "11011",
    "11011",
    "11111"
  ];

  const thinned = thinDigitTemplate(template);

  assert.ok(thinned.join("").replaceAll("0", "").length < template.join("").replaceAll("0", "").length);
  assert.ok(thinned.slice(0, 4).some((row) => row.includes("0")));
  assert.ok(thinned.slice(4).some((row) => row.includes("0")));
  assert.ok(thinned.slice(0, 4).join("").includes("1"));
  assert.ok(thinned.slice(4).join("").includes("1"));
});

test("fallback eight matches the detected sample grid", () => {
  assert.deepEqual(FALLBACK_DIGIT_TEMPLATES[8], [
    "01110",
    "10001",
    "10001",
    "01110",
    "10001",
    "10001",
    "10001",
    "01110"
  ]);
});

test("fallback six matches the detected sample grid", () => {
  assert.deepEqual(FALLBACK_DIGIT_TEMPLATES[6], [
    "00110",
    "01001",
    "10000",
    "10110",
    "11001",
    "10001",
    "10001",
    "01110"
  ]);
});

test("fallback three matches the detected sample grid", () => {
  assert.deepEqual(FALLBACK_DIGIT_TEMPLATES[3], [
    "0110",
    "1001",
    "0001",
    "0110",
    "0001",
    "0001",
    "1001",
    "0110"
  ]);
});

function pixelsFromMask(rows: readonly string[]): Array<{ x: number; y: number }> {
  return rows.flatMap((row, y) =>
    [...row].flatMap((value, x) => (value === "#" ? [{ x, y }] : []))
  );
}
