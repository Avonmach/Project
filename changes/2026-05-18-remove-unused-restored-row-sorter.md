# Remove unused restored row sorter

## Summary

- Removed the unused restored row sorter and its row interface.
- Removed the now-unused `nullableNumber` import from result row sorting.
- Kept material row sorting unchanged.

## Verification

- `npm.cmd run typecheck`
- `rg -n "RestoredResultRow|sortRestoredRows|nullableNumber" src/application/sort-results/result-row-sorting.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
