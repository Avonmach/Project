import type { ExportGridInfo } from "./analysis-export";

export interface ExportGridMeasurements {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly cellSize: number;
}

export function createExportGridMetadata(measurements: ExportGridMeasurements): ExportGridInfo {
  return {
    offsetX: measurements.offsetX,
    offsetY: measurements.offsetY,
    cellSize: measurements.cellSize,
    rows: null,
    columns: null
  };
}
