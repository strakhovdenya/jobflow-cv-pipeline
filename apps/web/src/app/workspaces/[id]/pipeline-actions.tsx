"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmSkipAction,
  exportCvAction,
  generateCvContentAction,
  runAnalysisAction,
} from "./actions";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";

type PipelineAction = "start_analysis" | "generate_cv_draft" | "export_pdf" | "confirm_skip";

const BUTTON_LABEL: Record<PipelineAction, string> = {
  start_analysis: "Start analysis",
  generate_cv_draft: "Generate CV draft",
  export_pdf: "Export PDF",
  confirm_skip: "Confirm skip",
};

interface PipelineActionsProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
}

const ANALYSIS_READY_SKIP_STATUSES = ["analysis_ready", "paused_after_analysis"];

export function PipelineActions({
  workspaceId,
  status,
  currentDecision,
}: PipelineActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PipelineAction | null>(null);

  const actions: PipelineAction[] = [];
  if (status === "source_saved") {
    actions.push("start_analysis");
  }
  if (status === "cv_generation_running") {
    actions.push("generate_cv_draft");
  }
  if (status === "export_running") {
    actions.push("export_pdf");
  }
  if (
    ANALYSIS_READY_SKIP_STATUSES.includes(status) &&
    currentDecision === "skip"
  ) {
    actions.push("confirm_skip");
  }

  if (actions.length === 0) {
    return null;
  }

  function run(action: PipelineAction) {
    setErrors([]);
    setPendingAction(action);
    startTransition(async () => {
      const result = await (action === "start_analysis"
        ? runAnalysisAction(workspaceId)
        : action === "generate_cv_draft"
          ? generateCvContentAction(workspaceId)
          : action === "export_pdf"
            ? exportCvAction(workspaceId)
            : confirmSkipAction(workspaceId));

      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Pipeline actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={isPending}
            onClick={() => run(action)}
            className={buttonClass}
          >
            {isPending && pendingAction === action
              ? "Working…"
              : BUTTON_LABEL[action]}
          </button>
        ))}
      </div>
      {errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
