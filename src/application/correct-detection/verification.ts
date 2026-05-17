export interface VerifiableDetection {
  corrected?: boolean;
  manual?: boolean;
  ambiguousMatch?: boolean;
  matchGap?: number;
  readonly artefact: string;
  readonly restoredName?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly matchScore?: number | null;
  correction?: {
    readonly correctedAt: string;
    readonly damagedName: string;
    readonly restoredName?: string | null;
    readonly archaeologyLevel?: number | null;
    readonly culture?: string | null;
    readonly scoreAtSelection?: number | null;
    readonly source: "row-verified";
  };
}

export function verifyDetection<TDetection extends VerifiableDetection>(
  detection: TDetection,
  minimumMatchGap: number,
  correctedAt = new Date().toISOString()
): boolean {
  if (detection.corrected && detection.manual) return false;

  detection.corrected = true;
  detection.manual = true;
  detection.ambiguousMatch = false;
  detection.matchGap = Math.max(detection.matchGap || 0, minimumMatchGap);
  detection.correction = {
    correctedAt,
    damagedName: detection.artefact,
    restoredName: detection.restoredName,
    archaeologyLevel: detection.archaeologyLevel,
    culture: detection.culture,
    scoreAtSelection: detection.matchScore,
    source: "row-verified"
  };
  return true;
}
