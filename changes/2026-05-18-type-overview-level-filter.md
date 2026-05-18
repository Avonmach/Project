# Type overview level filter

## Summary

- Replaced an `as number[]` cast in the overview tab renderer with a numeric type predicate.
- Kept the highest-level summary behavior unchanged.

## Verification

- `npm.cmd run typecheck`
- `rg -n "as number\\[]" src`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
