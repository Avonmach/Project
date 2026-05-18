import assert from "node:assert/strict";
import test from "node:test";

import { createAnalysisExportPayload } from "../src/application/export-analysis/analysis-export";

const baseDetection = {
  bankIndex: 0,
  bankRow: 1,
  bankColumn: 1,
  box: { x: 10, y: 20, w: 30, h: 40 },
  quantity: 2,
  originalQuantity: 1,
  quantityConfidence: 0.8,
  artefact: "Damaged vase",
  restoredName: "Restored vase",
  archaeologyLevel: 12,
  culture: "Zarosian",
  digSite: "Kharid-et",
  wikiPage: "Restored vase",
  damagedWikiPage: "Damaged vase",
  shapeScore: 0.9,
  colorScore: 0.7,
  matchScore: 0.85,
  algorithmBest: {
    shape: { item: { name: "Damaged vase", restoredName: "Restored vase" }, score: 0.9 },
    color: null,
    restored: null,
    damaged: null
  },
  topMatches: [{ item: { name: "Damaged vase", restoredName: "Restored vase" }, score: 0.85 }]
};

test("createAnalysisExportPayload summarizes totals and selected detections", () => {
  const payload = createAnalysisExportPayload({
    exportedAt: "2026-05-18T12:00:00.000Z",
    image: { width: 100, height: 200, source: "screenshot.png" },
    grid: { offsetX: 0, offsetY: 0, cellSize: 44, rows: null, columns: null },
    detections: [
      {
        ...baseDetection,
        quantityManual: true,
        quantityCorrection: { previousQuantity: 1, quantity: 2, source: "manual" }
      },
      {
        ...baseDetection,
        bankIndex: 1,
        quantity: 3,
        corrected: true,
        manual: true,
        correction: { damagedName: "Damaged token", restoredName: "Restored token" }
      }
    ]
  });

  assert.equal(payload.totals.slots, 2);
  assert.equal(payload.totals.quantity, 5);
  assert.equal(payload.totals.quantityCorrections, 1);
  assert.equal(payload.totals.manualCorrections, 1);
  assert.equal(payload.training.correctedArtefacts, 1);
  assert.equal(payload.training.correctedQuantities, 1);
  assert.equal(payload.detections[0]?.selected.restoredName, "Restored vase");
  assert.equal(payload.detections[1]?.trainingLabel?.label.restoredName, "Restored token");
});
