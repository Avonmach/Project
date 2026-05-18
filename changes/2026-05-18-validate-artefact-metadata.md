# Validate artefact metadata

## Summary

- Added validation for damaged artefact archaeology level, culture, and dig site metadata.
- Keeps matching/filtering reference records aligned with their TypeScript shape.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
