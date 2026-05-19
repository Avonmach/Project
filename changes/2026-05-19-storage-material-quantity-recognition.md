# Storage material quantity recognition

## Summary

- Added prepared material references with fingerprints from archaeology material icons.
- Added a storage material matcher that compares storage slot crops against material reference fingerprints.
- Storage analysis now attaches material names, wiki pages, match scores, and OCR quantities to detected grid slots.
- Storage results now render detected material rows with merged quantities instead of only material names.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
