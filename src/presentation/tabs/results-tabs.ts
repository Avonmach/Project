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
  buttons: readonly Element[],
  onSelect: (tab: ResultsTab) => void
): void {
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = (button as HTMLElement).dataset.resultsTab;
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
  readonly buttons: readonly Element[];
  readonly panels: readonly Element[];
}): void {
  if (title) title.textContent = RESULT_TAB_TITLES[tab];

  for (const button of buttons) {
    const element = button as HTMLElement;
    const active = element.dataset.resultsTab === tab;
    element.classList.toggle("is-active", active);
    element.setAttribute("aria-selected", String(active));
  }

  for (const panel of panels) {
    const element = panel as HTMLElement;
    element.hidden = element.dataset.resultsPanel !== tab;
  }
}
