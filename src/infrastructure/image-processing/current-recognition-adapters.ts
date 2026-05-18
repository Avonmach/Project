import type { MatchReference } from "../../domain/artefacts/matching";
import type {
  ArtefactMatcher,
  DetectionPreviewFactory,
  QuantityDebugSource
} from "../../application/analyze-screenshot/recognition-ports";
import { attachQuantityDebugSource } from "./quantity-debug-source";
import { makeDetectionPreviews } from "../../presentation/renderers/preview-canvases";

export function createReferenceArtefactMatcher<TReference extends MatchReference>(
  matchArtefact: ArtefactMatcher<TReference>["matchArtefact"]
): ArtefactMatcher<TReference> {
  return { matchArtefact };
}

export function createQuantityDebugSource(): QuantityDebugSource {
  return { makeQuantityDebug: attachQuantityDebugSource };
}

export function createCanvasDetectionPreviewFactory<TReference extends MatchReference & { readonly image: CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number } }>(): DetectionPreviewFactory<
  TReference,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement
> {
  return {
    makePreviews: ({ imageData, shapeImageData, box, match }) =>
      makeDetectionPreviews({
        imageData,
        shapeImageData,
        box,
        referenceImage: match.item.image,
        enhance: false
      })
  };
}
