export interface DamagedArtifactReferenceRecord {
  readonly name: string;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
  readonly [key: string]: unknown;
}

export interface DamagedArtifactsDatabase {
  readonly items: readonly DamagedArtifactReferenceRecord[];
}

export interface ArchaeologyReferenceData {
  readonly materials: readonly { readonly name: string; readonly [key: string]: unknown }[];
  readonly artefactRecipes: readonly { readonly restoredName: string; readonly [key: string]: unknown }[];
  readonly collections: readonly unknown[];
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
