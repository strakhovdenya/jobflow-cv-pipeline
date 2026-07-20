"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalysisJobStatusAction, runAnalysisAsyncAction } from "./actions";
import type { AnalysisJobStatus } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;

const TERMINAL_STATES = new Set(["completed", "failed"]);

const STATE_LABEL: Record<string, string> = {
  waiting: "Queued",
  delayed: "Queued",
  active: "Running…",
  completed: "Completed",
  failed: "Failed",
};

type TriggerState =
  | { phase: "idle" }
  | { phase: "enqueuing" }
  | { phase: "polling"; jobId: string; jobState: string }
  | { phase: "completed"; result: AnalysisJobStatus }
  | { phase: "failed"; failedReason: string | undefined }
  | { phase: "error"; message: string };

interface AsyncAnalysisTriggerProps {
  workspaceId: string;
  status: string;
}

export function AsyncAnalysisTrigger({ workspaceId, status }: AsyncAnalysisTriggerProps) {
  const router = useRouter();
  const [state, setState] = useState<TriggerState>({ phase: "idle" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => clearPolling();
  }, []);

  useEffect(() => {
    if (state.phase !== "polling") {
      return;
    }

    const { jobId } = state;

    async function poll() {
      const result = await getAnalysisJobStatusAction(workspaceId, jobId);

      if (!result.ok) {
        clearPolling();
        setState({ phase: "error", message: result.errors.join("; ") });
        return;
      }

      const jobStatus = result.data;

      if (!TERMINAL_STATES.has(jobStatus.state)) {
        setState({ phase: "polling", jobId, jobState: jobStatus.state });
        return;
      }

      clearPolling();

      if (jobStatus.state === "completed") {
        setState({ phase: "completed", result: jobStatus });
        router.refresh();
      } else {
        setState({ phase: "failed", failedReason: jobStatus.failedReason });
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase === "polling" ? state.jobId : null]);

  if (status !== "source_saved") {
    return null;
  }

  async function start() {
    setState({ phase: "enqueuing" });
    const result = await runAnalysisAsyncAction(workspaceId);

    if (!result.ok) {
      setState({ phase: "error", message: result.errors.join("; ") });
      return;
    }

    setState({ phase: "polling", jobId: result.data.jobId, jobState: "waiting" });
  }

  const buttonClass =
    "rounded-md border border-black px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-white dark:text-white";

  const isBusy = state.phase === "enqueuing" || state.phase === "polling";

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Async analysis trigger
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={isBusy} onClick={start} className={buttonClass}>
          {state.phase === "enqueuing"
            ? "Enqueuing…"
            : state.phase === "polling"
              ? (STATE_LABEL[state.jobState] ?? state.jobState)
              : "Start analysis (async)"}
        </button>
      </div>
      {state.phase === "completed" && (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          Analysis completed
          {state.result.returnValue?.decision
            ? ` — decision: ${state.result.returnValue.decision}`
            : ""}
          .
        </p>
      )}
      {state.phase === "failed" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Analysis failed{state.failedReason ? `: ${state.failedReason}` : "."}
        </p>
      )}
      {state.phase === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Could not start analysis: {state.message}
        </p>
      )}
    </section>
  );
}
