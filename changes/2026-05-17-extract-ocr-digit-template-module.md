# Extract OCR digit template module

- Added `src/domain/ocr/digit-templates.ts` as the first typed domain module after the Vite/TypeScript migration.
- Moved fallback digit templates, font-template rendering, digit normalization, template-width handling, and shifted-template scoring out of the legacy `src/main.ts` entry.
- Kept the higher-level quantity OCR flow in `src/main.ts` for now so behavior remains unchanged.
- Preserved variable-width templates: most digits compare as `8x5`; thin `1` and `4` compare as `8x4`.
- Verified with `npm.cmd run typecheck` and `npm.cmd run build`.
