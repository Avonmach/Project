export interface StoragePreviewImageSize {
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface StoragePreviewPlacement<TImage extends StoragePreviewImageSize = StoragePreviewImageSize> {
  readonly image: TImage;
  readonly x: number;
  readonly y: number;
}

export interface StoragePreviewLayout<TImage extends StoragePreviewImageSize = StoragePreviewImageSize> {
  readonly width: number;
  readonly height: number;
  readonly placements: readonly StoragePreviewPlacement<TImage>[];
}

export function calculateStoragePreviewLayout<TImage extends StoragePreviewImageSize>(
  images: readonly TImage[],
  gap: number
): StoragePreviewLayout<TImage> {
  if (!images.length) return { width: 0, height: 0, placements: [] };

  let x = 0;
  const placements = images.map((image) => {
    const placement: StoragePreviewPlacement<TImage> = { image, x, y: 0 };
    x += image.naturalWidth + gap;
    return placement;
  });

  return {
    width: images.reduce((sum, image) => sum + image.naturalWidth, 0) + gap * (images.length - 1),
    height: Math.max(...images.map((image) => image.naturalHeight)),
    placements
  };
}
