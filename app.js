const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const imageInput = document.getElementById("imageInput");
const loadDefaultButton = document.getElementById("loadDefault");
const analyzeButton = document.getElementById("analyze");
const viewMode = document.getElementById("viewMode");
const exportResultsButton = document.getElementById("exportResults");
const resultsBody = document.getElementById("resultsBody");
const restoredResultsBody = document.getElementById("restoredResultsBody");
const slotCountEl = document.getElementById("slotCount");
const quantityTotalEl = document.getElementById("quantityTotal");
const manualCountEl = document.getElementById("manualCount");
const referenceCountEl = document.getElementById("referenceCount");
const visibleCountEl = document.getElementById("visibleCount");
const reviewCountEl = document.getElementById("reviewCount");
const highestLevelEl = document.getElementById("highestLevel");
const planBody = document.getElementById("planBody");
const artefactSearch = document.getElementById("artefactSearch");
const cultureFilter = document.getElementById("cultureFilter");
const reviewOnly = document.getElementById("reviewOnly");
const resultsTitle = document.getElementById("resultsTitle");
const resultTabButtons = [...document.querySelectorAll("[data-results-tab]")];
const resultTabPanels = [...document.querySelectorAll("[data-results-panel]")];
const overviewPanel = document.getElementById("overviewPanel");
const storagePanel = document.getElementById("storagePanel");
const materialsPanel = document.getElementById("materialsPanel");

const MATCH_SIZE = 32;
const PREVIEW_SIZE = 48;
const BANK_CELL_SIZE = 44;
const BANK_GRID_SHIFT_X = 0;
const BANK_GRID_SHIFT_Y = 0;
const LOW_CONFIDENCE = 0.6;
const REVIEW_CONFIDENCE = 0.75;
const DAMAGED_FALLBACK_CONFIDENCE = 0.6;
const SHAPE_SCORE_WEIGHT = 0.8;
const COLOR_SCORE_WEIGHT = 0.2;
const CROWDED_SHAPE_COLOR_WEIGHT = 0.6;
const SHAPE_CROWD_MARGIN = 0.015;
const SHAPE_CROWD_COUNT = 5;
const AMBIGUOUS_FINAL_MARGIN = 0.025;
const COLOR_POSITION_WEIGHT = 0.25;
const COLOR_SIMILAR_MARGIN = 0.03;
const QUANTITY_REVIEW_MARGIN = 0.03;
const PREVIEW_BRIGHTNESS = 1.45;
let loadedImage = null;
let detections = [];
const detectionsByMode = {
  damaged: [],
  restored: []
};
let references = [];
let archaeologyReference = { materials: [], artefactRecipes: [], collections: [] };
let recipeByRestoredName = new Map();
let materialByName = new Map();
let activeResultsTab = "damaged";
const screenshotRequestedTabs = new Set();
let collectionSort = { key: "progress", direction: "desc" };

const DIGIT_TEMPLATE_WIDTH = 3;
const DIGIT_TEMPLATE_HEIGHT = 5;
const FALLBACK_DIGIT_TEMPLATES = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"]
};
let digitTemplates = FALLBACK_DIGIT_TEMPLATES;
const RESULT_TAB_TITLES = {
  overview: "Overview",
  damaged: "Damaged Artefacts",
  restored: "Restored Artefacts",
  storage: "Storage",
  materials: "Materials"
};

loadDefaultButton.addEventListener("click", () => imageInput.click());
analyzeButton.addEventListener("click", analyzeCurrentImage);
viewMode.addEventListener("change", renderDetections);
artefactSearch.addEventListener("input", renderDetections);
cultureFilter.addEventListener("change", renderDetections);
reviewOnly.addEventListener("change", renderDetections);
for (const button of resultTabButtons) {
  button.addEventListener("click", () => setActiveResultsTab(button.dataset.resultsTab));
}
document.addEventListener("click", (event) => {
  for (const menu of document.querySelectorAll(".correction-menu[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
exportResultsButton.addEventListener("click", exportResults);
imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadImageFromUrl(reader.result);
  reader.readAsDataURL(file);
});

initialize();

async function initialize() {
  analyzeButton.disabled = true;
  drawEmptyState("Loading reference database.");
  await loadQuantityFontTemplates();
  await loadReferences();
  await loadArchaeologyReference();
  await loadImageFromUrl("Damaged_Items.png");
  analyzeButton.disabled = false;
  drawEmptyState("Image and references loaded. Click Analyze.");
}

async function loadQuantityFontTemplates() {
  if (!("FontFace" in window)) return;
  try {
    const face = new FontFace("RunescapeQuantityOCR", "url('runescape-chat-font/runescape-chat-font.otf')");
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
    digitTemplates = buildDigitTemplatesFromFont("RunescapeQuantityOCR");
  } catch (error) {
    console.warn("Using fallback quantity OCR templates.", error);
    digitTemplates = FALLBACK_DIGIT_TEMPLATES;
  }
}

function buildDigitTemplatesFromFont(fontFamily) {
  const templates = {};
  for (let digit = 0; digit <= 9; digit += 1) {
    templates[digit] = renderDigitTemplate(String(digit), fontFamily);
  }
  return templates;
}

function renderDigitTemplate(digit, fontFamily) {
  const scale = 6;
  const source = document.createElement("canvas");
  source.width = DIGIT_TEMPLATE_WIDTH * scale;
  source.height = DIGIT_TEMPLATE_HEIGHT * scale;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  sourceCtx.clearRect(0, 0, source.width, source.height);
  sourceCtx.fillStyle = "#fff200";
  sourceCtx.textBaseline = "top";
  sourceCtx.font = `${source.height}px ${fontFamily}`;
  sourceCtx.fillText(digit, -1, -2);

  const imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
  const bounds = alphaBounds(imageData);
  if (!bounds) return FALLBACK_DIGIT_TEMPLATES[digit];

  const normalized = document.createElement("canvas");
  normalized.width = DIGIT_TEMPLATE_WIDTH;
  normalized.height = DIGIT_TEMPLATE_HEIGHT;
  const normalizedCtx = normalized.getContext("2d", { willReadFrequently: true });
  normalizedCtx.imageSmoothingEnabled = true;
  normalizedCtx.clearRect(0, 0, normalized.width, normalized.height);
  normalizedCtx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, DIGIT_TEMPLATE_WIDTH, DIGIT_TEMPLATE_HEIGHT);
  const normalizedData = normalizedCtx.getImageData(0, 0, DIGIT_TEMPLATE_WIDTH, DIGIT_TEMPLATE_HEIGHT).data;
  const rows = [];
  for (let y = 0; y < DIGIT_TEMPLATE_HEIGHT; y += 1) {
    let row = "";
    for (let x = 0; x < DIGIT_TEMPLATE_WIDTH; x += 1) {
      const offset = (y * DIGIT_TEMPLATE_WIDTH + x) * 4;
      row += normalizedData[offset + 3] > 30 ? "1" : "0";
    }
    rows.push(row);
  }
  return rows;
}

async function loadReferences() {
  const response = await fetch("data/damaged-artifacts.json");
  const database = await response.json();
  const items = database.items.filter((item) => item.icon);

  references = await Promise.all(
    items.map(async (item) => {
      const image = await loadImageElement(`data/${item.icon}`);
      const damagedImage = item.damagedIcon ? await loadImageElement(`data/${item.damagedIcon}`) : null;
      const fingerprint = fingerprintReference(image);
      const damagedFingerprint = damagedImage ? fingerprintReference(damagedImage) : null;
      return { ...item, image, fingerprint, damagedImage, damagedFingerprint };
    })
  );

  referenceCountEl.textContent = String(references.length);
}

async function loadArchaeologyReference() {
  try {
    const response = await fetch("data/archaeology-reference.json");
    archaeologyReference = await response.json();
    recipeByRestoredName = new Map(
      (archaeologyReference.artefactRecipes || []).map((recipe) => [normalizeName(recipe.restoredName), recipe])
    );
    materialByName = new Map(
      (archaeologyReference.materials || []).map((material) => [normalizeName(material.name), material])
    );
  } catch (error) {
    console.warn("Material and collection reference data is unavailable.", error);
    archaeologyReference = { materials: [], artefactRecipes: [], collections: [] };
    recipeByRestoredName = new Map();
    materialByName = new Map();
  }
}

function loadImageFromUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => {
      drawEmptyState("Could not load the screenshot.");
      resolve();
    };
    img.src = src;
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function analyzeCurrentImage() {
  if (!loadedImage || !references.length) return;

  const recognitionMode = activeResultsTab === "restored" ? "restored" : "damaged";
  ctx.drawImage(loadedImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grid = estimateBankGrid(imageData, { trimLastColumn: recognitionMode === "restored" });
  const boxes = detectItemBoxes(imageData, grid);
  const shapeImageData = makeFullShapeImageData(imageData, grid, recognitionMode);

  const analyzedDetections = boxes.map((box, index) => {
    const quantityResult = detectQuantity(imageData, box, recognitionMode);
    const match = matchArtifact(shapeImageData, imageData, box, recognitionMode);
    const preview = makePreviewCanvas(imageData, box, { enhanceHover: recognitionMode !== "restored" });
    const processedPreview = makeProcessedCanvas(imageData, shapeImageData, box, { enhance: recognitionMode !== "restored" });
    const referencePreview = makeReferenceCanvas(match.item.image);

    return {
      id: index + 1,
      box,
      bankIndex: index,
      bankRow: Math.floor(box.y / BANK_CELL_SIZE) + 1,
      bankColumn: Math.floor(box.x / BANK_CELL_SIZE) + 1,
      artefact: match.item.name,
      wikiPage: match.item.restoredWikiPage || match.item.wikiPage,
      damagedWikiPage: match.item.wikiPage,
      restoredName: match.item.restoredName,
      restoredWikiPage: match.item.restoredWikiPage,
      archaeologyLevel: match.item.archaeologyLevel,
      culture: match.item.culture,
      digSite: match.item.digSite,
      matchName: match.item.restoredName || match.item.name,
      matchScore: match.score,
      shapeScore: match.shapeScore,
      colorScore: match.colorScore,
      colorExistenceScore: match.colorExistenceScore,
      colorPositionScore: match.colorPositionScore,
      overlapScore: match.overlapScore,
      restoredScore: match.restoredScore,
      damagedScore: match.damagedScore,
      algorithmBest: match.algorithmBest,
      referenceUsed: match.referenceUsed,
      scoringWeights: match.scoringWeights,
      ambiguousMatch: match.ambiguous,
      matchGap: match.matchGap,
      topMatches: match.candidates,
      recognitionMode,
      originalPrediction: {
        damagedName: match.item.name,
        restoredName: match.item.restoredName,
        archaeologyLevel: match.item.archaeologyLevel,
        culture: match.item.culture,
        scores: {
          shape: match.shapeScore,
          restored: match.restoredScore,
          damaged: match.damagedScore,
          color: match.colorScore,
          colorExistence: match.colorExistenceScore,
          colorPosition: match.colorPositionScore,
          selected: match.score
        },
        algorithmBest: {
          shape: exportBestMatch(match.algorithmBest?.shape),
          restored: exportBestMatch(match.algorithmBest?.restored),
          damaged: exportBestMatch(match.algorithmBest?.damaged)
        }
      },
      correction: null,
      quantity: quantityResult.quantity,
      originalQuantity: quantityResult.quantity,
      quantityConfidence: quantityResult.confidence,
      quantityAlternatives: quantityResult.alternatives,
      quantityDebug: quantityResult.debug,
      quantityCorrection: null,
      quantityManual: false,
      preview,
      processedPreview,
      referencePreview,
      corrected: false,
      manual: false
    };
  });

  detectionsByMode[recognitionMode] = analyzedDetections;
  detections = analyzedDetections;
  applyUniqueArtefactAssignments(detections);
  renderDetections();
  drawBoxes(detections, grid.contentArea, grid.infinityArea);
}

function matchArtifact(shapeImageData, originalImageData, box, mode = "damaged") {
  const cropFingerprint = fingerprintCrop(shapeImageData, box);
  const colorFingerprint = fingerprintColorCrop(originalImageData, shapeImageData, box);
  let best = { item: references[0], score: 0, restoredScore: 0, damagedScore: 0, shapeScore: 0, colorScore: 0 };
  let bestShape = { item: references[0], score: 0 };
  let bestRestored = { item: references[0], score: 0 };
  let bestDamaged = { item: references[0], score: 0 };
  let bestColor = { item: references[0], score: 0 };
  const scores = [];

  for (const item of references) {
    const restored = compareFingerprints(cropFingerprint, item.fingerprint);
    const damaged = mode === "restored" ? null : item.damagedFingerprint ? compareFingerprints(cropFingerprint, item.damagedFingerprint) : null;
    const restoredColor = histogramChiAltSimilarity(colorFingerprint, item.fingerprint);
    const damagedColor = damaged ? histogramChiAltSimilarity(colorFingerprint, item.damagedFingerprint) : 0;
    const shapeScore = mode === "restored" ? restored.shape : damaged?.shape ?? restored.shape;
    const colorExistenceScore = damaged ? Math.max(restoredColor, damagedColor) : restoredColor;
    const colorPositionScore = damaged ? Math.max(restored.color, damaged.color) : restored.color;
    scores.push({
      item,
      score: 0,
      restoredScore: restored.total,
      damagedScore: damaged?.total ?? 0,
      shapeScore,
      colorScore: colorExistenceScore,
      colorExistenceScore,
      colorPositionScore,
      overlapScore: damaged?.overlap ?? restored.overlap
    });
    if (restored.shape > bestShape.score) bestShape = { item, score: restored.shape };
    if (restored.total > bestRestored.score) bestRestored = { item, score: restored.total };
    if (damaged && damaged.total > bestDamaged.score) bestDamaged = { item, score: damaged.total };
    if (colorExistenceScore > bestColor.score) bestColor = { item, score: colorExistenceScore };
  }

  const topColorScore = Math.max(...scores.map((candidate) => candidate.colorExistenceScore));
  const similarColorCount = scores.filter((candidate) => topColorScore - candidate.colorExistenceScore <= COLOR_SIMILAR_MARGIN).length;
  if (similarColorCount >= SHAPE_CROWD_COUNT) {
    for (const candidate of scores) {
      candidate.colorScore =
        candidate.colorExistenceScore * (1 - COLOR_POSITION_WEIGHT) + candidate.colorPositionScore * COLOR_POSITION_WEIGHT;
    }
  }

  const topShapeScore = Math.max(...scores.map((candidate) => candidate.shapeScore));
  const crowdedShapeCount = scores.filter((candidate) => topShapeScore - candidate.shapeScore <= SHAPE_CROWD_MARGIN).length;
  const colorWeight = crowdedShapeCount >= SHAPE_CROWD_COUNT ? CROWDED_SHAPE_COLOR_WEIGHT : COLOR_SCORE_WEIGHT;
  const shapeWeight = 1 - colorWeight;
  for (const candidate of scores) {
    candidate.score = candidate.shapeScore * shapeWeight + candidate.colorScore * colorWeight;
    candidate.scoringWeights = {
      shape: shapeWeight,
      color: colorWeight,
      crowdedShapeCount,
      colorExistence: similarColorCount >= SHAPE_CROWD_COUNT ? 1 - COLOR_POSITION_WEIGHT : 1,
      colorPosition: similarColorCount >= SHAPE_CROWD_COUNT ? COLOR_POSITION_WEIGHT : 0,
      similarColorCount
    };
  }

  scores.sort((a, b) => b.score - a.score);
  best = scores[0] ?? best;
  const secondBest = scores[1] ?? null;
  const matchGap = secondBest ? best.score - secondBest.score : 1;
  const ambiguous = Boolean(secondBest && matchGap <= AMBIGUOUS_FINAL_MARGIN);
  const referenceFingerprint =
    mode !== "restored" && best.item.damagedFingerprint && best.damagedScore >= best.restoredScore
      ? best.item.damagedFingerprint
      : best.item.fingerprint;
  return {
    ...best,
    referenceUsed: mode !== "restored" && best.damagedScore > best.restoredScore ? "damaged" : "restored",
    scoringWeights: best.scoringWeights,
    ambiguous,
    matchGap,
    cropFingerprint,
    referenceFingerprint,
    finalShapeScore: best.shapeScore,
    algorithmBest: { shape: bestShape, restored: bestRestored, damaged: bestDamaged, color: bestColor },
    candidates: scores.slice(0, 10)
  };
}

function applyUniqueArtefactAssignments(items) {
  const used = new Set();
  const byConfidence = [...items].sort((a, b) => b.matchScore - a.matchScore || a.bankIndex - b.bankIndex);

  for (const detection of byConfidence) {
    const candidate = (detection.topMatches || []).find((match) => {
      const key = artefactKey(match.item);
      return key && !used.has(key);
    });
    if (!candidate) continue;
    applyCandidatePrediction(detection, candidate);
    used.add(artefactKey(candidate.item));
  }
}

function artefactKey(item) {
  return (item?.restoredName || item?.name || "").toLowerCase();
}

function applyCandidatePrediction(detection, candidate) {
  const item = candidate.item;
  detection.artefact = item.name;
  detection.wikiPage = item.restoredWikiPage || item.wikiPage;
  detection.damagedWikiPage = item.wikiPage;
  detection.restoredName = item.restoredName;
  detection.restoredWikiPage = item.restoredWikiPage;
  detection.archaeologyLevel = item.archaeologyLevel;
  detection.culture = item.culture;
  detection.digSite = item.digSite;
  detection.matchName = item.restoredName || item.name;
  detection.matchScore = candidate.score;
  detection.shapeScore = candidate.shapeScore;
  detection.colorScore = candidate.colorScore;
  detection.colorExistenceScore = candidate.colorExistenceScore;
  detection.colorPositionScore = candidate.colorPositionScore;
  detection.restoredScore = candidate.restoredScore;
  detection.damagedScore = candidate.damagedScore;
  detection.overlapScore = candidate.overlapScore;
  detection.scoringWeights = candidate.scoringWeights;
  detection.referenceUsed = candidate.damagedScore > candidate.restoredScore ? "damaged" : "restored";
  detection.referencePreview = makeReferenceCanvas(item.image);
  const ordered = detection.topMatches || [];
  const index = ordered.indexOf(candidate);
  const next = ordered.find((match, candidateIndex) => candidateIndex !== index);
  detection.matchGap = next ? candidate.score - next.score : 1;
  detection.ambiguousMatch = Boolean(next && detection.matchGap <= AMBIGUOUS_FINAL_MARGIN);
}

function fingerprintReference(image) {
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);
  tempCtx.drawImage(image, 0, 0, MATCH_SIZE, MATCH_SIZE);
  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), false);
}

