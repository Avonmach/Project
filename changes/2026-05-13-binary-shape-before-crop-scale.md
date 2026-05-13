# Binary Shape Before Crop And Scale

Changed screenshot shape calculation to follow this order:

1. Copy the item slot crop.
2. Use the crop top-left pixel as the local background reference.
3. Remove edge-connected background-like pixels.
4. Turn every remaining non-background artefact pixel black.
5. Crop the black binary shape to its alpha bounds.
6. Scale that binary crop to the 32x32 reference size with smoothing disabled.
7. Build the screenshot fingerprint from that binary shape.

The `Augmented` preview now shows this same binary shape image, so the visible debug image matches what recognition uses.

Still excluded from the binary shape:

- yellow quantity text
- frame/scrollbar/bank-line pixels

Verification:

- `node --check app.js`
