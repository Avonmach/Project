import type { ArtefactReferenceMetadata } from "../../domain/artefacts/reference-types";

export interface DamagedArtifactReferenceRecord extends ArtefactReferenceMetadata {
  readonly [key: string]: unknown;
}

export interface DamagedArtifactsDatabase {
  readonly items: readonly DamagedArtifactReferenceRecord[];
}

export interface ArchaeologyReferenceData {
  readonly materials: readonly {
    readonly name: string;
    readonly icon?: string | null;
    readonly wikiPage?: string | null;
    readonly [key: string]: unknown;
  }[];
  readonly artefactRecipes: readonly {
    readonly restoredName: string;
    readonly materials?: readonly { readonly name: string; readonly quantity: number }[];
    readonly [key: string]: unknown;
  }[];
  readonly collections: readonly {
    readonly name: string;
    readonly collector?: string | null;
    readonly archaeologyLevel?: number | null;
    readonly wikiPage?: string | null;
    readonly artefacts: readonly string[];
    readonly artefactCount?: number | null;
    readonly [key: string]: unknown;
  }[];
}

export async function loadDamagedArtifactRecords(path = "data/damaged-artifacts.json"): Promise<DamagedArtifactReferenceRecord[]> {
  const response = await fetch(path);
  const database = (await response.json()) as DamagedArtifactsDatabase;
  return database.items.filter((item) => item.icon);
}

export async function loadArchaeologyReferenceData(path = "data/archaeology-reference.json"): Promise<ArchaeologyReferenceData> {
  const response = await fetch(path);
  return (await response.json()) as ArchaeologyReferenceData;
}

export function emptyArchaeologyReferenceData(): ArchaeologyReferenceData {
  return { materials: [], artefactRecipes: [], collections: [] };
}
