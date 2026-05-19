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
}

export interface CollectionReference {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
}

interface CollectionOverviewRow {
  readonly collection: ArchaeologyCollection;
  readonly matched: readonly string[];
  readonly progress: number;
  readonly progressTotal: number;
  readonly progressPercent: number;
}

interface OwnedArtefact {
  readonly name: string;
  readonly quantity: number;
}

export interface CollectionOverviewOptions<TDetection extends CollectionOverviewDetection> {
  readonly items: readonly TDetection[];
  readonly collections: readonly ArchaeologyCollection[];
  readonly references: readonly CollectionReference[];
  readonly collectionSort: CollectionSort;
  readonly onSortChange: (sort: CollectionSort) => void;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeLinkedTextCell: (label: string, href?: string | null) => HTMLTableCellElement;
  readonly makeTextCell: (value: string | number, className?: string) => HTMLTableCellElement;
}

export function makeCollectionOverview<TDetection extends CollectionOverviewDetection>({
  items,
  collections,
  references,
  collectionSort,
  onSortChange,
  makeEmptyMessage,
  makeLinkedTextCell,
  makeTextCell
}: CollectionOverviewOptions<TDetection>): HTMLDivElement {
  const section = document.createElement("div");
  section.className = "collection-overview";
  const ownedArtefacts = getOwnedArtefactMap(items);
  const rows = collections
    .map((collection) => {
      const matched = collection.artefacts.filter((artefact) => ownedArtefacts.has(normalizeName(artefact)));
      const total = collection.artefactCount || collection.artefacts.length || 1;
      return { collection, matched, progress: matched.length, progressTotal: total, progressPercent: matched.length / total };
    })
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
    tr.append(
      makeLinkedTextCell(row.collection.name, row.collection.wikiPage),
      makeTextCell(row.collection.collector || ""),
      makeTextCell(row.collection.archaeologyLevel ?? ""),
      makeTextCell(`${row.progress}/${row.progressTotal} (${Math.round(row.progressPercent * 100)}%)`),
      makeCollectionArtefactsCell(row.collection.artefacts, ownedArtefacts, references)
    );
    body.append(tr);
  }
  table.append(body);
  section.append(table);
  return section;
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

function getOwnedArtefactMap<TDetection extends CollectionOverviewDetection>(items: readonly TDetection[]): Map<string, OwnedArtefact> {
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
  ownedArtefacts: ReadonlyMap<string, OwnedArtefact>,
  references: readonly CollectionReference[]
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const grid = document.createElement("div");
  grid.className = "collection-artefacts";

  for (const artefact of artefacts) {
    const owned = ownedArtefacts.get(normalizeName(artefact));
    grid.append(makeCollectionArtefactIcon(artefact, owned?.quantity || 0, references));
  }

  cell.append(grid);
  return cell;
}

function makeCollectionArtefactIcon(
  artefact: string,
  quantity: number,
  references: readonly CollectionReference[]
): HTMLSpanElement {
  const reference = references.find((item) => normalizeName(item.restoredName || item.name) === normalizeName(artefact));
  const tile = document.createElement("span");
  tile.className = "collection-artefact collection-artefact-stack";
  if (!quantity) tile.classList.add("is-missing");
  tile.title = quantity ? `${artefact}: ${quantity}` : `${artefact}: missing`;
  tile.append(
    makeCollectionArtefactVariant(reference?.icon, artefact, "collection-artefact-variant restored"),
    makeCollectionArtefactVariant(reference?.damagedIcon, artefact, "collection-artefact-variant damaged")
  );

  const badge = document.createElement("span");
  badge.className = "collection-artefact-count";
  badge.textContent = String(quantity);
  tile.append(badge);
  return tile;
}

function makeCollectionArtefactVariant(icon: string | null | undefined, artefact: string, className: string): HTMLSpanElement {
  const variant = document.createElement("span");
  variant.className = className;
  if (icon) {
    const image = document.createElement("img");
    image.src = `data/${icon}`;
    image.alt = artefact;
    image.loading = "lazy";
    variant.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "collection-artefact-fallback";
    fallback.textContent = artefact.slice(0, 2).toUpperCase();
    variant.append(fallback);
  }
  return variant;
}
