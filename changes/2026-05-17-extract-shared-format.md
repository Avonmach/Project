# Extract shared format helpers

- Added `src/domain/shared/format.ts` for `percent`, `nullableNumber`, and `normalizeName`.
- Updated `src/main.ts` and the quantity OCR debug renderer to import those typed helpers instead of carrying local copies.
- Refreshed `docs/architecture-and-typescript-guidelines.md` so the current state describes Vite + TypeScript and the existing extracted modules.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
