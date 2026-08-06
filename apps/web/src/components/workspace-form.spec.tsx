import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceForm } from "./workspace-form";

describe("WorkspaceForm", () => {
  it("updates the slug preview as the user types", async () => {
    const user = userEvent.setup();
    render(<WorkspaceForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");

    expect(screen.getByText(/Acme_Corp_Backend_Developer/)).toBeInTheDocument();
  });

  it("requires company name, role title and vacancy text before submission", () => {
    render(<WorkspaceForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Company name")).toBeRequired();
    expect(screen.getByLabelText("Role title")).toBeRequired();
    expect(screen.getByLabelText("Vacancy text")).toBeRequired();
    expect(screen.getByLabelText(/Source URL/)).not.toBeRequired();
  });

  it("calls onSubmit with the assembled payload, omitting a blank source URL", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith({
      companyNameOriginal: "Acme Corp",
      roleTitleOriginal: "Backend Developer",
      vacancyText: "We are hiring...",
      sourceUrl: undefined,
    });
  });

  it("trims whitespace from company name and role title before submitting", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Company name"), "  Acme Corp  ");
    await user.type(screen.getByLabelText("Role title"), "  Backend Developer  ");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        companyNameOriginal: "Acme Corp",
        roleTitleOriginal: "Backend Developer",
      }),
    );
  });

  it("trims and includes a non-blank source URL", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Company name"), "Acme Corp");
    await user.type(screen.getByLabelText("Role title"), "Backend Developer");
    await user.type(screen.getByLabelText(/Source URL/), "  https://example.com/job  ");
    await user.type(screen.getByLabelText("Vacancy text"), "We are hiring...");
    await user.click(screen.getByRole("button", { name: /Create workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: "https://example.com/job" }),
    );
  });

  it("renders validation errors when provided", () => {
    render(<WorkspaceForm onSubmit={vi.fn()} errors={["vacancyText must be longer than 10 characters"]} />);

    expect(
      screen.getByText("vacancyText must be longer than 10 characters"),
    ).toBeInTheDocument();
  });

  it("disables the submit button and shows a pending label while submitting", () => {
    render(<WorkspaceForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole("button", { name: /Creating…/ });
    expect(button).toBeDisabled();
  });
});
