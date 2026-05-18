# Name reference data paths

## Summary

- Added constants for damaged artefact and archaeology reference JSON paths.
- Reused those constants as default loader arguments.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
