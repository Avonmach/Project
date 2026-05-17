# Extract detection filters

- Added `src/application/filter-detections/detection-filters.ts` for detection sorting and filter matching.
- Removed local sorted/filter helper implementations from `src/main.ts`.
- Added `prompt.md` with the original architecture cleanup prompt and current interpretation for future work.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
