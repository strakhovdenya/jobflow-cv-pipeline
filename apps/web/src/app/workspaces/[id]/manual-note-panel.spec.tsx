import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceManualNote } from "@/lib/api";
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

const makeNote = (
  overrides: Partial<WorkspaceManualNote> = {},
): WorkspaceManualNote => ({
  id: "note-1",
  text: "Recruiter said team uses Kotlin too.",
  isLegacy: false,
  createdAt: "2026-08-10T12:00:00.000Z",
  applications: [],
  ...overrides,
});

describe("ManualNotePanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    appendManualNoteActionMock.mockReset();
  });

  it("renders existing note text", () => {
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[makeNote()]} />);

    expect(
      screen.getByText(/Recruiter said team uses Kotlin too\./),
    ).toBeInTheDocument();
  });

  it("renders an empty-state message when there are no manual notes", () => {
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[]} />);

    expect(screen.getByText("No manual notes yet.")).toBeInTheDocument();
  });

  it('shows "Not applied yet" for a note with no applications', () => {
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[makeNote()]} />);

    expect(screen.getByText("Not applied yet")).toBeInTheDocument();
  });

  it("shows a per-application badge naming the step and timestamp", () => {
    render(
      <ManualNotePanel
        workspaceId="ws-1"
        manualNotes={[
          makeNote({
            applications: [
              {
                promptStep: "prompt_2",
                stepDetail: "regenerate",
                appliedAt: "2026-08-26T14:30:00.000Z",
              },
            ],
          }),
        ]}
      />,
    );

    expect(
      screen.getByText(/Applied to Prompt 2 \(CV content\) · regenerate/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Not applied yet")).not.toBeInTheDocument();
  });

  it("shows a distinct badge per application when a note was applied to more than one step", () => {
    render(
      <ManualNotePanel
        workspaceId="ws-1"
        manualNotes={[
          makeNote({
            applications: [
              {
                promptStep: "prompt_2",
                stepDetail: "generate",
                appliedAt: "2026-08-26T10:00:00.000Z",
              },
              {
                promptStep: "prompt_2",
                stepDetail: "regenerate",
                appliedAt: "2026-08-27T10:00:00.000Z",
              },
            ],
          }),
        ]}
      />,
    );

    expect(
      screen.getByText(/Applied to Prompt 2 \(CV content\) · generate/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Applied to Prompt 2 \(CV content\) · regenerate/),
    ).toBeInTheDocument();
  });

  it("shows a legacy badge for a migrated note without attribution", () => {
    render(
      <ManualNotePanel
        workspaceId="ws-1"
        manualNotes={[makeNote({ isLegacy: true })]}
      />,
    );

    expect(screen.getByText("Legacy note")).toBeInTheDocument();
  });

  it("submitting a non-empty note calls the action with the trimmed text and refreshes on success", async () => {
    appendManualNoteActionMock.mockResolvedValue({
      ok: true,
      data: {
        id: "note-2",
        workspaceId: "ws-1",
        text: "New note.",
        isLegacy: false,
        createdAt: "2026-08-15T00:00:00.000Z",
      },
    });

    const user = userEvent.setup();
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[]} />);

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
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[]} />);

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
    render(<ManualNotePanel workspaceId="ws-1" manualNotes={[]} />);

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
