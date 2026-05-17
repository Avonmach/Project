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
import {
  compareFingerprints,
  fingerprintColorCrop,
  fingerprintCrop,
  fingerprintReference,
  histogramChiAltSimilarity,
  removeBackground,
  toScreenshotFingerprint,
  topLeftPixelColor
} from "./domain/artefacts/fingerprint";
import { detectQuantity, quantityCandidatesAreClose } from "./domain/ocr/quantity-ocr";
import { normalizeName } from "./domain/shared/format";
import { loadImageElement } from "./infrastructure/browser/image-loader";
import {
  emptyArchaeologyReferenceData,
  loadArchaeologyReferenceData,
  loadDamagedArtifactRecords
} from "./infrastructure/data/reference-data";
import {
  detectItemBoxes,
  estimateBankGrid,
  getGridCellSize,
  getGridOffsetX,
  getGridOffsetY,
} from "./infrastructure/image-processing/bank-grid";
import { copyImageData } from "./infrastructure/image-processing/image-data";
import { makeFullShapeImageData } from "./infrastructure/image-processing/shape-mask";
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
      bankRow: Math.floor(box.y / getGridCellSize()) + 1,
      bankColumn: Math.floor(box.x / getGridCellSize()) + 1,
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
