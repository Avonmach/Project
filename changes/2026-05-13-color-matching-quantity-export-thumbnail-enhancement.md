# Color matching, quantity export, and correction thumbnails

- Reworked color matching to use finer RGB bins plus hue and grey distribution checks so visibly different colors score lower.
- Kept the existing shape/color weighting flow, but exported selected color existence and color position scores for easier analysis.
- Added explicit quantity correction data to exports, including original detected value, final corrected value, confidence, and correction source.
- Applied the same brightness and saturation enhancement to manual correction thumbnails without adding hover magnification.
- Verified `app.js` with `node --check app.js`.
