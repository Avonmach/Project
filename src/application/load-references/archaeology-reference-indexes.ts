import type { MaterialRecipe } from "../calculate-materials/material-totals";
import { normalizeName } from "../../domain/shared/format";
import type { ArchaeologyReferenceData } from "../../infrastructure/data/reference-data";
import type { MaterialCellReference } from "../../presentation/renderers/material-cell";

export interface ArchaeologyReferenceIndexes {
  readonly recipeByRestoredName: Map<string, MaterialRecipe>;
  readonly materialByName: Map<string, MaterialCellReference>;
}

export function createArchaeologyReferenceIndexes(reference: ArchaeologyReferenceData): ArchaeologyReferenceIndexes {
  return {
    recipeByRestoredName: new Map(reference.artefactRecipes.map((recipe) => [normalizeName(recipe.restoredName), recipe])),
    materialByName: new Map(reference.materials.map((material) => [normalizeName(material.name), material]))
  };
}
