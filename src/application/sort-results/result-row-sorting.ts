import { nullableNumber } from "../../domain/shared/format";

export type ResultSortMode = "position" | "level" | "theme" | "site" | string;

export interface RestoredResultRow {
  readonly restoredName: string;
  readonly level?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface MaterialResultRow {
  readonly name: string;
  readonly quantity: number;
}

export function sortRestoredRows<TRow extends RestoredResultRow>(rows: readonly TRow[], mode: ResultSortMode): TRow[] {
  return [...rows].sort((a, b) => {
    if (mode === "level") {
      return nullableNumber(a.level) - nullableNumber(b.level) || a.restoredName.localeCompare(b.restoredName);
    }
    if (mode === "theme") {
      return String(a.culture || "Unknown").localeCompare(String(b.culture || "Unknown")) || a.restoredName.localeCompare(b.restoredName);
    }
    if (mode === "site") {
      return String(a.digSite || "Unknown").localeCompare(String(b.digSite || "Unknown")) || a.restoredName.localeCompare(b.restoredName);
    }
    return a.restoredName.localeCompare(b.restoredName);
  });
}

export function sortMaterialRows<TRow extends MaterialResultRow>(rows: readonly TRow[], mode: ResultSortMode): TRow[] {
  return [...rows].sort((a, b) => {
    if (mode === "level" || mode === "position") return b.quantity - a.quantity || a.name.localeCompare(b.name);
    if (mode === "theme" || mode === "site") return a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}
