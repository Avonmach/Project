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
  materials,
  calculateMaterialTotals,
  makeMaterialCell,
  makeLinkedTextCell,
  makeTableHead,
  makeEmptyMessage,
  makeOverviewCard
}: StorageTabRendererOptions<TDetection>): void {
  panel.replaceChildren();
  const sortedMaterials = [...materials].sort((a, b) => a.name.localeCompare(b.name));
  if (!sortedMaterials.length) {
    panel.append(makeEmptyMessage("Material reference data is not available."));
    return;
  }

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  summary.append(
    makeOverviewCard("Known materials", sortedMaterials.length),
    makeOverviewCard("Needed now", calculateMaterialTotals(visibleDetections).length),
    makeOverviewCard("Storage matched", 0)
  );

  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead(["Material", "Wiki page"]));
  const body = document.createElement("tbody");

  for (const material of sortedMaterials) {
    const tr = document.createElement("tr");
    const linkCell = makeLinkedTextCell(material.name, material.wikiPage);
    tr.append(makeMaterialCell({ name: material.name }), linkCell);
    body.append(tr);
  }

  table.append(body);
  panel.append(
    summary,
    makeEmptyMessage("Storage screenshot recognition is ready to be added on top of this material database."),
    table
  );
}
