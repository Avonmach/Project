export interface QuantityCorrectionDetection {
  quantity: number;
  manual?: boolean;
  quantityManual?: boolean;
  readonly originalQuantity?: number;
  readonly quantityConfidence?: number;
  quantityCorrection?: {
    readonly correctedAt: string;
    readonly originalQuantity?: number;
    readonly detectedQuantity?: number;
    readonly previousQuantity: number;
    readonly correctedQuantity: number;
    readonly quantityConfidence?: number;
    readonly source: string;
  } | null;
}

export function applyQuantityChange<TDetection extends QuantityCorrectionDetection>(
  detection: TDetection,
  quantity: number,
  source: string,
  correctedAt = new Date().toISOString()
): void {
  const previousQuantity = detection.quantity;
  detection.quantity = quantity;
  detection.manual = true;
  detection.quantityManual = true;
  detection.quantityCorrection = {
    correctedAt,
    originalQuantity: detection.originalQuantity,
    detectedQuantity: detection.originalQuantity,
    previousQuantity,
    correctedQuantity: detection.quantity,
    quantityConfidence: detection.quantityConfidence,
    source
  };
}
