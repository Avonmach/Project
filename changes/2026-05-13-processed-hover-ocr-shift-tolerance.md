# Processed hover zoom and quantity OCR tolerance

- Added the same hover magnification, brightness, and saturation behavior to processed images that already existed for screenshot images.
- Improved quantity OCR while keeping the previous 3x5 templates by adding one-pixel shift tolerance during template matching.
- Added a fallback splitter for unusually wide digit blobs so merged stack-number columns can still be read as separate digits.
- Checked online references and found RuneScape-family inventory amounts documented as `p11_full`; no official RS3 digit atlas was available locally.
- Verified `app.js` with `node --check app.js`.
