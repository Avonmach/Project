# Extract material calculations

- Added `src/application/calculate-materials/material-totals.ts` for typed material total calculation and restored artefact aggregation.
- Removed the material total and restored aggregation implementations from `src/main.ts`.
- Kept `src/main.ts` as the coordinator that supplies the recipe lookup map and quantity review predicate.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
