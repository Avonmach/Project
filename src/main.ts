// @ts-nocheck
import {
  FALLBACK_DIGIT_TEMPLATES,
  buildDigitTemplatesFromFont
} from "./domain/ocr/digit-templates";
import {
  aggregateRestoredArtefacts as aggregateRestoredArtefactsForDetections,
  calculateMaterialTotals as calculateMaterialTotalsForRecipes
} from "./application/calculate-materials/material-totals";
import { applyQuantityChange as applyQuantityCorrection } from "./application/correct-detection/quantity-correction";
import { applyReferenceCorrection as applyReferenceCorrectionRule } from "./application/correct-detection/reference-correction";
import { verifyDetection as applyDetectionVerification } from "./application/correct-detection/verification";
import { createAnalysisExportPayload, exportBestMatch } from "./application/export-analysis/analysis-export";
import { filterAndSortDetections } from "./application/filter-detections/detection-filters";
import {
  sortMaterialRows as sortMaterialRowsForMode,
  sortRestoredRows as sortRestoredRowsForMode
} from "./application/sort-results/result-row-sorting";
import { detectQuantity, isQuantityPixel, quantityCandidatesAreClose } from "./domain/ocr/quantity-ocr";
import { channelDistance, colorDistance, sameColor } from "./domain/shared/color";
import { normalizeName } from "./domain/shared/format";
import { getIconMatchBox } from "./domain/shared/geometry";
import { loadImageElement } from "./infrastructure/browser/image-loader";
import {
  emptyArchaeologyReferenceData,
  loadArchaeologyReferenceData,
  loadDamagedArtifactRecords
} from "./infrastructure/data/reference-data";
import { alphaBounds, copyImageData, cropImageData, pixelColorAt } from "./infrastructure/image-processing/image-data";
import {
  applyResultTabSelection,
  connectResultTabButtons
} from "./presentation/tabs/results-tabs";
import { createResultsState } from "./presentation/state/results-state";
import { renderOverviewTab as renderOverviewTabPanel } from "./presentation/renderers/overview-tab";
import { drawTableEmptyState, renderRestoredTab as renderRestoredTabPanel } from "./presentation/renderers/restored-tab";
import { renderMaterialsTab as renderMaterialsTabPanel } from "./presentation/renderers/materials-tab";
import { renderStorageTab as renderStorageTabPanel } from "./presentation/renderers/storage-tab";
import { renderDamagedTab as renderDamagedTabPanel } from "./presentation/renderers/damaged-tab";
import { makeCollectionOverview as makeCollectionOverviewElement } from "./presentation/renderers/collection-overview";
import { renderRestorationPlan as renderRestorationPlanPanel } from "./presentation/renderers/restoration-plan";
import { makeRecognitionInfo as makeRecognitionInfoElement } from "./presentation/renderers/recognition-info";
import { renderSummaryTotals } from "./presentation/renderers/summary-totals";
import { makeMaterialCell as makeMaterialCellElement } from "./presentation/renderers/material-cell";
import { drawAnalysisOverlay } from "./presentation/renderers/analysis-overlay";
import { updateDetectionRow as updateDetectionRowElement } from "./presentation/renderers/detection-row-update";
import {
  makeBackgroundRemovedCanvas,
  makeCroppedShapeCanvas,
  makePreviewCanvas,
  makeProcessedCanvas,
  makeReferenceCanvas,
  makeRemovedOverlayCanvas,
  makeScaledShapeCanvas,
  makeShapeMaskCanvas
} from "./presentation/renderers/preview-canvases";
import {
  makeEmptyMessage,
  makeLinkedTextCell,
  makeOverviewCard,
  makePlanTable,
  makeTableHead,
  makeTextCell
} from "./presentation/renderers/table-elements";
import {
  makeDetectionTableRow as makeDetectionTableRowElement,
  makeStatusPill as makeDetectionStatusPill,
  rowReviewClass as detectionRowReviewClass
} from "./presentation/renderers/detection-row";
import { makeReferenceCorrectionDropdown as makeReferenceCorrectionDropdownElement } from "./presentation/renderers/correction-dropdown";
import { makeQuantityDebugView as makeQuantityDebugViewElement } from "./presentation/renderers/quantity-debug";

const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const imageInput = document.getElementById("imageInput");
const loadDefaultButton = document.getElementById("loadDefault");
const analyzeButton = document.getElementById("analyze");
const viewMode = document.getElementById("viewMode");
const exportResultsButton = document.getElementById("exportResults");
const resultsBody = document.getElementById("resultsBody");
const restoredResultsBody = document.getElementById("restoredResultsBody");
const slotCountEl = document.getElementById("slotCount");
const quantityTotalEl = document.getElementById("quantityTotal");
const manualCountEl = document.getElementById("manualCount");
const referenceCountEl = document.getElementById("referenceCount");
const visibleCountEl = document.getElementById("visibleCount");
const reviewCountEl = document.getElementById("reviewCount");
const highestLevelEl = document.getElementById("highestLevel");
const planBody = document.getElementById("planBody");
const artefactSearch = document.getElementById("artefactSearch");
const cultureFilter = document.getElementById("cultureFilter");
const reviewOnly = document.getElementById("reviewOnly");
const resultsTitle = document.getElementById("resultsTitle");
const resultTabButtons = [...document.querySelectorAll("[data-results-tab]")];
const resultTabPanels = [...document.querySelectorAll("[data-results-panel]")];
const overviewPanel = document.getElementById("overviewPanel");
const storagePanel = document.getElementById("storagePanel");
const materialsPanel = document.getElementById("materialsPanel");

