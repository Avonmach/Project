import type { DetectionRecord } from "../../application/analyze-screenshot/detection-record";
import type { PreparedArtefactReference } from "../../application/load-references/artefact-reference-preparation";
import type { DetectionRowElements } from "../renderers/detection-row";

export type AppDetection = DetectionRecord<
  PreparedArtefactReference,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement
> & {
  rowElements?: DetectionRowElements;
};

export type AppMatchCandidate = NonNullable<AppDetection["topMatches"]>[number];
