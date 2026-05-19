import type { BoundingBox } from "../../domain/shared/geometry";
import type { StorageRecognitionFrame, StorageRecognitionFrameSource } from "./storage-recognition-ports";

export interface StorageGridDetection {
  readonly id: number;
  readonly screenshotIndex: number;
  readonly box: BoundingBox;
}

export interface AnalyzeStorageScreenshotsOptions {
  readonly frameSource: StorageRecognitionFrameSource;
}

export interface AnalyzeStorageScreenshotsResult {
  readonly frames: readonly StorageRecognitionFrame[];
  readonly detections: readonly StorageGridDetection[];
}

export function analyzeStorageScreenshots({
  frameSource
}: AnalyzeStorageScreenshotsOptions): AnalyzeStorageScreenshotsResult {
  const frames = frameSource.createFrames();
  const detections = frames.flatMap((frame, screenshotIndex) =>
    frame.boxes.map((box, index) => ({
      id: screenshotIndex * 1000 + index + 1,
      screenshotIndex,
      box
    }))
  );

  return { frames, detections };
}
