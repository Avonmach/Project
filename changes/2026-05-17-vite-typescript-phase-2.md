# Vite and TypeScript phase 2 migration

- Added Vite and TypeScript project configuration.
- Changed `npm start` / `npm run dev` to run the Vite dev server.
- Kept the old static Node server available as `npm run serve:static`.
- Moved the browser entry from `app.js` to `src/main.ts`.
- Updated `index.html` to load `/src/main.ts` as a module.
- Added `scripts/copy-vite-static-assets.js` so production builds include local JSON, icon data, font assets, and default screenshots used by URL.
- Added a temporary `// @ts-nocheck` marker to `src/main.ts` because this phase preserves the legacy app behavior before extracting typed modules.
- Future TypeScript cleanup should remove `// @ts-nocheck` module by module as OCR, matching, image processing, and UI rendering are split into typed files.
