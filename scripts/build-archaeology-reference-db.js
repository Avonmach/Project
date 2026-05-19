const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const API = "https://runescape.wiki/api.php";
const OUT_DIR = path.join(__dirname, "..", "data");
const MATERIAL_ICON_DIR = path.join(OUT_DIR, "material-icons");
const DAMAGED_DB_FILE = path.join(OUT_DIR, "damaged-artifacts.json");
const OUT_FILE = path.join(OUT_DIR, "archaeology-reference.json");
const USER_AGENT = "ArcheologyImageRecognition/0.1 (local personal project)";

async function main() {
  await fs.mkdir(MATERIAL_ICON_DIR, { recursive: true });

  const damagedDb = JSON.parse(await fs.readFile(DAMAGED_DB_FILE, "utf8"));
  const materialPages = await getCategoryPages("Category:Archaeology materials");
  const collectionPages = await getCategoryPages("Category:Archaeology collections");
  const materials = await buildMaterials(materialPages);
  const materialNames = new Set(materials.map((material) => normalizeName(material.name)));
  const recipes = await buildArtefactRecipes(damagedDb.items, materialNames);
  const collections = await buildCollections(collectionPages);

  await fs.writeFile(
    OUT_FILE,
    `${JSON.stringify(
      {
        source: "https://runescape.wiki/",
        generatedAt: new Date().toISOString(),
        counts: {
          materials: materials.length,
          artefactRecipes: recipes.length,
          collections: collections.length
        },
        materials,
        artefactRecipes: recipes,
        collections
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    `Wrote ${materials.length} materials, ${recipes.length} recipes, and ${collections.length} collections to ${path.relative(
      process.cwd(),
      OUT_FILE
    )}`
  );
}

async function buildMaterials(pages) {
  const info = await getPageInfo(pages.map((page) => page.title));
  const records = [];

  for (const page of pages) {
    if (page.title === "Materials (Archaeology)") continue;
    const pageInfo = info.get(page.title);
    const slug = slugify(page.title);
    const iconSource = (await getDirectFileIconSource(page.title)) || pageInfo?.thumbnail?.source;
    const icon = iconSource ? `material-icons/${slug}.png` : null;
    if (iconSource) await download(iconSource, path.join(MATERIAL_ICON_DIR, `${slug}.png`));

    records.push({
      name: page.title,
      wikiPage: pageInfo?.fullurl || wikiUrl(page.title),
      icon,
      sourceIcon: iconSource || null,
      pageId: page.pageid || pageInfo?.pageid || null
    });
  }

  return records.sort((a, b) => a.name.localeCompare(b.name));
}

async function buildArtefactRecipes(items, materialNames) {
  const records = [];
  for (const item of items) {
    const restoredName = toRestoredTitle(item.restoredName || item.name);
    const wikitext = await getWikitext(restoredName);
    const recipe = parseRecipe(wikitext, materialNames);
    records.push({
      damagedName: item.name,
      restoredName,
      wikiPage: item.restoredWikiPage || wikiUrl(restoredName),
      archaeologyLevel: item.archaeologyLevel,
      culture: item.culture,
      digSite: item.digSite,
      materials: recipe.materials,
      otherItems: recipe.otherItems,
      experience: recipe.experience
    });
  }
  return records.sort((a, b) => a.restoredName.localeCompare(b.restoredName));
}

async function buildCollections(pages) {
  const records = [];

  for (const page of pages) {
    const wikitext = await getWikitext(page.title);
    if (!/{{\s*Infobox Collection/i.test(wikitext) || !/Archaeology/i.test(wikitext)) continue;

    const infobox = parseTemplateFields(wikitext, "Infobox Collection");
    const artefacts = parseCollectionArtefacts(wikitext);
    if (!artefacts.length) continue;

    records.push({
      name: cleanWikiText(infobox.name || page.title),
      wikiPage: wikiUrl(page.title),
      archaeologyLevel: numberValue(infobox.archlevel),
      collector: cleanWikiText(infobox.collector),
      artefactCount: numberValue(infobox.artefacts) || artefacts.length,
      chronotes: numberValue(infobox.chronotes),
      firstReward: cleanWikiText(infobox.first),
      recurringReward: cleanWikiText(infobox.recurring),
      artefacts,
      pageId: page.pageid || null
    });
  }

  return records.sort(
    (a, b) =>
      nullableNumber(a.archaeologyLevel) - nullableNumber(b.archaeologyLevel) || a.name.localeCompare(b.name)
  );
}

function parseRecipe(wikitext, materialNames) {
  const fields = parseTemplateFields(wikitext, "Infobox Recipe");
  const materials = [];
  const otherItems = [];

  for (let index = 1; index <= 20; index += 1) {
    const rawName = fields[`mat${index}`];
    if (!rawName) continue;
    const name = cleanWikiText(rawName);
    const quantity = numberValue(fields[`mat${index}qty`]) || 1;
    const normalized = normalizeName(name);
    if (!name || /\(damaged\)$/i.test(name)) continue;
    if (materialNames.has(normalized)) {
      materials.push({ name, quantity });
    } else {
      otherItems.push({ name, quantity });
    }
  }

  return {
    experience: numberValue(fields.skill1exp),
    materials,
    otherItems
  };
}

function parseTemplateFields(wikitext, templateName) {
  const start = wikitext.search(new RegExp(`{{\\s*${escapeRegExp(templateName)}\\b`, "i"));
  if (start < 0) return {};
  const source = wikitext.slice(start);
  const lines = source.split(/\r?\n/);
  const fields = {};

  for (const line of lines.slice(1)) {
    if (/^}}/.test(line.trim())) break;
    const match = line.match(/^\|([^=]+?)\s*=\s*(.*)$/);
    if (match) fields[match[1].trim().toLowerCase()] = match[2].trim();
  }

  return fields;
}

function parseCollectionArtefacts(wikitext) {
  const match = wikitext.match(/{{\s*Collections table\s*([\s\S]*?)\n}}/i);
  if (!match) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) => line.slice(1).trim())
    .filter((line) => line && !line.includes("="))
    .map(cleanWikiText)
    .filter(Boolean);
}

async function getCategoryPages(category) {
  const pages = [];
  let cmcontinue = null;

  do {
    const params = {
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle: category,
      cmnamespace: "0",
      cmlimit: "max"
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await requestJson(API, params);
    pages.push(...(data.query?.categorymembers || []));
    cmcontinue = data.continue?.cmcontinue || null;
  } while (cmcontinue);

  return pages;
}

async function getPageInfo(titles) {
  const byTitle = new Map();
  for (const batch of chunks(titles, 50)) {
    const data = await requestJson(API, {
      action: "query",
      format: "json",
      prop: "info|pageimages",
      inprop: "url",
      pithumbsize: "64",
      titles: batch.join("|")
    });
    for (const page of Object.values(data.query.pages)) {
      byTitle.set(page.title, page);
    }
  }
  return byTitle;
}

async function getWikitext(title) {
  const data = await requestJson(API, {
    action: "parse",
    format: "json",
    page: title,
    prop: "wikitext"
  });
  return data.parse?.wikitext?.["*"] || "";
}

async function getDirectFileIconSource(title) {
  const data = await requestJson(API, {
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    titles: `File:${title}.png`
  });
  const file = Object.values(data.query.pages)[0];
  return file?.imageinfo?.[0]?.url || null;
}

function requestJson(url, params) {
  const requestUrl = `${url}?${new URLSearchParams(params)}`;
  return requestJsonUrl(requestUrl, 0);
}

function requestJsonUrl(requestUrl, attempt) {
  return new Promise((resolve, reject) => {
    https
      .get(
        requestUrl,
        {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json"
          }
        },
        (response) => {
          if (response.statusCode === 429 && attempt < 5) {
            response.resume();
            setTimeout(() => {
              requestJsonUrl(requestUrl, attempt + 1).then(resolve, reject);
            }, 1000 * (attempt + 1));
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode} for ${requestUrl}`));
            response.resume();
            return;
          }
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        }
      )
      .on("error", reject);
  });
}

function download(url, filePath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": USER_AGENT } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          download(response.headers.location, filePath).then(resolve, reject);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} while downloading ${url}`));
          response.resume();
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", async () => {
          try {
            await fs.writeFile(filePath, Buffer.concat(chunks));
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function cleanWikiText(value) {
  if (!value) return null;
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[\[File:[^\]]+\]\]/gi, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/{{[^{}]+}}/g, "")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toRestoredTitle(title) {
  return String(title || "").replace(/\s*\(damaged\)$/i, "");
}

function numberValue(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function wikiUrl(title) {
  return `https://runescape.wiki/w/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function normalizeName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function nullableNumber(value) {
  return Number.isFinite(value) ? value : 9999;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
