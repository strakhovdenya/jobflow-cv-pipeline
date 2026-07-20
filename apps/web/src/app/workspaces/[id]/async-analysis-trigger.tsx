"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalysisJobStatusAction, runAnalysisAsyncAction } from "./actions";
import type { AnalysisJobStatus } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // ~10 minutes at POLL_INTERVAL_MS

const TERMINAL_STATES = new Set(["completed", "failed"]);

const STATE_LABEL: Record<string, string> = {
  waiting: "Queued",
  delayed: "Queued",
  active: "Running…",
  completed: "Completed",
  failed: "Failed",
};

type Phase = "idle" | "enqueuing" | "polling" | "completed" | "failed" | "error";

interface AsyncAnalysisTriggerProps {
  workspaceId: string;
  status: string;
  locked?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function AsyncAnalysisTrigger({
  workspaceId,
  status,
  locked = false,
  onBusyChange,
}: AsyncAnalysisTriggerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<string>("waiting");
  const [result, setResult] = useState<AnalysisJobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Latest-ref pattern: router and onBusyChange aren't stable across every render
  // (e.g. onBusyChange is a fresh closure whenever the parent re-renders), but the
  // polling effect below must only restart when jobId/workspaceId actually change.
  const routerRef = useRef(router);
  const onBusyChangeRef = useRef(onBusyChange);
  useEffect(() => {
    routerRef.current = router;
    onBusyChangeRef.current = onBusyChange;
  });

  useEffect(() => {
    if (jobId === null) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      const pollResult = await getAnalysisJobStatusAction(workspaceId, jobId!);
      if (cancelled) {
        return;
      }

      if (!pollResult.ok) {
        setPhase("error");
        setErrorMessage(pollResult.errors.join("; "));
        onBusyChangeRef.current?.(false);
        return;
      }

      const jobStatus = pollResult.data;

      if (TERMINAL_STATES.has(jobStatus.state)) {
        if (jobStatus.state === "completed") {
          setPhase("completed");
          setResult(jobStatus);
          routerRef.current.refresh();
        } else {
          setPhase("failed");
          setErrorMessage(jobStatus.failedReason ?? null);
        }
        onBusyChangeRef.current?.(false);
        return;
      }

      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setPhase("error");
        setErrorMessage("Analysis is still running after 10 minutes — check back later.");
        onBusyChangeRef.current?.(false);
        return;
      }

      setJobState(jobStatus.state);
      setTimeout(() => {
        if (!cancelled) {
          void poll();
        }
      }, POLL_INTERVAL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [jobId, workspaceId]);

  if (status !== "source_saved" && phase === "idle") {
    return null;
  }

  async function start() {
    setPhase("enqueuing");
    setErrorMessage(null);
    onBusyChange?.(true);
    const enqueueResult = await runAnalysisAsyncAction(workspaceId);

    if (!enqueueResult.ok) {
      setPhase("error");
      setErrorMessage(enqueueResult.errors.join("; "));
      onBusyChange?.(false);
      return;
    }

    setPhase("polling");
    setJobId(enqueueResult.data.jobId);
  }

  const buttonClass =
    "rounded-md border border-black px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-white dark:text-white";

  const isBusy = phase === "enqueuing" || phase === "polling";
  const isLockedOut = locked && phase === "idle";

  if (isLockedOut) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Async analysis trigger
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={isBusy} onClick={start} className={buttonClass}>
          {phase === "enqueuing"
            ? "Enqueuing…"
            : phase === "polling"
              ? (STATE_LABEL[jobState] ?? jobState)
              : "Start analysis (async)"}
        </button>
      </div>
      {phase === "completed" && (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          Analysis completed
          {result?.returnValue?.decision ? ` — decision: ${result.returnValue.decision}` : ""}.
        </p>
      )}
      {phase === "failed" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Analysis failed{errorMessage ? `: ${errorMessage}` : "."}
        </p>
      )}
      {phase === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Could not start analysis: {errorMessage}
        </p>
      )}
    </section>
  );
}
