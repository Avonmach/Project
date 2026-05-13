# Quantity correction pattern tuning

- Used `Quantity_Correction.json` to identify repeated OCR mistakes, especially `7 -> 2` and `9 -> 3`.
- Added post-classification quantity OCR checks that demote `7` to `2` when middle and lower-left digit pixels match a two.
- Added checks that demote `9` to `3` when the left-side loop evidence is weak and the right side matches a three.
- Added a small `8 -> 6` correction because the saved quantity corrections included that pattern.
- Verified `app.js` with `node --check app.js`.
