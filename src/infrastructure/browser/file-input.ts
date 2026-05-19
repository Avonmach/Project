import { readImageFileAsDataUrl } from "./image-loader";

export function openFilePicker(input: HTMLInputElement): void {
  input.click();
}

export function readClipboardImagesAsDataUrls(event: ClipboardEvent): Promise<readonly string[]> {
  const items = Array.from(event.clipboardData?.items || []);
  const imageFiles = items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  return Promise.all(imageFiles.map((file) => readImageFileAsDataUrl(file)));
}
