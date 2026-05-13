# Screenshot Shape Uses Non Background Pixels

Changed screenshot shape extraction to use all non-background pixels instead of the stricter item-pixel filter.

Details:

- The crop bounds now use `isScreenshotShapePixel`.
- The screenshot fingerprint visible mask now uses `isScreenshotShapePixel`.
- The visual shape comparison therefore shows a filled silhouette for every pixel that is not the bank background grey.
- Yellow quantity pixels are still excluded so the stack number does not become part of the artefact shape.
- Frame, scrollbar, and bank-line pixels are still excluded.

The same rule was mirrored in `scripts/evaluate-recognition.ps1` so offline comparisons match the site.
