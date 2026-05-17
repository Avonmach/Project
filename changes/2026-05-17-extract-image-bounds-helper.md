# Extract image bounds helper

- Added `src/domain/shared/geometry.ts` for shared `PixelPoint` and `BoundingBox` types.
- Added `src/infrastructure/image-processing/image-data.ts` for the reusable `alphaBounds()` ImageData helper.
- Updated `src/main.ts` to import `alphaBounds()` instead of keeping it inside the legacy monolith.
- Updated `src/domain/ocr/digit-templates.ts` to reuse shared geometry types and the shared `alphaBounds()` helper.
- Preserved previous thresholds: screenshot/icon bounds use alpha `>= 40`; rendered font templates use alpha `>= 1`.
- Verified with `npm.cmd run typecheck` and `npm.cmd run build`.
