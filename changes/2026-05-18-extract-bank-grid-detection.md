# Extract bank grid detection

- Added `src/infrastructure/image-processing/bank-grid.ts` for bank grid estimation, occupied slot detection, content area detection, infinity-symbol bounds, component helpers, and grid metadata constants.
- Removed the bank/grid detection helper cluster from `src/main.ts`.
- Kept `src/main.ts` responsible for using the detected grid during analysis and export payload creation.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
