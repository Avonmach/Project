# Reuse reference record filter

## Summary

- Added a generic record guard type for reference JSON parsing.
- Reused a shared `filterRecords` helper for damaged artefacts, materials, recipes, and collections.
- Kept parsing behavior unchanged.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
