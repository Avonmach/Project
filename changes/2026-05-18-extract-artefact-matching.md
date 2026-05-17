# Extract artefact matching

- Added `src/domain/artefacts/matching.ts` for artefact scoring, shape/color weighting, ambiguity detection, and top candidate selection.
- Removed the scoring constants and matching implementation from `src/main.ts`.
- Kept `src/main.ts` responsible for passing loaded references into the matcher and building UI-facing detection records.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
