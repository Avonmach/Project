# Storage material rectangle grid

## Summary

- Replaced Storage's use of the bank-grid estimator with a storage-specific material rectangle detector.
- The detector scans the whole storage screenshot, ignores quantity text and frame pixels, clusters material icon components into shared 44px row/column slots, and returns boxes for separated grids on both sides.
- Added focused tests for detecting material slot boxes across two separated storage grid regions.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
