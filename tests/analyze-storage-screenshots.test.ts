import assert from "node:assert/strict";
import test from "node:test";

import { analyzeStorageScreenshots } from "../src/application/analyze-storage/analyze-storage-screenshots";
import type { StorageRecognitionFrameSource } from "../src/application/analyze-storage/storage-recognition-ports";
import { FALLBACK_DIGIT_TEMPLATES } from "../src/domain/ocr/digit-templates";
import { makeBox, makeImageData } from "./helpers/recognition-fixtures";

test("analyzeStorageScreenshots keeps detected boxes grouped by screenshot", () => {
  const firstBox = makeBox({ x: 10, y: 20 });
  const secondBox = makeBox({ x: 30, y: 40 });
  const frameSource: StorageRecognitionFrameSource = {
    createFrames() {
      return [
        {
          imageData: makeImageData(),
          boxes: [firstBox],
          contentArea: makeBox({ w: 100, h: 100 }),
          infinityArea: null
        },
        {
          imageData: makeImageData(),
          boxes: [secondBox],
          contentArea: makeBox({ x: 5, y: 5, w: 100, h: 100 }),
          infinityArea: makeBox({ x: 8, y: 8, w: 20, h: 12 })
        }
      ];
    }
  };

  const result = analyzeStorageScreenshots({ frameSource });

  assert.equal(result.frames.length, 2);
  assert.deepEqual(result.detections, [
    { id: 1, screenshotIndex: 0, box: firstBox },
    { id: 1001, screenshotIndex: 1, box: secondBox }
  ]);
});

test("analyzeStorageScreenshots can attach material matches and quantities", () => {
  const box = makeBox({ x: 10, y: 20 });
  const frameSource: StorageRecognitionFrameSource = {
    createFrames() {
      return [
        {
          imageData: makeImageData(),
          boxes: [box],
          contentArea: null,
          infinityArea: null
        }
      ];
    }
  };

  const result = analyzeStorageScreenshots({
    frameSource,
    digitTemplates: FALLBACK_DIGIT_TEMPLATES,
    materialMatcher: {
      matchMaterial() {
        return { name: "Third age iron", wikiPage: "https://example.test/material", score: 0.91 };
      }
    },
    quantityRecognizer: {
      detectQuantity() {
        return {
          quantity: 1948,
          confidence: 0.9,
          alternatives: [{ quantity: 1948, confidence: 0.9 }],
          debug: {
            mode: "damaged",
            strict: false,
            scanBox: box,
            pixelCount: 0,
            pixels: [],
            digitBoxes: [],
            rejectedBoxes: [],
            matches: [],
            text: "1948",
            confidence: 0.9
          }
        };
      }
    }
  });

  assert.deepEqual(result.detections, [
    {
      id: 1,
      screenshotIndex: 0,
      box,
      materialName: "Third age iron",
      wikiPage: "https://example.test/material",
      matchScore: 0.91,
      quantity: 1948,
      originalQuantity: 1948,
      quantityConfidence: 0.9,
      quantityAlternatives: [{ quantity: 1948, confidence: 0.9 }],
      quantityDebug: {
        mode: "damaged",
        strict: false,
        scanBox: box,
        pixelCount: 0,
        pixels: [],
        digitBoxes: [],
        rejectedBoxes: [],
        matches: [],
        text: "1948",
        confidence: 0.9
      }
    }
  ]);
});
