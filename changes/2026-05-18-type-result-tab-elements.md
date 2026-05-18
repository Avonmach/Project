# Type result tab elements

## Summary

- Updated result tab helpers to accept `HTMLElement` collections directly.
- Removed internal `as HTMLElement` casts from tab selection and tab button wiring.

## Verification

- `npm.cmd run typecheck`
- `rg -n "as HTMLElement" src`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
