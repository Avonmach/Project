export type ResultSortMode = "position" | "level" | "theme" | "site" | string;

export interface MaterialResultRow {
  readonly name: string;
  readonly quantity: number;
}

export function sortMaterialRows<TRow extends MaterialResultRow>(rows: readonly TRow[], mode: ResultSortMode): TRow[] {
  return [...rows].sort((a, b) => {
    if (mode === "level" || mode === "position") return b.quantity - a.quantity || a.name.localeCompare(b.name);
    if (mode === "theme" || mode === "site") return a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}
