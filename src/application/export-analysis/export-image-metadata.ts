import type { ExportImageInfo } from "./analysis-export";

export interface ExportImageLike {
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly currentSrc: string;
  readonly src: string;
}

export function createExportImageMetadata(image: ExportImageLike | null): ExportImageInfo | null {
  if (!image) return null;
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    source: image.currentSrc || image.src
  };
}
