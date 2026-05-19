import { readImageFileAsDataUrl } from "./image-loader";

export function openFilePicker(input: HTMLInputElement): void {
  input.click();
}

export function readClipboardImagesAsDataUrls(event: ClipboardEvent): Promise<readonly string[]> {
  const items = Array.from(event.clipboardData?.items || []);
  const files = Array.from(event.clipboardData?.files || []);
  const itemFiles = items
    .filter((item) => item.kind === "file" && isClipboardImageType(item.type))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  const imageFiles = uniqueFiles([...itemFiles, ...files.filter(isImageFile)]);
  return Promise.all(imageFiles.map((file) => readImageFileAsDataUrl(file)));
}

export async function readNavigatorClipboardImagesAsDataUrls(): Promise<readonly string[]> {
  if (!navigator.clipboard?.read) return [];
  const clipboardItems = await navigator.clipboard.read();
  const imageBlobs: Blob[] = [];
  for (const item of clipboardItems) {
    const imageType = item.types.find(isClipboardImageType);
    if (!imageType) continue;
    imageBlobs.push(await item.getType(imageType));
  }
  return Promise.all(imageBlobs.map((blob) => readImageFileAsDataUrl(new File([blob], "clipboard-image", { type: blob.type }))));
}

function isClipboardImageType(type: string): boolean {
  return !type || type.startsWith("image/");
}

function isImageFile(file: File): boolean {
  return isClipboardImageType(file.type);
}

function uniqueFiles(files: readonly File[]): File[] {
  const seen = new Set<string>();
  const result: File[] = [];
  for (const file of files) {
    const key = `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}
