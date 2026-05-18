// @ts-nocheck
import {
  FALLBACK_DIGIT_TEMPLATES,
  buildDigitTemplatesFromFont
} from "./domain/ocr/digit-templates";
import { createDetectionRecord } from "./application/analyze-screenshot/detection-record";
import {
  aggregateRestoredArtefacts as aggregateRestoredArtefactsForDetections,
  calculateMaterialTotals as calculateMaterialTotalsForRecipes
} from "./application/calculate-materials/material-totals";
import { applyCandidatePrediction as applyCandidatePredictionRule } from "./application/correct-detection/candidate-prediction";
import { applyQuantityChange as applyQuantityCorrection } from "./application/correct-detection/quantity-correction";
import { applyReferenceCorrection as applyReferenceCorrectionRule } from "./application/correct-detection/reference-correction";
import { findUniqueArtefactAssignments } from "./application/correct-detection/unique-artefact-assignments";
import { verifyDetection as applyDetectionVerification } from "./application/correct-detection/verification";
import { createAnalysisExportPayload } from "./application/export-analysis/analysis-export";
import { filterAndSortDetections } from "./application/filter-detections/detection-filters";
import { prepareArtefactReferences } from "./application/load-references/artefact-reference-preparation";
import {
  sortMaterialRows as sortMaterialRowsForMode,
  sortRestoredRows as sortRestoredRowsForMode
} from "./application/sort-results/result-row-sorting";
import { matchArtifact as matchArtefactAgainstReferences } from "./domain/artefacts/matching";
import { detectQuantity, quantityCandidatesAreClose } from "./domain/ocr/quantity-ocr";
import { normalizeName } from "./domain/shared/format";
import { loadImageElement, loadImageToCanvas, readImageFileAsDataUrl } from "./infrastructure/browser/image-loader";
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

const AMBIGUOUS_FINAL_MARGIN = 0.025;
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
imageInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await loadImageFromUrl(await readImageFileAsDataUrl(file));
  } catch (error) {
    console.warn("Could not read the selected screenshot.", error);
    drawEmptyState("Could not load the screenshot.");
  }
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
  references = await prepareArtefactReferences(items, loadImageElement);
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

async function loadImageFromUrl(src) {
  try {
    loadedImage = await loadImageToCanvas(src, canvas, ctx);
  } catch (error) {
    console.warn("Could not load the screenshot.", error);
    drawEmptyState("Could not load the screenshot.");
  }
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

    return createDetectionRecord({
      box,
      bankIndex: index,
      cellSize: getGridCellSize(),
      match,
      quantityResult,
      quantityDebug: attachQuantityDebugSource(quantityResult.debug, imageData),
      recognitionMode,
      previews: { preview, processedPreview, referencePreview }
    });
  });

  detections = resultsState.setDetectionsForMode(recognitionMode, analyzedDetections);
  applyUniqueArtefactAssignments(detections);
  renderDetections();
  drawBoxes(detections, grid.contentArea, grid.infinityArea);
}

function matchArtifact(shapeImageData, originalImageData, box, mode = "damaged") {
  return matchArtefactAgainstReferences(shapeImageData, originalImageData, box, references, mode);
}

function applyUniqueArtefactAssignments(items) {
  for (const { detection, candidate } of findUniqueArtefactAssignments(items)) {
    applyCandidatePrediction(detection, candidate);
  }
}

function applyCandidatePrediction(detection, candidate) {
  applyCandidatePredictionRule(detection, candidate, AMBIGUOUS_FINAL_MARGIN);
  detection.referencePreview = makeReferenceCanvas(candidate.item.image);
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
