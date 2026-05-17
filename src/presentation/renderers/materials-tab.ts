export interface MaterialRow {
  readonly name: string;
  readonly quantity: number;
  readonly artefacts: readonly string[];
}

export interface MaterialsTabDetection {
  readonly quantity: number;
}

export interface MaterialsTabRendererOptions<TDetection extends MaterialsTabDetection> {
  readonly panel: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly recipeRecordCount: number;
  readonly calculateMaterialTotals: (items: readonly TDetection[]) => readonly MaterialRow[];
  readonly aggregateRestoredArtefacts: (items: readonly TDetection[]) => readonly unknown[];
  readonly sortMaterialRows: (rows: readonly MaterialRow[]) => readonly MaterialRow[];
  readonly makeMaterialCell: (row: Pick<MaterialRow, "name">) => HTMLTableCellElement;
  readonly makeTextCell: (value: string | number, className?: string) => HTMLTableCellElement;
  readonly makeTableHead: (labels: readonly string[]) => HTMLTableSectionElement;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeOverviewCard: (label: string, value: string | number) => HTMLElement;
}

export function renderMaterialsTab<TDetection extends MaterialsTabDetection>({
  panel,
  allDetections,
  visibleDetections,
  recipeRecordCount,
  calculateMaterialTotals,
  aggregateRestoredArtefacts,
  sortMaterialRows,
  makeMaterialCell,
  makeTextCell,
  makeTableHead,
  makeEmptyMessage,
  makeOverviewCard
}: MaterialsTabRendererOptions<TDetection>): void {
  panel.replaceChildren();
  if (!allDetections.length) {
    panel.append(makeEmptyMessage("Analyze a screenshot to calculate needed restoration materials."));
    return;
  }

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  const materialRows = calculateMaterialTotals(visibleDetections);
  summary.append(
    makeOverviewCard("Artefact quantity", visibleDetections.reduce((sum, detection) => sum + detection.quantity, 0)),
    makeOverviewCard("Unique artefacts", aggregateRestoredArtefacts(visibleDetections).length),
    makeOverviewCard("Needed materials", materialRows.length),
    makeOverviewCard("Recipe records", recipeRecordCount)
  );

  if (!materialRows.length) {
    panel.append(summary, makeEmptyMessage("No material recipes match the current artefacts."));
    return;
  }

  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead(["Material", "Needed", "Used by artefacts"]));
  const body = document.createElement("tbody");

  for (const row of sortMaterialRows(materialRows)) {
    const tr = document.createElement("tr");
    tr.append(makeMaterialCell(row), makeTextCell(row.quantity, "number-cell"), makeTextCell(row.artefacts.join(", ")));
    body.append(tr);
  }

  table.append(body);
  panel.append(summary, table);
}
