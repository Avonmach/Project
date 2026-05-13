# Fixed Color Background Removal

Changed the background-color test from a tolerance around the bank grey to one exact RGB value.

New removed background color:

- `rgb(48, 43, 38)` only

Reason:

- The tolerance was also removing nearby colors, including lighter grey and orange pixels from item icons.
- The screenshot shape and augmented preview now keep any pixel that is not exactly `rgb(48, 43, 38)`, except quantity text and frame/scrollbar/bank-line exclusions in the shape mask.

Updated files:

- `app.js`
- `scripts/evaluate-recognition.ps1`

Verification:

- `node --check app.js`
- focused evaluator for `Curse tablet` and `Engraved ring of kinship`
