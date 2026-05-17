# Extract browser image loader

- Added `src/infrastructure/browser/image-loader.ts` for loading image elements from asset paths.
- Removed the local `loadImageElement` helper from `src/main.ts`.
- Kept screenshot loading in `src/main.ts` because it still updates app state and the preview canvas directly.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
