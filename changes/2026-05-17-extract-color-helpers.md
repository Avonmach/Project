# Extract shared color helpers

- Added `src/domain/shared/color.ts` for `RgbColor`, `sameColor()`, `colorDistance()`, and `channelDistance()`.
- Moved `pixelColorAt()` into `src/infrastructure/image-processing/image-data.ts`.
- Updated `src/main.ts` to import those helpers instead of defining them in the legacy entry.
- Left domain-specific background and screenshot predicates in `src/main.ts` for now.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
