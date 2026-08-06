import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresentationalCoverLetterPanel } from "./cover-letter-panel";
import type { CoverLetterPanelData } from "@/lib/types";

describe("PresentationalCoverLetterPanel", () => {
  it("renders the mockup-12 text example", () => {
    const coverLetterPanel: CoverLetterPanelData = {
      text: "Generated cover letter is available in the Artifacts section above.",
    };
    render(<PresentationalCoverLetterPanel coverLetterPanel={coverLetterPanel} onAction={vi.fn()} />);

    expect(
      screen.getByText("Generated cover letter is available in the Artifacts section above."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the mockup-13 button example and fires onAction on click", () => {
    const coverLetterPanel: CoverLetterPanelData = { button: "Generate cover letter" };
    const onAction = vi.fn();
    render(<PresentationalCoverLetterPanel coverLetterPanel={coverLetterPanel} onAction={onAction} />);

    const button = screen.getByRole("button", { name: "Generate cover letter" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith("Generate cover letter");
  });
});
