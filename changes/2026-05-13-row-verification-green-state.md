# Row verification and corrected row state

- Fixed manual reference corrections so they also mark the row as manually checked, allowing corrected rows to turn light green.
- Made result rows clickable to verify that no artefact or quantity change is needed.
- Row verification clears the review border and quantity warning for that row and records the verification in exports with source `row-verified`.
- Verified `app.js` with `node --check app.js`.
