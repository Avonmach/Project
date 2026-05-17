# Extract results state module

- Added `src/presentation/state/results-state.ts` to own active result tab, active detection mode, per-mode detection arrays, and one-time screenshot request flags.
- Updated `src/main.ts` to use the state object instead of loose `activeResultsTab`, `detectionsByMode`, and `screenshotRequestedTabs` globals.
- Kept the `detections` alias in `src/main.ts` temporarily to avoid changing all rendering/export call sites in one step.
- This reduces cross-tab coupling by keeping tab-owned state behind a single module API.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
