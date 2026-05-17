# Extract overview tab renderer

- Added `src/presentation/renderers/overview-tab.ts` for Overview tab rendering.
- Moved the Overview tab card/table orchestration and local quantity grouping out of `src/main.ts`.
- Kept shared DOM helpers and collection overview rendering injected from `src/main.ts` for now, so this stays a small behavior-preserving renderer split.
- This is the first tab renderer extracted after tab state/UI synchronization was separated.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response.
