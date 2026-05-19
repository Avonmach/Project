import assert from "node:assert/strict";
import test from "node:test";

import { detectStorageMaterialBoxes, storageMaterialContentArea } from "../src/infrastructure/image-processing/storage-material-grid";
import { makeImageData } from "./helpers/recognition-fixtures";

test("detectStorageMaterialBoxes detects separated material grids on both sides", () => {
  const imageData = makeStorageImageData(240, 120);
  drawMaterial(imageData, 6, 10);
  drawMaterial(imageData, 50, 10);
  drawMaterial(imageData, 6, 54);
  drawMaterial(imageData, 150, 10);
  drawMaterial(imageData, 194, 10);

  assert.deepEqual(detectStorageMaterialBoxes(imageData), [
    { x: 6, y: 5, w: 44, h: 44 },
    { x: 50, y: 5, w: 44, h: 44 },
    { x: 150, y: 5, w: 44, h: 44 },
    { x: 194, y: 5, w: 44, h: 44 },
    { x: 6, y: 49, w: 44, h: 44 }
  ]);
});

test("storageMaterialContentArea wraps all detected storage boxes", () => {
  assert.deepEqual(
    storageMaterialContentArea([
      { x: 6, y: 10, w: 44, h: 44 },
      { x: 194, y: 54, w: 44, h: 44 }
    ]),
    { x: 6, y: 10, w: 232, h: 88 }
  );
});

function makeStorageImageData(width: number, height: number): ImageData {
  const imageData = makeImageData(width, height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    imageData.data[index] = 48;
    imageData.data[index + 1] = 43;
    imageData.data[index + 2] = 38;
    imageData.data[index + 3] = 255;
  }
  return imageData;
}

function drawMaterial(imageData: ImageData, slotX: number, slotY: number): void {
  fillRect(imageData, slotX + 16, slotY + 16, 12, 12, [110, 130, 150]);
  fillRect(imageData, slotX + 12, slotY + 6, 20, 7, [215, 230, 16]);
}

function fillRect(imageData: ImageData, x: number, y: number, w: number, h: number, color: readonly [number, number, number]): void {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const offset = (py * imageData.width + px) * 4;
      imageData.data[offset] = color[0];
      imageData.data[offset + 1] = color[1];
      imageData.data[offset + 2] = color[2];
      imageData.data[offset + 3] = 255;
    }
  }
}
