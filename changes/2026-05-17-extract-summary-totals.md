# Extract summary totals renderer

- Added `src/presentation/renderers/summary-totals.ts` for slot count, total quantity, and manual correction count rendering.
- Reduced `src/main.ts` totals handling to delegating summary fields, then refreshing dependent panels.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
