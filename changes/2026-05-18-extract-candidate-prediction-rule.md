# Extract candidate prediction rule

- Added `src/application/correct-detection/candidate-prediction.ts` for applying selected/top artefact candidate fields to detections.
- Reduced `src/main.ts` candidate prediction handling to applying the rule and updating the browser-rendered reference preview.
- Verified with `npm.cmd run typecheck`, `npm.cmd run build`, and a local Vite `200` response from `http://127.0.0.1:8080`.
