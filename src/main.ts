import { FALLBACK_DIGIT_TEMPLATES } from "./domain/ocr/digit-templates";
import { analyzeScreenshot } from "./application/analyze-screenshot/analyze-screenshot";
import {
  analyzeStorageScreenshots as analyzeStorageScreenshotsForGrid,
  type StorageGridDetection
} from "./application/analyze-storage/analyze-storage-screenshots";
import type { StorageRecognitionFrame } from "./application/analyze-storage/storage-recognition-ports";
import { attachQuantityDebugSource } from "./infrastructure/image-processing/quantity-debug-source";
import { recognitionModeForTab } from "./application/analyze-screenshot/recognition-mode";
import { DEFAULT_SCREENSHOTS } from "./application/config/default-screenshots";
import { AMBIGUOUS_FINAL_MARGIN } from "./application/config/matching-thresholds";
import { STATUS_MESSAGES } from "./application/config/status-messages";
import {
  aggregateRestoredArtefacts as aggregateRestoredArtefactsForDetections,
  calculateMaterialTotals as calculateMaterialTotalsForRecipes,
  calculateOtherItemTotals as calculateOtherItemTotalsForRecipes,
  type MaterialRecipe
} from "./application/calculate-materials/material-totals";
import { applyCandidatePrediction as applyCandidatePredictionRule } from "./application/correct-detection/candidate-prediction";
import { applyQuantityChange as applyQuantityCorrection } from "./application/correct-detection/quantity-correction";
import { applyReferenceCorrection as applyReferenceCorrectionRule } from "./application/correct-detection/reference-correction";
import { findUniqueArtefactAssignments } from "./application/correct-detection/unique-artefact-assignments";
import { verifyDetection as applyDetectionVerification } from "./application/correct-detection/verification";
import { filterAndSortDetections } from "./application/filter-detections/detection-filters";
import {
  createArchaeologyReferenceIndexes,
  emptyArchaeologyReferenceIndexes
} from "./application/load-references/archaeology-reference-indexes";
import { prepareArtefactReferences } from "./application/load-references/artefact-reference-preparation";
import {
  prepareMaterialReferences,
  type PreparedMaterialReference
} from "./application/load-references/material-reference-preparation";
import { sortMaterialRows as sortMaterialRowsForMode } from "./application/sort-results/result-row-sorting";
import { matchArtifact as matchArtefactAgainstReferences, type RecognitionMode } from "./domain/artefacts/matching";
import { quantityCandidatesAreClose } from "./domain/ocr/quantity-ocr";
import { normalizeName } from "./domain/shared/format";
import type { BoundingBox } from "./domain/shared/geometry";
import { exportAnalysisResults } from "./infrastructure/browser/analysis-export";
import { connectAppEvents } from "./infrastructure/browser/app-events";
import { getAppElements } from "./infrastructure/browser/app-elements";
import { loadQuantityFontTemplates as loadQuantityFontTemplatesFromBrowser } from "./infrastructure/browser/font-templates";
import { loadImageElement, loadImageToCanvas } from "./infrastructure/browser/image-loader";
import { loadSelectedScreenshotInput } from "./infrastructure/browser/selected-screenshot-input";
import {
  emptyArchaeologyReferenceData,
  loadArchaeologyReferenceData,
  loadDamagedArtifactRecords,
  type ArchaeologyReferenceData
} from "./infrastructure/data/reference-data";
import {
  getGridCellSize,
} from "./infrastructure/image-processing/bank-grid";
import { createCanvasFrameSource } from "./infrastructure/image-processing/canvas-frame-source";
import { createCanvasStorageFrameSource } from "./infrastructure/image-processing/canvas-storage-frame-source";
import { createReferenceMaterialMatcher } from "./infrastructure/image-processing/material-recognition-adapters";
import { calculateStoragePreviewLayout } from "./infrastructure/image-processing/storage-preview-layout";
import {
  createCanvasDetectionPreviewFactory,
  createQuantityDebugSource,
  createReferenceArtefactMatcher
} from "./infrastructure/image-processing/current-recognition-adapters";
import {
  applyResultTabSelection,
  screenshotTabForResultsTab,
  type ScreenshotTab,
  type ResultsTab
} from "./presentation/tabs/results-tabs";
import { createResultsState } from "./presentation/state/results-state";
import type { AppDetection, AppMatchCandidate } from "./presentation/state/app-detection";
import type { StorageDetection } from "./presentation/state/storage-detection";
import { updateCultureFilterOptions as updateCultureFilterOptionsElement } from "./presentation/filters/culture-options";
import { renderOverviewTab as renderOverviewTabPanel } from "./presentation/renderers/overview-tab";
import { drawTableEmptyState, renderRestoredTab as renderRestoredTabPanel } from "./presentation/renderers/restored-tab";
import { renderMaterialsTab as renderMaterialsTabPanel } from "./presentation/renderers/materials-tab";
import {
  renderStorageTab as renderStorageTabPanel,
  type DetectedStorageMaterial
} from "./presentation/renderers/storage-tab";
import { renderDamagedTab as renderDamagedTabPanel } from "./presentation/renderers/damaged-tab";
import {
  makeCollectionOverview as makeCollectionOverviewElement,
  type CollectionSort
} from "./presentation/renderers/collection-overview";
import { renderPlanningTab as renderPlanningTabPanel } from "./presentation/renderers/planning-tab";
import { renderRestorationPlan as renderRestorationPlanPanel } from "./presentation/renderers/restoration-plan";
import { makeRecognitionInfo as makeRecognitionInfoElement } from "./presentation/renderers/recognition-info";
import {
  makeMaterialCell as makeMaterialCellElement,
  type MaterialCellReference,
  type MaterialCellRow
} from "./presentation/renderers/material-cell";
import type { MaterialRow } from "./presentation/renderers/materials-tab";
import { drawAnalysisOverlay, drawAnalysisOverlayMarkers, type OverlayFrame } from "./presentation/renderers/analysis-overlay";
import { updateDetectionRow as updateDetectionRowElement } from "./presentation/renderers/detection-row-update";
import { makePreviewCanvas, makeReferenceCanvas, makeStorageProcessedCanvas } from "./presentation/renderers/preview-canvases";
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

