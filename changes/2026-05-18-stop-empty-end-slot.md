# Stop empty end slot

- Removed the extra trailing grid-cell allowance after the last occupied bank slot.
- This prevents a final empty slot at the end of the detected grid from being emitted as an artefact row.
