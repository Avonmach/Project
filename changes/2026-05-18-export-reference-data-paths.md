# Export reference data paths

## Summary

- Exported the default damaged artefact and archaeology reference data paths.
- Keeps future tests or alternate data loaders from duplicating these path strings.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
