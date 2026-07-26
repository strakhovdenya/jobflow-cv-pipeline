import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewWorkspacePage from "./page";
import { createWorkspaceAction } from "./actions";
import type { CreateWorkspaceActionResult } from "./actions";

vi.mock("./actions", () => ({
  createWorkspaceAction: vi.fn(),
}));

const createWorkspaceActionMock = vi.mocked(createWorkspaceAction);

describe("NewWorkspacePage", () => {
  beforeEach(() => {
    createWorkspaceActionMock.mockReset();
  });

  it("renders the workspace form", () => {
    render(<NewWorkspacePage />);

    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
    expect(screen.getByLabelText("Role title")).toBeInTheDocument();
    expect(screen.getByLabelText("Vacancy text")).toBeInTheDocument();
  });

  it("submits the form and renders the success screen with the API response", async () => {
    const result: CreateWorkspaceActionResult = {
      ok: true,
      data: {
        id: "workspace-1",
        status: "source_saved",
        companySlug: "Hired",
        roleSlug: "Fullstack_Developer_React_Node_js_Remote",
        workspaceSlug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
        folderPath: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
        vacancySourcePath:
          "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote/00_vacancy_source.txt",
        vacancyTextHash: "hash",
        companyId: "company-1",
        jobVacancyId: "vacancy-1",
        createdAt: new Date().toISOString(),
      },
    };
    createWorkspaceActionMock.mockResolvedValue(result);

    const user = userEvent.setup();
    render(<NewWorkspacePage />);

    await user.type(screen.getByLabelText("Company name"), "Hired");
    await user.type(screen.getByLabelText("Role title"), "Fullstack Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    await waitFor(() => {
      expect(
        screen.getByText("Workspace created · status: source_saved"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getAllByText("2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote/00_vacancy_source.txt",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View workspace/ })).toHaveAttribute(
      "href",
      "/workspaces/workspace-1",
    );
  });

  it("stays on the form and shows validation errors returned by the server action", async () => {
    createWorkspaceActionMock.mockResolvedValue({
      ok: false,
      errors: ["vacancyText must be longer than 10 characters"],
    });

    const user = userEvent.setup();
    render(<NewWorkspacePage />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "short");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    await waitFor(() => {
      expect(
        screen.getByText("vacancyText must be longer than 10 characters"),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Company name")).toHaveValue("Acme Corp");
    expect(screen.queryByText(/Workspace created/)).not.toBeInTheDocument();
  });

  it("disables the submit button while a creation request is pending", async () => {
    let resolveAction: (value: CreateWorkspaceActionResult) => void = () => {};
    createWorkspaceActionMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<NewWorkspacePage />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Creating…/ })).toBeDisabled();
    });
    expect(createWorkspaceActionMock).toHaveBeenCalledTimes(1);

    resolveAction({
      ok: true,
      data: {
        id: "workspace-1",
        status: "source_saved",
        companySlug: "Acme_Corp",
        roleSlug: "Backend_Developer",
        workspaceSlug: "2026_07_18_Acme_Corp_Backend_Developer",
        folderPath: "2026_07_18_Acme_Corp_Backend_Developer",
        vacancySourcePath: "2026_07_18_Acme_Corp_Backend_Developer/00_vacancy_source.txt",
        vacancyTextHash: "hash",
        companyId: "company-1",
        jobVacancyId: "vacancy-1",
        createdAt: new Date().toISOString(),
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Workspace created/)).toBeInTheDocument();
    });
  });
});
