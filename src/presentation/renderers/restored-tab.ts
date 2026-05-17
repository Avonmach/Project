export interface RestoredTabRendererOptions<TDetection> {
  readonly body: HTMLTableSectionElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly makeDetectionTableRow: (detection: TDetection) => HTMLTableRowElement;
}

export function renderRestoredTab<TDetection>({
  body,
  allDetections,
  visibleDetections,
  makeDetectionTableRow
}: RestoredTabRendererOptions<TDetection>): void {
  body.replaceChildren();
  if (!allDetections.length) {
    drawTableEmptyState(body, "Upload and analyze a restored artefact screenshot to populate this table.");
    return;
  }

  if (!visibleDetections.length) {
    drawTableEmptyState(body, "No restored artefacts match the current filters.");
    return;
  }

  for (const detection of visibleDetections) body.append(makeDetectionTableRow(detection));
}

export function drawTableEmptyState(body: HTMLTableSectionElement, message: string): void {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 9;
  cell.className = "empty";
  cell.textContent = message;
  row.append(cell);
  body.append(row);
}
