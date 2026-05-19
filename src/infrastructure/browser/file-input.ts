import { readImageFileAsDataUrl } from "./image-loader";

export function openFilePicker(input: HTMLInputElement): void {
  input.click();
}

export function readClipboardImagesAsDataUrls(event: ClipboardEvent): Promise<readonly string[]> {
  const items = Array.from(event.clipboardData?.items || []);
  const files = Array.from(event.clipboardData?.files || []);
  const itemFiles = items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  const imageFiles = [...itemFiles, ...files.filter((file) => file.type.startsWith("image/"))];
  return Promise.all(imageFiles.map((file) => readImageFileAsDataUrl(file)));
}
