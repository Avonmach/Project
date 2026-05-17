# Extract collection overview renderer

- Added `src/presentation/renderers/collection-overview.ts` for the matching collections section, sortable collection table, owned artefact map, and collection icon cells.
- Removed the collection overview helper cluster from `src/main.ts`.
- Kept `src/main.ts` responsible for collection sort state and passing the sort-change callback into the renderer.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
