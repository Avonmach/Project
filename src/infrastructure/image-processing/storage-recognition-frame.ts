import type { StorageRecognitionFrame } from "../../application/analyze-storage/storage-recognition-ports";
import { detectItemBoxes, estimateBankGrid } from "./bank-grid";

export function createStorageRecognitionFrame(imageData: ImageData): StorageRecognitionFrame {
  const grid = estimateBankGrid(imageData);
  return {
    imageData,
    boxes: detectItemBoxes(imageData, grid),
    contentArea: grid.contentArea,
    infinityArea: grid.infinityArea
  };
}
