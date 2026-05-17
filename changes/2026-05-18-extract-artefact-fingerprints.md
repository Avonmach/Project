# Extract artefact fingerprint logic

- Added `src/domain/artefacts/fingerprint.ts` for reference fingerprints, screenshot/crop fingerprints, histogram scoring, descriptor comparison, and fingerprint comparison.
- Removed the fingerprint and histogram helper cluster from `src/main.ts`.
- Kept bank-grid background removal in `src/main.ts` for now because it still depends on grid detection and screenshot segmentation logic.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
