import { queryElements, requireCanvasContext, requireElement } from "./dom-elements";

export interface AppElements {
  imagePanel: HTMLElement;
  screenshotTitle: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageInput: HTMLInputElement;
  loadDefaultButton: HTMLButtonElement;
  analyzeButton: HTMLButtonElement;
  viewMode: HTMLSelectElement;
  exportResultsButton: HTMLButtonElement;
  resultsBody: HTMLTableSectionElement;
  restoredResultsBody: HTMLTableSectionElement;
  slotCountEl: HTMLElement;
  quantityTotalEl: HTMLElement;
  manualCountEl: HTMLElement;
  referenceCountEl: HTMLElement;
  visibleCountEl: HTMLElement;
  reviewCountEl: HTMLElement;
  highestLevelEl: HTMLElement;
  planBody: HTMLElement;
  artefactSearch: HTMLInputElement;
  cultureFilter: HTMLSelectElement;
  reviewOnly: HTMLInputElement;
  resultsTitle: HTMLElement;
  resultTabButtons: HTMLElement[];
  resultTabPanels: HTMLElement[];
  overviewPanel: HTMLElement;
  damagedDetectedCount: HTMLElement;
  damagedVisibleCount: HTMLElement;
  damagedReviewCount: HTMLElement;
  storagePanel: HTMLElement;
  materialsPanel: HTMLElement;
}

export function getAppElements(): AppElements {
  const canvas = requireElement("previewCanvas", HTMLCanvasElement);

  return {
    imagePanel: requireElement("imagePanel", HTMLElement),
    screenshotTitle: requireElement("screenshotTitle", HTMLElement),
    canvas,
    ctx: requireCanvasContext(canvas),
    imageInput: requireElement("imageInput", HTMLInputElement),
    loadDefaultButton: requireElement("loadDefault", HTMLButtonElement),
    analyzeButton: requireElement("analyze", HTMLButtonElement),
    viewMode: requireElement("viewMode", HTMLSelectElement),
    exportResultsButton: requireElement("exportResults", HTMLButtonElement),
    resultsBody: requireElement("resultsBody", HTMLTableSectionElement),
    restoredResultsBody: requireElement("restoredResultsBody", HTMLTableSectionElement),
    slotCountEl: requireElement("slotCount", HTMLElement),
    quantityTotalEl: requireElement("quantityTotal", HTMLElement),
    manualCountEl: requireElement("manualCount", HTMLElement),
    referenceCountEl: requireElement("referenceCount", HTMLElement),
    visibleCountEl: requireElement("visibleCount", HTMLElement),
    reviewCountEl: requireElement("reviewCount", HTMLElement),
    highestLevelEl: requireElement("highestLevel", HTMLElement),
    planBody: requireElement("planBody", HTMLElement),
    artefactSearch: requireElement("artefactSearch", HTMLInputElement),
    cultureFilter: requireElement("cultureFilter", HTMLSelectElement),
    reviewOnly: requireElement("reviewOnly", HTMLInputElement),
    resultsTitle: requireElement("resultsTitle", HTMLElement),
    resultTabButtons: queryElements<HTMLElement>("[data-results-tab]"),
    resultTabPanels: queryElements<HTMLElement>("[data-results-panel]"),
    overviewPanel: requireElement("overviewPanel", HTMLElement),
    damagedDetectedCount: requireElement("damagedDetectedCount", HTMLElement),
    damagedVisibleCount: requireElement("damagedVisibleCount", HTMLElement),
    damagedReviewCount: requireElement("damagedReviewCount", HTMLElement),
    storagePanel: requireElement("storagePanel", HTMLElement),
    materialsPanel: requireElement("materialsPanel", HTMLElement)
  };
}
