# Simplified Processed Preview Column

Changed the results table per request.

Table changes:

- Removed the debug columns between `Quantity` and `Reference`.
- Added one `Processed` column.

The `Processed` image now shows:

1. Original item crop colors.
2. Background removed using the current binary shape mask.
3. Cropped to the remaining item alpha bounds.
4. Scaled to the reference preview size.
5. Brightened by 20%.

Manual correction dropdown:

- Damaged artefact thumbnails are brightened by 20% using `filter: brightness(1.2)`.

Verification:

- `node --check app.js`
