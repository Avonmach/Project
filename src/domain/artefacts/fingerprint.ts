import { isQuantityPixel } from "../ocr/quantity-ocr";
import { sameColor } from "../shared/color";
import { getIconMatchBox, type BoundingBox } from "../shared/geometry";
import { alphaBounds, copyImageData } from "../../infrastructure/image-processing/image-data";

const MATCH_SIZE = 32;

export interface FingerprintPixel {
  readonly visible: boolean;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly light: number;
  edge?: boolean;
}

export interface FingerprintDescriptor {
  readonly aspect: number;
  readonly fill: number;
  readonly centerX: number;
  readonly centerY: number;
}

export type Fingerprint = FingerprintPixel[] & {
  descriptor?: FingerprintDescriptor;
  histogram?: number[];
  hueHistogram?: number[];
  grayHistogram?: number[];
  colorTotals?: { readonly total: number; readonly hue: number; readonly gray: number };
};

export interface FingerprintComparison {
  readonly total: number;
  readonly shape: number;
  readonly color: number;
  readonly light: number;
  readonly overlap?: number;
  readonly edge?: number;
  readonly descriptor?: number;
}

export function fingerprintReference(image: CanvasImageSource): Fingerprint {
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return toFingerprint(new ImageData(MATCH_SIZE, MATCH_SIZE), false);
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);
  tempCtx.drawImage(image, 0, 0, MATCH_SIZE, MATCH_SIZE);
  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), false);
}

export function fingerprintCrop(imageData: ImageData, box: BoundingBox): Fingerprint {
  const iconBox = getIconMatchBox(box);
  const cropData = copyImageData(imageData, iconBox);
  const bounds = alphaBounds(cropData);
  const source = document.createElement("canvas");
  source.width = cropData.width;
  source.height = cropData.height;
  source.getContext("2d", { willReadFrequently: true })?.putImageData(cropData, 0, 0);
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return toFingerprint(new ImageData(MATCH_SIZE, MATCH_SIZE), true);
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const offsetX = Math.floor((MATCH_SIZE - (bounds.w / longest) * MATCH_SIZE) / 2);
    const offsetY = Math.floor((MATCH_SIZE - (bounds.h / longest) * MATCH_SIZE) / 2);
    tempCtx.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      offsetX,
      offsetY,
      Math.ceil((bounds.w / longest) * MATCH_SIZE),
      Math.ceil((bounds.h / longest) * MATCH_SIZE)
    );
  }

  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), true);
}

export function fingerprintColorCrop(originalImageData: ImageData, shapeImageData: ImageData, box: BoundingBox): Fingerprint {
  const iconBox = getIconMatchBox(box);
  const originalCrop = copyImageData(originalImageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);
  const bounds = alphaBounds(shapeCrop);
  const masked = new ImageData(originalCrop.width, originalCrop.height);

  for (let i = 0; i < originalCrop.data.length; i += 4) {
    if (shapeCrop.data[i + 3] <= 20) continue;
    masked.data[i] = originalCrop.data[i];
    masked.data[i + 1] = originalCrop.data[i + 1];
    masked.data[i + 2] = originalCrop.data[i + 2];
    masked.data[i + 3] = 255;
  }

  const source = document.createElement("canvas");
  source.width = masked.width;
  source.height = masked.height;
  source.getContext("2d", { willReadFrequently: true })?.putImageData(masked, 0, 0);

  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) return toFingerprint(new ImageData(MATCH_SIZE, MATCH_SIZE), true);
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "high";
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const offsetX = Math.floor((MATCH_SIZE - (bounds.w / longest) * MATCH_SIZE) / 2);
    const offsetY = Math.floor((MATCH_SIZE - (bounds.h / longest) * MATCH_SIZE) / 2);
    tempCtx.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      offsetX,
      offsetY,
      Math.ceil((bounds.w / longest) * MATCH_SIZE),
      Math.ceil((bounds.h / longest) * MATCH_SIZE)
    );
  }

  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), true);
}

export function removeBackground(imageData: ImageData): ImageData {
  const backgroundColor = topLeftPixelColor(imageData);
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  for (let i = 0; i < out.data.length; i += 4) {
    const r = out.data[i];
    const g = out.data[i + 1];
    const b = out.data[i + 2];
    const isYellowText = r > 120 && g > 105 && b < 75 && r >= g - 18;
    const isNearlyBlack = r < 8 && g < 8 && b < 8;

    if (sameColor(r, g, b, backgroundColor) || isYellowText || isNearlyBlack) {
      out.data[i + 3] = 0;
    } else {
      out.data[i + 3] = 255;
    }
  }
  return out;
}

