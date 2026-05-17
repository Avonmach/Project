# Extract detection row renderer

- Added `src/presentation/renderers/detection-row.ts` for shared damaged/restored detection table row rendering.
- Moved row construction, row status pill rendering, review-row class logic, quantity steppers, and row interactive-target handling out of `src/main.ts`.
- Kept correction dropdowns, recognition text, OCR debug views, verification, and quantity mutation injected from `src/main.ts` so this extraction stays behavior-preserving.
- Left small wrapper functions in `src/main.ts` for status and row class handling because existing update paths still call them.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
