import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisTriggers } from "./analysis-triggers";
import {
  getAnalysisJobStatusAction,
  runAnalysisAction,
  runAnalysisAsyncAction,
  type ActionResult,
} from "./actions";
import type { RunAnalysisResult } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runAnalysisAction: vi.fn(),
  runAnalysisAsyncAction: vi.fn(),
  getAnalysisJobStatusAction: vi.fn(),
  generateCvContentAction: vi.fn(),
  exportCvAction: vi.fn(),
  confirmSkipAction: vi.fn(),
}));

const runAnalysisActionMock = vi.mocked(runAnalysisAction);
const runAnalysisAsyncActionMock = vi.mocked(runAnalysisAsyncAction);
const getAnalysisJobStatusActionMock = vi.mocked(getAnalysisJobStatusAction);

async function flush(times = 4) {
  await act(async () => {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  });
}

describe("AnalysisTriggers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
    runAnalysisActionMock.mockReset();
    runAnalysisAsyncActionMock.mockReset();
    getAnalysisJobStatusActionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides the async trigger while the sync 'Start analysis' call is in flight", async () => {
    let resolveSync!: (value: ActionResult<RunAnalysisResult>) => void;
    runAnalysisActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );

    render(
      <AnalysisTriggers workspaceId="workspace-1" status="source_saved" currentDecision={null} />,
    );

    expect(screen.getByRole("button", { name: "Start analysis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start analysis (async)" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start analysis" }));
    });
    await flush();

    // Sync call locked the async trigger out.
    expect(
      screen.queryByRole("button", { name: "Start analysis (async)" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveSync({
        ok: true,
        data: {
          success: true,
          promptRunId: "run-1",
          aiRunId: "ai-1",
          workspaceStatus: "paused_after_analysis",
        },
      });
    });
    await flush();

    expect(refreshMock).toHaveBeenCalled();
  });

  it("hides the sync 'Start analysis' button while the async job is enqueuing/polling", async () => {
    runAnalysisAsyncActionMock.mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    getAnalysisJobStatusActionMock.mockResolvedValue({
      ok: true,
      data: { jobId: "job-1", state: "active" },
    });

    render(
      <AnalysisTriggers workspaceId="workspace-1" status="source_saved" currentDecision={null} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start analysis (async)" }));
    });
    await flush();

    expect(screen.queryByRole("button", { name: "Start analysis" })).not.toBeInTheDocument();
    expect(runAnalysisActionMock).not.toHaveBeenCalled();
  });
});
