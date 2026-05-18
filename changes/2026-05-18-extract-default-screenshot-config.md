# Extract default screenshot config

## Summary

- Moved default screenshot paths into `src/application/config/default-screenshots.ts`.
- Kept screenshot request flow in `src/main.ts`.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
