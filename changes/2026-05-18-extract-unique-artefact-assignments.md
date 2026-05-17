# Extract unique artefact assignments

- Added `src/application/correct-detection/unique-artefact-assignments.ts` for choosing non-duplicate artefact candidates by confidence.
- Removed the local artefact key helper and unique-selection loop from `src/main.ts`.
- Kept `src/main.ts` responsible for applying the selected candidate because that still updates the reference preview canvas.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
