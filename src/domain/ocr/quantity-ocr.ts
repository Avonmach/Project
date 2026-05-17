import type { BoundingBox, PixelPoint } from "../shared/geometry";
import type { Digit, DigitTemplate, DigitTemplateMap } from "./digit-templates";
import { DIGIT_TEMPLATE_WIDTH, normalizeDigit, shiftedTemplateScore, templateWidth } from "./digit-templates";

export type RecognitionMode = "damaged" | "restored";

export interface QuantityAlternative {
  readonly quantity: number;
  readonly confidence: number;
}

export interface DigitOption {
  readonly digit: Digit;
  readonly score: number;
}

export interface QuantityDigitMatch {
  readonly digit: Digit;
  readonly score: number;
  normalized: string[];
  options: DigitOption[];
}

export interface QuantityDebugOption extends DigitOption {
  readonly template: DigitTemplate;
  readonly width: number;
  readonly height: number;
}

export interface QuantityDebugMatch {
  readonly index: number;
  readonly digit: Digit;
  readonly score: number;
  readonly normalized: string[];
  readonly options: QuantityDebugOption[];
}

export interface QuantityDebug {
  readonly mode: RecognitionMode;
  readonly strict: boolean;
  readonly scanBox: BoundingBox;
  readonly pixelCount: number;
  readonly pixels: PixelPoint[];
  readonly digitBoxes: BoundingBox[];
  readonly rejectedBoxes: BoundingBox[];
  readonly matches: QuantityDebugMatch[];
  readonly text: string;
  readonly confidence: number;
}

export interface QuantityResult {
  readonly quantity: number;
  readonly confidence: number;
  readonly alternatives: QuantityAlternative[];
  readonly debug: QuantityDebug;
}

const QUANTITY_REVIEW_MARGIN = 0.03;

export function detectQuantity(
  imageData: ImageData,
  box: BoundingBox,
  mode: RecognitionMode = "damaged",
  digitTemplates: DigitTemplateMap
): QuantityResult {
  const strict = mode === "restored";
  const yellowPixels = collectYellowPixels(imageData, box, { strict });
  const scanBox = quantityScanBox(box, strict);
  if (yellowPixels.length < 4) {
    return {
      quantity: 1,
      confidence: 0.65,
      alternatives: [{ quantity: 1, confidence: 0.65 }],
      debug: makeQuantityDebug({
        mode,
        strict,
        scanBox,
        yellowPixels,
        digitBoxes: [],
        matches: [],
        text: "1",
        confidence: 0.65,
        digitTemplates
      })
    };
  }

  const rawDigitBoxes = splitDigitBoxes(yellowPixels).sort((a, b) => a.x - b.x);
  const digitBoxes = rawDigitBoxes.filter((digitBox) => isPlausibleQuantityDigitBox(yellowPixels, digitBox, strict));

  if (!digitBoxes.length) {
    return {
      quantity: 1,
      confidence: 0.55,
      alternatives: [{ quantity: 1, confidence: 0.55 }],
      debug: makeQuantityDebug({
        mode,
        strict,
        scanBox,
        yellowPixels,
        digitBoxes,
        rejectedBoxes: rawDigitBoxes,
        matches: [],
        text: "1",
        confidence: 0.55,
        digitTemplates
      })
    };
  }

  const matches = digitBoxes.map((digitBox) => matchDigit(yellowPixels, digitBox, digitTemplates));
  const text = matches.map((match) => match.digit).join("");
  const confidence = matches.reduce((sum, match) => sum + match.score, 0) / matches.length;
  const parsed = Number.parseInt(text, 10);
  const alternatives = quantityAlternatives(matches);
  const minimumConfidence = strict ? 0.58 : 0.45;
  const debug = makeQuantityDebug({
    mode,
    strict,
    scanBox,
    yellowPixels,
    digitBoxes,
    rejectedBoxes: rawDigitBoxes.filter((rawBox) => !digitBoxes.includes(rawBox)),
    matches,
    text,
    confidence,
    digitTemplates
  });

  if (!Number.isFinite(parsed) || parsed <= 0 || confidence < minimumConfidence) {
    return { quantity: 1, confidence: 0.35, alternatives: [{ quantity: 1, confidence: 0.35 }, ...alternatives], debug };
  }

  return { quantity: parsed, confidence, alternatives, debug };
}

