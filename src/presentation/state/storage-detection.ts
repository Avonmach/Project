import type { QuantityAlternative, QuantityDebug } from "../../domain/ocr/quantity-ocr";
import type { DetectionRowElements } from "../renderers/detection-row";
import type { PreparedMaterialReference } from "../../application/load-references/material-reference-preparation";

export interface StorageMatchCandidate {
  readonly item: PreparedMaterialReference;
  readonly score?: number;
  readonly overlapScore?: number;
  readonly shapeScore?: number;
  readonly colorScore?: number;
}

export interface StorageDetection {
  readonly id: number;
  readonly screenshotIndex: number;
  artefact: string;
  restoredName?: string | null;
  wikiPage?: string | null;
  archaeologyLevel?: string | null;
  culture?: string | null;
  digSite?: string | null;
  quantity: number;
  readonly originalQuantity?: number;
  readonly quantityConfidence?: number;
  readonly quantityAlternatives?: readonly QuantityAlternative[];
  readonly quantityDebug?: QuantityDebug | null;
  quantityManual?: boolean;
  quantityCorrection?: {
    readonly correctedAt: string;
    readonly originalQuantity?: number;
    readonly detectedQuantity?: number;
    readonly previousQuantity: number;
    readonly correctedQuantity: number;
    readonly quantityConfidence?: number;
    readonly source: string;
  } | null;
  matchScore?: number | null;
  overlapScore?: number | null;
  shapeScore?: number | null;
  colorScore?: number | null;
  matchGap?: number | null;
  ambiguousMatch?: boolean;
  corrected?: boolean;
  manual?: boolean;
  topMatches?: readonly StorageMatchCandidate[];
  preview: HTMLCanvasElement;
  processedPreview: HTMLCanvasElement;
  referencePreview: HTMLCanvasElement;
  rowElements?: DetectionRowElements;
}
