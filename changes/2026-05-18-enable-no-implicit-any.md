# Enable noImplicitAny

## Summary

- Added explicit array/queue types in bank-grid image processing.
- Enabled `noImplicitAny` in `tsconfig.json`.
- Confirmed the project typechecks with the stricter compiler setting.

## Verification

- `npm.cmd exec tsc -- --noEmit --noImplicitAny true`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
