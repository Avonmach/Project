import { normalizeName } from "../../domain/shared/format";

export interface MaterialRow {
  readonly name: string;
  readonly quantity: number;
  readonly artefacts: readonly string[];
}

export interface StoredMaterialRow {
  readonly name: string;
  readonly quantity: number;
}

export interface MaterialsTabReference {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly icon?: string | null;
}

export interface RestoredArtefactSummaryRow {
  readonly restoredName: string;
  readonly quantity: number;
}

export interface MaterialsTabDetection {
  readonly quantity: number;
}

export interface MaterialsTabRendererOptions<TDetection extends MaterialsTabDetection> {
  readonly panel: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly recipeRecordCount: number;
  readonly storedMaterials: readonly StoredMaterialRow[];
  readonly references: readonly MaterialsTabReference[];
  readonly calculateMaterialTotals: (items: readonly TDetection[]) => readonly MaterialRow[];
  readonly aggregateRestoredArtefacts: (items: readonly TDetection[]) => readonly RestoredArtefactSummaryRow[];
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
  storedMaterials,
  references,
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
  const storedByMaterial = new Map(storedMaterials.map((material) => [normalizeName(material.name), material.quantity]));
  const artefactQuantities = new Map(
    aggregateRestoredArtefacts(visibleDetections).map((artefact) => [normalizeName(artefact.restoredName), artefact.quantity])
  );
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
  table.append(makeTableHead(["Material", "Needed", "In storage", "Used by artefacts"]));
  const body = document.createElement("tbody");

  for (const row of sortMaterialRows(materialRows)) {
    const tr = document.createElement("tr");
    tr.append(
      makeMaterialCell(row),
      makeTextCell(row.quantity, "number-cell"),
      makeTextCell(storedByMaterial.get(normalizeName(row.name)) ?? 0, "number-cell"),
      makeUsedByArtefactsCell(row.artefacts, artefactQuantities, references)
    );
    body.append(tr);
  }

  table.append(body);
  panel.append(summary, table);
}

function makeUsedByArtefactsCell(
  artefacts: readonly string[],
  artefactQuantities: ReadonlyMap<string, number>,
  references: readonly MaterialsTabReference[]
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const grid = document.createElement("div");
  grid.className = "collection-artefacts material-used-by-artefacts";

  for (const artefact of artefacts) {
    grid.append(makeUsedByArtefactIcon(artefact, artefactQuantities.get(normalizeName(artefact)) || 0, references));
  }

  cell.append(grid);
  return cell;
}

function makeUsedByArtefactIcon(
  artefact: string,
  quantity: number,
  references: readonly MaterialsTabReference[]
): HTMLSpanElement {
  const reference = references.find((item) => normalizeName(item.restoredName || item.name) === normalizeName(artefact));
  const tile = document.createElement("span");
  tile.className = "collection-artefact";
  tile.title = quantity ? `${artefact}: ${quantity}` : artefact;

  if (reference?.icon) {
    const image = document.createElement("img");
    image.src = `data/${reference.icon}`;
    image.alt = artefact;
    image.loading = "lazy";
    tile.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "collection-artefact-fallback";
    fallback.textContent = artefact.slice(0, 2).toUpperCase();
    tile.append(fallback);
  }

  if (quantity) {
    const badge = document.createElement("span");
    badge.className = "collection-artefact-count";
    badge.textContent = String(quantity);
    tile.append(badge);
  }

  return tile;
}
