# Extract app detection type

## Summary

- Added an exported generic `DetectionRecord` type for analysis results.
- Made `createDetectionRecord` return `DetectionRecord` explicitly.
- Replaced the `main.ts` `ReturnType<typeof createDetectionRecord<...>>` app detection alias with the exported type.
- Tightened correction-related archaeology level types to numeric reference data.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
