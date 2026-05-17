import type { BoundingBox } from "../../domain/shared/geometry";

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
