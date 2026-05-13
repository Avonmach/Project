# Unique Artefacts Adaptive Color Brightness

Implemented the requested matching/UI changes.

Uniqueness:

- Added a post-pass over detections so the same restored artefact is not assigned to multiple bank slots.
- Higher final-score detections keep their match first.
- Later duplicate detections are assigned their next-best unused candidate from the top matches.

Links:

- Low-confidence matches now still keep their wiki link instead of becoming unlinked `Unknown damaged artefact` rows.
- Low scores are still visibly marked below 75%.

Brightness:

- Processed preview brightness increased from 20% to 45%.
- Manual correction thumbnails increased from `brightness(1.2)` to `brightness(1.45)`.

Scoring:

- Normal score remains mostly shape: `80% shape + 20% color`.
- If many references have nearly the same shape score, scoring switches to `60% shape + 40% color` for that item.
- Crowding threshold: at least 5 references within 0.015 of the best shape score.
- Export now includes scoring weights on detections/top matches.

Verification:

- `node --check app.js`
