import { describe, expect, it } from "vitest";
import { normalizeCompanySlug, normalizeRoleSlug, previewWorkspaceSlug } from "./slug";

describe("normalizeCompanySlug", () => {
  it("preserves numbers in company names", () => {
    expect(normalizeCompanySlug("Action1")).toBe("Action1");
  });

  it("CHECK24 with space", () => {
    expect(normalizeCompanySlug("CHECK24 Vergleichsportal")).toBe("CHECK24_Vergleichsportal");
  });

  it("comma and spaces converted to single underscore", () => {
    expect(normalizeCompanySlug("Omega CRM, A Merkle Company")).toBe(
      "Omega_CRM_A_Merkle_Company",
    );
  });

  it("Ukrainian Cyrillic with hyphen and spaces", () => {
    expect(normalizeCompanySlug("IT-компанія ДП ІНФОТЕХ")).toBe("IT_компанія_ДП_ІНФОТЕХ");
  });

  it("preserves original case", () => {
    expect(normalizeCompanySlug("MyCompany")).toBe("MyCompany");
  });

  it("collapses repeated separators", () => {
    expect(normalizeCompanySlug("A  --  B")).toBe("A_B");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeCompanySlug("  Acme Corp  ")).toBe("Acme_Corp");
  });

  it("empty string returns empty string", () => {
    expect(normalizeCompanySlug("")).toBe("");
  });

  it("does not mutate original value", () => {
    const original = "Action1 Corp";
    normalizeCompanySlug(original);
    expect(original).toBe("Action1 Corp");
  });
});

describe("normalizeRoleSlug", () => {
  it("dots become underscores, numbers removed", () => {
    expect(normalizeRoleSlug("Backend Developer Node.js JavaScript TypeScript")).toBe(
      "Backend_Developer_Node_js_JavaScript_TypeScript",
    );
  });

  it("hyphen and slash become underscores", () => {
    expect(
      normalizeRoleSlug(
        "Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS",
      ),
    ).toBe(
      "Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS",
    );
  });

  it("parentheses and commas become underscores", () => {
    expect(normalizeRoleSlug("Senior Backend Engineer (Node.js, AWS, DynamoDB)")).toBe(
      "Senior_Backend_Engineer_Node_js_AWS_DynamoDB",
    );
  });

  it("em dash becomes underscore", () => {
    expect(normalizeRoleSlug("Middle/Senior Full Stack Developer — Logistics Domain")).toBe(
      "Middle_Senior_Full_Stack_Developer_Logistics_Domain",
    );
  });

  it("Cyrillic mixed with Latin", () => {
    expect(normalizeRoleSlug("Разработчик Node.js / Backend Developer")).toBe(
      "Разработчик_Node_js_Backend_Developer",
    );
  });

  it("C#/.NET — special chars and dot become underscores", () => {
    expect(normalizeRoleSlug("C#/.NET Backend Engineer")).toBe("C_NET_Backend_Engineer");
  });

  it("removes numbers from role slugs", () => {
    expect(normalizeRoleSlug("Action1")).toBe("Action");
  });

  it("repeated spaces collapsed", () => {
    expect(normalizeRoleSlug("hello   world")).toBe("hello_world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeRoleSlug("  Backend Developer  ")).toBe("Backend_Developer");
  });

  it("empty string returns empty string", () => {
    expect(normalizeRoleSlug("")).toBe("");
  });

  it("only numbers returns empty string", () => {
    expect(normalizeRoleSlug("12345")).toBe("");
  });

  it("mixed separators collapsed to single underscore", () => {
    expect(normalizeRoleSlug("A / - B")).toBe("A_B");
  });

  it("does not mutate original value", () => {
    const original = "Backend Developer Node.js";
    normalizeRoleSlug(original);
    expect(original).toBe("Backend Developer Node.js");
  });
});

describe("previewWorkspaceSlug", () => {
  const fixedDate = new Date(2026, 6, 18); // 2026-07-18 (month is 0-indexed)

  it("combines date prefix, company slug and role slug", () => {
    expect(previewWorkspaceSlug("Acme Corp", "Backend Developer", fixedDate)).toBe(
      "2026_07_18_Acme_Corp_Backend_Developer",
    );
  });

  it("pads single-digit month and day", () => {
    const earlyDate = new Date(2026, 0, 5); // 2026-01-05
    expect(previewWorkspaceSlug("Acme", "Engineer", earlyDate)).toBe(
      "2026_01_05_Acme_Engineer",
    );
  });

  it("falls back to placeholder ellipsis when company name is empty", () => {
    expect(previewWorkspaceSlug("", "Backend Developer", fixedDate)).toBe(
      "2026_07_18_…_Backend_Developer",
    );
  });

  it("falls back to placeholder ellipsis when role title is empty", () => {
    expect(previewWorkspaceSlug("Acme Corp", "", fixedDate)).toBe("2026_07_18_Acme_Corp_…");
  });

  it("defaults to the current date when no date is provided", () => {
    const before = new Date();
    const result = previewWorkspaceSlug("Acme", "Engineer");
    const expectedPrefix = `${before.getFullYear()}_${String(before.getMonth() + 1).padStart(2, "0")}_${String(before.getDate()).padStart(2, "0")}`;
    expect(result.startsWith(expectedPrefix)).toBe(true);
  });
});
