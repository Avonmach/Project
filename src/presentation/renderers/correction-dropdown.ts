export interface CorrectionReference {
  readonly name: string;
  readonly restoredName?: string | null;
  readonly culture?: string | null;
  readonly archaeologyLevel?: number | null;
  readonly icon?: string | null;
  readonly damagedIcon?: string | null;
}

export interface CorrectionCandidate<TReference extends CorrectionReference> {
  readonly item: TReference;
  readonly score?: number;
  readonly shapeScore?: number;
  readonly restoredScore?: number;
  readonly damagedScore?: number;
}

export interface CorrectionDetection<TReference extends CorrectionReference> {
  readonly recognitionMode?: "damaged" | "restored";
  readonly referencePreview: Node;
  readonly topMatches?: readonly CorrectionCandidate<TReference>[];
  readonly bestMatchLimit?: number;
}

export interface CorrectionDropdownOptions<TDetection extends CorrectionDetection<TReference>, TReference extends CorrectionReference> {
  readonly detection: TDetection;
  readonly references: readonly TReference[];
  readonly applyReferenceCorrection: (detection: TDetection, item: TReference, score: number | null) => void;
}

export function makeReferenceCorrectionDropdown<
  TDetection extends CorrectionDetection<TReference>,
  TReference extends CorrectionReference
>({ detection, references, applyReferenceCorrection }: CorrectionDropdownOptions<TDetection, TReference>): HTMLDetailsElement {
  const details = makeCorrectionDropdown({ detection, references, applyReferenceCorrection });
  details.classList.add("reference-correction-menu");
  const summary = details.querySelector("summary");
  if (summary) {
    summary.textContent = "";
    summary.append(detection.referencePreview);
  }
  return details;
}

function makeCorrectionDropdown<TDetection extends CorrectionDetection<TReference>, TReference extends CorrectionReference>(
  options: CorrectionDropdownOptions<TDetection, TReference>
): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "correction-menu";
  const summary = document.createElement("summary");
  summary.title = "Choose artefact";
  summary.setAttribute("aria-label", "Choose artefact");
  summary.textContent = "<->";
  details.append(summary);

  details.addEventListener(
    "toggle",
    () => {
      if (details.open && !details.dataset.loaded) {
        details.append(makeCorrectionPanel(options));
        details.dataset.loaded = "true";
      }
    },
    { once: false }
  );

  return details;
}

function makeCorrectionPanel<TDetection extends CorrectionDetection<TReference>, TReference extends CorrectionReference>({
  detection,
  references,
  applyReferenceCorrection
}: CorrectionDropdownOptions<TDetection, TReference>): HTMLDivElement {
  const panel = document.createElement("div");
  panel.className = "correction-panel";

  const search = document.createElement("input");
  search.className = "correction-search";
  search.type = "search";
  search.placeholder = "Search artefacts";
  panel.append(search);

  const list = document.createElement("div");
  panel.append(list);

  const renderList = () => {
    list.replaceChildren();
    const query = search.value.trim().toLowerCase();
    const scoredMatches = [...(detection.topMatches || [])].sort((a, b) => candidateDisplayScore(b) - candidateDisplayScore(a));
    const bestMatches = scoredMatches.slice(0, detection.bestMatchLimit ?? scoredMatches.length);
    const bestNames = new Set(bestMatches.map((candidate) => candidate.item.name));
    const scored = new Map(scoredMatches.map((candidate) => [candidate.item.name, candidateDisplayScore(candidate)]));

    const top = document.createElement("div");
    top.className = "correction-section-title";
    top.textContent = "Best matches";
    list.append(top);

    for (const candidate of bestMatches.filter((candidate) => matchesCorrectionSearch(candidate.item, query))) {
      list.append(makeCorrectionOption(detection, candidate.item, candidateDisplayScore(candidate), applyReferenceCorrection));
    }

    const all = document.createElement("div");
    all.className = "correction-section-title";
    all.textContent = "All artefacts";
    list.append(all);

    const items = [...references]
      .filter((item) => !bestNames.has(item.name))
      .filter((item) => matchesCorrectionSearch(item, query))
      .sort((a, b) => correctionItemSort(a, b, scored));

    for (const item of items) {
      list.append(makeCorrectionOption(detection, item, scored.get(item.name) ?? null, applyReferenceCorrection));
    }
  };

  search.addEventListener("input", renderList);
  renderList();

  return panel;
}

function makeCorrectionOption<TDetection extends CorrectionDetection<TReference>, TReference extends CorrectionReference>(
  detection: TDetection,
  item: TReference,
  score: number | null,
  applyReferenceCorrection: (detection: TDetection, item: TReference, score: number | null) => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "correction-option";

  const image = document.createElement("img");
  image.src = `data/${item.icon}`;
  image.alt = "";
  image.loading = "lazy";

  const label = document.createElement("span");
  label.textContent = item.restoredName || item.name;

  const meta = document.createElement("small");
  meta.textContent = score === null ? `${item.archaeologyLevel ?? "?"} ${item.culture || ""}` : `${Math.round(score * 100)}%`;

  button.append(image, label, meta);
  button.addEventListener("click", () => {
    applyReferenceCorrection(detection, item, score);
    const menu = button.closest("details");
    if (menu) menu.open = false;
  });
  return button;
}

function sortName(item: CorrectionReference): string {
  return String(item.restoredName || item.name)
    .replace(/['"]/g, "")
    .toLowerCase();
}

function candidateDisplayScore(candidate: CorrectionCandidate<CorrectionReference>): number {
  return candidate.score ?? 0;
}

function matchesCorrectionSearch(item: CorrectionReference, query: string): boolean {
  if (!query) return true;
  return `${item.name} ${item.restoredName} ${item.culture || ""} ${item.archaeologyLevel || ""}`.toLowerCase().includes(query);
}

function correctionItemSort(
  a: CorrectionReference,
  b: CorrectionReference,
  scores: ReadonlyMap<string, number>
): number {
  const aScore = scores.get(a.name);
  const bScore = scores.get(b.name);
  if (aScore !== undefined || bScore !== undefined) return (bScore ?? -1) - (aScore ?? -1);
  return sortName(a).localeCompare(sortName(b));
}
