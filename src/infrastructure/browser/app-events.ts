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
  handlePasteWithoutImage?(): void;
}

export interface AppBrowserActions {
  requestScreenshotFile(): void;
}

export function connectAppEvents(elements: AppElements, handlers: AppEventHandlers): AppBrowserActions {
  let lastHandledPasteAt = 0;
  let lastShortcutImageLoadAt = 0;
  const screenshotPreviewShell = document.querySelector<HTMLElement>(".screenshot-preview-shell");
  elements.loadDefaultButton.addEventListener("click", () => openFilePicker(elements.imageInput));
  screenshotPreviewShell?.addEventListener("click", () => openFilePicker(elements.imageInput));
  screenshotPreviewShell?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openFilePicker(elements.imageInput);
  });
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
  const handlePasteEvent = (event: ClipboardEvent) => {
    if (Date.now() - lastShortcutImageLoadAt < 800) {
      event.preventDefault();
      return;
    }
    lastHandledPasteAt = Date.now();
    void handlePaste(event, handlers);
  };
  window.addEventListener("paste", handlePasteEvent, { capture: true });
  document.addEventListener("keydown", (event) => {
    if (!isPasteShortcut(event) || isEditablePasteTarget(event.target)) return;
    const shortcutAt = Date.now();
    void handlePasteShortcutFallback(handlers, {
      pasteEventHasArrived: () => lastHandledPasteAt >= shortcutAt,
      markImageLoaded: () => {
        lastShortcutImageLoadAt = Date.now();
      }
    });
  });
  connectExamplePreviewPositioning();

  return {
    requestScreenshotFile: () => openFilePicker(elements.imageInput)
  };
}

async function handlePasteShortcutFallback(
  handlers: AppEventHandlers,
  options: {
    pasteEventHasArrived(): boolean;
    markImageLoaded(): void;
  }
): Promise<void> {
  let srcs: readonly string[] = [];
  try {
    srcs = await readNavigatorClipboardImagesAsDataUrls();
  } catch (error) {
    console.warn("Could not read pasted image from clipboard.", error);
  }
  if (srcs.length) {
    if (options.pasteEventHasArrived()) return;
    options.markImageLoaded();
    await handlers.handlePastedImages(srcs);
    return;
  }
  if (options.pasteEventHasArrived()) return;
  handlers.handlePasteWithoutImage?.();
}

function isPasteShortcut(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === "v" && (event.ctrlKey || event.metaKey);
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
  if (!srcs.length) {
    if (!isEditablePasteTarget(event.target)) handlers.handlePasteWithoutImage?.();
    return;
  }
  event.preventDefault();
  await handlers.handlePastedImages(srcs);
}

function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
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
