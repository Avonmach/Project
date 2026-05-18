import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const TS_EXTENSIONS = [".ts", ".tsx"];

export async function resolve(specifier, context, nextResolve) {
  if (isRelativeOrAbsolute(specifier)) {
    const resolved = await resolveTypeScriptSpecifier(specifier, context.parentURL);
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!TS_EXTENSIONS.some((extension) => url.endsWith(extension))) {
    return nextLoad(url, context);
  }

  const source = await readFile(new URL(url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
      sourceMap: true
    },
    fileName: new URL(url).pathname
  });

  return {
    format: "module",
    source: output.outputText,
    shortCircuit: true
  };
}

async function resolveTypeScriptSpecifier(specifier, parentURL) {
  const base = parentURL ? new URL(specifier, parentURL) : pathToFileURL(specifier);
  const candidates = candidateUrls(base);

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate.href;
  }

  return null;
}

function candidateUrls(base) {
  if (TS_EXTENSIONS.some((extension) => base.pathname.endsWith(extension))) return [base];
  if (base.pathname.endsWith(".js")) {
    return TS_EXTENSIONS.map((extension) => new URL(`${base.href.slice(0, -3)}${extension}`));
  }
  return [
    ...TS_EXTENSIONS.map((extension) => new URL(`${base.href}${extension}`)),
    ...TS_EXTENSIONS.map((extension) => new URL(`${base.href}/index${extension}`))
  ];
}

async function exists(url) {
  try {
    await readFile(url);
    return true;
  } catch {
    return false;
  }
}

function isRelativeOrAbsolute(specifier) {
  return specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:");
}
