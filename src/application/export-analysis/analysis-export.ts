import type { ArtefactScoringWeights } from "../../domain/artefacts/matching";
import type { QuantityAlternative } from "../../domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../domain/shared/geometry";
import type { QuantityCorrectionDetection } from "../correct-detection/quantity-correction";

interface ExportImageInfo {
  readonly width: number;
  readonly height: number;
  readonly source: string;
}

interface ExportGridInfo {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly cellSize: number;
  readonly rows: number | null;
  readonly columns: number | null;
}

interface ExportReferenceItem {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
}

interface ExportMatch {
  readonly item?: ExportReferenceItem | null;
  readonly score?: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
  readonly colorExistenceScore?: number;
  readonly colorPositionScore?: number;
  readonly scoringWeights?: ArtefactScoringWeights;
  readonly restoredScore?: number;
  readonly damagedScore?: number;
}

interface ExportDetection {
  readonly bankIndex: number;
  readonly bankRow?: number;
  readonly bankColumn?: number;
  readonly box: BoundingBox;
  readonly quantity: number;
  readonly originalQuantity?: number;
  readonly quantityConfidence?: number;
  readonly quantityAlternatives?: readonly QuantityAlternative[];
  readonly quantityManual?: boolean;
  readonly quantityCorrection?: QuantityCorrectionDetection["quantityCorrection"];
  readonly manual?: boolean;
  readonly corrected?: boolean;
  readonly correction?: {
    readonly damagedName?: string;
    readonly restoredName?: string | null;
    readonly archaeologyLevel?: number | null;
    readonly culture?: string | null;
  } | null;
  readonly originalPrediction?: unknown;
  readonly artefact: string;
  readonly restoredName?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly wikiPage?: string | null;
  readonly damagedWikiPage?: string | null;
  readonly ambiguousMatch?: boolean;
  readonly matchGap?: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
  readonly colorExistenceScore?: number;
  readonly colorPositionScore?: number;
  readonly restoredScore?: number;
  readonly damagedScore?: number;
  readonly matchScore?: number;
  readonly referenceUsed?: unknown;
  readonly scoringWeights?: ArtefactScoringWeights;
  readonly algorithmBest?: {
    readonly shape?: ExportMatch | null;
    readonly color?: ExportMatch | null;
    readonly restored?: ExportMatch | null;
    readonly damaged?: ExportMatch | null;
  };
  readonly topMatches?: readonly ExportMatch[];
}

export interface AnalysisExportOptions<TDetection extends ExportDetection> {
  readonly exportedAt: string;
  readonly image: ExportImageInfo | null;
  readonly grid: ExportGridInfo;
  readonly detections: readonly TDetection[];
}

export interface AnalysisExportPayload {
  readonly exportedAt: string;
  readonly image: ExportImageInfo | null;
  readonly grid: ExportGridInfo;
  readonly totals: {
    readonly slots: number;
    readonly quantity: number;
    readonly quantityCorrections: number;
    readonly manualCorrections: number;
  };
  readonly training: {
    readonly correctedArtefacts: number;
    readonly correctedQuantities: number;
    readonly quantityLabels: readonly ExportQuantityLabel[];
    readonly labels: readonly ExportTrainingLabel[];
  };
  readonly detections: readonly ExportDetectionPayload[];
}

export interface ExportedBestMatch {
  readonly damagedName: string;
  readonly restoredName?: string | null;
  readonly score?: number;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
}

export interface ExportQuantityLabel {
  readonly bankIndex: number;
  readonly bankRow?: number;
  readonly bankColumn?: number;
  readonly box: BoundingBox;
  readonly originalQuantity?: number;
  readonly detectedQuantity?: number;
  readonly correctedQuantity: number;
  readonly quantityConfidence?: number;
  readonly quantityAlternatives?: readonly QuantityAlternative[];
  readonly correction?: QuantityCorrectionDetection["quantityCorrection"];
}

