# Extract screenshot loading

## Summary

- Moved browser image-file reading into `readImageFileAsDataUrl`.
- Moved image loading, canvas sizing, and canvas drawing into `loadImageToCanvas`.
- Kept screenshot state ownership, fallback UI messages, and analysis flow in `src/main.ts`.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
