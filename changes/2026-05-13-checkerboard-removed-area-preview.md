# Checkerboard Removed Area Preview

The white areas in `BG removed`, `Cropped shape`, and `Scaled shape` were the CSS/canvas background showing through transparent pixels.

Change:

- Updated debug preview CSS to use a checkerboard background for processed shape previews.
- This makes transparent/removed pixels visibly different from actual white pixels.
- No recognition data path changed.

Verification:

- `node --check app.js`