export function toFingerprint(imageData: ImageData, cleanedCrop: boolean): Fingerprint {
  const values = [] as Fingerprint;
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    const visible = cleanedCrop ? a > 35 : a > 20;
    values.push({
      visible,
      r: visible ? r : 0,
      g: visible ? g : 0,
      b: visible ? b : 0,
      light: visible ? (r + g + b) / 3 : 0
    });
  }
  values.descriptor = fingerprintDescriptor(values);
  return attachHistogram(values);
}

export function toScreenshotFingerprint(imageData: ImageData, backgroundColor = topLeftPixelColor(imageData)): Fingerprint {
  const values = [] as Fingerprint;
  const edgeBackground = connectedEdgeBackgroundMask(imageData, backgroundColor);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    const visible = a > 20 && !edgeBackground[i / 4] && !isQuantityPixel(r, g, b);
    values.push({
      visible,
      r: visible ? r : 0,
      g: visible ? g : 0,
      b: visible ? b : 0,
      light: visible ? (r + g + b) / 3 : 0
    });
  }
  values.descriptor = fingerprintDescriptor(values);
  return attachHistogram(values);
}

export function topLeftPixelColor(imageData: ImageData): { readonly r: number; readonly g: number; readonly b: number } {
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2]
  };
}

export function histogramSimilarity(a: Pick<Fingerprint, "histogram">, b: Pick<Fingerprint, "histogram">): number {
  if (!a.histogram || !b.histogram) return 0;
  let score = 0;
  for (let i = 0; i < a.histogram.length; i += 1) {
    score += Math.min(a.histogram[i], b.histogram[i]);
  }
  return score;
}

export function histogramChiAltSimilarity(a: Fingerprint, b: Fingerprint): number {
  if (!a.histogram || !b.histogram) return 0;
  let distance = 0;
  for (let i = 0; i < a.histogram.length; i += 1) {
    const denom = a.histogram[i] + b.histogram[i];
    if (denom <= 0) continue;
    const diff = a.histogram[i] - b.histogram[i];
    distance += (2 * diff * diff) / denom;
  }
  const rgbScore = 1 / (1 + distance);
  const hueScore = histogramSimilarity({ histogram: a.hueHistogram }, { histogram: b.hueHistogram });
  const grayScore = histogramSimilarity({ histogram: a.grayHistogram }, { histogram: b.grayHistogram });
  const hueWeight = Math.min(a.colorTotals?.hue || 0, b.colorTotals?.hue || 0) > 2 ? 0.55 : 0.2;
  const grayWeight = Math.min(a.colorTotals?.gray || 0, b.colorTotals?.gray || 0) > 2 ? 0.15 : 0;
  const rgbWeight = Math.max(0.25, 1 - hueWeight - grayWeight);
  return rgbScore * rgbWeight + hueScore * hueWeight + grayScore * grayWeight;
}

export function compareFingerprints(a: Fingerprint, b: Fingerprint): FingerprintComparison {
  a = withEdges(a);
  b = withEdges(b);
  let overlap = 0;
  let visibleUnion = 0;
  let visibleA = 0;
  let visibleB = 0;
  let edgeOverlap = 0;
  let edgeUnion = 0;
  let colorScore = 0;
  let lightScore = 0;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].visible) visibleA += 1;
    if (b[i].visible) visibleB += 1;
    if (a[i].visible || b[i].visible) visibleUnion += 1;
    if (a[i].edge || b[i].edge) edgeUnion += 1;
    if (a[i].edge && b[i].edge) edgeOverlap += 1;
    if (!a[i].visible || !b[i].visible) continue;
    overlap += 1;
    const colorDistance = Math.abs(a[i].r - b[i].r) + Math.abs(a[i].g - b[i].g) + Math.abs(a[i].b - b[i].b);
    const lightDistance = Math.abs(a[i].light - b[i].light);
    colorScore += 1 - Math.min(colorDistance / 765, 1);
    lightScore += 1 - Math.min(lightDistance / 255, 1);
  }

  if (!visibleUnion || !overlap) return { total: 0, shape: 0, color: 0, light: 0 };
  const coverageA = overlap / Math.max(visibleA, 1);
  const coverageB = overlap / Math.max(visibleB, 1);
  const shapeScore = Math.sqrt(coverageA * coverageB);
  const edgeScore = edgeUnion ? edgeOverlap / edgeUnion : shapeScore;
  const descriptorScore = compareDescriptors(a.descriptor, b.descriptor);
  const color = colorScore / overlap;
  const light = lightScore / overlap;
  const silhouette = shapeScore * 0.55 + edgeScore * 0.25 + descriptorScore * 0.2;
  return {
    total: silhouette * 0.9 + color * 0.04 + light * 0.06,
    shape: silhouette,
    overlap: overlap / visibleUnion,
    edge: edgeScore,
    descriptor: descriptorScore,
    color,
    light
  };
}

