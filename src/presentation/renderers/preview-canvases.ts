import { getIconMatchBox, type BoundingBox } from "../../domain/shared/geometry";
import {
  alphaBounds,
  copyImageData,
  cropImageData,
  readImageDataChannel
} from "../../infrastructure/image-processing/image-data";

const MATCH_SIZE = 32;
const PREVIEW_SIZE = 48;

export interface PreviewCanvasOptions {
  readonly enhanceHover?: boolean;
}

export interface ProcessedCanvasOptions {
  readonly enhance?: boolean;
}

export interface FingerprintPixel {
  readonly visible?: boolean;
}

export interface DetectionPreviewOptions<TImage extends CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number }> {
  readonly imageData: ImageData;
  readonly shapeImageData: ImageData;
  readonly box: BoundingBox;
  readonly referenceImage: TImage;
  readonly enhance: boolean;
}

export function makeDetectionPreviews<TImage extends CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number }>({
  imageData,
  shapeImageData,
  box,
  referenceImage,
  enhance
}: DetectionPreviewOptions<TImage>): {
  readonly preview: HTMLCanvasElement;
  readonly processedPreview: HTMLCanvasElement;
  readonly referencePreview: HTMLCanvasElement;
} {
  return {
    preview: makePreviewCanvas(imageData, box, { enhanceHover: enhance }),
    processedPreview: makeProcessedCanvas(imageData, shapeImageData, box, { enhance }),
    referencePreview: makeReferenceCanvas(referenceImage)
  };
}

export function makePreviewCanvas(imageData: ImageData, box: BoundingBox, options: PreviewCanvasOptions = {}): HTMLCanvasElement {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "slot-preview";
  if (options.enhanceHover === false) preview.classList.add("no-hover-enhance");
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  const temp = document.createElement("canvas");
  temp.width = box.w;
  temp.height = box.h;
  temp.getContext("2d")?.putImageData(copyImageData(imageData, box), 0, 0);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

export function makeProcessedCanvas(
  originalImageData: ImageData,
  shapeImageData: ImageData,
  box: BoundingBox,
  options: ProcessedCanvasOptions = {}
): HTMLCanvasElement {
  const enhance = options.enhance !== false;
  const iconBox = getIconMatchBox(box);
  const originalCrop = copyImageData(originalImageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);
  const bounds = alphaBounds(shapeCrop);
  const masked = new ImageData(originalCrop.width, originalCrop.height);

  for (let i = 0; i < originalCrop.data.length; i += 4) {
    if (readImageDataChannel(shapeCrop.data, i + 3) <= 20) continue;
    const color = enhance
      ? enhancePreviewColor(
          readImageDataChannel(originalCrop.data, i),
          readImageDataChannel(originalCrop.data, i + 1),
          readImageDataChannel(originalCrop.data, i + 2)
        )
      : {
          r: readImageDataChannel(originalCrop.data, i),
          g: readImageDataChannel(originalCrop.data, i + 1),
          b: readImageDataChannel(originalCrop.data, i + 2)
        };
    masked.data[i] = color.r;
    masked.data[i + 1] = color.g;
    masked.data[i + 2] = color.b;
    masked.data[i + 3] = 255;
  }

  const source = document.createElement("canvas");
  source.width = masked.width;
  source.height = masked.height;
  source.getContext("2d")?.putImageData(masked, 0, 0);

  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "processed-preview";
  if (!enhance) preview.classList.add("no-hover-enhance");
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  previewCtx.fillStyle = "#ffffff";
  previewCtx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const maxIconSize = PREVIEW_SIZE;
    const drawW = Math.ceil((bounds.w / longest) * maxIconSize);
    const drawH = Math.ceil((bounds.h / longest) * maxIconSize);
    const dx = Math.floor((PREVIEW_SIZE - drawW) / 2);
    const dy = Math.floor((PREVIEW_SIZE - drawH) / 2);
    previewCtx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, dx, dy, drawW, drawH);
  }

  return preview;
}

