import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateRestoredArtefacts,
  calculateMaterialTotals,
  calculateOtherItemTotals
} from "../src/application/calculate-materials/material-totals";

test("calculateMaterialTotals multiplies recipe materials by detection quantity", () => {
  const recipes = new Map([
    [
      "restored vase",
      {
        materials: [
          { name: "Third age iron", quantity: 8 },
          { name: "Zarosian insignia", quantity: 2 }
        ]
      }
    ],
    ["restored token", { materials: [{ name: "Third age iron", quantity: 3 }] }]
  ]);

  const totals = calculateMaterialTotals(
    [
      { artefact: "Damaged vase", restoredName: "Restored vase", quantity: 2 },
      { artefact: "Damaged token", restoredName: "Restored token", quantity: 4 }
    ],
    recipes
  );

  assert.deepEqual(totals, [
    { name: "Third age iron", quantity: 28, artefacts: ["Restored token", "Restored vase"] },
    { name: "Zarosian insignia", quantity: 4, artefacts: ["Restored vase"] }
  ]);
});

test("calculateOtherItemTotals keeps non-archaeology recipe items separate", () => {
  const recipes = new Map([
    [
      "restored vase",
      {
        materials: [{ name: "Third age iron", quantity: 8 }],
        otherItems: [{ name: "Gold leaf", quantity: 1 }]
      }
    ],
    ["restored token", { otherItems: [{ name: "Clockwork", quantity: 2 }] }]
  ]);

  const totals = calculateOtherItemTotals(
    [
      { artefact: "Damaged vase", restoredName: "Restored vase", quantity: 2 },
      { artefact: "Damaged token", restoredName: "Restored token", quantity: 4 }
    ],
    recipes
  );

  assert.deepEqual(totals, [
    { name: "Gold leaf", quantity: 2, artefacts: ["Restored vase"] },
    { name: "Clockwork", quantity: 8, artefacts: ["Restored token"] }
  ]);
});

test("aggregateRestoredArtefacts groups quantities and review state", () => {
  const rows = aggregateRestoredArtefacts(
    [
      {
        artefact: "Damaged vase",
        restoredName: "Restored vase",
        quantity: 2,
        archaeologyLevel: 12,
        culture: "Zarosian",
        digSite: "Kharid-et"
      },
      {
        artefact: "Damaged vase",
        restoredName: "Restored vase",
        quantity: 3,
        ambiguousMatch: true
      },
      { artefact: "Damaged token", restoredName: "Restored token", quantity: 1 }
    ],
    (detection) => detection.artefact === "Damaged token"
  );

  assert.deepEqual(rows.map((row) => ({ name: row.restoredName, quantity: row.quantity, needsReview: row.needsReview })), [
    { name: "Restored token", quantity: 1, needsReview: true },
    { name: "Restored vase", quantity: 5, needsReview: true }
  ]);
});
