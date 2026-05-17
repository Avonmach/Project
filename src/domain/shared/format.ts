export function percent(value: number | null | undefined): string {
  return `${Math.round((value || 0) * 100)}%`;
}

export function nullableNumber(value: unknown): number {
  return Number.isFinite(value) ? Number(value) : 9999;
}

export function normalizeName(value: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