function fingerprintCrop(imageData, box) {
  const iconBox = getIconMatchBox(box);
  const cropData = copyImageData(imageData, iconBox);
  const bounds = alphaBounds(cropData);
  const source = document.createElement("canvas");
  source.width = cropData.width;
  source.height = cropData.height;
  source.getContext("2d", { willReadFrequently: true }).putImageData(cropData, 0, 0);
  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const offsetX = Math.floor((MATCH_SIZE - (bounds.w / longest) * MATCH_SIZE) / 2);
    const offsetY = Math.floor((MATCH_SIZE - (bounds.h / longest) * MATCH_SIZE) / 2);
    tempCtx.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      offsetX,
      offsetY,
      Math.ceil((bounds.w / longest) * MATCH_SIZE),
      Math.ceil((bounds.h / longest) * MATCH_SIZE)
    );
  }

  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), true);
}

function fingerprintColorCrop(originalImageData, shapeImageData, box) {
  const iconBox = getIconMatchBox(box);
  const originalCrop = copyImageData(originalImageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);
  const bounds = alphaBounds(shapeCrop);
  const masked = new ImageData(originalCrop.width, originalCrop.height);

  for (let i = 0; i < originalCrop.data.length; i += 4) {
    if (shapeCrop.data[i + 3] <= 20) continue;
    masked.data[i] = originalCrop.data[i];
    masked.data[i + 1] = originalCrop.data[i + 1];
    masked.data[i + 2] = originalCrop.data[i + 2];
    masked.data[i + 3] = 255;
  }

  const source = document.createElement("canvas");
  source.width = masked.width;
  source.height = masked.height;
  source.getContext("2d", { willReadFrequently: true }).putImageData(masked, 0, 0);

  const temp = document.createElement("canvas");
  temp.width = MATCH_SIZE;
  temp.height = MATCH_SIZE;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "high";
  tempCtx.clearRect(0, 0, MATCH_SIZE, MATCH_SIZE);

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const offsetX = Math.floor((MATCH_SIZE - (bounds.w / longest) * MATCH_SIZE) / 2);
    const offsetY = Math.floor((MATCH_SIZE - (bounds.h / longest) * MATCH_SIZE) / 2);
    tempCtx.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      offsetX,
      offsetY,
      Math.ceil((bounds.w / longest) * MATCH_SIZE),
      Math.ceil((bounds.h / longest) * MATCH_SIZE)
    );
  }

  return toFingerprint(tempCtx.getImageData(0, 0, MATCH_SIZE, MATCH_SIZE), true);
}

function makeFullShapeImageData(imageData, grid, mode = "damaged") {
  const out = new ImageData(imageData.width, imageData.height);
  const removeSimilarBackground = mode === "restored";

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;

      const backgroundColors = cellBackgroundColors(imageData, x, y, w, h, { includeSimilar: removeSimilarBackground });
      const backgroundMask = removeSimilarBackground ? connectedCellBackgroundMask(imageData, x, y, w, h, backgroundColors) : null;
      for (let py = y; py < y + h; py += 1) {
        for (let px = x; px < x + w; px += 1) {
          const offset = (py * imageData.width + px) * 4;
          const r = imageData.data[offset];
          const g = imageData.data[offset + 1];
          const b = imageData.data[offset + 2];
          const a = imageData.data[offset + 3];
          const backgroundRemoved = backgroundMask
            ? backgroundMask[(py - y) * w + (px - x)]
            : matchesCellBackground(r, g, b, backgroundColors, removeSimilarBackground);
          const visible =
            a > 20 &&
            !backgroundRemoved &&
            !isQuantityPixelInCell(r, g, b, px - x, py - y);
          out.data[offset] = 0;
          out.data[offset + 1] = 0;
          out.data[offset + 2] = 0;
          out.data[offset + 3] = visible ? 255 : 0;
        }
      }
    }
  }

  return out;
}

