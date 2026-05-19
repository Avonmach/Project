import type { BoundingBox } from "../../domain/shared/geometry";
import { detectQuantity } from "../../domain/ocr/quantity-ocr";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type {
  StorageMaterialMatcher,
  StorageRecognitionFrame,
  StorageRecognitionFrameSource,
  StorageQuantityRecognizer
} from "./storage-recognition-ports";

export interface StorageGridDetection {
  readonly id: number;
  readonly screenshotIndex: number;
  readonly box: BoundingBox;
  readonly materialName?: string;
  readonly wikiPage?: string | null;
  readonly matchScore?: number;
  readonly quantity?: number;
}

export interface AnalyzeStorageScreenshotsOptions {
  readonly frameSource: StorageRecognitionFrameSource;
  readonly digitTemplates?: DigitTemplateMap;
  readonly materialMatcher?: StorageMaterialMatcher;
  readonly quantityRecognizer?: StorageQuantityRecognizer;
}

export interface AnalyzeStorageScreenshotsResult {
  readonly frames: readonly StorageRecognitionFrame[];
  readonly detections: readonly StorageGridDetection[];
}

export function analyzeStorageScreenshots({
  frameSource,
  digitTemplates,
  materialMatcher,
  quantityRecognizer = {
    detectQuantity(imageData, box, templates) {
      return detectQuantity(imageData, box, "damaged", templates);
    }
  }
}: AnalyzeStorageScreenshotsOptions): AnalyzeStorageScreenshotsResult {
  const frames = frameSource.createFrames();
  const detections = frames.flatMap((frame, screenshotIndex) =>
    frame.boxes.map((box, index) => {
      const material = materialMatcher?.matchMaterial(frame.imageData, box);
      const quantity = digitTemplates ? quantityRecognizer.detectQuantity(frame.imageData, box, digitTemplates) : null;
      return {
        id: screenshotIndex * 1000 + index + 1,
        screenshotIndex,
        box,
        ...(material
          ? {
              materialName: material.name,
              wikiPage: material.wikiPage,
              matchScore: material.score
            }
          : {}),
        ...(quantity ? { quantity: quantity.quantity } : {})
      };
    })
  );

  return { frames, detections };
}
