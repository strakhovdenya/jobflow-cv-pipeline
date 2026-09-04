import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrePdfCheckPanel } from "./pre-pdf-check-panel";
import { runPrePdfCheckAction, skipPrePdfCheckAction } from "./actions";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runPrePdfCheckAction: vi.fn(),
  skipPrePdfCheckAction: vi.fn(),
}));

const runPrePdfCheckActionMock = vi.mocked(runPrePdfCheckAction);
const skipPrePdfCheckActionMock = vi.mocked(skipPrePdfCheckAction);

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-json-1",
    artifactType: "pre_pdf_check_json",
    canonicalFileName: "03_pre_pdf_check.json",
    downloadFileName: "PRECHECK_acme_dev.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 123,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("PrePdfCheckPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    runPrePdfCheckActionMock.mockReset();
    skipPrePdfCheckActionMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing outside pre_pdf_check_ready/paused_before_export", () => {
    const { container } = render(
      <PrePdfCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing at cv_draft_ready/paused_after_cv_draft — check is not runnable before Approve", () => {
    const { container: cvDraftReady } = render(
      <PrePdfCheckPanel workspaceId="ws-1" status="cv_draft_ready" artifacts={[]} />,
    );
    expect(cvDraftReady).toBeEmptyDOMElement();

    const { container: pausedAfterCvDraft } = render(
      <PrePdfCheckPanel workspaceId="ws-1" status="paused_after_cv_draft" artifacts={[]} />,
    );
    expect(pausedAfterCvDraft).toBeEmptyDOMElement();
  });

  it("shows the trigger and skip buttons and calls the action, then refreshes on success", async () => {
    runPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: { success: true, promptRunId: "run-1", aiRunId: "ai-1", readiness: "ready" },
    });

    const user = userEvent.setup();
    render(<PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />);

    expect(screen.getByRole("button", { name: "Skip pre-PDF check" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run pre-PDF check" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runPrePdfCheckActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("shows a validation error without refreshing when the check runs but fails validation", async () => {
    runPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: { success: false, promptRunId: "run-1", aiRunId: "ai-1", validationError: "bad JSON" },
    });

    const user = userEvent.setup();
    render(<PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Run pre-PDF check" }));

    await waitFor(() => {
      expect(screen.getByText("bad JSON")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("calls skipPrePdfCheckAction and refreshes on success", async () => {
    skipPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: { workspaceId: "ws-1", status: "paused_before_export" },
    });

    const user = userEvent.setup();
    render(<PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Skip pre-PDF check" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(skipPrePdfCheckActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("hides the Run/Skip buttons once past the gate, at paused_before_export", () => {
    render(
      <PrePdfCheckPanel workspaceId="ws-1" status="paused_before_export" artifacts={[]} />,
    );

    expect(screen.queryByRole("button", { name: "Run pre-PDF check" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip pre-PDF check" })).not.toBeInTheDocument();
  });

  it("renders a passing result fetched from the latest pre_pdf_check_json artifact", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          readiness: "ready",
          corrections: [],
          export_blocked: false,
          overall_notes: "Looks good.",
        }),
    } as Response);

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Export allowed — readiness: ready")).toBeInTheDocument();
    });
    expect(screen.getByText("No corrections suggested.")).toBeInTheDocument();
    expect(screen.getByText(/Looks good\./)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/artifacts/artifact-json-1/download");
    expect(screen.getByText("Results").closest("details")).not.toHaveAttribute(
      "open",
    );
  });

  it("renders a blocked result distinctly from a passing result", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          readiness: "not_ready",
          corrections: [
            {
              field_path: "summary[0]",
              suggested_text: "Rewrite this claim.",
              severity: "critical",
              reason: "Overclaiming detected.",
            },
          ],
          export_blocked: true,
          overall_notes: "Fix before exporting.",
        }),
    } as Response);

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Export blocked — readiness: not_ready"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("summary[0]")).toBeInTheDocument();
    expect(screen.getByText("Overclaiming detected.")).toBeInTheDocument();
    expect(screen.queryByText("Export allowed — readiness: not_ready")).not.toBeInTheDocument();
  });
});