function cellBackgroundColors(imageData, x, y, w, h, options = {}) {
  const counts = new Map();
  const addSample = (px, py) => {
    if (options.includeSimilar && !isCellBackgroundSamplePoint(px - x, py - y, w, h)) return;
    const color = pixelColorAt(imageData, px, py);
    if (isQuantityPixel(color.r, color.g, color.b)) return;
    if (isFrameOrScrollbarPixel(color.r, color.g, color.b)) return;
    if (!isSlotBackgroundCandidate(color.r, color.g, color.b)) return;
    const key = `${color.r},${color.g},${color.b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const minX = x;
  const maxX = x + w - 1;
  const minY = y;
  const maxY = y + h - 1;
  const step = 2;

  for (let py = minY; py <= maxY; py += step) {
    for (let px = minX; px <= maxX; px += step) {
      addSample(px, py);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return [pixelColorAt(imageData, x, y)];

  const minimumCount = options.includeSimilar ? Math.max(2, ranked[0][1] * 0.08) : ranked[0][1];
  return ranked
    .filter((entry) => entry[1] >= minimumCount)
    .slice(0, options.includeSimilar ? 3 : 1)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return { r, g, b };
    });
}

function matchesCellBackground(r, g, b, backgroundColors, includeSimilar) {
  if (!includeSimilar) return backgroundColors.some((color) => sameColor(r, g, b, color));
  if (!isSlotBackgroundCandidate(r, g, b)) return false;
  return backgroundColors.some((color) => channelDistance(r, g, b, color) <= 5 && colorDistance(r, g, b, color) <= 14);
}

function connectedCellBackgroundMask(imageData, x, y, w, h, backgroundColors) {
  const mask = new Uint8Array(w * h);
  const queue = [];
  const add = (localX, localY) => {
    if (localX < 0 || localY < 0 || localX >= w || localY >= h) return;
    const index = localY * w + localX;
    if (mask[index]) return;
    const offset = ((y + localY) * imageData.width + x + localX) * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    if (!matchesCellBackground(r, g, b, backgroundColors, true)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let px = 0; px < w; px += 1) {
    add(px, 0);
    add(px, h - 1);
  }
  for (let py = 1; py < h - 1; py += 1) {
    add(0, py);
    add(w - 1, py);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const localX = index % w;
    const localY = Math.floor(index / w);
    add(localX + 1, localY);
    add(localX - 1, localY);
    add(localX, localY + 1);
    add(localX, localY - 1);
  }

  return mask;
}

function colorDistance(r, g, b, color) {
  return Math.abs(r - color.r) + Math.abs(g - color.g) + Math.abs(b - color.b);
}

function isSlotBackgroundCandidate(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 24 && max <= 88 && max - min <= 18 && r <= g + 12 && g <= r + 12;
}

function channelDistance(r, g, b, color) {
  return Math.max(Math.abs(r - color.r), Math.abs(g - color.g), Math.abs(b - color.b));
}

function isCellBackgroundSamplePoint(x, y, w, h) {
  const band = Math.max(6, Math.floor(Math.min(w, h) * 0.18));
  return x < band || y < band || x >= w - band || y >= h - band;
}

function isQuantityPixelInCell(r, g, b, x, y) {
  return x < 26 && y < 17 && isQuantityPixel(r, g, b);
}

function connectedGridBackgroundMask(imageData, grid, backgroundColor) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue = [];
  const minX = Math.max(0, grid.x);
  const minY = Math.max(0, grid.y);
  const maxX = Math.min(width - 1, grid.x + grid.columns * grid.cell - 1);
  const maxY = Math.min(height - 1, grid.y + grid.rows * grid.cell - 1);

  const add = (x, y) => {
    if (x < minX || y < minY || x > maxX || y > maxY) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (!sameColor(data[offset], data[offset + 1], data[offset + 2], backgroundColor)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = minX; x <= maxX; x += 1) {
    add(x, minY);
    add(x, maxY);
  }
  for (let y = minY + 1; y < maxY; y += 1) {
    add(minX, y);
    add(maxX, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const x = index % width;
    const y = Math.floor(index / width);
    add(x + 1, y);
    add(x - 1, y);
    add(x, y + 1);
    add(x, y - 1);
  }

  return mask;
}

function getIconMatchBox(box) {
  const insetX = Math.max(1, Math.round(box.w * 0.04));
  const topInset = Math.max(1, Math.round(box.h * 0.04));
  const bottomInset = Math.max(1, Math.round(box.h * 0.04));
  return {
    x: box.x + insetX,
    y: box.y + topInset,
    w: Math.max(8, box.w - insetX * 2),
    h: Math.max(8, box.h - topInset - bottomInset),
    area: box.area
  };
}

function removeBackground(imageData) {
  const backgroundColor = topLeftPixelColor(imageData);
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  for (let i = 0; i < out.data.length; i += 4) {
    const r = out.data[i];
    const g = out.data[i + 1];
    const b = out.data[i + 2];
    const isYellowText = r > 120 && g > 105 && b < 75 && r >= g - 18;
    const isNearlyBlack = r < 8 && g < 8 && b < 8;

    if (sameColor(r, g, b, backgroundColor) || isYellowText || isNearlyBlack) {
      out.data[i + 3] = 0;
    } else {
      out.data[i + 3] = 255;
    }
  }
  return out;
}

function toFingerprint(imageData, cleanedCrop) {
  const values = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    const visible = cleanedCrop ? a > 35 : a > 20;
    values.push({
      visible,
      r: visible ? r : 0,
      g: visible ? g : 0,
      b: visible ? b : 0,
      light: visible ? (r + g + b) / 3 : 0
    });
  }
  values.descriptor = fingerprintDescriptor(values);
  return attachHistogram(values);
}

function toScreenshotFingerprint(imageData, backgroundColor = topLeftPixelColor(imageData)) {
  const values = [];
  const edgeBackground = connectedEdgeBackgroundMask(imageData, backgroundColor);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    const visible = a > 20 && !edgeBackground[i / 4] && !isQuantityPixel(r, g, b);
    values.push({
      visible,
      r: visible ? r : 0,
      g: visible ? g : 0,
      b: visible ? b : 0,
      light: visible ? (r + g + b) / 3 : 0
    });
  }
  values.descriptor = fingerprintDescriptor(values);
  return attachHistogram(values);
}

function connectedEdgeBackgroundMask(imageData, backgroundColor = topLeftPixelColor(imageData)) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const queue = [];

  const add = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (mask[index]) return;
    const offset = index * 4;
    if (!sameColor(data[offset], data[offset + 1], data[offset + 2], backgroundColor)) return;
    mask[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const x = index % width;
    const y = Math.floor(index / width);
    add(x + 1, y);
    add(x - 1, y);
    add(x, y + 1);
    add(x, y - 1);
  }

  return mask;
}

function topLeftPixelColor(imageData) {
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2]
  };
}

function pixelColorAt(imageData, x, y) {
  const safeX = Math.max(0, Math.min(imageData.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(imageData.height - 1, Math.round(y)));
  const offset = (safeY * imageData.width + safeX) * 4;
  return {
    r: imageData.data[offset],
    g: imageData.data[offset + 1],
    b: imageData.data[offset + 2]
  };
}

function attachHistogram(values) {
  const histogram = Array.from({ length: 512 }, () => 0);
  const hueHistogram = Array.from({ length: 12 }, () => 0);
  const grayHistogram = Array.from({ length: 8 }, () => 0);
  let total = 0;
  let hueTotal = 0;
  let grayTotal = 0;
  for (const value of values) {
    if (!value.visible) continue;
    const rb = Math.min(Math.floor(value.r / 32), 7);
    const gb = Math.min(Math.floor(value.g / 32), 7);
    const bb = Math.min(Math.floor(value.b / 32), 7);
    const hsv = rgbToHsv(value.r, value.g, value.b);
    histogram[rb * 64 + gb * 8 + bb] += 1;
    if (hsv.s > 0.12) {
      hueHistogram[Math.min(Math.floor(hsv.h * hueHistogram.length), hueHistogram.length - 1)] += 1;
      hueTotal += 1;
    } else {
      grayHistogram[Math.min(Math.floor(hsv.v * grayHistogram.length), grayHistogram.length - 1)] += 1;
      grayTotal += 1;
    }
    total += 1;
  }
  values.histogram = total ? histogram.map((count) => count / total) : histogram;
  values.hueHistogram = hueTotal ? hueHistogram.map((count) => count / hueTotal) : hueHistogram;
  values.grayHistogram = grayTotal ? grayHistogram.map((count) => count / grayTotal) : grayHistogram;
  values.colorTotals = { total, hue: hueTotal, gray: grayTotal };
  return values;
}

function rgbToHsv(r, g, b) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function histogramSimilarity(a, b) {
  if (!a.histogram || !b.histogram) return 0;
  let score = 0;
  for (let i = 0; i < a.histogram.length; i += 1) {
    score += Math.min(a.histogram[i], b.histogram[i]);
  }
  return score;
}

function histogramChiAltSimilarity(a, b) {
  if (!a.histogram || !b.histogram) return 0;
  let distance = 0;
  for (let i = 0; i < a.histogram.length; i += 1) {
    const denom = a.histogram[i] + b.histogram[i];
    if (denom <= 0) continue;
    const diff = a.histogram[i] - b.histogram[i];
    distance += (2 * diff * diff) / denom;
  }
  const rgbScore = 1 / (1 + distance);
  const hueScore = histogramSimilarity({ histogram: a.hueHistogram }, { histogram: b.hueHistogram });
  const grayScore = histogramSimilarity({ histogram: a.grayHistogram }, { histogram: b.grayHistogram });
  const hueWeight = Math.min(a.colorTotals?.hue || 0, b.colorTotals?.hue || 0) > 2 ? 0.55 : 0.2;
  const grayWeight = Math.min(a.colorTotals?.gray || 0, b.colorTotals?.gray || 0) > 2 ? 0.15 : 0;
  const rgbWeight = Math.max(0.25, 1 - hueWeight - grayWeight);
  return rgbScore * rgbWeight + hueScore * hueWeight + grayScore * grayWeight;
}

function fingerprintDescriptor(values) {
  let minX = MATCH_SIZE;
  let minY = MATCH_SIZE;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      const value = values[y * MATCH_SIZE + x];
      if (!value.visible) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
      count += 1;
    }
  }

  if (!count) {
    return { aspect: 1, fill: 0, centerX: 0.5, centerY: 0.5 };
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    aspect: width / Math.max(height, 1),
    fill: count / Math.max(width * height, 1),
    centerX: sumX / count / MATCH_SIZE,
    centerY: sumY / count / MATCH_SIZE
  };
}

function withEdges(values) {
  const result = values.map((value) => ({ ...value, edge: false }));
  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      const index = y * MATCH_SIZE + x;
      if (!values[index].visible) continue;
      const neighbors = [
        y > 0 ? values[(y - 1) * MATCH_SIZE + x] : null,
        y < MATCH_SIZE - 1 ? values[(y + 1) * MATCH_SIZE + x] : null,
        x > 0 ? values[y * MATCH_SIZE + x - 1] : null,
        x < MATCH_SIZE - 1 ? values[y * MATCH_SIZE + x + 1] : null
      ];
      result[index].edge = neighbors.some((neighbor) => !neighbor || !neighbor.visible);
    }
  }
  return result;
}

function compareFingerprints(a, b) {
  a = withEdges(a);
  b = withEdges(b);
  let overlap = 0;
  let visibleUnion = 0;
  let visibleA = 0;
  let visibleB = 0;
  let edgeOverlap = 0;
  let edgeUnion = 0;
  let colorScore = 0;
  let lightScore = 0;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].visible) visibleA += 1;
    if (b[i].visible) visibleB += 1;
    if (a[i].visible || b[i].visible) visibleUnion += 1;
    if (a[i].edge || b[i].edge) edgeUnion += 1;
    if (a[i].edge && b[i].edge) edgeOverlap += 1;
    if (!a[i].visible || !b[i].visible) continue;
    overlap += 1;
    const colorDistance = Math.abs(a[i].r - b[i].r) + Math.abs(a[i].g - b[i].g) + Math.abs(a[i].b - b[i].b);
    const lightDistance = Math.abs(a[i].light - b[i].light);
    colorScore += 1 - Math.min(colorDistance / 765, 1);
    lightScore += 1 - Math.min(lightDistance / 255, 1);
  }

  if (!visibleUnion || !overlap) return { total: 0, shape: 0, color: 0, light: 0 };
  const coverageA = overlap / Math.max(visibleA, 1);
  const coverageB = overlap / Math.max(visibleB, 1);
  const shapeScore = Math.sqrt(coverageA * coverageB);
  const edgeScore = edgeUnion ? edgeOverlap / edgeUnion : shapeScore;
  const descriptorScore = compareDescriptors(a.descriptor, b.descriptor);
  const color = colorScore / overlap;
  const light = lightScore / overlap;
  const silhouette = shapeScore * 0.55 + edgeScore * 0.25 + descriptorScore * 0.2;
  return {
    total: silhouette * 0.9 + color * 0.04 + light * 0.06,
    shape: silhouette,
    overlap: overlap / visibleUnion,
    edge: edgeScore,
    descriptor: descriptorScore,
    color,
    light
  };
}

function compareDescriptors(a, b) {
  if (!a || !b) return 0;
  const aspectScore = 1 - Math.min(Math.abs(Math.log(a.aspect) - Math.log(b.aspect)) / 1.6, 1);
  const fillScore = 1 - Math.min(Math.abs(a.fill - b.fill) / 0.65, 1);
  const centerScore =
    1 - Math.min((Math.abs(a.centerX - b.centerX) + Math.abs(a.centerY - b.centerY)) / 0.75, 1);
  return aspectScore * 0.45 + fillScore * 0.35 + centerScore * 0.2;
}

function alphaBounds(imageData) {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3];
      if (alpha < 40) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function foregroundAlphaBounds(imageData) {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      if (!isScreenshotShapePixel(r, g, b)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function detectItemBoxes(imageData, grid = estimateBankGrid(imageData)) {
  const boxes = [];

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x + column * grid.cell;
      const y = grid.y + row * grid.cell;
      const w = Math.min(grid.cell, (grid.maxX ?? imageData.width - 1) - x + 1, imageData.width - x);
      const h = Math.min(grid.cell, (grid.maxY ?? imageData.height - 1) - y + 1, imageData.height - y);
      if (w <= 0 || h <= 0) continue;
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box) || isBeforeLastDetectedItem(row, column, grid)) boxes.push(box);
    }
  }

  return boxes;
}

function isBeforeLastDetectedItem(row, column, grid) {
  const lastColumn = Math.min(grid.columns - 1, grid.lastOccupiedColumn + 1);
  return row < grid.lastOccupiedRow || (row === grid.lastOccupiedRow && column <= lastColumn);
}

function estimateBankGrid(imageData, options = {}) {
  const bankContent = findBankContentArea(imageData);
  const centerSearchArea = bankContent
    ? { x: bankContent.x, y: bankContent.y + 8, w: bankContent.w, h: Math.max(1, bankContent.h - 8) }
    : null;
  const itemCenters = estimateItemCenters(imageData, centerSearchArea);
  const cell = getGridCellSize();
  const anchor = findFirstItemAnchor(itemCenters, cell);
  const x = bankContent ? bankContent.x : Math.max(0, Math.round(anchor.x - cell / 2 + getGridOffsetX()));
  const y = bankContent ? bankContent.y : Math.max(0, Math.round(anchor.y - cell / 2 + getGridOffsetY()));
  const content = bankContent
    ? { minX: bankContent.x, minY: bankContent.y, maxX: bankContent.x + bankContent.w - 1, maxY: bankContent.y + bankContent.h - 1 }
    : foregroundBounds(imageData);
  if (!bankContent) content.maxX = Math.min(content.maxX, bankContentRightLimit(imageData));

  const contentColumns = getGridColumns(Math.max(1, Math.ceil((content.maxX - x + 1) / cell)));
  const contentRows = getGridRows(Math.max(1, Math.ceil((content.maxY - y + 1) / cell)));
  const itemExtent = gridExtentFromItemCenters(itemCenters, x, y, cell);
  const last = itemExtent || lastOccupiedGridCell(imageData, x, y, cell, content);
  const columns = Math.max(1, contentColumns - (options.trimLastColumn ? 1 : 0));
  const rows = itemExtent ? Math.min(contentRows, Math.max(1, itemExtent.row + 1)) : contentRows;
  return {
    x,
    y,
    cell,
    columns,
    rows,
    maxX: content.maxX,
    maxY: content.maxY,
    lastOccupiedRow: last.row,
    lastOccupiedColumn: last.column,
    contentArea: bankContent,
    infinityArea: bankContent?.infinity || null
  };
}

function gridExtentFromItemCenters(centers, gridX, gridY, cell) {
  let last = null;
  for (const center of centers) {
    const column = Math.floor((center.x - gridX) / cell);
    const row = Math.floor((center.y - gridY) / cell);
    if (column < 0 || row < 0) continue;
    if (!last || row > last.row || (row === last.row && column > last.column)) last = { row, column };
  }
  return last;
}

function findBankContentArea(imageData) {
  const { width, height, data } = imageData;
  const framePixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (isFrameOrScrollbarPixel(data[offset], data[offset + 1], data[offset + 2])) framePixels[y * width + x] = 1;
    }
  }

  const horizontalRuns = [];
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) count += framePixels[y * width + x];
    if (count > width * 0.45) horizontalRuns.push(y);
  }

  const verticalRuns = [];
  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = 0; y < height; y += 1) count += framePixels[y * width + x];
    if (count > height * 0.45) verticalRuns.push(x);
  }

  const topCandidates = horizontalRuns.filter((y) => y > 20 && y < height * 0.35);
  const bottomCandidates = horizontalRuns.filter((y) => y > height * 0.45);
  const leftCandidates = verticalRuns.filter((x) => x < width * 0.2);
  const rightCandidates = verticalRuns.filter((x) => x > width * 0.75);

  const top = topCandidates.length ? Math.max(...topCandidates) + 1 : null;
  const bottom = bottomCandidates.length ? Math.max(...bottomCandidates.filter((y) => y < height - 20)) - 1 : null;
  const left = leftCandidates.length ? Math.min(...leftCandidates) + 1 : null;
  const right = rightCandidates.length ? Math.max(...rightCandidates.filter((x) => x < width - 4)) - 1 : null;
  const infinity = findInfinitySymbolBounds(imageData);

  if (infinity && bottom !== null && right !== null) {
    const anchoredLeft = findContentLeftFromInfinity(imageData, infinity) ?? Math.max(0, infinity.x - 10);
    const anchoredTop = findContentTopAfterInfinity(imageData, infinity) ?? infinity.y + infinity.h + 8;
    const anchoredRight = findContentRightBeforeScrollbar(imageData, anchoredTop, bottom) ?? right;
    if (bottom > anchoredTop && right > anchoredLeft) {
      return { x: anchoredLeft, y: anchoredTop, w: anchoredRight - anchoredLeft + 1, h: bottom - anchoredTop + 1, infinity };
    }
  }

  if (top === null || bottom === null || left === null || right === null || bottom <= top || right <= left) return null;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function findInfinitySymbolBounds(imageData) {
  const { width, height, data } = imageData;
  const maxX = Math.min(width - 1, 80);
  const maxY = Math.min(height - 1, 90);
  const minY = Math.min(maxY, 35);
  const mask = new Uint8Array(width * height);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const isInfinityPixel = r >= 90 && g >= 65 && b >= 30 && r > b + 25 && g > b + 8;
      if (isInfinityPixel) mask[y * width + x] = 1;
    }
  }

  return connectedComponents(dilate(mask, width, height, 1), width, height)
    .filter((box) => box.x >= 5 && box.x < 45 && box.y >= minY && box.w >= 16 && box.w <= 48 && box.h >= 10 && box.h <= 34)
    .sort((a, b) => infinitySymbolScore(b) - infinitySymbolScore(a))[0] || null;
}

function infinitySymbolScore(box) {
  const aspect = box.w / Math.max(1, box.h);
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - 1.9) / 1.9);
  const positionScore = 1 - Math.min(1, (Math.abs(box.x - 18) + Math.abs(box.y - 52)) / 80);
  return box.area + aspectScore * 120 + positionScore * 80;
}

function findContentTopAfterInfinity(imageData, infinity) {
  const { width, height, data } = imageData;
  const startY = Math.min(height - 1, infinity.y + infinity.h + 8);
  const endY = Math.min(height - 1, startY + 60);

  for (let y = startY; y <= endY; y += 1) {
    let contentPixels = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (isBankContentBackgroundPixel(data[offset], data[offset + 1], data[offset + 2])) contentPixels += 1;
    }
    if (contentPixels > width * 0.55) return y;
  }

  return null;
}

function findContentLeftFromInfinity(imageData, infinity) {
  return Math.max(0, infinity.x - 10);
}

function findContentRightBeforeScrollbar(imageData, top, bottom) {
  const { width, data } = imageData;
  const minY = Math.max(0, top);
  const maxY = Math.min(imageData.height - 1, bottom);
  let runEnd = null;

  for (let x = width - 1; x >= Math.floor(width * 0.75); x -= 1) {
    let scrollbarPixels = 0;
    for (let y = minY; y <= maxY; y += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (r > 145 && g > 100 && b > 45 && r > b + 45) scrollbarPixels += 1;
    }
    if (scrollbarPixels > (maxY - minY + 1) * 0.35) {
      if (runEnd === null) runEnd = x;
      continue;
    }
    if (runEnd !== null) return Math.max(0, x - 2);
  }

  return null;
}

function isBankContentBackgroundPixel(r, g, b) {
  return Math.abs(r - 48) <= 8 && Math.abs(g - 43) <= 8 && Math.abs(b - 38) <= 8;
}

function lastOccupiedGridCell(imageData, gridX, gridY, cell, content) {
  const maxColumns = Math.max(1, Math.ceil((content.maxX - gridX + 1) / cell));
  const maxRows = Math.max(1, Math.ceil((content.maxY - gridY + 1) / cell));
  let last = { row: 0, column: 0 };

  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < maxColumns; column += 1) {
      const x = gridX + column * cell;
      const y = gridY + row * cell;
      const w = Math.min(cell, imageData.width - x);
      const h = Math.min(cell, imageData.height - y);
      const box = { x, y, w, h, area: countCellForeground(imageData, x, y, w, h) };
      if (isOccupiedCell(imageData, box)) last = { row, column };
    }
  }

  return last;
}

function getGridOffsetX() {
  return BANK_GRID_SHIFT_X;
}

function getGridOffsetY() {
  return BANK_GRID_SHIFT_Y;
}

function getGridCellSize() {
  return BANK_CELL_SIZE;
}

function getGridRows(autoRows) {
  return autoRows;
}

function getGridColumns(autoColumns) {
  return Math.max(1, autoColumns);
}

function findFirstItemAnchor(centers, cell) {
  if (!centers.length) return { x: cell / 2, y: cell / 2 };

  const sorted = [...centers].sort((a, b) => a.y - b.y || a.x - b.x);
  const firstRowY = sorted[0].y;
  const firstRow = sorted
    .filter((center) => Math.abs(center.y - firstRowY) < cell / 2)
    .sort((a, b) => a.x - b.x);

  return firstRow[0] || sorted[0];
}

function estimateItemCenters(imageData, bounds = null) {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const minX = bounds?.x ?? 0;
  const minY = bounds?.y ?? 0;
  const maxX = bounds ? bounds.x + bounds.w - 1 : width - 1;
  const maxY = bounds ? bounds.y + bounds.h - 1 : height - 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4;
      if (isGridItemPixel(data[offset], data[offset + 1], data[offset + 2])) mask[y * width + x] = 1;
    }
  }

  return connectedComponents(dilate(mask, width, height, 2), width, height)
    .filter((box) => box.area > 45 && box.w >= 6 && box.h >= 6 && box.w <= 38 && box.h <= 38)
    .map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function foregroundBounds(imageData) {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (!isGridItemPixel(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX > maxX || minY > maxY) {
    return { minX: 0, minY: 0, maxX: imageData.width - 1, maxY: imageData.height - 1 };
  }

  return { minX, minY, maxX, maxY };
}

function bankContentRightLimit(imageData) {
  for (let x = imageData.width - 1; x >= 0; x -= 1) {
    let borderPixels = 0;
    for (let y = 0; y < imageData.height; y += 1) {
      const offset = (y * imageData.width + x) * 4;
      if (isFrameOrScrollbarPixel(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) {
        borderPixels += 1;
      }
    }
    if (borderPixels > imageData.height * 0.45) return Math.max(0, x - 1);
  }
  return imageData.width - 1;
}

function isGridItemPixel(r, g, b) {
  if (!isForeground(r, g, b)) return false;
  const isTitleText = r > 160 && g > 115 && b < 70;
  return !isTitleText && !isFrameOrScrollbarPixel(r, g, b);
}

function isScreenshotShapePixel(r, g, b) {
  if (isBankBackgroundPixel(r, g, b)) return false;
  if (isQuantityPixel(r, g, b)) return false;
  return true;
}

function isFrameOrScrollbarPixel(r, g, b) {
  const isFrameGold = r > 85 && g > 50 && g < 135 && b < 55;
  const isScrollbar = r > 145 && g > 100 && b > 45 && r > b + 45;
  const isBankLine = r > 55 && r < 120 && g > 40 && g < 95 && b < 55;
  return isFrameGold || isScrollbar || isBankLine;
}

function projectionRuns(imageData, axis, threshold) {
  const limit = axis === "x" ? imageData.width : imageData.height;
  const innerLimit = axis === "x" ? imageData.height : imageData.width;
  const active = [];

  for (let outer = 0; outer < limit; outer += 1) {
    let count = 0;
    for (let inner = 0; inner < innerLimit; inner += 1) {
      const x = axis === "x" ? outer : inner;
      const y = axis === "x" ? inner : outer;
      const offset = (y * imageData.width + x) * 4;
      if (isForeground(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) count += 1;
    }
    if (count > threshold) active.push(outer);
  }

  const runs = [];
  let start = null;
  let previous = null;

  for (const value of active) {
    if (start === null) {
      start = value;
      previous = value;
      continue;
    }
    if (value > previous + 1) {
      runs.push({ start, end: previous });
      start = value;
    }
    previous = value;
  }
  if (start !== null) runs.push({ start, end: previous });
  return runs.filter((run) => run.end - run.start >= 6);
}

function medianPitch(centers) {
  const deltas = [];
  for (let index = 1; index < centers.length; index += 1) {
    const delta = centers[index] - centers[index - 1];
    if (delta >= 32 && delta <= 58) deltas.push(delta);
  }
  if (!deltas.length) return null;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

function snapGridStart(value) {
  return Math.abs(value) <= 4 ? 0 : Math.max(0, value);
}

function countCellForeground(imageData, x, y, w, h) {
  let count = 0;
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const offset = (py * imageData.width + px) * 4;
      if (isForeground(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])) count += 1;
    }
  }
  return count;
}

function isOccupiedCell(imageData, box) {
  let itemPixels = 0;
  let borderPixels = 0;

  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      if (isGridItemPixel(r, g, b)) itemPixels += 1;
      if (isFrameOrScrollbarPixel(r, g, b)) borderPixels += 1;
    }
  }

  if (itemPixels < 70) return false;
  return borderPixels < itemPixels * 1.3;
}

function isForeground(r, g, b) {
  const bgDistance = Math.abs(r - 48) + Math.abs(g - 43) + Math.abs(b - 38);
  const tooDark = r < 24 && g < 24 && b < 24;
  return bgDistance > 28 && !tooDark;
}

function isBankBackgroundPixel(r, g, b) {
  return r === 48 && g === 43 && b === 38;
}

function sameColor(r, g, b, color) {
  return r === color.r && g === color.g && b === color.b;
}

function dilate(mask, width, height, radius) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
}

function connectedComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const boxes = [];
  const queue = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    for (let qi = 0; qi < queue.length; qi += 1) {
      const current = queue[qi];
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      area += 1;

      const neighbors = [current - 1, current + 1, current - width, current + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % width;
        if (Math.abs(nx - x) > 1) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }

    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }

  return boxes;
}

function mergeCloseBoxes(boxes, width, height) {
  const merged = [];
  for (const box of boxes) {
    const target = merged.find((candidate) => boxesAreClose(candidate, box));
    if (target) {
      const minX = Math.min(target.x, box.x);
      const minY = Math.min(target.y, box.y);
      const maxX = Math.max(target.x + target.w, box.x + box.w);
      const maxY = Math.max(target.y + target.h, box.y + box.h);
      target.x = minX;
      target.y = minY;
      target.w = Math.min(maxX - minX, width - minX);
      target.h = Math.min(maxY - minY, height - minY);
      target.area += box.area;
    } else {
      merged.push({ ...box });
    }
  }
  return merged.map((box) => expandBox(box, 2, width, height));
}

function boxesAreClose(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.abs(ax - bx) < 28 && Math.abs(ay - by) < 28;
}

function expandBox(box, padding, width, height) {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(width, box.x + box.w + padding);
  const bottom = Math.min(height, box.y + box.h + padding);
  return { x, y, w: right - x, h: bottom - y, area: box.area };
}

function detectQuantity(imageData, box, mode = "damaged") {
  const strict = mode === "restored";
  const yellowPixels = collectYellowPixels(imageData, box, { strict });
  const scanBox = quantityScanBox(box, strict);
  if (yellowPixels.length < 4) {
    return {
      quantity: 1,
      confidence: 0.65,
      alternatives: [{ quantity: 1, confidence: 0.65 }],
      debug: makeQuantityDebug({ mode, strict, scanBox, yellowPixels, digitBoxes: [], matches: [], text: "1", confidence: 0.65 })
    };
  }

  const rawDigitBoxes = splitDigitBoxes(yellowPixels).sort((a, b) => a.x - b.x);
  const digitBoxes = rawDigitBoxes.filter((digitBox) => isPlausibleQuantityDigitBox(yellowPixels, digitBox, strict));

  if (!digitBoxes.length) {
    return {
      quantity: 1,
      confidence: 0.55,
      alternatives: [{ quantity: 1, confidence: 0.55 }],
      debug: makeQuantityDebug({ mode, strict, scanBox, yellowPixels, digitBoxes, rejectedBoxes: rawDigitBoxes, matches: [], text: "1", confidence: 0.55 })
    };
  }

  const matches = digitBoxes.map((digitBox) => matchDigit(yellowPixels, digitBox));
  const text = matches.map((match) => match.digit).join("");
  const confidence = matches.reduce((sum, match) => sum + match.score, 0) / matches.length;
  const parsed = Number.parseInt(text, 10);
  const alternatives = quantityAlternatives(matches);
  const minimumConfidence = strict ? 0.58 : 0.45;
  const debug = makeQuantityDebug({ mode, strict, scanBox, yellowPixels, digitBoxes, rejectedBoxes: rawDigitBoxes.filter((box) => !digitBoxes.includes(box)), matches, text, confidence });

  if (!Number.isFinite(parsed) || parsed <= 0 || confidence < minimumConfidence) {
    return { quantity: 1, confidence: 0.35, alternatives: [{ quantity: 1, confidence: 0.35 }, ...alternatives], debug };
  }

  return { quantity: parsed, confidence, alternatives, debug };
}

function makeQuantityDebug({ mode, strict, scanBox, yellowPixels, digitBoxes, rejectedBoxes = [], matches, text, confidence }) {
  return {
    mode,
    strict,
    scanBox,
    pixelCount: yellowPixels.length,
    pixels: yellowPixels.map((pixel) => ({ x: pixel.x, y: pixel.y })),
    digitBoxes: digitBoxes.map((box) => ({ ...box })),
    rejectedBoxes: rejectedBoxes.map((box) => ({ ...box })),
    matches: matches.map((match, index) => ({
      index: index + 1,
      digit: match.digit,
      score: match.score,
      normalized: match.normalized,
      options: (match.options || []).slice(0, 3).map((option) => ({ digit: option.digit, score: option.score }))
    })),
    text,
    confidence
  };
}

function quantityAlternatives(matches) {
  const candidateDigits = matches.map((match) => {
    const options = match.options?.length ? match.options : [{ digit: match.digit, score: match.score }];
    return options.slice(0, 4);
  });
  let candidates = [{ text: "", confidence: 0, count: 0 }];
  for (const options of candidateDigits) {
    const next = [];
    for (const candidate of candidates) {
      for (const option of options) {
        next.push({
          text: `${candidate.text}${option.digit}`,
          confidence: candidate.confidence + option.score,
          count: candidate.count + (option.digit === "" ? 0 : 1)
        });
      }
    }
    candidates = next;
  }

  const seen = new Set();
  return candidates
    .map((candidate) => ({
      quantity: Number.parseInt(candidate.text, 10),
      confidence: candidate.count ? candidate.confidence / candidate.count : 0
    }))
    .filter((candidate) => Number.isFinite(candidate.quantity) && candidate.quantity > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate) => {
      if (seen.has(candidate.quantity)) return false;
      seen.add(candidate.quantity);
      return true;
    })
    .slice(0, 6);
}

function quantityCandidatesAreClose(detection) {
  const gap = quantityAlternativeConfidenceGap(detection);
  return gap !== null && gap <= QUANTITY_REVIEW_MARGIN;
}

function quantityAlternativeConfidenceGap(detection) {
  const options = detection.quantityAlternatives || [];
  if (options.length < 2) return null;
  return Math.abs(options[0].confidence - options[1].confidence);
}

function collectYellowPixels(imageData, box, options = {}) {
  const { width, data } = imageData;
  const pixels = [];
  const strict = options.strict === true;
  const scanBox = quantityScanBox(box, strict);
  for (let y = scanBox.y; y < scanBox.y + scanBox.h; y += 1) {
    for (let x = scanBox.x; x < scanBox.x + scanBox.w; x += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if ((strict ? isStrictQuantityTextPixel(r, g, b) : isQuantityPixel(r, g, b))) {
        pixels.push({ x: x - box.x, y: y - box.y });
      }
    }
  }
  return pixels;
}

function quantityScanBox(box, strict = false) {
  return {
    x: box.x,
    y: box.y,
    w: Math.min(strict ? 24 : 26, box.w),
    h: Math.min(17, box.h)
  };
}

function isQuantityPixel(r, g, b) {
  return r > 125 && g > 105 && b < 85 && r >= g - 20;
}

function isStrictQuantityTextPixel(r, g, b) {
  return isQuantityPixel(r, g, b) && r <= g + 70 && (r + g) / 2 - b >= 58;
}

function isPlausibleQuantityDigitBox(pixels, box, strict = false) {
  if (box.w < 2 || box.h < 4) return false;
  if (!strict) return true;
  if (box.x > 19 || box.y > 10 || box.w > 6 || box.h > 10) return false;
  const area = pixels.filter((pixel) => pixel.x >= box.x && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h).length;
  const density = area / Math.max(1, box.w * box.h);
  return area >= 4 && density >= 0.16 && density <= 0.78;
}

function splitDigitBoxes(pixels) {
  const columns = [...new Set(pixels.map((pixel) => pixel.x))].sort((a, b) => a - b);
  const groups = [];
  let current = [];

  for (const column of columns) {
    const previous = current[current.length - 1];
    if (current.length && column - previous > 1) {
      groups.push(current);
      current = [];
    }
    current.push(column);
  }
  if (current.length) groups.push(current);

  return groups.flatMap((group) => {
    const groupPixels = pixels.filter((pixel) => pixel.x >= group[0] && pixel.x <= group[group.length - 1]);
    const minY = Math.min(...groupPixels.map((pixel) => pixel.y));
    const maxY = Math.max(...groupPixels.map((pixel) => pixel.y));
    const box = { x: group[0], y: minY, w: group[group.length - 1] - group[0] + 1, h: maxY - minY + 1 };
    return splitWideDigitBox(pixels, box);
  });
}

function splitWideDigitBox(pixels, box) {
  if (box.w <= 5) return [box];

  const columnCounts = [];
  for (let x = box.x; x < box.x + box.w; x += 1) {
    columnCounts.push(pixels.filter((pixel) => pixel.x === x && pixel.y >= box.y && pixel.y < box.y + box.h).length);
  }
  const splitAt = columnCounts.findIndex((count, index) => index > 1 && index < columnCounts.length - 2 && count <= 1);
  if (splitAt > 0) {
    const left = pixelsToBox(pixels.filter((pixel) => pixel.x >= box.x && pixel.x < box.x + splitAt && pixel.y >= box.y && pixel.y < box.y + box.h));
    const right = pixelsToBox(pixels.filter((pixel) => pixel.x > box.x + splitAt && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h));
    if (left && right) return [left, right];
  }

  const digitWidth = 3;
  const digitGap = 1;
  const count = Math.max(1, Math.round((box.w + digitGap) / (digitWidth + digitGap)));
  if (count <= 1) return [box];

  const boxes = [];
  for (let index = 0; index < count; index += 1) {
    const startX = box.x + index * (digitWidth + digitGap);
    const endX = index === count - 1 ? box.x + box.w - 1 : Math.min(box.x + box.w - 1, startX + digitWidth - 1);
    const partPixels = pixels.filter((pixel) => pixel.x >= startX && pixel.x <= endX && pixel.y >= box.y && pixel.y < box.y + box.h);
    if (!partPixels.length) continue;
    const minX = Math.min(...partPixels.map((pixel) => pixel.x));
    const maxX = Math.max(...partPixels.map((pixel) => pixel.x));
    const minY = Math.min(...partPixels.map((pixel) => pixel.y));
    const maxY = Math.max(...partPixels.map((pixel) => pixel.y));
    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }

  return boxes.length ? boxes : [box];
}

function pixelsToBox(pixels) {
  if (!pixels.length) return null;
  const minX = Math.min(...pixels.map((pixel) => pixel.x));
  const maxX = Math.max(...pixels.map((pixel) => pixel.x));
  const minY = Math.min(...pixels.map((pixel) => pixel.y));
  const maxY = Math.max(...pixels.map((pixel) => pixel.y));
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function matchDigit(pixels, box) {
  const normalized = normalizeDigit(pixels, box);
  let best = { digit: "1", score: 0 };
  const scores = {};

  for (const [digit, template] of Object.entries(digitTemplates)) {
    const score = shiftedTemplateScore(normalized, template);
    scores[digit] = score;
    if (score > best.score) best = { digit, score };
  }

  const adjusted = adjustCommonQuantityMistakes(best, scores, normalized);
  adjusted.normalized = normalized;
  adjusted.options = digitOptions(scores, adjusted);
  return adjusted;
}

function digitOptions(scores, adjusted) {
  const options = Object.entries(scores)
    .map(([digit, score]) => ({ digit, score }))
    .sort((a, b) => b.score - a.score);
  const adjustedIndex = options.findIndex((option) => option.digit === adjusted.digit);
  if (adjustedIndex >= 0) options.splice(adjustedIndex, 1);
  return [{ digit: adjusted.digit, score: adjusted.score }, ...options].slice(0, 5);
}

function adjustCommonQuantityMistakes(best, scores, normalized) {
  const rows = normalized.map((row) => row.split(""));
  const has = (x, y) => rows[y]?.[x] === "1";
  const scoreGap = (a, b) => Math.abs((scores[a] || 0) - (scores[b] || 0));

  if (best.digit === "7" && scores[2] >= (scores[7] || 0) - 0.18) {
    const hasMiddle = has(1, 2) || has(2, 2);
    const hasLowerLeft = has(0, 3) || has(0, 4);
    const weakSevenStem = !has(2, 2) || !has(1, 3);
    if ((hasMiddle && hasLowerLeft) || (weakSevenStem && scoreGap("2", "7") <= 0.18)) {
      return { digit: "2", score: Math.max(scores[2] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "9" && scores[3] >= (scores[9] || 0) - 0.28) {
    const hasLeftLower = has(0, 3) || has(0, 4);
    const strongRightSide = has(2, 1) && has(2, 2) && has(2, 3);
    const weakNineLoop = !has(0, 1) || !has(0, 2);
    const threeLikeCenter = has(1, 2) || has(2, 2);
    if ((!hasLeftLower && strongRightSide) || (weakNineLoop && threeLikeCenter) || scoreGap("3", "9") <= 0.2) {
      return { digit: "3", score: Math.max(scores[3] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "6" && scores[0] >= (scores[6] || 0) - 0.2) {
    const openRightTop = !has(2, 1);
    const zeroLoop = has(0, 1) && has(2, 1) && has(0, 3) && has(2, 3);
    if (zeroLoop || openRightTop) {
      return { digit: "0", score: Math.max(scores[0] || 0, best.score - 0.04) };
    }
  }

  if (best.digit === "8" && scores[6] >= (scores[8] || 0) - 0.14 && !has(2, 1)) {
    return { digit: "6", score: Math.max(scores[6] || 0, best.score - 0.04) };
  }

  return best;
}

function shiftedTemplateScore(normalized, template) {
  let best = 0;
  for (let shiftY = -1; shiftY <= 1; shiftY += 1) {
    for (let shiftX = -1; shiftX <= 1; shiftX += 1) {
      let same = 0;
      let total = 0;
      for (let y = 0; y < DIGIT_TEMPLATE_HEIGHT; y += 1) {
        for (let x = 0; x < DIGIT_TEMPLATE_WIDTH; x += 1) {
          const templateY = y - shiftY;
          const templateX = x - shiftX;
          const expected =
            templateY >= 0 && templateY < DIGIT_TEMPLATE_HEIGHT && templateX >= 0 && templateX < DIGIT_TEMPLATE_WIDTH
              ? template[templateY][templateX]
              : "0";
          total += expected === "1" ? 2 : 1;
          if (normalized[y][x] === expected) same += expected === "1" ? 2 : 1;
        }
      }
      best = Math.max(best, same / total);
    }
  }
  return best;
}

function normalizeDigit(pixels, box) {
  const grid = Array.from({ length: DIGIT_TEMPLATE_HEIGHT }, () => Array.from({ length: DIGIT_TEMPLATE_WIDTH }, () => "0"));
  const inside = new Set(
    pixels
      .filter((pixel) => pixel.x >= box.x && pixel.x < box.x + box.w && pixel.y >= box.y && pixel.y < box.y + box.h)
      .map((pixel) => `${pixel.x},${pixel.y}`)
  );

  for (let gy = 0; gy < DIGIT_TEMPLATE_HEIGHT; gy += 1) {
    for (let gx = 0; gx < DIGIT_TEMPLATE_WIDTH; gx += 1) {
      let hits = 0;
      let samples = 0;
      const startX = box.x + Math.floor((gx / DIGIT_TEMPLATE_WIDTH) * box.w);
      const endX = box.x + Math.max(1, Math.floor(((gx + 1) / DIGIT_TEMPLATE_WIDTH) * box.w));
      const startY = box.y + Math.floor((gy / DIGIT_TEMPLATE_HEIGHT) * box.h);
      const endY = box.y + Math.max(1, Math.floor(((gy + 1) / DIGIT_TEMPLATE_HEIGHT) * box.h));
      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          samples += 1;
          if (inside.has(`${x},${y}`)) hits += 1;
        }
      }
      grid[gy][gx] = hits / Math.max(samples, 1) > 0.18 ? "1" : "0";
    }
  }

  return grid.map((row) => row.join(""));
}

function copyImageData(imageData, box) {
  const crop = new ImageData(box.w, box.h);
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      const source = ((box.y + y) * imageData.width + box.x + x) * 4;
      const target = (y * box.w + x) * 4;
      crop.data[target] = imageData.data[source];
      crop.data[target + 1] = imageData.data[source + 1];
      crop.data[target + 2] = imageData.data[source + 2];
      crop.data[target + 3] = imageData.data[source + 3];
    }
  }
  return crop;
}

function cropImageData(imageData, box) {
  return copyImageData(imageData, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h
  });
}

function makePreviewCanvas(imageData, box, options = {}) {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "slot-preview";
  if (options.enhanceHover === false) preview.classList.add("no-hover-enhance");
  const previewCtx = preview.getContext("2d");
  const temp = document.createElement("canvas");
  temp.width = box.w;
  temp.height = box.h;
  temp.getContext("2d").putImageData(copyImageData(imageData, box), 0, 0);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

function makeProcessedCanvas(originalImageData, shapeImageData, box, options = {}) {
  const enhance = options.enhance !== false;
  const iconBox = getIconMatchBox(box);
  const originalCrop = copyImageData(originalImageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);
  const bounds = alphaBounds(shapeCrop);
  const masked = new ImageData(originalCrop.width, originalCrop.height);

  for (let i = 0; i < originalCrop.data.length; i += 4) {
    if (shapeCrop.data[i + 3] <= 20) continue;
    const color = enhance
      ? enhancePreviewColor(originalCrop.data[i], originalCrop.data[i + 1], originalCrop.data[i + 2])
      : { r: originalCrop.data[i], g: originalCrop.data[i + 1], b: originalCrop.data[i + 2] };
    masked.data[i] = color.r;
    masked.data[i + 1] = color.g;
    masked.data[i + 2] = color.b;
    masked.data[i + 3] = 255;
  }

  const source = document.createElement("canvas");
  source.width = masked.width;
  source.height = masked.height;
  source.getContext("2d").putImageData(masked, 0, 0);

  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "processed-preview";
  if (!enhance) preview.classList.add("no-hover-enhance");
  const previewCtx = preview.getContext("2d");
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";

  if (bounds) {
    const longest = Math.max(bounds.w, bounds.h);
    const maxIconSize = PREVIEW_SIZE - 8;
    const drawW = Math.ceil((bounds.w / longest) * maxIconSize);
    const drawH = Math.ceil((bounds.h / longest) * maxIconSize);
    const dx = Math.floor((PREVIEW_SIZE - drawW) / 2);
    const dy = Math.floor((PREVIEW_SIZE - drawH) / 2);
    previewCtx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, dx, dy, drawW, drawH);
  }

  return preview;
}

function brightenChannel(value, factor) {
  return Math.max(0, Math.min(255, Math.round(value * factor)));
}

function enhancePreviewColor(r, g, b) {
  const brightness = 1.8;
  const saturation = 1.75;
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  return {
    r: brightenChannel(gray + (r - gray) * saturation, brightness),
    g: brightenChannel(gray + (g - gray) * saturation, brightness),
    b: brightenChannel(gray + (b - gray) * saturation, brightness)
  };
}

function makeBackgroundRemovedCanvas(imageData, box) {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "clean-preview";
  const previewCtx = preview.getContext("2d");
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  const temp = document.createElement("canvas");
  temp.width = box.w;
  temp.height = box.h;
  const tempCtx = temp.getContext("2d");
  tempCtx.putImageData(copyImageData(imageData, box), 0, 0);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

function makeRemovedOverlayCanvas(imageData, shapeImageData, box) {
  const iconBox = getIconMatchBox(box);
  const overlay = copyImageData(imageData, iconBox);
  const shapeCrop = copyImageData(shapeImageData, iconBox);

  for (let y = 0; y < iconBox.h; y += 1) {
    for (let x = 0; x < iconBox.w; x += 1) {
      const target = (y * iconBox.w + x) * 4;
      if (shapeCrop.data[target + 3] > 0) continue;
      overlay.data[target] = 255;
      overlay.data[target + 1] = 0;
      overlay.data[target + 2] = 0;
      overlay.data[target + 3] = 210;
    }
  }

  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "background-overlay-preview";
  const previewCtx = preview.getContext("2d");
  const temp = document.createElement("canvas");
  temp.width = iconBox.w;
  temp.height = iconBox.h;
  temp.getContext("2d").putImageData(overlay, 0, 0);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

function makeCroppedShapeCanvas(imageData, box) {
  const iconBox = getIconMatchBox(box);
  const cropData = copyImageData(imageData, iconBox);
  const bounds = alphaBounds(cropData);
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "recognition-preview";
  const previewCtx = preview.getContext("2d");
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const temp = document.createElement("canvas");
  temp.width = bounds?.w || cropData.width;
  temp.height = bounds?.h || cropData.height;
  const tempCtx = temp.getContext("2d");
  if (bounds) {
    tempCtx.putImageData(cropImageData(cropData, bounds), 0, 0);
  } else {
    tempCtx.putImageData(cropData, 0, 0);
  }

  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(temp, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  return preview;
}

function makeScaledShapeCanvas(fingerprint) {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "augmented-preview";
  paintFingerprintMask(preview, fingerprint);
  return preview;
}

function makeReferenceCanvas(image) {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "reference-preview";
  const previewCtx = preview.getContext("2d");
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const maxIconSize = PREVIEW_SIZE - 8;
  const drawWidth = Math.round((image.naturalWidth / longest) * maxIconSize);
  const drawHeight = Math.round((image.naturalHeight / longest) * maxIconSize);
  const x = Math.floor((PREVIEW_SIZE - drawWidth) / 2);
  const y = Math.floor((PREVIEW_SIZE - drawHeight) / 2);
  previewCtx.drawImage(image, x, y, drawWidth, drawHeight);
  return preview;
}

function makeShapeMaskCanvas(fingerprint) {
  const preview = document.createElement("canvas");
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.className = "shape-mask-preview";
  paintFingerprintMask(preview, fingerprint);
  return preview;
}

function paintFingerprintMask(canvas, fingerprint) {
  const previewCtx = canvas.getContext("2d");
  previewCtx.clearRect(0, 0, canvas.width, canvas.height);
  if (!fingerprint?.length) return;

  const pixel = canvas.width / MATCH_SIZE;
  previewCtx.fillStyle = "#111417";
  for (let y = 0; y < MATCH_SIZE; y += 1) {
    for (let x = 0; x < MATCH_SIZE; x += 1) {
      if (!fingerprint[y * MATCH_SIZE + x]?.visible) continue;
      previewCtx.fillRect(x * pixel, y * pixel, Math.ceil(pixel), Math.ceil(pixel));
    }
  }
}

function renderDetections() {
  if (!detections.length) {
    if (activeResultsTab === "damaged") drawEmptyState("No occupied artefact slots detected.");
    updateTotals();
    renderRestorationPlan([]);
    renderResultsTabContent();
    return;
  }

  updateFilterOptions();
  const visibleDetections = filteredDetections();
  if (activeResultsTab === "damaged") {
    renderDamagedTable(visibleDetections);
  }

  updateTotals();
  renderRestorationPlan(visibleDetections);
  renderResultsTabContent();
}

function makeDetectionTableRow(detection) {
    const row = document.createElement("tr");
    const quantityCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const levelCell = document.createElement("td");
    const themeCell = document.createElement("td");
    const siteCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const referenceCell = document.createElement("td");
    const previewCell = document.createElement("td");
    const processedCell = document.createElement("td");
    const input = document.createElement("input");
    const quantityWarning = quantityNeedsReview(detection);

    row.className = rowReviewClass(detection, quantityWarning);
    row.addEventListener("click", (event) => {
      if (isInteractiveRowTarget(event.target)) return;
      verifyDetection(detection);
    });

    quantityCell.className = "quantity-cell";
    referenceCell.className = "image-cell";
    previewCell.className = "image-cell";
    processedCell.className = "image-cell";

    detection.referencePreview.classList.toggle(
      "review-border",
      detection.ambiguousMatch && !(detection.corrected && detection.manual)
    );
    previewCell.append(detection.preview);
    processedCell.append(detection.processedPreview);
    referenceCell.append(makeReferenceCorrectionDropdown(detection));

    if (detection.wikiPage) {
      const link = document.createElement("a");
      link.className = "artifact-link";
      link.href = detection.wikiPage;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = detection.restoredName || detection.artefact;
      nameCell.append(link);
    } else {
      nameCell.textContent = detection.restoredName || detection.artefact;
    }

    nameCell.append(makeRecognitionInfo(detection));

    levelCell.textContent = detection.archaeologyLevel ?? "";
    themeCell.textContent = detection.culture || "";
    siteCell.textContent = detection.digSite || "";
    statusCell.append(makeStatusPill(detection, quantityWarning));

    input.className = "qty-input";
    if (quantityWarning) input.classList.add("quantity-warning-input");
    if (quantityCandidatesAreClose(detection)) input.classList.add("quantity-close-input");
    input.type = "text";
    input.inputMode = "numeric";
    input.value = detection.quantity;
    input.addEventListener("change", () => {
      applyQuantityChange(detection, Math.max(1, Number.parseInt(input.value, 10) || 1), "quantity-input");
      input.value = detection.quantity;
      markQuantityManual(quantityCell);
      updateTotals();
    });

    const stepper = document.createElement("div");
    stepper.className = "qty-stepper";
    const arrows = document.createElement("div");
    arrows.className = "qty-arrows";
    const down = makeQuantityButton("−", () => {
      applyQuantityChange(detection, Math.max(1, detection.quantity - 1), "quantity-stepper");
      input.value = detection.quantity;
      markQuantityManual(quantityCell);
      updateTotals();
    });
    const up = makeQuantityButton("+", () => {
      applyQuantityChange(detection, detection.quantity + 1, "quantity-stepper");
      input.value = detection.quantity;
      markQuantityManual(quantityCell);
      updateTotals();
    });
    arrows.append(up, down);
    stepper.append(input, arrows);
    quantityCell.append(stepper, makeQuantityDebugView(detection));

    detection.rowElements = {
      row,
      quantityCell,
      referenceCell,
      nameCell,
      levelCell,
      themeCell,
      siteCell,
      statusCell
    };

    row.append(
      nameCell,
      levelCell,
      themeCell,
      siteCell,
      statusCell,
      previewCell,
      processedCell,
      referenceCell,
      quantityCell
    );
    return row;
}

function makeStatusPill(detection, quantityWarning = quantityNeedsReview(detection)) {
  const status = document.createElement("span");
  status.className = "status-pill";
  if (detection.corrected && detection.manual) {
    status.classList.add("checked");
    status.textContent = "Checked";
  } else if (detection.ambiguousMatch || quantityWarning) {
    status.classList.add("review");
    status.textContent = "Review";
  } else {
    status.textContent = "Ready";
  }
  return status;
}

function filteredDetections() {
  return sortedDetections().filter((detection) => matchesDetectionFilters(detection));
}

function matchesDetectionFilters(detection) {
  const query = artefactSearch.value.trim().toLowerCase();
  const culture = cultureFilter.value;
  if (culture && detection.culture !== culture) return false;
  if (reviewOnly.checked && !(detection.ambiguousMatch || quantityNeedsReview(detection))) return false;
  if (!query) return true;
  return [
    detection.restoredName,
    detection.artefact,
    detection.culture,
    detection.digSite,
    detection.archaeologyLevel
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function setActiveResultsTab(tab) {
  if (!RESULT_TAB_TITLES[tab]) return;
  activeResultsTab = tab;
  detections = detectionsByMode[resultModeForTab(tab)];
  resultsTitle.textContent = RESULT_TAB_TITLES[tab];

  for (const button of resultTabButtons) {
    const active = button.dataset.resultsTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  }

  for (const panel of resultTabPanels) {
    panel.hidden = panel.dataset.resultsPanel !== tab;
  }

  if (tab === "damaged") renderDamagedTable(filteredDetections());
  updateTotals();
  renderResultsTabContent();
  requestTabScreenshot(tab);
}

function renderResultsTabContent() {
  const items = filteredDetections();
  if (activeResultsTab === "overview") renderOverviewTab(items);
  if (activeResultsTab === "restored") renderRestoredTab(items);
  if (activeResultsTab === "storage") renderStorageTab(items);
  if (activeResultsTab === "materials") renderMaterialsTab(items);
}

function resultModeForTab(tab) {
  return tab === "restored" ? "restored" : "damaged";
}

function renderDamagedTable(items) {
  resultsBody.replaceChildren();
  if (!detections.length) {
    drawEmptyState("Analyze a damaged artefact screenshot to populate this table.");
    return;
  }
  if (!items.length) {
    drawEmptyState("No artefacts match the current filters.");
    return;
  }
  for (const detection of items) resultsBody.append(makeDetectionTableRow(detection));
}

function requestTabScreenshot(tab) {
  if (!["restored", "materials"].includes(tab) || screenshotRequestedTabs.has(tab)) return;
  screenshotRequestedTabs.add(tab);
  imageInput.click();
}

function renderOverviewTab(items) {
  overviewPanel.replaceChildren();
  if (!detections.length) {
    overviewPanel.append(makeEmptyMessage("Analyze a screenshot to create an overview."));
    return;
  }

  const totalQuantity = items.reduce((sum, detection) => sum + detection.quantity, 0);
  const reviewCount = items.filter((detection) => detection.ambiguousMatch || quantityNeedsReview(detection)).length;
  const manualCount = items.filter((detection) => detection.manual || detection.quantityManual).length;
  const levels = items.map((detection) => detection.archaeologyLevel).filter(Number.isFinite);

  const cards = document.createElement("div");
  cards.className = "overview-grid";
  cards.append(
    makeOverviewCard("Visible slots", items.length),
    makeOverviewCard("Visible quantity", totalQuantity),
    makeOverviewCard("Needs review", reviewCount),
    makeOverviewCard("Manual checks", manualCount),
    makeOverviewCard("Highest level", levels.length ? Math.max(...levels) : 0)
  );

  const groups = document.createElement("div");
  groups.className = "overview-tables";
  groups.append(
    makePlanTable("By culture", groupQuantity(items, "culture")),
    makePlanTable("By dig site", groupQuantity(items, "digSite"))
  );

  overviewPanel.append(cards, groups, makeCollectionOverview(items));
}

function renderRestoredTab(items) {
  restoredResultsBody.replaceChildren();
  if (!detections.length) {
    drawTableEmptyState(restoredResultsBody, "Upload and analyze a restored artefact screenshot to populate this table.");
    return;
  }

  if (!items.length) {
    drawTableEmptyState(restoredResultsBody, "No restored artefacts match the current filters.");
    return;
  }

  for (const detection of items) restoredResultsBody.append(makeDetectionTableRow(detection));
}

function drawTableEmptyState(body, message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 9;
  cell.className = "empty";
  cell.textContent = message;
  row.append(cell);
  body.append(row);
}

function renderMaterialsTab(items) {
  materialsPanel.replaceChildren();
  if (!detections.length) {
    materialsPanel.append(makeEmptyMessage("Analyze a screenshot to calculate needed restoration materials."));
    return;
  }

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  const materialRows = calculateMaterialTotals(items);
  summary.append(
    makeOverviewCard("Artefact quantity", items.reduce((sum, detection) => sum + detection.quantity, 0)),
    makeOverviewCard("Unique artefacts", aggregateRestoredArtefacts(items).length),
    makeOverviewCard("Needed materials", materialRows.length),
    makeOverviewCard("Recipe records", archaeologyReference.artefactRecipes?.length || 0)
  );

  if (!materialRows.length) {
    materialsPanel.append(summary, makeEmptyMessage("No material recipes match the current artefacts."));
    return;
  }

  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead(["Material", "Needed", "Used by artefacts"]));
  const body = document.createElement("tbody");

  for (const row of sortMaterialRows(materialRows)) {
    const tr = document.createElement("tr");
    tr.append(makeMaterialCell(row), makeTextCell(row.quantity, "number-cell"), makeTextCell(row.artefacts.join(", ")));
    body.append(tr);
  }

  table.append(body);
  materialsPanel.append(summary, table);
}

function renderStorageTab(items) {
  storagePanel.replaceChildren();
  const materials = [...(archaeologyReference.materials || [])].sort((a, b) => a.name.localeCompare(b.name));
  if (!materials.length) {
    storagePanel.append(makeEmptyMessage("Material reference data is not available."));
    return;
  }

  const summary = document.createElement("div");
  summary.className = "overview-grid";
  summary.append(
    makeOverviewCard("Known materials", materials.length),
    makeOverviewCard("Needed now", calculateMaterialTotals(items).length),
    makeOverviewCard("Storage matched", 0)
  );

  const table = document.createElement("table");
  table.className = "secondary-table materials-table";
  table.append(makeTableHead(["Material", "Wiki page"]));
  const body = document.createElement("tbody");

  for (const material of materials) {
    const tr = document.createElement("tr");
    const linkCell = makeLinkedTextCell(material.name, material.wikiPage);
    tr.append(makeMaterialCell({ name: material.name }), linkCell);
    body.append(tr);
  }

  table.append(body);
  storagePanel.append(
    summary,
    makeEmptyMessage("Storage screenshot recognition is ready to be added on top of this material database."),
    table
  );
}

function updateFilterOptions() {
  const current = cultureFilter.value;
  const cultures = [...new Set(detections.map((detection) => detection.culture).filter(Boolean))].sort();
  cultureFilter.replaceChildren(new Option("All cultures", ""));
  for (const culture of cultures) cultureFilter.append(new Option(culture, culture));
  if (cultures.includes(current)) cultureFilter.value = current;
}

function renderRestorationPlan(items) {
  const selectedQuantity = items.reduce((sum, detection) => sum + detection.quantity, 0);
  const reviewCount = detections.filter((detection) => detection.ambiguousMatch || quantityNeedsReview(detection)).length;
  const levels = items.map((detection) => detection.archaeologyLevel).filter(Number.isFinite);

  visibleCountEl.textContent = String(selectedQuantity);
  reviewCountEl.textContent = String(reviewCount);
  highestLevelEl.textContent = levels.length ? String(Math.max(...levels)) : "0";

  planBody.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = detections.length ? "No visible artefacts for the current filters." : "Analyze a screenshot to populate the restoration plan.";
    planBody.append(empty);
    return;
  }

  planBody.append(
    makePlanTable("By culture", groupQuantity(items, "culture")),
    makePlanTable("By dig site", groupQuantity(items, "digSite"))
  );
}

function groupQuantity(items, key) {
  const groups = new Map();
  for (const detection of items) {
    const name = detection[key] || "Unknown";
    groups.set(name, (groups.get(name) || 0) + detection.quantity);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function makePlanTable(captionText, rows) {
  const table = document.createElement("table");
  table.className = "plan-table";
  const caption = document.createElement("caption");
  caption.textContent = captionText;
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const nameHead = document.createElement("th");
  const qtyHead = document.createElement("th");
  nameHead.textContent = "Group";
  qtyHead.textContent = "Qty";
  headRow.append(nameHead, qtyHead);
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const [name, quantity] of rows) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    nameCell.textContent = name;
    quantityCell.textContent = String(quantity);
    row.append(nameCell, quantityCell);
    body.append(row);
  }
  table.append(caption, head, body);
  return table;
}

function makeOverviewCard(label, value) {
  const card = document.createElement("div");
  card.className = "overview-card";
  const labelEl = document.createElement("span");
  labelEl.className = "summary-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.textContent = String(value);
  card.append(labelEl, valueEl);
  return card;
}

function makeEmptyMessage(message) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function makeTableHead(labels) {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  for (const label of labels) {
    const cell = document.createElement("th");
    cell.textContent = label;
    row.append(cell);
  }
  head.append(row);
  return head;
}

function makeTextCell(value, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = String(value);
  return cell;
}

function makeLinkedTextCell(label, href) {
  const cell = document.createElement("td");
  if (!href) {
    cell.textContent = label;
    return cell;
  }
  const link = document.createElement("a");
  link.className = "artifact-link";
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  cell.append(link);
  return cell;
}

function makeMaterialCell(row) {
  const material = materialByName.get(normalizeName(row.name));
  const cell = document.createElement("td");
  cell.className = "material-cell";
  if (material?.icon) {
    const image = document.createElement("img");
    image.src = `data/${material.icon}`;
    image.alt = "";
    image.loading = "lazy";
    cell.append(image);
  }
  const label = material?.wikiPage ? document.createElement("a") : document.createElement("span");
  label.textContent = row.name;
  if (material?.wikiPage) {
    label.className = "artifact-link";
    label.href = material.wikiPage;
    label.target = "_blank";
    label.rel = "noreferrer";
  }
  cell.append(label);
  return cell;
}

function calculateMaterialTotals(items) {
  const totals = new Map();
  for (const detection of items) {
    const recipe = recipeByRestoredName.get(normalizeName(detection.restoredName || detection.artefact));
    if (!recipe?.materials?.length) continue;
    for (const material of recipe.materials) {
      const key = normalizeName(material.name);
      const current = totals.get(key) || { name: material.name, quantity: 0, artefacts: new Set() };
      current.quantity += material.quantity * detection.quantity;
      current.artefacts.add(detection.restoredName || detection.artefact);
      totals.set(key, current);
    }
  }
  return [...totals.values()].map((row) => ({ ...row, artefacts: [...row.artefacts].sort() }));
}

function aggregateRestoredArtefacts(items) {
  const groups = new Map();
  for (const detection of items) {
    const key = detection.restoredName || detection.artefact;
    const current =
      groups.get(key) || {
        restoredName: key,
        damagedName: detection.artefact,
        level: detection.archaeologyLevel,
        culture: detection.culture,
        digSite: detection.digSite,
        quantity: 0,
        needsReview: false
      };
    current.quantity += detection.quantity;
    current.needsReview = current.needsReview || detection.ambiguousMatch || quantityNeedsReview(detection);
    groups.set(key, current);
  }
  return [...groups.values()].sort(
    (a, b) => String(a.restoredName).localeCompare(String(b.restoredName))
  );
}

function sortRestoredRows(rows) {
  const mode = viewMode.value;
  return [...rows].sort((a, b) => {
    if (mode === "level") {
      return nullableNumber(a.level) - nullableNumber(b.level) || a.restoredName.localeCompare(b.restoredName);
    }
    if (mode === "theme") {
      return String(a.culture || "Unknown").localeCompare(String(b.culture || "Unknown")) || a.restoredName.localeCompare(b.restoredName);
    }
    if (mode === "site") {
      return String(a.digSite || "Unknown").localeCompare(String(b.digSite || "Unknown")) || a.restoredName.localeCompare(b.restoredName);
    }
    return a.restoredName.localeCompare(b.restoredName);
  });
}

function sortMaterialRows(rows) {
  const mode = viewMode.value;
  return [...rows].sort((a, b) => {
    if (mode === "level" || mode === "position") return b.quantity - a.quantity || a.name.localeCompare(b.name);
    if (mode === "theme" || mode === "site") return a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

function makeCollectionOverview(items) {
  const section = document.createElement("div");
  section.className = "collection-overview";
  const ownedArtefacts = getOwnedArtefactMap(items);
  const rows = (archaeologyReference.collections || [])
    .map((collection) => {
      const matched = collection.artefacts.filter((artefact) => ownedArtefacts.has(normalizeName(artefact)));
      const total = collection.artefactCount || collection.artefacts.length || 1;
      return { collection, matched, progress: matched.length, progressTotal: total, progressPercent: matched.length / total };
    })
    .filter((row) => row.matched.length)
    .sort(compareCollectionRows);

  const title = document.createElement("h3");
  title.textContent = "Matching collections";
  section.append(title);

  if (!rows.length) {
    section.append(makeEmptyMessage("No collection matches for the current artefacts."));
    return section;
  }

  const table = document.createElement("table");
  table.className = "secondary-table collection-table";
  table.append(makeCollectionColGroup());
  table.append(makeCollectionTableHead());
  const body = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.append(
      makeLinkedTextCell(row.collection.name, row.collection.wikiPage),
      makeTextCell(row.collection.collector || ""),
      makeTextCell(row.collection.archaeologyLevel ?? ""),
      makeTextCell(`${row.progress}/${row.progressTotal} (${Math.round(row.progressPercent * 100)}%)`),
      makeCollectionArtefactsCell(row.collection.artefacts, ownedArtefacts)
    );
    body.append(tr);
  }
  table.append(body);
  section.append(table);
  return section;
}

function makeCollectionColGroup() {
  const group = document.createElement("colgroup");
  for (const className of ["collection-name-col", "collection-collector-col", "collection-level-col", "collection-progress-col", "collection-artefacts-col"]) {
    const col = document.createElement("col");
    col.className = className;
    group.append(col);
  }
  return group;
}

function makeCollectionTableHead() {
  const columns = [
    ["name", "Collection"],
    ["collector", "Collector"],
    ["level", "Level"],
    ["progress", "Progress"],
    [null, "Artefacts"]
  ];
  const head = document.createElement("thead");
  const row = document.createElement("tr");

  for (const [key, label] of columns) {
    const cell = document.createElement("th");
    if (!key) {
      cell.textContent = label;
      row.append(cell);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-sort";
    button.textContent = label;
    if (collectionSort.key === key) {
      button.classList.add("is-active");
      button.dataset.direction = collectionSort.direction;
    }
    button.addEventListener("click", () => {
      collectionSort = {
        key,
        direction: collectionSort.key === key && collectionSort.direction === "asc" ? "desc" : "asc"
      };
      renderResultsTabContent();
    });
    cell.append(button);
    row.append(cell);
  }

  head.append(row);
  return head;
}

function compareCollectionRows(a, b) {
  const direction = collectionSort.direction === "asc" ? 1 : -1;
  let result = 0;
  if (collectionSort.key === "name") result = a.collection.name.localeCompare(b.collection.name);
  if (collectionSort.key === "collector") {
    result = String(a.collection.collector || "").localeCompare(String(b.collection.collector || ""));
  }
  if (collectionSort.key === "level") {
    result = nullableNumber(a.collection.archaeologyLevel) - nullableNumber(b.collection.archaeologyLevel);
  }
  if (collectionSort.key === "progress") result = a.progressPercent - b.progressPercent || a.progress - b.progress;

  return (
    result * direction ||
    nullableNumber(a.collection.archaeologyLevel) - nullableNumber(b.collection.archaeologyLevel) ||
    a.collection.name.localeCompare(b.collection.name)
  );
}

function getOwnedArtefactMap(items) {
  const owned = new Map();
  for (const item of items) {
    const name = item.restoredName || item.artefact;
    const key = normalizeName(name);
    const current = owned.get(key) || { name, quantity: 0 };
    current.quantity += item.quantity;
    owned.set(key, current);
  }
  return owned;
}

function makeCollectionArtefactsCell(artefacts, ownedArtefacts) {
  const cell = document.createElement("td");
  const grid = document.createElement("div");
  grid.className = "collection-artefacts";

  for (const artefact of artefacts) {
    const owned = ownedArtefacts.get(normalizeName(artefact));
    grid.append(makeCollectionArtefactIcon(artefact, owned?.quantity || 0));
  }

  cell.append(grid);
  return cell;
}

function makeCollectionArtefactIcon(artefact, quantity) {
  const reference = references.find((item) => normalizeName(item.restoredName || item.name) === normalizeName(artefact));
  const tile = document.createElement("span");
  tile.className = "collection-artefact";
  if (!quantity) tile.classList.add("is-missing");
  tile.title = quantity ? `${artefact}: ${quantity}` : `${artefact}: missing`;

  if (reference?.icon) {
    const image = document.createElement("img");
    image.src = `data/${reference.icon}`;
    image.alt = artefact;
    image.loading = "lazy";
    tile.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "collection-artefact-fallback";
    fallback.textContent = artefact.slice(0, 2).toUpperCase();
    tile.append(fallback);
  }

  const badge = document.createElement("span");
  badge.className = "collection-artefact-count";
  badge.textContent = String(quantity);
  tile.append(badge);
  return tile;
}

function rowReviewClass(detection, quantityWarning = quantityNeedsReview(detection)) {
  if (detection.corrected && detection.manual) return "checked-row";
  if (detection.ambiguousMatch || quantityWarning) return "review-row";
  return "";
}

function quantityNeedsReview(detection) {
  return !detection.quantityManual && quantityCandidatesAreClose(detection);
}

function applyQuantityChange(detection, quantity, source) {
  const previousQuantity = detection.quantity;
  detection.quantity = quantity;
  detection.manual = true;
  detection.quantityManual = true;
  detection.quantityCorrection = {
    correctedAt: new Date().toISOString(),
    originalQuantity: detection.originalQuantity,
    detectedQuantity: detection.originalQuantity,
    previousQuantity,
    correctedQuantity: detection.quantity,
    quantityConfidence: detection.quantityConfidence,
    source
  };
}

function isInteractiveRowTarget(target) {
  return Boolean(target.closest("button, input, a, details, summary, select, textarea"));
}

function makeQuantityButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "qty-button";
  button.textContent = label;
  let repeatTimer = null;
  let repeatDelay = null;
  const stopRepeating = () => {
    if (repeatDelay) window.clearTimeout(repeatDelay);
    if (repeatTimer) window.clearInterval(repeatTimer);
    repeatDelay = null;
    repeatTimer = null;
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    onClick();
    stopRepeating();
    repeatDelay = window.setTimeout(() => {
      repeatTimer = window.setInterval(onClick, 90);
    }, 350);
  });
  button.addEventListener("pointerup", stopRepeating);
  button.addEventListener("pointercancel", stopRepeating);
  button.addEventListener("pointerleave", stopRepeating);
  button.addEventListener("click", (event) => {
    event.preventDefault();
  });
  return button;
}

function makeQuantityDebugView(detection) {
  const debug = detection.quantityDebug;
  const details = document.createElement("details");
  details.className = "quantity-debug";
  const summary = document.createElement("summary");
  summary.textContent = "OCR";
  details.append(summary);

  if (!debug) {
    const empty = document.createElement("small");
    empty.textContent = "No OCR data";
    details.append(empty);
    return details;
  }

  const canvas = makeQuantityDebugCanvas(debug);
  const meta = document.createElement("small");
  meta.className = "quantity-debug-meta";
  meta.textContent = [
    `${debug.mode}${debug.strict ? " strict" : ""}`,
    `scan ${debug.scanBox.w}x${debug.scanBox.h}`,
    `${debug.pixelCount} px`,
    `read ${debug.text || "none"} (${percent(debug.confidence)})`
  ].join(" | ");

  const digitList = document.createElement("div");
  digitList.className = "quantity-debug-digits";
  if (debug.matches.length) {
    for (const match of debug.matches) {
      const line = document.createElement("code");
      const options = match.options.map((option) => `${option.digit}:${percent(option.score)}`).join(" ");
      line.textContent = `#${match.index} ${match.digit} ${percent(match.score)} ${match.normalized.join("/")} ${options}`;
      digitList.append(line);
    }
  } else {
    const line = document.createElement("code");
    line.textContent = "no accepted digit boxes";
    digitList.append(line);
  }

  details.append(canvas, meta, digitList);
  return details;
}

