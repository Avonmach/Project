export interface SummaryTotalsDetection {
  readonly quantity: number;
  readonly manual?: boolean;
}

export interface SummaryTotalsOptions<TDetection extends SummaryTotalsDetection> {
  readonly detections: readonly TDetection[];
  readonly slotCountElement: HTMLElement;
  readonly quantityTotalElement: HTMLElement;
  readonly manualCountElement: HTMLElement;
}

export function renderSummaryTotals<TDetection extends SummaryTotalsDetection>({
  detections,
  slotCountElement,
  quantityTotalElement,
  manualCountElement
}: SummaryTotalsOptions<TDetection>): void {
  const total = detections.reduce((sum, detection) => sum + detection.quantity, 0);
  const manual = detections.filter((detection) => detection.manual).length;
  slotCountElement.textContent = String(detections.length);
  quantityTotalElement.textContent = String(total);
  manualCountElement.textContent = String(manual);
}
