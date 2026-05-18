import {
  FALLBACK_DIGIT_TEMPLATES,
  buildDigitTemplatesFromFont
} from "./domain/ocr/digit-templates";
import { createDetectionRecord, type DetectionRecord } from "./application/analyze-screenshot/detection-record";
import {
  aggregateRestoredArtefacts as aggregateRestoredArtefactsForDetections,
  calculateMaterialTotals as calculateMaterialTotalsForRecipes,
  type MaterialRecipe
} from "./application/calculate-materials/material-totals";
import { applyCandidatePrediction as applyCandidatePredictionRule } from "./application/correct-detection/candidate-prediction";
import { applyQuantityChange as applyQuantityCorrection } from "./application/correct-detection/quantity-correction";
import { applyReferenceCorrection as applyReferenceCorrectionRule } from "./application/correct-detection/reference-correction";
import { findUniqueArtefactAssignments } from "./application/correct-detection/unique-artefact-assignments";
import { verifyDetection as applyDetectionVerification } from "./application/correct-detection/verification";
import { createAnalysisExportPayload } from "./application/export-analysis/analysis-export";
import { filterAndSortDetections } from "./application/filter-detections/detection-filters";
import { prepareArtefactReferences } from "./application/load-references/artefact-reference-preparation";
import { sortMaterialRows as sortMaterialRowsForMode } from "./application/sort-results/result-row-sorting";
import { matchArtifact as matchArtefactAgainstReferences, type RecognitionMode } from "./domain/artefacts/matching";
import { detectQuantity, quantityCandidatesAreClose, type QuantityDebug } from "./domain/ocr/quantity-ocr";
import type { BoundingBox } from "./domain/shared/geometry";
import { normalizeName } from "./domain/shared/format";
import { requireCanvasContext, requireElement } from "./infrastructure/browser/dom-elements";
import { loadImageElement, loadImageToCanvas, readImageFileAsDataUrl } from "./infrastructure/browser/image-loader";
import {
  emptyArchaeologyReferenceData,
  loadArchaeologyReferenceData,
  loadDamagedArtifactRecords,
  type ArchaeologyReferenceData
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
  connectResultTabButtons,
  type ResultsTab
} from "./presentation/tabs/results-tabs";
import { createResultsState } from "./presentation/state/results-state";
import { renderOverviewTab as renderOverviewTabPanel } from "./presentation/renderers/overview-tab";
import { drawTableEmptyState, renderRestoredTab as renderRestoredTabPanel } from "./presentation/renderers/restored-tab";
import { renderMaterialsTab as renderMaterialsTabPanel } from "./presentation/renderers/materials-tab";
import { renderStorageTab as renderStorageTabPanel } from "./presentation/renderers/storage-tab";
import { renderDamagedTab as renderDamagedTabPanel } from "./presentation/renderers/damaged-tab";
import {
  makeCollectionOverview as makeCollectionOverviewElement,
  type CollectionSort
} from "./presentation/renderers/collection-overview";
import { renderRestorationPlan as renderRestorationPlanPanel } from "./presentation/renderers/restoration-plan";
import { makeRecognitionInfo as makeRecognitionInfoElement } from "./presentation/renderers/recognition-info";
import { renderSummaryTotals } from "./presentation/renderers/summary-totals";
import {
  makeMaterialCell as makeMaterialCellElement,
  type MaterialCellReference,
  type MaterialCellRow
} from "./presentation/renderers/material-cell";
import type { MaterialRow } from "./presentation/renderers/materials-tab";
import { drawAnalysisOverlay } from "./presentation/renderers/analysis-overlay";
import { updateDetectionRow as updateDetectionRowElement } from "./presentation/renderers/detection-row-update";
import {
  makePreviewCanvas,
  makeProcessedCanvas,
  makeReferenceCanvas
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
  rowReviewClass as detectionRowReviewClass,
  type DetectionRowElements
} from "./presentation/renderers/detection-row";
import { makeReferenceCorrectionDropdown as makeReferenceCorrectionDropdownElement } from "./presentation/renderers/correction-dropdown";
import { makeQuantityDebugView as makeQuantityDebugViewElement } from "./presentation/renderers/quantity-debug";

import type { PreparedArtefactReference } from "./application/load-references/artefact-reference-preparation";

type AppDetection = DetectionRecord<
  PreparedArtefactReference,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement
> & {
  rowElements?: DetectionRowElements;
};
type AppMatchCandidate = NonNullable<AppDetection["topMatches"]>[number];

const canvas = requireElement("previewCanvas", HTMLCanvasElement);
const ctx = requireCanvasContext(canvas);
const imageInput = requireElement("imageInput", HTMLInputElement);
const loadDefaultButton = requireElement("loadDefault", HTMLButtonElement);
const analyzeButton = requireElement("analyze", HTMLButtonElement);
const viewMode = requireElement("viewMode", HTMLSelectElement);
const exportResultsButton = requireElement("exportResults", HTMLButtonElement);
const resultsBody = requireElement("resultsBody", HTMLTableSectionElement);
const restoredResultsBody = requireElement("restoredResultsBody", HTMLTableSectionElement);
const slotCountEl = requireElement("slotCount", HTMLElement);
const quantityTotalEl = requireElement("quantityTotal", HTMLElement);
const manualCountEl = requireElement("manualCount", HTMLElement);
const referenceCountEl = requireElement("referenceCount", HTMLElement);
const visibleCountEl = requireElement("visibleCount", HTMLElement);
const reviewCountEl = requireElement("reviewCount", HTMLElement);
const highestLevelEl = requireElement("highestLevel", HTMLElement);
const planBody = requireElement("planBody", HTMLElement);
const artefactSearch = requireElement("artefactSearch", HTMLInputElement);
const cultureFilter = requireElement("cultureFilter", HTMLSelectElement);
const reviewOnly = requireElement("reviewOnly", HTMLInputElement);
const resultsTitle = requireElement("resultsTitle", HTMLElement);
const resultTabButtons = [...document.querySelectorAll<HTMLElement>("[data-results-tab]")];
const resultTabPanels = [...document.querySelectorAll<HTMLElement>("[data-results-panel]")];
const overviewPanel = requireElement("overviewPanel", HTMLElement);
const storagePanel = requireElement("storagePanel", HTMLElement);
const materialsPanel = requireElement("materialsPanel", HTMLElement);

