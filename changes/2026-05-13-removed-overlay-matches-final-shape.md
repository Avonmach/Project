# Removed Overlay Matches Final Shape

Checked why the first-item background overlay looked correct while the cropped shape still lost interior areas.

Cause:

- The red overlay only showed background flood-fill removal.
- The binary shape pipeline also removed pixels matching the frame/scrollbar color rule.
- That rule can hit orange/gold item pixels inside artefacts, so the cropped shape could lose item interior pixels that were not marked red.

Change:

- The full-image binary shape now removes background and quantity text only.
- It no longer excludes `isFrameOrScrollbarPixel` inside the shape pipeline.
- The debug column was renamed to `Removed overlay`.
- The first-row overlay now marks every pixel removed from the final binary shape in red, so it matches what `BG removed` and `Cropped shape` use.

Verification:

- `node --check app.js`
