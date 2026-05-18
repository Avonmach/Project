import type { RecognitionMode } from "../../domain/artefacts/matching";
import type { RecognitionFrame, RecognitionFrameSource } from "../../application/analyze-screenshot/recognition-ports";
import { createScreenshotAnalysisFrame } from "./screenshot-analysis-frame";

export function createCanvasFrameSource({
  image,
  canvas,
  context
}: {
  readonly image: CanvasImageSource;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}): RecognitionFrameSource {
  return {
    createFrame(recognitionMode: RecognitionMode): RecognitionFrame {
      return createScreenshotAnalysisFrame(image, canvas, context, recognitionMode);
    }
  };
}
