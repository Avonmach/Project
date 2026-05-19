import { connectResultTabButtons, type ResultsTab } from "../../presentation/tabs/results-tabs";
import type { AppElements } from "./app-elements";
import { closeOpenDetailsMenusOutsideTarget } from "./details-menu";
import { openFilePicker, readClipboardImagesAsDataUrls, readNavigatorClipboardImagesAsDataUrls } from "./file-input";

export interface AppEventHandlers {
  analyzeCurrentImage(): void;
  renderDetections(): void;
  setActiveResultsTab(tab: ResultsTab): void;
  exportResults(): void;
  handleSelectedImageInput(): Promise<void>;
  handlePastedImages(srcs: readonly string[]): Promise<void>;
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
  document.addEventListener("paste", (event) => {
    void handlePaste(event, handlers);
  });
  connectExamplePreviewPositioning();

  return {
    requestScreenshotFile: () => openFilePicker(elements.imageInput)
  };
}

async function handlePaste(event: ClipboardEvent, handlers: AppEventHandlers): Promise<void> {
  let srcs = await readClipboardImagesAsDataUrls(event);
  if (!srcs.length) {
    try {
      srcs = await readNavigatorClipboardImagesAsDataUrls();
    } catch (error) {
      console.warn("Could not read pasted image from clipboard.", error);
    }
  }
  if (!srcs.length) return;
  event.preventDefault();
  await handlers.handlePastedImages(srcs);
}

function connectExamplePreviewPositioning(): void {
  const popover = document.querySelector<HTMLDetailsElement>(".example-popover");
  const button = popover?.querySelector<HTMLElement>(".example-button");
  if (!popover || !button) return;

  const positionPreview = () => {
    if (!popover.open) return;
    const rect = button.getBoundingClientRect();
    popover.style.setProperty("--example-preview-left", `${Math.round(rect.right + 12)}px`);
    popover.style.setProperty("--example-preview-top", "12px");
  };

  popover.addEventListener("toggle", () => {
    if (!popover.open) return;
    requestAnimationFrame(positionPreview);
  });
  window.addEventListener("resize", positionPreview);
  window.addEventListener("scroll", positionPreview, true);
}
