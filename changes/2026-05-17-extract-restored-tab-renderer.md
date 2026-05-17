# Extract restored tab renderer

- Added `src/presentation/renderers/restored-tab.ts` for Restored tab table rendering.
- Moved the Restored tab empty-state/table-body orchestration out of `src/main.ts`.
- Reused the existing detection row factory by injecting it from `src/main.ts`, keeping row behavior unchanged.
- Exported the generic table empty-state helper from the renderer module because the damaged table still uses it.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
