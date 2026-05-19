import {
  compareFingerprints,
  histogramChiAltSimilarity,
  toFingerprint,
  toScreenshotFingerprint,
  type Fingerprint
} from "../artefacts/fingerprint";
import { isQuantityPixel } from "../ocr/quantity-ocr";
import { getIconMatchBox, type BoundingBox } from "../shared/geometry";
import { alphaBounds, copyImageData, readImageDataChannel } from "../../infrastructure/image-processing/image-data";

const MATCH_SIZE = 32;

export interface MaterialMatchReference {
  readonly name: string;
  readonly wikiPage?: string | null;
  readonly fingerprint: Fingerprint;
}

export interface MaterialMatchCandidate<TReference extends MaterialMatchReference> {
  readonly item: TReference;
  readonly score: number;
  readonly overlapScore: number;
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
  const cropFingerprint = materialScreenshotFingerprint(imageData, box);
  const candidates = references
    .map((item) => {
      const shape = compareFingerprints(cropFingerprint, item.fingerprint);
      const colorScore = histogramChiAltSimilarity(cropFingerprint, item.fingerprint);
      return {
        item,
        score: shape.total * 0.72 + colorScore * 0.28,
        overlapScore: shape.overlap ?? 0,
        shapeScore: shape.total,
        colorScore
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? { item: fallback, score: 0, overlapScore: 0, shapeScore: 0, colorScore: 0 };
  return { ...best, candidates };
}

function requireFirstReference<TReference extends MaterialMatchReference>(references: readonly TReference[]): TReference {
  const reference = references[0];
  if (!reference) throw new Error("Cannot match material without reference records.");
  return reference;
}

function materialScreenshotFingerprint(imageData: ImageData, box: BoundingBox): Fingerprint {
  const crop = copyImageData(imageData, getIconMatchBox(box));
  const backgroundColors = dominantEdgeColors(crop, 2);
  const masked = new ImageData(crop.width, crop.height);

  for (let i = 0; i < crop.data.length; i += 4) {
    const r = readImageDataChannel(crop.data, i);
    const g = readImageDataChannel(crop.data, i + 1);
    const b = readImageDataChannel(crop.data, i + 2);
    if (isQuantityPixel(r, g, b) || backgroundColors.some((color) => matchesBackgroundColor({ r, g, b }, color))) continue;
    masked.data[i] = r;
    masked.data[i + 1] = g;
    masked.data[i + 2] = b;
    masked.data[i + 3] = 255;
  }

  const bounds = alphaBounds(masked, 20);
  const source = document.createElement("canvas");
  source.width = masked.width;
  source.height = masked.height;
  source.getContext("2d", { willReadFrequently: true })?.putImageData(masked, 0, 0);

  const normalized = document.createElement("canvas");
  normalized.width = MATCH_SIZE;
  normalized.height = MATCH_SIZE;
  const normalizedContext = normalized.getContext("2d", { willReadFrequently: true });
  if (!normalizedContext) return toScreenshotFingerprint(crop);
  normalizedContext.imageSmoothingEnabled = false;
  normalizedContext.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const drawW = Math.ceil((bounds.w / longest) * MATCH_SIZE);
    const drawH = Math.ceil((bounds.h / longest) * MATCH_SIZE);
    const dx = Math.floor((MATCH_SIZE - drawW) / 2);
    const dy = Math.floor((MATCH_SIZE - drawH) / 2);
    normalizedContext.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, dx, dy, drawW, drawH);
  }

  return toFingerprint(normalizedContext.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), true);
}

interface MaterialRgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function dominantEdgeColors(imageData: ImageData, limit: number): MaterialRgbColor[] {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      if (x > 1 && y > 1 && x < imageData.width - 2 && y < imageData.height - 2) continue;
      const offset = (y * imageData.width + x) * 4;
      const r = readImageDataChannel(imageData.data, offset);
      const g = readImageDataChannel(imageData.data, offset + 1);
      const b = readImageDataChannel(imageData.data, offset + 2);
      const key = `${Math.round(r / 16)}:${Math.round(g / 16)}:${Math.round(b / 16)}`;
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count)
    }));
}

function colorDistance(first: MaterialRgbColor, second: MaterialRgbColor): number {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

function channelDistance(first: MaterialRgbColor, second: MaterialRgbColor): number {
  return Math.max(Math.abs(first.r - second.r), Math.abs(first.g - second.g), Math.abs(first.b - second.b));
}

function matchesBackgroundColor(first: MaterialRgbColor, second: MaterialRgbColor): boolean {
  return channelDistance(first, second) <= 10 && colorDistance(first, second) <= 18;
}
