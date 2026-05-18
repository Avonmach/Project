# Share artefact reference metadata

## Summary

- Added shared `ArtefactReferenceMetadata` under the artefact domain.
- Reused the metadata shape in reference data loading, reference preparation, and matching contracts.
- Reduced duplicated artefact reference field declarations across layers.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
