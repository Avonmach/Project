import type { BoundingBox } from "../../domain/shared/geometry";

export interface StorageRecognitionFrame {
  readonly imageData: ImageData;
  readonly boxes: readonly BoundingBox[];
  readonly contentArea: BoundingBox | null;
  readonly infinityArea: BoundingBox | null;
}

export interface StorageRecognitionFrameSource {
  createFrames(): readonly StorageRecognitionFrame[];
}
