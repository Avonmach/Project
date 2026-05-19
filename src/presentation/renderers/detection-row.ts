export interface DetectionRowElements {
  row: HTMLTableRowElement;
  quantityCell: HTMLTableCellElement;
  referenceCell: HTMLTableCellElement;
  nameCell: HTMLTableCellElement;
  levelCell: HTMLTableCellElement;
  themeCell: HTMLTableCellElement;
  siteCell: HTMLTableCellElement;
  statusCell: HTMLTableCellElement;
  actionCell?: HTMLTableCellElement;
}

export interface DetectionRowModel {
  artefact?: string;
  restoredName?: string | null;
  wikiPage?: string | null;
  archaeologyLevel?: number | string | null;
  culture?: string | null;
  digSite?: string | null;
  quantity: number;
  ambiguousMatch?: boolean;
  corrected?: boolean;
  manual?: boolean;
  preview: Node;
  processedPreview: Node;
  referencePreview: HTMLElement;
  rowElements?: DetectionRowElements;
}

export interface DetectionRowRendererOptions<TDetection extends DetectionRowModel> {
  readonly detection: TDetection;
  readonly showMetadataColumns?: boolean;
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
  readonly quantityCandidatesAreClose: (detection: TDetection) => boolean;
  readonly applyQuantityChange: (detection: TDetection, quantity: number, source: string) => void;
  readonly onQuantityChanged: (quantityCell: HTMLTableCellElement) => void;
  readonly onVerifyDetection: (detection: TDetection) => void;
  readonly onRemoveDetection?: (detection: TDetection) => void;
  readonly makeReferenceCorrectionDropdown: (detection: TDetection) => Node;
  readonly makeRecognitionInfo: (detection: TDetection) => Node;
  readonly makeQuantityDebugView: (detection: TDetection) => Node;
}