function makeQuantityDebugCanvas(debug) {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.className = "quantity-debug-canvas";
  canvas.width = debug.scanBox.w * scale;
  canvas.height = debug.scanBox.h * scale;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#1f2529";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#f3d14a";
  for (const pixel of debug.pixels) {
    if (pixel.x >= debug.scanBox.w || pixel.y >= debug.scanBox.h) continue;
    context.fillRect(pixel.x * scale, pixel.y * scale, scale, scale);
  }

  for (const box of debug.rejectedBoxes) {
    drawQuantityDebugBox(context, box, scale, "#b94a48");
  }
  for (const box of debug.digitBoxes) {
    drawQuantityDebugBox(context, box, scale, "#44a3ff");
  }

  return canvas;
}

function drawQuantityDebugBox(context, box, scale, color) {
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.strokeRect(box.x * scale + 0.5, box.y * scale + 0.5, box.w * scale - 1, box.h * scale - 1);
}

function markQuantityManual(quantityCell) {
  const input = quantityCell.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input");
  const row = quantityCell.closest("tr");
  const detection = detections.find((item) => item.rowElements?.quantityCell === quantityCell);
  if (row && detection) row.className = rowReviewClass(detection);
  if (detection?.rowElements?.statusCell) detection.rowElements.statusCell.replaceChildren(makeStatusPill(detection));
  if (detections.length) renderRestorationPlan(filteredDetections());
}

