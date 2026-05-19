const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const requiredPaths = [
  "data",
  "runescape-small-07",
  "Damaged_Items.png",
  "Reference_Screenshot/Damaged_Artefacts.png",
  "Items#.png"
];

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

for (const relativePath of requiredPaths) {
  const source = path.join(ROOT, relativePath);
  if (!fs.existsSync(source)) {
    console.warn(`Skipping missing static asset: ${relativePath}`);
    continue;
  }

  copyRecursive(source, path.join(DIST, relativePath));
}
