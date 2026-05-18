# Recognition Pipeline

The current recognition code is structured around an application boundary in
`src/application/analyze-screenshot/`.

## Stable Boundary

- `recognition-ports.ts` defines replaceable ports for frame creation, quantity recognition, artefact matching, quantity debug enrichment, and preview creation.
- `analyze-screenshot.ts` coordinates the full screenshot pipeline through those ports.
- `analyze-detections.ts` turns prepared boxes into typed detection records.

## Current Implementations

- `src/infrastructure/image-processing/canvas-frame-source.ts` adapts the browser canvas into a recognition frame source.
- `src/infrastructure/image-processing/current-recognition-adapters.ts` adapts the current matcher, debug source, and preview factory to the pipeline ports.
- `src/main.ts` wires these adapters together and remains responsible for browser state, rendering, corrections, and export.

## Future Recognition Changes

When changing actual image recognition, prefer adding or swapping a port implementation instead of changing `main.ts`.

Good first targets:

- replace or improve `RecognitionFrameSource` for bank-grid and box detection experiments
- replace or improve `QuantityRecognizer` for OCR experiments
- replace or improve `ArtefactMatcher` for matching/fingerprint experiments

Keep `analyzeScreenshot()` behavior stable and expand tests in `tests/analyze-screenshot.test.ts` plus focused algorithm tests before changing recognition scoring.
