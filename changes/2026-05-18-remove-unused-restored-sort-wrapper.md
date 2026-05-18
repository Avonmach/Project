# Remove unused restored sort wrapper

## Summary

- Removed the unused `sortRestoredRows` wrapper from `src/main.ts`.
- Removed the matching unused `sortRestoredRowsForMode` import.
- Kept material row sorting unchanged.

## Verification

- `npm.cmd run typecheck`
- `rg -n "sortRestoredRowsForMode|function sortRestoredRows" src/main.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
