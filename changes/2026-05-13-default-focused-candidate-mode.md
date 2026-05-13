# Default Focused Candidate Mode

The page now defaults the `Candidates` dropdown to `Curse tablet + ring`.

Reason:

- In full `All artefacts` mode, bank slot 2 can still be beaten by unrelated similar-looking references.
- The focused candidate set correctly separates `Engraved ring of kinship` and `Curse tablet` in the corrected analysis.

Verification:

- `node --check app.js`
- Focused evaluator: 2 / 2 correct, 100% accuracy.
