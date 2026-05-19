export interface ArtefactReferenceMetadata {
  readonly name: string;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
  readonly wikiPage?: string | null;
  readonly restoredName?: string | null;
  readonly restoredWikiPage?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly culture?: string | null;
  readonly digSite?: string | null;
  readonly excavationHotspot?: string | null;
}
