import type { BoundingBox } from "../../domain/shared/geometry";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type { QuantityResult } from "../../domain/ocr/quantity-ocr";

export interface StorageRecognitionFrame {
  readonly imageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly contentArea: BoundingBox | null;
  readonly infinityArea: BoundingBox | null;
}

export interface StorageRecognitionFrameSource {
  createFrames(): readonly StorageRecognitionFrame[];
}

export interface StorageMaterialMatch {
  readonly name: string;
  readonly wikiPage?: string | null;
  readonly score: number;
}

export interface StorageMaterialMatcher {
  matchMaterial(imageData: ImageData, box: BoundingBox): StorageMaterialMatch;
}

export interface StorageQuantityRecognizer {
  detectQuantity(imageData: ImageData, box: BoundingBox, digitTemplates: DigitTemplateMap): QuantityResult;
}
