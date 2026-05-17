export interface UniqueAssignmentCandidate<TItem> {
  readonly item: TItem;
}

export interface UniqueAssignmentDetection<TCandidate extends UniqueAssignmentCandidate<TItem>, TItem> {
  readonly bankIndex: number;
  readonly matchScore: number;
  readonly topMatches?: readonly TCandidate[];
}

export interface UniqueAssignment<TDetection, TCandidate> {
  readonly detection: TDetection;
  readonly candidate: TCandidate;
}

export function findUniqueArtefactAssignments<
  TItem extends { readonly name?: string | null; readonly restoredName?: string | null },
  TCandidate extends UniqueAssignmentCandidate<TItem>,
  TDetection extends UniqueAssignmentDetection<TCandidate, TItem>
>(items: readonly TDetection[]): UniqueAssignment<TDetection, TCandidate>[] {
  const used = new Set<string>();
  const assignments: UniqueAssignment<TDetection, TCandidate>[] = [];
  const byConfidence = [...items].sort((a, b) => b.matchScore - a.matchScore || a.bankIndex - b.bankIndex);

  for (const detection of byConfidence) {
    const candidate = (detection.topMatches || []).find((match) => {
      const key = artefactKey(match.item);
      return key && !used.has(key);
    });
    if (!candidate) continue;
    assignments.push({ detection, candidate });
    used.add(artefactKey(candidate.item));
  }

  return assignments;
}

function artefactKey(item: { readonly name?: string | null; readonly restoredName?: string | null } | null | undefined): string {
  return (item?.restoredName || item?.name || "").toLowerCase();
}
