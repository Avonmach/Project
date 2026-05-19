import { normalizeName } from "../../domain/shared/format";

export interface MaterialRecipeEntry {
  readonly name: string;
  readonly quantity: number;
}

export interface MaterialRecipe {
  readonly experience?: number | null;
  readonly materials?: readonly MaterialRecipeEntry[];
  readonly otherItems?: readonly MaterialRecipeEntry[];
}

export interface MaterialDetection {
  readonly artefact: string;
  readonly restoredName?: string | null;
  readonly quantity: number;
}

export interface MaterialTotalRow {
  readonly name: string;
  readonly quantity: number;
  readonly artefacts: readonly string[];
}

export interface RestoredArtefactRow {
  readonly restoredName: string;
  readonly damagedName: string;
  readonly level: number | null | undefined;
  readonly culture: string | null | undefined;
  readonly digSite: string | null | undefined;
  readonly quantity: number;
  readonly needsReview: boolean;
}

export interface RestoredArtefactDetection extends MaterialDetection {
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly ambiguousMatch?: boolean;
}

export function calculateMaterialTotals<TDetection extends MaterialDetection>(
  items: readonly TDetection[],
  recipeByRestoredName: ReadonlyMap<string, MaterialRecipe>
): MaterialTotalRow[] {
  return calculateRecipeEntryTotals(items, recipeByRestoredName, "materials");
}

export function calculateOtherItemTotals<TDetection extends MaterialDetection>(
  items: readonly TDetection[],
  recipeByRestoredName: ReadonlyMap<string, MaterialRecipe>
): MaterialTotalRow[] {
  return calculateRecipeEntryTotals(items, recipeByRestoredName, "otherItems");
}

function calculateRecipeEntryTotals<TDetection extends MaterialDetection>(
  items: readonly TDetection[],
  recipeByRestoredName: ReadonlyMap<string, MaterialRecipe>,
  key: "materials" | "otherItems"
): MaterialTotalRow[] {
  const totals = new Map<string, { name: string; quantity: number; artefacts: Set<string> }>();
  for (const detection of items) {
    const recipe = recipeByRestoredName.get(normalizeName(detection.restoredName || detection.artefact));
    const entries = recipe?.[key];
    if (!entries?.length) continue;
    for (const material of entries) {
      const entryKey = normalizeName(material.name);
      const current = totals.get(entryKey) || { name: material.name, quantity: 0, artefacts: new Set<string>() };
      current.quantity += material.quantity * detection.quantity;
      current.artefacts.add(detection.restoredName || detection.artefact);
      totals.set(entryKey, current);
    }
  }
  return [...totals.values()].map((row) => ({ ...row, artefacts: [...row.artefacts].sort() }));
}

export function aggregateRestoredArtefacts<TDetection extends RestoredArtefactDetection>(
  items: readonly TDetection[],
  quantityNeedsReview: (detection: TDetection) => boolean
): RestoredArtefactRow[] {
  const groups = new Map<string, RestoredArtefactRow>();
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
    groups.set(key, {
      ...current,
      quantity: current.quantity + detection.quantity,
      needsReview: current.needsReview || Boolean(detection.ambiguousMatch) || quantityNeedsReview(detection)
    });
  }
  return [...groups.values()].sort((a, b) => a.restoredName.localeCompare(b.restoredName));
}
