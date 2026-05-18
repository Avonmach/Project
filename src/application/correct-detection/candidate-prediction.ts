import type { ArtefactScoringWeights } from "../../domain/artefacts/matching";

export interface CandidatePredictionItem {
  readonly name: string;
  readonly wikiPage?: string | null;
  readonly restoredName?: string | null;
  readonly restoredWikiPage?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
}

export interface CandidatePrediction<TItem extends CandidatePredictionItem> {
  readonly item: TItem;
  readonly score: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
  readonly colorExistenceScore?: number;
  readonly colorPositionScore?: number;
  readonly restoredScore?: number;
  readonly damagedScore?: number;
  readonly overlapScore?: number;
  readonly scoringWeights?: ArtefactScoringWeights;
}

export interface CandidatePredictableDetection<TItem extends CandidatePredictionItem> {
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
  overlapScore?: number;
  scoringWeights?: ArtefactScoringWeights;
  referenceUsed?: "damaged" | "restored";
  topMatches?: readonly CandidatePrediction<TItem>[];
  matchGap?: number;
  ambiguousMatch?: boolean;
}

export function applyCandidatePrediction<TDetection extends CandidatePredictableDetection<TItem>, TItem extends CandidatePredictionItem>(
  detection: TDetection,
  candidate: CandidatePrediction<TItem>,
  ambiguityMargin: number
): void {
  const item = candidate.item;
  detection.artefact = item.name;
  detection.wikiPage = item.restoredWikiPage || item.wikiPage;
  detection.damagedWikiPage = item.wikiPage;
  detection.restoredName = item.restoredName;
  detection.restoredWikiPage = item.restoredWikiPage;
  detection.archaeologyLevel = item.archaeologyLevel;
  detection.culture = item.culture;
  detection.digSite = item.digSite;
  detection.matchName = item.restoredName || item.name;
  detection.matchScore = candidate.score;
  detection.shapeScore = candidate.shapeScore;
  detection.colorScore = candidate.colorScore;
  detection.colorExistenceScore = candidate.colorExistenceScore;
  detection.colorPositionScore = candidate.colorPositionScore;
  detection.restoredScore = candidate.restoredScore;
  detection.damagedScore = candidate.damagedScore;
  detection.overlapScore = candidate.overlapScore;
  detection.scoringWeights = candidate.scoringWeights;
  detection.referenceUsed = (candidate.damagedScore || 0) > (candidate.restoredScore || 0) ? "damaged" : "restored";
  const ordered = detection.topMatches || [];
  const index = ordered.indexOf(candidate);
  const next = ordered.find((match, candidateIndex) => candidateIndex !== index);
  detection.matchGap = next ? candidate.score - next.score : 1;
  detection.ambiguousMatch = Boolean(next && detection.matchGap <= ambiguityMargin);
}
