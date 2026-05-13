# Reference click correction and quantity OCR revert

- Reverted quantity OCR templates to the previous compact 3x5 digit matching because the 5x7 change performed worse.
- Removed the separate reference-change icon column; clicking the reference image now opens the correction dropdown.
- Applied stronger brightness and saturation enhancement directly to the processed image pixels.
- Updated empty table column spans after removing the correction column.
- Verified `app.js` with `node --check app.js`.
