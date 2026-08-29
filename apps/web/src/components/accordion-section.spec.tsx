import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AccordionSection } from "./accordion-section";

describe("AccordionSection", () => {
  it("is open by default", () => {
    render(
      <AccordionSection title="Section">
        <p>Body content</p>
      </AccordionSection>,
    );

    expect(screen.getByText("Body content")).toBeVisible();
    expect(screen.getByText("Section").closest("details")).toHaveAttribute(
      "open",
    );
  });

  it("respects defaultOpen={false}", () => {
    render(
      <AccordionSection title="Section" defaultOpen={false}>
        <p>Body content</p>
      </AccordionSection>,
    );

    expect(
      screen.getByText("Section").closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("toggles open/closed on clicking the header", async () => {
    const user = userEvent.setup();
    render(
      <AccordionSection title="Section" defaultOpen={false}>
        <p>Body content</p>
      </AccordionSection>,
    );

    const details = screen.getByText("Section").closest("details")!;
    expect(details).not.toHaveAttribute("open");

    await user.click(screen.getByText("Section"));
    expect(details).toHaveAttribute("open");

    await user.click(screen.getByText("Section"));
    expect(details).not.toHaveAttribute("open");
  });

  it("renders a count badge when provided", () => {
    render(
      <AccordionSection title="Section" countBadge={7}>
        <p>Body content</p>
      </AccordionSection>,
    );

    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not render a count badge when omitted", () => {
    render(
      <AccordionSection title="Section">
        <p>Body content</p>
      </AccordionSection>,
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders headerExtra content in the summary", () => {
    render(
      <AccordionSection title="Section" headerExtra={<span>hint text</span>}>
        <p>Body content</p>
      </AccordionSection>,
    );

    expect(screen.getByText("hint text")).toBeInTheDocument();
  });
});