import type { PreparedArtefactReference } from "./application/load-references/artefact-reference-preparation";

const STORAGE_REQUIRED_SCREENSHOTS = 2;

const elements = getAppElements();
const {
  imagePanel,
  screenshotTitle,
  canvas,
  ctx,
  imageInput,
  loadDefaultButton,
  analyzeButton,
  viewMode,
  exportResultsButton,
  resultsBody,
  restoredResultsBody,
  visibleCountEl,
  reviewCountEl,
  highestLevelEl,
  planBody,
  artefactSearch,
  cultureFilter,
  reviewOnly,
  resultsTitle,
  resultTabButtons,
  resultTabPanels,
  overviewPanel,
  planningPanel,
  damagedDetectedCount,
  damagedVisibleCount,
  damagedReviewCount,
  restoredDetectedCount,
  restoredVisibleCount,
  restoredReviewCount,
  storagePanel,
  materialsPanel
} = elements;

let loadedImage: HTMLImageElement | null = null;
const loadedImagesByTab: Record<ScreenshotTab, HTMLImageElement | null> = {
  damaged: null,
  restored: null,
  storage: null
};
const exampleImagesByTab: Record<ScreenshotTab, boolean> = {
  damaged: false,
  restored: false,
  storage: false
};
let storageImages: HTMLImageElement[] = [];
let storageAnalysisDone = false;
let storageGridDetections: StorageGridDetection[] = [];
let storageRecognitionFrames: StorageRecognitionFrame[] = [];
let storageDetections: StorageDetection[] = [];
let detectedStorageMaterials: DetectedStorageMaterial[] = [];
let storedOtherItems = new Map<string, number>();
let checkedMaterialRows = new Set<string>();
let detections: AppDetection[] = [];
let references: PreparedArtefactReference[] = [];
let materialReferences: PreparedMaterialReference[] = [];
let archaeologyReference: ArchaeologyReferenceData = emptyArchaeologyReferenceData();
let { recipeByRestoredName, materialByName } = emptyArchaeologyReferenceIndexes();
const resultsState = createResultsState<AppDetection>();
let collectionSort: CollectionSort = { key: "progress", direction: "desc" };
let selectedCollections = new Set<string>();
let selectedCollectionCounts = new Map<string, number>();

let digitTemplates = FALLBACK_DIGIT_TEMPLATES;

const browserActions = connectAppEvents(elements, {
  analyzeCurrentImage,
  renderDetections,
  setActiveResultsTab,
  exportResults,
  handleSelectedImageInput: () =>
    loadSelectedScreenshotInput({ imageInput, loadImageFromUrl, loadImagesFromUrls: loadSelectedImagesFromUrls, drawEmptyState })
});

initialize();

