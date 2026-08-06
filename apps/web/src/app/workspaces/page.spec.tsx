import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkspacesListPage from "./page";
import { listWorkspaces } from "@/lib/api";
import type { WorkspaceListItem } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listWorkspaces: vi.fn(),
}));

const listWorkspacesMock = vi.mocked(listWorkspaces);

describe("WorkspacesListPage", () => {
  it("renders the header actions and an empty state when there are no workspaces", async () => {
    listWorkspacesMock.mockResolvedValue([]);

    render(await WorkspacesListPage());

    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getByText("0 workspaces")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import from folder" })).toHaveAttribute(
      "href",
      "/import",
    );
    expect(screen.getAllByRole("link", { name: "New workspace" })[0]).toHaveAttribute(
      "href",
      "/workspaces/new",
    );
    expect(screen.getByText("No workspaces yet")).toBeInTheDocument();
  });

  it("renders the workspace list with the real API response", async () => {
    const workspaces: WorkspaceListItem[] = [
      {
        id: "wf_1",
        status: "paused_after_analysis",
        currentDecision: "apply",
        originalDecision: "apply",
        workspaceSlug: "2026_07_21_Hired_Fullstack_Developer",
        createdAt: "2026-07-21T09:02:00Z",
        updatedAt: "2026-07-21T09:02:00Z",
        score: 75,
        company: { id: "co_1", nameOriginal: "Hired", companySlug: "hired" },
        jobVacancy: {
          id: "jv_1",
          roleTitleOriginal: "Fullstack Developer",
          roleSlug: "fullstack_developer",
        },
      },
    ];
    listWorkspacesMock.mockResolvedValue(workspaces);

    render(await WorkspacesListPage());

    expect(screen.getByText("1 workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hired" })).toHaveAttribute("href", "/workspaces/wf_1");
    expect(screen.getByText("needs review")).toBeInTheDocument();
  });
});
