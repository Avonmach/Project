# Check reference HTTP status

## Summary

- Added HTTP status checks before parsing reference JSON.
- Failed static asset loads now report the reference path and HTTP status.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
