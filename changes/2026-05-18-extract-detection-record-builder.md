# Extract detection record builder

## Summary

- Added `createDetectionRecord` for the analysis result object built from a match, quantity result, slot box, and preview nodes.
- Kept DOM preview canvas creation in `src/main.ts`.
- Reduced `analyzeCurrentImage` by moving the large detection object literal into a typed application module.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
