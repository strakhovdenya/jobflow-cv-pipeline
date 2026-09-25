import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainActionCard } from "./main-action-card";
import type { MainActionCardData } from "@/lib/types";

describe("MainActionCard", () => {
  it("renders a single primary button (mockup 03)", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      subtitle: "Vacancy source captured and ready for analysis",
      buttons: [{ id: "start_analysis", label: "Start analysis", kind: "primary" }],
    };
    const onAction = vi.fn();
    render(<MainActionCard {...data} onAction={onAction} />);

    expect(screen.getByText("Source saved")).toBeInTheDocument();
    expect(
      screen.getByText("Vacancy source captured and ready for analysis"),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Start analysis" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith("start_analysis", undefined);
    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it("renders meta rows and mixed button kinds, disabled click is a noop (mockup 04)", () => {
    const data: MainActionCardData = {
      title: "Analysis review",
      subtitle: "AI recommendation: apply",
      meta: [
        { label: "recommendation", value: "apply" },
        { label: "score", value: "75" },
      ],
      buttons: [
        { id: "approve_analysis", label: "Approve (apply)", kind: "primary" },
        { id: "export_pdf", label: "Approve (maybe)", kind: "disabled", reason: "AI recommended apply, not maybe" },
        { id: "override_skip", label: "Pause", kind: "secondary" },
        { id: "skip", label: "Skip", kind: "secondary" },
      ],
    };
    const onAction = vi.fn();
    render(<MainActionCard {...data} onAction={onAction} />);

    expect(screen.getByText("recommendation")).toBeInTheDocument();
    expect(screen.getByText("apply")).toBeInTheDocument();
    expect(screen.getByText("score")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();

    const disabledButton = screen.getByRole("button", { name: "Approve (maybe)" });
    expect(disabledButton).toBeDisabled();
    expect(disabledButton.closest("span")).toHaveAttribute(
      "title",
      "AI recommended apply, not maybe",
    );

    fireEvent.click(disabledButton);
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onAction).toHaveBeenCalledWith("override_skip", undefined);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onAction).toHaveBeenCalledWith("skip", undefined);
  });

  it("renders the info banner when present (mockup 05)", () => {
    const data: MainActionCardData = {
      title: "CV generation",
      subtitle: "Analysis approved. Generate the targeted CV draft.",
      info: { kind: "info", text: "CV generation is ready to start" },
      buttons: [{ id: "generate_cv_draft", label: "Generate CV draft", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("› CV generation is ready to start")).toBeInTheDocument();
  });

  it("omits the info banner when absent (mockup 03)", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      subtitle: "Vacancy source captured and ready for analysis",
      buttons: [{ id: "start_analysis", label: "Start analysis", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it("renders a generic reasonNote slot when reasonNote is true with no label (mockup 06, ADR-029 shape)", () => {
    const data: MainActionCardData = {
      title: "CV draft review",
      subtitle: "Review the CV draft — approve to export, or regenerate with feedback",
      reasonNote: true,
      buttons: [
        { id: "approve_cv_draft", label: "Approve → export", kind: "primary" },
        { id: "regenerate_cv_draft", label: "Regenerate CV draft", kind: "secondary" },
      ],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("omits the reasonNote slot when absent", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      buttons: [{ id: "start_analysis", label: "Start analysis", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it('shows a spinner only for the "Working…" disabled sentinel, not for a plain ineligible-precondition disabled button', () => {
    const data: MainActionCardData = {
      title: "Analysis review",
      buttons: [
        { id: "approve_analysis", label: "Approve (apply)", kind: "disabled", reason: "Working…" },
        { id: "skip", label: "Skip", kind: "disabled", reason: "AI recommended apply, not maybe" },
      ],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    const workingButton = screen.getByRole("button", { name: "Approve (apply)" });
    expect(workingButton.querySelector("svg")).toBeInTheDocument();

    const ineligibleButton = screen.getByRole("button", { name: "Skip" });
    expect(ineligibleButton.querySelector("svg")).not.toBeInTheDocument();
  });

  it("renders notice, select, and labelled reasonNote together (mockup 11)", () => {
    const data: MainActionCardData = {
      title: "Override skip",
      subtitle: "This workspace was skipped.",
      notice: "Override to resume the pipeline.",
      select: { label: "Override to", value: "Apply" },
      reasonNote: true,
      reasonNoteLabel: "Reason note (optional)",
      buttons: [{ id: "override_skip", label: "Override skip", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("Override to resume the pipeline.")).toBeInTheDocument();
    expect(screen.getByText("Override to")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Apply");
    expect(screen.getByText("Reason note (optional)")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
