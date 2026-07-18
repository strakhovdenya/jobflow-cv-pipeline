"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateCvDraftAction, submitCvDraftReviewAction } from "./actions";
import type { CvDraftReviewAction } from "@/lib/api";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

interface CvDraftReviewGateProps {
  workspaceId: string;
}

export function CvDraftReviewGate({ workspaceId }: CvDraftReviewGateProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [reasonNote, setReasonNote] = useState("");

  function runReview(action: CvDraftReviewAction) {
    setErrors([]);
    startTransition(async () => {
      const result = await submitCvDraftReviewAction(
        workspaceId,
        action,
        reasonNote.trim() === "" ? undefined : reasonNote.trim(),
      );
      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function runRegenerate() {
    setErrors([]);
    startTransition(async () => {
      const result = await regenerateCvDraftAction(workspaceId);
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
        CV draft review
      </h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="reasonNote" className="text-sm font-medium">
          Reason note <span className="text-zinc-400">(optional, used by pause/mark not worth applying)</span>
        </label>
        <input
          id="reasonNote"
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReview("approve")}
          className={buttonClass}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReview("pause")}
          className={secondaryButtonClass}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runReview("mark_not_worth_applying")}
          className={secondaryButtonClass}
        >
          Mark not worth applying
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={runRegenerate}
          className={secondaryButtonClass}
        >
          Regenerate CV draft
        </button>
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
