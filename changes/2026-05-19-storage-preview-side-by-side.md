# Storage preview side by side

## Summary

- Changed the Storage screenshot preview composition from vertical stacking to side-by-side placement.
- Added `calculateStoragePreviewLayout` under image-processing infrastructure so preview sizing and placement stay outside the main browser coordinator.
- Added focused tests for horizontal storage preview layout and the empty screenshot case.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
