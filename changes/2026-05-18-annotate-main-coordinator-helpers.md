# Annotate main coordinator helpers

## Summary

- Added explicit parameter and return types to `src/main.ts` coordinator helper functions.
- Added local typed wrappers where renderer callback contracts were wider than the app detection type.
- Kept behavior unchanged while reducing implicit `any` surfaces in the browser entry.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
