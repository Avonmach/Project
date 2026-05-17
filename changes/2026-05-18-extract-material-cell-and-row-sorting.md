# Extract material cell and row sorting

- Added `src/presentation/renderers/material-cell.ts` for material icon/link cell rendering.
- Added `src/application/sort-results/result-row-sorting.ts` for restored artefact and material row ordering by the active view mode.
- Reduced `src/main.ts` material rendering and row sorting to small delegating wrappers.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