export function isQuantityPixel(r: number, g: number, b: number): boolean {
  return r > 125 && g > 105 && b < 85 && r >= g - 20;
}

export function quantityCandidatesAreClose(detection: { quantityAlternatives?: readonly QuantityAlternative[] }): boolean {
  const gap = quantityAlternativeConfidenceGap(detection);
  return gap !== null && gap <= QUANTITY_REVIEW_MARGIN;
}

export function quantityAlternativeConfidenceGap(detection: {
  quantityAlternatives?: readonly QuantityAlternative[];
}): number | null {
  const options = detection.quantityAlternatives || [];
  if (options.length < 2) return null;
  return Math.abs(options[0].confidence - options[1].confidence);
}

function makeQuantityDebug({
  mode,
  strict,
  scanBox,
  yellowPixels,
  digitBoxes,
  rejectedBoxes = [],
  matches,
  text,
  confidence,
  digitTemplates
}: {
  readonly mode: RecognitionMode;
  readonly strict: boolean;
  readonly scanBox: BoundingBox;
  readonly yellowPixels: readonly PixelPoint[];
  readonly digitBoxes: readonly BoundingBox[];
  readonly rejectedBoxes?: readonly BoundingBox[];
  readonly matches: readonly QuantityDigitMatch[];
  readonly text: string;
  readonly confidence: number;
  readonly digitTemplates: DigitTemplateMap;
}): QuantityDebug {
  return {
    mode,
    strict,
    scanBox,
    pixelCount: yellowPixels.length,
    pixels: yellowPixels.map((pixel) => ({ x: pixel.x, y: pixel.y })),
    digitBoxes: digitBoxes.map((box) => ({ ...box })),
    rejectedBoxes: rejectedBoxes.map((box) => ({ ...box })),
    matches: matches.map((match, index) => ({
      index: index + 1,
      digit: match.digit,
      score: match.score,
      normalized: match.normalized,
      options: (match.options || []).slice(0, 3).map((option) => ({
        digit: option.digit,
        score: option.score,
        template: digitTemplates[option.digit] || [],
        width: templateWidth(digitTemplates[option.digit] || []),
        height: (digitTemplates[option.digit] || []).length
      }))
    })),
    text,
    confidence
  };
}

function quantityAlternatives(matches: readonly QuantityDigitMatch[]): QuantityAlternative[] {
  const candidateDigits = matches.map((match) => {
    const options = match.options?.length ? match.options : [{ digit: match.digit, score: match.score }];
    return options.slice(0, 4);
  });
  let candidates = [{ text: "", confidence: 0, count: 0 }];
  for (const options of candidateDigits) {
    const next = [];
    for (const candidate of candidates) {
      for (const option of options) {
        next.push({
          text: `${candidate.text}${option.digit}`,
          confidence: candidate.confidence + option.score,
          count: candidate.count + 1
        });
      }
    }
    candidates = next;
  }

  const seen = new Set<number>();
  return candidates
    .map((candidate) => ({
      quantity: Number.parseInt(candidate.text, 10),
      confidence: candidate.count ? candidate.confidence / candidate.count : 0
    }))
    .filter((candidate) => Number.isFinite(candidate.quantity) && candidate.quantity > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate) => {
      if (seen.has(candidate.quantity)) return false;
      seen.add(candidate.quantity);
      return true;
    })
    .slice(0, 6);
}

function collectYellowPixels(imageData: ImageData, box: BoundingBox, options: { readonly strict?: boolean } = {}): PixelPoint[] {
  const { width, data } = imageData;
  const pixels: PixelPoint[] = [];
  const strict = options.strict === true;
  const scanBox = quantityScanBox(box, strict);
  for (let y = scanBox.y; y < scanBox.y + scanBox.h; y += 1) {
    for (let x = scanBox.x; x < scanBox.x + scanBox.w; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (strict ? isStrictQuantityTextPixel(r, g, b) : isQuantityPixel(r, g, b)) {
        pixels.push({ x: x - box.x, y: y - box.y });
      }
    }
  }
  return pixels;
}

