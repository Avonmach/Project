import type {
  ArtefactMatchResult,
  MatchReference,
  RecognitionMode
} from "../../domain/artefacts/matching";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type { QuantityDebug, QuantityResult } from "../../domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../domain/shared/geometry";
import type { DetectionRecordPreviewParts } from "./detection-record";

export interface RecognitionFrame {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly contentArea: BoundingBox | null;
  readonly infinityArea: BoundingBox | null;
}

export interface RecognitionFrameSource {
  createFrame(recognitionMode: RecognitionMode): RecognitionFrame;
}

export interface QuantityRecognizer {
  detectQuantity(
    imageData: ImageData,
    box: BoundingBox,
    recognitionMode: RecognitionMode,
    digitTemplates: DigitTemplateMap
  ): QuantityResult;
}

export interface QuantityDebugSource {
  makeQuantityDebug(debug: QuantityDebug | null, imageData: ImageData): QuantityDebug | null;
}

export interface ArtefactMatcher<TReference extends MatchReference> {
  matchArtefact(
    shapeImageData: ImageData,
    imageData: ImageData,
    box: BoundingBox,
    recognitionMode: RecognitionMode
  ): ArtefactMatchResult<TReference>;
}

export interface DetectionPreviewFactory<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  makePreviews(options: {
    readonly imageData: ImageData;
    readonly shapeImageData: ImageData;
    readonly box: BoundingBox;
    readonly recognitionMode: RecognitionMode;
    readonly match: ArtefactMatchResult<TReference>;
  }): DetectionRecordPreviewParts<TPreview, TProcessedPreview, TReferencePreview>;
}
