import { fingerprintReference, type Fingerprint } from "../../domain/artefacts/fingerprint";

export interface ArtefactReferenceSource {
  readonly name: string;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
  readonly wikiPage?: string | null;
  readonly restoredName?: string | null;
  readonly restoredWikiPage?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly [key: string]: unknown;
}

export interface PreparedArtefactReference extends ArtefactReferenceSource {
  readonly image: HTMLImageElement;
  readonly fingerprint: Fingerprint;
  readonly damagedImage: HTMLImageElement | null;
  readonly damagedFingerprint: Fingerprint | null;
}

export type ReferenceImageLoader = (path: string) => Promise<HTMLImageElement>;

export async function prepareArtefactReferences(
  items: readonly ArtefactReferenceSource[],
  loadImage: ReferenceImageLoader,
  assetBasePath = "data"
): Promise<PreparedArtefactReference[]> {
  const references = await Promise.all(
    items
      .filter((item) => item.icon)
      .map(async (item) => {
        const image = await loadImage(`${assetBasePath}/${item.icon}`);
        const damagedImage = item.damagedIcon ? await loadImage(`${assetBasePath}/${item.damagedIcon}`) : null;
        return {
          ...item,
          image,
          fingerprint: fingerprintReference(image),
          damagedImage,
          damagedFingerprint: damagedImage ? fingerprintReference(damagedImage) : null
        };
      })
  );

  return references;
}
