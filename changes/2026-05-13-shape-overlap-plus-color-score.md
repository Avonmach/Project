# Shape Overlap Plus Color Score

Added a 20% color component to the final matcher while keeping the new binary shape/overlap system as the main signal.

Final score now:

- `80%` binary shape score
- `20%` color histogram score

Color calculation:

- Uses the original screenshot crop.
- Uses the binary shape mask to keep only item pixels.
- Removes background and ring holes because they are not in the shape mask.
- Compares the remaining item colors against restored/damaged reference histograms.

Debug/export changes:

- Recognition info now shows selected `color` score and best color match.
- Export includes `selectedColor`, `algorithmBest.color`, and top-match `colorScore`.

Verification:

- `node --check app.js`
