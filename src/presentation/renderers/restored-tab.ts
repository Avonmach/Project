export interface RestoredTabRendererOptions<TDetection extends ReviewableDetection> {
  readonly body: HTMLTableSectionElement;
  readonly detectedCountElement: HTMLElement;
  readonly visibleCountElement: HTMLElement;
  readonly reviewCountElement: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly makeDetectionTableRow: (detection: TDetection) => HTMLTableRowElement;
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

export function renderRestoredTab<TDetection extends ReviewableDetection>({
  body,
  detectedCountElement,
  visibleCountElement,
  reviewCountElement,
  allDetections,
  visibleDetections,
  makeDetectionTableRow,
  quantityNeedsReview
}: RestoredTabRendererOptions<TDetection>): void {
  updateRestoredReviewSummary({
    detectedCountElement,
    visibleCountElement,
    reviewCountElement,
    allDetections,
    visibleDetections,
    quantityNeedsReview
  });

  body.replaceChildren();
  if (!allDetections.length) {
    drawTableEmptyState(body, "After image is loaded please click Analyze.");
    return;
  }

  if (!visibleDetections.length) {
    drawTableEmptyState(body, "No restored artefacts match the current filters.");
    return;
  }

  for (const detection of visibleDetections) {
    const row = makeDetectionTableRow(detection);
    row.classList.add("artefact-detection-row");
    body.append(row);
  }
}

export function drawTableEmptyState(body: HTMLTableSectionElement, message: string): void {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 10;
  cell.className = "empty";
  cell.textContent = message;
  row.append(cell);
  body.append(row);
}

interface ReviewableDetection {
  readonly ambiguousMatch?: boolean;
  readonly quantity: number;
}

interface RestoredReviewSummaryOptions<TDetection extends ReviewableDetection> {
  readonly detectedCountElement: HTMLElement;
  readonly visibleCountElement: HTMLElement;
  readonly reviewCountElement: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

function updateRestoredReviewSummary<TDetection extends ReviewableDetection>({
  detectedCountElement,
  visibleCountElement,
  reviewCountElement,
  allDetections,
  visibleDetections,
  quantityNeedsReview
}: RestoredReviewSummaryOptions<TDetection>): void {
  detectedCountElement.textContent = String(allDetections.length);
  visibleCountElement.textContent = String(visibleDetections.reduce((sum, detection) => sum + detection.quantity, 0));
  reviewCountElement.textContent = String(
    visibleDetections.filter((detection) => detection.ambiguousMatch || quantityNeedsReview(detection)).length
  );
}