async function initialize() {
  analyzeButton.disabled = true;
  drawEmptyState(STATUS_MESSAGES.loadingReferences);
  updateScreenshotPanel();
  digitTemplates = await loadQuantityFontTemplatesFromBrowser();
  await loadReferences();
  await loadArchaeologyReference();
  await loadImageFromUrl(DEFAULT_SCREENSHOTS.damaged, "damaged", { example: true });
  await loadStorageImagesFromUrls(DEFAULT_SCREENSHOTS.storage);
  analyzeButton.disabled = false;
  drawEmptyState(STATUS_MESSAGES.readyToAnalyze);
}

async function loadReferences() {
  const items = await loadDamagedArtifactRecords();
  references = await prepareArtefactReferences(items, loadImageElement);
}

async function loadArchaeologyReference() {
  try {
    archaeologyReference = await loadArchaeologyReferenceData();
    ({ recipeByRestoredName, materialByName } = createArchaeologyReferenceIndexes(archaeologyReference));
    materialReferences = await prepareMaterialReferences(archaeologyReference.materials || [], loadImageElement);
  } catch (error) {
    console.warn(STATUS_MESSAGES.referenceLoadWarning, error);
    archaeologyReference = emptyArchaeologyReferenceData();
    ({ recipeByRestoredName, materialByName } = emptyArchaeologyReferenceIndexes());
    materialReferences = [];
  }
}

async function loadImageFromUrl(
  src: string,
  tab: ScreenshotTab = currentScreenshotTab() || "damaged",
  options: { readonly example?: boolean } = {}
) {
  if (tab === "storage") {
    await loadStorageImagesFromUrls([src]);
    return;
  }
  try {
    loadedImagesByTab[tab] = await loadImageToCanvas(src, canvas, ctx);
    exampleImagesByTab[tab] = Boolean(options.example);
    canvas.classList.remove("is-empty");
    if (currentScreenshotTab() === tab) {
      loadedImage = loadedImagesByTab[tab];
      updateScreenshotTitle(tab);
    } else {
      restoreActiveScreenshotToCanvas();
    }
  } catch (error) {
    console.warn(STATUS_MESSAGES.screenshotLoadWarning, error);
    drawEmptyState(STATUS_MESSAGES.screenshotLoadFailed);
  }
}

async function loadSelectedImagesFromUrls(srcs: readonly string[]): Promise<void> {
  const tab = currentScreenshotTab() || "damaged";
  if (tab === "storage") {
    await loadStorageImagesFromUrls(srcs);
    return;
  }
  const first = srcs[0];
  if (first) await loadImageFromUrl(first, tab);
}

async function loadStorageImagesFromUrls(srcs: readonly string[]): Promise<void> {
  try {
    const loadedStorageImages = await Promise.all(srcs.map((src) => loadImageElement(src)));
    const existingStorageImage = storageImages[0];
    const newStorageImage = loadedStorageImages[0];
    if (srcs.length === 1 && existingStorageImage && newStorageImage) {
      storageImages = [existingStorageImage, newStorageImage];
    } else {
      storageImages = loadedStorageImages.slice(0, STORAGE_REQUIRED_SCREENSHOTS);
    }
    loadedImagesByTab.storage = storageImages[0] ?? null;
    storageAnalysisDone = false;
    storageGridDetections = [];
    storageRecognitionFrames = [];
    storageDetections = [];
    detectedStorageMaterials = [];
    if (currentScreenshotTab() === "storage") restoreActiveScreenshotToCanvas();
    renderResultsTabContent();
  } catch (error) {
    console.warn(STATUS_MESSAGES.screenshotLoadWarning, error);
    drawEmptyState(STATUS_MESSAGES.screenshotLoadFailed);
  }
}

function analyzeCurrentImage() {
  if (resultsState.activeTab === "storage") {
    analyzeStorageScreenshots();
    return;
  }
  if (!loadedImage || !references.length) return;

  const image = loadedImage;
  const recognitionMode = recognitionModeForTab(resultsState.activeTab);
  const analysis = analyzeScreenshot({
    frameSource: createCanvasFrameSource({ image, canvas, context: ctx }),
    cellSize: getGridCellSize(),
    recognitionMode,
    digitTemplates,
    artefactMatcher: createReferenceArtefactMatcher(matchArtifact),
    quantityDebugSource: createQuantityDebugSource(),
    previewFactory: createCanvasDetectionPreviewFactory<PreparedArtefactReference>()
  });

  detections = resultsState.setDetectionsForMode(recognitionMode, analysis.detections);
  applyUniqueArtefactAssignments(detections);
  renderDetections();
  drawBoxes(detections, analysis.frame.contentArea, analysis.frame.infinityArea);
}

