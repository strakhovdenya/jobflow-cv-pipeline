"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MainActionCard } from "@/components/main-action-card";
import { buildMainActionCard } from "@/lib/pipeline-view-model";
import { ErrorList } from "./error-list";
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
} from "./actions";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // ~10 minutes at POLL_INTERVAL_MS
const TERMINAL_JOB_STATES = new Set(["completed", "failed"]);
const ASYNC_STATE_LABEL: Record<string, string> = {
  waiting: "Queued",
  delayed: "Queued",
  active: "Running…",
  completed: "Completed",
  failed: "Failed",
};

type AsyncPhase = "idle" | "enqueuing" | "polling" | "error";

interface MainActionPanelProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
  originalDecision: string | null;
  reviewState: string | null;
  score: number | null;
  skipReasonSummary: string | null;
  cvPdfDownloadUrl: string | null;
}

export function MainActionPanel({
  workspaceId,
  status,
  currentDecision,
  originalDecision,
  reviewState,
  score,
  skipReasonSummary,
  cvPdfDownloadUrl,
}: MainActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const [asyncPhase, setAsyncPhase] = useState<AsyncPhase>("idle");
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);
  const [asyncJobState, setAsyncJobState] = useState("waiting");

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  useEffect(() => {
    if (asyncJobId === null) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      const pollResult = await getAnalysisJobStatusAction(workspaceId, asyncJobId!);
      if (cancelled) return;

      if (!pollResult.ok) {
        setAsyncPhase("error");
        setErrors(pollResult.errors);
        return;
      }

      const jobStatus = pollResult.data;
      if (TERMINAL_JOB_STATES.has(jobStatus.state)) {
        if (jobStatus.state === "completed") {
          setAsyncPhase("idle");
          setAsyncJobId(null);
          routerRef.current.refresh();
        } else {
          setAsyncPhase("error");
          setErrors([jobStatus.failedReason ?? "Analysis job failed"]);
        }
        return;
      }

      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setAsyncPhase("error");
        setErrors(["Analysis is still running after 10 minutes — check back later."]);
        return;
      }

      setAsyncJobState(jobStatus.state);
      setTimeout(() => {
        if (!cancelled) void poll();
      }, POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [asyncJobId, workspaceId]);

  function approveAnalysisReview() {
    if (currentDecision === "apply") {
      return submitReviewDecisionAction(workspaceId, "approve_apply");
    }
    if (currentDecision === "maybe") {
      return submitReviewDecisionAction(workspaceId, "approve_maybe");
    }
    // currentDecision === "skip": approving here overrides the skip recommendation (ADR-027).
    return submitReviewDecisionAction(workspaceId, "override_to_apply");
  }

  function dispatch(label: string) {
    setErrors([]);

    if (label === "Download CV PDF") {
      if (cvPdfDownloadUrl) {
        window.location.href = cvPdfDownloadUrl;
      } else {
        setErrors(["No CV PDF artifact found to download."]);
      }
      return;
    }

    if (label === "Start analysis (async)") {
      setAsyncPhase("enqueuing");
      startTransition(async () => {
        const result = await runAnalysisAsyncAction(workspaceId);
        if (!result.ok) {
          setAsyncPhase("error");
          setErrors(result.errors);
          return;
        }
        setAsyncPhase("polling");
        setAsyncJobId(result.data.jobId);
      });
      return;
    }

    const actionByLabel: Record<string, () => Promise<{ ok: boolean; errors?: string[] }>> = {
      "Start analysis": () => runAnalysisAction(workspaceId),
      [`Approve (${currentDecision ?? "—"})`]: () => approveAnalysisReview(),
      Pause: () => submitCvDraftReviewAction(workspaceId, "pause"),
      Skip: () => submitReviewDecisionAction(workspaceId, "change_to_skip"),
      "Confirm skip": () => confirmSkipAction(workspaceId),
      "Override skip": () => overrideSkipAction(workspaceId, "apply"),
      "Generate CV draft": () => generateCvContentAction(workspaceId),
      Approve: () => submitCvDraftReviewAction(workspaceId, "approve"),
      "Mark not worth applying": () =>
        submitCvDraftReviewAction(workspaceId, "mark_not_worth_applying"),
      "Regenerate CV draft": () => generateCvContentAction(workspaceId),
      "Export PDF": () => exportCvAction(workspaceId),
    };

    const action = actionByLabel[label];
    if (!action) return;

    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors ?? ["Action failed"]);
      }
    });
  }

  const baseCard = buildMainActionCard({
    status,
    currentDecision,
    originalDecision,
    reviewState,
    score,
    skipReasonSummary,
  });

  const isBusy = isPending || asyncPhase === "enqueuing" || asyncPhase === "polling";
  const card = isBusy
    ? {
        ...baseCard,
        info:
          asyncPhase === "polling" || asyncPhase === "enqueuing"
            ? {
                kind: "info" as const,
                text:
                  asyncPhase === "enqueuing"
                    ? "Enqueuing analysis job…"
                    : (ASYNC_STATE_LABEL[asyncJobState] ?? asyncJobState),
              }
            : baseCard.info,
        buttons: baseCard.buttons.map((button) => ({
          ...button,
          kind: "disabled" as const,
          reason: "Working…",
        })),
      }
    : baseCard;

  return (
    <div className="flex flex-col gap-3">
      <MainActionCard {...card} onAction={dispatch} />
      <ErrorList errors={errors} />
    </div>
  );
}
