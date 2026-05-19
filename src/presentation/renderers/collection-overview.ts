import { normalizeName, nullableNumber } from "../../domain/shared/format";

export type CollectionSortKey = "name" | "collector" | "level" | "progress";
export type CollectionSortDirection = "asc" | "desc";

export interface CollectionSort {
  readonly key: CollectionSortKey;
  readonly direction: CollectionSortDirection;
}

export interface CollectionOverviewDetection {
  readonly artefact: string;
  readonly restoredName?: string | null;
  readonly quantity: number;
}

export interface ArchaeologyCollection {
  readonly name: string;
  readonly collector?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly wikiPage?: string | null;
  readonly artefacts: readonly string[];
  readonly artefactCount?: number | null;
  readonly chronotes?: number | null;
  readonly firstReward?: string | null;
  readonly recurringReward?: string | null;
}

export interface CollectionReference {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
  readonly wikiPage?: string | null;
  readonly restoredWikiPage?: string | null;
  readonly digSite?: string | null;
  readonly excavationHotspot?: string | null;
}

export interface CollectionOverviewRow {
  readonly collection: ArchaeologyCollection;
  readonly matched: readonly string[];
  readonly progress: number;
  readonly progressTotal: number;
  readonly progressPercent: number;
}

export interface OwnedArtefact {
  readonly name: string;
  readonly quantity: number;
}

export interface CollectionArtefactQuantity {
  readonly restored: number;
  readonly damaged: number;
}

export interface CollectionOverviewViewModel extends CollectionOverviewRow {
  readonly artefacts: readonly string[];
  readonly quantities: ReadonlyMap<string, CollectionArtefactQuantity>;
}

export interface CollectionOverviewOptions<TDetection extends CollectionOverviewDetection> {
  readonly items: readonly TDetection[];
  readonly restoredItems: readonly TDetection[];
  readonly collections: readonly ArchaeologyCollection[];
  readonly references: readonly CollectionReference[];
  readonly collectionSort: CollectionSort;
  readonly selectedCollections: ReadonlySet<string>;
  readonly onToggleCollection: (collectionName: string, selected: boolean) => void;
  readonly onSortChange: (sort: CollectionSort) => void;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeLinkedTextCell: (label: string, href?: string | null) => HTMLTableCellElement;
  readonly makeTextCell: (value: string | number, className?: string) => HTMLTableCellElement;
}

export function makeCollectionOverview<TDetection extends CollectionOverviewDetection>({
  items,
  restoredItems,
  collections,
  references,
  collectionSort,
  selectedCollections,
  onToggleCollection,
  onSortChange,
  makeEmptyMessage,
  makeLinkedTextCell,
  makeTextCell
}: CollectionOverviewOptions<TDetection>): HTMLDivElement {
  const section = document.createElement("div");
  section.className = "collection-overview";
  const damagedArtefacts = getOwnedArtefactMap(items);
  const restoredArtefacts = getOwnedArtefactMap(restoredItems);
  const rows = makeCollectionViewModels(collections, restoredArtefacts, damagedArtefacts)
    .filter((row) => row.matched.length)
    .sort((a, b) => compareCollectionRows(a, b, collectionSort));

  const title = document.createElement("h3");
  title.textContent = "Matching collections";
  section.append(title);

  if (!rows.length) {
    section.append(makeEmptyMessage("No collection matches for the current artefacts."));
    return section;
  }

  const table = document.createElement("table");
  table.className = "secondary-table collection-table";
  table.append(makeCollectionColGroup());
  table.append(makeCollectionTableHead(collectionSort, onSortChange));
  const body = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    const key = normalizeName(row.collection.name);
    tr.className = "collection-overview-row";
    tr.classList.toggle("checked-row", selectedCollections.has(key));
    tr.addEventListener("click", (event) => {
      if (isInteractiveRowTarget(event.target)) return;
      const selected = !tr.classList.contains("checked-row");
      tr.classList.toggle("checked-row", selected);
      onToggleCollection(row.collection.name, selected);
    });
    tr.append(
      makeLinkedTextCell(row.collection.name, row.collection.wikiPage),
      makeTextCell(row.collection.collector || ""),
      makeTextCell(row.collection.archaeologyLevel ?? ""),
      makeTextCell(`${row.progress}/${row.progressTotal} (${Math.round(row.progressPercent * 100)}%)`),
      makeCollectionArtefactsCell(row.collection.artefacts, restoredArtefacts, damagedArtefacts, references)
    );
    body.append(tr);
  }
  table.append(body);
  section.append(table);
  return section;
}

export function makeCollectionViewModels(
  collections: readonly ArchaeologyCollection[],
  restoredArtefacts: ReadonlyMap<string, OwnedArtefact>,
  damagedArtefacts: ReadonlyMap<string, OwnedArtefact>
): CollectionOverviewViewModel[] {
  return collections.map((collection) => {
    const quantities = new Map<string, CollectionArtefactQuantity>();
    const matched = collection.artefacts.filter((artefact) => {
      const key = normalizeName(artefact);
      const quantity = {
        restored: restoredArtefacts.get(key)?.quantity || 0,
        damaged: damagedArtefacts.get(key)?.quantity || 0
      };
      quantities.set(key, quantity);
      return quantity.restored > 0 || quantity.damaged > 0;
    });
    const total = collection.artefactCount || collection.artefacts.length || 1;
    return {
      collection,
      artefacts: collection.artefacts,
      quantities,
      matched,
      progress: matched.length,
      progressTotal: total,
      progressPercent: matched.length / total
    };
  });
}

