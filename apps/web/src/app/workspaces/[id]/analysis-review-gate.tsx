"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  overrideSkipAction,
  submitReviewDecisionAction,
} from "./actions";
import type { OverrideTargetDecision, ReviewAction } from "@/lib/api";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

interface AnalysisReviewGateProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
}

export function AnalysisReviewGate({
  workspaceId,
  status,
  currentDecision,
}: AnalysisReviewGateProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [targetDecision, setTargetDecision] =
    useState<OverrideTargetDecision>("apply");
  const [reasonNote, setReasonNote] = useState("");

  function runReviewDecision(action: ReviewAction) {
    setErrors([]);
    startTransition(async () => {
      const result = await submitReviewDecisionAction(workspaceId, action);
      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function runOverrideSkip() {
    setErrors([]);
    startTransition(async () => {
      const result = await overrideSkipAction(
        workspaceId,
        targetDecision,
        reasonNote.trim() === "" ? undefined : reasonNote.trim(),
      );
      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  const content =
    status === "skipped" ? (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This workspace was skipped. Override to resume the pipeline.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor="targetDecision" className="text-sm font-medium">
            Override to
          </label>
          <select
            id="targetDecision"
            value={targetDecision}
            onChange={(e) =>
              setTargetDecision(e.target.value as OverrideTargetDecision)
            }
            className={inputClass}
          >
            <option value="apply">Apply</option>
            <option value="maybe">Maybe</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reasonNote" className="text-sm font-medium">
            Reason note <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="reasonNote"
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={runOverrideSkip}
          className={buttonClass}
        >
          {isPending ? "Submitting…" : "Override skip"}
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || currentDecision !== "apply"}
          onClick={() => runReviewDecision("approve_apply")}
          className={buttonClass}
        >
          Approve (apply)
        </button>
        <button
          type="button"
          disabled={isPending || currentDecision !== "maybe"}
          onClick={() => runReviewDecision("approve_maybe")}
          className={buttonClass}
        >
          Approve (maybe)
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReviewDecision("pause")}
          className={buttonClass}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReviewDecision("change_to_skip")}
          className={buttonClass}
        >
          Skip
        </button>
      </div>
    );

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Analysis review
      </h2>
      {content}
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
