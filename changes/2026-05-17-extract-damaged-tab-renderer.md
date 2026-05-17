# Extract damaged tab renderer

- Added `src/presentation/renderers/damaged-tab.ts` for Damaged tab table rendering.
- Moved damaged table body orchestration and damaged-tab empty states out of `src/main.ts`.
- Kept row construction and generic empty-state drawing injected from `src/main.ts` so this remains a small behavior-preserving change.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
