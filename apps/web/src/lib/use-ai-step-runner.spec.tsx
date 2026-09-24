import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAiJobAction } from "@/app/workspaces/[id]/actions";
import type { AiJobStatus } from "@/lib/api";
import { useAiStepRunner } from "./use-ai-step-runner";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/workspaces/[id]/actions", () => ({
  getAiJobAction: vi.fn(),
}));

const getAiJobActionMock = vi.mocked(getAiJobAction);

const jobResult = (job: Partial<AiJobStatus>) => ({
  ok: true as const,
  data: { jobId: "job-1", state: "active", ...job },
});

const enqueueOk = () =>
  Promise.resolve({ ok: true as const, data: { jobId: "job-1" } });

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useAiStepRunner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
    getAiJobActionMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is idle when the workspace has no open job", () => {
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    expect(result.current.isBusy).toBe(false);
    expect(result.current.statusText).toBeNull();
    expect(getAiJobActionMock).not.toHaveBeenCalled();
  });

  it("enqueues, polls until the job completes and refreshes the page", async () => {
    getAiJobActionMock
      .mockResolvedValueOnce(jobResult({ state: "active" }))
      .mockResolvedValueOnce(
        jobResult({ state: "completed", returnValue: { success: true } }),
      );
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    await act(async () => {
      await result.current.run(enqueueOk);
    });
    await flush();

    expect(result.current.isBusy).toBe(true);
    expect(result.current.statusText).toBe("Running…");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isBusy).toBe(false);
    expect(result.current.errors).toEqual([]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("reports the enqueue error and never polls", async () => {
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    await act(async () => {
      await result.current.run(() =>
        Promise.resolve({ ok: false as const, errors: ["already running"] }),
      );
    });

    expect(result.current.errors).toEqual(["already running"]);
    expect(result.current.isBusy).toBe(false);
    expect(getAiJobActionMock).not.toHaveBeenCalled();
  });

  it("reports the failure reason of a failed job and still refreshes", async () => {
    getAiJobActionMock.mockResolvedValue(
      jobResult({ state: "failed", failedReason: "Provider timed out" }),
    );
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    await act(async () => {
      await result.current.run(enqueueOk);
    });
    await flush();

    expect(result.current.errors).toEqual(["Provider timed out"]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("reports the validation error of a completed job whose step failed", async () => {
    getAiJobActionMock.mockResolvedValue(
      jobResult({
        state: "completed",
        returnValue: { success: false, validationError: "bad JSON" },
      }),
    );
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    await act(async () => {
      await result.current.run(enqueueOk);
    });
    await flush();

    expect(result.current.errors).toEqual(["bad JSON"]);
  });

  it("gives up after repeated consecutive poll failures but survives a single one", async () => {
    getAiJobActionMock
      .mockResolvedValueOnce({ ok: false, errors: ["network"] })
      .mockResolvedValueOnce(jobResult({ state: "active" }))
      .mockResolvedValue({ ok: false, errors: ["network"] });
    const { result } = renderHook(() => useAiStepRunner("ws-1", null));

    await act(async () => {
      await result.current.run(enqueueOk);
    });
    await flush();
    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000 * 4);
    });

    expect(result.current.isBusy).toBe(false);
    expect(result.current.errors).toEqual([
      "network",
      "The step may still be running — reload the page to check.",
    ]);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("adopts an open job of an allowed step after a reload", async () => {
    getAiJobActionMock.mockResolvedValue(
      jobResult({ jobId: "job-9", state: "active" }),
    );

    const { result } = renderHook(() =>
      useAiStepRunner(
        "ws-1",
        { jobId: "job-9", step: "prompt_2", state: "active" },
        ["prompt_2"],
      ),
    );
    await flush();

    expect(getAiJobActionMock).toHaveBeenCalledWith("ws-1", "job-9");
    expect(result.current.isBusy).toBe(true);
  });

  it("ignores an open job of a step it does not own", () => {
    const { result } = renderHook(() =>
      useAiStepRunner(
        "ws-1",
        { jobId: "job-9", step: "prompt_5", state: "active" },
        ["prompt_2"],
      ),
    );

    expect(result.current.isBusy).toBe(false);
    expect(getAiJobActionMock).not.toHaveBeenCalled();
  });

  it("does not re-adopt a finished job while the page still reports it as open", async () => {
    getAiJobActionMock.mockResolvedValue(
      jobResult({
        jobId: "job-9",
        state: "completed",
        returnValue: { success: true },
      }),
    );
    const { result } = renderHook(() =>
      useAiStepRunner("ws-1", {
        jobId: "job-9",
        step: "prompt_2",
        state: "active",
      }),
    );
    await flush();

    expect(result.current.isBusy).toBe(false);
    expect(getAiJobActionMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
