# Extract reference correction rule

- Added `src/application/correct-detection/reference-correction.ts` for manual artefact correction mutation and correction metadata.
- Reduced `src/main.ts` reference correction handling to applying the rule, replacing the reference preview, and refreshing UI.
- Kept preview canvas creation in `src/main.ts` because it still depends on browser image rendering.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
