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
  planningPanel: HTMLElement;
  damagedDetectedCount: HTMLElement;
  damagedVisibleCount: HTMLElement;
  damagedReviewCount: HTMLElement;
  restoredDetectedCount: HTMLElement;
  restoredVisibleCount: HTMLElement;
  restoredReviewCount: HTMLElement;
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
    planningPanel: requireElement("planningPanel", HTMLElement),
    damagedDetectedCount: requireElement("damagedDetectedCount", HTMLElement),
    damagedVisibleCount: requireElement("damagedVisibleCount", HTMLElement),
    damagedReviewCount: requireElement("damagedReviewCount", HTMLElement),
    restoredDetectedCount: requireElement("restoredDetectedCount", HTMLElement),
    restoredVisibleCount: requireElement("restoredVisibleCount", HTMLElement),
    restoredReviewCount: requireElement("restoredReviewCount", HTMLElement),
    storagePanel: requireElement("storagePanel", HTMLElement),
    materialsPanel: requireElement("materialsPanel", HTMLElement)
  };
}
