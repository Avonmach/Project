import {
  createAnalysisExportPayload,
  type AnalysisExportOptions,
  type AnalysisExportPayload,
  type ExportDetection
} from "./analysis-export";
import { createAnalysisExportFilename } from "./export-filename";

export interface AnalysisExportFile {
  readonly filename: string;
  readonly payload: AnalysisExportPayload;
}

export function createAnalysisExportFile<TDetection extends ExportDetection>(
  options: AnalysisExportOptions<TDetection>
): AnalysisExportFile {
  return {
    filename: createAnalysisExportFilename(options.exportedAt),
    payload: createAnalysisExportPayload(options)
  };
}
