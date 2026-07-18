"use server";

import {
  ApiValidationError,
  confirmSkip,
  exportCv,
  overrideSkip,
  regenerateCvContent,
  runAnalysis,
  submitCvDraftReview,
  submitReviewDecision,
  type ConfirmSkipResult,
  type CvDraftReviewAction,
  type CvDraftReviewResult,
  type ExportCvResult,
  type OverrideSkipResult,
  type OverrideTargetDecision,
  type ReviewAction,
  type ReviewDecisionResult,
  type RunAnalysisResult,
} from "@/lib/api";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

function toActionResult<T>(fn: () => Promise<T>) {
  return fn()
    .then((data): ActionResult<T> => ({ ok: true, data }))
    .catch((error): ActionResult<T> => {
      if (error instanceof ApiValidationError) {
        return { ok: false, errors: error.messages };
      }
      return {
        ok: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    });
}

export async function submitReviewDecisionAction(
  workspaceId: string,
  action: ReviewAction,
): Promise<ActionResult<ReviewDecisionResult>> {
  return toActionResult(() => submitReviewDecision(workspaceId, action));
}

export async function overrideSkipAction(
  workspaceId: string,
  targetDecision: OverrideTargetDecision,
  reasonNote?: string,
): Promise<ActionResult<OverrideSkipResult>> {
  return toActionResult(() => overrideSkip(workspaceId, targetDecision, reasonNote));
}

export async function submitCvDraftReviewAction(
  workspaceId: string,
  action: CvDraftReviewAction,
  reasonNote?: string,
): Promise<ActionResult<CvDraftReviewResult>> {
  return toActionResult(() => submitCvDraftReview(workspaceId, action, reasonNote));
}

export async function regenerateCvDraftAction(
  workspaceId: string,
): Promise<ActionResult<unknown>> {
  return toActionResult(() => regenerateCvContent(workspaceId));
}

export async function runAnalysisAction(
  workspaceId: string,
): Promise<ActionResult<RunAnalysisResult>> {
  return toActionResult(() => runAnalysis(workspaceId));
}

export async function generateCvContentAction(
  workspaceId: string,
): Promise<ActionResult<unknown>> {
  return toActionResult(() => regenerateCvContent(workspaceId));
}

export async function exportCvAction(
  workspaceId: string,
): Promise<ActionResult<ExportCvResult>> {
  return toActionResult(() => exportCv(workspaceId));
}

export async function confirmSkipAction(
  workspaceId: string,
): Promise<ActionResult<ConfirmSkipResult>> {
  return toActionResult(() => confirmSkip(workspaceId));
}
