# Extract browser export

- Moved analysis export file creation and browser download wiring into `src/infrastructure/browser/analysis-export.ts`.
- Reduced `main.ts` to passing the current image and detections to the export boundary.
