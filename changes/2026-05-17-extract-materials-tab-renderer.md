# Extract materials tab renderer

- Added `src/presentation/renderers/materials-tab.ts` for Materials tab rendering.
- Moved Materials tab summary cards, empty states, and materials table orchestration out of `src/main.ts`.
- Kept recipe/material calculation and material cell rendering injected from `src/main.ts` for now because those helpers are still shared with Storage.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
