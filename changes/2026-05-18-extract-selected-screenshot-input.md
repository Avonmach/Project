# Extract selected screenshot input

- Moved selected image file reading and screenshot load error handling into `src/infrastructure/browser/selected-screenshot-input.ts`.
- Kept `main.ts` responsible only for providing the current image-loading and empty-state callbacks.
