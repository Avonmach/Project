import type {
  ArtefactMatchCandidate,
  ArtefactMatchResult,
  MatchReference,
  RecognitionMode
} from "../../domain/artefacts/matching";
import type { QuantityAlternative, QuantityDebug, QuantityResult } from "../../domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../domain/shared/geometry";
import type { DetectionCorrection } from "../correct-detection/correction-record";
import type { QuantityCorrectionDetection } from "../correct-detection/quantity-correction";
import { exportBestMatch, type ExportedBestMatch } from "../export-analysis/analysis-export";

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

export interface OriginalPrediction {
  readonly damagedName: string;
  readonly restoredName?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly scores: {
    readonly shape: number;
    readonly restored: number;
    readonly damaged: number;
    readonly color: number;
    readonly colorExistence: number;
    readonly colorPosition: number;
    readonly selected: number;
  };
  readonly algorithmBest: {
    readonly shape: ExportedBestMatch | null;
    readonly restored: ExportedBestMatch | null;
    readonly damaged: ExportedBestMatch | null;
  };
}

export interface DetectionRecord<TReference extends MatchReference, TPreview, TProcessedPreview, TReferencePreview> {
  readonly id: number;
  readonly box: BoundingBox;
  readonly bankIndex: number;
  readonly bankRow: number;
  readonly bankColumn: number;
  artefact: string;
  wikiPage?: string | null;
  damagedWikiPage?: string | null;
  restoredName?: string | null;
  restoredWikiPage?: string | null;
  archaeologyLevel?: number | null;
  culture?: string | null;
  digSite?: string | null;
  matchName: string;
  matchScore: number;
  shapeScore: number;
  colorScore: number;
  colorExistenceScore: number;
  colorPositionScore: number;
  overlapScore?: number;
  restoredScore: number;
  damagedScore: number;
  algorithmBest: ArtefactMatchResult<TReference>["algorithmBest"];
  referenceUsed: ArtefactMatchResult<TReference>["referenceUsed"];
  scoringWeights?: ArtefactMatchCandidate<TReference>["scoringWeights"];
  ambiguousMatch: boolean;
  matchGap: number;
  topMatches: readonly ArtefactMatchCandidate<TReference>[];
  readonly recognitionMode: RecognitionMode;
  readonly originalPrediction: OriginalPrediction;
  correction: DetectionCorrection | null;
  quantity: number;
  readonly originalQuantity: number;
  readonly quantityConfidence: number;
  readonly quantityAlternatives: readonly QuantityAlternative[];
  readonly quantityDebug: QuantityDebug | null;
  quantityCorrection: QuantityCorrectionDetection["quantityCorrection"] | null;
  quantityManual: boolean;
  readonly preview: TPreview;
  readonly processedPreview: TProcessedPreview;
  referencePreview: TReferencePreview;
  corrected: boolean;
  manual: boolean;
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
}: DetectionRecordOptions<TReference, TPreview, TProcessedPreview, TReferencePreview>): DetectionRecord<
  TReference,
  TPreview,
  TProcessedPreview,
  TReferencePreview
> {
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
