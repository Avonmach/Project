import type { StorageRecognitionFrame } from "../../application/analyze-storage/storage-recognition-ports";
import { detectStorageMaterialBoxes, storageMaterialContentArea } from "./storage-material-grid";

export function createStorageRecognitionFrame(imageData: ImageData): StorageRecognitionFrame {
  const boxes = detectStorageMaterialBoxes(imageData);
  return {
    imageData,
    boxes,
    contentArea: storageMaterialContentArea(boxes),
    infinityArea: null
  };
}
