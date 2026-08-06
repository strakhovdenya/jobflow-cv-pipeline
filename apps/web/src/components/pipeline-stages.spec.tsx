import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineStages } from "./pipeline-stages";
import type { Stage, StageOption, StageState } from "@/lib/types";

const LABELS: Array<[Stage["key"], string]> = [
  ["source", "Source saved"],
  ["analysis", "Analysis"],
  ["decision", "Analysis review"],
  ["cvgen", "CV generation"],
  ["cvreview", "CV draft review"],
  ["prepdf", "Pre-PDF check"],
  ["export", "Export PDF"],
  ["pdfgen", "PDF generated"],
  ["final", "Final check"],
  ["cover", "Cover letter"],
  ["tracking", "Application tracking"],
];

function buildStages(
  stateMap: Partial<Record<Stage["key"], StageState>>,
  optionsMap: Partial<Record<Stage["key"], StageOption[]>> = {},
): Stage[] {
  return LABELS.map(([key, label], index) => ({
    n: index + 1,
    key,
    label,
    state: stateMap[key] ?? "upcoming",
    options: optionsMap[key],
  }));
}

function optionRow(label: string): HTMLElement {
  return screen.getByText((_content, element) => {
    if (element?.tagName !== "LI") {
      return false;
    }
    const text = element.textContent ?? "";
    return text === label || text === `→ ${label}` || text === `✓ ${label}`;
  });
}

describe("PipelineStages", () => {
  it("renders all 11 stages as upcoming", () => {
    const stages = buildStages({});
    render(<PipelineStages stages={stages} progress={{ step: 0, total: 11 }} />);

    LABELS.forEach(([, label]) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText("/ 11 steps")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("Now")).not.toBeInTheDocument();
  });

  it("renders mid-pipeline with done stages and a current stage (mockup 03)", () => {
    const stages = buildStages({ source: "current" });
    render(<PipelineStages stages={stages} progress={{ step: 1, total: 11 }} />);

    expect(screen.getByText("Source saved")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("9%")).toBeInTheDocument();
  });

  it("renders a decision stage with next/pruned(with reason)/open options (mockup 04)", () => {
    const stages = buildStages(
      { source: "done", analysis: "done", decision: "current" },
      {
        decision: [
          { label: "Approve · apply", state: "next" },
          {
            label: "Approve · maybe",
            state: "pruned",
            reason: 'AI recommended "apply", not "maybe" — disabled',
          },
          { label: "Pause", state: "open" },
          { label: "Skip", state: "open" },
        ],
      },
    );
    render(<PipelineStages stages={stages} progress={{ step: 3, total: 11 }} />);

    const nextOption = optionRow("Approve · apply");
    expect(nextOption).toHaveClass("bg-indigo-600");

    const prunedOption = optionRow("Approve · maybe");
    expect(prunedOption).toHaveClass("text-zinc-400");
    expect(prunedOption).toHaveAttribute(
      "title",
      'AI recommended "apply", not "maybe" — disabled',
    );

    expect(optionRow("Pause")).toHaveClass("border");
    expect(optionRow("Skip")).toHaveClass("border");
  });

  it("renders a resolved (done) decision stage with a reason-less chosen option and reason-less pruned options (mockup 05)", () => {
    const stages = buildStages(
      { source: "done", analysis: "done", decision: "done", cvgen: "current" },
      {
        decision: [
          { label: "Approve · apply", state: "chosen" },
          { label: "Approve · maybe", state: "pruned" },
          { label: "Pause", state: "pruned" },
          { label: "Skip", state: "pruned" },
        ],
      },
    );
    render(<PipelineStages stages={stages} progress={{ step: 4, total: 11 }} />);

    const chosenOption = optionRow("Approve · apply");
    expect(chosenOption).toHaveClass("border-green-400");
    expect(chosenOption).not.toHaveAttribute("title", expect.anything());

    const prunedOption = optionRow("Approve · maybe");
    expect(prunedOption).toHaveClass("text-zinc-400");
    expect(prunedOption).not.toHaveAttribute("title", expect.anything());
  });

  it("renders a still-current decision stage with a chosen option carrying a reason, alongside pruned alternatives (mockup 10)", () => {
    const stages = buildStages(
      { source: "done", analysis: "done", decision: "current" },
      {
        decision: [
          { label: "Approve · apply", state: "pruned" },
          { label: "Approve · maybe", state: "pruned" },
          { label: "Pause", state: "open" },
          { label: "Skip", state: "chosen", reason: "Manually overridden to skip" },
        ],
      },
    );
    render(<PipelineStages stages={stages} progress={{ step: 3, total: 11 }} />);

    const chosenOption = optionRow("Skip");
    expect(chosenOption).toHaveClass("border-green-400");
    expect(chosenOption).toHaveAttribute("title", "Manually overridden to skip");

    // The decision stage itself is still "current", not "done" — chosen option state
    // must not be derived from the parent stage's state. Its circle still shows the
    // step number (3), not a "done" checkmark.
    expect(screen.getByText("Now")).toBeInTheDocument();
    const decisionCircle = screen.getByText("Analysis review").closest("li")?.querySelector("span");
    expect(decisionCircle).toHaveTextContent("3");
  });
});
