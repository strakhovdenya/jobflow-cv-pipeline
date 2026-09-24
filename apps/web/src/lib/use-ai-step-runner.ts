"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAiJobAction,
  type ActionResult,
} from "@/app/workspaces/[id]/actions";
import type { ActiveAiJob, EnqueueAiStepResult } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 900; // ~30 minutes at POLL_INTERVAL_MS
const MAX_CONSECUTIVE_POLL_FAILURES = 3;
const LOST_TRACK_HINT =
  "The step may still be running — reload the page to check.";

const JOB_STATE_LABEL: Record<string, string> = {
  waiting: "Queued",
  prioritized: "Queued",
  delayed: "Queued",
  active: "Running…",
};

type EnqueueStep = () => Promise<ActionResult<EnqueueAiStepResult>>;

export interface AiStepRunner {
  isBusy: boolean;
  statusText: string | null;
  errors: string[];
  run: (enqueue: EnqueueStep) => Promise<void>;
}

// A step service reports its own failures (validation, provider errors) in its return value
// instead of throwing, so a "completed" job can still carry a failed step.
function readStepFailure(returnValue: unknown): string | null {
  if (typeof returnValue !== "object" || returnValue === null) {
    return null;
  }
  const { success, validationError } = returnValue as {
    success?: unknown;
    validationError?: unknown;
  };
  if (success !== false) {
    return null;
  }
  return typeof validationError === "string"
    ? validationError
    : "The step failed";
}

/**
 * Runs an AI step as a background job: enqueues it, polls until it finishes and refreshes the
 * page. Also adopts a job that is already open for the workspace (`activeJob`, e.g. after a page
 * reload), so a running step keeps showing progress and its button stays disabled.
 * `steps` limits which open jobs this runner adopts; omit it to adopt any.
 */
export function useAiStepRunner(
  workspaceId: string,
  activeJob: ActiveAiJob | null,
  steps?: readonly string[],
): AiStepRunner {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  const [ownJobId, setOwnJobId] = useState<string | null>(null);
  const [finishedJobIds, setFinishedJobIds] = useState<readonly string[]>([]);
  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [jobState, setJobState] = useState<string>(
    activeJob?.state ?? "waiting",
  );
  const [errors, setErrors] = useState<string[]>([]);

  const isAdoptable =
    activeJob !== null &&
    (steps === undefined || steps.includes(activeJob.step)) &&
    !finishedJobIds.includes(activeJob.jobId);
  const jobId = ownJobId ?? (isAdoptable ? activeJob.jobId : null);

  useEffect(() => {
    if (jobId === null) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let failedPolls = 0;

    // Stops polling without claiming the job is over: the page is not refreshed and the message
    // tells the user to reload, which adopts the job again if it is still running. A duplicate
    // start is rejected by the backend (409) while the job is open.
    function giveUp(jobErrors: string[]) {
      setErrors([...jobErrors, LOST_TRACK_HINT]);
      setFinishedJobIds((previous) => [...previous, jobId!]);
      setOwnJobId(null);
    }

    function finish(jobErrors: string[]) {
      setErrors(jobErrors);
      setFinishedJobIds((previous) => [...previous, jobId!]);
      setOwnJobId(null);
      routerRef.current.refresh();
    }

    function scheduleNextPoll() {
      timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    async function poll() {
      const result = await getAiJobAction(workspaceId, jobId!);
      if (cancelled) return;

      if (!result.ok) {
        failedPolls += 1;
        if (failedPolls >= MAX_CONSECUTIVE_POLL_FAILURES) {
          giveUp(result.errors);
          return;
        }
        scheduleNextPoll();
        return;
      }
      failedPolls = 0;

      const job = result.data;
      if (job.state === "completed") {
        const failure = readStepFailure(job.returnValue);
        finish(failure === null ? [] : [failure]);
        return;
      }
      if (job.state === "failed") {
        finish([job.failedReason ?? "The background job failed"]);
        return;
      }

      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        giveUp(["The step is still running after 30 minutes."]);
        return;
      }
      setJobState(job.state);
      scheduleNextPoll();
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, workspaceId]);

  const run = useCallback(async (enqueue: EnqueueStep) => {
    setErrors([]);
    setIsEnqueuing(true);
    const result = await enqueue();
    setIsEnqueuing(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setJobState("waiting");
    setOwnJobId(result.data.jobId);
  }, []);

  const isBusy = isEnqueuing || jobId !== null;
  let statusText: string | null = null;
  if (isEnqueuing) {
    statusText = "Starting…";
  } else if (jobId !== null) {
    statusText = JOB_STATE_LABEL[jobState] ?? jobState;
  }

  return { isBusy, statusText, errors, run };
}
