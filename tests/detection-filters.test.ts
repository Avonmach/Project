import assert from "node:assert/strict";
import test from "node:test";

import { filterAndSortDetections, matchesDetectionFilters, sortDetections } from "../src/application/filter-detections/detection-filters";

const detections = [
  { bankIndex: 2, artefact: "Damaged amphora", restoredName: "Amphora", archaeologyLevel: 12, culture: "Zarosian", digSite: "Kharid-et" },
  { bankIndex: 1, artefact: "Damaged carving", restoredName: "Carving", archaeologyLevel: 5, culture: "Saradominist", digSite: "Everlight", ambiguousMatch: true },
  { bankIndex: 3, artefact: "Damaged token", restoredName: "Token", archaeologyLevel: 5, culture: "Zarosian", digSite: "Kharid-et" }
];

test("sortDetections defaults to bank position", () => {
  assert.deepEqual(sortDetections(detections, "position").map((detection) => detection.bankIndex), [1, 2, 3]);
});

test("sortDetections sorts by level with name and position tie-breakers", () => {
  assert.deepEqual(sortDetections(detections, "level").map((detection) => detection.restoredName), [
    "Carving",
    "Token",
    "Amphora"
  ]);
});

test("matchesDetectionFilters matches culture, review state, and free-text query", () => {
  assert.equal(
    matchesDetectionFilters(detections[0], {
      query: "kharid",
      culture: "Zarosian",
      reviewOnly: false,
      quantityNeedsReview: () => false
    }),
    true
  );
  assert.equal(
    matchesDetectionFilters(detections[0], {
      query: "",
      culture: "Saradominist",
      reviewOnly: false,
      quantityNeedsReview: () => false
    }),
    false
  );
  assert.equal(
    matchesDetectionFilters(detections[1], {
      query: "",
      culture: "",
      reviewOnly: true,
      quantityNeedsReview: () => false
    }),
    true
  );
});

test("filterAndSortDetections combines filters and sorting", () => {
  const filtered = filterAndSortDetections(detections, "level", {
    query: "",
    culture: "Zarosian",
    reviewOnly: false,
    quantityNeedsReview: () => false
  });
  assert.deepEqual(filtered.map((detection) => detection.restoredName), ["Token", "Amphora"]);
});
