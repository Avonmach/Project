# Binary Shape Score

Changed the selected match score to use shape similarity only after switching the screenshot pipeline to binary shape images.

Reason:

- The new screenshot fingerprint is black/transparent binary shape data.
- Color histogram comparison against colored references is no longer meaningful for final ranking.
- Shape similarity now matches the displayed `Scaled shape` debug image.

Verification:

- `node --check app.js`
