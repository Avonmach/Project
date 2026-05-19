import { fingerprintReference, type Fingerprint } from "../../domain/artefacts/fingerprint";
import type { ArchaeologyMaterialRecord } from "../../infrastructure/data/reference-data";
import type { ReferenceImageLoader } from "./artefact-reference-preparation";

export interface PreparedMaterialReference extends ArchaeologyMaterialRecord {
  readonly image: HTMLImageElement;
  readonly fingerprint: Fingerprint;
}

export async function prepareMaterialReferences(
  materials: readonly ArchaeologyMaterialRecord[],
  loadImage: ReferenceImageLoader,
  assetBasePath = "data"
): Promise<PreparedMaterialReference[]> {
  return Promise.all(
    materials
      .filter((material) => material.icon)
      .map(async (material) => {
        const image = await loadImage(`${assetBasePath}/${material.icon}`);
        return {
          ...material,
          image,
          fingerprint: fingerprintReference(image)
        };
      })
  );
}
