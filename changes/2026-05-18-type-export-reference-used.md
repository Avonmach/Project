# Type export reference used

## Summary

- Typed exported `referenceUsed` fields as the recognition mode union.
- Removed the remaining `referenceUsed?: unknown` export contract fields.

## Verification

- `npm.cmd run typecheck`
- `rg -n "referenceUsed\\?: unknown" src/application/export-analysis/analysis-export.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