export interface ExportTrainingLabel {
  readonly bankIndex: number;
  readonly bankRow?: number;
  readonly bankColumn?: number;
  readonly box: BoundingBox;
  readonly corrected: ExportDetection["correction"];
  readonly originalPrediction?: ExportDetection["originalPrediction"];
  readonly topMatches: readonly ExportedCandidateMatch[];
}

export interface ExportedCandidateMatch {
  readonly damagedName?: string;
  readonly restoredName?: string | null;
  readonly score?: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
  readonly colorExistenceScore?: number;
  readonly colorPositionScore?: number;
  readonly scoringWeights?: ArtefactScoringWeights;
  readonly restoredScore?: number;
  readonly damagedScore?: number;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
}

export interface ExportDetectionPayload {
  readonly bankIndex: number;
  readonly bankRow?: number;
  readonly bankColumn?: number;
  readonly box: BoundingBox;
  readonly quantity: number;
  readonly originalQuantity?: number;
  readonly quantityConfidence?: number;
  readonly quantityAlternatives?: readonly QuantityAlternative[];
  readonly correctedQuantity?: boolean;
  readonly quantityCorrection?: QuantityCorrectionDetection["quantityCorrection"];
  readonly correctedArtefact?: boolean;
  readonly originalPrediction?: ExportDetection["originalPrediction"];
  readonly correction?: ExportDetection["correction"];
  readonly trainingLabel: {
    readonly input: {
      readonly bankIndex: number;
      readonly bankRow?: number;
      readonly bankColumn?: number;
      readonly box: BoundingBox;
      readonly originalQuantity?: number;
      readonly quantity: number;
    };
    readonly label: {
      readonly damagedName?: string;
      readonly restoredName?: string | null;
      readonly archaeologyLevel?: number | null;
      readonly culture?: string | null;
    };
    readonly previousPrediction?: ExportDetection["originalPrediction"];
  } | null;
  readonly selected: {
    readonly damagedName: string;
    readonly restoredName?: string | null;
    readonly archaeologyLevel?: number | null;
    readonly culture?: string | null;
    readonly digSite?: string | null;
    readonly wikiPage?: string | null;
    readonly damagedWikiPage?: string | null;
  };
  readonly ambiguousMatch?: boolean;
  readonly matchGap?: number;
  readonly scores: {
    readonly selectedShape?: number;
    readonly selectedColor?: number;
    readonly selectedColorExistence?: number;
    readonly selectedColorPosition?: number;
    readonly selectedRestored?: number;
    readonly selectedDamaged?: number;
    readonly selectedMain?: number;
    readonly referenceUsed?: unknown;
    readonly weights?: ArtefactScoringWeights;
  };
  readonly algorithmBest: {
    readonly shape: ExportedBestMatch | null;
    readonly color: ExportedBestMatch | null;
    readonly restored: ExportedBestMatch | null;
    readonly damaged: ExportedBestMatch | null;
  };
  readonly topMatches: readonly ExportedCandidateMatch[];
}

