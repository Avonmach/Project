# Storage single screenshot analysis

## Summary

- Let Storage Analyze run when at least one storage screenshot is loaded.
- Kept the screenshot counter as `uploaded/required`, but removed the UI blocker that hid grid results until both screenshots were uploaded.
- This makes one combined storage sample, such as `Storage_Grid.png`, show detected grid slots immediately.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
