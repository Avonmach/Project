# Extract image copy and crop helpers

- Moved `copyImageData()` and `cropImageData()` from the legacy `src/main.ts` entry into `src/infrastructure/image-processing/image-data.ts`.
- Kept the helper behavior unchanged for fingerprinting, OCR debug source crops, and preview canvas rendering.
- Updated `src/main.ts` to import the helpers from the image-processing infrastructure module.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
