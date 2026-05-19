import assert from "node:assert/strict";
import test from "node:test";

import { calculateStoragePreviewLayout } from "../src/infrastructure/image-processing/storage-preview-layout";

test("calculateStoragePreviewLayout places storage screenshots side by side", () => {
  const first = { naturalWidth: 320, naturalHeight: 240 };
  const second = { naturalWidth: 300, naturalHeight: 260 };

  assert.deepEqual(calculateStoragePreviewLayout([first, second], 12), {
    width: 632,
    height: 260,
    placements: [
      { image: first, x: 0, y: 0 },
      { image: second, x: 332, y: 0 }
    ]
  });
});

test("calculateStoragePreviewLayout returns an empty layout without screenshots", () => {
  assert.deepEqual(calculateStoragePreviewLayout([], 12), {
    width: 0,
    height: 0,
    placements: []
  });
});