const MATCH_SIZE = 32;
const BANK_CELL_SIZE = 44;
const BANK_GRID_SHIFT_X = 0;
const BANK_GRID_SHIFT_Y = 0;
const LOW_CONFIDENCE = 0.6;
const REVIEW_CONFIDENCE = 0.75;
const DAMAGED_FALLBACK_CONFIDENCE = 0.6;
const SHAPE_SCORE_WEIGHT = 0.8;
const COLOR_SCORE_WEIGHT = 0.2;
const CROWDED_SHAPE_COLOR_WEIGHT = 0.6;
const SHAPE_CROWD_MARGIN = 0.015;
const SHAPE_CROWD_COUNT = 5;
const AMBIGUOUS_FINAL_MARGIN = 0.025;
const COLOR_POSITION_WEIGHT = 0.25;
const COLOR_SIMILAR_MARGIN = 0.03;
const PREVIEW_BRIGHTNESS = 1.45;
let loadedImage = null;
let detections = [];
let references = [];
let archaeologyReference = { materials: [], artefactRecipes: [], collections: [] };
let recipeByRestoredName = new Map();
let materialByName = new Map();
const resultsState = createResultsState();
let collectionSort = { key: "progress", direction: "desc" };

let digitTemplates = FALLBACK_DIGIT_TEMPLATES;
const DEFAULT_SCREENSHOTS = {
  damaged: "Damaged_Items.png",
  restored: "Items%23.png"
};

loadDefaultButton.addEventListener("click", () => imageInput.click());
analyzeButton.addEventListener("click", analyzeCurrentImage);
viewMode.addEventListener("change", renderDetections);
artefactSearch.addEventListener("input", renderDetections);
cultureFilter.addEventListener("change", renderDetections);
reviewOnly.addEventListener("change", renderDetections);
connectResultTabButtons(resultTabButtons, setActiveResultsTab);
document.addEventListener("click", (event) => {
  for (const menu of document.querySelectorAll(".correction-menu[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
exportResultsButton.addEventListener("click", exportResults);
imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadImageFromUrl(reader.result);
  reader.readAsDataURL(file);
});

initialize();

async function initialize() {
  analyzeButton.disabled = true;
  drawEmptyState("Loading reference database.");
  await loadQuantityFontTemplates();
  await loadReferences();
  await loadArchaeologyReference();
  await loadImageFromUrl(DEFAULT_SCREENSHOTS.damaged);
  analyzeButton.disabled = false;
  drawEmptyState("Image and references loaded. Click Analyze.");
}

async function loadQuantityFontTemplates() {
  if (!("FontFace" in window)) return;
  try {
    const face = new FontFace("RunescapeQuantityOCR", "url('runescape-small-07/runescape-small-07.otf')");
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
    digitTemplates = buildDigitTemplatesFromFont("RunescapeQuantityOCR");
  } catch (error) {
    console.warn("Using fallback quantity OCR templates.", error);
    digitTemplates = FALLBACK_DIGIT_TEMPLATES;
  }
}

async function loadReferences() {
  const items = await loadDamagedArtifactRecords();

  references = await Promise.all(
    items.map(async (item) => {
      const image = await loadImageElement(`data/${item.icon}`);
      const damagedImage = item.damagedIcon ? await loadImageElement(`data/${item.damagedIcon}`) : null;
      const fingerprint = fingerprintReference(image);
      const damagedFingerprint = damagedImage ? fingerprintReference(damagedImage) : null;
      return { ...item, image, fingerprint, damagedImage, damagedFingerprint };
    })
  );

  referenceCountEl.textContent = String(references.length);
}

async function loadArchaeologyReference() {
  try {
    archaeologyReference = await loadArchaeologyReferenceData();
    recipeByRestoredName = new Map(
      (archaeologyReference.artefactRecipes || []).map((recipe) => [normalizeName(recipe.restoredName), recipe])
    );
    materialByName = new Map(
      (archaeologyReference.materials || []).map((material) => [normalizeName(material.name), material])
    );
  } catch (error) {
    console.warn("Material and collection reference data is unavailable.", error);
    archaeologyReference = emptyArchaeologyReferenceData();
    recipeByRestoredName = new Map();
    materialByName = new Map();
  }
}

function loadImageFromUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => {
      drawEmptyState("Could not load the screenshot.");
      resolve();
    };
    img.src = src;
  });
}