function analyzeStorageScreenshots(): void {
  if (!storageImages.length) {
    storageAnalysisDone = false;
    storageGridDetections = [];
    storageRecognitionFrames = [];
    storageDetections = [];
    detectedStorageMaterials = [];
    renderResultsTabContent();
    return;
  }
  const analysis = analyzeStorageScreenshotsForGrid({
    frameSource: createCanvasStorageFrameSource({ images: storageImages, canvas, context: ctx }),
    digitTemplates,
    materialMatcher: materialReferences.length ? createReferenceMaterialMatcher(materialReferences) : undefined
  });
  storageAnalysisDone = true;
  storageGridDetections = [...analysis.detections];
  storageRecognitionFrames = [...analysis.frames];
  storageDetections = makeStorageDetections(analysis.detections, analysis.frames);
  detectedStorageMaterials = mergeStorageMaterials(storageDetections);
  drawStorageAnalysisOverlay();
  renderResultsTabContent();
}

function matchArtifact(
  shapeImageData: ImageData,
  originalImageData: ImageData,
  box: BoundingBox,
  mode: RecognitionMode = "damaged"
) {
  return matchArtefactAgainstReferences(shapeImageData, originalImageData, box, references, mode);
}

function applyUniqueArtefactAssignments(items: readonly AppDetection[]): void {
  for (const { detection, candidate } of findUniqueArtefactAssignments(items)) {
    applyCandidatePrediction(detection, candidate);
  }
}

function applyCandidatePrediction(detection: AppDetection, candidate: AppMatchCandidate): void {
  applyCandidatePredictionRule(detection, candidate);
  detection.referencePreview = makeReferenceCanvas(candidate.item.image);
}

function renderDetections(): void {
  preserveScrollPosition(() => {
    if (!detections.length) {
      if (resultsState.activeTab === "damaged") drawEmptyState(STATUS_MESSAGES.noDamagedSlotsDetected);
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
  });
}

function makeDetectionTableRow(detection: AppDetection): HTMLTableRowElement {
  return makeDetectionTableRowElement({
    detection,
    quantityNeedsReview,
    quantityCandidatesAreClose: quantityCandidatesAreCloseForDetection,
    applyQuantityChange,
    onQuantityChanged: (quantityCell) => {
      markQuantityManual(quantityCell);
      updateTotals();
    },
    onVerifyDetection: verifyDetection,
    onRemoveDetection: removeDetection,
    makeReferenceCorrectionDropdown,
    makeRecognitionInfo,
    makeQuantityDebugView
  });
}

function makeStatusPill(detection: AppDetection, quantityWarning = quantityNeedsReview(detection)): HTMLSpanElement {
  return makeDetectionStatusPill(detection, quantityWarning);
}

function filteredDetections(): AppDetection[] {
  return filterDetectionsForItems(detections);
}

function filteredDetectionsForMode(mode: "damaged" | "restored"): AppDetection[] {
  return filterDetectionsForItems(resultsState.detectionsForMode(mode));
}

function filterDetectionsForItems(items: readonly AppDetection[]): AppDetection[] {
  return filterAndSortDetections(items, viewMode.value, {
    query: artefactSearch.value,
    culture: cultureFilter.value,
    reviewOnly: reviewOnly.checked,
    quantityNeedsReview
  });
}

function setActiveResultsTab(tab: ResultsTab): void {
  preserveScrollPosition(() => {
    detections = resultsState.setActiveTab(tab);
    applyResultTabSelection({ tab, title: resultsTitle, buttons: resultTabButtons, panels: resultTabPanels });
    updateScreenshotPanel();

    if (tab === "damaged") renderDamagedTable(filteredDetections());
    updateTotals();
    renderResultsTabContent();
    requestTabScreenshot(tab);
  });
}

function renderResultsTabContent(): void {
  const items = filteredDetections();
  if (resultsState.activeTab === "overview") renderOverviewTab(items);
  if (resultsState.activeTab === "planning") renderPlanningTab();
  if (resultsState.activeTab === "restored") renderRestoredTab(items);
  if (resultsState.activeTab === "storage") renderStorageTab(items);
  if (resultsState.activeTab === "materials") renderMaterialsTab(items);
}

function renderDamagedTable(items: readonly AppDetection[]): void {
  renderDamagedTabPanel({
    body: resultsBody,
    detectedCountElement: damagedDetectedCount,
    visibleCountElement: damagedVisibleCount,
    reviewCountElement: damagedReviewCount,
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow,
    quantityNeedsReview
  });
}

function requestTabScreenshot(tab: ResultsTab): void {
  if (!resultsState.shouldRequestScreenshot(tab)) return;
  if (tab === "restored") {
    void loadImageFromUrl(DEFAULT_SCREENSHOTS.restored, "restored");
    return;
  }
  browserActions.requestScreenshotFile();
}

function currentScreenshotTab(): ScreenshotTab | null {
  return screenshotTabForResultsTab(resultsState.activeTab);
}

function updateScreenshotPanel(): void {
  const tab = currentScreenshotTab();
  imagePanel.hidden = !tab;
  if (!tab) {
    loadedImage = null;
    return;
  }

  updateScreenshotTitle(tab);
  imageInput.multiple = tab === "storage";
  restoreActiveScreenshotToCanvas();
}

function updateScreenshotTitle(tab: ScreenshotTab): void {
  const title = {
    damaged: "Damaged artefact screenshot",
    restored: "Restored artefact screenshot",
    storage: "Storage screenshots"
  }[tab];
  screenshotTitle.textContent = exampleImagesByTab[tab] ? `${title} (Example)` : title;
}

function restoreActiveScreenshotToCanvas(): void {
  const tab = currentScreenshotTab();
  if (tab === "storage") {
    if (storageAnalysisDone) {
      drawStorageAnalysisOverlay();
    } else {
      drawStoragePreview();
    }
    return;
  }
  loadedImage = tab ? loadedImagesByTab[tab] : null;
  if (!tab || !loadedImage) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add("is-empty");
    return;
  }
  canvas.classList.remove("is-empty");
  canvas.width = loadedImage.naturalWidth;
  canvas.height = loadedImage.naturalHeight;
  ctx.drawImage(loadedImage, 0, 0);
}

