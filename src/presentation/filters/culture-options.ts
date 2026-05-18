export interface CultureOptionDetection {
  readonly culture?: string | null;
}

export function getCultureOptions(detections: readonly CultureOptionDetection[]): string[] {
  return [
    ...new Set(detections.map((detection) => detection.culture).filter((culture): culture is string => Boolean(culture)))
  ].sort();
}