function makeCollectionColGroup(): HTMLTableColElement {
  const group = document.createElement("colgroup");
  for (const className of ["collection-name-col", "collection-collector-col", "collection-level-col", "collection-progress-col", "collection-artefacts-col"]) {
    const col = document.createElement("col");
    col.className = className;
    group.append(col);
  }
  return group;
}

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, details, summary"));
}

function makeCollectionTableHead(collectionSort: CollectionSort, onSortChange: (sort: CollectionSort) => void): HTMLTableSectionElement {
  const columns: readonly [CollectionSortKey | null, string][] = [
    ["name", "Collection"],
    ["collector", "Collector"],
    ["level", "Level"],
    ["progress", "Progress"],
    [null, "Artefacts"]
  ];
  const head = document.createElement("thead");
  const row = document.createElement("tr");

  for (const [key, label] of columns) {
    const cell = document.createElement("th");
    if (!key) {
      cell.textContent = label;
      row.append(cell);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-sort";
    button.textContent = label;
    if (collectionSort.key === key) {
      button.classList.add("is-active");
      button.dataset.direction = collectionSort.direction;
    }
    button.addEventListener("click", () => {
      onSortChange({
        key,
        direction: collectionSort.key === key && collectionSort.direction === "asc" ? "desc" : "asc"
      });
    });
    cell.append(button);
    row.append(cell);
  }

  head.append(row);
  return head;
}

function compareCollectionRows(a: CollectionOverviewRow, b: CollectionOverviewRow, collectionSort: CollectionSort): number {
  const direction = collectionSort.direction === "asc" ? 1 : -1;
  let result = 0;
  if (collectionSort.key === "name") result = a.collection.name.localeCompare(b.collection.name);
  if (collectionSort.key === "collector") {
    result = String(a.collection.collector || "").localeCompare(String(b.collection.collector || ""));
  }
  if (collectionSort.key === "level") {
    result = nullableNumber(a.collection.archaeologyLevel) - nullableNumber(b.collection.archaeologyLevel);
  }
  if (collectionSort.key === "progress") result = a.progressPercent - b.progressPercent || a.progress - b.progress;

  return (
    result * direction ||
    nullableNumber(a.collection.archaeologyLevel) - nullableNumber(b.collection.archaeologyLevel) ||
    a.collection.name.localeCompare(b.collection.name)
  );
}

export function getOwnedArtefactMap<TDetection extends CollectionOverviewDetection>(items: readonly TDetection[]): Map<string, OwnedArtefact> {
  const owned = new Map<string, OwnedArtefact>();
  for (const item of items) {
    const name = item.restoredName || item.artefact;
    const key = normalizeName(name);
    const current = owned.get(key) || { name, quantity: 0 };
    owned.set(key, { ...current, quantity: current.quantity + item.quantity });
  }
  return owned;
}

function makeCollectionArtefactsCell(
  artefacts: readonly string[],
  restoredArtefacts: ReadonlyMap<string, OwnedArtefact>,
  damagedArtefacts: ReadonlyMap<string, OwnedArtefact>,
  references: readonly CollectionReference[]
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const grid = document.createElement("div");
  grid.className = "collection-artefacts";

  for (const artefact of artefacts) {
    const restored = restoredArtefacts.get(normalizeName(artefact));
    const damaged = damagedArtefacts.get(normalizeName(artefact));
    grid.append(makeCollectionArtefactIcon(artefact, restored?.quantity || 0, damaged?.quantity || 0, references));
  }

  cell.append(grid);
  return cell;
}

function makeCollectionArtefactIcon(
  artefact: string,
  restoredQuantity: number,
  damagedQuantity: number,
  references: readonly CollectionReference[]
): HTMLSpanElement {
  const reference = references.find((item) => normalizeName(item.restoredName || item.name) === normalizeName(artefact));
  const stack = document.createElement("span");
  stack.className = "collection-artefact-stack";
  stack.append(
    makeCollectionArtefactTile(reference?.icon, artefact, restoredQuantity, "collection-artefact restored", "restored"),
    makeCollectionArtefactTile(reference?.damagedIcon, artefact, damagedQuantity, "collection-artefact damaged", "damaged")
  );
  return stack;
}

function makeCollectionArtefactTile(
  icon: string | null | undefined,
  artefact: string,
  quantity: number,
  className: string,
  variant: "restored" | "damaged"
): HTMLSpanElement {
  const tile = document.createElement("span");
  tile.className = className;
  if (!quantity) tile.classList.add("is-missing");
  tile.title = quantity ? `${artefact} (${variant}): ${quantity}` : `${artefact} (${variant}): missing`;
  appendCollectionArtefactImage(tile, icon, artefact);
  const badge = document.createElement("span");
  badge.className = "collection-artefact-count";
  badge.textContent = String(quantity);
  tile.append(badge);
  return tile;
}

function appendCollectionArtefactImage(tile: HTMLSpanElement, icon: string | null | undefined, artefact: string): void {
  if (icon) {
    const image = document.createElement("img");
    image.src = `data/${icon}`;
    image.alt = artefact;
    image.loading = "lazy";
    tile.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "collection-artefact-fallback";
    fallback.textContent = artefact.slice(0, 2).toUpperCase();
    tile.append(fallback);
  }
}
