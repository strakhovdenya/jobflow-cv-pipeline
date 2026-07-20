import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineActions } from "./pipeline-actions";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  runAnalysisAction,
} from "./actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runAnalysisAction: vi.fn(),
  generateCvContentAction: vi.fn(),
  exportCvAction: vi.fn(),
  confirmSkipAction: vi.fn(),
}));

const runAnalysisActionMock = vi.mocked(runAnalysisAction);
const generateCvContentActionMock = vi.mocked(generateCvContentAction);
const exportCvActionMock = vi.mocked(exportCvAction);
const confirmSkipActionMock = vi.mocked(confirmSkipAction);

describe("PipelineActions", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    runAnalysisActionMock.mockReset();
    generateCvContentActionMock.mockReset();
    exportCvActionMock.mockReset();
    confirmSkipActionMock.mockReset();
  });

  it("renders nothing when no action applies to the current status", () => {
    const { container } = render(
      <PipelineActions
        workspaceId="workspace-1"
        status="cv_pdf_generated"
        currentDecision={null}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows Start analysis at source_saved and calls run-analysis on click", async () => {
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
      <PipelineActions
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runAnalysisActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("shows Generate CV draft at cv_generation_running and calls generate-cv-content", async () => {
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: {} });

    const user = userEvent.setup();
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="cv_generation_running"
        currentDecision="apply"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate CV draft" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(generateCvContentActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("shows Export PDF at export_running and calls export-cv", async () => {
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
      <PipelineActions
        workspaceId="workspace-1"
        status="export_running"
        currentDecision="apply"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(exportCvActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("shows Confirm skip when decision is skip and status allows it", async () => {
    confirmSkipActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        workspaceId: "workspace-1",
        workspaceStatus: "skipped",
      },
    });

    const user = userEvent.setup();
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="paused_after_analysis"
        currentDecision="skip"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm skip" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(confirmSkipActionMock).toHaveBeenCalledWith("workspace-1");
  });

  it("does not show Confirm skip when status allows it but decision is not skip", () => {
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="paused_after_analysis"
        currentDecision="apply"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Confirm skip" }),
    ).not.toBeInTheDocument();
  });

  it("hides Start analysis when analysisLocked is true", () => {
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        analysisLocked
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Start analysis" }),
    ).not.toBeInTheDocument();
  });

  it("reports busy state via onAnalysisBusyChange around the start_analysis call", async () => {
    const onAnalysisBusyChange = vi.fn();
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
      <PipelineActions
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
        onAnalysisBusyChange={onAnalysisBusyChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start analysis" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(onAnalysisBusyChange).toHaveBeenCalledWith(true);
    expect(onAnalysisBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("does not toggle onAnalysisBusyChange for non-analysis actions", async () => {
    const onAnalysisBusyChange = vi.fn();
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: {} });

    const user = userEvent.setup();
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="cv_generation_running"
        currentDecision="apply"
        onAnalysisBusyChange={onAnalysisBusyChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate CV draft" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(onAnalysisBusyChange).not.toHaveBeenCalled();
  });

  it("renders errors returned by the server action", async () => {
    runAnalysisActionMock.mockResolvedValue({
      ok: false,
      errors: ["Workspace status does not allow run-analysis"],
    });

    const user = userEvent.setup();
    render(
      <PipelineActions
        workspaceId="workspace-1"
        status="source_saved"
        currentDecision={null}
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
