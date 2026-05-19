import type { BoundingBox } from "../../domain/shared/geometry";

export interface OverlayDetection {
  readonly box: BoundingBox;
}

export interface OverlayFrame {
  readonly contentArea?: BoundingBox | null;
  readonly infinityArea?: BoundingBox | null;
}

export interface DrawAnalysisOverlayOptions<TDetection extends OverlayDetection> {
  readonly context: CanvasRenderingContext2D;
  readonly image: CanvasImageSource;
  readonly items: readonly TDetection[];
  readonly contentArea?: BoundingBox | null;
  readonly infinityArea?: BoundingBox | null;
}

export function drawAnalysisOverlay<TDetection extends OverlayDetection>({
  context,
  image,
  items,
  contentArea = null,
  infinityArea = null
}: DrawAnalysisOverlayOptions<TDetection>): void {
  context.drawImage(image, 0, 0);
  drawAnalysisOverlayMarkers({
    context,
    items,
    frames: [{ contentArea, infinityArea }]
  });
}

export function drawAnalysisOverlayMarkers<TDetection extends OverlayDetection>({
  context,
  items,
  frames = []
}: {
  readonly context: CanvasRenderingContext2D;
  readonly items: readonly TDetection[];
  readonly frames?: readonly OverlayFrame[];
}): void {
  for (const { contentArea, infinityArea } of frames) {
    if (contentArea) {
      context.lineWidth = 3;
      context.strokeStyle = "#ff2b2b";
      context.strokeRect(contentArea.x + 0.5, contentArea.y + 0.5, contentArea.w, contentArea.h);
    }
    if (infinityArea) {
      context.lineWidth = 2;
      context.strokeStyle = "#ff2bff";
      context.strokeRect(infinityArea.x + 0.5, infinityArea.y + 0.5, infinityArea.w, infinityArea.h);
    }
  }
  context.lineWidth = 1;
  context.strokeStyle = "#25d984";
  context.fillStyle = "rgba(37, 217, 132, 0.08)";
  for (const item of items) {
    context.fillRect(item.box.x, item.box.y, item.box.w, item.box.h);
    context.strokeRect(item.box.x + 0.5, item.box.y + 0.5, item.box.w, item.box.h);
  }
}