function drawStoragePreview(): void {
  loadedImage = storageImages[0] ?? null;
  if (!storageImages.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add("is-empty");
    return;
  }

  const gap = 12;
  const { width, height, placements } = calculateStoragePreviewLayout(storageImages, gap);
  canvas.width = width;
  canvas.height = height;
  canvas.classList.remove("is-empty");
  ctx.fillStyle = "#221f1c";
  ctx.fillRect(0, 0, width, height);
  for (const { image, x, y } of placements) ctx.drawImage(image, x, y);
}

function drawStorageAnalysisOverlay(): void {
  drawStoragePreview();
  if (!storageGridDetections.length && !storageRecognitionFrames.length) return;

  const gap = 12;
  const { placements } = calculateStoragePreviewLayout(storageImages, gap);
  const translatedDetections = storageGridDetections.flatMap((detection) => {
    const placement = placements[detection.screenshotIndex];
    return placement ? [{ ...detection, box: translateBox(detection.box, placement.x, placement.y) }] : [];
  });
  const translatedFrames: OverlayFrame[] = storageRecognitionFrames.flatMap((frame, screenshotIndex) => {
    const placement = placements[screenshotIndex];
    if (!placement) return [];
    return [
      {
        contentArea: frame.contentArea ? translateBox(frame.contentArea, placement.x, placement.y) : null,
        infinityArea: frame.infinityArea ? translateBox(frame.infinityArea, placement.x, placement.y) : null
      }
    ];
  });

  drawAnalysisOverlayMarkers({
    context: ctx,
    items: translatedDetections,
    frames: translatedFrames
  });
}

