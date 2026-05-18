# Validate reference JSON shapes

## Summary

- Added lightweight parsing guards for damaged artefact and archaeology reference JSON.
- Replaced direct `response.json() as ...` casts in reference data loading.
- Invalid top-level reference files now fail with a clear path-specific error.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
