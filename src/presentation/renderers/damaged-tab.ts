export interface DamagedTabRendererOptions<TDetection> {
  readonly body: HTMLTableSectionElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly makeDetectionTableRow: (detection: TDetection) => HTMLTableRowElement;
  readonly drawEmptyState: (message: string) => void;
}

export function renderDamagedTab<TDetection>({
  body,
  allDetections,
  visibleDetections,
  makeDetectionTableRow,
  drawEmptyState
}: DamagedTabRendererOptions<TDetection>): void {
  body.replaceChildren();
  if (!allDetections.length) {
    drawEmptyState("Analyze a damaged artefact screenshot to populate this table.");
    return;
  }

  if (!visibleDetections.length) {
    drawEmptyState("No artefacts match the current filters.");
    return;
  }

  for (const detection of visibleDetections) body.append(makeDetectionTableRow(detection));
}
