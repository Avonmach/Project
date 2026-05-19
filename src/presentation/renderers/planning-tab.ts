import { normalizeName } from "../../domain/shared/format";
import {
  getOwnedArtefactMap,
  type ArchaeologyCollection,
  type CollectionOverviewDetection,
  type CollectionReference,
  type OwnedArtefact
} from "./collection-overview";
import type { MaterialRecipe } from "../../application/calculate-materials/material-totals";

export interface PlanningTabOptions<TDetection extends CollectionOverviewDetection> {
  readonly panel: HTMLElement;
  readonly selectedCollections: ReadonlySet<string>;
  readonly collectionCounts: ReadonlyMap<string, number>;
  readonly collections: readonly ArchaeologyCollection[];
  readonly damagedItems: readonly TDetection[];
  readonly restoredItems: readonly TDetection[];
  readonly references: readonly CollectionReference[];
  readonly recipeByRestoredName: ReadonlyMap<string, MaterialRecipe>;
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
  recipeByRestoredName,
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
        recipeByRestoredName,
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
  recipeByRestoredName,
  onCollectionCountChange
}: {
  readonly collection: ArchaeologyCollection;
  readonly count: number;
  readonly restoredArtefacts: Map<string, OwnedArtefact>;
  readonly damagedArtefacts: Map<string, OwnedArtefact>;
  readonly references: readonly CollectionReference[];
  readonly recipeByRestoredName: ReadonlyMap<string, MaterialRecipe>;
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
  const missing: MissingArtefact[] = [];
  let restorationExperience = 0;
  for (const artefact of collection.artefacts) {
    const row = calculatePlannedArtefact(artefact, count, restoredArtefacts, damagedArtefacts);
    artefacts.append(makePlanningArtefactRow(row, references));
    if (row.missing > 0) missing.push(makeMissingArtefact(row, references));
    restorationExperience += (recipeByRestoredName.get(normalizeName(artefact))?.experience || 0) * row.damagedUsed;
  }
  const rewards = makeCollectionRewards(collection, count, restorationExperience);

  card.append(heading, artefacts, rewards);
  if (missing.length) card.append(makeMissingList(missing));
  return card;
}

function makeCollectionRewards(collection: ArchaeologyCollection, count: number, restorationExperience: number): HTMLElement {
  const rewards = document.createElement("div");
  rewards.className = "planning-rewards";
  const rewardParts: string[] = [];
  const repeatCount = collection.firstReward ? Math.max(0, count - 1) : count;
  const chronotes = (collection.chronotes || 0) * count;
  const rexFragments = countRexFragments(collection.firstReward, collection.firstReward ? 1 : 0) +
    countRexFragments(collection.recurringReward, repeatCount);
  const rexExperience = calculateRexFragmentExperience(rexFragments, collection.archaeologyLevel || 1);
  if (chronotes) rewardParts.push(`${formatNumber(chronotes)} chronotes`);
  if (collection.firstReward) rewardParts.push(`First: ${collection.firstReward}`);
  if (collection.recurringReward && repeatCount > 0) {
    rewardParts.push(`Repeat x${repeatCount}: ${collection.recurringReward}`);
  }
  if (restorationExperience) rewardParts.push(`Restore XP: ${formatNumber(restorationExperience)}`);
  if (rexExperience) rewardParts.push(`Rex XP: ${formatNumber(rexExperience)}`);
  if (restorationExperience || rexExperience) {
    rewardParts.push(`Total XP: ${formatNumber(restorationExperience + rexExperience)}`);
  }
  rewards.textContent = rewardParts.length ? `Reward: ${rewardParts.join(" | ")}` : "Reward: none listed";
  return rewards;
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
  readonly restoredRemaining: number;
  readonly restoredUsed: number;
  readonly damagedRemaining: number;
  readonly damagedUsed: number;
  readonly missing: number;
}

interface MissingArtefact {
  readonly name: string;
  readonly quantity: number;
  readonly artefactWikiPage?: string | null;
  readonly excavationSite?: string | null;
  readonly excavationSiteWikiPage?: string | null;
}

function calculatePlannedArtefact(
  name: string,
  count: number,
  restoredArtefacts: Map<string, OwnedArtefact>,
  damagedArtefacts: Map<string, OwnedArtefact>
): PlannedArtefact {
  const key = normalizeName(name);
  const restoredQuantity = restoredArtefacts.get(key)?.quantity || 0;
  const restoredUsed = Math.min(count, restoredQuantity);
  consumeArtefact(restoredArtefacts, key, restoredUsed);
  const remainingAfterRestored = count - restoredUsed;
  const damagedQuantity = damagedArtefacts.get(key)?.quantity || 0;
  const damagedUsed = Math.min(remainingAfterRestored, damagedQuantity);
  consumeArtefact(damagedArtefacts, key, damagedUsed);
  return {
    name,
    restoredRemaining: Math.max(0, restoredQuantity - restoredUsed),
    restoredUsed,
    damagedRemaining: Math.max(0, damagedQuantity - damagedUsed),
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
    makePlanningVariant(reference?.icon, row.name, row.restoredRemaining, "Restored", "restored"),
    makePlanningVariant(reference?.damagedIcon, row.name, row.damagedRemaining, "Damaged", "damaged")
  );
  if (row.missing) {
    const missing = document.createElement("span");
    missing.className = "planning-missing-count";
    missing.textContent = `Missing ${row.missing}`;
    item.append(missing);
  }
  return item;
}

