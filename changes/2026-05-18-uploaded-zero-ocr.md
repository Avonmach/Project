# Uploaded zero OCR

- Tuned detected digit normalization to use density-based cells again so thick source strokes do not fill whole OCR columns.
- Added a regression test from the uploaded zero sample mask to keep the normalized `0` hollow.
- Kept narrow-width template scoring so four-column detections can still match compressed five-column references.
