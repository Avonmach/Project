export interface DetectionRowElements {
  readonly row?: HTMLTableRowElement | null;
  readonly quantityCell?: HTMLTableCellElement | null;
  readonly referenceCell: HTMLElement;
  readonly nameCell: HTMLElement;
  readonly levelCell: HTMLElement;
  readonly themeCell: HTMLElement;
  readonly siteCell?: HTMLElement | null;
  readonly statusCell?: HTMLElement | null;
}

export interface UpdatableDetection {
  readonly rowElements?: DetectionRowElements | null;
  readonly referencePreview: Element;
  readonly wikiPage?: string | null;
  readonly restoredName?: string | null;
  readonly artefact: string;
  readonly archaeologyLevel?: number | string | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface UpdateDetectionRowOptions<TDetection extends UpdatableDetection> {
  readonly detection: TDetection;
  readonly rowReviewClass: (detection: TDetection) => string;
  readonly makeReferenceCorrectionDropdown: (detection: TDetection) => Node;
  readonly makeRecognitionInfo: (detection: TDetection) => Node;
  readonly makeStatusPill: (detection: TDetection) => Node;
}

export function updateDetectionRow<TDetection extends UpdatableDetection>({
  detection,
  rowReviewClass,
  makeReferenceCorrectionDropdown,
  makeRecognitionInfo,
  makeStatusPill
}: UpdateDetectionRowOptions<TDetection>): boolean {
  const elements = detection.rowElements;
  if (!elements) return false;

  detection.referencePreview.classList.remove("review-border");
  const input = elements.quantityCell?.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input");
  elements.referenceCell.replaceChildren(makeReferenceCorrectionDropdown(detection));
  elements.nameCell.replaceChildren();
  if (elements.row) {
    const isDamagedRow = elements.row.classList.contains("damaged-detection-row");
    elements.row.className = rowReviewClass(detection);
    if (isDamagedRow) elements.row.classList.add("damaged-detection-row");
  }

  if (detection.wikiPage) {
    const link = document.createElement("a");
    link.className = "artifact-link";
    link.href = detection.wikiPage;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = detection.restoredName || detection.artefact;
    elements.nameCell.append(link);
  } else {
    elements.nameCell.textContent = detection.restoredName || detection.artefact;
  }
  elements.nameCell.append(makeRecognitionInfo(detection));
  elements.levelCell.textContent = String(detection.archaeologyLevel ?? "");
  elements.themeCell.textContent = detection.culture || "";
  if (elements.siteCell) elements.siteCell.textContent = detection.digSite || "";
  if (elements.statusCell) elements.statusCell.replaceChildren(makeStatusPill(detection));
  return true;
}
