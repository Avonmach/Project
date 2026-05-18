# Extract reference preparation

## Summary

- Added `prepareArtefactReferences` to load reference icon images and attach restored/damaged fingerprints.
- Kept `src/main.ts` responsible for reference state assignment and UI count updates.
- Removed stale fingerprint imports from `src/main.ts`.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
