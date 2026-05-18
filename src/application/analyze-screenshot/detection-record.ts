import type { ArtefactMatchResult, MatchReference, RecognitionMode } from "../../domain/artefacts/matching";
import type { QuantityDebug, QuantityResult } from "../../domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../domain/shared/geometry";
import { exportBestMatch } from "../export-analysis/analysis-export";

export interface DetectionRecordPreviewParts<TPreview, TProcessedPreview, TReferencePreview> {
  readonly preview: TPreview;
  readonly processedPreview: TProcessedPreview;
  readonly referencePreview: TReferencePreview;
}

export interface DetectionRecordOptions<
  TReference extends MatchReference,
  TPreview,
  TProcessedPreview,
  TReferencePreview
> {
  readonly box: BoundingBox;
  readonly bankIndex: number;
  readonly cellSize: number;
  readonly match: ArtefactMatchResult<TReference>;
  readonly quantityResult: QuantityResult;
  readonly quantityDebug: QuantityDebug | null;
  readonly recognitionMode: RecognitionMode;
  readonly previews: DetectionRecordPreviewParts<TPreview, TProcessedPreview, TReferencePreview>;
}

export function createDetectionRecord<
  TReference extends MatchReference,
  TPreview,
  TProcessedPreview,
  TReferencePreview
>({
  box,
  bankIndex,
  cellSize,
  match,
  quantityResult,
  quantityDebug,
  recognitionMode,
  previews
}: DetectionRecordOptions<TReference, TPreview, TProcessedPreview, TReferencePreview>) {
  return {
    id: bankIndex + 1,
    box,
    bankIndex,
    bankRow: Math.floor(box.y / cellSize) + 1,
    bankColumn: Math.floor(box.x / cellSize) + 1,
    artefact: match.item.name,
    wikiPage: match.item.restoredWikiPage || match.item.wikiPage,
    damagedWikiPage: match.item.wikiPage,
    restoredName: match.item.restoredName,
    restoredWikiPage: match.item.restoredWikiPage,
    archaeologyLevel: match.item.archaeologyLevel,
    culture: match.item.culture,
    digSite: match.item.digSite,
    matchName: match.item.restoredName || match.item.name,
    matchScore: match.score,
    shapeScore: match.shapeScore,
    colorScore: match.colorScore,
    colorExistenceScore: match.colorExistenceScore,
    colorPositionScore: match.colorPositionScore,
    overlapScore: match.overlapScore,
    restoredScore: match.restoredScore,
    damagedScore: match.damagedScore,
    algorithmBest: match.algorithmBest,
    referenceUsed: match.referenceUsed,
    scoringWeights: match.scoringWeights,
    ambiguousMatch: match.ambiguous,
    matchGap: match.matchGap,
    topMatches: match.candidates,
    recognitionMode,
    originalPrediction: {
      damagedName: match.item.name,
      restoredName: match.item.restoredName,
      archaeologyLevel: match.item.archaeologyLevel,
      culture: match.item.culture,
      scores: {
        shape: match.shapeScore,
        restored: match.restoredScore,
        damaged: match.damagedScore,
        color: match.colorScore,
        colorExistence: match.colorExistenceScore,
        colorPosition: match.colorPositionScore,
        selected: match.score
      },
      algorithmBest: {
        shape: exportBestMatch(match.algorithmBest?.shape),
        restored: exportBestMatch(match.algorithmBest?.restored),
        damaged: exportBestMatch(match.algorithmBest?.damaged)
      }
    },
    correction: null,
    quantity: quantityResult.quantity,
    originalQuantity: quantityResult.quantity,
    quantityConfidence: quantityResult.confidence,
    quantityAlternatives: quantityResult.alternatives,
    quantityDebug,
    quantityCorrection: null,
    quantityManual: false,
    preview: previews.preview,
    processedPreview: previews.processedPreview,
    referencePreview: previews.referencePreview,
    corrected: false,
    manual: false
  };
}
