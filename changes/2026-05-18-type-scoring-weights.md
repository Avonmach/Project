# Type scoring weights

## Summary

- Added `ArtefactScoringWeights` in the artefact matching domain module.
- Reused the scoring-weight type in candidate prediction and analysis export contracts.
- Removed remaining `scoringWeights?: unknown` and `weights?: unknown` fields.

## Verification

- `npm.cmd run typecheck`
- `rg -n "scoringWeights\\?: unknown|weights\\?: unknown" src`
- `npm.cmd run build`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080 | Select-Object -ExpandProperty StatusCode`
