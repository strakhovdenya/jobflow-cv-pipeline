"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { downloadUrl } from "@/lib/artifact-download";
import { runFinalCheckAction } from "./actions";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";

const RUNNABLE_STATUS = "cv_pdf_generated";

interface FinalCheckChecklist {
  pdf_opens: boolean;
  content_matches_vacancy: boolean;
  no_unsupported_claims: boolean;
  contact_info_present: boolean;
  ready_to_apply: boolean;
}

interface FinalCheckOutput {
  final_decision: "ready_to_send" | "needs_edit" | "do_not_send";
  quality_score: number;
  page_count: number;
  missing_sections: string[];
  formatting_issues: string[];
  overclaiming_issues: string[];
  broken_links: string[];
  warnings: string[];
  final_checklist: FinalCheckChecklist;
}

const DECISION_CLASS: Record<string, string> = {
  ready_to_send:
    "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  needs_edit:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  do_not_send:
    "border-red-400 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200",
};

const CHECKLIST_LABELS: Record<keyof FinalCheckChecklist, string> = {
  pdf_opens: "PDF opens",
  content_matches_vacancy: "Content matches vacancy",
  no_unsupported_claims: "No unsupported claims",
  contact_info_present: "Contact info present",
  ready_to_apply: "Ready to apply",
};

type StringArrayField =
  | "missing_sections"
  | "formatting_issues"
  | "overclaiming_issues"
  | "broken_links"
  | "warnings";

const ISSUE_FIELDS: { key: StringArrayField; label: string }[] = [
  { key: "missing_sections", label: "Missing sections" },
  { key: "formatting_issues", label: "Formatting issues" },
  { key: "overclaiming_issues", label: "Overclaiming issues" },
  { key: "broken_links", label: "Broken links" },
  { key: "warnings", label: "Warnings" },
];

/**
 * Keyed by artifactId so a fetch result for an older artifact never lingers once a newer
 * artifact id becomes latest (see the isLoadingResult/result/resultError derivations below).
 */
type FetchState =
  | { status: "idle" }
  | { status: "loaded"; artifactId: string; data: FinalCheckOutput }
  | { status: "error"; artifactId: string; message: string };

function latestJsonArtifactId(
  artifacts: WorkspaceArtifactSummary[],
): string | null {
  return (
    artifacts.find((a) => a.artifactType === "final_check_json" && a.isLatest)
      ?.id ?? null
  );
}

interface FinalCheckPanelProps {
  workspaceId: string;
  status: string;
  artifacts: WorkspaceArtifactSummary[];
}

export function FinalCheckPanel({
  workspaceId,
  status,
  artifacts,
}: FinalCheckPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  const isRunnable = status === RUNNABLE_STATUS;
  const jsonArtifactId = latestJsonArtifactId(artifacts);
  const hasResult = jsonArtifactId != null;
  const isEligible = isRunnable || hasResult;

  useEffect(() => {
    if (!jsonArtifactId) {
      return;
    }

    let cancelled = false;
    fetch(downloadUrl(jsonArtifactId))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load result (status ${response.status})`);
        }
        return response.json() as Promise<FinalCheckOutput>;
      })
      .then((data) => {
        if (!cancelled) {
          setFetchState({ status: "loaded", artifactId: jsonArtifactId, data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchState({
            status: "error",
            artifactId: jsonArtifactId,
            message: error instanceof Error ? error.message : "Failed to load result",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jsonArtifactId]);

  if (!isEligible) {
    return null;
  }

  const result =
    fetchState.status === "loaded" && fetchState.artifactId === jsonArtifactId
      ? fetchState.data
      : null;
  const resultError =
    fetchState.status === "error" && fetchState.artifactId === jsonArtifactId
      ? fetchState.message
      : null;
  const isLoadingResult = jsonArtifactId != null && result === null && resultError === null;

  function runCheck() {
    setErrors([]);
    startTransition(async () => {
      const actionResult = await runFinalCheckAction(workspaceId);
      if (actionResult.ok) {
        if (actionResult.data.success) {
          router.refresh();
        } else {
          setErrors([actionResult.data.validationError ?? "Final check failed"]);
        }
      } else {
        setErrors(actionResult.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Final check
      </h2>
      {isRunnable && (
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={runCheck}
            className={buttonClass}
          >
            {isPending ? "Working…" : "Run final check"}
          </button>
        </div>
      )}

      {(errors.length > 0 || resultError) && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
          {resultError && <li>{resultError}</li>}
        </ul>
      )}

      {isLoadingResult && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading result…</p>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div
            className={`rounded-md border p-3 text-sm font-semibold ${DECISION_CLASS[result.final_decision] ?? DECISION_CLASS.needs_edit}`}
          >
            {result.final_decision} — quality score: {result.quality_score} —{" "}
            {result.page_count} page{result.page_count === 1 ? "" : "s"}
          </div>

          <ul className="flex flex-col gap-1 text-sm">
            {(Object.keys(CHECKLIST_LABELS) as (keyof FinalCheckChecklist)[]).map(
              (field) => (
                <li key={field} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={
                      result.final_checklist[field]
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {result.final_checklist[field] ? "✓" : "✗"}
                  </span>
                  {CHECKLIST_LABELS[field]}
                </li>
              ),
            )}
          </ul>

          {ISSUE_FIELDS.map(({ key, label }) => {
            const items = result[key];
            return (
              <div key={key} className="text-sm">
                <div className="font-medium text-zinc-700 dark:text-zinc-300">
                  {label}
                </div>
                {items.length === 0 ? (
                  <p className="text-zinc-500 dark:text-zinc-400">None.</p>
                ) : (
                  <ul className="list-inside list-disc text-zinc-700 dark:text-zinc-300">
                    {items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
