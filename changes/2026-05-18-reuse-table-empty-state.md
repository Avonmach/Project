# Reuse table empty state

- Reused the existing `drawTableEmptyState` renderer for damaged-results empty rows.
- Removed duplicate empty row creation from `src/main.ts`.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
