# Storage grid detection

## Summary

- Added a storage-specific analysis use case under `src/application/analyze-storage/`.
- Added a browser canvas storage frame source and storage recognition frame builder that reuse the existing bank grid detection mechanics for each uploaded storage screenshot.
- Storage Analyze now detects grid boxes in both storage screenshots, tracks them separately from artefact detections, and draws translated overlays on the side-by-side preview.
- Storage results now show a `Grid slots` summary count while material icon/name matching remains a later step.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
