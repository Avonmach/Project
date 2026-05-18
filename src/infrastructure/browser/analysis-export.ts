import { createAnalysisExportFile } from "../../application/export-analysis/analysis-export-file";
import { createExportGridMetadata } from "../../application/export-analysis/export-grid-metadata";
import { createExportImageMetadata } from "../../application/export-analysis/export-image-metadata";
import type { AppDetection } from "../../presentation/state/app-detection";
import {
  getGridCellSize,
  getGridOffsetX,
  getGridOffsetY,
} from "../image-processing/bank-grid";
import { downloadJsonFile } from "./download";

export interface AnalysisExportRequest {
  image: HTMLImageElement | null;
  detections: readonly AppDetection[];
  exportedAt?: string;
}

export function exportAnalysisResults({
  image,
  detections,
  exportedAt = new Date().toISOString()
}: AnalysisExportRequest): void {
  const file = createAnalysisExportFile({
    exportedAt,
    image: createExportImageMetadata(image),
    grid: createExportGridMetadata({
      offsetX: getGridOffsetX(),
      offsetY: getGridOffsetY(),
      cellSize: getGridCellSize()
    }),
    detections
  });

  downloadJsonFile(file.filename, file.payload);
}
