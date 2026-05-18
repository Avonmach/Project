# Enable strict TypeScript

## Summary

- Enabled full `strict` TypeScript mode in `tsconfig.json`.
- Removed redundant individual strict sub-flags because `strict` now covers them.
- Kept existing guard flags such as `noFallthroughCasesInSwitch` and `noUncheckedSideEffectImports`.

## Verification

- `npm.cmd exec tsc -- --noEmit --strict true`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
