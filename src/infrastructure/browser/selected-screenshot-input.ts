import { STATUS_MESSAGES } from "../../application/config/status-messages";
import { readSelectedImageAsDataUrl } from "./image-loader";

export interface SelectedScreenshotInputRequest {
  imageInput: HTMLInputElement;
  loadImageFromUrl(src: string): Promise<void>;
  drawEmptyState(message: string): void;
}

export async function loadSelectedScreenshotInput({
  imageInput,
  loadImageFromUrl,
  drawEmptyState
}: SelectedScreenshotInputRequest): Promise<void> {
  try {
    const dataUrl = await readSelectedImageAsDataUrl(imageInput);
    if (!dataUrl) return;
    await loadImageFromUrl(dataUrl);
  } catch (error) {
    console.warn(STATUS_MESSAGES.screenshotReadWarning, error);
    drawEmptyState(STATUS_MESSAGES.screenshotLoadFailed);
  }
}
