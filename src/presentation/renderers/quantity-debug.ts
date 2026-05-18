import { templateWidth } from "../../domain/ocr/digit-templates";
import { percent } from "../../domain/shared/format";

interface QuantityDebugBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface QuantityDebugPixel {
  readonly x: number;
  readonly y: number;
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
}

interface QuantityDebugTemplateOption {
  readonly digit: string;
  readonly score: number;
  readonly template?: readonly string[];
  readonly width?: number;
  readonly height?: number;
}

interface QuantityDebugMatch {
  readonly index: number;
  readonly digit: string;
  readonly score: number;
  readonly normalized: readonly string[];
  readonly options: readonly QuantityDebugTemplateOption[];
}

export interface QuantityDebugData {
  readonly mode: string;
  readonly strict?: boolean;
  readonly scanBox: QuantityDebugBox;
  readonly pixelCount: number;
  readonly pixels: readonly QuantityDebugPixel[];
  readonly digitBoxes: readonly QuantityDebugBox[];
  readonly rejectedBoxes: readonly QuantityDebugBox[];
  readonly matches: readonly QuantityDebugMatch[];
  readonly text?: string;
  readonly confidence: number;
  readonly source?: ImageData;
}

export function makeQuantityDebugView(debug: QuantityDebugData | null | undefined): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "quantity-debug";
  const summary = document.createElement("summary");
  summary.textContent = "OCR";
  details.append(summary);

  if (!debug) {
    const empty = document.createElement("small");
    empty.textContent = "No OCR data";
    details.append(empty);
    return details;
  }

  const sourceLabel = document.createElement("small");
  sourceLabel.className = "quantity-debug-label";
  sourceLabel.textContent = "Source crop";
  const sourceCanvas = makeQuantitySourceCanvas(debug);
  const maskLabel = document.createElement("small");
  maskLabel.className = "quantity-debug-label";
  maskLabel.textContent = "Evaluated pixels";
  const canvas = makeQuantityDebugCanvas(debug);
  const meta = document.createElement("small");
  meta.className = "quantity-debug-meta";
  meta.textContent = [
    `${debug.mode}${debug.strict ? " strict" : ""}`,
    `scan ${debug.scanBox.w}x${debug.scanBox.h}`,
    `${debug.pixelCount} px`,
    `read ${debug.text || "none"} (${percent(debug.confidence)})`
  ].join(" | ");

  const digitList = document.createElement("div");
  digitList.className = "quantity-debug-digits";
  if (debug.matches.length) {
    for (const match of debug.matches) {
      const line = document.createElement("div");
      line.className = "quantity-debug-match";
      const summary = document.createElement("code");
      const options = match.options.map((option) => `${option.digit}:${percent(option.score)}`).join(" ");
      summary.textContent = `#${match.index} read ${match.digit} ${percent(match.score)} | ${options}`;
      line.append(summary);
      const grids = document.createElement("div");
      grids.className = "quantity-debug-grid-comparison";
      grids.append(makeQuantityGridView("Detected", match.normalized));
      const templates = document.createElement("div");
      templates.className = "quantity-debug-templates";
      for (const option of match.options) {
        templates.append(makeQuantityTemplateView(option, option.digit === match.digit));
      }
      grids.append(templates);
      line.append(grids);
      digitList.append(line);
    }
  } else {
    const line = document.createElement("code");
    line.textContent = "no accepted digit boxes";
    digitList.append(line);
  }

  details.append(sourceLabel, sourceCanvas, maskLabel, canvas, meta, digitList);
  return details;
}

function makeQuantityTemplateView(option: QuantityDebugTemplateOption, selected = false): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "quantity-debug-template";
  if (selected) wrapper.classList.add("is-selected");
  const template = option.template || [];
  const width = option.width || templateWidth(template);
  const label = `Ref ${option.digit} ${percent(option.score)}`;
  const grid = makeQuantityGridView(label, template, width);
  wrapper.append(grid);
  return wrapper;
}

function makeQuantityGridView(labelText: string, rows: readonly string[], width = templateWidth(rows)): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "quantity-debug-grid-view";
  const label = document.createElement("small");
  label.textContent = labelText;
  const grid = document.createElement("div");
  grid.className = "quantity-debug-template-grid";
  grid.style.gridTemplateColumns = `repeat(${width}, 4px)`;
  for (const row of rows) {
    for (const value of row.padEnd(width, "0").slice(0, width)) {
      const cell = document.createElement("span");
      if (value === "1") cell.className = "is-on";
      grid.append(cell);
    }
  }
  wrapper.append(label, grid);
  return wrapper;
}

function makeQuantitySourceCanvas(debug: QuantityDebugData): HTMLCanvasElement {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.className = "quantity-debug-canvas";
  canvas.width = debug.scanBox.w * scale;
  canvas.height = debug.scanBox.h * scale;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  const source = document.createElement("canvas");
  source.width = debug.scanBox.w;
  source.height = debug.scanBox.h;
  if (debug.source) source.getContext("2d")?.putImageData(debug.source, 0, 0);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  for (const box of debug.rejectedBoxes) {
    drawQuantityDebugBox(context, box, scale, "#b94a48");
  }
  for (const box of debug.digitBoxes) {
    drawQuantityDebugBox(context, box, scale, "#44a3ff");
  }

  return canvas;
}

function makeQuantityDebugCanvas(debug: QuantityDebugData): HTMLCanvasElement {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.className = "quantity-debug-canvas";
  canvas.width = debug.scanBox.w * scale;
  canvas.height = debug.scanBox.h * scale;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#1f2529";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const pixel of debug.pixels) {
    if (pixel.x >= debug.scanBox.w || pixel.y >= debug.scanBox.h) continue;
    context.fillStyle = pixel.color ? `rgb(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b})` : "#f3d14a";
    context.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
  }

  for (const box of debug.rejectedBoxes) {
    drawQuantityDebugBox(context, box, scale, "#b94a48");
  }
  for (const box of debug.digitBoxes) {
    drawQuantityDebugBox(context, box, scale, "#44a3ff");
  }

  return canvas;
}

function drawQuantityDebugBox(context: CanvasRenderingContext2D, box: QuantityDebugBox, scale: number, color: string): void {
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.strokeRect(box.x * scale + 0.5, box.y * scale + 0.5, box.w * scale - 1, box.h * scale - 1);
}
