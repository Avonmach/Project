# Color Existence Position Fallback And Quantity Warning

Updated color matching and quantity warnings.

Color recognition:

- Base color score is still color existence/distribution via histogram.
- If many references are still color-similar, the color score becomes:
  - `75%` color existence/distribution
  - `25%` color position verification
- Color-position verification uses the positional color score from the fingerprint comparison.
- Similar color trigger: at least 5 references within `0.03` of the best color-existence score.
- Export now includes `colorExistenceScore`, `colorPositionScore`, and detailed color weights.

Quantity warning:

- If quantity is not `1` and quantity confidence is below `90%`, the quantity field becomes bold red.
- Those rows are also marked for review.

Verification:

- `node --check app.js`
