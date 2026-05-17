# Extract storage tab renderer

- Added `src/presentation/renderers/storage-tab.ts` for Storage tab rendering.
- Moved Storage tab summary cards, material reference table, and empty/help state orchestration out of `src/main.ts`.
- Kept material totals, material cells, links, and common DOM helpers injected from `src/main.ts` for now because they are shared with Materials.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
