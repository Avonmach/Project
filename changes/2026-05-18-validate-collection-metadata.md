# Validate collection metadata

## Summary

- Added optional string/null validation for collection collector and wiki fields.
- Added optional number/null validation for collection level and artefact count fields.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
