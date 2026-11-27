import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkspaceListItem } from "@/lib/api";
import { WorkspaceListFilters } from "./workspace-list-filters";

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
    analysisStrategy: "legacy",
    forkedFromWorkspaceId: null,
    comparisonGroupId: null,
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

describe("WorkspaceListFilters", () => {
  it("renders empty state with no filter bar when workspaces is empty", () => {
    render(<WorkspaceListFilters workspaces={[]} />);
    expect(screen.getByText("No workspaces yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
  });

  it("renders filter bar and all workspace rows when workspaces present and no filter active", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("TechStart")).toBeInTheDocument();
  });

  it("typing a query shows only the matching workspace's company name", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hired" } });
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    expect(screen.queryByText("TechStart")).not.toBeInTheDocument();
  });

  it("typing a query with no match shows filter-specific message, not WorkspaceList empty state", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "zzznomatch" } });
    expect(screen.getByText("No workspaces match these filters.")).toBeInTheDocument();
    expect(screen.queryByText("No workspaces yet")).not.toBeInTheDocument();
  });

  it("selecting a status filters rows to that status only", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "cv_pdf_generated" } });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Hired")).not.toBeInTheDocument();
    expect(screen.queryByText("TechStart")).not.toBeInTheDocument();
  });

  it("setting both date inputs narrows rows to the expected subset", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    // ws2 updatedAt = "2026-07-01", only it falls in [2026-07-01, 2026-07-31]
    fireEvent.change(screen.getByLabelText("Updated from"), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByLabelText("Updated to"), { target: { value: "2026-07-31" } });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Hired")).not.toBeInTheDocument();
    expect(screen.queryByText("TechStart")).not.toBeInTheDocument();
  });

  it("Clear filters is absent initially, appears when a filter is set, and resets everything on click", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hired" } });
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("clicking 'Clear filters' inside the zero-results empty state restores the full list", () => {
    render(<WorkspaceListFilters workspaces={[ws1, ws2, ws3]} />);

    // Enter zero-results state
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "zzznomatch" } });
    const noResultsMsg = screen.getByText("No workspaces match these filters.");
    expect(noResultsMsg).toBeInTheDocument();

    // Click the "Clear filters" button that lives inside the zero-results empty state div
    const emptyStateDiv = noResultsMsg.closest("div")!;
    const clearBtn = within(emptyStateDiv).getByRole("button", { name: "Clear filters" });
    fireEvent.click(clearBtn);

    // Full list restored
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("TechStart")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });
});

describe("WorkspaceListFilters with strategy badges (ISSUE-717)", () => {
  const badged: WorkspaceListItem[] = [
    { ...makeWorkspace("a", { companyName: "Northwind", status: "paused_after_analysis" }), analysisStrategy: "c", comparisonGroupId: "g", forkedFromWorkspaceId: "g", currentDecision: "apply", score: 78 },
    { ...makeWorkspace("b", { companyName: "Northwind", status: "paused_after_analysis" }), analysisStrategy: "b", comparisonGroupId: "g", forkedFromWorkspaceId: "g", currentDecision: "maybe", score: 61 },
    { ...makeWorkspace("g", { companyName: "Northwind", status: "source_saved" }), comparisonGroupId: "g" },
    { ...makeWorkspace("z", { companyName: "Zenith", status: "skipped" }), currentDecision: "skip", score: 40 },
  ];
  const order = () =>
    screen
      .queryAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/workspaces/") && href !== "/workspaces/new");

  it("keeps filtering and the review indicators with strategy badges", () => {
    render(<WorkspaceListFilters workspaces={badged} />);

    // the order the API gave is kept, every link still goes to its workspace
    expect(order()).toEqual(["/workspaces/a", "/workspaces/b", "/workspaces/g", "/workspaces/z"]);
    expect(screen.getByText("Strategy C")).toBeInTheDocument();
    expect(screen.getByText("Strategy B")).toBeInTheDocument();
    expect(screen.getByText("Source · Legacy")).toBeInTheDocument();
    // review indicators, decision and score are untouched
    expect(screen.getAllByTitle("Needs review")).toHaveLength(2);
    expect(screen.getAllByText("needs review")).toHaveLength(2);
    expect(screen.getByText("apply")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("61")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Company or role…"), { target: { value: "north" } });
    expect(order()).toEqual(["/workspaces/a", "/workspaces/b", "/workspaces/g"]);
    expect(screen.queryByText("Zenith")).not.toBeInTheDocument();

    // searching by a strategy label matches nothing: filters read only company, role, status and date
    fireEvent.change(screen.getByPlaceholderText("Company or role…"), { target: { value: "Strategy B" } });
    expect(order()).toEqual([]);

    fireEvent.change(screen.getByPlaceholderText("Company or role…"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "paused_after_analysis" } });
    expect(order()).toEqual(["/workspaces/a", "/workspaces/b"]);
    expect(screen.getByText("Strategy C")).toBeInTheDocument();
    expect(screen.queryByText("Source · Legacy")).not.toBeInTheDocument();
  });
});
