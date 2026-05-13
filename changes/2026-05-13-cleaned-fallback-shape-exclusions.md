# Cleaned Fallback Shape Exclusions

Cleaned the remaining fallback screenshot shape helper so it also keeps frame/gold-colored pixels if they are not background or quantity text.

Main path was already changed in the previous step; this keeps helper behavior consistent.

Verification:

- `node --check app.js`
