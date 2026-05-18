# Type export detection fields

## Summary

- Typed exported detection boxes as `BoundingBox`.
- Typed exported quantity alternatives as `QuantityAlternative[]`.
- Typed exported quantity corrections with the quantity correction contract.
- Removed matching `unknown` fields from analysis export detection contracts.

## Verification

- `npm.cmd run typecheck`
- `rg -n "box: unknown|quantityAlternatives\\?: unknown|quantityCorrection\\?: unknown" src/application/export-analysis/analysis-export.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
