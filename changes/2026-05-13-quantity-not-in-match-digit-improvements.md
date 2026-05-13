# Quantity Removed From Match Line And Digit Reader Improved

Clarification:

- Quantity is not part of the artefact match calculation.
- The artefact match uses shape/color only.
- Removed `Quantity: ...` from the artefact match diagnostics to avoid implying it affects `Match`.

Why Match can be lower than Overlap and Color:

- `Overlap` is raw visible-pixel overlap.
- `Match` uses the weighted shape score plus color.
- Shape is not the same as raw overlap; it includes silhouette, edge, and descriptor penalties.
- Therefore `Match` can be lower than displayed `Overlap` and `Color`.

Number recognition changes:

- Quantity scan crop widened from `26x17` to `30x19`.
- Quantity preview updated to show the larger crop.
- Yellow pixel threshold loosened slightly.
- Detected digit pixels are expanded one pixel orthogonally for matching, helping broken strokes.
- Digit splitting now allows a one-column gap inside a digit.
- Digit scoring now uses stroke-overlap scoring instead of strict exact-cell equality.

Verification:

- `node --check app.js`
