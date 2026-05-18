import type {
  ArtefactMatchResult,
  MatchReference,
  RecognitionMode
} from "../../src/domain/artefacts/matching";
import type { QuantityResult } from "../../src/domain/ocr/quantity-ocr";
import type { BoundingBox } from "../../src/domain/shared/geometry";
import type {
  ArtefactMatcher,
  DetectionPreviewFactory,
  QuantityDebugSource,
  QuantityRecognizer,
  RecognitionFrameSource
} from "../../src/application/analyze-screenshot/recognition-ports";

export interface TestReference extends MatchReference {
  readonly image: { readonly naturalWidth: number; readonly naturalHeight: number };
}

export function makeImageData(width = 2, height = 2): ImageData {
  const ImageDataConstructor = globalThis.ImageData;
  if (ImageDataConstructor) return new ImageDataConstructor(width, height);
  return {
    width,
    height,
    colorSpace: "srgb",
    data: new Uint8ClampedArray(width * height * 4)
  } as ImageData;
}

export function makeBox(overrides: Partial<BoundingBox> = {}): BoundingBox {
  return { x: 0, y: 0, w: 2, h: 2, ...overrides };
}

export function makeReference(overrides: Partial<TestReference> = {}): TestReference {
  return {
    name: "Damaged vase",
    restoredName: "Restored vase",
    image: { naturalWidth: 32, naturalHeight: 32 },
    fingerprint: [],
    ...overrides
  };
}

export function makeQuantityResult(quantity = 3): QuantityResult {
  return {
    quantity,
    confidence: 0.75,
    alternatives: [{ quantity, confidence: 0.75 }],
    debug: {
      mode: "damaged",
      strict: false,
      scanBox: makeBox(),
      pixelCount: 0,
      pixels: [],
      digitBoxes: [],
      rejectedBoxes: [],
      matches: [],
      text: String(quantity),
      confidence: 0.75
    }
  };
}

export function makeMatchResult(reference = makeReference(), score = 0.9): ArtefactMatchResult<TestReference> {
  return {
    item: reference,
    score,
    restoredScore: score,
    damagedScore: 0,
    shapeScore: score,
    colorScore: score,
    colorExistenceScore: score,
    colorPositionScore: score,
    referenceUsed: "restored",
    ambiguous: false,
    matchGap: 1,
    cropFingerprint: [],
    referenceFingerprint: reference.fingerprint,
    finalShapeScore: score,
    algorithmBest: {
      shape: { item: reference, score },
      restored: { item: reference, score },
      damaged: { item: reference, score: 0 },
      color: { item: reference, score }
    },
    candidates: []
  };
}

export function makeFrameSource(boxes = [makeBox()]): RecognitionFrameSource {
  const imageData = makeImageData();
  return {
    createFrame() {
      return {
        imageData,
        shapeImageData: imageData,
        boxes,
        contentArea: makeBox({ w: 10, h: 10 }),
        infinityArea: null
      };
    }
  };
}

export function makeQuantityRecognizer(result = makeQuantityResult()): QuantityRecognizer {
  return {
    detectQuantity() {
      return result;
    }
  };
}

export function makeArtefactMatcher(result = makeMatchResult()): ArtefactMatcher<TestReference> {
  return {
    matchArtefact() {
      return result;
    }
  };
}

export function makeQuantityDebugSource(): QuantityDebugSource {
  return {
    makeQuantityDebug(debug) {
      return debug;
    }
  };
}

export function makePreviewFactory(): DetectionPreviewFactory<TestReference, string, string, string> {
  return {
    makePreviews({ recognitionMode }: { readonly recognitionMode: RecognitionMode }) {
      return {
        preview: `${recognitionMode}-preview`,
        processedPreview: `${recognitionMode}-processed`,
        referencePreview: `${recognitionMode}-reference`
      };
    }
  };
}
