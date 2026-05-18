# Type unique assignment candidates

## Summary

- Added a shared `UniqueAssignmentItem` shape.
- Updated unique assignment selection to return the candidate type from each detection's own `topMatches`.
- Removed the candidate cast from `src/main.ts`.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
