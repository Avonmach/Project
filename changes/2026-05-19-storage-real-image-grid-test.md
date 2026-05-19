# Storage real image grid test

## Summary

- Added a dependency-free PNG test loader for real screenshot fixtures.
- Added a real-image storage grid test using `Material_1.png`, which now detects 25 material slots.
- Tightened storage material pixel detection so storage backgrounds do not merge into one large component.
- Storage grid boxes now infer independent row and column spacing, matching the shorter material storage rectangles instead of drawing square bank slots.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
