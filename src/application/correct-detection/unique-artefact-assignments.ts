export interface UniqueAssignmentItem {
  readonly name?: string | null;
  readonly restoredName?: string | null;
}

export interface UniqueAssignmentCandidate<TItem extends UniqueAssignmentItem> {
  readonly item: TItem;
}

export interface UniqueAssignmentDetection<TCandidate extends UniqueAssignmentCandidate<TItem>, TItem extends UniqueAssignmentItem> {
  readonly bankIndex: number;
  readonly matchScore: number;
  readonly topMatches?: readonly TCandidate[];
}

export interface UniqueAssignment<TDetection, TCandidate> {
  readonly detection: TDetection;
  readonly candidate: TCandidate;
}

type CandidateForDetection<TDetection> = TDetection extends { readonly topMatches?: readonly (infer TCandidate)[] }
  ? TCandidate
  : never;

export function findUniqueArtefactAssignments<
  TDetection extends UniqueAssignmentDetection<UniqueAssignmentCandidate<UniqueAssignmentItem>, UniqueAssignmentItem>
>(items: readonly TDetection[]): UniqueAssignment<TDetection, CandidateForDetection<TDetection>>[] {
  const used = new Set<string>();
  const assignments: UniqueAssignment<TDetection, CandidateForDetection<TDetection>>[] = [];
  const byConfidence = [...items].sort((a, b) => b.matchScore - a.matchScore || a.bankIndex - b.bankIndex);

  for (const detection of byConfidence) {
    const candidate = (detection.topMatches || []).find((match) => {
      const key = artefactKey(match.item);
      return key && !used.has(key);
    });
    if (!candidate) continue;
    assignments.push({ detection, candidate: candidate as CandidateForDetection<TDetection> });
    used.add(artefactKey(candidate.item));
  }

  return assignments;
}

function artefactKey(item: UniqueAssignmentItem | null | undefined): string {
  return (item?.restoredName || item?.name || "").toLowerCase();
}
