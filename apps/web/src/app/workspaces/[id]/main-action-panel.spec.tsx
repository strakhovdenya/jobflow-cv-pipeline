import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainActionPanel } from "./main-action-panel";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  getAnalysisJobStatusAction,
  overrideSkipAction,
  runAnalysisAction,
  runAnalysisAsyncAction,
  submitCvDraftReviewAction,
  submitReviewDecisionAction,
  type ActionResult,
} from "./actions";
import type { AnalysisJobStatus } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runAnalysisAction: vi.fn(),
  runAnalysisAsyncAction: vi.fn(),
  getAnalysisJobStatusAction: vi.fn(),
  submitReviewDecisionAction: vi.fn(),
  overrideSkipAction: vi.fn(),
  submitCvDraftReviewAction: vi.fn(),
  generateCvContentAction: vi.fn(),
  exportCvAction: vi.fn(),
  confirmSkipAction: vi.fn(),
}));

const runAnalysisActionMock = vi.mocked(runAnalysisAction);
const runAnalysisAsyncActionMock = vi.mocked(runAnalysisAsyncAction);
const getAnalysisJobStatusActionMock = vi.mocked(getAnalysisJobStatusAction);
const submitReviewDecisionActionMock = vi.mocked(submitReviewDecisionAction);
const overrideSkipActionMock = vi.mocked(overrideSkipAction);
const submitCvDraftReviewActionMock = vi.mocked(submitCvDraftReviewAction);
const generateCvContentActionMock = vi.mocked(generateCvContentAction);
const exportCvActionMock = vi.mocked(exportCvAction);
const confirmSkipActionMock = vi.mocked(confirmSkipAction);

async function flush(times = 4) {
  await act(async () => {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  });
}

