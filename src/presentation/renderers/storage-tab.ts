export interface StorageMaterial {
  readonly name: string;
  readonly wikiPage?: string | null;
}

export interface StorageMaterialNeed {
  readonly name: string;
  readonly quantity: number;
}

export interface StorageTabRendererOptions<TDetection> {
  readonly panel: HTMLElement;
  readonly visibleDetections: readonly TDetection[];
  readonly uploadedImageCount: number;
  readonly requiredImageCount: number;
  readonly analysisDone: boolean;
  readonly detectedGridCellCount: number;
  readonly detectedMaterialNames: ReadonlySet<string>;
  readonly materials: readonly StorageMaterial[];
  readonly calculateMaterialTotals: (items: readonly TDetection[]) => readonly StorageMaterialNeed[];
  readonly makeMaterialCell: (row: { readonly name: string }) => HTMLTableCellElement;
  readonly makeLinkedTextCell: (label: string, href?: string | null) => HTMLTableCellElement;
  readonly makeTableHead: (labels: readonly string[]) => HTMLTableSectionElement;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeOverviewCard: (label: string, value: string | number) => HTMLElement;
}

export function renderStorageTab<TDetection>({
  panel,
  visibleDetections,
  uploadedImageCount,
  requiredImageCount,
  analysisDone,
  detectedGridCellCount,
  detectedMaterialNames,
  materials,
  calculateMaterialTotals,
  makeMaterialCell,
  makeLinkedTextCell,
  makeTableHead,
  makeEmptyMessage,
  makeOverviewCard
}: StorageTabRendererOptions<TDetection>): void {
  panel.replaceChildren();
  const detectedMaterials = [...materials]
    .filter((material) => detectedMaterialNames.has(material.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  summary.append(
    makeOverviewCard("Screenshots", `${uploadedImageCount}/${requiredImageCount}`),
    makeOverviewCard("Needed now", calculateMaterialTotals(visibleDetections).length),
    makeOverviewCard("Grid slots", analysisDone ? detectedGridCellCount : 0),
    makeOverviewCard("Detected materials", analysisDone ? detectedMaterials.length : 0)
  );

  if (uploadedImageCount < requiredImageCount) {
    panel.append(summary, makeEmptyMessage("Upload two material storage screenshots before analyzing storage."));
    return;
  }

  if (!analysisDone) {
    panel.append(summary, makeEmptyMessage("Click Analyze to detect materials from the uploaded storage screenshots."));
    return;
  }

  if (!materials.length) {
    panel.append(summary, makeEmptyMessage("Material reference data is not available."));
    return;
  }

  if (!detectedMaterials.length) {
    panel.append(summary, makeEmptyMessage("No storage materials were detected in the uploaded screenshots."));
    return;
  }

  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead(["Material", "Wiki page"]));
  const body = document.createElement("tbody");

  for (const material of detectedMaterials) {
    const tr = document.createElement("tr");
    const linkCell = makeLinkedTextCell(material.name, material.wikiPage);
    tr.append(makeMaterialCell({ name: material.name }), linkCell);
    body.append(tr);
  }

  table.append(body);
  panel.append(summary, table);
}
