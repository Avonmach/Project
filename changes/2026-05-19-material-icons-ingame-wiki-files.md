# Material icons ingame wiki files

## Summary

- Changed the archaeology reference builder to prefer direct wiki file icons such as `File:Leather scraps.png` over HD `*_detail.png` thumbnails.
- Regenerated material icon assets from the in-game wiki file images.
- Removed the non-material `Materials (Archaeology)` category helper page from material recognition references.
- Verified `Leather scraps` now points at `https://runescape.wiki/images/Leather_scraps.png?...`.

## Verification

- `npm.cmd run build:archaeology-reference`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
