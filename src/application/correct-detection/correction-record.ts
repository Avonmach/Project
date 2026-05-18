export type DetectionCorrectionSource = "manual-dropdown" | "row-verified";

export interface DetectionCorrection {
  readonly correctedAt: string;
  readonly damagedName: string;
  readonly restoredName?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly scoreAtSelection?: number | null;
  readonly source: DetectionCorrectionSource;
}
