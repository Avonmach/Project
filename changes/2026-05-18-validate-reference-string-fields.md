# Validate reference string fields

## Summary

- Added optional string/null validation for damaged artefact reference fields.
- Added optional string/null validation for material icon and wiki fields.
- Reused a small string/null guard in reference JSON parsing.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
