import { percent } from "../../domain/shared/format";

export interface RecognitionInfoDetection {
  readonly matchScore?: number | null;
  readonly overlapScore?: number | null;
  readonly shapeScore?: number | null;
  readonly colorScore?: number | null;
  readonly ambiguousMatch?: boolean;
  readonly matchGap?: number | null;
}

export function makeRecognitionInfo(detection: RecognitionInfoDetection): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "recognition-info";
  if (detection.ambiguousMatch) wrapper.classList.add("score-warning");
  wrapper.textContent = [
    `Match: ${percent(detection.matchScore)}`,
    `Overlap: ${percent(detection.overlapScore)}`,
    `Shape: ${percent(detection.shapeScore)}`,
    `Color: ${percent(detection.colorScore)}`,
    detection.ambiguousMatch ? `Score gap: ${percent(detection.matchGap)}` : null
  ].filter(Boolean).join(" | ");

  return wrapper;
}
