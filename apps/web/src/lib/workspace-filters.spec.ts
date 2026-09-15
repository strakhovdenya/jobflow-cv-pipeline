import { describe, expect, it } from "vitest";
import type { WorkspaceListItem } from "@/lib/api";
import {
  EMPTY_WORKSPACE_LIST_FILTERS,
  filterWorkspaces,
  hasActiveWorkspaceListFilters,
} from "./workspace-filters";

function makeWorkspace(
  id: string,
  overrides: {
    status?: string;
    companyName?: string;
    roleTitle?: string;
    updatedAt?: string;
  } = {},
): WorkspaceListItem {
  return {
    id,
    status: overrides.status ?? "source_saved",
    currentDecision: null,
    originalDecision: null,
    workspaceSlug: `slug_${id}`,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00Z",
    score: null,
    company: {
      id: `co_${id}`,
      nameOriginal: overrides.companyName ?? "Acme Corp",
      companySlug: "acme",
    },
    jobVacancy: {
      id: `jv_${id}`,
      roleTitleOriginal: overrides.roleTitle ?? "Engineer",
      roleSlug: "engineer",
    },
  };
}

const ws1 = makeWorkspace("1", {
  companyName: "Hired",
  roleTitle: "Fullstack Developer",
  status: "paused_after_analysis",
  updatedAt: "2026-06-15T10:00:00Z",
});
const ws2 = makeWorkspace("2", {
  companyName: "Acme Corp",
  roleTitle: "Backend Engineer",
  status: "cv_pdf_generated",
  updatedAt: "2026-07-01T00:00:00Z",
});
const ws3 = makeWorkspace("3", {
  companyName: "TechStart",
  roleTitle: "Frontend Developer",
  status: "skipped",
  updatedAt: "2026-08-20T12:00:00Z",
});

const ALL = [ws1, ws2, ws3];

describe("filterWorkspaces", () => {
  it("returns all workspaces with EMPTY_WORKSPACE_LIST_FILTERS, preserving order", () => {
    const result = filterWorkspaces(ALL, EMPTY_WORKSPACE_LIST_FILTERS);
    expect(result).toEqual(ALL);
  });

  it("query matches on company name case-insensitively", () => {
    const result = filterWorkspaces(ALL, { ...EMPTY_WORKSPACE_LIST_FILTERS, query: "hire" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("query matches on role title case-insensitively", () => {
    const result = filterWorkspaces(ALL, { ...EMPTY_WORKSPACE_LIST_FILTERS, query: "backend" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("query matching neither company nor role excludes the workspace", () => {
    const result = filterWorkspaces(ALL, { ...EMPTY_WORKSPACE_LIST_FILTERS, query: "zzznomatch" });
    expect(result).toHaveLength(0);
  });

  it("whitespace-only query behaves as no filter", () => {
    const result = filterWorkspaces(ALL, { ...EMPTY_WORKSPACE_LIST_FILTERS, query: "   " });
    expect(result).toEqual(ALL);
  });

  it("status exact match filters correctly; empty string applies no status filter", () => {
    const withStatus = filterWorkspaces(ALL, {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      status: "cv_pdf_generated",
    });
    expect(withStatus).toHaveLength(1);
    expect(withStatus[0].id).toBe("2");

    const noFilter = filterWorkspaces(ALL, { ...EMPTY_WORKSPACE_LIST_FILTERS, status: "" });
    expect(noFilter).toEqual(ALL);
  });

  it("updatedFrom inclusive lower bound: exact date is included, one day earlier is excluded", () => {
    // ws1 updatedAt date = "2026-06-15"
    const includedResult = filterWorkspaces([ws1], {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      updatedFrom: "2026-06-15",
    });
    expect(includedResult).toHaveLength(1);

    const excludedResult = filterWorkspaces([ws1], {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      updatedFrom: "2026-06-16",
    });
    expect(excludedResult).toHaveLength(0);
  });

  it("updatedTo inclusive upper bound: exact date is included, one day later is excluded", () => {
    // ws3 updatedAt date = "2026-08-20"
    const includedResult = filterWorkspaces([ws3], {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      updatedTo: "2026-08-20",
    });
    expect(includedResult).toHaveLength(1);

    const excludedResult = filterWorkspaces([ws3], {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      updatedTo: "2026-08-19",
    });
    expect(excludedResult).toHaveLength(0);
  });

  it("two active filters combine with AND: workspace satisfying only one is excluded", () => {
    // ws1 matches query "hire" but not status "cv_pdf_generated"
    const result = filterWorkspaces(ALL, {
      ...EMPTY_WORKSPACE_LIST_FILTERS,
      query: "hire",
      status: "cv_pdf_generated",
    });
    expect(result).toHaveLength(0);
  });
});

describe("hasActiveWorkspaceListFilters", () => {
  it("returns false for EMPTY_WORKSPACE_LIST_FILTERS", () => {
    expect(hasActiveWorkspaceListFilters(EMPTY_WORKSPACE_LIST_FILTERS)).toBe(false);
  });

  it("returns true when query is non-empty", () => {
    expect(
      hasActiveWorkspaceListFilters({ ...EMPTY_WORKSPACE_LIST_FILTERS, query: "test" }),
    ).toBe(true);
  });

  it("returns true when status is non-empty", () => {
    expect(
      hasActiveWorkspaceListFilters({ ...EMPTY_WORKSPACE_LIST_FILTERS, status: "skipped" }),
    ).toBe(true);
  });

  it("returns true when updatedFrom is set", () => {
    expect(
      hasActiveWorkspaceListFilters({ ...EMPTY_WORKSPACE_LIST_FILTERS, updatedFrom: "2026-01-01" }),
    ).toBe(true);
  });

  it("returns true when updatedTo is set", () => {
    expect(
      hasActiveWorkspaceListFilters({ ...EMPTY_WORKSPACE_LIST_FILTERS, updatedTo: "2026-12-31" }),
    ).toBe(true);
  });
});
