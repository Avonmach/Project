export interface OverviewDetection {
  readonly quantity: number;
  readonly ambiguousMatch?: boolean;
  readonly manual?: boolean;
  readonly quantityManual?: boolean;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface OverviewTabRendererOptions<TDetection extends OverviewDetection> {
  readonly panel: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
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

  panel.append(cards, groups, makeCollectionOverview(visibleDetections));
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
