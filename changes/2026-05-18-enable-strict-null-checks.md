# Enable strictNullChecks

## Summary

- Added a shared `DetectionCorrection` type for manual and row-verified corrections.
- Updated correction, export, detection-row, correction-dropdown, and restoration-plan types to reflect nullable JSON data.
- Added a guard before drawing overlays when no image is loaded.
- Enabled `strictNullChecks` in `tsconfig.json`.

## Verification

- `npm.cmd exec tsc -- --noEmit --strictNullChecks true`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
