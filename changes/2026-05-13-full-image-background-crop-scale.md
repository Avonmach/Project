# Full Image Background Then Crop Scale

Started changing the screenshot shape pipeline to match the requested order:

1. Determine the bank grid.
2. Use the top-left pixel of the grid as the background reference.
3. Build one full-size binary shape image for the grid area.
4. Crop each item from that processed full image.
5. Crop to the shape alpha bounds.
6. Scale the cropped shape to the reference size.

The table headers were changed from raw-cell style debugging to step images:

- `BG removed`
- `Cropped shape`
- `Scaled shape`

Syntax check was run after the implementation pass.
