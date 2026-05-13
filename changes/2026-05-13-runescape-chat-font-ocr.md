# RuneScape chat font OCR templates

- Extracted `runescape-chat-font.otf.zip` into `runescape-chat-font/`.
- Added startup loading for `runescape-chat-font/runescape-chat-font.otf`.
- Generate quantity OCR digit templates from the loaded font in the browser, with the previous hard-coded templates as a fallback.
- Preserved the included font license and readme files.
- Verified `app.js` with `node --check app.js` and confirmed the live server serves both the updated script and the font file.
