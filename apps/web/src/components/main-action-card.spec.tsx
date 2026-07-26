import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainActionCard } from "./main-action-card";
import type { MainActionCardData } from "@/lib/types";

describe("MainActionCard", () => {
  it("renders a single primary button (mockup 03)", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      subtitle: "Vacancy source captured and ready for analysis",
      buttons: [{ label: "Start analysis", kind: "primary" }],
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
    expect(onAction).toHaveBeenCalledWith("Start analysis");
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
        { label: "Approve (apply)", kind: "primary" },
        { label: "Approve (maybe)", kind: "disabled", reason: "AI recommended apply, not maybe" },
        { label: "Pause", kind: "secondary" },
        { label: "Skip", kind: "secondary" },
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
    expect(onAction).toHaveBeenCalledWith("Pause");

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onAction).toHaveBeenCalledWith("Skip");
  });

  it("renders the info banner when present (mockup 05)", () => {
    const data: MainActionCardData = {
      title: "CV generation",
      subtitle: "Analysis approved. Generate the targeted CV draft.",
      info: { kind: "info", text: "CV generation is ready to start" },
      buttons: [{ label: "Generate CV draft", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("› CV generation is ready to start")).toBeInTheDocument();
  });

  it("omits the info banner when absent (mockup 03)", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      subtitle: "Vacancy source captured and ready for analysis",
      buttons: [{ label: "Start analysis", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it("renders a generic reasonNote slot when reasonNote is true with no label (mockup 06)", () => {
    const data: MainActionCardData = {
      title: "CV draft review",
      subtitle: "Review the CV draft — approve to export, or pause",
      reasonNote: true,
      buttons: [
        { label: "Approve → export", kind: "primary" },
        { label: "Pause", kind: "secondary" },
        { label: "Mark not worth applying", kind: "secondary" },
        { label: "Regenerate CV draft", kind: "secondary" },
      ],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("Note")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("omits the reasonNote slot when absent", () => {
    const data: MainActionCardData = {
      title: "Source saved",
      buttons: [{ label: "Start analysis", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders notice, select, and labelled reasonNote together (mockup 11)", () => {
    const data: MainActionCardData = {
      title: "Override skip",
      subtitle: "This workspace was skipped.",
      notice: "Override to resume the pipeline.",
      select: { label: "Override to", value: "Apply" },
      reasonNote: true,
      reasonNoteLabel: "Reason note (optional)",
      buttons: [{ label: "Override skip", kind: "primary" }],
    };
    render(<MainActionCard {...data} onAction={vi.fn()} />);

    expect(screen.getByText("Override to resume the pipeline.")).toBeInTheDocument();
    expect(screen.getByText("Override to")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Apply");
    expect(screen.getByText("Reason note (optional)")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
