import type { RecognitionMode } from "../../domain/artefacts/matching";
import type { BoundingBox } from "../../domain/shared/geometry";
import { detectItemBoxes, estimateBankGrid } from "./bank-grid";
import { makeFullShapeImageData } from "./shape-mask";

export interface ScreenshotAnalysisFrame {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly contentArea: BoundingBox | null;
  readonly infinityArea: BoundingBox | null;
}

export function createScreenshotAnalysisFrame(
  image: CanvasImageSource,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  recognitionMode: RecognitionMode
): ScreenshotAnalysisFrame {
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const grid = estimateBankGrid(imageData);
  return {
    imageData,
    shapeImageData: makeFullShapeImageData(imageData, grid, recognitionMode),
    boxes: detectItemBoxes(imageData, grid),
    contentArea: grid.contentArea,
    infinityArea: grid.infinityArea
  };
}
