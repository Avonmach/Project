import { connectResultTabButtons, type ResultsTab } from "../../presentation/tabs/results-tabs";
import type { AppElements } from "./app-elements";
import { closeOpenDetailsMenusOutsideTarget } from "./details-menu";
import { openFilePicker } from "./file-input";

export interface AppEventHandlers {
  analyzeCurrentImage(): void;
  renderDetections(): void;
  setActiveResultsTab(tab: ResultsTab): void;
  exportResults(): void;
  handleSelectedImageInput(): Promise<void>;
}

export interface AppBrowserActions {
  requestScreenshotFile(): void;
}

export function connectAppEvents(elements: AppElements, handlers: AppEventHandlers): AppBrowserActions {
  elements.loadDefaultButton.addEventListener("click", () => openFilePicker(elements.imageInput));
  elements.analyzeButton.addEventListener("click", handlers.analyzeCurrentImage);
  elements.viewMode.addEventListener("change", handlers.renderDetections);
  elements.artefactSearch.addEventListener("input", handlers.renderDetections);
  elements.cultureFilter.addEventListener("change", handlers.renderDetections);
  elements.reviewOnly.addEventListener("change", handlers.renderDetections);
  connectResultTabButtons(elements.resultTabButtons, handlers.setActiveResultsTab);
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    closeOpenDetailsMenusOutsideTarget(".correction-menu[open]", event.target);
  });
  elements.exportResultsButton.addEventListener("click", handlers.exportResults);
  elements.imageInput.addEventListener("change", () => {
    void handlers.handleSelectedImageInput();
  });

  return {
    requestScreenshotFile: () => openFilePicker(elements.imageInput)
  };
}
