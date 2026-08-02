import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PresentationalTrackingPanel } from "./tracking-panel";
import type { TrackingPanelData } from "@/lib/types";

describe("PresentationalTrackingPanel", () => {
  it("renders the mockup-12 example", () => {
    const trackingPanel: TrackingPanelData = {
      textFields: [{ label: "Applied via" }, { label: "Notes" }],
      selectFields: [
        { label: "Submitted CV artifact", value: "—" },
        { label: "Submitted cover letter artifact", value: "cover_letter_md" },
      ],
    };
    render(<PresentationalTrackingPanel trackingPanel={trackingPanel} />);

    expect(screen.getByLabelText("Applied via")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();

    const cvSelect = screen.getByLabelText("Submitted CV artifact") as HTMLSelectElement;
    expect(cvSelect.value).toBe("—");

    const coverLetterSelect = screen.getByLabelText(
      "Submitted cover letter artifact",
    ) as HTMLSelectElement;
    expect(coverLetterSelect.value).toBe("cover_letter_md");
  });

  it("renders the mockup-13 example (both selects unset)", () => {
    const trackingPanel: TrackingPanelData = {
      textFields: [{ label: "Applied via" }, { label: "Notes" }],
      selectFields: [
        { label: "Submitted CV artifact", value: "—" },
        { label: "Submitted cover letter artifact", value: "—" },
      ],
    };
    render(<PresentationalTrackingPanel trackingPanel={trackingPanel} />);

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    expect(selects[0].value).toBe("—");
    expect(selects[1].value).toBe("—");
  });
});
