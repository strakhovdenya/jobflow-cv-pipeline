import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorList } from "./error-list";

describe("ErrorList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the list as an alert", () => {
    render(<ErrorList errors={["Name is required"]} />);

    const alert = screen.getByRole("alert");
    expect(alert.tagName).toBe("UL");
    expect(alert.textContent).toBe("Name is required");
  });

  it("renders duplicate strings without key collisions", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<ErrorList errors={["Same error", "Same error"]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<ErrorList errors={[]} />);

    expect(container.querySelector("ul")).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
