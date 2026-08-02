import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionsPanel } from "./actions-panel";
import type { ActionsPanelData } from "@/lib/types";

describe("ActionsPanel", () => {
  it("renders the mockup-10 example and fires onAction on click", () => {
    const data: ActionsPanelData = {
      title: "Pipeline actions",
      buttons: [{ label: "Confirm skip", kind: "primary" }],
    };
    const onAction = vi.fn();
    render(<ActionsPanel {...data} onAction={onAction} />);

    expect(screen.getByText("Pipeline actions")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Confirm skip" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith("Confirm skip");
  });

  it("renders a secondary button and fires onAction on click", () => {
    const data: ActionsPanelData = {
      title: "Pipeline actions",
      buttons: [{ label: "Pause", kind: "secondary" }],
    };
    const onAction = vi.fn();
    render(<ActionsPanel {...data} onAction={onAction} />);

    const button = screen.getByRole("button", { name: "Pause" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith("Pause");
  });

  it("renders a disabled button with reason tooltip and click is a noop", () => {
    const data: ActionsPanelData = {
      title: "Pipeline actions",
      buttons: [{ label: "Confirm skip", kind: "disabled", reason: "Already confirmed" }],
    };
    const onAction = vi.fn();
    render(<ActionsPanel {...data} onAction={onAction} />);

    const button = screen.getByRole("button", { name: "Confirm skip" });
    expect(button).toBeDisabled();
    expect(button.closest("span")).toHaveAttribute("title", "Already confirmed");

    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders multiple buttons in order", () => {
    const data: ActionsPanelData = {
      title: "Pipeline actions",
      buttons: [
        { label: "Confirm skip", kind: "primary" },
        { label: "Pause", kind: "secondary" },
      ],
    };
    render(<ActionsPanel {...data} onAction={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Confirm skip", "Pause"]);
  });
});