const AMBIGUOUS_FINAL_MARGIN = 0.025;
let loadedImage: HTMLImageElement | null = null;
let detections: AppDetection[] = [];
let references: PreparedArtefactReference[] = [];
let archaeologyReference: ArchaeologyReferenceData = emptyArchaeologyReferenceData();
let recipeByRestoredName: Map<string, MaterialRecipe> = new Map();
let materialByName: Map<string, MaterialCellReference> = new Map();
const resultsState = createResultsState<AppDetection>();
let collectionSort: CollectionSort = { key: "progress", direction: "desc" };

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
  if (!(event.target instanceof Node)) return;
  for (const menu of document.querySelectorAll<HTMLDetailsElement>(".correction-menu[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
exportResultsButton.addEventListener("click", exportResults);
imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
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

async function loadImageFromUrl(src: string) {
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
  applyCandidatePredictionRule(detection, candidate, AMBIGUOUS_FINAL_MARGIN);
  detection.referencePreview = makeReferenceCanvas(candidate.item.image);
}

function attachQuantityDebugSource(debug: QuantityDebug | null, imageData: ImageData): (QuantityDebug & { source: ImageData }) | null {
  if (!debug) return null;
  return {
    ...debug,
    source: copyImageData(imageData, debug.scanBox)
  };
}

function renderDetections(): void {
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
    makeReferenceCorrectionDropdown,
    makeRecognitionInfo,
    makeQuantityDebugView
  });
}

function makeStatusPill(detection: AppDetection, quantityWarning = quantityNeedsReview(detection)): HTMLSpanElement {
  return makeDetectionStatusPill(detection, quantityWarning);
}

function filteredDetections(): AppDetection[] {
  return filterAndSortDetections(detections, viewMode.value, {
    query: artefactSearch.value,
    culture: cultureFilter.value,
    reviewOnly: reviewOnly.checked,
    quantityNeedsReview
  });
}

function setActiveResultsTab(tab: ResultsTab): void {
  detections = resultsState.setActiveTab(tab);
  applyResultTabSelection({ tab, title: resultsTitle, buttons: resultTabButtons, panels: resultTabPanels });

  if (tab === "damaged") renderDamagedTable(filteredDetections());
  updateTotals();
  renderResultsTabContent();
  requestTabScreenshot(tab);
}

function renderResultsTabContent(): void {
  const items = filteredDetections();
  if (resultsState.activeTab === "overview") renderOverviewTab(items);
  if (resultsState.activeTab === "restored") renderRestoredTab(items);
  if (resultsState.activeTab === "storage") renderStorageTab(items);
  if (resultsState.activeTab === "materials") renderMaterialsTab(items);
}

function renderDamagedTable(items: readonly AppDetection[]): void {
  renderDamagedTabPanel({
    body: resultsBody,
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow,
    drawEmptyState
  });
}

function requestTabScreenshot(tab: ResultsTab): void {
  if (!resultsState.shouldRequestScreenshot(tab)) return;
  if (tab === "restored") {
    loadImageFromUrl(DEFAULT_SCREENSHOTS.restored);
    return;
  }
  imageInput.click();
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
    allDetections: detections,
    visibleDetections: items,
    makeDetectionTableRow
  });
}

function renderMaterialsTab(items: readonly AppDetection[]): void {
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

function renderStorageTab(items: readonly AppDetection[]): void {
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

function updateFilterOptions(): void {
  const current = cultureFilter.value;
  const cultures = [
    ...new Set(detections.map((detection) => detection.culture).filter((culture): culture is string => Boolean(culture)))
  ].sort();
  cultureFilter.replaceChildren(new Option("All cultures", ""));
  for (const culture of cultures) cultureFilter.append(new Option(culture, culture));
  if (cultures.includes(current)) cultureFilter.value = current;
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

function sortMaterialRows(rows: readonly MaterialRow[]): readonly MaterialRow[] {
  return sortMaterialRowsForMode(rows, viewMode.value);
}

function makeCollectionOverview(items: readonly AppDetection[]): HTMLElement {
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

function makeQuantityDebugView(detection: AppDetection): HTMLElement {
  return makeQuantityDebugViewElement(detection.quantityDebug);
}

function markQuantityManual(quantityCell: HTMLTableCellElement): void {
  const input = quantityCell.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input");
  const row = quantityCell.closest("tr");
  const detection = detections.find((item) => item.rowElements?.quantityCell === quantityCell);
  if (row && detection) row.className = rowReviewClass(detection);
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
  renderSummaryTotals({
    detections,
    slotCountElement: slotCountEl,
    quantityTotalElement: quantityTotalEl,
    manualCountElement: manualCountEl
  });
  if (detections.length) renderRestorationPlan(filteredDetections());
  renderResultsTabContent();
}

function exportResults(): void {
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

function drawBoxes(
  items: readonly AppDetection[],
  contentArea: BoundingBox | null = null,
  infinityArea: BoundingBox | null = null
): void {
  if (!loadedImage) return;
  drawAnalysisOverlay({ context: ctx, image: loadedImage, items, contentArea, infinityArea });
}
