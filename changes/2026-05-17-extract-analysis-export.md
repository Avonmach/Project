# Extract analysis export payload

- Added `src/application/export-analysis/analysis-export.ts` for JSON export payload creation and best-match export formatting.
- Reduced `src/main.ts` export handling to timestamp creation, image/grid metadata, payload creation, and browser download.
- Kept the exported JSON shape equivalent while reusing one timestamp for both the payload and filename.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
