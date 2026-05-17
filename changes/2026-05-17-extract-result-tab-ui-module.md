# Extract result tab UI module

- Added `src/presentation/tabs/results-tabs.ts` for result-tab titles, tab validation, mode mapping, button click binding, and button/panel DOM selection state.
- Updated `src/main.ts` so tab UI synchronization no longer lives directly beside analysis and rendering logic.
- Kept app-level decisions in `src/main.ts`: active detection mode, table rendering, totals, and screenshot loading.
- This is the first step toward preventing tabs from directly mutating each other's DOM/data.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