function analyzeCurrentImage() {
  if (!loadedImage || !references.length) return;

  const recognitionMode = resultsState.activeTab === "restored" ? "restored" : "damaged";
  ctx.drawImage(loadedImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grid = estimateBankGrid(imageData, { trimLastColumn: recognitionMode === "restored" });
  const boxes = detectItemBoxes(imageData, grid);
  const shapeImageData = makeFullShapeImageData(imageData, grid, recognitionMode);

  const analyzedDetections = boxes.map((box, index) => {
    const quantityResult = detectQuantity(imageData, box, recognitionMode, digitTemplates);
    const match = matchArtifact(shapeImageData, imageData, box, recognitionMode);
    const preview = makePreviewCanvas(imageData, box, { enhanceHover: recognitionMode !== "restored" });
    const processedPreview = makeProcessedCanvas(imageData, shapeImageData, box, { enhance: recognitionMode !== "restored" });
    const referencePreview = makeReferenceCanvas(match.item.image);

    return {
      id: index + 1,
      box,
      bankIndex: index,
      bankRow: Math.floor(box.y / BANK_CELL_SIZE) + 1,
      bankColumn: Math.floor(box.x / BANK_CELL_SIZE) + 1,
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
      quantityDebug: attachQuantityDebugSource(quantityResult.debug, imageData),
      quantityCorrection: null,
      quantityManual: false,
      preview,
      processedPreview,
      referencePreview,
      corrected: false,
      manual: false
    };
  });

  detections = resultsState.setDetectionsForMode(recognitionMode, analyzedDetections);
  applyUniqueArtefactAssignments(detections);
  renderDetections();
  drawBoxes(detections, grid.contentArea, grid.infinityArea);
}

function matchArtifact(shapeImageData, originalImageData, box, mode = "damaged") {
  const cropFingerprint = fingerprintCrop(shapeImageData, box);
  const colorFingerprint = fingerprintColorCrop(originalImageData, shapeImageData, box);
  let best = { item: references[0], score: 0, restoredScore: 0, damagedScore: 0, shapeScore: 0, colorScore: 0 };
  let bestShape = { item: references[0], score: 0 };
  let bestRestored = { item: references[0], score: 0 };
  let bestDamaged = { item: references[0], score: 0 };
  let bestColor = { item: references[0], score: 0 };
  const scores = [];

  for (const item of references) {
    const restored = compareFingerprints(cropFingerprint, item.fingerprint);
    const damaged = mode === "restored" ? null : item.damagedFingerprint ? compareFingerprints(cropFingerprint, item.damagedFingerprint) : null;
    const restoredColor = histogramChiAltSimilarity(colorFingerprint, item.fingerprint);
    const damagedColor = damaged ? histogramChiAltSimilarity(colorFingerprint, item.damagedFingerprint) : 0;
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
  const ambiguous = Boolean(secondBest && matchGap <= AMBIGUOUS_FINAL_MARGIN);
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

function applyUniqueArtefactAssignments(items) {
  const used = new Set();
  const byConfidence = [...items].sort((a, b) => b.matchScore - a.matchScore || a.bankIndex - b.bankIndex);

  for (const detection of byConfidence) {
    const candidate = (detection.topMatches || []).find((match) => {
      const key = artefactKey(match.item);
      return key && !used.has(key);
    });
    if (!candidate) continue;
    applyCandidatePrediction(detection, candidate);
    used.add(artefactKey(candidate.item));
  }
}

function artefactKey(item) {
  return (item?.restoredName || item?.name || "").toLowerCase();
}

function applyCandidatePrediction(detection, candidate) {
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
  detection.referenceUsed = candidate.damagedScore > candidate.restoredScore ? "damaged" : "restored";
  detection.referencePreview = makeReferenceCanvas(item.image);
  const ordered = detection.topMatches || [];
  const index = ordered.indexOf(candidate);
  const next = ordered.find((match, candidateIndex) => candidateIndex !== index);
  detection.matchGap = next ? candidate.score - next.score : 1;
  detection.ambiguousMatch = Boolean(next && detection.matchGap <= AMBIGUOUS_FINAL_MARGIN);
}

function fingerprintReference(image) {
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);
  tempCtx.drawImage(image, 0, 0, MATCH_SIZE, MATCH_SIZE);
  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), false);
}

function fingerprintCrop(imageData, box) {
  const iconBox = getIconMatchBox(box);
  const cropData = copyImageData(imageData, iconBox);
  const bounds = alphaBounds(cropData);
  const source = document.createElement("canvas");
  source.width = cropData.width;
  source.height = cropData.height;
  source.getContext("2d", { willReadFrequently: true }).putImageData(cropData, 0, 0);
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
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

function fingerprintColorCrop(originalImageData, shapeImageData, box) {
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
  source.getContext("2d", { willReadFrequently: true }).putImageData(masked, 0, 0);

  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
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

function makeFullShapeImageData(imageData, grid, mode = "damaged") {
  const out = new ImageData(imageData.width, imageData.height);
  const removeSimilarBackground = mode === "restored";

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;

      const backgroundColors = cellBackgroundColors(imageData, x, y, w, h, { includeSimilar: removeSimilarBackground });
      const backgroundMask = removeSimilarBackground ? connectedCellBackgroundMask(imageData, x, y, w, h, backgroundColors) : null;
      for (let py = y; py < y + h; py += 1) {
        for (let px = x; px < x + w; px += 1) {
          const offset = (py * imageData.width + px) * 4;
          const r = imageData.data[offset];
          const g = imageData.data[offset + 1];
          const b = imageData.data[offset + 2];
          const a = imageData.data[offset + 3];
          const backgroundRemoved = backgroundMask
            ? backgroundMask[(py - y) * w + (px - x)]
            : matchesCellBackground(r, g, b, backgroundColors, removeSimilarBackground);
          const visible =
            a > 20 &&
            !backgroundRemoved &&
            !isQuantityPixelInCell(r, g, b, px - x, py - y);
          out.data[offset] = 0;
          out.data[offset + 1] = 0;
          out.data[offset + 2] = 0;
          out.data[offset + 3] = visible ? 255 : 0;
        }
      }
    }
  }

  return out;
}

