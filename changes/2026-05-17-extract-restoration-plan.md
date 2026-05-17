# Extract restoration plan renderer

- Added `src/presentation/renderers/restoration-plan.ts` for visible quantity, review count, highest-level summary, and plan table rendering.
- Moved `makePlanTable` into `src/presentation/renderers/table-elements.ts` so both the overview tab and restoration plan can share it.
- Reduced `src/main.ts` restoration-plan handling to passing DOM targets, detections, and the review predicate.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
