# Require finite reference numbers

## Summary

- Added a finite-number guard for reference JSON parsing.
- Applied it to optional numeric metadata and recipe material quantities.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
