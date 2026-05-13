# RuneScape 3 Archaeology Image Recognition

## Goal

Build a local program that analyses RuneScape 3 Archaeology screenshots and shows how many damaged artefacts are present.

The first milestone only covers the damaged artefact screenshot:

- Input image: `Damaged_Items.png`
- Output: a visible in-program list of damaged artefacts and their detected quantities
- Reference source: RuneScape Wiki artefact pages and inventory icon file pages

The other screenshots are kept for later milestones:

- `Items#.png`: repaired artefacts
- `Material_1.png`: material storage page 1
- `Material_2.png`: material storage page 2

## Reference Data

Use the RuneScape Wiki as the canonical source for artefact names and reference images.

Useful wiki pages:

- Damaged artefact suffix list: https://runescape.wiki/w/%28damaged%29
- Artefacts overview: https://runescape.wiki/w/Artefacts
- Example damaged artefact page: https://runescape.wiki/w/Amphora_%28damaged%29
- Example inventory image page: https://runescape.wiki/w/File%3AAmphora_%28damaged%29.png

Each damaged artefact should have a local reference record:

```json
{
  "name": "Amphora (damaged)",
  "wikiPage": "https://runescape.wiki/w/Amphora_%28damaged%29",
  "iconPage": "https://runescape.wiki/w/File%3AAmphora_%28damaged%29.png",
  "itemId": 49743,
  "state": "damaged"
}
```

## First Milestone

### Required Behaviour

1. Load `Damaged_Items.png`.
2. Split the screenshot into item slots.
3. Detect occupied slots.
4. For each occupied slot:
   - crop the item icon area
   - read the yellow stack quantity text, if present
   - default quantity to `1` if no number is visible
   - match the item icon against the local RuneScape Wiki reference icons
5. Show the result inside the program as a table:
   - artefact name
   - detected quantity
   - confidence score
   - cropped screenshot preview
6. Show a total damaged artefact count.

### Current Screenshot Notes

`Damaged_Items.png` appears to contain multiple damaged artefact icons with RuneScape stack numbers rendered in yellow. The image recognition should treat visible stack numbers as quantities and unnumbered occupied slots as quantity `1`.

The first implementation should report uncertain matches instead of guessing silently. A low-confidence row should be shown as `Unknown damaged artefact` with the cropped slot preview.

## Image Recognition Approach

### Slot Detection

Use the RuneScape bank grid instead of free-form object detection for the first version.

Recommended approach:

1. Estimate the bank grid spacing from repeated foreground bands.
2. Use fixed grid cells, currently detected as approximately `44 x 44` pixels in `Damaged_Items.png`.
3. Test each grid cell for occupied foreground pixels.
4. Remove the grey RuneScape background and yellow stack text from the occupied cell crop.
5. Normalize each cleaned crop to the same size as the wiki inventory icons.

This should be more reliable than general OCR/object detection because RuneScape inventory icons are small, pixel-art-like images.

### Quantity Detection

Stack quantities are yellow numbers drawn near the top-left of many icons.

Recommended approach:

1. Isolate yellow pixels using HSV or RGB thresholding.
2. Crop the number region above/near each icon.
3. Run OCR only on that small crop.
4. If OCR returns no number, use quantity `1`.

The OCR pipeline should be tested against examples in `Damaged_Items.png`, especially two-digit quantities such as `14`, `31`, and `32`.

### Icon Matching

Recommended matching pipeline:

1. Download or cache reference inventory icons from RuneScape Wiki file pages.
2. Convert screenshot crops and reference icons to a common format:
   - transparent/background-normalized PNG
   - same pixel dimensions or padded square canvas
   - same color mode
3. Compare using multiple signals:
   - perceptual hash
   - structural similarity
   - template matching
4. Pick the best match only if confidence is above a defined threshold.

## Program UI

The first UI can be simple but should be useful:

| Artefact | Quantity | Confidence | Preview |
| --- | ---: | ---: | --- |
| Amphora (damaged) | 2 | 0.94 | cropped slot |
| Unknown damaged artefact | 1 | 0.41 | cropped slot |

Required UI elements:

- image picker or fixed load button for `Damaged_Items.png`
- analyse button
- result table
- total damaged artefacts counter
- unknown/low-confidence section

## Acceptance Criteria

The first milestone is complete when:

- the program loads `Damaged_Items.png`
- occupied item slots are detected
- yellow stack quantities are read where present
- unnumbered occupied slots count as `1`
- detected items are displayed in the program
- total damaged artefact count is displayed
- unknown low-confidence matches are visible for manual review
- RuneScape Wiki reference icon metadata is stored or cached locally

## Later Milestones

1. Add repaired artefact recognition from `Items#.png`.
2. Add material recognition from `Material_1.png` and `Material_2.png`.
3. Compare damaged artefacts against available materials.
4. Show which artefacts can be repaired immediately.
5. Show missing materials per artefact.
6. Add export to CSV or JSON.
