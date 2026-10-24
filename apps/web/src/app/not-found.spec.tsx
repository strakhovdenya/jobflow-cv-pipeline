import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("root not-found page", () => {
  it("renders heading and link to the workspace list", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/workspaces");
  });
});
