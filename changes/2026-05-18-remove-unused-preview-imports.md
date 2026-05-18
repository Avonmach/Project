# Remove unused preview imports

## Summary

- Removed unused preview canvas imports from `src/main.ts`.
- Kept active slot, processed, and reference preview rendering unchanged.

## Verification

- `npm.cmd run typecheck`
- `rg -n "makeBackgroundRemovedCanvas|makeCroppedShapeCanvas|makeRemovedOverlayCanvas|makeScaledShapeCanvas|makeShapeMaskCanvas" src/main.ts`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
