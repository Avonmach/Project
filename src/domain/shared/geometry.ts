export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly area?: number;
}

export function getIconMatchBox<TBox extends BoundingBox>(box: TBox): BoundingBox {
  const insetX = Math.max(1, Math.round(box.w * 0.04));
  const topInset = Math.max(1, Math.round(box.h * 0.04));
  const bottomInset = Math.max(1, Math.round(box.h * 0.04));
  return {
    x: box.x + insetX,
    y: box.y + topInset,
    w: Math.max(8, box.w - insetX * 2),
    h: Math.max(8, box.h - topInset - bottomInset),
    area: box.area
  };
}
