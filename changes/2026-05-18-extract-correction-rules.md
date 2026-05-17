# Extract correction rules

- Added `src/application/correct-detection/quantity-correction.ts` for quantity correction mutation and audit data.
- Added `src/application/correct-detection/verification.ts` for row verification mutation and correction metadata.
- Reduced `src/main.ts` correction handlers to applying the application rule and refreshing affected UI.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
