# First Three Shape Comparison

Added a visual comparison strip above the results table.

It shows the first three bank slots by position with:

- extracted screenshot shape mask
- selected reference shape mask
- shape match percentage
- selected reference name

Also aligned the displayed shape score to the selected reference type, so damaged-reference matches show the damaged shape score instead of the restored shape score.

Verification:

- `node --check app.js`
