# Extract preview canvas renderers

- Added `src/presentation/renderers/preview-canvases.ts` for slot previews, processed previews, clean/background overlay previews, cropped shape previews, reference previews, and fingerprint masks.
- Moved `getIconMatchBox` into `src/domain/shared/geometry.ts` because both matching logic and preview rendering use the same icon crop box.
- Removed the preview canvas helper block and local `PREVIEW_SIZE` constant from `src/main.ts`.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
