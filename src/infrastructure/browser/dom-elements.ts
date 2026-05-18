export function requireElement<TElement extends Element>(
  id: string,
  constructor: { new (...args: never[]): TElement }
): TElement {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing required element #${id}.`);
  }
  return element;
}

export function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not create preview canvas context.");
  return context;
}

export function queryElements<TElement extends Element>(selector: string): TElement[] {
  return [...document.querySelectorAll<TElement>(selector)];
}
