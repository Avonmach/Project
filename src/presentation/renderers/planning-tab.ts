import { normalizeName } from "../../domain/shared/format";
import {
  getOwnedArtefactMap,
  type ArchaeologyCollection,
  type CollectionOverviewDetection,
  type CollectionReference,
  type OwnedArtefact
} from "./collection-overview";

export interface PlanningTabOptions<TDetection extends CollectionOverviewDetection> {
  readonly panel: HTMLElement;
  readonly selectedCollections: ReadonlySet<string>;
  readonly collectionCounts: ReadonlyMap<string, number>;
  readonly collections: readonly ArchaeologyCollection[];
  readonly damagedItems: readonly TDetection[];
  readonly restoredItems: readonly TDetection[];
  readonly references: readonly CollectionReference[];
  readonly onCollectionCountChange: (collectionName: string, count: number) => void;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
}

export function renderPlanningTab<TDetection extends CollectionOverviewDetection>({
  panel,
  selectedCollections,
  collectionCounts,
  collections,
  damagedItems,
  restoredItems,
  references,
  onCollectionCountChange,
  makeEmptyMessage
}: PlanningTabOptions<TDetection>): void {
  panel.replaceChildren();
  const selected = collections.filter((collection) => selectedCollections.has(normalizeName(collection.name)));
  if (!selected.length) {
    panel.append(makeEmptyMessage("Select collections in Overview to create a plan."));
    return;
  }

  const restoredArtefacts = getOwnedArtefactMap(restoredItems);
  const damagedArtefacts = getOwnedArtefactMap(damagedItems);
  const list = document.createElement("div");
  list.className = "planning-collections";

  for (const collection of selected) {
    list.append(
      makePlanningCollectionCard({
        collection,
        count: collectionCounts.get(normalizeName(collection.name)) || 1,
        restoredArtefacts,
        damagedArtefacts,
        references,
        onCollectionCountChange
      })
    );
  }

  panel.append(list);
}

function makePlanningCollectionCard({
  collection,
  count,
  restoredArtefacts,
  damagedArtefacts,
  references,
  onCollectionCountChange
}: {
  readonly collection: ArchaeologyCollection;
  readonly count: number;
  readonly restoredArtefacts: Map<string, OwnedArtefact>;
  readonly damagedArtefacts: Map<string, OwnedArtefact>;
  readonly references: readonly CollectionReference[];
  readonly onCollectionCountChange: (collectionName: string, count: number) => void;
}): HTMLElement {
  const card = document.createElement("section");
  card.className = "planning-collection";
  const heading = document.createElement("div");
  heading.className = "planning-collection-heading";
  const title = document.createElement("h3");
  title.textContent = collection.name;
  heading.append(title, makeCountControl(collection.name, count, onCollectionCountChange));

  const artefacts = document.createElement("div");
  artefacts.className = "planning-artefacts";
  const missing: string[] = [];
  for (const artefact of collection.artefacts) {
    const row = calculatePlannedArtefact(artefact, count, restoredArtefacts, damagedArtefacts);
    if (row.missing > 0) missing.push(`${artefact} x${row.missing}`);
    artefacts.append(makePlanningArtefactRow(row, references));
  }

  card.append(heading, artefacts);
  if (missing.length) card.append(makeMissingList(missing));
  return card;
}

function makeCountControl(
  collectionName: string,
  count: number,
  onCollectionCountChange: (collectionName: string, count: number) => void
): HTMLElement {
  const control = document.createElement("div");
  control.className = "planning-count-control";
  const down = makeCountButton("-", () => onCollectionCountChange(collectionName, Math.max(1, count - 1)));
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.value = String(count);
  input.setAttribute("aria-label", `${collectionName} count`);
  input.addEventListener("change", () => {
    const parsed = Number.parseInt(input.value, 10);
    onCollectionCountChange(collectionName, Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  });
  const up = makeCountButton("+", () => onCollectionCountChange(collectionName, count + 1));
  control.append(down, input, up);
  return control;
}

function makeCountButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

interface PlannedArtefact {
  readonly name: string;
  readonly restoredUsed: number;
  readonly damagedUsed: number;
  readonly missing: number;
}

function calculatePlannedArtefact(
  name: string,
  count: number,
  restoredArtefacts: Map<string, OwnedArtefact>,
  damagedArtefacts: Map<string, OwnedArtefact>
): PlannedArtefact {
  const key = normalizeName(name);
  const restoredUsed = Math.min(count, restoredArtefacts.get(key)?.quantity || 0);
  consumeArtefact(restoredArtefacts, key, restoredUsed);
  const remainingAfterRestored = count - restoredUsed;
  const damagedUsed = Math.min(remainingAfterRestored, damagedArtefacts.get(key)?.quantity || 0);
  consumeArtefact(damagedArtefacts, key, damagedUsed);
  return {
    name,
    restoredUsed,
    damagedUsed,
    missing: Math.max(0, remainingAfterRestored - damagedUsed)
  };
}

function consumeArtefact(artefacts: Map<string, OwnedArtefact>, key: string, quantity: number): void {
  if (!quantity) return;
  const current = artefacts.get(key);
  if (!current) return;
  artefacts.set(key, { ...current, quantity: Math.max(0, current.quantity - quantity) });
}

function makePlanningArtefactRow(row: PlannedArtefact, references: readonly CollectionReference[]): HTMLElement {
  const item = document.createElement("div");
  item.className = "planning-artefact";
  const reference = references.find((candidate) => normalizeName(candidate.restoredName || candidate.name) === normalizeName(row.name));
  item.append(
    makePlanningVariant(reference?.icon, row.name, row.restoredUsed, "Restored", "restored"),
    makePlanningVariant(reference?.damagedIcon, row.name, row.damagedUsed, "Damaged", "damaged")
  );
  if (row.missing) {
    const missing = document.createElement("span");
    missing.className = "planning-missing-count";
    missing.textContent = `Missing ${row.missing}`;
    item.append(missing);
  }
  return item;
}

function makePlanningVariant(
  icon: string | null | undefined,
  name: string,
  count: number,
  label: string,
  variant: "restored" | "damaged"
): HTMLElement {
  const item = document.createElement("span");
  item.className = `planning-variant ${variant}`;
  if (!count) item.classList.add("is-missing");
  if (icon) {
    const image = document.createElement("img");
    image.src = `data/${icon}`;
    image.alt = "";
    image.loading = "lazy";
    item.append(image);
  }
  const text = document.createElement("span");
  text.textContent = `${label} ${count}`;
  item.title = `${name} (${label.toLowerCase()}): ${count}`;
  item.append(text);
  return item;
}

function makeMissingList(missing: readonly string[]): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "planning-missing";
  const title = document.createElement("strong");
  title.textContent = "Missing artefacts";
  const list = document.createElement("ul");
  for (const item of missing) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
  wrapper.append(title, list);
  return wrapper;
}
