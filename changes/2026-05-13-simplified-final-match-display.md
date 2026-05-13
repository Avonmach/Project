# Simplified Final Match Display

Updated the results UI:

- Removed the `Shape vs reference` graphic panel.
- Removed extra matching percentages from the artefact row.
- Only the final score used for matching is shown: `match: NN%`.
- Scores below `75%` are marked in orange/bold and the row remains highlighted.
- Image and quantity columns are centered.
- Processed and reference previews now use the same white background and a small 2px border.
- The processed image now scales to a 40px centered icon area, matching the reference preview sizing.

Brightness:

- The processed image is still brightened at pixel draw time by 20% via `brightenChannel(..., 1.2)`.
- Manual correction thumbnails remain brightened by `filter: brightness(1.2)`.

Verification:

- `node --check app.js`
