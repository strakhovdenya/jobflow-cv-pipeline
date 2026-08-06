import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingStepsPanel } from "./upcoming-steps-panel";
import type { UpcomingStepsData } from "@/lib/types";

describe("UpcomingStepsPanel", () => {
  it("renders nothing when upcoming is not present", () => {
    const { container } = render(<UpcomingStepsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the exact mockup 09 example", () => {
    const upcoming: UpcomingStepsData = {
      finalCheck: { status: "Not started" },
      coverLetter: { status: "Not started" },
      tracking: {
        fields: [
          "Mark ready to apply",
          "Applied via",
          "Applied date",
          "Notes",
          "Submitted CV artifact",
          "Submitted cover letter artifact",
        ],
      },
    };
    render(<UpcomingStepsPanel upcoming={upcoming} />);

    expect(screen.getByText("Final check")).toBeInTheDocument();
    expect(screen.getByText("Cover letter")).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(2);
    expect(screen.getByText("Mark ready to apply")).toBeInTheDocument();
    expect(screen.getByText("Applied via")).toBeInTheDocument();
    expect(screen.getByText("Applied date")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Submitted CV artifact")).toBeInTheDocument();
    expect(screen.getByText("Submitted cover letter artifact")).toBeInTheDocument();
  });

  it("renders arbitrary status values, not just the 'Not started' literal", () => {
    const upcoming: UpcomingStepsData = {
      finalCheck: { status: "Done" },
      coverLetter: { status: "Skipped" },
      tracking: { fields: [] },
    };
    render(<UpcomingStepsPanel upcoming={upcoming} />);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.queryByText("Not started")).not.toBeInTheDocument();
  });

  it("renders an empty tracking field list without crashing", () => {
    const upcoming: UpcomingStepsData = {
      finalCheck: { status: "Not started" },
      coverLetter: { status: "Not started" },
      tracking: { fields: [] },
    };
    render(<UpcomingStepsPanel upcoming={upcoming} />);

    expect(screen.getByText("Application tracking")).toBeInTheDocument();
  });
});
