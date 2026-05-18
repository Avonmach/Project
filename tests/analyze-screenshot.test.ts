import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_DIGIT_TEMPLATES } from "../src/domain/ocr/digit-templates";
import { analyzeScreenshot } from "../src/application/analyze-screenshot/analyze-screenshot";
import {
  makeArtefactMatcher,
  makeBox,
  makeFrameSource,
  makePreviewFactory,
  makeQuantityDebugSource,
  makeQuantityRecognizer,
  makeQuantityResult
} from "./helpers/recognition-fixtures";

test("analyzeScreenshot coordinates frame, quantity, matching, and previews", () => {
  const result = analyzeScreenshot({
    recognitionMode: "restored",
    digitTemplates: FALLBACK_DIGIT_TEMPLATES,
    cellSize: 44,
    frameSource: makeFrameSource([makeBox({ x: 44, y: 88 })]),
    quantityRecognizer: makeQuantityRecognizer(makeQuantityResult(7)),
    artefactMatcher: makeArtefactMatcher(),
    quantityDebugSource: makeQuantityDebugSource(),
    previewFactory: makePreviewFactory()
  });

  assert.equal(result.frame.boxes.length, 1);
  assert.equal(result.detections.length, 1);
  assert.equal(result.detections[0]?.quantity, 7);
  assert.equal(result.detections[0]?.artefact, "Damaged vase");
  assert.equal(result.detections[0]?.bankRow, 3);
  assert.equal(result.detections[0]?.bankColumn, 2);
  assert.equal(result.detections[0]?.preview, "restored-preview");
});
