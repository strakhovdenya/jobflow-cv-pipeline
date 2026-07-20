import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationTrackingPanel } from "./application-tracking-panel";
import {
  archiveWorkspaceAction,
  markAppliedAction,
  markReadyToApplyAction,
  markRejectedAction,
} from "./actions";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  markReadyToApplyAction: vi.fn(),
  markAppliedAction: vi.fn(),
  markRejectedAction: vi.fn(),
  archiveWorkspaceAction: vi.fn(),
}));

const markReadyToApplyActionMock = vi.mocked(markReadyToApplyAction);
const markAppliedActionMock = vi.mocked(markAppliedAction);
const markRejectedActionMock = vi.mocked(markRejectedAction);
const archiveWorkspaceActionMock = vi.mocked(archiveWorkspaceAction);

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-cv-pdf-1",
    artifactType: "cv_export_pdf",
    canonicalFileName: "04_cv_export.pdf",
    downloadFileName: "CV_acme_dev.pdf",
    isLatest: true,
    version: 1,
    mimeType: "application/pdf",
    fileSizeBytes: 123,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("ApplicationTrackingPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    markReadyToApplyActionMock.mockReset();
    markAppliedActionMock.mockReset();
    markRejectedActionMock.mockReset();
    archiveWorkspaceActionMock.mockReset();
  });

  it("renders nothing for a status with no eligible tracking action", () => {
    const { container } = render(
      <ApplicationTrackingPanel workspaceId="ws-1" status="paused_after_cv_draft" artifacts={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the ready-to-apply button at cv_pdf_generated and calls the action", async () => {
    markReadyToApplyActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", status: "ready_to_apply" },
    });

    const user = userEvent.setup();
    render(<ApplicationTrackingPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Mark ready to apply" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(markReadyToApplyActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("submits mark-applied with optional fields, including artifact selection", async () => {
    markAppliedActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", status: "applied" },
    });

    const user = userEvent.setup();
    render(
      <ApplicationTrackingPanel
        workspaceId="ws-1"
        status="ready_to_apply"
        artifacts={[makeArtifact()]}
      />,
    );

    await user.type(screen.getByLabelText(/Applied via/), "LinkedIn");
    await user.type(screen.getByLabelText(/^Notes/), "Applied through referral");
    await user.selectOptions(
      screen.getByLabelText(/Submitted CV artifact/),
      "artifact-cv-pdf-1",
    );
    await user.click(screen.getByRole("button", { name: "Mark applied" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(markAppliedActionMock).toHaveBeenCalledWith("ws-1", {
      appliedVia: "LinkedIn",
      notes: "Applied through referral",
      submittedCvArtifactId: "artifact-cv-pdf-1",
      submittedCoverLetterArtifactId: undefined,
    });
  });

  it("submits mark-applied with all optional fields omitted", async () => {
    markAppliedActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", status: "applied" },
    });

    const user = userEvent.setup();
    render(<ApplicationTrackingPanel workspaceId="ws-1" status="ready_to_apply" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Mark applied" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(markAppliedActionMock).toHaveBeenCalledWith("ws-1", {
      appliedVia: undefined,
      notes: undefined,
      submittedCvArtifactId: undefined,
      submittedCoverLetterArtifactId: undefined,
    });
  });

  it("only shows mark-rejected at status applied", () => {
    const { rerender } = render(
      <ApplicationTrackingPanel workspaceId="ws-1" status="ready_to_apply" artifacts={[]} />,
    );
    expect(screen.queryByRole("button", { name: "Mark rejected" })).not.toBeInTheDocument();

    rerender(<ApplicationTrackingPanel workspaceId="ws-1" status="applied" artifacts={[]} />);
    expect(screen.getByRole("button", { name: "Mark rejected" })).toBeInTheDocument();
  });

  it("submits mark-rejected with optional fields", async () => {
    markRejectedActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", status: "rejected" },
    });

    const user = userEvent.setup();
    render(<ApplicationTrackingPanel workspaceId="ws-1" status="applied" artifacts={[]} />);

    await user.type(screen.getByLabelText(/Rejection summary/), "Position filled");
    await user.click(screen.getByRole("button", { name: "Mark rejected" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(markRejectedActionMock).toHaveBeenCalledWith("ws-1", {
      rejectionSummary: "Position filled",
      notes: undefined,
    });
  });

  it("shows the archive button and calls the action", async () => {
    archiveWorkspaceActionMock.mockResolvedValue({
      ok: true,
      data: { id: "ws-1", status: "archived" },
    });

    const user = userEvent.setup();
    render(<ApplicationTrackingPanel workspaceId="ws-1" status="rejected" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(archiveWorkspaceActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("surfaces action-level errors without refreshing", async () => {
    markReadyToApplyActionMock.mockResolvedValue({
      ok: false,
      errors: ["Network error"],
    });

    const user = userEvent.setup();
    render(<ApplicationTrackingPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Mark ready to apply" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
