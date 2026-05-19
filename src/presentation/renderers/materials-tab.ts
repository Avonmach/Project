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
  readonly storedMaterials: readonly StoredMaterialRow[];
  readonly references: readonly MaterialsTabReference[];
  readonly calculateMaterialTotals: (items: readonly TDetection[]) => readonly MaterialRow[];
  readonly calculateOtherItemTotals: (items: readonly TDetection[]) => readonly MaterialRow[];
  readonly aggregateRestoredArtefacts: (items: readonly TDetection[]) => readonly RestoredArtefactSummaryRow[];
  readonly sortMaterialRows: (rows: readonly MaterialRow[]) => readonly MaterialRow[];
  readonly storedOtherItems: ReadonlyMap<string, number>;
  readonly onOtherItemStorageChange: (name: string, quantity: number) => void;
  readonly checkedRows: ReadonlySet<string>;
  readonly onToggleRowCheck: (name: string, checked: boolean) => void;
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
  storedMaterials,
  references,
  calculateMaterialTotals,
  calculateOtherItemTotals,
  aggregateRestoredArtefacts,
  sortMaterialRows,
  storedOtherItems,
  onOtherItemStorageChange,
  checkedRows,
  onToggleRowCheck,
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
  const otherItemRows = calculateOtherItemTotals(visibleDetections);
  const storedByMaterial = new Map(storedMaterials.map((material) => [normalizeName(material.name), material.quantity]));
  const artefactQuantities = new Map(
    aggregateRestoredArtefacts(visibleDetections).map((artefact) => [normalizeName(artefact.restoredName), artefact.quantity])
  );
  summary.append(
    makeOverviewCard("Artefact quantity", visibleDetections.reduce((sum, detection) => sum + detection.quantity, 0)),
    makeOverviewCard("Unique artefacts", aggregateRestoredArtefacts(visibleDetections).length),
    makeOverviewCard("Needed materials", materialRows.length)
  );

  if (!materialRows.length) {
    panel.append(summary, makeEmptyMessage("No material recipes match the current artefacts."));
    return;
  }

  const table = makeMaterialsTable({
    firstColumnLabel: "Material",
    rows: sortMaterialRows(materialRows),
    storedByMaterial,
    artefactQuantities,
    references,
    checkedRows,
    onToggleRowCheck,
    makeMaterialCell,
    makeTextCell,
    makeTableHead
  });

  panel.append(summary, table);

  if (otherItemRows.length) {
    const otherTitle = document.createElement("h3");
    otherTitle.className = "section-heading";
    otherTitle.textContent = "Other required items";
    const otherTable = makeMaterialsTable({
      firstColumnLabel: "Item",
      rows: sortMaterialRows(otherItemRows),
      storedByMaterial: storedOtherItems,
      artefactQuantities,
      references,
      checkedRows,
      onToggleRowCheck,
      makeMaterialCell,
      makeStorageCell: (row, toBuyCell) =>
        makeEditableStorageCell(row, storedOtherItems.get(normalizeName(row.name)) ?? 0, toBuyCell, onOtherItemStorageChange),
      makeTextCell,
      makeTableHead
    });
    otherTable.classList.add("other-items-table");
    panel.append(otherTitle, otherTable);
  }
}

function makeMaterialsTable({
  firstColumnLabel,
  rows,
  storedByMaterial,
  artefactQuantities,
  references,
  checkedRows,
  onToggleRowCheck,
  makeMaterialCell,
  makeStorageCell,
  makeTextCell,
  makeTableHead
}: {
  readonly firstColumnLabel: string;
  readonly rows: readonly MaterialRow[];
  readonly storedByMaterial: ReadonlyMap<string, number>;
  readonly artefactQuantities: ReadonlyMap<string, number>;
  readonly references: readonly MaterialsTabReference[];
  readonly checkedRows: ReadonlySet<string>;
  readonly onToggleRowCheck: (name: string, checked: boolean) => void;
  readonly makeMaterialCell: (row: Pick<MaterialRow, "name">) => HTMLTableCellElement;
  readonly makeStorageCell?: (row: MaterialRow, toBuyCell: HTMLTableCellElement) => HTMLTableCellElement;
  readonly makeTextCell: (value: string | number, className?: string) => HTMLTableCellElement;
  readonly makeTableHead: (labels: readonly string[]) => HTMLTableSectionElement;
}): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead([firstColumnLabel, "In storage", "Total", "To buy", "Used by artefacts"]));
  const body = document.createElement("tbody");

  for (const row of rows) {
    const tr = document.createElement("tr");
    const rowKey = normalizeName(row.name);
    const inStorage = storedByMaterial.get(normalizeName(row.name)) ?? 0;
    const toBuy = Math.max(0, row.quantity - inStorage);
    const toBuyCell = makeTextCell(toBuy, "number-cell");
    tr.classList.toggle("checked-row", checkedRows.has(rowKey));
    tr.addEventListener("click", (event) => {
      if (isInteractiveRowTarget(event.target)) return;
      const checked = !tr.classList.contains("checked-row");
      tr.classList.toggle("checked-row", checked);
      onToggleRowCheck(row.name, checked);
    });
    tr.append(
      makeMaterialCell(row),
      makeStorageCell ? makeStorageCell(row, toBuyCell) : makeTextCell(inStorage, "number-cell"),
      makeTextCell(row.quantity, "number-cell"),
      toBuyCell,
      makeUsedByArtefactsCell(row.artefacts, artefactQuantities, references)
    );
    body.append(tr);
  }

  table.append(body);
  return table;
}

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, input, a, details, summary, select, textarea"));
}

function makeEditableStorageCell(
  row: MaterialRow,
  value: number,
  toBuyCell: HTMLTableCellElement,
  onChange: (name: string, quantity: number) => void
): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = "number-cell editable-storage-cell";
  const stepper = document.createElement("div");
  stepper.className = "qty-stepper storage-quantity-stepper";
  const input = document.createElement("input");
  input.className = "qty-input storage-quantity-input";
  input.type = "text";
  input.inputMode = "numeric";
  input.value = String(value);
  input.setAttribute("aria-label", `${row.name} in storage`);
  const commitValue = (quantity: number) => {
    input.value = String(quantity);
    onChange(row.name, quantity);
    toBuyCell.textContent = String(Math.max(0, row.quantity - quantity));
  };
  input.addEventListener("change", () => {
    const quantity = parseStorageQuantity(input.value);
    commitValue(quantity);
  });
  const arrows = document.createElement("div");
  arrows.className = "qty-arrows";
  const down = makeQuantityButton("-", () => commitValue(Math.max(0, parseStorageQuantity(input.value) - 1)));
  const up = makeQuantityButton("+", () => commitValue(parseStorageQuantity(input.value) + 1));
  arrows.append(up, down);
  stepper.append(input, arrows);
  cell.append(stepper);
  return cell;
}

function parseStorageQuantity(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function makeQuantityButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "qty-button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    onClick();
  });
  return button;
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

  return tile;
}
