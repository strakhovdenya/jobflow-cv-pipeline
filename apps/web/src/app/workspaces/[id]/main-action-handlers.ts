import type { MainActionId } from "@/lib/types";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  overrideSkipAction,
  runAnalysisAction,
  submitCvDraftReviewAction,
  submitReviewDecisionAction,
} from "./actions";

export type MainActionHandler =
  | { kind: "ai_step"; enqueue: () => ReturnType<typeof confirmSkipAction> }
  | { kind: "action"; run: () => Promise<{ ok: boolean; errors?: string[] }> }
  | { kind: "navigate"; go: () => void };

export interface MainActionContext {
  workspaceId: string;
  currentDecision: string | null;
  note?: string;
  cvPdfDownloadUrl: string | null;
  cvAtsPdfDownloadUrl: string | null;
  navigate: (url: string) => void;
}

export function createMainActionHandlers({
  workspaceId,
  currentDecision,
  note,
  cvPdfDownloadUrl,
  cvAtsPdfDownloadUrl,
  navigate,
}: MainActionContext): Record<MainActionId, MainActionHandler> {
  const approveAnalysisReview = () => {
    if (currentDecision === "apply") {
      return submitReviewDecisionAction(workspaceId, "approve_apply");
    }
    if (currentDecision === "maybe") {
      return submitReviewDecisionAction(workspaceId, "approve_maybe");
    }
    // currentDecision === "skip": approving here overrides the skip recommendation (ADR-027).
    return submitReviewDecisionAction(workspaceId, "override_to_apply");
  };

  // ADR-028: one "Skip" click drives both change_to_skip and confirm-skip in sequence, so the
  // user never sees an intermediate "decision flagged but not confirmed" screen. If
  // currentDecision is already "skip" (a retry after confirm-skip itself failed — status rolled
  // back to analysis_ready), only confirm-skip is retried; change_to_skip is a no-op precondition
  // failure once the decision is already skip. confirm-skip is an AI step, so it is enqueued as a
  // background job.
  const enqueueSkip = async () => {
    if (currentDecision !== "skip") {
      const changeResult = await submitReviewDecisionAction(workspaceId, "change_to_skip");
      if (!changeResult.ok) return changeResult;
    }
    return confirmSkipAction(workspaceId);
  };

  const download = (url: string | null): MainActionHandler => ({
    kind: "navigate",
    go: () => {
      if (url) navigate(url);
    },
  });

  return {
    start_analysis: { kind: "ai_step", enqueue: () => runAnalysisAction(workspaceId) },
    skip: { kind: "ai_step", enqueue: enqueueSkip },
    generate_cv_draft: { kind: "ai_step", enqueue: () => generateCvContentAction(workspaceId) },
    // ADR-029: notes typed into the card's reasonNote field are fed into the AI prompt when
    // regenerating (ignored server-side on a first-time generation).
    regenerate_cv_draft: {
      kind: "ai_step",
      enqueue: () => generateCvContentAction(workspaceId, note),
    },
    approve_analysis: { kind: "action", run: approveAnalysisReview },
    override_skip: { kind: "action", run: () => overrideSkipAction(workspaceId, "apply") },
    approve_cv_draft: {
      kind: "action",
      run: () => submitCvDraftReviewAction(workspaceId, "approve"),
    },
    export_pdf: { kind: "action", run: () => exportCvAction(workspaceId) },
    download_cv_design: download(cvPdfDownloadUrl),
    download_cv_ats: download(cvAtsPdfDownloadUrl),
  };
}
