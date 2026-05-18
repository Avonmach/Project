import {
  FALLBACK_DIGIT_TEMPLATES,
  buildDigitTemplatesFromFont,
  type DigitTemplateMap
} from "../../domain/ocr/digit-templates";

export async function loadQuantityFontTemplates(
  fontFamily = "RunescapeQuantityOCR",
  fontUrl = "runescape-small-07/runescape-small-07.otf"
): Promise<DigitTemplateMap> {
  if (!("FontFace" in window)) return FALLBACK_DIGIT_TEMPLATES;
  try {
    const face = new FontFace(fontFamily, `url('${fontUrl}')`);
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
    return buildDigitTemplatesFromFont(fontFamily);
  } catch (error) {
    console.warn("Using fallback quantity OCR templates.", error);
    return FALLBACK_DIGIT_TEMPLATES;
  }
}
