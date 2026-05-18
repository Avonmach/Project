# Type analysis export arrays

## Summary

- Added named payload types for export quantity labels, training labels, candidate matches, and exported detections.
- Replaced remaining top-level `unknown[]` array fields in `AnalysisExportPayload`.
- Kept boundary fields such as raw boxes and scoring weights as `unknown` where the exported JSON intentionally preserves opaque data.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
