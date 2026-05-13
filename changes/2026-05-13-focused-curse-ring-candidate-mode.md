# Focused Curse Ring Candidate Mode

Changed the live analyzer to support a candidate set dropdown:

- `All artefacts`: existing full database matching.
- `Curse tablet + ring`: restricts recognition candidates to `Curse tablet` and `Engraved ring of kinship`.

Focused evaluator result with both labels and both candidates restricted:

- Correct: 2 / 2
- Accuracy: 100%

Reasoning:

- With all 219 references, `Engraved ring of kinship` ranks 1st.
- With all 219 references, `Curse tablet` ranks 8th, but its score is very close to the top spell/tablet-like icons.
- When only these two artefacts are candidates, both are separated clearly by the current damaged-reference histogram + shape score.
