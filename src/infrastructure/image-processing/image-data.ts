import type { BoundingBox } from "../../domain/shared/geometry";
import type { RgbColor } from "../../domain/shared/color";

export function alphaBounds(imageData: ImageData, minimumAlpha = 40): BoundingBox | null {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3];
      if (alpha < minimumAlpha) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function copyImageData(imageData: ImageData, box: BoundingBox): ImageData {
  const crop = new ImageData(box.w, box.h);
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      const source = ((box.y + y) * imageData.width + box.x + x) * 4;
      const target = (y * box.w + x) * 4;
      crop.data[target] = imageData.data[source];
      crop.data[target + 1] = imageData.data[source + 1];
      crop.data[target + 2] = imageData.data[source + 2];
      crop.data[target + 3] = imageData.data[source + 3];
    }
  }
  return crop;
}

export function cropImageData(imageData: ImageData, box: BoundingBox): ImageData {
  return copyImageData(imageData, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h
  });
}

export function pixelColorAt(imageData: ImageData, x: number, y: number): RgbColor {
  const safeX = Math.max(0, Math.min(imageData.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(imageData.height - 1, Math.round(y)));
  const offset = (safeY * imageData.width + safeX) * 4;
  return {
    r: imageData.data[offset],
    g: imageData.data[offset + 1],
    b: imageData.data[offset + 2]
  };
}
