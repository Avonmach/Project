# Storage handoff

Date: 2026-05-19

## Summary

Prepared the app for the Storage workflow.

Storage now expects two screenshots, because the RuneScape material storage window is scrollable in-game. The file input supports multiple files while Storage is active, and the preview canvas stacks the uploaded storage screenshots vertically.

The Storage tab no longer displays the complete material reference database before analysis. After analysis, it only renders material names that were detected by storage recognition.

## Current limitation

Actual storage material recognition is not implemented yet. The current storage analysis path marks storage analysis as complete but records no detected material names, so the Storage tab shows the empty detected-materials message.

## Next implementation target

Add a storage-specific recognition pipeline:

1. Segment material rows/icons from the two storage screenshots.
2. Match detected material icons against `archaeologyReference.materials`.
3. Merge duplicates across both screenshots.
4. Store detected material names and quantities in dedicated storage state.
5. Render only detected storage materials.

## Verification

Passed before handoff:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
(Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8080/).StatusCode
```

The local site returned `200`.
