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

async function flush(times = 4) {
  await act(async () => {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  });
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start analysis (async)" }));
  });
  await flush();
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

  it("renders nothing when status is not source_saved and it was never started", () => {
    const { container } = render(
      <AsyncAnalysisTrigger workspaceId="workspace-1" status="paused_after_analysis" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("polls immediately after enqueue (no artificial 'Queued' wait) and completes", async () => {
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
    // First poll fires immediately, not after the 2s tick — reflects the real state right away.
    expect(getAnalysisJobStatusActionMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Running…" })).toBeInTheDocument();

    await advance(2000);
    expect(screen.getByText(/Analysis completed — decision: apply\./)).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();

    getAnalysisJobStatusActionMock.mockClear();
    await advance(4000);
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });

  it("keeps the completed banner visible after the status prop changes (router.refresh no longer hides it)", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1" },
    });
    getAnalysisJobStatusActionMock.mockResolvedValueOnce({
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

    const { rerender } = render(
      <AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />,
    );

    await clickStart();
    expect(screen.getByText(/Analysis completed/)).toBeInTheDocument();

    // Simulate the parent Server Component re-rendering with the new workspace status
    // after router.refresh() resolves.
    rerender(<AsyncAnalysisTrigger workspaceId="workspace-1" status="paused_after_analysis" />);

    expect(screen.getByText(/Analysis completed — decision: apply\./)).toBeInTheDocument();
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

  it("stops polling on unmount and never fires a stray request", async () => {
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

  it("stops polling and surfaces a timeout message after the max poll attempts", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-4" },
    });
    getAnalysisJobStatusActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-4", state: "active" },
    });

    render(<AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" />);

    await clickStart();
    // 300 attempts * 2s = 10 minutes of simulated time.
    await advance(300 * 2000);

    expect(
      screen.getByText(/Could not start analysis: Analysis is still running after 10 minutes/),
    ).toBeInTheDocument();

    getAnalysisJobStatusActionMock.mockClear();
    await advance(10000);
    expect(getAnalysisJobStatusActionMock).not.toHaveBeenCalled();
  });

  it("hides the button while locked and it hasn't been started yet", () => {
    const { container } = render(
      <AsyncAnalysisTrigger workspaceId="workspace-1" status="source_saved" locked />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("reports busy state via onBusyChange across the enqueue-to-terminal lifecycle", async () => {
    const onBusyChange = vi.fn();
    runAnalysisAsyncActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-5" },
    });
    getAnalysisJobStatusActionMock.mockResolvedValueOnce({
      ok: true,
      data: { jobId: "job-5", state: "failed", failedReason: "boom" },
    });

    render(
      <AsyncAnalysisTrigger
        workspaceId="workspace-1"
        status="source_saved"
        onBusyChange={onBusyChange}
      />,
    );

    await clickStart();
    expect(onBusyChange).toHaveBeenCalledWith(true);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });
});
