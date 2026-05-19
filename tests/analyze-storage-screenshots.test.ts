import assert from "node:assert/strict";
import test from "node:test";

import { analyzeStorageScreenshots } from "../src/application/analyze-storage/analyze-storage-screenshots";
import type { StorageRecognitionFrameSource } from "../src/application/analyze-storage/storage-recognition-ports";
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
