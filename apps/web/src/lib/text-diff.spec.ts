import { describe, expect, it } from "vitest";
import { diffWords } from "./text-diff";

function textOf(tokens: { text: string }[]): string {
  return tokens.map((t) => t.text).join("");
}

describe("diffWords", () => {
  it("marks everything as same when both texts are identical", () => {
    const result = diffWords("Same text here.", "Same text here.");
    expect(result.before.every((t) => t.type === "same")).toBe(true);
    expect(result.after.every((t) => t.type === "same")).toBe(true);
    expect(textOf(result.before)).toBe("Same text here.");
    expect(textOf(result.after)).toBe("Same text here.");
  });

  it("marks a changed word as removed in before and added in after", () => {
    const result = diffWords(
      "Built a fast backend service.",
      "Built a reliable backend service.",
    );
    expect(textOf(result.before)).toBe("Built a fast backend service.");
    expect(textOf(result.after)).toBe("Built a reliable backend service.");
    expect(result.before.find((t) => t.text === "fast")?.type).toBe(
      "removed",
    );
    expect(result.after.find((t) => t.text === "reliable")?.type).toBe(
      "added",
    );
    expect(result.before.find((t) => t.text === "backend")?.type).toBe(
      "same",
    );
  });

  it("marks a trailing clause removed when suggested_text is a prefix of original_text", () => {
    const result = diffWords(
      "Handled human review gates and pre-export claim checks.",
      "Handled human review gates.",
    );
    expect(
      result.before
        .filter((t) => t.type === "removed")
        .map((t) => t.text)
        .join(""),
    ).toContain("pre-export claim checks");
    expect(result.after.every((t) => t.type === "same")).toBe(true);
  });

  it("reconstructs both strings exactly from their tokens regardless of diff type", () => {
    const before = "Alpha beta gamma delta.";
    const after = "Alpha gamma epsilon delta zeta.";
    const result = diffWords(before, after);
    expect(textOf(result.before)).toBe(before);
    expect(textOf(result.after)).toBe(after);
  });
});
