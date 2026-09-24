"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MainActionCard } from "@/components/main-action-card";
import type { ActiveAiJob } from "@/lib/api";
import { buildMainActionCard } from "@/lib/pipeline-view-model";
import { useAiStepRunner } from "@/lib/use-ai-step-runner";
import { ErrorList } from "./error-list";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  overrideSkipAction,
  runAnalysisAction,
  submitCvDraftReviewAction,
  submitReviewDecisionAction,
} from "./actions";

const MAIN_PANEL_STEPS = ["prompt_1", "prompt_2", "skip_reason"] as const;

interface MainActionPanelProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
  originalDecision: string | null;
  reviewState: string | null;
  score: number | null;
  skipReasonSummary: string | null;
  cvPdfDownloadUrl: string | null;
  cvAtsPdfDownloadUrl: string | null;
  activeJob?: ActiveAiJob | null;
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
  cvAtsPdfDownloadUrl,
  activeJob = null,
}: MainActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const stepRunner = useAiStepRunner(workspaceId, activeJob, MAIN_PANEL_STEPS);

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

  // ADR-028: one "Skip" click drives both change_to_skip and confirm-skip in sequence, so the
  // user never sees an intermediate "decision flagged but not confirmed" screen. If
  // currentDecision is already "skip" (a retry after confirm-skip itself failed — status rolled
  // back to analysis_ready), only confirm-skip is retried; change_to_skip is a no-op precondition
  // failure once the decision is already skip. confirm-skip is an AI step, so it is enqueued as a
  // background job.
  async function enqueueSkip() {
    if (currentDecision !== "skip") {
      const changeResult = await submitReviewDecisionAction(workspaceId, "change_to_skip");
      if (!changeResult.ok) return changeResult;
    }
    return confirmSkipAction(workspaceId);
  }

  function dispatch(label: string, note?: string) {
    setErrors([]);

    if (label === "Download CV (Design)") {
      window.location.href = cvPdfDownloadUrl!;
      return;
    }

    if (label === "Download CV (ATS)") {
      window.location.href = cvAtsPdfDownloadUrl!;
      return;
    }

    const aiStepByLabel: Record<string, () => ReturnType<typeof confirmSkipAction>> = {
      "Start analysis": () => runAnalysisAction(workspaceId),
      Skip: () => enqueueSkip(),
      "Generate CV draft": () => generateCvContentAction(workspaceId),
      // ADR-029: notes typed into the card's reasonNote field are fed into the AI prompt when
      // regenerating (ignored server-side on a first-time generation).
      "Regenerate CV draft": () => generateCvContentAction(workspaceId, note),
    };

    const enqueue = aiStepByLabel[label];
    if (enqueue) {
      void stepRunner.run(enqueue);
      return;
    }

    const actionByLabel: Record<string, () => Promise<{ ok: boolean; errors?: string[] }>> = {
      // Mirrors pipeline-view-model.ts's buildMainActionCard label: when currentDecision is
      // "skip", Approve overrides to apply (ADR-027), so the label/key says "apply" not "skip".
      [`Approve (${currentDecision === "skip" ? "apply" : currentDecision ?? "—"})`]: () =>
        approveAnalysisReview(),
      "Override skip": () => overrideSkipAction(workspaceId, "apply"),
      Approve: () => submitCvDraftReviewAction(workspaceId, "approve"),
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
    cvPdfDownloadUrl,
    cvAtsPdfDownloadUrl,
  });

  const isBusy = isPending || stepRunner.isBusy;
  const card = isBusy
    ? {
        ...baseCard,
        info:
          stepRunner.statusText === null
            ? baseCard.info
            : { kind: "info" as const, text: stepRunner.statusText },
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
      <ErrorList errors={[...errors, ...stepRunner.errors]} />
    </div>
  );
}
