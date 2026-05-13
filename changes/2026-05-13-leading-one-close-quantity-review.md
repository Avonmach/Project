# Leading one and close quantity review

- Added a cautious leading-`1` fallback for two-digit quantities where OCR only detects one digit near the left edge.
- Marked quantity inputs orange when the top two quantity candidates differ by less than 3 percentage points.
- Included close quantity candidates in the existing row review logic until the quantity is manually checked.
- Verified `app.js` with `node --check app.js` and confirmed the live server is serving the updated script.