export function makeDetectionTableRow<TDetection extends DetectionRowModel>({
  detection,
  showMetadataColumns = true,
  quantityNeedsReview,
  quantityCandidatesAreClose,
  applyQuantityChange,
  onQuantityChanged,
  onVerifyDetection,
  onRemoveDetection,
  makeReferenceCorrectionDropdown,
  makeRecognitionInfo,
  makeQuantityDebugView
}: DetectionRowRendererOptions<TDetection>): HTMLTableRowElement {
  const row = document.createElement("tr");
  const quantityCell = document.createElement("td");
  const nameCell = document.createElement("td");
  const levelCell = document.createElement("td");
  const themeCell = document.createElement("td");
  const siteCell = document.createElement("td");
  const statusCell = document.createElement("td");
  const referenceCell = document.createElement("td");
  const previewCell = document.createElement("td");
  const processedCell = document.createElement("td");
  const actionCell = onRemoveDetection ? document.createElement("td") : null;
  const input = document.createElement("input");
  const quantityWarning = quantityNeedsReview(detection);

  row.className = rowReviewClass(detection, quantityWarning);
  row.addEventListener("click", (event) => {
    if (isInteractiveRowTarget(event.target)) return;
    onVerifyDetection(detection);
  });

  quantityCell.className = "quantity-cell";
  if (actionCell) actionCell.className = "row-action-cell";
  referenceCell.className = "image-cell";
  previewCell.className = "image-cell";
  processedCell.className = "image-cell";

  detection.referencePreview.classList.toggle(
    "review-border",
    Boolean(detection.ambiguousMatch && !(detection.corrected && detection.manual))
  );
  previewCell.append(detection.preview);
  processedCell.append(detection.processedPreview);
  referenceCell.append(makeReferenceCorrectionDropdown(detection));

  if (detection.wikiPage) {
    const link = document.createElement("a");
    link.className = "artifact-link";
    link.href = detection.wikiPage;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = detection.restoredName || detection.artefact || "";
    nameCell.append(link);
  } else {
    nameCell.textContent = detection.restoredName || detection.artefact || "";
  }

  nameCell.append(makeRecognitionInfo(detection));

  levelCell.textContent = String(detection.archaeologyLevel ?? "");
  themeCell.textContent = detection.culture || "";
  siteCell.textContent = detection.digSite || "";
  statusCell.append(makeStatusPill(detection, quantityWarning));

  if (actionCell) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-detection-button";
    removeButton.textContent = "X";
    removeButton.title = "Remove this detected artefact";
    removeButton.setAttribute("aria-label", `Remove ${detection.restoredName || detection.artefact || "detected artefact"}`);
    removeButton.addEventListener("click", () => onRemoveDetection?.(detection));
    actionCell.append(removeButton);
  }

  input.className = "qty-input";
  if (quantityWarning) input.classList.add("quantity-warning-input");
  if (quantityCandidatesAreClose(detection)) input.classList.add("quantity-close-input");
  input.type = "text";
  input.inputMode = "numeric";
  input.value = String(detection.quantity);
  input.addEventListener("change", () => {
    applyQuantityChange(detection, Math.max(1, Number.parseInt(input.value, 10) || 1), "quantity-input");
    input.value = String(detection.quantity);
    onQuantityChanged(quantityCell);
  });

  const stepper = document.createElement("div");
  stepper.className = "qty-stepper";
  const arrows = document.createElement("div");
  arrows.className = "qty-arrows";
  const down = makeQuantityButton("-", () => {
    applyQuantityChange(detection, Math.max(1, detection.quantity - 1), "quantity-stepper");
    input.value = String(detection.quantity);
    onQuantityChanged(quantityCell);
  });
  const up = makeQuantityButton("+", () => {
    applyQuantityChange(detection, detection.quantity + 1, "quantity-stepper");
    input.value = String(detection.quantity);
    onQuantityChanged(quantityCell);
  });
  arrows.append(up, down);
  stepper.append(input, arrows);
  quantityCell.append(stepper, makeQuantityDebugView(detection));

  detection.rowElements = {
    row,
    quantityCell,
    referenceCell,
    nameCell,
    levelCell,
    themeCell,
    siteCell,
    statusCell,
    ...(actionCell ? { actionCell } : {})
  };

  const metadataCells = showMetadataColumns ? [levelCell, themeCell, siteCell] : [];
  const rowCells = [nameCell, ...metadataCells, statusCell, previewCell, processedCell, referenceCell, quantityCell];
  if (actionCell) rowCells.push(actionCell);
  row.append(...rowCells);
  return row;
}

export function makeStatusPill(detection: DetectionRowModel, quantityWarning: boolean): HTMLSpanElement {
  const status = document.createElement("span");
  status.className = "status-pill";
  if (detection.corrected && detection.manual) {
    status.classList.add("checked");
    status.textContent = "Checked";
  } else if (detection.ambiguousMatch || quantityWarning) {
    status.classList.add("review");
    status.textContent = "Review";
  } else {
    status.textContent = "Ready";
  }
  return status;
}

export function rowReviewClass(detection: DetectionRowModel, quantityWarning: boolean): string {
  if (detection.corrected && detection.manual) return "checked-row";
  if (detection.ambiguousMatch || quantityWarning) return "review-row";
  return "";
}

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, input, a, details, summary, select, textarea"));
}

function makeQuantityButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "qty-button";
  button.textContent = label;
  let repeatTimer: number | null = null;
  let repeatDelay: number | null = null;
  const stopRepeating = () => {
    if (repeatDelay) window.clearTimeout(repeatDelay);
    if (repeatTimer) window.clearInterval(repeatTimer);
    repeatDelay = null;
    repeatTimer = null;
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    onClick();
    stopRepeating();
    repeatDelay = window.setTimeout(() => {
      repeatTimer = window.setInterval(onClick, 90);
    }, 350);
  });
  button.addEventListener("pointerup", stopRepeating);
  button.addEventListener("pointercancel", stopRepeating);
  button.addEventListener("pointerleave", stopRepeating);
  button.addEventListener("click", (event) => {
    event.preventDefault();
  });
  return button;
}