function renderOverviewTab(items: readonly AppDetection[]): void {
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

function renderRestoredTab(items: readonly AppDetection[]): void {
  renderRestoredTabPanel({
    body: restoredResultsBody,
    detectedCountElement: restoredDetectedCount,
    visibleCountElement: restoredVisibleCount,
    reviewCountElement: restoredReviewCount,
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow,
    quantityNeedsReview
  });
}

function renderMaterialsTab(items: readonly AppDetection[]): void {
  renderMaterialsTabPanel({
    panel: materialsPanel,
    allDetections: detections,
    visibleDetections: items,
    storedMaterials: detectedStorageMaterials,
    references,
    calculateMaterialTotals: (detections) => calculateMaterialTotalsForRecipes(detections, recipeByRestoredName),
    calculateOtherItemTotals: (detections) => calculateOtherItemTotalsForRecipes(detections, recipeByRestoredName),
    aggregateRestoredArtefacts: (detections) => aggregateRestoredArtefactsForDetections(detections, quantityNeedsReview),
    sortMaterialRows: (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    storedOtherItems,
    onOtherItemStorageChange: handleOtherItemStorageChange,
    checkedRows: checkedMaterialRows,
    onToggleRowCheck: handleMaterialRowCheck,
    makeMaterialCell,
    makeTextCell,
    makeTableHead,
    makeEmptyMessage,
    makeOverviewCard
  });
}

function renderStorageTab(items: readonly AppDetection[]): void {
  renderStorageTabPanel({
    panel: storagePanel,
    visibleDetections: items,
    storageDetections,
    uploadedImageCount: storageImages.length,
    requiredImageCount: STORAGE_REQUIRED_SCREENSHOTS,
    analysisDone: storageAnalysisDone,
    detectedGridCellCount: storageGridDetections.length,
    detectedMaterials: detectedStorageMaterials,
    materialReferenceCount: materialReferences.length,
    calculateMaterialTotals: (detections) => calculateMaterialTotalsForRecipes(detections, recipeByRestoredName),
    makeStorageDetectionTableRow,
    makeMaterialCell,
    makeLinkedTextCell,
    makeTableHead,
    makeEmptyMessage,
    makeOverviewCard
  });
}

function updateFilterOptions(): void {
  updateCultureFilterOptionsElement(cultureFilter, detections);
}

function renderRestorationPlan(items: readonly AppDetection[]): void {
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

function makeMaterialCell(row: MaterialCellRow): HTMLTableCellElement {
  return makeMaterialCellElement(row, materialByName);
}

function renderPlanningTab(): void {
  renderPlanningTabPanel({
    panel: planningPanel,
    selectedCollections,
    collectionCounts: selectedCollectionCounts,
    collections: archaeologyReference.collections || [],
    damagedItems: filteredDetectionsForMode("damaged"),
    restoredItems: filteredDetectionsForMode("restored"),
    references,
    recipeByRestoredName,
    onCollectionCountChange: handleCollectionCountChange,
    makeEmptyMessage
  });
}

function handleOtherItemStorageChange(name: string, quantity: number): void {
  const key = normalizeName(name);
  if (quantity > 0) {
    storedOtherItems.set(key, quantity);
  } else {
    storedOtherItems.delete(key);
  }
}

function handleMaterialRowCheck(name: string, checked: boolean): void {
  const key = normalizeName(name);
  if (checked) {
    checkedMaterialRows.add(key);
  } else {
    checkedMaterialRows.delete(key);
  }
}

function sortMaterialRows(rows: readonly MaterialRow[]): readonly MaterialRow[] {
  return sortMaterialRowsForMode(rows, viewMode.value);
}

function makeCollectionOverview(items: readonly AppDetection[]): HTMLElement {
  return makeCollectionOverviewElement({
    items,
    restoredItems: filteredDetectionsForMode("restored"),
    collections: archaeologyReference.collections || [],
    references,
    collectionSort,
    selectedCollections,
    onToggleCollection: handleCollectionToggle,
    onSortChange: (sort) => {
      collectionSort = sort;
      renderResultsTabContent();
    },
    makeEmptyMessage,
    makeLinkedTextCell,
    makeTextCell
  });
}

function rowReviewClass(detection: AppDetection, quantityWarning = quantityNeedsReview(detection)): string {
  return detectionRowReviewClass(detection, quantityWarning);
}

function quantityNeedsReview(detection: AppDetection): boolean {
  return !detection.quantityManual && quantityCandidatesAreCloseForDetection(detection);
}

function quantityCandidatesAreCloseForDetection(detection: AppDetection): boolean {
  return quantityCandidatesAreClose(detection);
}

function applyQuantityChange(detection: AppDetection, quantity: number, source: string): void {
  applyQuantityCorrection(detection, quantity, source);
}

function removeDetection(detection: AppDetection): void {
  detections = resultsState.removeDetectionForMode(detection.recognitionMode, detection);
  renderDetections();
  drawBoxes(detections);
}

function makeQuantityDebugView(detection: AppDetection): HTMLElement {
  return makeQuantityDebugViewElement(detection.quantityDebug);
}

function markQuantityManual(quantityCell: HTMLTableCellElement): void {
  const input = quantityCell.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input", "quantity-close-input");
  const row = quantityCell.closest("tr");
  const detection = detections.find((item) => item.rowElements?.quantityCell === quantityCell);
  if (row && detection) {
    const isDamagedRow = row.classList.contains("damaged-detection-row");
    row.className = rowReviewClass(detection);
    if (isDamagedRow) row.classList.add("damaged-detection-row");
  }
  if (detection?.rowElements?.statusCell) detection.rowElements.statusCell.replaceChildren(makeStatusPill(detection));
  if (detections.length) renderRestorationPlan(filteredDetections());
}

function makeRecognitionInfo(detection: AppDetection): HTMLElement {
  return makeRecognitionInfoElement(detection);
}

function makeReferenceCorrectionDropdown(detection: AppDetection): HTMLDetailsElement {
  return makeReferenceCorrectionDropdownElement({
    detection,
    references,
    applyReferenceCorrection
  });
}

function applyReferenceCorrection(detection: AppDetection, item: PreparedArtefactReference, score: number | null): void {
  applyReferenceCorrectionRule(detection, item, score);
  detection.referencePreview = makeReferenceCanvas(item.image);
  updateDetectionRow(detection);
  updateTotals();
}

function verifyDetection(detection: AppDetection): void {
  if (!applyDetectionVerification(detection, AMBIGUOUS_FINAL_MARGIN)) return;
  updateDetectionRow(detection);
  updateTotals();
}

function updateDetectionRow(detection: AppDetection): void {
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

function drawEmptyState(message: string): void {
  resultsBody.replaceChildren();
  drawTableEmptyState(resultsBody, message);
  renderResultsTabContent();
}

function updateTotals(): void {
  preserveScrollPosition(() => {
    if (detections.length) renderRestorationPlan(filteredDetections());
    renderResultsTabContent();
  });
}

function handleCollectionToggle(collectionName: string, selected: boolean): void {
  const key = normalizeName(collectionName);
  if (selected) {
    selectedCollections.add(key);
    if (!selectedCollectionCounts.has(key)) selectedCollectionCounts.set(key, 1);
  } else {
    selectedCollections.delete(key);
    selectedCollectionCounts.delete(key);
  }
  if (resultsState.activeTab === "planning") renderPlanningTab();
}

function handleCollectionCountChange(collectionName: string, count: number): void {
  const key = normalizeName(collectionName);
  selectedCollectionCounts.set(key, Math.max(1, count));
  renderPlanningTab();
}

function exportResults(): void {
  exportAnalysisResults({ image: loadedImage, detections });
}

function drawBoxes(
  items: readonly AppDetection[],
  contentArea: BoundingBox | null = null,
  infinityArea: BoundingBox | null = null
): void {
  if (!loadedImage) return;
  drawAnalysisOverlay({ context: ctx, image: loadedImage, items, contentArea, infinityArea });
}

function translateBox<TBox extends BoundingBox>(box: TBox, x: number, y: number): TBox {
  return { ...box, x: box.x + x, y: box.y + y };
}

function makeStorageDetectionTableRow(detection: StorageDetection): HTMLTableRowElement {
  const row = makeDetectionTableRowElement({
    detection,
    showMetadataColumns: false,
    quantityNeedsReview: storageQuantityNeedsReview,
    quantityCandidatesAreClose: quantityCandidatesAreClose,
    applyQuantityChange: applyStorageQuantityChange,
    onQuantityChanged: (quantityCell) => {
      markStorageQuantityManual(detection, quantityCell);
      refreshStorageTotals();
    },
    onVerifyDetection: verifyStorageDetection,
    makeReferenceCorrectionDropdown: makeStorageReferenceCorrectionDropdown,
    makeRecognitionInfo: makeRecognitionInfoElement,
    makeQuantityDebugView: (item) => makeQuantityDebugViewElement(item.quantityDebug)
  });
  row.classList.add("storage-detection-row");
  return row;
}

function makeStorageDetections(
  items: readonly StorageGridDetection[],
  frames: readonly StorageRecognitionFrame[]
): StorageDetection[] {
  const referenceByName = new Map(materialReferences.map((reference) => [reference.name, reference]));
  return items.flatMap((item) => {
    const frame = frames[item.screenshotIndex];
    if (!frame) return [];
    const reference = item.materialName ? referenceByName.get(item.materialName) : undefined;
    const preview = makePreviewCanvas(frame.imageData, item.box, { enhanceHover: false });
    const processedPreview = makeStorageProcessedCanvas(frame.imageData, item.box);
    return [
      {
        id: item.id,
        screenshotIndex: item.screenshotIndex,
        artefact: item.materialName || "Unknown material",
        wikiPage: item.wikiPage,
        archaeologyLevel: "",
        culture: "",
        digSite: `Storage ${item.screenshotIndex + 1}`,
        quantity: item.quantity || 1,
        originalQuantity: item.originalQuantity,
        quantityConfidence: item.quantityConfidence,
        quantityAlternatives: item.quantityAlternatives,
        quantityDebug: attachQuantityDebugSource(item.quantityDebug || null, frame.imageData),
        matchScore: item.matchScore,
        overlapScore: item.overlapScore,
        shapeScore: item.shapeScore,
        colorScore: item.colorScore,
        matchGap: item.matchGap,
        ambiguousMatch: storageMatchNeedsReview(item),
        bestMatchLimit: 5,
        topMatches: (item.topMatches || []).flatMap((candidate) => {
          const candidateReference = referenceByName.get(candidate.name);
          return candidateReference
            ? [
                {
                  item: candidateReference,
                  score: candidate.score,
                  overlapScore: candidate.overlapScore,
                  shapeScore: candidate.shapeScore,
                  colorScore: candidate.colorScore
                }
              ]
            : [];
        }),
        preview,
        processedPreview,
        referencePreview: reference ? makeReferenceCanvas(reference.image) : makeBlankReferenceCanvas()
      }
    ];
  });
}

function storageMatchNeedsReview(detection: Pick<StorageGridDetection, "matchGap" | "materialName">): boolean {
  if (!detection.materialName) return true;
  return detection.matchGap !== null && detection.matchGap !== undefined && detection.matchGap <= 0.03;
}

function storageQuantityNeedsReview(detection: StorageDetection): boolean {
  return !detection.quantityManual && quantityCandidatesAreClose(detection);
}

function applyStorageQuantityChange(detection: StorageDetection, quantity: number, source: string): void {
  applyQuantityCorrection(detection, quantity, source);
}

function markStorageQuantityManual(detection: StorageDetection, quantityCell: HTMLTableCellElement): void {
  const input = quantityCell.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input", "quantity-close-input");
  if (detection.rowElements?.row) detection.rowElements.row.className = storageRowReviewClass(detection);
  if (detection.rowElements?.statusCell) {
    detection.rowElements.statusCell.replaceChildren(makeDetectionStatusPill(detection, storageQuantityNeedsReview(detection)));
  }
}

function verifyStorageDetection(detection: StorageDetection): void {
  detection.ambiguousMatch = false;
  detection.corrected = true;
  detection.manual = true;
  updateStorageDetectionRow(detection);
}

function makeStorageReferenceCorrectionDropdown(detection: StorageDetection): HTMLDetailsElement {
  return makeReferenceCorrectionDropdownElement({
    detection,
    references: materialReferences,
    applyReferenceCorrection: applyStorageReferenceCorrection
  });
}

function applyStorageReferenceCorrection(
  detection: StorageDetection,
  item: PreparedMaterialReference,
  score: number | null
): void {
  detection.artefact = item.name;
  detection.restoredName = item.name;
  detection.wikiPage = item.wikiPage;
  detection.matchScore = score;
  detection.matchGap = null;
  detection.ambiguousMatch = false;
  detection.corrected = true;
  detection.manual = true;
  detection.referencePreview = makeReferenceCanvas(item.image);
  updateStorageDetectionRow(detection);
  refreshStorageTotals();
}

function updateStorageDetectionRow(detection: StorageDetection): void {
  updateDetectionRowElement({
    detection,
    rowReviewClass: storageRowReviewClass,
    makeReferenceCorrectionDropdown: makeStorageReferenceCorrectionDropdown,
    makeRecognitionInfo: makeRecognitionInfoElement,
    makeStatusPill: (item) => makeDetectionStatusPill(item, storageQuantityNeedsReview(item))
  });
}

function storageRowReviewClass(detection: StorageDetection): string {
  return detectionRowReviewClass(detection, storageQuantityNeedsReview(detection));
}

function refreshStorageTotals(): void {
  detectedStorageMaterials = mergeStorageMaterials(storageDetections);
  renderResultsTabContent();
}

function makeBlankReferenceCanvas(): HTMLCanvasElement {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = 48;
  canvasElement.height = 48;
  canvasElement.className = "reference-preview";
  const canvasContext = canvasElement.getContext("2d");
  if (canvasContext) {
    canvasContext.fillStyle = "#dcc8a6";
    canvasContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
  }
  return canvasElement;
}

function mergeStorageMaterials(items: readonly StorageGridDetection[] | readonly StorageDetection[]): DetectedStorageMaterial[] {
  const byName = new Map<string, DetectedStorageMaterial>();
  for (const item of items) {
    const name = isStoragePresentationDetection(item) ? item.artefact : item.materialName;
    if (!name || name === "Unknown material") continue;
    const existing = byName.get(name);
    const quantity = item.quantity || 1;
    if (existing) {
      byName.set(name, {
        ...existing,
        quantity: existing.quantity + quantity,
        matchScore: Math.max(existing.matchScore || 0, item.matchScore || 0)
      });
    } else {
      byName.set(name, {
        name,
        quantity,
        wikiPage: item.wikiPage,
        matchScore: item.matchScore ?? undefined
      });
    }
  }
  return [...byName.values()];
}

function isStoragePresentationDetection(item: StorageGridDetection | StorageDetection): item is StorageDetection {
  return "artefact" in item;
}

function preserveScrollPosition(render: () => void): void {
  const x = window.scrollX;
  const y = window.scrollY;
  render();
  window.requestAnimationFrame(() => {
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
  });
}
