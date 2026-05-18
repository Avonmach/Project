# Tighten presentation callback types

## Summary

- Replaced `unknown[]` callback return types in materials and storage tab renderer options.
- Added small row interfaces for restored artefact summaries and material needs.
- Kept renderer behavior unchanged.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
- `rg -n "@ts-|\bany\b" src tsconfig.json`
