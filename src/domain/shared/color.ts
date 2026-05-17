export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function sameColor(r: number, g: number, b: number, color: RgbColor): boolean {
  return r === color.r && g === color.g && b === color.b;
}

export function colorDistance(r: number, g: number, b: number, color: RgbColor): number {
  return Math.abs(r - color.r) + Math.abs(g - color.g) + Math.abs(b - color.b);
}

export function channelDistance(r: number, g: number, b: number, color: RgbColor): number {
  return Math.max(Math.abs(r - color.r), Math.abs(g - color.g), Math.abs(b - color.b));
}
