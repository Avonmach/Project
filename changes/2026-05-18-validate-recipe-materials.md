# Validate recipe materials

## Summary

- Tightened artefact recipe parsing so optional `materials` must contain material names and numeric quantities.
- Keeps invalid recipe records out of material calculations.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
