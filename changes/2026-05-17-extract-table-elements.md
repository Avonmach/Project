# Extract shared table elements

- Added `src/presentation/renderers/table-elements.ts` for shared overview cards, empty messages, table headers, text cells, and linked text cells.
- Removed those generic DOM helper implementations from `src/main.ts`.
- Kept tab renderers receiving the same helper functions, so behavior stays unchanged while the presentation code is easier to share.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