function makeRecognitionInfo(detection) {
  const wrapper = document.createElement("div");
  wrapper.className = "recognition-info";
  if (detection.ambiguousMatch) wrapper.classList.add("score-warning");
  wrapper.textContent = [
    `Match: ${percent(detection.matchScore)}`,
    `Overlap: ${percent(detection.overlapScore)}`,
    `Color: ${percent(detection.colorScore)}`,
    detection.ambiguousMatch ? `Gap: ${percent(detection.matchGap)}` : null
  ].filter(Boolean).join(" | ");

  return wrapper;
}

function percent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function bestMatchLabel(match) {
  if (!match?.item) return "none";
  return `${match.item.restoredName || match.item.name} ${percent(match.score)}`;
}

function makeCorrectionDropdown(detection) {
  const details = document.createElement("details");
  details.className = "correction-menu";
  const summary = document.createElement("summary");
  summary.title = "Choose artefact";
  summary.setAttribute("aria-label", "Choose artefact");
  summary.textContent = "↔";
  details.append(summary);

  details.addEventListener(
    "toggle",
    () => {
      if (details.open && !details.dataset.loaded) {
        details.append(makeCorrectionPanel(detection));
        details.dataset.loaded = "true";
      }
    },
    { once: false }
  );

  return details;
}

