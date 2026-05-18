# Next session handoff

Date written: 2026-05-19

## Read first

Before continuing, read these files in this order:

1. `NEXT_SESSION_HANDOFF.md` - current status and tomorrow's storage focus.
2. `docs/recognition-pipeline.md` - recognition boundaries and extension points.
3. `docs/architecture-and-typescript-guidelines.md` - architecture rules and TypeScript guidance.
4. Latest `changes/2026-05-18-*.md` and `changes/2026-05-19-*.md` files for detailed checkpoints.
5. `PROJECT_NOTES.md` and `ARCHAEOLOGY_IMAGE_RECOGNITION.md` for older project context if needed.

## Current branch and save state

Branch: `Archeology`

Latest app/code commit before this handoff note:

- `f99cf86` Prepare storage two screenshot workflow

Recent relevant commits:

- `4e4b697` Review weak color artefact matches
- `50706b5` Remove green wash from theme
- `132a72d` Review artefacts by shape and color gaps
- `d0c909c` Align review counts and match sorting
- `456c544` Rename preview columns and restore clear hover

The tracked repo is saved, committed, and pushed. The only remaining untracked files are intentionally left untouched user/test images:

- `Infinity.png`
- `Items_Result.png`
- `Items_Result_First item.png`
- `Site_Image_2.png`
- `Testing/Image.png`
- `Testing/Image_Screenshot.png`
- `Testing/Wrong_Border.png`
- `Testing/reference-zero-8x4-8x5.png`
- `Testing/runescape-small-07-digits.png`

## Current app status

The project is a Vite + TypeScript frontend with vanilla DOM rendering. There is no React, Next.js, NestJS, or backend framework.

The app is currently running locally at:

```text
http://127.0.0.1:8080/
```

Last verification passed:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
(Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8080/).StatusCode
```

The local site returned `200`.

## What changed most recently

Artefact review:

- Review is no longer based on final calculated match score gap.
- Review now triggers when both top candidates are within `2%` shape gap and `2%` color gap.
- Review also triggers when the selected candidate color score is below `60%`.
- The same review rule is used by the initial matcher and by candidate prediction/correction.

Preview/UI:

- Reference/Result preview canvases paint the beige background directly, including magnification.
- Recognition info now includes `Shape` and labels final gap as `Score gap`.
- The decorative pale-green page wash was removed again.

Storage:

- Storage tab now expects two screenshots because the in-game storage window is scrollable.
- While Storage is active, the screenshot file input supports selecting multiple files.
- If one storage screenshot is already loaded, selecting one additional screenshot appends it as the second.
- Storage preview stacks uploaded screenshots vertically on the canvas.
- Storage no longer shows the full material reference list before analysis.
- After storage analysis, Storage only renders detected material names.
- Actual material image recognition is not implemented yet, so analysis currently completes with zero detected materials and shows the empty detected-materials message.

## Good next steps

Tomorrow's focus should be Storage recognition.

Recommended order:

1. Add storage-specific recognition modules instead of mixing material detection into artefact detection.
2. Define the storage screenshot frame/region detection for the two stacked screenshots.
3. Detect material rows/icons from both screenshots and merge duplicates.
4. Match detected material icons against `archaeologyReference.materials`.
5. Store detected storage material names/quantities in a dedicated storage state.
6. Render only detected storage materials in `storage-tab.ts`.
7. Add tests for storage state merging and material list rendering before adding fragile image logic.

Do not show the full material database in Storage. The user explicitly wants only detected materials after analysis.

## Working rules to preserve

- Keep changes incremental.
- Add one `changes/YYYY-MM-DD-*.md` note per meaningful checkpoint.
- Run `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build` before committing.
- Check the local site returns `200`.
- Commit and push each safe checkpoint to `origin Archeology`.
- Do not touch untracked user/test images unless explicitly asked.
