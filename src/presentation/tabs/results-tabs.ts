export type ResultsTab = "overview" | "damaged" | "restored" | "storage" | "materials";
export type DetectionMode = "damaged" | "restored";

export const RESULT_TAB_TITLES: Record<ResultsTab, string> = {
  overview: "Overview",
  damaged: "Damaged Artefacts",
  restored: "Restored Artefacts",
  storage: "Storage",
  materials: "Materials"
};

export function isResultsTab(value: string | undefined): value is ResultsTab {
  return Boolean(value && value in RESULT_TAB_TITLES);
}

export function resultModeForTab(tab: ResultsTab): DetectionMode {
  return tab === "restored" ? "restored" : "damaged";
}

export function connectResultTabButtons(
  buttons: readonly HTMLElement[],
  onSelect: (tab: ResultsTab) => void
): void {
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.resultsTab;
      if (isResultsTab(tab)) onSelect(tab);
    });
  }
}

export function applyResultTabSelection({
  tab,
  title,
  buttons,
  panels
}: {
  readonly tab: ResultsTab;
  readonly title: HTMLElement | null;
  readonly buttons: readonly HTMLElement[];
  readonly panels: readonly HTMLElement[];
}): void {
  if (title) title.textContent = RESULT_TAB_TITLES[tab];

  for (const button of buttons) {
    const active = button.dataset.resultsTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  }

  for (const panel of panels) {
    panel.hidden = panel.dataset.resultsPanel !== tab;
  }
}
