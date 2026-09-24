import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkspaceManualNoteForcedClaim } from "@/lib/api";
import { ManualNoteForcedClaimsPanel } from "./manual-note-forced-claims-panel";

const makeClaim = (
  overrides: Partial<WorkspaceManualNoteForcedClaim> = {},
): WorkspaceManualNoteForcedClaim => ({
  step: "prompt_2",
  location: "cv_content.top_skills[2]",
  text: "EGZ добавляй",
  ...overrides,
});

describe("ManualNoteForcedClaimsPanel", () => {
  it("renders nothing when there are no forced claims", () => {
    const { container } = render(<ManualNoteForcedClaimsPanel claims={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a badge and the step/location for a forced claim", () => {
    render(
      <ManualNoteForcedClaimsPanel claims={[makeClaim()]} />,
    );

    expect(screen.getByText("user-forced, unverified")).toBeInTheDocument();
    expect(
      screen.getByText(/Prompt 2 \(CV content\) · cv_content\.top_skills\[2\]/),
    ).toBeInTheDocument();
    expect(screen.getByText("EGZ добавляй")).toBeInTheDocument();
  });

  it("renders one entry per claim, across different steps", () => {
    render(
      <ManualNoteForcedClaimsPanel
        claims={[
          makeClaim({ step: "prompt_1", location: "must_have[2]" }),
          makeClaim({ step: "skip_reason", location: "main_skip_reason" }),
        ]}
      />,
    );

    expect(
      screen.getByText(/Prompt 1 \(analysis\) · must_have\[2\]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Skip reason · main_skip_reason/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("user-forced, unverified")).toHaveLength(2);
  });

  it("renders a warning naming the step and file for each unreadable artifact", () => {
    render(
      <ManualNoteForcedClaimsPanel
        claims={[]}
        unreadable={[
          { step: "prompt_2", fileName: "02_targeted_cv_content.json" },
          { step: "cover_letter", fileName: "cover_letter.json" },
        ]}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      /Could not read 02_targeted_cv_content\.json \(Prompt 2 \(CV content\)\)/,
    );
    expect(alert).toHaveTextContent(
      /Could not read cover_letter\.json \(Cover letter\)/,
    );
  });

  it("shows the warning alongside readable claims", () => {
    render(
      <ManualNoteForcedClaimsPanel
        claims={[makeClaim()]}
        unreadable={[{ step: "prompt_1", fileName: "01_vacancy_analysis.json" }]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "01_vacancy_analysis.json",
    );
    expect(screen.getByText("EGZ добавляй")).toBeInTheDocument();
  });

  it("shows no warning when nothing is unreadable", () => {
    render(<ManualNoteForcedClaimsPanel claims={[makeClaim()]} unreadable={[]} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is collapsed by default but shows the claim count in the header", () => {
    render(
      <ManualNoteForcedClaimsPanel
        claims={[makeClaim(), makeClaim({ location: "top_skills[3]" })]}
      />,
    );

    expect(
      screen.getByText("Manual-note-forced content").closest("details"),
    ).not.toHaveAttribute("open");
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