function makeMissingArtefact(row: PlannedArtefact, references: readonly CollectionReference[]): MissingArtefact {
  const reference = references.find((candidate) => normalizeName(candidate.restoredName || candidate.name) === normalizeName(row.name));
  const excavationSite = reference?.excavationHotspot || reference?.digSite || null;
  return {
    name: row.name,
    quantity: row.missing,
    artefactWikiPage: reference?.restoredWikiPage || reference?.wikiPage || makeWikiPage(row.name),
    excavationSite,
    excavationSiteWikiPage: excavationSite ? makeWikiPage(excavationSite) : null
  };
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

function makeMissingList(missing: readonly MissingArtefact[]): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "planning-missing";
  const title = document.createElement("strong");
  title.textContent = "Missing artefacts";
  const list = document.createElement("ul");
  for (const item of missing) {
    const li = document.createElement("li");
    li.append(
      makePlanningLink(item.name, item.artefactWikiPage, "artifact-link"),
      document.createTextNode(` x${item.quantity}`)
    );
    if (item.excavationSite) {
      li.append(document.createTextNode(" - "), makePlanningLink(item.excavationSite, item.excavationSiteWikiPage));
    }
    list.append(li);
  }
  wrapper.append(title, list);
  return wrapper;
}

function makePlanningLink(label: string, href?: string | null, className?: string): HTMLElement {
  if (!href) {
    const span = document.createElement("span");
    if (className) span.className = className;
    span.textContent = label;
    return span;
  }
  const link = document.createElement("a");
  if (className) link.className = className;
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function makeWikiPage(title: string): string {
  return `https://runescape.wiki/w/${encodeURIComponent(title).replace(/%20/g, "_")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function countRexFragments(reward: string | null | undefined, multiplier: number): number {
  if (!reward || multiplier <= 0) return 0;
  const match = reward.match(/([\d,]+)\s+rex skeleton fragments/i);
  const fragmentCount = match?.[1];
  if (!fragmentCount) return 0;
  return (Number.parseInt(fragmentCount.replace(/,/g, ""), 10) || 0) * multiplier;
}

function calculateRexFragmentExperience(fragments: number, level: number): number {
  if (fragments <= 0) return 0;
  const baseExperience = REX_FRAGMENT_BASE_EXPERIENCE[Math.max(1, Math.min(120, Math.floor(level)))] || 0;
  const multiplier = fragments >= 100 ? 1.2 : fragments >= 10 ? 1.1 : 1;
  return baseExperience * multiplier * fragments;
}

const REX_FRAGMENT_BASE_EXPERIENCE: Record<number, number> = {
  1: 3.3,
  2: 3.6,
  3: 4.1,
  4: 4.5,
  5: 4.9,
  6: 5.5,
  7: 6.5,
  8: 6.7,
  9: 7.7,
  10: 8.1,
  11: 9.0,
  12: 10.0,
  13: 10.9,
  14: 12.2,
  15: 13.4,
  16: 13.9,
  17: 14.4,
  18: 14.9,
  19: 15.5,
  20: 16.1,
  21: 16.7,
  22: 17.3,
  23: 18.0,
  24: 18.8,
  25: 19.5,
  26: 20.3,
  27: 21.2,
  28: 22.1,
  29: 23.0,
  30: 24.1,
  31: 25.1,
  32: 26.2,
  33: 27.4,
  34: 28.7,
  35: 30.0,
  36: 31.4,
  37: 32.9,
  38: 34.4,
  39: 36.0,
  40: 37.8,
  41: 39.6,
  42: 41.5,
  43: 43.5,
  44: 45.6,
  45: 47.8,
  46: 50.2,
  47: 52.7,
  48: 55.3,
  49: 58.0,
  50: 60.9,
  51: 63.9,
  52: 67.0,
  53: 70.3,
  54: 73.8,
  55: 77.5,
  56: 81.3,
  57: 85.3,
  58: 89.5,
  59: 93.9,
  60: 98.5,
  61: 103.2,
  62: 108.2,
  63: 113.5,
  64: 118.9,
  65: 124.5,
  66: 130.4,
  67: 136.6,
  68: 142.9,
  69: 149.5,
  70: 156.4,
  71: 163.5,
  72: 170.8,
  73: 178.4,
  74: 186.3,
  75: 194.4,
  76: 202.7,
  77: 211.3,
  78: 220.1,
  79: 229.2,
  80: 238.5,
  81: 248.0,
  82: 257.7,
  83: 267.6,
  84: 277.7,
  85: 288.1,
  86: 298.5,
  87: 309.2,
  88: 320.0,
  89: 330.9,
  90: 341.9,
  91: 353.1,
  92: 364.3,
  93: 375.6,
  94: 386.9,
  95: 398.2,
  96: 409.6,
  97: 420.9,
  98: 432.3,
  99: 443.6,
  100: 454.8,
  101: 465.9,
  102: 476.9,
  103: 487.9,
  104: 498.7,
  105: 509.3,
  106: 519.8,
  107: 530.1,
  108: 540.3,
  109: 550.2,
  110: 559.9,
  111: 569.5,
  112: 578.8,
  113: 587.8,
  114: 596.7,
  115: 605.3,
  116: 613.6,
  117: 621.7,
  118: 629.6,
  119: 637.2,
  120: 644.5
};
