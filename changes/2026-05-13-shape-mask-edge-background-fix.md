# Shape Mask Edge Background Fix

Fixed the black-square shape preview caused by exact-only background removal.

Reason:

- Exact-only removal kept shaded bank background pixels.
- The shape preview draws all remaining pixels black, so the whole slot could turn black.

New site behavior:

- Crop bounds and screenshot fingerprints remove only background-like pixels connected to the edge of the crop.
- Interior item pixels, including light grey and orange, are preserved.
- Quantity text and frame/scrollbar/bank-line pixels are still excluded from the shape mask.
- The augmented preview still removes only the exact fixed background color `rgb(48, 43, 38)`.

Verification:

- `node --check app.js`
