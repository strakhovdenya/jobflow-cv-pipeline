import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "./loading";

describe("root loading page", () => {
  it("renders a status indicator", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toBeTruthy();
  });
});
