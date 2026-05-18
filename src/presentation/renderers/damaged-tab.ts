export interface DamagedTabRendererOptions<TDetection> {
  readonly body: HTMLTableSectionElement;
  readonly detectedCountElement: HTMLElement;
  readonly visibleCountElement: HTMLElement;
  readonly reviewCountElement: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly makeDetectionTableRow: (detection: TDetection) => HTMLTableRowElement;
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

export function renderDamagedTab<TDetection>({
  body,
  detectedCountElement,
  visibleCountElement,
  reviewCountElement,
  allDetections,
  visibleDetections,
  makeDetectionTableRow,
  quantityNeedsReview
}: DamagedTabRendererOptions<TDetection>): void {
  updateDamagedReviewSummary({
    detectedCountElement,
    visibleCountElement,
    reviewCountElement,
    allDetections,
    visibleDetections,
    quantityNeedsReview
  });

  body.replaceChildren();
  if (!allDetections.length) {
    drawDamagedEmptyState(body, "Analyze a damaged artefact screenshot to populate this table.");
    return;
  }

  if (!visibleDetections.length) {
    drawDamagedEmptyState(body, "No artefacts match the current filters.");
    return;
  }

  for (const detection of visibleDetections) {
    const row = makeDetectionTableRow(detection);
    row.classList.add("damaged-detection-row");
    body.append(row);
  }
}

interface DamagedReviewSummaryOptions<TDetection> {
  readonly detectedCountElement: HTMLElement;
  readonly visibleCountElement: HTMLElement;
  readonly reviewCountElement: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

function updateDamagedReviewSummary<TDetection>({
  detectedCountElement,
  visibleCountElement,
  reviewCountElement,
  allDetections,
  visibleDetections,
  quantityNeedsReview
}: DamagedReviewSummaryOptions<TDetection>): void {
  detectedCountElement.textContent = String(allDetections.length);
  visibleCountElement.textContent = String(visibleDetections.length);
  reviewCountElement.textContent = String(
    visibleDetections.filter((detection) => quantityNeedsReview(detection)).length
  );
}

function drawDamagedEmptyState(body: HTMLTableSectionElement, message: string): void {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 10;
  cell.className = "empty";
  cell.textContent = message;
  row.append(cell);
  body.append(row);
}
