export function createAnalysisExportFilename(exportedAt: string): string {
  return `rs3-archaeology-analysis-${exportedAt.replace(/[:.]/g, "-")}.json`;
}
