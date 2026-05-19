import type { StorageMaterialMatcher } from "../../application/analyze-storage/storage-recognition-ports";
import { matchMaterial as matchMaterialAgainstReferences } from "../../domain/materials/matching";
import type { PreparedMaterialReference } from "../../application/load-references/material-reference-preparation";

export function createReferenceMaterialMatcher(
  references: readonly PreparedMaterialReference[]
): StorageMaterialMatcher {
  return {
    matchMaterial(imageData, box) {
      const match = matchMaterialAgainstReferences(imageData, box, references);
      return {
        name: match.item.name,
        wikiPage: match.item.wikiPage,
        score: match.score,
        overlapScore: match.overlapScore,
        shapeScore: match.shapeScore,
        colorScore: match.colorScore,
        candidates: match.candidates.map((candidate) => ({
          name: candidate.item.name,
          wikiPage: candidate.item.wikiPage,
          score: candidate.score,
          overlapScore: candidate.overlapScore,
          shapeScore: candidate.shapeScore,
          colorScore: candidate.colorScore
        }))
      };
    }
  };
}
