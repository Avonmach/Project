# Type original prediction

## Summary

- Added an `OriginalPrediction` interface for the detection record's initial match snapshot.
- Replaced the detection record `originalPrediction: unknown` field with the typed snapshot.

## Verification

- `npm.cmd run typecheck`
- `rg -n "originalPrediction: unknown" src`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
