import type {
  ArtefactMatchResult,
  MatchReference,
  RecognitionMode
} from "../../domain/artefacts/matching";
import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import { detectQuantity, type QuantityDebug } from "../../domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../domain/shared/geometry";
import { createDetectionRecord, type DetectionRecordPreviewParts } from "./detection-record";

export interface DetectionPreviewFactoryOptions {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly box: BoundingBox;
  readonly recognitionMode: RecognitionMode;
  readonly match: ArtefactMatchResult<MatchReference>;
}

export interface AnalyzeDetectionsOptions<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly cellSize: number;
  readonly recognitionMode: RecognitionMode;
  readonly digitTemplates: DigitTemplateMap;
  readonly matchArtefact: (
    shapeImageData: ImageData,
    imageData: ImageData,
    box: BoundingBox,
    recognitionMode: RecognitionMode
  ) => ArtefactMatchResult<TReference>;
  readonly makeQuantityDebug: (debug: QuantityDebug | null, imageData: ImageData) => QuantityDebug | null;
  readonly makePreviews: (
    options: DetectionPreviewFactoryOptions & { readonly match: ArtefactMatchResult<TReference> }
  ) => DetectionRecordPreviewParts<TPreview, TProcessedPreview, TReferencePreview>;
}

export function analyzeDetections<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview>({
  imageData,
  shapeImageData,
  boxes,
  cellSize,
  recognitionMode,
  digitTemplates,
  matchArtefact,
  makeQuantityDebug,
  makePreviews
}: AnalyzeDetectionsOptions<TReference, TPreview, TProcessedPreview, TReferencePreview>) {
  return boxes.map((box, index) => {
    const quantityResult = detectQuantity(imageData, box, recognitionMode, digitTemplates);
    const match = matchArtefact(shapeImageData, imageData, box, recognitionMode);

    return createDetectionRecord({
      box,
      bankIndex: index,
      cellSize,
      match,
      quantityResult,
      quantityDebug: makeQuantityDebug(quantityResult.debug, imageData),
      recognitionMode,
      previews: makePreviews({ imageData, shapeImageData, box, recognitionMode, match })
    });
  });
}
