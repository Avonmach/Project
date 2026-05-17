# Extract reference data loaders

- Added `src/infrastructure/data/reference-data.ts` for fetching damaged artefact records and archaeology reference data.
- Removed direct reference JSON fetches from `src/main.ts`.
- Kept image fingerprinting and reference map construction in `src/main.ts` for now because they still depend on the current matching implementation.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
