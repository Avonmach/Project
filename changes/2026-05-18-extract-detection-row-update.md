# Extract detection row update renderer

- Added `src/presentation/renderers/detection-row-update.ts` for refreshing a detection row after verification or manual correction.
- Reduced `src/main.ts` row updates to delegating DOM mutation and then refreshing the restoration plan.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
