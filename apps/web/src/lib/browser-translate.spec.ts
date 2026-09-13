import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isEnRuTranslationAvailable,
  translateEnToRu,
} from "./browser-translate";

describe("browser-translate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isEnRuTranslationAvailable", () => {
    it("returns false when Translator is undefined", async () => {
      vi.stubGlobal("Translator", undefined);
      await expect(isEnRuTranslationAvailable()).resolves.toBe(false);
    });

    it("returns false when availability resolves to 'unavailable'", async () => {
      vi.stubGlobal("Translator", {
        availability: vi.fn().mockResolvedValue("unavailable"),
        create: vi.fn(),
      });
      await expect(isEnRuTranslationAvailable()).resolves.toBe(false);
    });

    it("returns false when availability resolves to 'downloadable'", async () => {
      vi.stubGlobal("Translator", {
        availability: vi.fn().mockResolvedValue("downloadable"),
        create: vi.fn(),
      });
      await expect(isEnRuTranslationAvailable()).resolves.toBe(false);
    });

    it("returns false when availability resolves to 'downloading'", async () => {
      vi.stubGlobal("Translator", {
        availability: vi.fn().mockResolvedValue("downloading"),
        create: vi.fn(),
      });
      await expect(isEnRuTranslationAvailable()).resolves.toBe(false);
    });

    it("returns true when availability resolves to 'available'", async () => {
      vi.stubGlobal("Translator", {
        availability: vi.fn().mockResolvedValue("available"),
        create: vi.fn(),
      });
      await expect(isEnRuTranslationAvailable()).resolves.toBe(true);
    });

    it("returns false when availability rejects", async () => {
      vi.stubGlobal("Translator", {
        availability: vi.fn().mockRejectedValue(new Error("API error")),
        create: vi.fn(),
      });
      await expect(isEnRuTranslationAvailable()).resolves.toBe(false);
    });
  });

  describe("translateEnToRu", () => {
    it("rejects with an error when Translator is undefined", async () => {
      vi.stubGlobal("Translator", undefined);
      await expect(translateEnToRu(["a"])).rejects.toThrow();
    });

    it("creates exactly one Translator instance and calls translate once per string, returning results in order", async () => {
      const translateFn = vi
        .fn()
        .mockImplementation((text: string) => Promise.resolve(`RU:${text}`));
      const createFn = vi.fn().mockResolvedValue({ translate: translateFn });
      vi.stubGlobal("Translator", {
        availability: vi.fn(),
        create: createFn,
      });

      const result = await translateEnToRu(["a", "b", "c"]);

      expect(createFn).toHaveBeenCalledTimes(1);
      expect(translateFn).toHaveBeenCalledTimes(3);
      expect(result).toEqual(["RU:a", "RU:b", "RU:c"]);
    });
  });
});
