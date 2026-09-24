"use client";

import type { ActiveAiJob, WorkspaceArtifactSummary } from "@/lib/api";
import { ActionButton } from "@/components/main-action-card";
import { findLatestCoverLetterPdfDownloadUrl } from "@/lib/pipeline-view-model";
import { useAiStepRunner } from "@/lib/use-ai-step-runner";
import { generateCoverLetterAction } from "./actions";

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
  activeJob?: ActiveAiJob | null;
}

export function CoverLetterPanel({
  workspaceId,
  status,
  artifacts,
  activeJob = null,
}: CoverLetterPanelProps) {
  const stepRunner = useAiStepRunner(workspaceId, activeJob, ["cover_letter"]);

  const isRunnable = RUNNABLE_STATUSES.includes(status);
  const hasResult = hasCoverLetterArtifact(artifacts);
  const isEligible = isRunnable || hasResult;

  const coverLetterPdfDownloadUrl = findLatestCoverLetterPdfDownloadUrl(artifacts);

  if (!isEligible) {
    return null;
  }

  function generate() {
    void stepRunner.run(() => generateCoverLetterAction(workspaceId));
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Cover letter
      </h2>
      {isRunnable && (
        <div>
          <ActionButton
            label="Generate cover letter"
            kind={stepRunner.isBusy ? "disabled" : "primary"}
            reason={stepRunner.isBusy ? (stepRunner.statusText ?? "Working…") : undefined}
            onAction={() => generate()}
          />
        </div>
      )}

      {stepRunner.errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {stepRunner.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {hasResult && (
        <div className="flex flex-wrap gap-2">
          {coverLetterPdfDownloadUrl ? (
            <ActionButton
              label="Download Cover Letter (PDF)"
              kind="primary"
              onAction={() => {
                window.location.href = coverLetterPdfDownloadUrl;
              }}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generated cover letter is available in the Artifacts section above.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
