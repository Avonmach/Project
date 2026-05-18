import assert from "node:assert/strict";
import test from "node:test";

import { sortMaterialRows } from "../src/application/sort-results/result-row-sorting";
import { getCultureOptions } from "../src/presentation/filters/culture-options";

test("sortMaterialRows sorts high quantities first for level and position modes", () => {
  const rows = [
    { name: "Zarosian insignia", quantity: 2 },
    { name: "Third age iron", quantity: 10 },
    { name: "Ancient vis", quantity: 10 }
  ];

  assert.deepEqual(sortMaterialRows(rows, "level").map((row) => row.name), [
    "Ancient vis",
    "Third age iron",
    "Zarosian insignia"
  ]);
});

test("sortMaterialRows sorts alphabetically for theme and unknown modes", () => {
  const rows = [
    { name: "Zarosian insignia", quantity: 2 },
    { name: "Third age iron", quantity: 10 },
    { name: "Ancient vis", quantity: 1 }
  ];

  assert.deepEqual(sortMaterialRows(rows, "theme").map((row) => row.name), [
    "Ancient vis",
    "Third age iron",
    "Zarosian insignia"
  ]);
  assert.deepEqual(sortMaterialRows(rows, "custom").map((row) => row.name), [
    "Ancient vis",
    "Third age iron",
    "Zarosian insignia"
  ]);
});

test("getCultureOptions returns unique sorted non-empty cultures", () => {
  assert.deepEqual(
    getCultureOptions([{ culture: "Zarosian" }, { culture: null }, { culture: "Saradominist" }, { culture: "Zarosian" }]),
    ["Saradominist", "Zarosian"]
  );
});
