import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainActionPanel } from "./main-action-panel";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  getAiJobAction,
  overrideSkipAction,
  runAnalysisAction,
  submitCvDraftReviewAction,
  submitReviewDecisionAction,
} from "./actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runAnalysisAction: vi.fn(),
  getAiJobAction: vi.fn(),
  submitReviewDecisionAction: vi.fn(),
  overrideSkipAction: vi.fn(),
  submitCvDraftReviewAction: vi.fn(),
  generateCvContentAction: vi.fn(),
  exportCvAction: vi.fn(),
  confirmSkipAction: vi.fn(),
}));

const runAnalysisActionMock = vi.mocked(runAnalysisAction);
const getAiJobActionMock = vi.mocked(getAiJobAction);
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
    getAiJobActionMock.mockReset();
    getAiJobActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1", state: "completed", returnValue: { success: true } },
    });
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

  it("enqueues the analysis job on Start analysis and refreshes once it completes", async () => {
    runAnalysisActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });

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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runAnalysisActionMock).toHaveBeenCalledWith("workspace-1");
    expect(getAiJobActionMock).toHaveBeenCalledWith("workspace-1", "job-1");
  });

  it("does not render a separate async start button", () => {
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Start analysis (async)" }),
    ).not.toBeInTheDocument();
  });

  it("disables the buttons and shows the job state while the job is running", async () => {
    runAnalysisActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    getAiJobActionMock.mockResolvedValue({
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start analysis" }));
    });
    await flush();

    expect(screen.getByRole("button", { name: "Start analysis" })).toBeDisabled();
    expect(screen.getByText(/Running…/)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows the failure reason and refreshes when the job fails", async () => {
    runAnalysisActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    getAiJobActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1", state: "failed", failedReason: "Provider timed out" },
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    expect(await screen.findByText("Provider timed out")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the validation error of a completed job whose step reported failure", async () => {
    runAnalysisActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    getAiJobActionMock.mockResolvedValue({
      ok: true,
      data: {
        jobId: "job-1",
        state: "completed",
        returnValue: { success: false, validationError: "JSON validation failed" },
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    expect(await screen.findByText("JSON validation failed")).toBeInTheDocument();
  });

  it("shows the enqueue error and does not poll when the step cannot be started", async () => {
    runAnalysisActionMock.mockResolvedValue({
      ok: false,
      errors: ['Step "prompt_1" is already running for workspace "workspace-1"'],
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    expect(await screen.findByText(/already running/)).toBeInTheDocument();
    expect(getAiJobActionMock).not.toHaveBeenCalled();
  });

  it("resumes an open background job after a page reload", async () => {
    getAiJobActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-9", state: "active" },
    });

    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="cv_generation_running"
        currentDecision="apply"
        originalDecision="apply"
        reviewState="approved"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
        cvAtsPdfDownloadUrl={null}
        activeJob={{ jobId: "job-9", step: "prompt_2", state: "active" }}
      />,
    );
    await flush();

    expect(getAiJobActionMock).toHaveBeenCalledWith("workspace-1", "job-9");
    expect(screen.getByRole("button", { name: "Generate CV draft" })).toBeDisabled();
  });

  it("ignores an open job of a step this panel does not own", () => {
    render(
      <MainActionPanel
        workspaceId="workspace-1"
        status="cv_pdf_generated"
        currentDecision="apply"
        originalDecision="apply"
        reviewState="approved"
        score={75}
        skipReasonSummary={null}
        cvPdfDownloadUrl={null}
        cvAtsPdfDownloadUrl={null}
        activeJob={{ jobId: "job-9", step: "prompt_5", state: "active" }}
      />,
    );

    expect(getAiJobActionMock).not.toHaveBeenCalled();
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
        cvAtsPdfDownloadUrl={null}
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
      data: { jobId: "job-1" },
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
        cvAtsPdfDownloadUrl={null}
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
      data: { jobId: "job-1" },
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
        cvAtsPdfDownloadUrl={null}
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Override skip" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(overrideSkipActionMock).toHaveBeenCalledWith("workspace-1", "apply");
  });

  it("calls generateCvContentAction for cv_generation_running's Generate CV draft button", async () => {
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });

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
        cvAtsPdfDownloadUrl={null}
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
        cvAtsPdfDownloadUrl={null}
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
        cvAtsPdfDownloadUrl={null}
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(exportCvActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("navigates to the CV PDF download URL when Download CV (Design) is clicked", async () => {
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Download CV (Design)" }));

    expect(fakeLocation.href).toBe("/api/artifacts/artifact-1/download");
    Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  });

  it("does not render Download CV (Design) button when design URL is null", () => {
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download CV (Design)" })).toBeNull();
  });

  it("navigates to the ATS CV PDF download URL when Download CV (ATS) is clicked", async () => {
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
        cvPdfDownloadUrl={null}
        cvAtsPdfDownloadUrl="/api/artifacts/artifact-ats-1/download"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Download CV (ATS)" }));

    expect(fakeLocation.href).toBe("/api/artifacts/artifact-ats-1/download");
    Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  });

  it("does not render Download CV (ATS) button when ATS URL is null", () => {
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download CV (ATS)" })).toBeNull();
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
        cvAtsPdfDownloadUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => {
      expect(
        screen.getByText("Workspace status does not allow run-analysis"),
      ).toBeInTheDocument();
    });
  });

  describe("dispatches by button id", () => {
    const baseProps = {
      workspaceId: "workspace-1",
      originalDecision: null,
      reviewState: null,
      score: null,
      skipReasonSummary: null,
      cvPdfDownloadUrl: null,
      cvAtsPdfDownloadUrl: null,
    };

    const okResult = { ok: true, data: {} } as never;

    beforeEach(() => {
      submitReviewDecisionActionMock.mockResolvedValue(okResult);
      overrideSkipActionMock.mockResolvedValue(okResult);
      submitCvDraftReviewActionMock.mockResolvedValue(okResult);
      exportCvActionMock.mockResolvedValue(okResult);
      confirmSkipActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
      generateCvContentActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    });

    it.each([
      ["paused_after_analysis", "apply", "Approve (apply)", "approve_apply"],
      ["paused_after_analysis", "maybe", "Approve (maybe)", "approve_maybe"],
      ["paused_after_analysis", "skip", "Approve (apply)", "override_to_apply"],
    ])("%s / %s: %s submits %s", async (status, currentDecision, label, action) => {
      const user = userEvent.setup();
      render(<MainActionPanel {...baseProps} status={status} currentDecision={currentDecision} />);

      await user.click(screen.getByRole("button", { name: label }));

      await waitFor(() =>
        expect(submitReviewDecisionActionMock).toHaveBeenCalledWith("workspace-1", action),
      );
    });

    it("Skip chains change_to_skip and confirm-skip", async () => {
      const user = userEvent.setup();
      submitReviewDecisionActionMock.mockResolvedValue(okResult);
      render(
        <MainActionPanel {...baseProps} status="paused_after_analysis" currentDecision="apply" />,
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));

      await waitFor(() => expect(confirmSkipActionMock).toHaveBeenCalledWith("workspace-1"));
      expect(submitReviewDecisionActionMock).toHaveBeenCalledWith("workspace-1", "change_to_skip");
    });

    it("Skip only retries confirm-skip when the decision is already skip", async () => {
      const user = userEvent.setup();
      render(
        <MainActionPanel {...baseProps} status="analysis_ready" currentDecision="skip" />,
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));

      await waitFor(() => expect(confirmSkipActionMock).toHaveBeenCalledWith("workspace-1"));
      expect(submitReviewDecisionActionMock).not.toHaveBeenCalled();
    });

    it("Regenerate CV draft passes the typed note; Approve submits the CV review", async () => {
      const user = userEvent.setup();
      render(<MainActionPanel {...baseProps} status="cv_draft_ready" currentDecision="apply" />);

      await user.type(screen.getByRole("textbox"), "shorter");
      await user.click(screen.getByRole("button", { name: "Regenerate CV draft" }));
      await waitFor(() =>
        expect(generateCvContentActionMock).toHaveBeenCalledWith("workspace-1", "shorter"),
      );

      await user.click(screen.getByRole("button", { name: "Approve" }));
      await waitFor(() =>
        expect(submitCvDraftReviewActionMock).toHaveBeenCalledWith("workspace-1", "approve"),
      );
    });

    it.each([
      ["skipped", "Override skip", () => overrideSkipActionMock],
      ["paused_before_export", "Export PDF", () => exportCvActionMock],
      ["cv_generation_running", "Generate CV draft", () => generateCvContentActionMock],
    ])("%s: %s runs its action", async (status, label, getMock) => {
      const user = userEvent.setup();
      render(<MainActionPanel {...baseProps} status={status} currentDecision="apply" />);

      await user.click(screen.getByRole("button", { name: label }));

      await waitFor(() => expect(getMock()).toHaveBeenCalled());
    });

    it("download buttons navigate to their own url", async () => {
      const hrefSetter = vi.fn();
      const original = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          set href(value: string) {
            hrefSetter(value);
          },
        },
      });
      try {
        const user = userEvent.setup();
        render(
          <MainActionPanel
            {...baseProps}
            status="cv_pdf_generated"
            currentDecision="apply"
            cvPdfDownloadUrl="/design.pdf"
            cvAtsPdfDownloadUrl="/ats.pdf"
          />,
        );

        await user.click(screen.getByRole("button", { name: "Download CV (Design)" }));
        await user.click(screen.getByRole("button", { name: "Download CV (ATS)" }));

        expect(hrefSetter.mock.calls).toEqual([["/design.pdf"], ["/ats.pdf"]]);
      } finally {
        Object.defineProperty(window, "location", { configurable: true, value: original });
      }
    });
  });

});
