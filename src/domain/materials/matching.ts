import {
  compareFingerprints,
  histogramChiAltSimilarity,
  toScreenshotFingerprint,
  type Fingerprint
} from "../artefacts/fingerprint";
import type { BoundingBox } from "../shared/geometry";
import { copyImageData } from "../../infrastructure/image-processing/image-data";

export interface MaterialMatchReference {
  readonly name: string;
  readonly wikiPage?: string | null;
  readonly fingerprint: Fingerprint;
}

export interface MaterialMatchCandidate<TReference extends MaterialMatchReference> {
  readonly item: TReference;
  readonly score: number;
  readonly shapeScore: number;
  readonly colorScore: number;
}

export interface MaterialMatchResult<TReference extends MaterialMatchReference>
  extends MaterialMatchCandidate<TReference> {
  readonly candidates: readonly MaterialMatchCandidate<TReference>[];
}

export function matchMaterial<TReference extends MaterialMatchReference>(
  imageData: ImageData,
  box: BoundingBox,
  references: readonly TReference[]
): MaterialMatchResult<TReference> {
  const fallback = requireFirstReference(references);
  const crop = copyImageData(imageData, box);
  const cropFingerprint = toScreenshotFingerprint(crop);
  const candidates = references
    .map((item) => {
      const shape = compareFingerprints(cropFingerprint, item.fingerprint);
      const colorScore = histogramChiAltSimilarity(cropFingerprint, item.fingerprint);
      return {
        item,
        score: shape.total * 0.72 + colorScore * 0.28,
        shapeScore: shape.total,
        colorScore
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? { item: fallback, score: 0, shapeScore: 0, colorScore: 0 };
  return { ...best, candidates: candidates.slice(0, 5) };
}

function requireFirstReference<TReference extends MaterialMatchReference>(references: readonly TReference[]): TReference {
  const reference = references[0];
  if (!reference) throw new Error("Cannot match material without reference records.");
  return reference;
}
