# Holdable quantity arrows and digit fixes

- Made quantity stepper arrows repeat while held, with an initial delay and fast repeat interval.
- Strengthened the `9 -> 3` quantity OCR correction using the latest `Quantity_Correction.json` patterns.
- Improved wide digit splitting by looking for low-density separator columns before falling back to fixed-width splitting.
- Added a targeted `6 -> 0` fallback for two-digit cases such as `26 -> 20`.
- Verified `app.js` with `node --check app.js` and confirmed the live server is serving the updated script.
