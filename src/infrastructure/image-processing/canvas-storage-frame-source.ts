import type { StorageRecognitionFrameSource } from "../../application/analyze-storage/storage-recognition-ports";
import { createStorageRecognitionFrame } from "./storage-recognition-frame";

export function createCanvasStorageFrameSource({
  images,
  canvas,
  context
}: {
  readonly images: readonly HTMLImageElement[];
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}): StorageRecognitionFrameSource {
  return {
    createFrames() {
      return images.map((image) => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);
        return createStorageRecognitionFrame(context.getImageData(0, 0, canvas.width, canvas.height));
      });
    }
  };
}
