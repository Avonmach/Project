# Name archaeology reference records

## Summary

- Added named material, artefact recipe, and collection record interfaces.
- Updated `ArchaeologyReferenceData` to use the named records instead of inline object types.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
