import {
  compareFingerprints,
  fingerprintColorCrop,
  fingerprintCrop,
  histogramChiAltSimilarity,
  type Fingerprint
} from "./fingerprint";
import type { ArtefactReferenceMetadata } from "./reference-types";
import type { BoundingBox } from "../shared/geometry";

const COLOR_SCORE_WEIGHT = 0.2;
const CROWDED_SHAPE_COLOR_WEIGHT = 0.6;
const SHAPE_CROWD_MARGIN = 0.015;
const SHAPE_CROWD_COUNT = 5;
const AMBIGUOUS_COMPONENT_MARGIN = 0.02;
const COLOR_POSITION_WEIGHT = 0.25;
const COLOR_SIMILAR_MARGIN = 0.03;

export type RecognitionMode = "damaged" | "restored";

export interface MatchReference extends ArtefactReferenceMetadata {
  readonly fingerprint: Fingerprint;
  readonly damagedFingerprint?: Fingerprint | null;
  readonly [key: string]: unknown;
}

export interface ArtefactMatchCandidate<TReference extends MatchReference> {
  readonly item: TReference;
  score: number;
  readonly restoredScore: number;
  readonly damagedScore: number;
  readonly shapeScore: number;
  colorScore: number;
  readonly colorExistenceScore: number;
  readonly colorPositionScore: number;
  readonly overlapScore?: number;
  scoringWeights?: ArtefactScoringWeights;
}

export interface ArtefactScoringWeights {
  readonly shape: number;
  readonly color: number;
  readonly crowdedShapeCount: number;
  readonly colorExistence: number;
  readonly colorPosition: number;
  readonly similarColorCount: number;
}

export interface ArtefactAmbiguityCandidate {
  readonly shapeScore?: number;
  readonly colorScore?: number;
}

export interface ArtefactMatchResult<TReference extends MatchReference> extends ArtefactMatchCandidate<TReference> {
  readonly referenceUsed: "damaged" | "restored";
  readonly ambiguous: boolean;
  readonly matchGap: number;
  readonly cropFingerprint: Fingerprint;
  readonly referenceFingerprint: Fingerprint;
  readonly finalShapeScore: number;
  readonly algorithmBest: {
    readonly shape: { readonly item: TReference; readonly score: number };
    readonly restored: { readonly item: TReference; readonly score: number };
    readonly damaged: { readonly item: TReference; readonly score: number };
    readonly color: { readonly item: TReference; readonly score: number };
  };
  readonly candidates: readonly ArtefactMatchCandidate<TReference>[];
}

