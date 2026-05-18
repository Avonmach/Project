import type { DigitTemplateMap } from "../../domain/ocr/digit-templates";
import type { MatchReference, RecognitionMode } from "../../domain/artefacts/matching";
import { analyzeDetections } from "./analyze-detections";
import type { DetectionRecord } from "./detection-record";
import type {
  ArtefactMatcher,
  DetectionPreviewFactory,
  QuantityDebugSource,
  QuantityRecognizer,
  RecognitionFrame,
  RecognitionFrameSource
} from "./recognition-ports";

export interface AnalyzeScreenshotOptions<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  readonly recognitionMode: RecognitionMode;
  readonly digitTemplates: DigitTemplateMap;
  readonly cellSize: number;
  readonly frameSource: RecognitionFrameSource;
  readonly quantityRecognizer?: QuantityRecognizer;
  readonly artefactMatcher: ArtefactMatcher<TReference>;
  readonly quantityDebugSource: QuantityDebugSource;
  readonly previewFactory: DetectionPreviewFactory<TReference, TPreview, TProcessedPreview, TReferencePreview>;
}

export interface AnalyzeScreenshotResult<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  readonly frame: RecognitionFrame;
  readonly detections: DetectionRecord<TReference, TPreview, TProcessedPreview, TReferencePreview>[];
}

export function analyzeScreenshot<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview>({
  recognitionMode,
  digitTemplates,
  cellSize,
  frameSource,
  quantityRecognizer,
  artefactMatcher,
  quantityDebugSource,
  previewFactory
}: AnalyzeScreenshotOptions<TReference, TPreview, TProcessedPreview, TReferencePreview>): AnalyzeScreenshotResult<
  TReference,
  TPreview,
  TProcessedPreview,
  TReferencePreview
> {
  const frame = frameSource.createFrame(recognitionMode);
  return {
    frame,
    detections: analyzeDetections({
      imageData: frame.imageData,
      shapeImageData: frame.shapeImageData,
      boxes: frame.boxes,
      cellSize,
      recognitionMode,
      digitTemplates,
      quantityRecognizer,
      artefactMatcher,
      quantityDebugSource,
      previewFactory
    })
  };
}
