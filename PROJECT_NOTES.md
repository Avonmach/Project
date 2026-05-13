# Project Notes

## Current Scope

This project is a local RuneScape 3 Archaeology Analyzer. It serves a browser UI with `npm start`, loads bank/inventory screenshots, detects damaged artefact slots, compares item crops against local RuneScape Wiki reference icons, reads yellow stack quantities, and exports analysis JSON for review.

## Important Files

- `app.js` contains the browser-side detection, artefact matching, quantity OCR, correction UI, and export logic.
- `server.js` serves the local static app on port 8080.
- `data/damaged-artifacts.json` is the damaged artefact database.
- `data/reference-icons/` contains downloaded reference icons used for matching.
- `Damaged_Items.png` is the current main damaged artefact screenshot.
- `rs3-archaeology-analysis-2026-05-13T16-51-44-794Z.json` is an earlier analyzer export.
- `Corrected_Analysis.json` contains corrected artefact analysis data.
- `Quantity_Correction.json` contains manual quantity correction data.
- `corrected-analysis.html` is a static report/viewer for corrected analysis.

## Quantity OCR Notes

The current `app.js` quantity reader does not contain a special correction that rewrites two-digit numbers starting with `1`. It detects digits, joins them into text, and parses the result with `Number.parseInt`.

The current per-digit quantity heuristics in `adjustCommonQuantityMistakes()` handle these cases:

- `7` can be corrected to `2`
- `9` can be corrected to `3`
- `6` can be corrected to `0`
- `8` can be corrected to `6`

Quantity values with low confidence or close alternatives are marked for review in the UI.

## Saving Future Reference

Use git commits as checkpoints after meaningful changes:

```powershell
git status --short
git add .
git commit -m "Describe the checkpoint"
```

For larger investigation steps, add notes here or in a dated markdown file under `changes/` before committing.