function cellBackgroundColors(imageData, x, y, w, h, options = {}) {
  const counts = new Map();
  const addSample = (px, py) => {
    if (options.includeSimilar && !isCellBackgroundSamplePoint(px - x, py - y, w, h)) return;
    const color = pixelColorAt(imageData, px, py);
    if (isQuantityPixel(color.r, color.g, color.b)) return;
    if (isFrameOrScrollbarPixel(color.r, color.g, color.b)) return;
    if (!isSlotBackgroundCandidate(color.r, color.g, color.b)) return;
    const key = `${color.r},${color.g},${color.b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const minX = x;
  const maxX = x + w - 1;
  const minY = y;
  const maxY = y + h - 1;
  const step = 2;

  for (let py = minY; py <= maxY; py += step) {
    for (let px = minX; px <= maxX; px += step) {
      addSample(px, py);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return [pixelColorAt(imageData, x, y)];

  const minimumCount = options.includeSimilar ? Math.max(2, ranked[0][1] * 0.08) : ranked[0][1];
  return ranked
    .filter((entry) => entry[1] >= minimumCount)
    .slice(0, options.includeSimilar ? 3 : 1)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return { r, g, b };
    });
}

function matchesCellBackground(r, g, b, backgroundColors, includeSimilar) {
  if (!includeSimilar) return backgroundColors.some((color) => sameColor(r, g, b, color));
  if (!isSlotBackgroundCandidate(r, g, b)) return false;
  return backgroundColors.some((color) => channelDistance(r, g, b, color) <= 5 && colorDistance(r, g, b, color) <= 14);
}

function connectedCellBackgroundMask(imageData, x, y, w, h, backgroundColors) {
  const mask = new Uint8Array(w * h);
  const queue = [];
  const add = (localX, localY) => {
    if (localX < 0 || localY < 0 || localX >= w || localY >= h) return;
    const index = localY * w + localX;
    if (mask[index]) return;
    const offset = ((y + localY) * imageData.width + x + localX) * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    if (!matchesCellBackground(r, g, b, backgroundColors, true)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let px = 0; px < w; px += 1) {
    add(px, 0);
    add(px, h - 1);
  }
  for (let py = 1; py < h - 1; py += 1) {
    add(0, py);
    add(w - 1, py);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const localX = index % w;
    const localY = Math.floor(index / w);
    add(localX + 1, localY);
    add(localX - 1, localY);
    add(localX, localY + 1);
    add(localX, localY - 1);
  }

  return mask;
}

function isSlotBackgroundCandidate(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 24 && max <= 88 && max - min <= 18 && r <= g + 12 && g <= r + 12;
}

function isCellBackgroundSamplePoint(x, y, w, h) {
  const band = Math.max(6, Math.floor(Math.min(w, h) * 0.18));
  return x < band || y < band || x >= w - band || y >= h - band;
}

function isQuantityPixelInCell(r, g, b, x, y) {
  return x < 26 && y < 17 && isQuantityPixel(r, g, b);
}

function connectedGridBackgroundMask(imageData, grid, backgroundColor) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue = [];
  const minX = Math.max(0, grid.x);
  const minY = Math.max(0, grid.y);
  const maxX = Math.min(width - 1, grid.x + grid.columns * grid.cell - 1);
  const maxY = Math.min(height - 1, grid.y + grid.rows * grid.cell - 1);

  const add = (x, y) => {
    if (x < minX || y < minY || x > maxX || y > maxY) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (!sameColor(data[offset], data[offset + 1], data[offset + 2], backgroundColor)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = minX; x <= maxX; x += 1) {
    add(x, minY);
    add(x, maxY);
  }
  for (let y = minY + 1; y < maxY; y += 1) {
    add(minX, y);
    add(maxX, y);
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

function removeBackground(imageData) {
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

function toFingerprint(imageData, cleanedCrop) {
  const values = [];
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

function toScreenshotFingerprint(imageData, backgroundColor = topLeftPixelColor(imageData)) {
  const values = [];
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

function connectedEdgeBackgroundMask(imageData, backgroundColor = topLeftPixelColor(imageData)) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue = [];

  const add = (x, y) => {
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

function topLeftPixelColor(imageData) {
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2]
  };
}

function attachHistogram(values) {
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

function rgbToHsv(r, g, b) {
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

function histogramSimilarity(a, b) {
  if (!a.histogram || !b.histogram) return 0;
  let score = 0;
  for (let i = 0; i < a.histogram.length; i += 1) {
    score += Math.min(a.histogram[i], b.histogram[i]);
  }
  return score;
}

function histogramChiAltSimilarity(a, b) {
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

function fingerprintDescriptor(values) {
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

function withEdges(values) {
  const result = values.map((value) => ({ ...value, edge: false }));
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

function compareFingerprints(a, b) {
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

function compareDescriptors(a, b) {
  if (!a || !b) return 0;
  const aspectScore = 1 - Math.min(Math.abs(Math.log(a.aspect) - Math.log(b.aspect)) / 1.6, 1);
  const fillScore = 1 - Math.min(Math.abs(a.fill - b.fill) / 0.65, 1);
  const centerScore =
    1 - Math.min((Math.abs(a.centerX - b.centerX) + Math.abs(a.centerY - b.centerY)) / 0.75, 1);
  return aspectScore * 0.45 + fillScore * 0.35 + centerScore * 0.2;
}

function foregroundAlphaBounds(imageData) {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      if (!isScreenshotShapePixel(r, g, b)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function detectItemBoxes(imageData, grid = estimateBankGrid(imageData)) {
  const boxes = [];

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box) || isBeforeLastDetectedItem(row, column, grid)) boxes.push(box);
    }
  }

  return boxes;
}

function isBeforeLastDetectedItem(row, column, grid) {
  const lastColumn = Math.min(grid.columns - 1, grid.lastOccupiedColumn + 1);
  return row < grid.lastOccupiedRow || (row === grid.lastOccupiedRow && column <= lastColumn);
}

function estimateBankGrid(imageData, options = {}) {
  const bankContent = findBankContentArea(imageData);
  const centerSearchArea = bankContent
    ? { x: bankContent.x, y: bankContent.y + 8, w: bankContent.w, h: Math.max(1, bankContent.h - 8) }
    : null;
  const itemCenters = estimateItemCenters(imageData, centerSearchArea);
  const cell = getGridCellSize();
  const anchor = findFirstItemAnchor(itemCenters, cell);
  const x = bankContent ? bankContent.x : Math.max(0, Math.round(anchor.x - cell / 2 + getGridOffsetX()));
  const y = bankContent ? bankContent.y : Math.max(0, Math.round(anchor.y - cell / 2 + getGridOffsetY()));
  const content = bankContent
    ? { minX: bankContent.x, minY: bankContent.y, maxX: bankContent.x + bankContent.w - 1, maxY: bankContent.y + bankContent.h - 1 }
    : foregroundBounds(imageData);
  if (!bankContent) content.maxX = Math.min(content.maxX, bankContentRightLimit(imageData));

  const contentColumns = getGridColumns(Math.max(1, Math.ceil((content.maxX - x + 1) / cell)));
  const contentRows = getGridRows(Math.max(1, Math.ceil((content.maxY - y + 1) / cell)));
  const itemExtent = gridExtentFromItemCenters(itemCenters, x, y, cell);
  const last = itemExtent || lastOccupiedGridCell(imageData, x, y, cell, content);
  const columns = Math.max(1, contentColumns - (options.trimLastColumn ? 1 : 0));
  const rows = itemExtent ? Math.min(contentRows, Math.max(1, itemExtent.row + 1)) : contentRows;
  return {
    x,
    y,
    cell,
    columns,
    rows,
    maxX: content.maxX,
    maxY: content.maxY,
    lastOccupiedRow: last.row,
    lastOccupiedColumn: last.column,
    contentArea: bankContent,
    infinityArea: bankContent?.infinity || null
  };
}

function gridExtentFromItemCenters(centers, gridX, gridY, cell) {
  let last = null;
  for (const center of centers) {
    const column = Math.floor((center.x - gridX) / cell);
    const row = Math.floor((center.y - gridY) / cell);
    if (column < 0 || row < 0) continue;
    if (!last || row > last.row || (row === last.row && column > last.column)) last = { row, column };
  }
  return last;
}

function findBankContentArea(imageData) {
  const { width, height, data } = imageData;
  const framePixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (isFrameOrScrollbarPixel(data[offset], data[offset + 1], data[offset + 2])) framePixels[y * width + x] = 1;
    }
  }

  const horizontalRuns = [];
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) count += framePixels[y * width + x];
    if (count > width * 0.45) horizontalRuns.push(y);
  }

  const verticalRuns = [];
  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = 0; y < height; y += 1) count += framePixels[y * width + x];
    if (count > height * 0.45) verticalRuns.push(x);
  }

  const topCandidates = horizontalRuns.filter((y) => y > 20 && y < height * 0.35);
  const bottomCandidates = horizontalRuns.filter((y) => y > height * 0.45);
  const leftCandidates = verticalRuns.filter((x) => x < width * 0.2);
  const rightCandidates = verticalRuns.filter((x) => x > width * 0.75);

  const top = topCandidates.length ? Math.max(...topCandidates) + 1 : null;
  const bottom = bottomCandidates.length ? Math.max(...bottomCandidates.filter((y) => y < height - 20)) - 1 : null;
  const left = leftCandidates.length ? Math.min(...leftCandidates) + 1 : null;
  const right = rightCandidates.length ? Math.max(...rightCandidates.filter((x) => x < width - 4)) - 1 : null;
  const infinity = findInfinitySymbolBounds(imageData);

  if (infinity && bottom !== null && right !== null) {
    const anchoredLeft = findContentLeftFromInfinity(imageData, infinity) ?? Math.max(0, infinity.x - 10);
    const anchoredTop = findContentTopAfterInfinity(imageData, infinity) ?? infinity.y + infinity.h + 8;
    const anchoredRight = findContentRightBeforeScrollbar(imageData, anchoredTop, bottom) ?? right;
    if (bottom > anchoredTop && right > anchoredLeft) {
      return { x: anchoredLeft, y: anchoredTop, w: anchoredRight - anchoredLeft + 1, h: bottom - anchoredTop + 1, infinity };
    }
  }

  if (top === null || bottom === null || left === null || right === null || bottom <= top || right <= left) return null;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function findInfinitySymbolBounds(imageData) {
  const { width, height, data } = imageData;
  const maxX = Math.min(width - 1, 80);
  const maxY = Math.min(height - 1, 90);
  const minY = Math.min(maxY, 35);
  const mask = new Uint8Array(width * height);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const isInfinityPixel = r >= 90 && g >= 65 && b >= 30 && r > b + 25 && g > b + 8;
      if (isInfinityPixel) mask[y * width + x] = 1;
    }
  }

  return connectedComponents(dilate(mask, width, height, 1), width, height)
    .filter((box) => box.x >= 5 && box.x < 45 && box.y >= minY && box.w >= 16 && box.w <= 48 && box.h >= 10 && box.h <= 34)
    .sort((a, b) => infinitySymbolScore(b) - infinitySymbolScore(a))[0] || null;
}

function infinitySymbolScore(box) {
  const aspect = box.w / Math.max(1, box.h);
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - 1.9) / 1.9);
  const positionScore = 1 - Math.min(1, (Math.abs(box.x - 18) + Math.abs(box.y - 52)) / 80);
  return box.area + aspectScore * 120 + positionScore * 80;
}

function findContentTopAfterInfinity(imageData, infinity) {
  const { width, height, data } = imageData;
  const startY = Math.min(height - 1, infinity.y + infinity.h + 8);
  const endY = Math.min(height - 1, startY + 60);

  for (let y = startY; y <= endY; y += 1) {
    let contentPixels = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (isBankContentBackgroundPixel(data[offset], data[offset + 1], data[offset + 2])) contentPixels += 1;
    }
    if (contentPixels > width * 0.55) return y;
  }

  return null;
}

function findContentLeftFromInfinity(imageData, infinity) {
  return Math.max(0, infinity.x - 10);
}

function findContentRightBeforeScrollbar(imageData, top, bottom) {
  const { width, data } = imageData;
  const minY = Math.max(0, top);
  const maxY = Math.min(imageData.height - 1, bottom);
  let runEnd = null;

  for (let x = width - 1; x >= Math.floor(width * 0.75); x -= 1) {
    let scrollbarPixels = 0;
    for (let y = minY; y <= maxY; y += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (r > 145 && g > 100 && b > 45 && r > b + 45) scrollbarPixels += 1;
    }
    if (scrollbarPixels > (maxY - minY + 1) * 0.35) {
      if (runEnd === null) runEnd = x;
      continue;
    }
    if (runEnd !== null) return Math.max(0, x - 2);
  }

  return null;
}

function isBankContentBackgroundPixel(r, g, b) {
  return Math.abs(r - 48) <= 8 && Math.abs(g - 43) <= 8 && Math.abs(b - 38) <= 8;
}

function lastOccupiedGridCell(imageData, gridX, gridY, cell, content) {
  const maxColumns = Math.max(1, Math.ceil((content.maxX - gridX + 1) / cell));
  const maxRows = Math.max(1, Math.ceil((content.maxY - gridY + 1) / cell));
  let last = { row: 0, column: 0 };

  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < maxColumns; column += 1) {
      const x = gridX + column * cell;
      const y = gridY + row * cell;
      const w = Math.min(cell, imageData.width - x);
      const h = Math.min(cell, imageData.height - y);
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box)) last = { row, column };
    }
  }

  return last;
}

function getGridOffsetX() {
  return BANK_GRID_SHIFT_X;
}

function getGridOffsetY() {
  return BANK_GRID_SHIFT_Y;
}

function getGridCellSize() {
  return BANK_CELL_SIZE;
}

function getGridRows(autoRows) {
  return autoRows;
}

function getGridColumns(autoColumns) {
  return Math.max(1, autoColumns);
}

function findFirstItemAnchor(centers, cell) {
  if (!centers.length) return { x: cell / 2, y: cell / 2 };

  const sorted = [...centers].sort((a, b) => a.y - b.y || a.x - b.x);
  const firstRowY = sorted[0].y;
  const firstRow = sorted
    .filter((center) => Math.abs(center.y - firstRowY) < cell / 2)
    .sort((a, b) => a.x - b.x);

  return firstRow[0] || sorted[0];
}

function estimateItemCenters(imageData, bounds = null) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const minX = bounds?.x ?? 0;
  const minY = bounds?.y ?? 0;
  const maxX = bounds ? bounds.x + bounds.w - 1 : width - 1;
  const maxY = bounds ? bounds.y + bounds.h - 1 : height - 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      if (isGridItemPixel(data[offset], data[offset + 1], data[offset + 2])) mask[y * width + x] = 1;
    }
  }

  return connectedComponents(dilate(mask, width, height, 2), width, height)
    .filter((box) => box.area > 45 && box.w >= 6 && box.h >= 6 && box.w <= 38 && box.h <= 38)
    .map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function foregroundBounds(imageData) {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (!isGridItemPixel(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX > maxX || minY > maxY) {
    return { minX: 0, minY: 0, maxX: imageData.width - 1, maxY: imageData.height - 1 };
  }

  return { minX, minY, maxX, maxY };
}

function bankContentRightLimit(imageData) {
  for (let x = imageData.width - 1; x >= 0; x -= 1) {
    let borderPixels = 0;
    for (let y = 0; y < imageData.height; y += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (isFrameOrScrollbarPixel(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) {
        borderPixels += 1;
      }
    }
    if (borderPixels > imageData.height * 0.45) return Math.max(0, x - 1);
  }
  return imageData.width - 1;
}

function isGridItemPixel(r, g, b) {
  if (!isForeground(r, g, b)) return false;
  const isTitleText = r > 160 && g > 115 && b < 70;
  return !isTitleText && !isFrameOrScrollbarPixel(r, g, b);
}

function isScreenshotShapePixel(r, g, b) {
  if (isBankBackgroundPixel(r, g, b)) return false;
  if (isQuantityPixel(r, g, b)) return false;
  return true;
}

function isFrameOrScrollbarPixel(r, g, b) {
  const isFrameGold = r > 85 && g > 50 && g < 135 && b < 55;
  const isScrollbar = r > 145 && g > 100 && b > 45 && r > b + 45;
  const isBankLine = r > 55 && r < 120 && g > 40 && g < 95 && b < 55;
  return isFrameGold || isScrollbar || isBankLine;
}

function projectionRuns(imageData, axis, threshold) {
  const limit = axis === "x" ? imageData.width : imageData.height;
  const innerLimit = axis === "x" ? imageData.height : imageData.width;
  const active = [];

  for (let outer = 0; outer < limit; outer += 1) {
    let count = 0;
    for (let inner = 0; inner < innerLimit; inner += 1) {
      const x = axis === "x" ? outer : inner;
      const y = axis === "x" ? inner : outer;
      const offset = (y * imageData.width + x) * 4;
      if (isForeground(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) count += 1;
    }
    if (count > threshold) active.push(outer);
  }

  const runs = [];
  let start = null;
  let previous = null;

  for (const value of active) {
    if (start === null) {
      start = value;
      previous = value;
      continue;
    }
    if (value > previous + 1) {
      runs.push({ start, end: previous });
      start = value;
    }
    previous = value;
  }
  if (start !== null) runs.push({ start, end: previous });
  return runs.filter((run) => run.end - run.start >= 6);
}

function medianPitch(centers) {
  const deltas = [];
  for (let index = 1; index < centers.length; index += 1) {
    const delta = centers[index] - centers[index - 1];
    if (delta >= 32 && delta <= 58) deltas.push(delta);
  }
  if (!deltas.length) return null;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

function snapGridStart(value) {
  return Math.abs(value) <= 4 ? 0 : Math.max(0, value);
}

function countCellForeground(imageData, x, y, w, h) {
  let count = 0;
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const offset = (py * imageData.width + px) * 4;
      if (isForeground(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) count += 1;
    }
  }
  return count;
}

function isOccupiedCell(imageData, box) {
  let itemPixels = 0;
  let borderPixels = 0;

  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      if (isGridItemPixel(r, g, b)) itemPixels += 1;
      if (isFrameOrScrollbarPixel(r, g, b)) borderPixels += 1;
    }
  }

  if (itemPixels < 70) return false;
  return borderPixels < itemPixels * 1.3;
}

function isForeground(r, g, b) {
  const bgDistance = Math.abs(r - 48) + Math.abs(g - 43) + Math.abs(b - 38);
  const tooDark = r < 24 && g < 24 && b < 24;
  return bgDistance > 28 && !tooDark;
}

function isBankBackgroundPixel(r, g, b) {
  return r === 48 && g === 43 && b === 38;
}

function dilate(mask, width, height, radius) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
}

function connectedComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const boxes = [];
  const queue = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    for (let qi = 0; qi < queue.length; qi += 1) {
      const current = queue[qi];
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      area += 1;

      const neighbors = [current - 1, current + 1, current - width, current + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % width;
        if (Math.abs(nx - x) > 1) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }

    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }

  return boxes;
}

function mergeCloseBoxes(boxes, width, height) {
  const merged = [];
  for (const box of boxes) {
    const target = merged.find((candidate) => boxesAreClose(candidate, box));
    if (target) {
      const minX = Math.min(target.x, box.x);
      const minY = Math.min(target.y, box.y);
      const maxX = Math.max(target.x + target.w, box.x + box.w);
      const maxY = Math.max(target.y + target.h, box.y + box.h);
      target.x = minX;
      target.y = minY;
      target.w = Math.min(maxX - minX, width - minX);
      target.h = Math.min(maxY - minY, height - minY);
      target.area += box.area;
    } else {
      merged.push({ ...box });
    }
  }
  return merged.map((box) => expandBox(box, 2, width, height));
}

function boxesAreClose(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.abs(ax - bx) < 28 && Math.abs(ay - by) < 28;
}

function expandBox(box, padding, width, height) {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(width, box.x + box.w + padding);
  const bottom = Math.min(height, box.y + box.h + padding);
  return { x, y, w: right - x, h: bottom - y, area: box.area };
}

function attachQuantityDebugSource(debug, imageData) {
  if (!debug) return debug;
  return {
    ...debug,
    source: copyImageData(imageData, debug.scanBox)
  };
}

function renderDetections() {
  if (!detections.length) {
    if (resultsState.activeTab === "damaged") drawEmptyState("No occupied artefact slots detected.");
    updateTotals();
    renderRestorationPlan([]);
    renderResultsTabContent();
    return;
  }

  updateFilterOptions();
  const visibleDetections = filteredDetections();
  if (resultsState.activeTab === "damaged") {
    renderDamagedTable(visibleDetections);
  }

  updateTotals();
  renderRestorationPlan(visibleDetections);
  renderResultsTabContent();
}

function makeDetectionTableRow(detection) {
  return makeDetectionTableRowElement({
    detection,
    quantityNeedsReview,
    quantityCandidatesAreClose,
    applyQuantityChange,
    onQuantityChanged: (quantityCell) => {
      markQuantityManual(quantityCell);
      updateTotals();
    },
    onVerifyDetection: verifyDetection,
    makeReferenceCorrectionDropdown,
    makeRecognitionInfo,
    makeQuantityDebugView
  });
}

function makeStatusPill(detection, quantityWarning = quantityNeedsReview(detection)) {
  return makeDetectionStatusPill(detection, quantityWarning);
}

function filteredDetections() {
  return filterAndSortDetections(detections, viewMode.value, {
    query: artefactSearch.value,
    culture: cultureFilter.value,
    reviewOnly: reviewOnly.checked,
    quantityNeedsReview
  });
}

function setActiveResultsTab(tab) {
  detections = resultsState.setActiveTab(tab);
  applyResultTabSelection({ tab, title: resultsTitle, buttons: resultTabButtons, panels: resultTabPanels });

  if (tab === "damaged") renderDamagedTable(filteredDetections());
  updateTotals();
  renderResultsTabContent();
  requestTabScreenshot(tab);
}

function renderResultsTabContent() {
  const items = filteredDetections();
  if (resultsState.activeTab === "overview") renderOverviewTab(items);
  if (resultsState.activeTab === "restored") renderRestoredTab(items);
  if (resultsState.activeTab === "storage") renderStorageTab(items);
  if (resultsState.activeTab === "materials") renderMaterialsTab(items);
}

function renderDamagedTable(items) {
  renderDamagedTabPanel({
    body: resultsBody,
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow,
    drawEmptyState
  });
}

function requestTabScreenshot(tab) {
  if (!resultsState.shouldRequestScreenshot(tab)) return;
  if (tab === "restored") {
    loadImageFromUrl(DEFAULT_SCREENSHOTS.restored);
    return;
  }
  imageInput.click();
}

function renderOverviewTab(items) {
  renderOverviewTabPanel({
    panel: overviewPanel,
    allDetections: detections,
    visibleDetections: items,
    quantityNeedsReview,
    makeEmptyMessage,
    makeOverviewCard,
    makePlanTable,
    makeCollectionOverview
  });
}

function renderRestoredTab(items) {
  renderRestoredTabPanel({
    body: restoredResultsBody,
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow
  });
}

function renderMaterialsTab(items) {
  renderMaterialsTabPanel({
    panel: materialsPanel,
    allDetections: detections,
    visibleDetections: items,
    recipeRecordCount: archaeologyReference.artefactRecipes?.length || 0,
    calculateMaterialTotals: (detections) => calculateMaterialTotalsForRecipes(detections, recipeByRestoredName),
    aggregateRestoredArtefacts: (detections) => aggregateRestoredArtefactsForDetections(detections, quantityNeedsReview),
    sortMaterialRows,
    makeMaterialCell,
    makeTextCell,
    makeTableHead,
    makeEmptyMessage,
    makeOverviewCard
  });
}

function renderStorageTab(items) {
  renderStorageTabPanel({
    panel: storagePanel,
    visibleDetections: items,
    materials: archaeologyReference.materials || [],
    calculateMaterialTotals: (detections) => calculateMaterialTotalsForRecipes(detections, recipeByRestoredName),
    makeMaterialCell,
    makeLinkedTextCell,
    makeTableHead,
    makeEmptyMessage,
    makeOverviewCard
  });
}

function updateFilterOptions() {
  const current = cultureFilter.value;
  const cultures = [...new Set(detections.map((detection) => detection.culture).filter(Boolean))].sort();
  cultureFilter.replaceChildren(new Option("All cultures", ""));
  for (const culture of cultures) cultureFilter.append(new Option(culture, culture));
  if (cultures.includes(current)) cultureFilter.value = current;
}

function renderRestorationPlan(items) {
  renderRestorationPlanPanel({
    body: planBody,
    visibleCountElement: visibleCountEl,
    reviewCountElement: reviewCountEl,
    highestLevelElement: highestLevelEl,
    allDetections: detections,
    visibleDetections: items,
    quantityNeedsReview
  });
}

function makeMaterialCell(row) {
  return makeMaterialCellElement(row, materialByName);
}

function sortRestoredRows(rows) {
  return sortRestoredRowsForMode(rows, viewMode.value);
}

function sortMaterialRows(rows) {
  return sortMaterialRowsForMode(rows, viewMode.value);
}

function makeCollectionOverview(items) {
  return makeCollectionOverviewElement({
    items,
    collections: archaeologyReference.collections || [],
    references,
    collectionSort,
    onSortChange: (sort) => {
      collectionSort = sort;
      renderResultsTabContent();
    },
    makeEmptyMessage,
    makeLinkedTextCell,
    makeTextCell
  });
}

function rowReviewClass(detection, quantityWarning = quantityNeedsReview(detection)) {
  return detectionRowReviewClass(detection, quantityWarning);
}

function quantityNeedsReview(detection) {
  return !detection.quantityManual && quantityCandidatesAreClose(detection);
}

function applyQuantityChange(detection, quantity, source) {
  applyQuantityCorrection(detection, quantity, source);
}

function makeQuantityDebugView(detection) {
  return makeQuantityDebugViewElement(detection.quantityDebug);
}

function markQuantityManual(quantityCell) {
  const input = quantityCell.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input");
  const row = quantityCell.closest("tr");
  const detection = detections.find((item) => item.rowElements?.quantityCell === quantityCell);
  if (row && detection) row.className = rowReviewClass(detection);
  if (detection?.rowElements?.statusCell) detection.rowElements.statusCell.replaceChildren(makeStatusPill(detection));
  if (detections.length) renderRestorationPlan(filteredDetections());
}

function makeRecognitionInfo(detection) {
  return makeRecognitionInfoElement(detection);
}

function makeReferenceCorrectionDropdown(detection) {
  return makeReferenceCorrectionDropdownElement({
    detection,
    references,
    applyReferenceCorrection
  });
}

function applyReferenceCorrection(detection, item, score) {
  applyReferenceCorrectionRule(detection, item, score);
  detection.referencePreview = makeReferenceCanvas(item.image);
  updateDetectionRow(detection);
  updateTotals();
}

function verifyDetection(detection) {
  if (!applyDetectionVerification(detection, AMBIGUOUS_FINAL_MARGIN)) return;
  updateDetectionRow(detection);
  updateTotals();
}

function updateDetectionRow(detection) {
  if (
    updateDetectionRowElement({
      detection,
      rowReviewClass,
      makeReferenceCorrectionDropdown,
      makeRecognitionInfo,
      makeStatusPill
    })
  ) {
    renderRestorationPlan(filteredDetections());
  }
}

function drawEmptyState(message) {
  resultsBody.replaceChildren();
  drawTableEmptyState(resultsBody, message);
  renderResultsTabContent();
}

function updateTotals() {
  renderSummaryTotals({
    detections,
    slotCountElement: slotCountEl,
    quantityTotalElement: quantityTotalEl,
    manualCountElement: manualCountEl
  });
  if (detections.length) renderRestorationPlan(filteredDetections());
  renderResultsTabContent();
}

function exportResults() {
  const exportedAt = new Date().toISOString();
  const payload = createAnalysisExportPayload({
    exportedAt,
    image: loadedImage
      ? {
          width: loadedImage.naturalWidth,
          height: loadedImage.naturalHeight,
          source: loadedImage.currentSrc || loadedImage.src
        }
      : null,
    grid: {
      offsetX: getGridOffsetX(),
      offsetY: getGridOffsetY(),
      cellSize: getGridCellSize(),
      rows: null,
      columns: null
    },
    detections
  });

  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rs3-archaeology-analysis-${exportedAt.replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function drawBoxes(items, contentArea = null, infinityArea = null) {
  drawAnalysisOverlay({ context: ctx, image: loadedImage, items, contentArea, infinityArea });
}
