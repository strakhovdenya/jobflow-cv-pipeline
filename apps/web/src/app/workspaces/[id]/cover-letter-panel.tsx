"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { generateCoverLetterAction } from "./actions";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";

const RUNNABLE_STATUSES = ["cv_pdf_generated", "final_check_ready"];

/**
 * Only the JSON artifact confirms a fully valid cover letter: cover-letter.service.ts registers
 * cover_letter_md unconditionally (even a raw-fallback markdown on JSON validation failure), but
 * cover_letter_json only on success — matching pre-pdf-check-panel.tsx/final-check-panel.tsx's
 * convention of keying eligibility off the _json artifact type.
 */
function hasCoverLetterArtifact(artifacts: WorkspaceArtifactSummary[]): boolean {
  return artifacts.some((a) => a.artifactType === "cover_letter_json" && a.isLatest);
}

interface CoverLetterPanelProps {
  workspaceId: string;
  status: string;
  artifacts: WorkspaceArtifactSummary[];
}

export function CoverLetterPanel({
  workspaceId,
  status,
  artifacts,
}: CoverLetterPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const isRunnable = RUNNABLE_STATUSES.includes(status);
  const hasResult = hasCoverLetterArtifact(artifacts);
  const isEligible = isRunnable || hasResult;

  if (!isEligible) {
    return null;
  }

  function generate() {
    setErrors([]);
    startTransition(async () => {
      const actionResult = await generateCoverLetterAction(workspaceId);
      if (actionResult.ok) {
        if (actionResult.data.success) {
          router.refresh();
        } else {
          setErrors([actionResult.data.validationError ?? "Cover letter generation failed"]);
        }
      } else {
        setErrors(actionResult.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Cover letter
      </h2>
      {isRunnable && (
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={generate}
            className={buttonClass}
          >
            {isPending ? "Working…" : "Generate cover letter"}
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {hasResult && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Generated cover letter is available in the Artifacts section above.
        </p>
      )}
    </section>
  );
}
