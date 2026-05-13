# Exact Top Left Background Removal

Checked why item colors were removed in the full-image background step.

Cause:

- The background flood fill used a tolerance around the top-left grid pixel.
- Connected item pixels with nearby colors could be removed even though they were not the actual background color.

Change:

- `connectedGridBackgroundMask` now removes only pixels whose RGB exactly matches the grid top-left background pixel.
- Removed the fuzzy `isBackgroundLikePixel` helper from the live app path.

Verification:

- `node --check app.js`
