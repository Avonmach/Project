export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Selected image file could not be read as a data URL."));
    };
    reader.onerror = () => reject(new Error("Selected image file could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function loadImageToCanvas(
  src: string,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
): Promise<HTMLImageElement> {
  const image = await loadImageElement(src);
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  return image;
}
