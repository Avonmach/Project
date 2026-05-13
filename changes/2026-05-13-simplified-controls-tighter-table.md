# Simplified Controls And Tighter Table

Updated the interface per request.

Removed controls:

- Scoring mode dropdown.
- Grid X/Y controls.
- Cell size control.
- Rows/columns controls.
- Reset grid button.

Moved:

- `View` selector moved from the main toolbar to a compact toolbar directly above the results table.

Code cleanup:

- Removed DOM references and listeners for deleted controls.
- Removed the unused `redrawCurrentGrid` helper.
- Grid functions now use fixed defaults/autodetection internally.

Table styling:

- Reduced table min-width from `1120px` to `940px`.
- Reduced cell padding from `9px 10px` to `6px 8px`.
- Reduced preview display size from `48px` to `44px`.
- Reduced quantity input and arrow button sizing.

Verification:

- `node --check app.js`
- local server returned HTTP 200 at `http://127.0.0.1:8080`
