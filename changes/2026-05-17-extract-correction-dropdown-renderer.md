# Extract correction dropdown renderer

- Added `src/presentation/renderers/correction-dropdown.ts` for reference correction dropdown/search rendering.
- Moved correction details, lazy-loaded correction panel, best-match/all-reference list rendering, search filtering, sorting, and correction option buttons out of `src/main.ts`.
- Kept reference data and the mutation callback injected from `src/main.ts`, so manual correction behavior remains centralized there.
- Removed the dead leftover correction dropdown function from `src/main.ts`.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
