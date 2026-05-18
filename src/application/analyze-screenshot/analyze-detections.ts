import type { MatchReference, RecognitionMode } from "../../domain/artefacts/matching";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type { BoundingBox } from "../../domain/shared/geometry";
import { detectQuantity } from "../../domain/ocr/quantity-ocr";
import { createDetectionRecord } from "./detection-record";
import type { ArtefactMatcher, DetectionPreviewFactory, QuantityDebugSource, QuantityRecognizer } from "./recognition-ports";

export interface AnalyzeDetectionsOptions<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly cellSize: number;
  readonly recognitionMode: RecognitionMode;
  readonly digitTemplates: DigitTemplateMap;
  readonly quantityRecognizer?: QuantityRecognizer;
  readonly artefactMatcher: ArtefactMatcher<TReference>;
  readonly quantityDebugSource: QuantityDebugSource;
  readonly previewFactory: DetectionPreviewFactory<TReference, TPreview, TProcessedPreview, TReferencePreview>;
}

export function analyzeDetections<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview>({
  imageData,
  shapeImageData,
  boxes,
  cellSize,
  recognitionMode,
  digitTemplates,
  quantityRecognizer = { detectQuantity },
  artefactMatcher,
  quantityDebugSource,
  previewFactory
}: AnalyzeDetectionsOptions<TReference, TPreview, TProcessedPreview, TReferencePreview>) {
  return boxes.map((box, index) => {
    const quantityResult = quantityRecognizer.detectQuantity(imageData, box, recognitionMode, digitTemplates);
    const match = artefactMatcher.matchArtefact(shapeImageData, imageData, box, recognitionMode);

    return createDetectionRecord({
      box,
      bankIndex: index,
      cellSize,
      match,
      quantityResult,
      quantityDebug: quantityDebugSource.makeQuantityDebug(quantityResult.debug, imageData),
      recognitionMode,
      previews: previewFactory.makePreviews({ imageData, shapeImageData, box, recognitionMode, match })
    });
  });
}
