export interface RestorationPlanDetection {
  readonly quantity: number;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly ambiguousMatch?: boolean;
}

export interface RestorationPlanOptions<TDetection extends RestorationPlanDetection> {
  readonly body: HTMLElement;
  readonly visibleCountElement: HTMLElement;
  readonly reviewCountElement: HTMLElement;
  readonly highestLevelElement: HTMLElement;
  readonly allDetections: readonly TDetection[];
  readonly visibleDetections: readonly TDetection[];
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

export function renderRestorationPlan<TDetection extends RestorationPlanDetection>({
  body,
  visibleCountElement,
  reviewCountElement,
  highestLevelElement,
  allDetections,
  visibleDetections,
  quantityNeedsReview
}: RestorationPlanOptions<TDetection>): void {
  const selectedQuantity = visibleDetections.reduce((sum, detection) => sum + detection.quantity, 0);
  const reviewCount = allDetections.filter((detection) => detection.ambiguousMatch || quantityNeedsReview(detection)).length;
  const levels = visibleDetections
    .map((detection) => detection.archaeologyLevel)
    .filter((level): level is number => Number.isFinite(level));

  visibleCountElement.textContent = String(selectedQuantity);
  reviewCountElement.textContent = String(reviewCount);
  highestLevelElement.textContent = levels.length ? String(Math.max(...levels)) : "0";

  body.replaceChildren();
  if (!visibleDetections.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = allDetections.length ? "No visible artefacts for the current filters." : "Analyze a screenshot to populate the restoration plan.";
    body.append(empty);
    return;
  }

  body.append(
    makePlanList("By culture", groupQuantity(visibleDetections, "culture")),
    makePlanList("By dig site", groupQuantity(visibleDetections, "digSite"))
  );
}

function makePlanList(captionText: string, rows: readonly [string, number][]): HTMLElement {
  const section = document.createElement("section");
  section.className = "plan-list";

  const title = document.createElement("h3");
  title.textContent = captionText;

  const header = document.createElement("div");
  header.className = "plan-list-row plan-list-head";
  header.append(makePlanListCell("Group", "plan-list-name"), makePlanListCell("Qty", "plan-list-qty"));

  const items = document.createElement("div");
  items.className = "plan-list-items";
  for (const [name, quantity] of rows) {
    const row = document.createElement("div");
    row.className = "plan-list-row";
    row.append(makePlanListCell(name, "plan-list-name"), makePlanListCell(String(quantity), "plan-list-qty"));
    items.append(row);
  }

  section.append(title, header, items);
  return section;
}

function makePlanListCell(text: string, className: string): HTMLSpanElement {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function groupQuantity<TDetection extends RestorationPlanDetection>(
  items: readonly TDetection[],
  key: "culture" | "digSite"
): [string, number][] {
  const groups = new Map<string, number>();
  for (const detection of items) {
    const name = detection[key] || "Unknown";
    groups.set(name, (groups.get(name) || 0) + detection.quantity);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
