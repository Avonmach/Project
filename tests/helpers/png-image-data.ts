import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = "89504e470d0a1a0a";

export function loadPngImageData(path: string): ImageData {
  const png = readFileSync(path);
  if (png.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) throw new Error(`Not a PNG: ${path}`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bit depth ${bitDepth}, color type ${colorType}`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    sourceOffset += 1;
    const current = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    unfilterScanline(current, previous, filter, bytesPerPixel);

    for (let x = 0; x < width; x += 1) {
      const source = x * bytesPerPixel;
      const target = (y * width + x) * 4;
      rgba[target] = current[source] ?? 0;
      rgba[target + 1] = current[source + 1] ?? 0;
      rgba[target + 2] = current[source + 2] ?? 0;
      rgba[target + 3] = colorType === 6 ? current[source + 3] ?? 255 : 255;
    }

    previous = current;
  }

  return { width, height, data: rgba, colorSpace: "srgb" } as ImageData;
}

function unfilterScanline(current: Buffer, previous: Buffer, filter: number, bytesPerPixel: number): void {
  for (let index = 0; index < current.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] ?? 0 : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    const raw = current[index] ?? 0;

    if (filter === 1) current[index] = (raw + left) & 255;
    else if (filter === 2) current[index] = (raw + up) & 255;
    else if (filter === 3) current[index] = (raw + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) current[index] = (raw + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}
