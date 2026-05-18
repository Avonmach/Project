import type { ArtefactReferenceMetadata } from "../../domain/artefacts/reference-types";

export interface DamagedArtifactReferenceRecord extends ArtefactReferenceMetadata {
  readonly [key: string]: unknown;
}

export interface DamagedArtifactsDatabase {
  readonly items: readonly DamagedArtifactReferenceRecord[];
}

export interface ArchaeologyMaterialRecord {
  readonly name: string;
  readonly icon?: string | null;
  readonly wikiPage?: string | null;
  readonly [key: string]: unknown;
}

export interface ArchaeologyArtefactRecipeRecord {
  readonly restoredName: string;
  readonly materials?: readonly { readonly name: string; readonly quantity: number }[];
  readonly [key: string]: unknown;
}

export interface ArchaeologyCollectionRecord {
  readonly name: string;
  readonly collector?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly wikiPage?: string | null;
  readonly artefacts: readonly string[];
  readonly artefactCount?: number | null;
  readonly [key: string]: unknown;
}

export interface ArchaeologyReferenceData {
  readonly materials: readonly ArchaeologyMaterialRecord[];
  readonly artefactRecipes: readonly ArchaeologyArtefactRecipeRecord[];
  readonly collections: readonly ArchaeologyCollectionRecord[];
}

type RecordGuard<TRecord> = (value: unknown) => value is TRecord;

export async function loadDamagedArtifactRecords(path = "data/damaged-artifacts.json"): Promise<DamagedArtifactReferenceRecord[]> {
  const response = await fetch(path);
  assertOkResponse(response, path);
  const database = parseDamagedArtifactsDatabase(await response.json(), path);
  return database.items.filter((item) => item.icon);
}

export async function loadArchaeologyReferenceData(path = "data/archaeology-reference.json"): Promise<ArchaeologyReferenceData> {
  const response = await fetch(path);
  assertOkResponse(response, path);
  return parseArchaeologyReferenceData(await response.json(), path);
}

export function emptyArchaeologyReferenceData(): ArchaeologyReferenceData {
  return { materials: [], artefactRecipes: [], collections: [] };
}

function parseDamagedArtifactsDatabase(value: unknown, path: string): DamagedArtifactsDatabase {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error(`Invalid damaged artefact database: ${path}`);
  }
  return { items: filterRecords(value.items, isDamagedArtifactReferenceRecord) };
}

function filterRecords<TRecord>(values: readonly unknown[], guard: RecordGuard<TRecord>): TRecord[] {
  return values.filter(guard);
}

function parseArchaeologyReferenceData(value: unknown, path: string): ArchaeologyReferenceData {
  if (!isRecord(value)) throw new Error(`Invalid archaeology reference data: ${path}`);
  const { materials, artefactRecipes, collections } = value;
  if (!Array.isArray(materials) || !Array.isArray(artefactRecipes) || !Array.isArray(collections)) {
    throw new Error(`Invalid archaeology reference data: ${path}`);
  }
  return {
    materials: filterRecords(materials, isArchaeologyMaterialRecord),
    artefactRecipes: filterRecords(artefactRecipes, isArchaeologyArtefactRecipeRecord),
    collections: filterRecords(collections, isArchaeologyCollectionRecord)
  };
}

function isDamagedArtifactReferenceRecord(value: unknown): value is DamagedArtifactReferenceRecord {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isOptionalStringOrNull(value.icon) &&
    isOptionalStringOrNull(value.damagedIcon) &&
    isOptionalStringOrNull(value.wikiPage) &&
    isOptionalStringOrNull(value.restoredName) &&
    isOptionalStringOrNull(value.restoredWikiPage) &&
    isOptionalNumberOrNull(value.archaeologyLevel) &&
    isOptionalStringOrNull(value.culture) &&
    isOptionalStringOrNull(value.digSite)
  );
}

function isArchaeologyMaterialRecord(value: unknown): value is ArchaeologyMaterialRecord {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isOptionalStringOrNull(value.icon) &&
    isOptionalStringOrNull(value.wikiPage)
  );
}

function isArchaeologyArtefactRecipeRecord(value: unknown): value is ArchaeologyArtefactRecipeRecord {
  if (!isRecord(value) || typeof value.restoredName !== "string") return false;
  return (
    value.materials === undefined ||
    (Array.isArray(value.materials) &&
      value.materials.every(
        (material) => isRecord(material) && typeof material.name === "string" && typeof material.quantity === "number"
      ))
  );
}

function isArchaeologyCollectionRecord(value: unknown): value is ArchaeologyCollectionRecord {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isOptionalStringOrNull(value.collector) &&
    isOptionalNumberOrNull(value.archaeologyLevel) &&
    isOptionalStringOrNull(value.wikiPage) &&
    isOptionalNumberOrNull(value.artefactCount) &&
    Array.isArray(value.artefacts) &&
    value.artefacts.every((artefact) => typeof artefact === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalStringOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalNumberOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "number";
}

function assertOkResponse(response: Response, path: string): void {
  if (!response.ok) {
    throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  }
}
