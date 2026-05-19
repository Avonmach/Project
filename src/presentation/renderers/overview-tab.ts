export interface OverviewDetection {
  readonly artefact: string;
  readonly restoredName?: string | null;
  readonly wikiPage?: string | null;
  readonly damagedWikiPage?: string | null;
  readonly quantity: number;
  readonly ambiguousMatch?: boolean;
  readonly manual?: boolean;
  readonly quantityManual?: boolean;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface OverviewReference {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
}

export interface OverviewTabRendererOptions<TDetection extends OverviewDetection> {
  readonly panel: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly references: readonly OverviewReference[];
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
  readonly makeEmptyMessage: (message: string) => HTMLElement;
  readonly makeOverviewCard: (label: string, value: string | number) => HTMLElement;
  readonly makePlanTable: (caption: string, rows: Array<[string, number]>) => HTMLElement;
  readonly makeCollectionOverview: (items: readonly TDetection[]) => HTMLElement;
}

export function renderOverviewTab<TDetection extends OverviewDetection>({
  panel,
  allDetections,
  visibleDetections,
  references,
  quantityNeedsReview,
  makeEmptyMessage,
  makeOverviewCard,
  makePlanTable,
  makeCollectionOverview
}: OverviewTabRendererOptions<TDetection>): void {
  panel.replaceChildren();
  if (!allDetections.length) {
    panel.append(makeEmptyMessage("Analyze a screenshot to create an overview."));
    return;
  }

  const totalQuantity = visibleDetections.reduce((sum, detection) => sum + detection.quantity, 0);
  const reviewCount = visibleDetections.filter((detection) => detection.ambiguousMatch || quantityNeedsReview(detection)).length;
  const manualCount = visibleDetections.filter((detection) => detection.manual || detection.quantityManual).length;
  const levels = visibleDetections
    .map((detection) => detection.archaeologyLevel)
    .filter((level): level is number => Number.isFinite(level));

  const cards = document.createElement("div");
  cards.className = "overview-grid";
  cards.append(
    makeOverviewCard("Visible slots", visibleDetections.length),
    makeOverviewCard("Visible quantity", totalQuantity),
    makeOverviewCard("Needs review", reviewCount),
    makeOverviewCard("Manual checks", manualCount),
    makeOverviewCard("Highest level", levels.length ? Math.max(...levels) : 0)
  );

  const groups = document.createElement("div");
  groups.className = "overview-tables";
  groups.append(
    makePlanTable("By culture", groupQuantity(visibleDetections, "culture")),
    makePlanTable("By dig site", groupQuantity(visibleDetections, "digSite"))
  );

  panel.append(cards, groups, makeOverviewArtefacts(visibleDetections, references), makeCollectionOverview(visibleDetections));
}

function groupQuantity<TDetection extends OverviewDetection>(
  items: readonly TDetection[],
  key: "culture" | "digSite"
): Array<[string, number]> {
  const groups = new Map<string, number>();
  for (const detection of items) {
    const name = detection[key] || "Unknown";
    groups.set(name, (groups.get(name) || 0) + detection.quantity);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

interface OverviewArtefactRow {
  readonly restoredName: string;
  readonly damagedName: string;
  readonly quantity: number;
}

function makeOverviewArtefacts<TDetection extends OverviewDetection>(
  items: readonly TDetection[],
  references: readonly OverviewReference[]
): HTMLElement {
  const section = document.createElement("div");
  section.className = "overview-artefacts";
  const title = document.createElement("h3");
  title.textContent = "Detected artefacts";
  section.append(title);

  const rows = groupArtefacts(items);
  if (!rows.length) return section;

  const grid = document.createElement("div");
  grid.className = "overview-artefact-grid";
  for (const row of rows) {
    const reference = findReference(row, references);
    grid.append(makeOverviewArtefactTile(row, reference));
  }
  section.append(grid);
  return section;
}

function groupArtefacts<TDetection extends OverviewDetection>(items: readonly TDetection[]): OverviewArtefactRow[] {
  const grouped = new Map<string, OverviewArtefactRow>();
  for (const item of items) {
    const restoredName = item.restoredName || item.artefact;
    const key = normalizeOverviewName(restoredName);
    const current = grouped.get(key);
    grouped.set(key, {
      restoredName,
      damagedName: current?.damagedName || item.artefact,
      quantity: (current?.quantity || 0) + item.quantity
    });
  }
  return [...grouped.values()].sort((a, b) => a.restoredName.localeCompare(b.restoredName));
}

function makeOverviewArtefactTile(row: OverviewArtefactRow, reference: OverviewReference | null): HTMLElement {
  const tile = document.createElement("div");
  tile.className = "overview-artefact-tile";
  tile.append(
    makeOverviewArtefactLine({
      name: row.restoredName,
      quantity: row.quantity,
      icon: reference?.icon,
      className: "overview-artefact-line restored"
    }),
    makeOverviewArtefactLine({
      name: row.damagedName,
      quantity: row.quantity,
      icon: reference?.damagedIcon,
      className: "overview-artefact-line damaged"
    })
  );
  return tile;
}

function makeOverviewArtefactLine({
  name,
  quantity,
  icon,
  className
}: {
  readonly name: string;
  readonly quantity: number;
  readonly icon?: string | null;
  readonly className: string;
}): HTMLElement {
  const line = document.createElement("div");
  line.className = className;
  if (icon) {
    const image = document.createElement("img");
    image.src = `data/${icon}`;
    image.alt = "";
    image.loading = "lazy";
    line.append(image);
  }
  const label = document.createElement("span");
  label.textContent = name;
  const count = document.createElement("strong");
  count.textContent = String(quantity);
  line.append(label, count);
  return line;
}

function findReference(row: OverviewArtefactRow, references: readonly OverviewReference[]): OverviewReference | null {
  const restoredKey = normalizeOverviewName(row.restoredName);
  const damagedKey = normalizeOverviewName(row.damagedName);
  return (
    references.find(
      (reference) =>
        normalizeOverviewName(reference.restoredName || reference.name) === restoredKey ||
        normalizeOverviewName(reference.name) === damagedKey
    ) || null
  );
}

function normalizeOverviewName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
