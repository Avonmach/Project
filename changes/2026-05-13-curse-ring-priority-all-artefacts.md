# Curse Ring Priority Uses All Artefacts

Changed the former two-item candidate mode into a scoring mode.

Behavior now:

- The analyzer still compares every artefact in `data/damaged-artifacts.json`.
- `Curse/ring priority` only applies a small tie-break if `Curse tablet` or `Engraved ring of kinship` is already within `0.018` score of the best all-artifact match.
- This keeps all artefacts available while fixing close confusion cases for the two focused artefacts.

Verification:

- `node --check app.js`