function quantityScanBox(box: BoundingBox, strict = false): BoundingBox {
  return {
    x: box.x,
    y: box.y,
    w: Math.min(strict ? 24 : 26, box.w),
    h: Math.min(17, box.h)
  };
}

function isStrictQuantityTextPixel(r: number, g: number, b: number): boolean {
  return isQuantityPixel(r, g, b) && r <= g + 70 && (r + g) / 2 - b >= 58;
}

function isPlausibleQuantityDigitBox(pixels: readonly PixelPoint[], box: BoundingBox, strict = false): boolean {
  if (box.w < 2 || box.h < 4) return false;
  if (!strict) return true;
  if (box.x > 19 || box.y > 10 || box.w > 6 || box.h > 10) return false;
  const area = pixels.filter((pixel) => pixel.x >= box.x && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h).length;
  const density = area / Math.max(1, box.w * box.h);
  return area >= 4 && density >= 0.16 && density <= 0.78;
}

function splitDigitBoxes(pixels: readonly PixelPoint[]): BoundingBox[] {
  const columns = [...new Set(pixels.map((pixel) => pixel.x))].sort((a, b) => a - b);
  const groups: number[][] = [];
  let current: number[] = [];

  for (const column of columns) {
    const previous = current[current.length - 1];
    if (current.length && column - previous > 1) {
      groups.push(current);
      current = [];
    }
    current.push(column);
  }
  if (current.length) groups.push(current);

  return groups.flatMap((group) => {
    const groupPixels = pixels.filter((pixel) => pixel.x >= group[0] && pixel.x <= group[group.length - 1]);
    const minY = Math.min(...groupPixels.map((pixel) => pixel.y));
    const maxY = Math.max(...groupPixels.map((pixel) => pixel.y));
    const box = { x: group[0], y: minY, w: group[group.length - 1] - group[0] + 1, h: maxY - minY + 1 };
    return splitWideDigitBox(pixels, box);
  });
}

function splitWideDigitBox(pixels: readonly PixelPoint[], box: BoundingBox): BoundingBox[] {
  if (box.w <= 5) return [box];

  const columnCounts: number[] = [];
  for (let x = box.x; x < box.x + box.w; x += 1) {
    columnCounts.push(pixels.filter((pixel) => pixel.x === x && pixel.y >= box.y && pixel.y < box.y + box.h).length);
  }
  const splitAt = columnCounts.findIndex((count, index) => index > 1 && index < columnCounts.length - 2 && count <= 1);
  if (splitAt > 0) {
    const left = pixelsToBox(pixels.filter((pixel) => pixel.x >= box.x && pixel.x < box.x + splitAt && pixel.y >= box.y && pixel.y < box.y + box.h));
    const right = pixelsToBox(pixels.filter((pixel) => pixel.x > box.x + splitAt && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h));
    if (left && right) return [left, right];
  }

  const digitWidth = 3;
  const digitGap = 1;
  const count = Math.max(1, Math.round((box.w + digitGap) / (digitWidth + digitGap)));
  if (count <= 1) return [box];

  const boxes: BoundingBox[] = [];
  for (let index = 0; index < count; index += 1) {
    const startX = box.x + index * (digitWidth + digitGap);
    const endX = index === count - 1 ? box.x + box.w - 1 : Math.min(box.x + box.w - 1, startX + digitWidth - 1);
    const partPixels = pixels.filter((pixel) => pixel.x >= startX && pixel.x <= endX && pixel.y >= box.y && pixel.y < box.y + box.h);
    if (!partPixels.length) continue;
    const minX = Math.min(...partPixels.map((pixel) => pixel.x));
    const maxX = Math.max(...partPixels.map((pixel) => pixel.x));
    const minY = Math.min(...partPixels.map((pixel) => pixel.y));
    const maxY = Math.max(...partPixels.map((pixel) => pixel.y));
    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }

  return boxes.length ? boxes : [box];
}

