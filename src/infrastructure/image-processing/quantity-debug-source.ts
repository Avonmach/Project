import type { QuantityDebug } from "../../domain/ocr/quantity-ocr";
import { copyImageData } from "./image-data";

export type QuantityDebugWithSource = QuantityDebug & { source: ImageData };

export function attachQuantityDebugSource(
  debug: QuantityDebug | null,
  imageData: ImageData
): QuantityDebugWithSource | null {
  if (!debug) return null;
  return {
    ...debug,
    source: copyImageData(imageData, debug.scanBox)
  };
}
