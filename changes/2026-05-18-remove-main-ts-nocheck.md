# Remove main TypeScript suppression

## Summary

- Removed `// @ts-nocheck` from `src/main.ts`.
- Added typed DOM element/context guards for the main browser entry.
- Tightened reference-data and artefact-match field types used by detection records and exports.
- Added an app detection type for state while preserving table-rendered row elements.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