function pixelsToBox(pixels: readonly PixelPoint[]): BoundingBox | null {
  if (!pixels.length) return null;
  const minX = Math.min(...pixels.map((pixel) => pixel.x));
  const maxX = Math.max(...pixels.map((pixel) => pixel.x));
  const minY = Math.min(...pixels.map((pixel) => pixel.y));
  const maxY = Math.max(...pixels.map((pixel) => pixel.y));
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function matchDigit(pixels: readonly PixelPoint[], box: BoundingBox, digitTemplates: DigitTemplateMap): QuantityDigitMatch {
  let best: DigitOption = { digit: "1", score: 0 };
  const scores: Partial<Record<Digit, number>> = {};
  const normalizedByWidth = new Map<number, string[]>();
  const normalizedForWidth = (width: number) => {
    if (!normalizedByWidth.has(width)) normalizedByWidth.set(width, normalizeDigit(pixels, box, width));
    return normalizedByWidth.get(width) || [];
  };

  for (const [digit, template] of Object.entries(digitTemplates) as Array<[Digit, DigitTemplate]>) {
    const normalized = normalizedForWidth(templateWidth(template));
    const score = shiftedTemplateScore(normalized, template);
    scores[digit] = score;
    if (score > best.score) best = { digit, score };
  }

  const adjusted = adjustCommonQuantityMistakes(best, scores, normalizedForWidth(DIGIT_TEMPLATE_WIDTH));
  return {
    ...adjusted,
    normalized: normalizedForWidth(templateWidth(digitTemplates[adjusted.digit])),
    options: digitOptions(scores, adjusted)
  };
}

function digitOptions(scores: Partial<Record<Digit, number>>, adjusted: DigitOption): DigitOption[] {
  const options = (Object.entries(scores) as Array<[Digit, number]>)
    .map(([digit, score]) => ({ digit, score }))
    .sort((a, b) => b.score - a.score);
  const adjustedIndex = options.findIndex((option) => option.digit === adjusted.digit);
  if (adjustedIndex >= 0) options.splice(adjustedIndex, 1);
  return [{ digit: adjusted.digit, score: adjusted.score }, ...options].slice(0, 5);
}

function adjustCommonQuantityMistakes(
  best: DigitOption,
  scores: Partial<Record<Digit, number>>,
  normalized: readonly string[]
): DigitOption {
  const rows = normalized.map((row) => row.split(""));
  const has = (x: number, y: number) => rows[y]?.[x] === "1";
  const scoreGap = (a: Digit, b: Digit) => Math.abs((scores[a] || 0) - (scores[b] || 0));

  if (best.digit === "7" && (scores[2] || 0) >= (scores[7] || 0) - 0.18) {
    const hasMiddle = has(1, 2) || has(2, 2);
    const hasLowerLeft = has(0, 3) || has(0, 4);
    const weakSevenStem = !has(2, 2) || !has(1, 3);
    if ((hasMiddle && hasLowerLeft) || (weakSevenStem && scoreGap("2", "7") <= 0.18)) {
      return { digit: "2", score: Math.max(scores[2] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "9" && (scores[3] || 0) >= (scores[9] || 0) - 0.28) {
    const hasLeftLower = has(0, 3) || has(0, 4);
    const strongRightSide = has(2, 1) && has(2, 2) && has(2, 3);
    const weakNineLoop = !has(0, 1) || !has(0, 2);
    const threeLikeCenter = has(1, 2) || has(2, 2);
    if ((!hasLeftLower && strongRightSide) || (weakNineLoop && threeLikeCenter) || scoreGap("3", "9") <= 0.2) {
      return { digit: "3", score: Math.max(scores[3] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "6" && (scores[0] || 0) >= (scores[6] || 0) - 0.2) {
    const openRightTop = !has(2, 1);
    const zeroLoop = has(0, 1) && has(2, 1) && has(0, 3) && has(2, 3);
    if (zeroLoop || openRightTop) {
      return { digit: "0", score: Math.max(scores[0] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "8" && (scores[6] || 0) >= (scores[8] || 0) - 0.14 && !has(2, 1)) {
    return { digit: "6", score: Math.max(scores[6] || 0, best.score - 0.04) };
  }

  return best;
}
