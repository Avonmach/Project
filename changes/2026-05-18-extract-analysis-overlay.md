# Extract analysis overlay renderer

- Added `src/presentation/renderers/analysis-overlay.ts` for drawing detected boxes, content bounds, and infinity-symbol bounds over the preview canvas.
- Reduced `src/main.ts` overlay drawing to passing the canvas context, current image, and detected items.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
