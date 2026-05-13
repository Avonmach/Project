const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const API = "https://runescape.wiki/api.php";
const OUT_DIR = path.join(__dirname, "..", "data");
const ICON_DIR = path.join(OUT_DIR, "reference-icons");
const DB_FILE = path.join(OUT_DIR, "damaged-artifacts.json");
const USER_AGENT = "ArcheologyImageRecognition/0.1 (local personal project)";

async function main() {
  await fs.mkdir(ICON_DIR, { recursive: true });

  const pages = await getDamagedArtefactPages();
  const records = [];

  for (const batch of chunks(pages, 50)) {
    const info = await getPageInfo(batch.map((page) => page.title));
    for (const page of batch) {
      const item = info.get(page.title);
      const slug = slugify(page.title);
      const restoredTitle = toRestoredTitle(page.title);
      const iconPath = path.join(ICON_DIR, `${slug}.png`);
      const damagedIconPath = path.join(ICON_DIR, `${slug}-damaged.png`);
      const metadata = await getRestoredArtefactMetadata(restoredTitle);
      const restoredIconSource =
        (await getPageInventoryIconSource(restoredTitle, false)) || (await getDirectFileIconSource(restoredTitle));
      const damagedIconSource =
        (await getPageInventoryIconSource(page.title)) ||
        (await getDirectFileIconSource(page.title)) ||
        item?.thumbnail?.source ||
        (await getFallbackIconSource(page.title));
      const iconSource = restoredIconSource || damagedIconSource;
      const referenceVariant = restoredIconSource ? "restored" : "damaged";

      if (!iconSource) {
        records.push(makeRecord(page.title, restoredTitle, null, null, null, null, item, metadata, referenceVariant));
        continue;
      }

      await download(iconSource, iconPath);
      if (damagedIconSource) {
        await download(damagedIconSource, damagedIconPath);
      }
      records.push(
        makeRecord(
          page.title,
          restoredTitle,
          `reference-icons/${slug}.png`,
          iconSource,
          damagedIconSource ? `reference-icons/${slug}-damaged.png` : null,
          damagedIconSource,
          item,
          metadata,
          referenceVariant
        )
      );
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name));

  await fs.writeFile(
    DB_FILE,
    `${JSON.stringify(
      {
        source: "https://runescape.wiki/w/Category:Damaged_artefacts",
        generatedAt: new Date().toISOString(),
        count: records.length,
        items: records
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Wrote ${records.length} damaged artefacts to ${path.relative(process.cwd(), DB_FILE)}`);
}