function makeReferenceCorrectionDropdown(detection) {
  const details = makeCorrectionDropdown(detection);
  details.classList.add("reference-correction-menu");
  const summary = details.querySelector("summary");
  summary.textContent = "";
  summary.append(detection.referencePreview);
  return details;
}

function makeCorrectionPanel(detection) {
  const panel = document.createElement("div");
  panel.className = "correction-panel";

  const search = document.createElement("input");
  search.className = "correction-search";
  search.type = "search";
  search.placeholder = "Search artefacts";
  panel.append(search);

  const list = document.createElement("div");
  panel.append(list);

  const renderList = () => {
    list.replaceChildren();
    const query = search.value.trim().toLowerCase();
    const topMatches = [...(detection.topMatches || [])].sort((a, b) => bestCandidateScore(b) - bestCandidateScore(a));
    const scored = new Map(topMatches.map((candidate) => [candidate.item.name, candidate.score]));

    const top = document.createElement("div");
    top.className = "correction-section-title";
    top.textContent = "Best matches";
    list.append(top);

    for (const candidate of topMatches.filter((candidate) => matchesCorrectionSearch(candidate.item, query))) {
      list.append(makeCorrectionOption(detection, candidate.item, candidate.score));
    }

    const all = document.createElement("div");
    all.className = "correction-section-title";
    all.textContent = "All artefacts";
    list.append(all);

    const items = [...references]
      .filter((item) => !scored.has(item.name))
      .filter((item) => matchesCorrectionSearch(item, query))
      .sort((a, b) => {
        return referenceBestScore(b, detection) - referenceBestScore(a, detection) || sortName(a).localeCompare(sortName(b));
      });

    for (const item of items) {
      list.append(makeCorrectionOption(detection, item, null));
    }
  };

  search.addEventListener("input", renderList);
  renderList();

  return panel;
}