export function createAnalysisExportPayload<TDetection extends ExportDetection>({
  exportedAt,
  image,
  grid,
  detections
}: AnalysisExportOptions<TDetection>): AnalysisExportPayload {
  return {
    exportedAt,
    image,
    grid,
    totals: {
      slots: detections.length,
      quantity: detections.reduce((sum, detection) => sum + detection.quantity, 0),
      quantityCorrections: detections.filter((detection) => detection.quantityManual).length,
      manualCorrections: detections.filter((detection) => detection.manual || detection.corrected).length
    },
    training: {
      correctedArtefacts: detections.filter((detection) => detection.corrected).length,
      correctedQuantities: detections.filter((detection) => detection.quantityManual).length,
      quantityLabels: detections
        .filter((detection) => detection.quantityManual)
        .map((detection) => ({
          bankIndex: detection.bankIndex,
          bankRow: detection.bankRow,
          bankColumn: detection.bankColumn,
          box: detection.box,
          originalQuantity: detection.originalQuantity,
          detectedQuantity: detection.originalQuantity,
          correctedQuantity: detection.quantity,
          quantityConfidence: detection.quantityConfidence,
          quantityAlternatives: detection.quantityAlternatives,
          correction: detection.quantityCorrection
        })),
      labels: detections
        .filter((detection) => detection.corrected)
        .map((detection) => ({
          bankIndex: detection.bankIndex,
          bankRow: detection.bankRow,
          bankColumn: detection.bankColumn,
          box: detection.box,
          corrected: detection.correction,
          originalPrediction: detection.originalPrediction,
          topMatches: (detection.topMatches || []).map((match) => ({
            damagedName: match.item?.name,
            restoredName: match.item?.restoredName,
            score: match.score,
            shapeScore: match.shapeScore,
            colorScore: match.colorScore,
            colorExistenceScore: match.colorExistenceScore,
            colorPositionScore: match.colorPositionScore,
            scoringWeights: match.scoringWeights,
            restoredScore: match.restoredScore,
            damagedScore: match.damagedScore
          }))
        }))
    },
    detections: detections.map((detection) => ({
      bankIndex: detection.bankIndex,
      bankRow: detection.bankRow,
      bankColumn: detection.bankColumn,
      box: detection.box,
      quantity: detection.quantity,
      originalQuantity: detection.originalQuantity,
      quantityConfidence: detection.quantityConfidence,
      quantityAlternatives: detection.quantityAlternatives,
      correctedQuantity: detection.quantityManual,
      quantityCorrection: detection.quantityCorrection,
      correctedArtefact: detection.corrected,
      originalPrediction: detection.originalPrediction,
      correction: detection.correction,
      trainingLabel: detection.corrected
        ? {
            input: {
              bankIndex: detection.bankIndex,
              bankRow: detection.bankRow,
              bankColumn: detection.bankColumn,
              box: detection.box,
              originalQuantity: detection.originalQuantity,
              quantity: detection.quantity
            },
            label: {
              damagedName: detection.correction?.damagedName,
              restoredName: detection.correction?.restoredName,
              archaeologyLevel: detection.correction?.archaeologyLevel,
              culture: detection.correction?.culture
            },
            previousPrediction: detection.originalPrediction
          }
        : null,
      selected: {
        damagedName: detection.artefact,
        restoredName: detection.restoredName,
        archaeologyLevel: detection.archaeologyLevel,
        culture: detection.culture,
        digSite: detection.digSite,
        wikiPage: detection.wikiPage,
        damagedWikiPage: detection.damagedWikiPage
      },
      ambiguousMatch: detection.ambiguousMatch,
      matchGap: detection.matchGap,
      scores: {
        selectedShape: detection.shapeScore,
        selectedColor: detection.colorScore,
        selectedColorExistence: detection.colorExistenceScore,
        selectedColorPosition: detection.colorPositionScore,
        selectedRestored: detection.restoredScore,
        selectedDamaged: detection.damagedScore,
        selectedMain: detection.matchScore,
        referenceUsed: detection.referenceUsed,
        weights: detection.scoringWeights
      },
      algorithmBest: {
        shape: exportBestMatch(detection.algorithmBest?.shape),
        color: exportBestMatch(detection.algorithmBest?.color),
        restored: exportBestMatch(detection.algorithmBest?.restored),
        damaged: exportBestMatch(detection.algorithmBest?.damaged)
      },
      topMatches: (detection.topMatches || []).map((match) => ({
        damagedName: match.item?.name,
        restoredName: match.item?.restoredName,
        score: match.score,
        shapeScore: match.shapeScore,
        colorScore: match.colorScore,
        colorExistenceScore: match.colorExistenceScore,
        colorPositionScore: match.colorPositionScore,
        scoringWeights: match.scoringWeights,
        restoredScore: match.restoredScore,
        damagedScore: match.damagedScore,
        archaeologyLevel: match.item?.archaeologyLevel,
        culture: match.item?.culture
      }))
    }))
  };
}

export function exportBestMatch(match: ExportMatch | null | undefined): ExportedBestMatch | null {
  if (!match?.item) return null;
  return {
    damagedName: match.item.name,
    restoredName: match.item.restoredName,
    score: match.score,
    archaeologyLevel: match.item.archaeologyLevel,
    culture: match.item.culture
  };
}
