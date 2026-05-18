# Type analysis export payload

## Summary

- Added `AnalysisExportPayload` for the JSON export structure.
- Added `ExportedBestMatch` for algorithm-best match summaries.
- Replaced `unknown` return types on export payload creation and best-match export.

## Verification

- `npm.cmd run typecheck`
- `rg -n "createAnalysisExportPayload.*unknown|exportBestMatch.*unknown" src/application/export-analysis/analysis-export.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
