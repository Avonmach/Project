import type { RecognitionMode } from "../../domain/artefacts/matching";

export type RecognitionTab = "restored" | string;

export function recognitionModeForTab(tab: RecognitionTab): RecognitionMode {
  return tab === "restored" ? "restored" : "damaged";
}
