# Preserve OCR width

- Changed digit normalization to project detected foreground pixels into one output cell each instead of resampling overlapping ranges.
- Added a regression test for four-pixel-wide loop digits projected into five-column OCR references.
