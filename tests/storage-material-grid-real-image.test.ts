import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { detectStorageMaterialBoxes } from "../src/infrastructure/image-processing/storage-material-grid";
import { loadPngImageData } from "./helpers/png-image-data";

test("detectStorageMaterialBoxes detects 25 material slots in Material_1.png", () => {
  const imageData = loadPngImageData(path.resolve("Material_1.png"));

  assert.equal(detectStorageMaterialBoxes(imageData).length, 25);
});
