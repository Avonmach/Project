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

export async function loadDamagedArtifactRecords(path = "data/damaged-artifacts.json"): Promise<DamagedArtifactReferenceRecord[]> {
  const response = await fetch(path);
  const database = parseDamagedArtifactsDatabase(await response.json(), path);
  return database.items.filter((item) => item.icon);
}

export async function loadArchaeologyReferenceData(path = "data/archaeology-reference.json"): Promise<ArchaeologyReferenceData> {
  const response = await fetch(path);
  return parseArchaeologyReferenceData(await response.json(), path);
}

export function emptyArchaeologyReferenceData(): ArchaeologyReferenceData {
  return { materials: [], artefactRecipes: [], collections: [] };
}

function parseDamagedArtifactsDatabase(value: unknown, path: string): DamagedArtifactsDatabase {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error(`Invalid damaged artefact database: ${path}`);
  }
  return { items: value.items.filter(isDamagedArtifactReferenceRecord) };
}

function parseArchaeologyReferenceData(value: unknown, path: string): ArchaeologyReferenceData {
  if (!isRecord(value)) throw new Error(`Invalid archaeology reference data: ${path}`);
  const { materials, artefactRecipes, collections } = value;
  if (!Array.isArray(materials) || !Array.isArray(artefactRecipes) || !Array.isArray(collections)) {
    throw new Error(`Invalid archaeology reference data: ${path}`);
  }
  return {
    materials: materials.filter(isArchaeologyMaterialRecord),
    artefactRecipes: artefactRecipes.filter(isArchaeologyArtefactRecipeRecord),
    collections: collections.filter(isArchaeologyCollectionRecord)
  };
}

function isDamagedArtifactReferenceRecord(value: unknown): value is DamagedArtifactReferenceRecord {
  return isRecord(value) && typeof value.name === "string";
}

function isArchaeologyMaterialRecord(value: unknown): value is ArchaeologyMaterialRecord {
  return isRecord(value) && typeof value.name === "string";
}

function isArchaeologyArtefactRecipeRecord(value: unknown): value is ArchaeologyArtefactRecipeRecord {
  return isRecord(value) && typeof value.restoredName === "string";
}

function isArchaeologyCollectionRecord(value: unknown): value is ArchaeologyCollectionRecord {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.artefacts) &&
    value.artefacts.every((artefact) => typeof artefact === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
