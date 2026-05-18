# Validate collection artefacts

## Summary

- Tightened archaeology collection JSON parsing so `artefacts` must be an array of strings.
- Preserved existing filtering behavior for invalid collection records.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
