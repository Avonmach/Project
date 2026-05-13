# First Item Background Overlay

Added a `BG overlay` debug column.

Behavior:

- Only the first detected item shows an overlay image.
- Pixels classified as background by the current full-image grid background mask are marked red.
- Other rows show `-` to keep the table compact.

Purpose:

This makes it clear whether pixels are actually being detected as background, rather than just appearing white/transparent in the debug preview.

Verification:

- `node --check app.js`
