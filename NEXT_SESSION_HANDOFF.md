# Next session handoff

Date written: 2026-05-18

## Read first

Before continuing, read these files in this order:

1. `prompt.md` - original cleanup prompt and the working interpretation.
2. `docs/architecture-and-typescript-guidelines.md` - architecture rules, TypeScript migration guidance, and framework decisions.
3. Latest `changes/2026-05-18-*.md` files - detailed record of today's extraction checkpoints.
4. `PROJECT_NOTES.md` and `ARCHAEOLOGY_IMAGE_RECOGNITION.md` if you need historical project context.

## Where we left off

Branch: `Archeology`

Latest pushed commit at handoff:

- `5a89108` Extract unique artefact assignments

The repo is clean except for these untracked image files, which have been intentionally left untouched:

- `Infinity.png`
- `Items_Result.png`
- `Items_Result_First item.png`
- `Site_Image_2.png`

## Current architecture

The project is a Vite + TypeScript frontend with vanilla DOM rendering. There is no React, Next.js, NestJS, or real backend.

`src/main.ts` still has `// @ts-nocheck`, but it is now mostly orchestration:

- startup and reference loading coordination
- screenshot loading
- analysis flow coordination
- building UI-facing detection records
- tab/render delegation
- correction callbacks
- export/download coordination
- canvas overlay delegation

Most logic has moved into typed modules:

- `src/domain/ocr/` - digit templates and quantity OCR
- `src/domain/artefacts/` - fingerprinting and artefact matching
- `src/domain/shared/` - color, format, geometry helpers
- `src/application/` - material totals, export payloads, filters, sorting, correction rules
- `src/infrastructure/` - image/data/browser loading and image processing
- `src/presentation/` - tabs, state, table/rendering modules

## What was finished today

Major extraction checkpoints pushed today:

- material cell rendering and row sorting
- correction rules
- reference correction rule
- analysis overlay renderer
- detection row update renderer
- table empty-state reuse
- artefact fingerprint logic
- bank grid detection
- shape mask processing
- artefact matching
- candidate prediction rule
- unique artefact assignment selection

Each checkpoint has a matching file under `changes/`.

## Verification status

The last completed verification passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode
```

The local site returned `200`.

## Good next steps

Continue with small, safe checkpoints:

1. Extract screenshot loading from `src/main.ts` into a browser/canvas infrastructure helper, while keeping app state updates in `main.ts`.
2. Extract the reference preparation flow from `loadReferences`, possibly into an application use case that loads images and attaches fingerprints.
3. Extract detection-record construction from `analyzeCurrentImage` into an application builder/factory.
4. After more typed boundaries exist, revisit removing `// @ts-nocheck` from `src/main.ts`.

Avoid big changes without asking:

- React or Next.js
- NestJS or backend framework
- data format changes in `data/*.json`
- OCR algorithm replacement
- broad UI redesign

## Working rules to preserve

- Keep changes incremental.
- Add one `changes/YYYY-MM-DD-*.md` note per meaningful checkpoint.
- Run `npm.cmd run typecheck` and `npm.cmd run build` before committing.
- Check the local site returns `200`.
- Commit and push each safe checkpoint to `origin Archeology`.
- Do not touch the untracked image files unless the user explicitly asks.
