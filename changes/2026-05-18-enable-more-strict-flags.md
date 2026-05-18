# Enable more strict TypeScript flags

## Summary

- Enabled `strictFunctionTypes`.
- Enabled `strictBindCallApply`.
- Enabled `strictPropertyInitialization`.
- Enabled `noImplicitThis`.
- Enabled `alwaysStrict`.

These flags passed without code changes after the earlier `noImplicitAny` and `strictNullChecks` cleanup.

## Verification

- `npm.cmd exec tsc -- --noEmit --strictFunctionTypes true`
- `npm.cmd exec tsc -- --noEmit --strictBindCallApply true`
- `npm.cmd exec tsc -- --noEmit --strictPropertyInitialization true`
- `npm.cmd exec tsc -- --noEmit --noImplicitThis true`
- `npm.cmd exec tsc -- --noEmit --alwaysStrict true`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