function connectedEdgeBackgroundMask(imageData: ImageData, backgroundColor = topLeftPixelColor(imageData)): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue: number[] = [];

  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (!sameColor(data[offset], data[offset + 1], data[offset + 2], backgroundColor)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const x = index % width;
    const y = Math.floor(index / width);
    add(x + 1, y);
    add(x - 1, y);
    add(x, y + 1);
    add(x, y - 1);
  }

  return mask;
}

function attachHistogram(values: Fingerprint): Fingerprint {
  const histogram = Array.from({ length: 512 }, () => 0);
  const hueHistogram = Array.from({ length: 12 }, () => 0);
  const grayHistogram = Array.from({ length: 8 }, () => 0);
  let total = 0;
  let hueTotal = 0;
  let grayTotal = 0;
  for (const value of values) {
    if (!value.visible) continue;
    const rb = Math.min(Math.floor(value.r / 32), 7);
    const gb = Math.min(Math.floor(value.g / 32), 7);
    const bb = Math.min(Math.floor(value.b / 32), 7);
    const hsv = rgbToHsv(value.r, value.g, value.b);
    histogram[rb * 64 + gb * 8 + bb] += 1;
    if (hsv.s > 0.12) {
      hueHistogram[Math.min(Math.floor(hsv.h * hueHistogram.length), hueHistogram.length - 1)] += 1;
      hueTotal += 1;
    } else {
      grayHistogram[Math.min(Math.floor(hsv.v * grayHistogram.length), grayHistogram.length - 1)] += 1;
      grayTotal += 1;
    }
    total += 1;
  }
  values.histogram = total ? histogram.map((count) => count / total) : histogram;
  values.hueHistogram = hueTotal ? hueHistogram.map((count) => count / hueTotal) : hueHistogram;
  values.grayHistogram = grayTotal ? grayHistogram.map((count) => count / grayTotal) : grayHistogram;
  values.colorTotals = { total, hue: hueTotal, gray: grayTotal };
  return values;
}

function rgbToHsv(r: number, g: number, b: number): { readonly h: number; readonly s: number; readonly v: number } {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function fingerprintDescriptor(values: Fingerprint): FingerprintDescriptor {
  let minX = MATCH_SIZE;
  let minY = MATCH_SIZE;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      const value = values[y * MATCH_SIZE + x];
      if (!value.visible) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
      count += 1;
    }
  }

  if (!count) {
    return { aspect: 1, fill: 0, centerX: 0.5, centerY: 0.5 };
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    aspect: width / Math.max(height, 1),
    fill: count / Math.max(width * height, 1),
    centerX: sumX / count / MATCH_SIZE,
    centerY: sumY / count / MATCH_SIZE
  };
}

function withEdges(values: Fingerprint): Fingerprint {
  const result = values.map((value) => ({ ...value, edge: false })) as Fingerprint;
  result.descriptor = values.descriptor;
  result.histogram = values.histogram;
  result.hueHistogram = values.hueHistogram;
  result.grayHistogram = values.grayHistogram;
  result.colorTotals = values.colorTotals;

  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      const index = y * MATCH_SIZE + x;
      if (!values[index].visible) continue;
      const neighbors = [
        y > 0 ? values[(y - 1) * MATCH_SIZE + x] : null,
        y < MATCH_SIZE - 1 ? values[(y + 1) * MATCH_SIZE + x] : null,
        x > 0 ? values[y * MATCH_SIZE + x - 1] : null,
        x < MATCH_SIZE - 1 ? values[y * MATCH_SIZE + x + 1] : null
      ];
      result[index].edge = neighbors.some((neighbor) => !neighbor || !neighbor.visible);
    }
  }
  return result;
}

function compareDescriptors(a: FingerprintDescriptor | undefined, b: FingerprintDescriptor | undefined): number {
  if (!a || !b) return 0;
  const aspectScore = 1 - Math.min(Math.abs(Math.log(a.aspect) - Math.log(b.aspect)) / 1.6, 1);
  const fillScore = 1 - Math.min(Math.abs(a.fill - b.fill) / 0.65, 1);
  const centerScore =
    1 - Math.min((Math.abs(a.centerX - b.centerX) + Math.abs(a.centerY - b.centerY)) / 0.75, 1);
  return aspectScore * 0.45 + fillScore * 0.35 + centerScore * 0.2;
}
