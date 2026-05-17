# Extract quantity debug renderer

- Added `src/presentation/renderers/quantity-debug.ts` for OCR quantity debug rendering.
- Moved the debug details, source canvas, evaluated pixel canvas, and compared template grid rendering out of `src/main.ts`.
- Kept `src/main.ts` responsible for passing `detection.quantityDebug` into the presentation renderer.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
