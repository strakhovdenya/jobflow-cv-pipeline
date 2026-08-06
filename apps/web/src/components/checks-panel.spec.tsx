import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecksPanel } from "./checks-panel";
import type { ChecksData, FinalCheckPanelData } from "@/lib/types";

describe("ChecksPanel", () => {
  it("renders nothing when neither checks nor finalCheckPanel is present", () => {
    const { container } = render(<ChecksPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a placeholder for checks.state === 'not_run' with no findings/readiness/counts (mockup 06)", () => {
    const checks: ChecksData = { state: "not_run" };
    render(<ChecksPanel checks={checks} />);

    expect(screen.getByText("Pre-PDF check hasn't run yet.")).toBeInTheDocument();
    expect(screen.queryByText(/suggestion/)).not.toBeInTheDocument();
    expect(screen.queryByText(/blocker/)).not.toBeInTheDocument();
  });

  it.each([
    ["ready", "ready"],
    ["ready_with_minor_edits", "ready with minor edits"],
    ["not_ready", "not ready"],
  ] as const)("renders the %s readiness value", (readiness, expectedLabel) => {
    const checks: ChecksData = {
      state: "result",
      compact: false,
      readiness,
      suggestions: 1,
      blockers: 0,
      findings: [],
      notes: "Some notes.",
    };
    render(<ChecksPanel checks={checks} />);

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("renders counts and notes as given, without recomputing from findings (mockup 07)", () => {
    const checks: ChecksData = {
      state: "result",
      compact: false,
      readiness: "ready_with_minor_edits",
      suggestions: 1,
      blockers: 0,
      findings: [
        {
          id: "summary[0]",
          severity: "suggestion",
          message: "More specific phrasing improves ATS keyword match.",
          original: "Backend engineer with cloud experience.",
          suggested:
            "Backend engineer with commercial Node.js/TypeScript and Azure serverless experience.",
        },
      ],
      notes: "CV draft is in good shape; minor wording suggestions only.",
    };
    render(<ChecksPanel checks={checks} />);

    expect(screen.getByText("1 suggestion · 0 blockers")).toBeInTheDocument();
    expect(
      screen.getByText("CV draft is in good shape; minor wording suggestions only."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("More specific phrasing improves ATS keyword match."),
    ).toBeInTheDocument();
    expect(screen.getByText("Backend engineer with cloud experience.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Backend engineer with commercial Node.js/TypeScript and Azure serverless experience.",
      ),
    ).toBeInTheDocument();
  });

  it.each(["critical", "warning", "suggestion"] as const)(
    "renders the %s severity badge for a finding",
    (severity) => {
      const checks: ChecksData = {
        state: "result",
        compact: false,
        readiness: "not_ready",
        suggestions: 0,
        blockers: 1,
        findings: [{ id: "f1", severity, message: "Something to fix." }],
        notes: "notes",
      };
      render(<ChecksPanel checks={checks} />);

      expect(screen.getByText(severity)).toBeInTheDocument();
      expect(screen.getByText("Something to fix.")).toBeInTheDocument();
    },
  );

  it("renders an explicit empty-state row when findings is present but an empty array", () => {
    const checks: ChecksData = {
      state: "result",
      compact: false,
      readiness: "ready",
      suggestions: 0,
      blockers: 0,
      findings: [],
      notes: "All good.",
    };
    render(<ChecksPanel checks={checks} />);

    expect(screen.getByText("No findings.")).toBeInTheDocument();
  });

  it("renders no findings section at all when the findings key is absent (compact export, mockup 08)", () => {
    const checks: ChecksData = {
      state: "result",
      compact: true,
      readiness: "ready_with_minor_edits",
      suggestions: 1,
      blockers: 0,
      notes: "CV draft is in good shape; minor wording suggestions only.",
    };
    render(<ChecksPanel checks={checks} />);

    expect(
      screen.getByText("CV draft is in good shape; minor wording suggestions only."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No findings.")).not.toBeInTheDocument();
  });

  it("renders finalCheckPanel independently of checks (mockup 13)", () => {
    const finalCheckPanel: FinalCheckPanelData = {
      banner: "ready_to_send · quality score 92 · 2 pages",
      checks: [
        "PDF opens",
        "Content matches vacancy",
        "No unsupported claims",
        "Contact info present",
        "Ready to apply",
      ],
      emptySections: [
        { title: "MISSING SECTIONS", value: "None" },
        { title: "FORMATTING ISSUES", value: "None" },
        { title: "OVERCLAIMING ISSUES", value: "None" },
        { title: "BROKEN LINKS", value: "None" },
      ],
      warnings: ["Manual visual check still recommended before sending."],
    };
    render(<ChecksPanel finalCheckPanel={finalCheckPanel} />);

    expect(screen.getByText("ready_to_send · quality score 92 · 2 pages")).toBeInTheDocument();
    expect(screen.getByText("PDF opens")).toBeInTheDocument();
    expect(screen.getByText("Ready to apply")).toBeInTheDocument();
    expect(screen.getByText("MISSING SECTIONS")).toBeInTheDocument();
    expect(screen.getAllByText("None")).toHaveLength(4);
    expect(
      screen.getByText("Manual visual check still recommended before sending."),
    ).toBeInTheDocument();
  });

  it("renders checks independently of finalCheckPanel", () => {
    const checks: ChecksData = { state: "not_run" };
    render(<ChecksPanel checks={checks} />);

    expect(screen.getByText("Pre-PDF check hasn't run yet.")).toBeInTheDocument();
    expect(screen.queryByText(/quality score/)).not.toBeInTheDocument();
  });

  it("renders both checks and finalCheckPanel together", () => {
    const checks: ChecksData = {
      state: "result",
      compact: true,
      readiness: "ready",
      suggestions: 0,
      blockers: 0,
      notes: "All good.",
    };
    const finalCheckPanel: FinalCheckPanelData = {
      banner: "ready_to_send · quality score 92 · 2 pages",
      checks: ["PDF opens"],
      emptySections: [{ title: "MISSING SECTIONS", value: "None" }],
      warnings: [],
    };
    render(<ChecksPanel checks={checks} finalCheckPanel={finalCheckPanel} />);

    expect(screen.getByText("All good.")).toBeInTheDocument();
    expect(screen.getByText("ready_to_send · quality score 92 · 2 pages")).toBeInTheDocument();
  });

  it("omits the warnings list when finalCheckPanel.warnings is empty", () => {
    const finalCheckPanel: FinalCheckPanelData = {
      banner: "ready_to_send",
      checks: [],
      emptySections: [],
      warnings: [],
    };
    render(<ChecksPanel finalCheckPanel={finalCheckPanel} />);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
