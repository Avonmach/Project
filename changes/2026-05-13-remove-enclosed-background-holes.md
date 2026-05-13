# Remove Enclosed Background Holes

Adjusted the binary shape step for ring-like artefacts.

Problem:

- The previous background removal only removed background connected to the outside of the grid area.
- Ring/circle artefacts can contain enclosed background in the middle.
- That enclosed background was treated as item shape.

Change:

- `makeFullShapeImageData` now removes the exact grid top-left background color everywhere, not only edge-connected regions.
- It still uses exact RGB matching, so similar item colors are not removed by tolerance.
- Quantity text is still removed.

Verification:

- `node --check app.js`
