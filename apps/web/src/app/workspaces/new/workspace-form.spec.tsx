import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceForm } from "./workspace-form";
import { createWorkspaceAction } from "./actions";
import type { CreateWorkspaceActionResult } from "./actions";

vi.mock("./actions", () => ({
  createWorkspaceAction: vi.fn(),
}));

const createWorkspaceActionMock = vi.mocked(createWorkspaceAction);

describe("WorkspaceForm", () => {
  beforeEach(() => {
    createWorkspaceActionMock.mockReset();
  });

  it("updates the slug preview as the user types", async () => {
    const user = userEvent.setup();
    render(<WorkspaceForm />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");

    expect(screen.getByText(/Acme_Corp_Backend_Developer/)).toBeInTheDocument();
  });

  it("requires company name, role title and vacancy text before submission", () => {
    render(<WorkspaceForm />);

    expect(screen.getByLabelText("Company name")).toBeRequired();
    expect(screen.getByLabelText("Role title")).toBeRequired();
    expect(screen.getByLabelText("Vacancy text")).toBeRequired();
    expect(screen.getByLabelText(/Source URL/)).not.toBeRequired();
  });

  it("submits the form and renders the success state", async () => {
    const result: CreateWorkspaceActionResult = {
      ok: true,
      data: {
        id: "workspace-1",
        status: "source_saved",
        companySlug: "Acme_Corp",
        roleSlug: "Backend_Developer",
        workspaceSlug: "2026_07_18_Acme_Corp_Backend_Developer",
        folderPath: "storage/applications/2026_07_18_Acme_Corp_Backend_Developer",
        vacancySourcePath:
          "storage/applications/2026_07_18_Acme_Corp_Backend_Developer/00_vacancy_source.txt",
        vacancyTextHash: "hash",
        companyId: "company-1",
        jobVacancyId: "vacancy-1",
        createdAt: new Date().toISOString(),
      },
    };
    createWorkspaceActionMock.mockResolvedValue(result);

    const user = userEvent.setup();
    render(<WorkspaceForm />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    await waitFor(() => {
      expect(screen.getByText(/Workspace created — status: source_saved/)).toBeInTheDocument();
    });
    expect(createWorkspaceActionMock).toHaveBeenCalledWith({
      companyNameOriginal: "Acme Corp",
      roleTitleOriginal: "Backend Developer",
      vacancyText: "We are hiring...",
      sourceUrl: undefined,
    });
    expect(screen.getByRole("link", { name: /View workspace/ })).toHaveAttribute(
      "href",
      "/workspaces/workspace-1",
    );
  });

  it("renders validation errors returned by the server action", async () => {
    createWorkspaceActionMock.mockResolvedValue({
      ok: false,
      errors: ["vacancyText must be longer than 10 characters"],
    });

    const user = userEvent.setup();
    render(<WorkspaceForm />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "short");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    await waitFor(() => {
      expect(
        screen.getByText("vacancyText must be longer than 10 characters"),
      ).toBeInTheDocument();
    });
  });
});
