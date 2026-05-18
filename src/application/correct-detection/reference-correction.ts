export interface ReferenceCorrectionItem {
  readonly name: string;
  readonly wikiPage?: string | null;
  readonly restoredName?: string | null;
  readonly restoredWikiPage?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface ReferenceCorrectableDetection<TItem extends ReferenceCorrectionItem> {
  artefact?: string;
  wikiPage?: string | null;
  damagedWikiPage?: string | null;
  restoredName?: string | null;
  restoredWikiPage?: string | null;
  archaeologyLevel?: number | null;
  culture?: string | null;
  digSite?: string | null;
  matchName?: string;
  matchScore?: number;
  shapeScore?: number;
  colorScore?: number;
  colorExistenceScore?: number;
  colorPositionScore?: number;
  restoredScore?: number;
  damagedScore?: number;
  ambiguousMatch?: boolean;
  matchGap?: number;
  algorithmBest?: {
    readonly shape: { readonly item: TItem; readonly score: number };
    readonly color: { readonly item: TItem; readonly score: number };
    readonly restored: { readonly item: TItem; readonly score: number };
    readonly damaged: { readonly item: TItem; readonly score: number };
  };
  corrected?: boolean;
  manual?: boolean;
  correction?: unknown;
}

export function applyReferenceCorrection<TDetection extends ReferenceCorrectableDetection<TItem>, TItem extends ReferenceCorrectionItem>(
  detection: TDetection,
  item: TItem,
  score: number | null,
  correctedAt = new Date().toISOString()
): void {
  const selectedScore = score ?? 1;
  detection.artefact = item.name;
  detection.wikiPage = item.restoredWikiPage || item.wikiPage;
  detection.damagedWikiPage = item.wikiPage;
  detection.restoredName = item.restoredName;
  detection.restoredWikiPage = item.restoredWikiPage;
  detection.archaeologyLevel = item.archaeologyLevel;
  detection.culture = item.culture;
  detection.digSite = item.digSite;
  detection.matchName = item.restoredName || item.name;
  detection.matchScore = selectedScore;
  detection.shapeScore = selectedScore;
  detection.colorScore = selectedScore;
  detection.colorExistenceScore = selectedScore;
  detection.colorPositionScore = selectedScore;
  detection.restoredScore = selectedScore;
  detection.damagedScore = selectedScore;
  detection.ambiguousMatch = false;
  detection.matchGap = 1;
  detection.algorithmBest = {
    shape: { item, score: selectedScore },
    color: { item, score: selectedScore },
    restored: { item, score: selectedScore },
    damaged: { item, score: selectedScore }
  };
  detection.corrected = true;
  detection.manual = true;
  detection.correction = {
    correctedAt,
    damagedName: item.name,
    restoredName: item.restoredName,
    archaeologyLevel: item.archaeologyLevel,
    culture: item.culture,
    scoreAtSelection: score,
    source: "manual-dropdown"
  };
}