async function getRestoredArtefactMetadata(title) {
  const text = await getParsedText(title);
  const plain = htmlToText(text);
  return {
    restoredName: title,
    archaeologyLevel: numberField(plain.match(/with level\s+(\d+)\s+Archaeology/i)?.[1]),
    culture: textField(plain.match(/Culture\s+([A-Za-z -]+?)\s+Dig site/i)?.[1]),
    digSite: textField(plain.match(/Dig site\s+([A-Za-z -]+?)\s+Excavation/i)?.[1]),
    excavationHotspot: textField(
      plain.match(/Excavation hotspot\s+([A-Za-z0-9' -]+?)\s+Collections/i)?.[1] ||
        plain.match(/excavated from the\s+(.+?)\s+excavation hotspot/i)?.[1]
    )
  };
}

async function getParsedText(title) {
  const data = await requestJson(API, {
    action: "parse",
    format: "json",
    page: title,
    prop: "text"
  });
  return data.parse?.text?.["*"] || "";
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function textField(value) {
  return value ? value.replace(/\s+/g, " ").trim() : null;
}

function numberField(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRestoredTitle(title) {
  return title.replace(/ \(damaged\)$/i, "");
}

async function getPageInventoryIconSource(title, allowDamaged = true) {
  const parseData = await requestJson(API, {
    action: "parse",
    format: "json",
    page: title,
    prop: "images"
  });
  const images = parseData.parse?.images || [];
  const exactName = `${title}.png`.toLowerCase();
  const detailName = `${title} detail.png`.toLowerCase();
  const imageName =
    images.find((name) => name.toLowerCase() === exactName) ||
    images.find((name) => name.toLowerCase() === detailName) ||
    images.find(
      (name) => allowDamaged && name.toLowerCase().endsWith(".png") && name.toLowerCase().includes("(damaged)")
    );

  if (!imageName) return null;
  return getFileUrl(`File:${imageName}`, false);
}

async function getDirectFileIconSource(title) {
  const fileTitles = [`File:${title}.png`, `File:${title} detail.png`];
  const data = await requestJson(API, {
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    titles: fileTitles.join("|")
  });

  const files = Object.values(data.query.pages).filter((page) => !page.missing && page.imageinfo?.[0]?.url);
  const inventory = files.find((page) => page.title.toLowerCase() === `file:${title.toLowerCase()}.png`);
  const detail = files.find((page) => page.title.toLowerCase() === `file:${title.toLowerCase()} detail.png`);
  return inventory?.imageinfo?.[0]?.url || detail?.imageinfo?.[0]?.url || null;
}

async function getFallbackIconSource(title) {
  const imagesData = await requestJson(API, {
    action: "query",
    format: "json",
    prop: "images",
    titles: title
  });
  const page = Object.values(imagesData.query.pages)[0];
  const imageTitle = page?.images
    ?.map((image) => image.title)
    .find((fileTitle) => fileTitle.toLowerCase().endsWith(".png") && fileTitle.toLowerCase().includes("(damaged)"));

  if (!imageTitle) return null;

  return getFileUrl(imageTitle, true);
}

async function getFileUrl(imageTitle, preferThumb) {
  const imageData = await requestJson(API, {
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    ...(preferThumb ? { iiurlwidth: "64" } : {}),
    titles: imageTitle
  });
  const file = Object.values(imageData.query.pages)[0];
  return (preferThumb ? file?.imageinfo?.[0]?.thumburl : null) || file?.imageinfo?.[0]?.url || null;
}

async function getDamagedArtefactPages() {
  const pages = [];
  let cmcontinue = null;

  do {
    const params = {
      action: "query",
      format: "json",
      list: "categorymembers",
      cmtitle: "Category:Damaged artefacts",
      cmnamespace: "0",
      cmlimit: "max"
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;

    const data = await requestJson(API, params);
    pages.push(...data.query.categorymembers.filter((page) => page.title.includes("(damaged)")));
    cmcontinue = data.continue?.cmcontinue || null;
  } while (cmcontinue);

  return pages;
}

async function getPageInfo(titles) {
  const data = await requestJson(API, {
    action: "query",
    format: "json",
    prop: "info|pageimages|pageprops",
    inprop: "url",
    pithumbsize: "64",
    titles: titles.join("|")
  });

  const byTitle = new Map();
  for (const page of Object.values(data.query.pages)) {
    byTitle.set(page.title, page);
  }
  return byTitle;
}

function makeRecord(
  title,
  restoredTitle,
  localIcon,
  sourceIcon,
  damagedIcon,
  damagedSourceIcon,
  pageInfo,
  metadata,
  referenceVariant
) {
  const wikiTitle = title.replaceAll(" ", "_");
  const restoredWikiTitle = restoredTitle.replaceAll(" ", "_");
  return {
    name: title,
    restoredName: restoredTitle,
    state: "damaged",
    wikiPage: pageInfo?.fullurl || `https://runescape.wiki/w/${encodeURIComponent(wikiTitle)}`,
    restoredWikiPage: `https://runescape.wiki/w/${encodeURIComponent(restoredWikiTitle)}`,
    icon: localIcon,
    sourceIcon,
    damagedIcon,
    damagedSourceIcon,
    referenceVariant,
    archaeologyLevel: metadata.archaeologyLevel,
    culture: metadata.culture,
    digSite: metadata.digSite,
    excavationHotspot: metadata.excavationHotspot,
    pageId: pageInfo?.pageid || null
  };
}

function requestJson(url, params) {
  const requestUrl = `${url}?${new URLSearchParams(params)}`;
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
      .get(
        url,
        {
          headers: {
            "User-Agent": USER_AGENT
          }
        },
        (response) => {
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
        }
      )
      .on("error", reject);
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