export function matchArtifact<TReference extends MatchReference>(
  shapeImageData: ImageData,
  originalImageData: ImageData,
  box: BoundingBox,
  references: readonly TReference[],
  mode: RecognitionMode = "damaged"
): ArtefactMatchResult<TReference> {
  const fallback = requireFirstReference(references);
  const cropFingerprint = fingerprintCrop(shapeImageData, box);
  const colorFingerprint = fingerprintColorCrop(originalImageData, shapeImageData, box);
  let best: ArtefactMatchCandidate<TReference> = { item: fallback, score: 0, restoredScore: 0, damagedScore: 0, shapeScore: 0, colorScore: 0, colorExistenceScore: 0, colorPositionScore: 0 };
  let bestShape = { item: fallback, score: 0 };
  let bestRestored = { item: fallback, score: 0 };
  let bestDamaged = { item: fallback, score: 0 };
  let bestColor = { item: fallback, score: 0 };
  const scores: ArtefactMatchCandidate<TReference>[] = [];

  for (const item of references) {
    const restored = compareFingerprints(cropFingerprint, item.fingerprint);
    const damaged = mode === "restored" ? null : item.damagedFingerprint ? compareFingerprints(cropFingerprint, item.damagedFingerprint) : null;
    const restoredColor = histogramChiAltSimilarity(colorFingerprint, item.fingerprint);
    const damagedColor = damaged && item.damagedFingerprint ? histogramChiAltSimilarity(colorFingerprint, item.damagedFingerprint) : 0;
    const shapeScore = mode === "restored" ? restored.shape : damaged?.shape ?? restored.shape;
    const colorExistenceScore = damaged ? Math.max(restoredColor, damagedColor) : restoredColor;
    const colorPositionScore = damaged ? Math.max(restored.color, damaged.color) : restored.color;
    scores.push({
      item,
      score: 0,
      restoredScore: restored.total,
      damagedScore: damaged?.total ?? 0,
      shapeScore,
      colorScore: colorExistenceScore,
      colorExistenceScore,
      colorPositionScore,
      overlapScore: damaged?.overlap ?? restored.overlap
    });
    if (restored.shape > bestShape.score) bestShape = { item, score: restored.shape };
    if (restored.total > bestRestored.score) bestRestored = { item, score: restored.total };
    if (damaged && damaged.total > bestDamaged.score) bestDamaged = { item, score: damaged.total };
    if (colorExistenceScore > bestColor.score) bestColor = { item, score: colorExistenceScore };
  }

  const topColorScore = Math.max(...scores.map((candidate) => candidate.colorExistenceScore));
  const similarColorCount = scores.filter((candidate) => topColorScore - candidate.colorExistenceScore <= COLOR_SIMILAR_MARGIN).length;
  if (similarColorCount >= SHAPE_CROWD_COUNT) {
    for (const candidate of scores) {
      candidate.colorScore =
        candidate.colorExistenceScore * (1 - COLOR_POSITION_WEIGHT) + candidate.colorPositionScore * COLOR_POSITION_WEIGHT;
    }
  }

  const topShapeScore = Math.max(...scores.map((candidate) => candidate.shapeScore));
  const crowdedShapeCount = scores.filter((candidate) => topShapeScore - candidate.shapeScore <= SHAPE_CROWD_MARGIN).length;
  const colorWeight = crowdedShapeCount >= SHAPE_CROWD_COUNT ? CROWDED_SHAPE_COLOR_WEIGHT : COLOR_SCORE_WEIGHT;
  const shapeWeight = 1 - colorWeight;
  for (const candidate of scores) {
    candidate.score = candidate.shapeScore * shapeWeight + candidate.colorScore * colorWeight;
    candidate.scoringWeights = {
      shape: shapeWeight,
      color: colorWeight,
      crowdedShapeCount,
      colorExistence: similarColorCount >= SHAPE_CROWD_COUNT ? 1 - COLOR_POSITION_WEIGHT : 1,
      colorPosition: similarColorCount >= SHAPE_CROWD_COUNT ? COLOR_POSITION_WEIGHT : 0,
      similarColorCount
    };
  }

  scores.sort((a, b) => b.score - a.score);
  best = scores[0] ?? best;
  const secondBest = scores[1] ?? null;
  const matchGap = secondBest ? best.score - secondBest.score : 1;
  const ambiguous = isAmbiguousArtefactMatch(best, secondBest);
  const referenceFingerprint =
    mode !== "restored" && best.item.damagedFingerprint && best.damagedScore >= best.restoredScore
      ? best.item.damagedFingerprint
      : best.item.fingerprint;
  return {
    ...best,
    referenceUsed: mode !== "restored" && best.damagedScore > best.restoredScore ? "damaged" : "restored",
    scoringWeights: best.scoringWeights,
    ambiguous,
    matchGap,
    cropFingerprint,
    referenceFingerprint,
    finalShapeScore: best.shapeScore,
    algorithmBest: { shape: bestShape, restored: bestRestored, damaged: bestDamaged, color: bestColor },
    candidates: scores.slice(0, 10)
  };
}

export function isAmbiguousArtefactMatch(
  best: ArtefactAmbiguityCandidate,
  secondBest: ArtefactAmbiguityCandidate | null,
  margin = AMBIGUOUS_COMPONENT_MARGIN
): boolean {
  if (!secondBest) return false;
  if (typeof best.shapeScore !== "number" || typeof best.colorScore !== "number") return false;
  if (typeof secondBest.shapeScore !== "number" || typeof secondBest.colorScore !== "number") return false;
  const shapeGap = Math.abs(best.shapeScore - secondBest.shapeScore);
  const colorGap = Math.abs(best.colorScore - secondBest.colorScore);
  return shapeGap <= margin && colorGap <= margin;
}

function requireFirstReference<TReference extends MatchReference>(references: readonly TReference[]): TReference {
  const reference = references[0];
  if (!reference) throw new Error("Cannot match artefact without reference records.");
  return reference;
}