function sortName(item) {
  return String(item.restoredName || item.name)
    .replace(/['"]/g, "")
    .toLowerCase();
}

function bestCandidateScore(candidate) {
  return Math.max(candidate.score || 0, candidate.shapeScore || 0, candidate.restoredScore || 0, candidate.damagedScore || 0);
}

function referenceBestScore(item, detection) {
  const candidate = (detection.topMatches || []).find((match) => match.item.name === item.name);
  return candidate ? bestCandidateScore(candidate) : -1;
}

function matchesCorrectionSearch(item, query) {
  if (!query) return true;
  return `${item.name} ${item.restoredName} ${item.culture || ""} ${item.archaeologyLevel || ""}`.toLowerCase().includes(query);
}

function makeCorrectionOption(detection, item, score) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "correction-option";

  const image = document.createElement("img");
  image.src = `data/${detection.recognitionMode === "restored" ? item.icon : item.damagedIcon || item.icon}`;
  image.alt = "";
  image.loading = "lazy";

  const label = document.createElement("span");
  label.textContent = item.restoredName || item.name;

  const meta = document.createElement("small");
  meta.textContent = score === null ? `${item.archaeologyLevel ?? "?"} ${item.culture || ""}` : `${Math.round(score * 100)}%`;

  button.append(image, label, meta);
  button.addEventListener("click", () => {
    applyReferenceCorrection(detection, item, score);
    const menu = button.closest("details");
    if (menu) menu.open = false;
  });
  return button;
}

function applyReferenceCorrection(detection, item, score) {
  const correctedAt = new Date().toISOString();
  detection.artefact = item.name;
  detection.wikiPage = item.restoredWikiPage || item.wikiPage;
  detection.damagedWikiPage = item.wikiPage;
  detection.restoredName = item.restoredName;
  detection.restoredWikiPage = item.restoredWikiPage;
  detection.archaeologyLevel = item.archaeologyLevel;
  detection.culture = item.culture;
  detection.digSite = item.digSite;
  detection.matchName = item.restoredName || item.name;
  detection.matchScore = score ?? 1;
  detection.shapeScore = score ?? 1;
  detection.colorScore = score ?? 1;
  detection.colorExistenceScore = score ?? 1;
  detection.colorPositionScore = score ?? 1;
  detection.restoredScore = score ?? 1;
  detection.damagedScore = score ?? 1;
  detection.ambiguousMatch = false;
  detection.matchGap = 1;
  detection.algorithmBest = {
    shape: { item, score: score ?? 1 },
    color: { item, score: score ?? 1 },
    restored: { item, score: score ?? 1 },
    damaged: { item, score: score ?? 1 }
  };
  detection.referencePreview = makeReferenceCanvas(item.image);
  detection.corrected = true;
  detection.manual = true;
  detection.correction = {
    correctedAt,
    damagedName: item.name,
    restoredName: item.restoredName,
    archaeologyLevel: item.archaeologyLevel,
    culture: item.culture,
    scoreAtSelection: score,
    source: "manual-dropdown"
  };
  updateDetectionRow(detection);
  updateTotals();
}

function verifyDetection(detection) {
  if (detection.corrected && detection.manual) return;

  detection.corrected = true;
  detection.manual = true;
  detection.ambiguousMatch = false;
  detection.matchGap = Math.max(detection.matchGap || 0, AMBIGUOUS_FINAL_MARGIN);
  detection.correction = {
    correctedAt: new Date().toISOString(),
    damagedName: detection.artefact,
    restoredName: detection.restoredName,
    archaeologyLevel: detection.archaeologyLevel,
    culture: detection.culture,
    scoreAtSelection: detection.matchScore,
    source: "row-verified"
  };
  updateDetectionRow(detection);
  updateTotals();
}

function updateDetectionRow(detection) {
  const elements = detection.rowElements;
  if (!elements) return;

  detection.referencePreview.classList.remove("review-border");
  const input = elements.quantityCell?.querySelector(".qty-input");
  if (input) input.classList.remove("quantity-warning-input");
  elements.referenceCell.replaceChildren(makeReferenceCorrectionDropdown(detection));
  elements.nameCell.replaceChildren();
  if (elements.row) elements.row.className = rowReviewClass(detection);

  if (detection.wikiPage) {
    const link = document.createElement("a");
    link.className = "artifact-link";
    link.href = detection.wikiPage;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = detection.restoredName || detection.artefact;
    elements.nameCell.append(link);
  } else {
    elements.nameCell.textContent = detection.restoredName || detection.artefact;
  }
  elements.nameCell.append(makeRecognitionInfo(detection));
  elements.levelCell.textContent = detection.archaeologyLevel ?? "";
  elements.themeCell.textContent = detection.culture || "";
  if (elements.siteCell) elements.siteCell.textContent = detection.digSite || "";
  if (elements.statusCell) elements.statusCell.replaceChildren(makeStatusPill(detection));
  renderRestorationPlan(filteredDetections());
}

function sortedDetections() {
  const mode = viewMode.value;
  const items = [...detections];
  if (mode === "level") {
    return items.sort(
      (a, b) =>
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  if (mode === "theme") {
    return items.sort(
      (a, b) =>
        String(a.culture || "Unknown").localeCompare(String(b.culture || "Unknown")) ||
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  if (mode === "site") {
    return items.sort(
      (a, b) =>
        String(a.digSite || "Unknown").localeCompare(String(b.digSite || "Unknown")) ||
        nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) ||
        sortDetectionName(a).localeCompare(sortDetectionName(b)) ||
        a.bankIndex - b.bankIndex
    );
  }
  return items.sort((a, b) => a.bankIndex - b.bankIndex);
}

function sortDetectionName(item) {
  return String(item.restoredName || item.artefact)
    .replace(/['"]/g, "")
    .toLowerCase();
}

function nullableNumber(value) {
  return Number.isFinite(value) ? value : 9999;
}

function normalizeName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function drawEmptyState(message) {
  resultsBody.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty";
  cell.colSpan = 9;
  cell.textContent = message;
  row.append(cell);
  resultsBody.append(row);
  renderResultsTabContent();
}

function updateTotals() {
  const total = detections.reduce((sum, detection) => sum + detection.quantity, 0);
  const manual = detections.filter((detection) => detection.manual).length;
  slotCountEl.textContent = String(detections.length);
  quantityTotalEl.textContent = String(total);
  manualCountEl.textContent = String(manual);
  if (detections.length) renderRestorationPlan(filteredDetections());
  renderResultsTabContent();
}

function exportResults() {
  const payload = {
    exportedAt: new Date().toISOString(),
    image: loadedImage
      ? {
          width: loadedImage.naturalWidth,
          height: loadedImage.naturalHeight,
          source: loadedImage.currentSrc || loadedImage.src
        }
      : null,
    grid: {
      offsetX: getGridOffsetX(),
      offsetY: getGridOffsetY(),
      cellSize: getGridCellSize(),
      rows: null,
      columns: null
    },
    totals: {
      slots: detections.length,
      quantity: detections.reduce((sum, detection) => sum + detection.quantity, 0),
      quantityCorrections: detections.filter((detection) => detection.quantityManual).length,
      manualCorrections: detections.filter((detection) => detection.manual || detection.corrected).length
    },
    training: {
      correctedArtefacts: detections.filter((detection) => detection.corrected).length,
      correctedQuantities: detections.filter((detection) => detection.quantityManual).length,
      quantityLabels: detections
        .filter((detection) => detection.quantityManual)
        .map((detection) => ({
          bankIndex: detection.bankIndex,
          bankRow: detection.bankRow,
          bankColumn: detection.bankColumn,
          box: detection.box,
          originalQuantity: detection.originalQuantity,
          detectedQuantity: detection.originalQuantity,
          correctedQuantity: detection.quantity,
          quantityConfidence: detection.quantityConfidence,
          quantityAlternatives: detection.quantityAlternatives,
          correction: detection.quantityCorrection
        })),
      labels: detections
        .filter((detection) => detection.corrected)
        .map((detection) => ({
          bankIndex: detection.bankIndex,
          bankRow: detection.bankRow,
          bankColumn: detection.bankColumn,
          box: detection.box,
          corrected: detection.correction,
          originalPrediction: detection.originalPrediction,
          topMatches: (detection.topMatches || []).map((match) => ({
            damagedName: match.item.name,
            restoredName: match.item.restoredName,
            score: match.score,
            shapeScore: match.shapeScore,
            colorScore: match.colorScore,
            colorExistenceScore: match.colorExistenceScore,
            colorPositionScore: match.colorPositionScore,
            scoringWeights: match.scoringWeights,
            restoredScore: match.restoredScore,
            damagedScore: match.damagedScore
          }))
        }))
    },
    detections: detections.map((detection) => ({
      bankIndex: detection.bankIndex,
      bankRow: detection.bankRow,
      bankColumn: detection.bankColumn,
      box: detection.box,
      quantity: detection.quantity,
      originalQuantity: detection.originalQuantity,
      quantityConfidence: detection.quantityConfidence,
      quantityAlternatives: detection.quantityAlternatives,
      correctedQuantity: detection.quantityManual,
      quantityCorrection: detection.quantityCorrection,
      correctedArtefact: detection.corrected,
      originalPrediction: detection.originalPrediction,
      correction: detection.correction,
      trainingLabel: detection.corrected
        ? {
            input: {
              bankIndex: detection.bankIndex,
              bankRow: detection.bankRow,
              bankColumn: detection.bankColumn,
              box: detection.box,
              originalQuantity: detection.originalQuantity,
              quantity: detection.quantity
            },
            label: {
              damagedName: detection.correction.damagedName,
              restoredName: detection.correction.restoredName,
              archaeologyLevel: detection.correction.archaeologyLevel,
              culture: detection.correction.culture
            },
            previousPrediction: detection.originalPrediction
          }
        : null,
      selected: {
        damagedName: detection.artefact,
        restoredName: detection.restoredName,
        archaeologyLevel: detection.archaeologyLevel,
        culture: detection.culture,
        digSite: detection.digSite,
        wikiPage: detection.wikiPage,
        damagedWikiPage: detection.damagedWikiPage
      },
      ambiguousMatch: detection.ambiguousMatch,
      matchGap: detection.matchGap,
      scores: {
        selectedShape: detection.shapeScore,
        selectedColor: detection.colorScore,
        selectedColorExistence: detection.colorExistenceScore,
        selectedColorPosition: detection.colorPositionScore,
        selectedRestored: detection.restoredScore,
        selectedDamaged: detection.damagedScore,
        selectedMain: detection.matchScore,
        referenceUsed: detection.referenceUsed,
        weights: detection.scoringWeights
      },
      algorithmBest: {
        shape: exportBestMatch(detection.algorithmBest?.shape),
        color: exportBestMatch(detection.algorithmBest?.color),
        restored: exportBestMatch(detection.algorithmBest?.restored),
        damaged: exportBestMatch(detection.algorithmBest?.damaged)
      },
      topMatches: (detection.topMatches || []).map((match) => ({
        damagedName: match.item.name,
        restoredName: match.item.restoredName,
        score: match.score,
        shapeScore: match.shapeScore,
        colorScore: match.colorScore,
        colorExistenceScore: match.colorExistenceScore,
        colorPositionScore: match.colorPositionScore,
        scoringWeights: match.scoringWeights,
        restoredScore: match.restoredScore,
        damagedScore: match.damagedScore,
        archaeologyLevel: match.item.archaeologyLevel,
        culture: match.item.culture
      }))
    }))
  };

  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rs3-archaeology-analysis-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBestMatch(match) {
  if (!match?.item) return null;
  return {
    damagedName: match.item.name,
    restoredName: match.item.restoredName,
    score: match.score,
    archaeologyLevel: match.item.archaeologyLevel,
    culture: match.item.culture
  };
}

function drawBoxes(items, contentArea = null, infinityArea = null) {
  ctx.drawImage(loadedImage, 0, 0);
  if (contentArea) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ff2b2b";
    ctx.strokeRect(contentArea.x + 0.5, contentArea.y + 0.5, contentArea.w, contentArea.h);
  }
  if (infinityArea) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff2bff";
    ctx.strokeRect(infinityArea.x + 0.5, infinityArea.y + 0.5, infinityArea.w, infinityArea.h);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#25d984";
  ctx.fillStyle = "rgba(37, 217, 132, 0.08)";
  for (const item of items) {
    ctx.fillRect(item.box.x, item.box.y, item.box.w, item.box.h);
    ctx.strokeRect(item.box.x + 0.5, item.box.y + 0.5, item.box.w, item.box.h);
  }
}
