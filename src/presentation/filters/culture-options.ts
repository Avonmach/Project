export interface CultureOptionDetection {
  readonly culture?: string | null;
}

export function getCultureOptions(detections: readonly CultureOptionDetection[]): string[] {
  return [
    ...new Set(detections.map((detection) => detection.culture).filter((culture): culture is string => Boolean(culture)))
  ].sort();
}

export function replaceCultureFilterOptions(select: HTMLSelectElement, cultures: readonly string[], current: string): void {
  select.replaceChildren(new Option("All cultures", ""));
  for (const culture of cultures) select.append(new Option(culture, culture));
  if (cultures.includes(current)) select.value = current;
}

export function updateCultureFilterOptions(
  select: HTMLSelectElement,
  detections: readonly CultureOptionDetection[]
): void {
  replaceCultureFilterOptions(select, getCultureOptions(detections), select.value);
}
