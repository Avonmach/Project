import assert from "node:assert/strict";
import test from "node:test";

import { applyCandidatePrediction } from "../src/application/correct-detection/candidate-prediction";
import { applyQuantityChange } from "../src/application/correct-detection/quantity-correction";
import { applyReferenceCorrection } from "../src/application/correct-detection/reference-correction";
import { verifyDetection } from "../src/application/correct-detection/verification";

const item = {
  name: "Damaged vase",
  wikiPage: "Damaged vase",
  restoredName: "Restored vase",
  restoredWikiPage: "Restored vase",
  archaeologyLevel: 12,
  culture: "Zarosian",
  digSite: "Kharid-et"
};

test("applyCandidatePrediction updates selected match fields and ambiguity", () => {
  const detection = {
    topMatches: [
      { item, score: 0.9, shapeScore: 0.8, colorScore: 0.7, restoredScore: 0.6, damagedScore: 0.95 },
      { item: { ...item, name: "Damaged token", restoredName: "Restored token" }, score: 0.88, shapeScore: 0.79, colorScore: 0.69 }
    ]
  };

  applyCandidatePrediction(detection, detection.topMatches[0]);

  assert.equal(detection.artefact, "Damaged vase");
  assert.equal(detection.restoredName, "Restored vase");
  assert.equal(detection.referenceUsed, "damaged");
  assert.equal(detection.matchGap, 0.020000000000000018);
  assert.equal(detection.ambiguousMatch, true);
});

test("applyCandidatePrediction does not review close final scores with different color", () => {
  const detection = {
    topMatches: [
      { item, score: 0.9, shapeScore: 0.8, colorScore: 0.7 },
      { item: { ...item, name: "Damaged token", restoredName: "Restored token" }, score: 0.88, shapeScore: 0.79, colorScore: 0.66 }
    ]
  };

  applyCandidatePrediction(detection, detection.topMatches[0]);

  assert.equal(detection.matchGap, 0.020000000000000018);
  assert.equal(detection.ambiguousMatch, false);
});

test("applyQuantityChange records manual quantity correction metadata", () => {
  const detection = { quantity: 1, originalQuantity: 1, quantityConfidence: 0.65 };
  applyQuantityChange(detection, 5, "test", "2026-05-18T12:00:00.000Z");

  assert.equal(detection.quantity, 5);
  assert.equal(detection.manual, true);
  assert.equal(detection.quantityManual, true);
  assert.deepEqual(detection.quantityCorrection, {
    correctedAt: "2026-05-18T12:00:00.000Z",
    originalQuantity: 1,
    detectedQuantity: 1,
    previousQuantity: 1,
    correctedQuantity: 5,
    quantityConfidence: 0.65,
    source: "test"
  });
});

test("applyReferenceCorrection records manual artefact correction", () => {
  const detection = {};
  applyReferenceCorrection(detection, item, null, "2026-05-18T12:00:00.000Z");

  assert.equal(detection.artefact, "Damaged vase");
  assert.equal(detection.matchScore, 1);
  assert.equal(detection.ambiguousMatch, false);
  assert.equal(detection.corrected, true);
  assert.equal(detection.correction?.source, "manual-dropdown");
  assert.equal(detection.correction?.scoreAtSelection, null);
});

test("verifyDetection marks an unverified row and ignores already manual corrections", () => {
  const detection = {
    artefact: "Damaged vase",
    restoredName: "Restored vase",
    archaeologyLevel: 12,
    culture: "Zarosian",
    matchScore: 0.92,
    matchGap: 0.01
  };

  assert.equal(verifyDetection(detection, 0.025, "2026-05-18T12:00:00.000Z"), true);
  assert.equal(detection.corrected, true);
  assert.equal(detection.manual, true);
  assert.equal(detection.ambiguousMatch, false);
  assert.equal(detection.matchGap, 0.025);
  assert.equal(detection.correction?.source, "row-verified");
  assert.equal(verifyDetection(detection, 0.025, "2026-05-18T12:01:00.000Z"), false);
});
