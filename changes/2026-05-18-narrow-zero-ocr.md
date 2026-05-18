# Narrow zero OCR

- Added narrow-width OCR scoring so a four-pixel-wide detected digit can be compared against compressed five-column references.
- Added a regression test that a four-pixel-wide zero is recognized as `0` instead of a `5`-like shape.
