# Extract DOM element guards

## Summary

- Moved required DOM element and canvas context helpers from `src/main.ts` into browser infrastructure.
- Kept `main.ts` responsible for selecting the concrete app elements.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
