import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncAnalysisTrigger } from "./async-analysis-trigger";
import { getAnalysisJobStatusAction, runAnalysisAsyncAction } from "./actions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runAnalysisAsyncAction: vi.fn(),
  getAnalysisJobStatusAction: vi.fn(),
}));

const runAnalysisAsyncActionMock = vi.mocked(runAnalysisAsyncAction);
const getAnalysisJobStatusActionMock = vi.mocked(getAnalysisJobStatusAction);

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start analysis (async)" }));
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("AsyncAnalysisTrigger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
    runAnalysisAsyncActionMock.mockReset();
    getAnalysisJobStatusActionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when status is not source_saved", () => {
    const { container } = render(
      <AsyncAnalysisTrigger workspaceId="workspace-1" status="paused_after_analysis" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("enqueues and polls through waiting -> active -> completed", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1" },
    });
    getAnalysisJobStatusActionMock
      .mockResolvedValueOnce({
        ok: true,
        data: { jobId: "job-1", state: "active" },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          jobId: "job-1",
          state: "completed",
          returnValue: {
            success: true,
            promptRunId: "run-1",
            aiRunId: "ai-1",
            workspaceStatus: "paused_after_analysis",
            decision: "apply",
          },
        },
      });

    render(<AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />);

    await clickStart();
    expect(runAnalysisAsyncActionMock).toHaveBeenCalledWith("workspace-1");

    await advance(2000);
    expect(getAnalysisJobStatusActionMock).toHaveBeenCalledWith("workspace-1", "job-1");
    expect(screen.getByRole("button", { name: "Running…" })).toBeInTheDocument();

    await advance(2000);
    expect(screen.getByText(/Analysis completed — decision: apply\./)).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();

    getAnalysisJobStatusActionMock.mockClear();
    await advance(4000);
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });

  it("stops polling and shows the failure reason on a failed job", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-2" },
    });
    getAnalysisJobStatusActionMock.mockResolvedValueOnce({
      ok: true,
      data: { jobId: "job-2", state: "failed", failedReason: "AI provider timeout" },
    });

    render(<AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />);

    await clickStart();
    await advance(2000);

    expect(screen.getByText("Analysis failed: AI provider timeout")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();

    getAnalysisJobStatusActionMock.mockClear();
    await advance(4000);
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });

  it("shows an error immediately when the enqueue call itself fails, without polling", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: false,
      errors: ["REDIS_URL is not configured"],
    });

    render(<AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />);

    await clickStart();

    expect(
      screen.getByText("Could not start analysis: REDIS_URL is not configured"),
    ).toBeInTheDocument();
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });

  it("clears the polling interval on unmount", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-3" },
    });
    getAnalysisJobStatusActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-3", state: "active" },
    });

    const { unmount } = render(
      <AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />,
    );

    await clickStart();
    unmount();

    getAnalysisJobStatusActionMock.mockClear();
    await advance(6000);
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });
});
