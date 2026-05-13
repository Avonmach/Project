# Per Slot Top Left Background Reference

Changed screenshot background detection to use the top-left pixel of each item crop as the background reference.

Updated behavior:

- Each slot/frame gets its own background reference from its top-left pixel.
- Shape crop bounds use that slot-specific background color.
- The 32x32 screenshot fingerprint uses that same slot-specific background color.
- The augmented preview removes background-like pixels connected to the crop edge using the top-left pixel reference.
- Quantity text and frame/scrollbar/bank-line pixels are still excluded from the shape mask.

Reason:

The fixed global background color did not match every slot after scaling/shading, while exact-only removal left too much background. Using the top-left pixel per frame makes the background reference local to the actual item cell.

Verification:

- `node --check app.js`
