import type { BoundingBox } from "../../domain/shared/geometry";
import { detectQuantity } from "../../domain/ocr/quantity-ocr";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type { QuantityAlternative, QuantityDebug } from "../../domain/ocr/quantity-ocr";
import type {
  StorageMaterialMatchCandidate,
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
  readonly overlapScore?: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
  readonly matchGap?: number | null;
  readonly topMatches?: readonly StorageMaterialMatchCandidate[];
  readonly quantity?: number;
  readonly originalQuantity?: number;
  readonly quantityConfidence?: number;
  readonly quantityAlternatives?: readonly QuantityAlternative[];
  readonly quantityDebug?: QuantityDebug | null;
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
      const secondMatch = material?.candidates?.[1];
      return {
        id: screenshotIndex * 1000 + index + 1,
        screenshotIndex,
        box,
        ...(material
            ? {
                materialName: material.name,
                wikiPage: material.wikiPage,
                matchScore: material.score,
                ...(material.overlapScore !== undefined ? { overlapScore: material.overlapScore } : {}),
                ...(material.shapeScore !== undefined ? { shapeScore: material.shapeScore } : {}),
                ...(material.colorScore !== undefined ? { colorScore: material.colorScore } : {}),
                ...(secondMatch ? { matchGap: material.score - secondMatch.score } : {}),
                ...(material.candidates ? { topMatches: material.candidates } : {})
              }
            : {}),
        ...(quantity
          ? {
              quantity: quantity.quantity,
              originalQuantity: quantity.quantity,
              quantityConfidence: quantity.confidence,
              quantityAlternatives: quantity.alternatives,
              quantityDebug: quantity.debug
            }
          : {})
      };
    })
  );

  return { frames, detections };
}
