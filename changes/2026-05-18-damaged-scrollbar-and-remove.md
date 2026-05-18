# Damaged scrollbar and remove action

- Tightened bank grid column counting so a narrow right-edge scrollbar strip is not treated as an extra artefact column.
- Made right scrollbar boundary detection use the shared frame/scrollbar pixel classifier.
- Added a damaged-only remove button that drops a detected artefact from the current damaged results and redraws the overlay.
