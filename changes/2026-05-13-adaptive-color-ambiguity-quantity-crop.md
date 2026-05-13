# Adaptive Color Ambiguity Quantity Crop

Updated scoring and diagnostics.

Adaptive scoring:

- Normal score remains `80% shape + 20% color`.
- Crowded shape case now uses `40% shape + 60% color`.
- A crowded shape case means at least 5 references are within `0.015` of the best shape score.

Ambiguity marking:

- Rows are no longer marked just because final match is below 75%.
- Rows are marked only when the top final scores are still close after adaptive color weighting.
- Ambiguous threshold: best score gap to the next candidate is `<= 0.025`.
- The row text now shows `Gap` only for ambiguous rows.

Quantity debugging:

- Added a small quantity crop preview under the quantity stepper.
- The crop is the same top-left number area used by quantity detection, scaled up with pixelated rendering.

Export:

- Added `ambiguousMatch` and `matchGap` fields to detection exports.

Verification:

- `node --check app.js`
