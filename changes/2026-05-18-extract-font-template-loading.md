# Extract font template loading

## Summary

- Moved quantity font loading and fallback handling into browser infrastructure.
- Kept `src/main.ts` responsible only for assigning the loaded digit templates.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
