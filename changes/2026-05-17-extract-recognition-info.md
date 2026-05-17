# Extract recognition info renderer

- Added `src/presentation/renderers/recognition-info.ts` for match, overlap, color, and ambiguity gap display.
- Removed the unused `bestMatchLabel` helper from `src/main.ts`.
- Reduced `src/main.ts` recognition-info handling to delegating to the typed renderer.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
