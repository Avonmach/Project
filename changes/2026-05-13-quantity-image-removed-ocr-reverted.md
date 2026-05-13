# Quantity Image Removed And OCR Reverted

Changed per request:

- Removed the quantity debug image from the table.
- Removed the `makeQuantityCropCanvas` helper and related CSS.
- Reverted quantity recognition to the previous simpler logic:
  - scan area `26x17`
  - stricter yellow pixel threshold
  - digit split at gaps greater than 1 column
  - exact 3x5 template match scoring
  - occupancy threshold `0.18`

Font reference check:

- I searched for an official RuneScape 3 quantity/font reference.
- I did not find a confirmed official RS3 font asset/reference.
- The closest documented RuneScape-family source found was the OSRS Wiki font page, which lists `Plain 11` / cache `p11_full` for inventory item amounts.
- Added a code comment marking the current digit templates as placeholders to replace with an extracted RS3 font atlas if available.

Verification:

- `node --check app.js`

Sources:

- OSRS Wiki font page: https://oldschool.runescape.wiki/w/Font
