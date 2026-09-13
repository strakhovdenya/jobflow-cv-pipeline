declare global {
  const Translator:
    | {
        availability(options: {
          sourceLanguage: string;
          targetLanguage: string;
        }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
        create(options: {
          sourceLanguage: string;
          targetLanguage: string;
        }): Promise<{ translate(text: string): Promise<string> }>;
      }
    | undefined;
}

export async function isEnRuTranslationAvailable(): Promise<boolean> {
  try {
    if (typeof Translator === "undefined") {
      return false;
    }
    const result = await Translator.availability({
      sourceLanguage: "en",
      targetLanguage: "ru",
    });
    return result === "available";
  } catch {
    return false;
  }
}

export async function translateEnToRu(texts: string[]): Promise<string[]> {
  if (typeof Translator === "undefined") {
    throw new Error("Translator API is not available");
  }
  const translator = await Translator.create({
    sourceLanguage: "en",
    targetLanguage: "ru",
  });
  return Promise.all(texts.map((text) => translator.translate(text)));
}
