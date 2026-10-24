import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./error";

describe("root error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls reset when Try again is clicked", async () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not render the raw error message", () => {
    const secret = "Fetching workspace failed with status 503";
    const { container } = render(
      <ErrorBoundary error={new Error(secret)} reset={vi.fn()} />,
    );

    expect(container.textContent).not.toContain(secret);
  });

  it("renders a heading", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
