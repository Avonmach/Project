export interface StorageMaterial {
  readonly name: string;
  readonly wikiPage?: string | null;
}

export interface DetectedStorageMaterial {
  readonly name: string;
  readonly quantity: number;
  readonly wikiPage?: string | null;
  readonly matchScore?: number;
}

export interface StorageTabRendererOptions<TStorageDetection> {
  readonly panel: HTMLElement;
  readonly storageDetections: readonly TStorageDetection[];
  readonly uploadedImageCount: number;
  readonly requiredImageCount: number;
  readonly analysisDone: boolean;
  readonly detectedMaterials: readonly DetectedStorageMaterial[];
  readonly materialReferenceCount: number;
  readonly makeStorageDetectionTableRow: (detection: TStorageDetection) => HTMLTableRowElement;
  readonly makeMaterialCell: (row: { readonly name: string }) => HTMLTableCellElement;
  readonly makeLinkedTextCell: (label: string, href?: string | null) => HTMLTableCellElement;
  readonly makeTableHead: (labels: readonly string[]) => HTMLTableSectionElement;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeOverviewCard: (label: string, value: string | number) => HTMLElement;
}

export function renderStorageTab<TStorageDetection>({
  panel,
  storageDetections,
  uploadedImageCount,
  requiredImageCount,
  analysisDone,
  detectedMaterials,
  materialReferenceCount,
  makeStorageDetectionTableRow,
  makeMaterialCell,
  makeLinkedTextCell,
  makeTableHead,
  makeEmptyMessage,
  makeOverviewCard
}: StorageTabRendererOptions<TStorageDetection>): void {
  panel.replaceChildren();
  const materialRows = [...detectedMaterials]
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  summary.append(
    makeOverviewCard("Screenshots", `${uploadedImageCount}/${requiredImageCount}`),
    makeOverviewCard("Detected materials", analysisDone ? materialRows.length : 0)
  );

  if (!uploadedImageCount) {
    panel.append(summary, makeEmptyMessage("Upload material storage screenshots before analyzing storage."));
    return;
  }

  if (!analysisDone) {
    panel.append(summary, makeEmptyMessage("Click Analyze to detect materials from the uploaded storage screenshots."));
    return;
  }

  if (!materialReferenceCount) {
    panel.append(summary, makeEmptyMessage("Material reference data is not available."));
    return;
  }

  if (!storageDetections.length) {
    panel.append(summary, makeEmptyMessage("No storage materials were detected in the uploaded screenshots."));
    return;
  }

  const detectionTable = document.createElement("table");
  detectionTable.className = "secondary-table results-table storage-results-table";
  detectionTable.append(makeTableHead(["Material", "Status", "Screenshot", "Processed", "Guess", "Quantity"]));
  const detectionBody = document.createElement("tbody");

  for (const detection of storageDetections) {
    detectionBody.append(makeStorageDetectionTableRow(detection));
  }

  detectionTable.append(detectionBody);

  const totalsTitle = document.createElement("h3");
  totalsTitle.textContent = "Detected storage totals";
  totalsTitle.className = "section-heading";
  const totalsTable = document.createElement("table");
  totalsTable.className = "secondary-table materials-table";
  totalsTable.append(makeTableHead(["Material", "Quantity", "Wiki page"]));
  const totalsBody = document.createElement("tbody");
  for (const material of materialRows) {
    const tr = document.createElement("tr");
    const linkCell = makeLinkedTextCell(material.name, material.wikiPage);
    const quantityCell = document.createElement("td");
    quantityCell.className = "number-cell";
    quantityCell.textContent = String(material.quantity);
    tr.append(makeMaterialCell({ name: material.name }), quantityCell, linkCell);
    totalsBody.append(tr);
  }

  totalsTable.append(totalsBody);
  panel.append(summary, detectionTable, totalsTitle, totalsTable);
}
