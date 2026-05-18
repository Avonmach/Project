# Inline font template assignment

## Summary

- Removed the trivial `loadQuantityFontTemplates` wrapper from `src/main.ts`.
- Assigned browser-loaded digit templates directly during initialization.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
