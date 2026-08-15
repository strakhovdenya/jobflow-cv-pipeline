import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManualNotePanel } from "./manual-note-panel";
import { appendManualNoteAction } from "./actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  appendManualNoteAction: vi.fn(),
}));

const appendManualNoteActionMock = vi.mocked(appendManualNoteAction);

describe("ManualNotePanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    appendManualNoteActionMock.mockReset();
  });

  it("renders existing note text", () => {
    render(
      <ManualNotePanel
        workspaceId="ws-1"
        manualNote="[2026-08-10T12:00:00.000Z] Recruiter said team uses Kotlin too."
      />,
    );

    expect(
      screen.getByText(/Recruiter said team uses Kotlin too\./),
    ).toBeInTheDocument();
  });

  it("renders an empty-state message when manualNote is null", () => {
    render(<ManualNotePanel workspaceId="ws-1" manualNote={null} />);

    expect(screen.getByText("No manual notes yet.")).toBeInTheDocument();
  });

  it("submitting a non-empty note calls the action with the trimmed text and refreshes on success", async () => {
    appendManualNoteActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", manualNote: "[2026-08-15T00:00:00.000Z] New note." },
    });

    const user = userEvent.setup();
    render(<ManualNotePanel workspaceId="ws-1" manualNote={null} />);

    await user.type(
      screen.getByLabelText("Add a note"),
      "  New note.  ",
    );
    await user.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(appendManualNoteActionMock).toHaveBeenCalledWith("ws-1", {
      note: "New note.",
    });
  });

  it("submitting an empty/whitespace-only note shows a client-side error and does not call the action", async () => {
    const user = userEvent.setup();
    render(<ManualNotePanel workspaceId="ws-1" manualNote={null} />);

    await user.type(screen.getByLabelText("Add a note"), "   ");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(screen.getByText("Note is required.")).toBeInTheDocument();
    expect(appendManualNoteActionMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("displays a server-side validation error via ErrorList", async () => {
    appendManualNoteActionMock.mockResolvedValue({
      ok: false,
      errors: ["note must not be empty or whitespace only"],
    });

    const user = userEvent.setup();
    render(<ManualNotePanel workspaceId="ws-1" manualNote={null} />);

    await user.type(screen.getByLabelText("Add a note"), "Some note");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() =>
      expect(
        screen.getByText("note must not be empty or whitespace only"),
      ).toBeInTheDocument(),
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
