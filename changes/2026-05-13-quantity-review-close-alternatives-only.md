# Quantity review close alternatives only

- Changed quantity review marking so alternatives control the warning state.
- A quantity is now marked for review only when the top two quantity alternatives are within `3` percentage points.
- Removed the separate review trigger for non-`1` quantities below `90%` OCR confidence, because it marked values even when the next alternative was farther away.