describe("MainActionPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    runAnalysisActionMock.mockReset();
    runAnalysisAsyncActionMock.mockReset();
    getAnalysisJobStatusActionMock.mockReset();
    submitReviewDecisionActionMock.mockReset();
    overrideSkipActionMock.mockReset();
    submitCvDraftReviewActionMock.mockReset();
    generateCvContentActionMock.mockReset();
    exportCvActionMock.mockReset();
    confirmSkipActionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the source_saved status with a Start analysis action", async () => {
    runAnalysisActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        promptRunId: "run-1",
        aiRunId: "ai-1",
        workspaceStatus: "paused_after_analysis",
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        originalDecision={null}

        reviewState={null}
        score={null}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runAnalysisActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("disables both Start analysis buttons while the async job is enqueuing/polling", async () => {
    vi.useFakeTimers();
    runAnalysisAsyncActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    getAnalysisJobStatusActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1", state: "active" },
    });

    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        originalDecision={null}

        reviewState={null}
        score={null}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start analysis (async)" }));
    });
    await flush();

    expect(screen.getByRole("button", { name: "Start analysis" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start analysis (async)" })).toBeDisabled();
    expect(runAnalysisActionMock).not.toHaveBeenCalled();
  });

  it("refreshes once the async analysis job completes", async () => {
    vi.useFakeTimers();
    runAnalysisAsyncActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    const completedJobStatus: ActionResult<AnalysisJobStatus> = {
      ok: true,
      data: { jobId: "job-1", state: "completed" },
    };
    getAnalysisJobStatusActionMock.mockResolvedValueOnce(completedJobStatus);

    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        originalDecision={null}

        reviewState={null}
        score={null}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start analysis (async)" }));
    });
    await flush();

    expect(refreshMock).toHaveBeenCalled();
  });

  it("enables Approve (apply) and calls submitReviewDecisionAction when clicked", async () => {
    submitReviewDecisionActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        action: "approve_apply",
        currentDecision: "apply",
        reviewState: "approved",
        status: "cv_generation_running",
        canProceedToPrompt2: true,
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="paused_after_analysis"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve (apply)" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(submitReviewDecisionActionMock).toHaveBeenCalledWith("workspace-1", "approve_apply");
  });

  it("ADR-028: Skip chains change_to_skip then confirm-skip in one click when not yet flagged skip", async () => {
    submitReviewDecisionActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        action: "change_to_skip",
        currentDecision: "skip",
        reviewState: "overridden",
        status: "paused_after_analysis",
        canProceedToPrompt2: false,
      },
    });
    confirmSkipActionMock.mockResolvedValue({
      ok: true,
      data: { success: true, workspaceId: "workspace-1", workspaceStatus: "skipped" },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="paused_after_analysis"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(submitReviewDecisionActionMock).toHaveBeenCalledWith("workspace-1", "change_to_skip");
    expect(confirmSkipActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("ADR-028: Skip retries confirm-skip only (no change_to_skip call) once the decision is already skip", async () => {
    confirmSkipActionMock.mockResolvedValue({
      ok: true,
      data: { success: true, workspaceId: "workspace-1", workspaceStatus: "skipped" },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="analysis_ready"
        currentDecision="skip"
        originalDecision="apply"

        reviewState="overridden"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(submitReviewDecisionActionMock).not.toHaveBeenCalled();
    expect(confirmSkipActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("calls overrideSkipAction for the skipped status's Override skip button", async () => {
    overrideSkipActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        fromDecision: "skip",
        toDecision: "apply",
        reviewState: "overridden",
        status: "paused_after_analysis",
        canProceedToPrompt2: true,
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="skipped"
        currentDecision="skip"
        originalDecision="skip"

        reviewState="pending_review"
        score={75}
        skipReasonSummary="Requires German C1"
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Override skip" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(overrideSkipActionMock).toHaveBeenCalledWith("workspace-1", "apply");
  });

  it("calls generateCvContentAction for cv_generation_running's Generate CV draft button", async () => {
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: {} });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="cv_generation_running"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate CV draft" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(generateCvContentActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("calls submitCvDraftReviewAction 'approve' for paused_after_cv_draft's Approve button", async () => {
    submitCvDraftReviewActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        action: "approve",
        status: "pre_pdf_check_ready",
        currentDecision: "apply",
        reviewState: "approved",
        canProceedToExport: false,
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="paused_after_cv_draft"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(submitCvDraftReviewActionMock).toHaveBeenCalledWith("workspace-1", "approve");
  });

  it("calls exportCvAction for export_running's Export PDF button", async () => {
    exportCvActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        status: "cv_pdf_generated",
        htmlPath: "04_cv_export.html",
        pdfPath: "04_cv_export.pdf",
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="export_running"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(exportCvActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("calls exportCvAction for paused_before_export's Export PDF button", async () => {
    exportCvActionMock.mockResolvedValue({
      ok: true,
      data: {
        workspaceId: "workspace-1",
        status: "cv_pdf_generated",
        htmlPath: "04_cv_export.html",
        pdfPath: "04_cv_export.pdf",
      },
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="paused_before_export"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(exportCvActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("navigates to the CV PDF download URL when Download CV PDF is clicked", async () => {
    const originalLocation = window.location;
    const fakeLocation = { ...originalLocation, href: "" };
    Object.defineProperty(window, "location", { value: fakeLocation, writable: true, configurable: true });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="cv_pdf_generated"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl="/api/artifacts/artifact-1/download"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Download CV PDF" }));

    expect(fakeLocation.href).toBe("/api/artifacts/artifact-1/download");
    Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  });

  it("shows an error when Download CV PDF is clicked with no PDF artifact available", async () => {
    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="cv_pdf_generated"
        currentDecision="apply"
        originalDecision="apply"

        reviewState="pending_review"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Download CV PDF" }));

    expect(screen.getByText("No CV PDF artifact found to download.")).toBeInTheDocument();
  });

  it("renders errors returned by a server action", async () => {
    runAnalysisActionMock.mockResolvedValue({
      ok: false,
      errors: ["Workspace status does not allow run-analysis"],
    });

    const user = userEvent.setup();
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        originalDecision={null}

        reviewState={null}
        score={null}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => {
      expect(
        screen.getByText("Workspace status does not allow run-analysis"),
      ).toBeInTheDocument();
    });
  });

});
