import { STATUS_MESSAGES } from "../../application/config/status-messages";
import { readSelectedImagesAsDataUrls } from "./image-loader";

export interface SelectedScreenshotInputRequest {
  imageInput: HTMLInputElement;
  loadImageFromUrl(src: string): Promise<void>;
  loadImagesFromUrls?(srcs: readonly string[]): Promise<void>;
  drawEmptyState(message: string): void;
}

export async function loadSelectedScreenshotInput({
  imageInput,
  loadImageFromUrl,
  loadImagesFromUrls,
  drawEmptyState
}: SelectedScreenshotInputRequest): Promise<void> {
  try {
    const dataUrls = await readSelectedImagesAsDataUrls(imageInput);
    if (!dataUrls.length) return;
    if (loadImagesFromUrls) {
      await loadImagesFromUrls(dataUrls);
      return;
    }
    const first = dataUrls[0];
    if (first) await loadImageFromUrl(first);
  } catch (error) {
    console.warn(STATUS_MESSAGES.screenshotReadWarning, error);
    drawEmptyState(STATUS_MESSAGES.screenshotLoadFailed);
  }
}
