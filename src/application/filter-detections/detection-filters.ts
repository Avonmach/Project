import { nullableNumber } from "../../domain/shared/format";

export type DetectionSortMode = "position" | "level" | "theme" | "site" | string;

export interface FilterableDetection {
  readonly bankIndex: number;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly restoredName?: string | null;
  readonly artefact: string;
  readonly ambiguousMatch?: boolean;
}

export interface DetectionFilterOptions<TDetection extends FilterableDetection> {
  readonly query: string;
  readonly culture: string;
  readonly reviewOnly: boolean;
  readonly quantityNeedsReview: (detection: TDetection) => boolean;
}

export function filterAndSortDetections<TDetection extends FilterableDetection>(
  detections: readonly TDetection[],
  sortMode: DetectionSortMode,
  filters: DetectionFilterOptions<TDetection>
): TDetection[] {
  return sortDetections(detections, sortMode).filter((detection) => matchesDetectionFilters(detection, filters));
}

export function sortDetections<TDetection extends FilterableDetection>(
  detections: readonly TDetection[],
  mode: DetectionSortMode
): TDetection[] {
  const items = [...detections];
  if (mode === "level") {
    return items.sort(
      (a, b) =>
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  if (mode === "theme") {
    return items.sort(
      (a, b) =>
        String(a.culture || "Unknown").localeCompare(String(b.culture || "Unknown")) ||
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  if (mode === "site") {
    return items.sort(
      (a, b) =>
        String(a.digSite || "Unknown").localeCompare(String(b.digSite || "Unknown")) ||
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  return items.sort((a, b) => a.bankIndex - b.bankIndex);
}

export function matchesDetectionFilters<TDetection extends FilterableDetection>(
  detection: TDetection,
  { query, culture, reviewOnly, quantityNeedsReview }: DetectionFilterOptions<TDetection>
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (culture && detection.culture !== culture) return false;
  if (reviewOnly && !(detection.ambiguousMatch || quantityNeedsReview(detection))) return false;
  if (!normalizedQuery) return true;
  return [
    detection.restoredName,
    detection.artefact,
    detection.culture,
    detection.digSite,
    detection.archaeologyLevel
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function sortDetectionName(item: FilterableDetection): string {
  return String(item.restoredName || item.artefact)
    .replace(/['"]/g, "")
    .toLowerCase();
}
