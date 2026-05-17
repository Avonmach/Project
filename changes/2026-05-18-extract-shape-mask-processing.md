# Extract shape mask processing

- Added `src/infrastructure/image-processing/shape-mask.ts` for full-slot shape mask creation, cell background sampling, and restored-mode similar-background removal.
- Removed the shape mask/background segmentation helper cluster from `src/main.ts`.
- Kept `src/main.ts` responsible for calling the mask builder as part of screenshot analysis.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