export function makeBackgroundRemovedCanvas(imageData: ImageData, box: BoundingBox): HTMLCanvasElement {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "clean-preview";
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  const temp = document.createElement("canvas");
  temp.width = box.w;
  temp.height = box.h;
  temp.getContext("2d")?.putImageData(copyImageData(imageData, box), 0, 0);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

export function makeRemovedOverlayCanvas(imageData: ImageData, shapeImageData: ImageData, box: BoundingBox): HTMLCanvasElement {
  const iconBox = getIconMatchBox(box);
  const overlay = copyImageData(imageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);

  for (let y = 0; y < iconBox.h; y += 1) {
    for (let x = 0; x < iconBox.w; x += 1) {
      const target = (y * iconBox.w + x) * 4;
      if (readImageDataChannel(shapeCrop.data, target + 3) > 0) continue;
      overlay.data[target] = 255;
      overlay.data[target + 1] = 0;
      overlay.data[target + 2] = 0;
      overlay.data[target + 3] = 210;
    }
  }

  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "background-overlay-preview";
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  const temp = document.createElement("canvas");
  temp.width = iconBox.w;
  temp.height = iconBox.h;
  temp.getContext("2d")?.putImageData(overlay, 0, 0);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

export function makeCroppedShapeCanvas(imageData: ImageData, box: BoundingBox): HTMLCanvasElement {
  const iconBox = getIconMatchBox(box);
  const cropData = copyImageData(imageData, iconBox);
  const bounds = alphaBounds(cropData);
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "recognition-preview";
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const temp = document.createElement("canvas");
  temp.width = bounds?.w || cropData.width;
  temp.height = bounds?.h || cropData.height;
  const tempCtx = temp.getContext("2d");
  if (bounds) {
    tempCtx?.putImageData(cropImageData(cropData, bounds), 0, 0);
  } else {
    tempCtx?.putImageData(cropData, 0, 0);
  }

  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

export function makeScaledShapeCanvas(fingerprint: readonly FingerprintPixel[]): HTMLCanvasElement {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "augmented-preview";
  paintFingerprintMask(preview, fingerprint);
  return preview;
}

export function makeReferenceCanvas(image: CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number }): HTMLCanvasElement {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "reference-preview";
  const previewCtx = preview.getContext("2d");
  if (!previewCtx) return preview;
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const maxIconSize = PREVIEW_SIZE - 8;
  const drawWidth = Math.round((image.naturalWidth / longest) * maxIconSize);
  const drawHeight = Math.round((image.naturalHeight / longest) * maxIconSize);
  const x = Math.floor((PREVIEW_SIZE - drawWidth) / 2);
  const y = Math.floor((PREVIEW_SIZE - drawHeight) / 2);
  previewCtx.drawImage(image, x, y, drawWidth, drawHeight);
  return preview;
}

export function makeShapeMaskCanvas(fingerprint: readonly FingerprintPixel[]): HTMLCanvasElement {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "shape-mask-preview";
  paintFingerprintMask(preview, fingerprint);
  return preview;
}

function enhancePreviewColor(r: number, g: number, b: number): { readonly r: number; readonly g: number; readonly b: number } {
  const brightness = 1.8;
  const saturation = 1.75;
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  return {
    r: brightenChannel(gray + (r - gray) * saturation, brightness),
    g: brightenChannel(gray + (g - gray) * saturation, brightness),
    b: brightenChannel(gray + (b - gray) * saturation, brightness)
  };
}

function brightenChannel(value: number, factor: number): number {
  return Math.max(0, Math.min(255, Math.round(value * factor)));
}

function paintFingerprintMask(canvas: HTMLCanvasElement, fingerprint: readonly FingerprintPixel[]): void {
  const previewCtx = canvas.getContext("2d");
  if (!previewCtx) return;
  previewCtx.clearRect(0, 0, canvas.width, canvas.height);
  if (!fingerprint?.length) return;

  const pixel = canvas.width / MATCH_SIZE;
  previewCtx.fillStyle = "#111417";
  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      const fingerprintPixel = fingerprint[y * MATCH_SIZE + x];
      if (!fingerprintPixel?.visible) continue;
      previewCtx.fillRect(x * pixel, y * pixel, Math.ceil(pixel), Math.ceil(pixel));
    }
  }
}
