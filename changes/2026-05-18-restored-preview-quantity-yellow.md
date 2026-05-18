## Restored preview and quantity yellow

- Removed the framed background from Guess previews so restored artefacts do not show a grey rectangle inside another preview box.
- Expanded the masked Guess image to the full preview bounds after trimming transparent edges.
- Preserved original RGB values for OCR digit pixels in debug data and rendering.
- Tightened restored quantity detection so orange artefact pixels are not accepted as quantity text.
