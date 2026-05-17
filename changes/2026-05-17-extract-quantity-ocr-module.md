# Extract quantity OCR module

- Added `src/domain/ocr/quantity-ocr.ts` for the typed quantity OCR flow.
- Moved quantity detection, yellow-pixel collection, digit-box splitting, digit matching, common OCR correction heuristics, quantity alternatives, and close-candidate review logic out of `src/main.ts`.
- Kept `src/main.ts` responsible for UI rendering and for attaching the copied source crop to OCR debug data.
- Kept digit template state outside the module and passed it into `detectQuantity()` so font loading behavior remains unchanged.
- Exported `isQuantityPixel()` because screenshot/background filtering still uses the same quantity text color rule.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
