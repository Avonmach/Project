# Type export original prediction

## Summary

- Reused `OriginalPrediction` for the analysis export detection contract.
- Removed the export contract's `originalPrediction?: unknown` field.

## Verification

- `npm.cmd run typecheck`
- `rg -n "originalPrediction\\?: unknown" src/application/export-analysis/analysis-export.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
