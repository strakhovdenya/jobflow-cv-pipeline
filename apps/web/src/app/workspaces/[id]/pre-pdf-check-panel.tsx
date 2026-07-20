"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { runPrePdfCheckAction } from "./actions";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";

const ELIGIBLE_STATUSES = ["cv_draft_ready", "paused_after_cv_draft"];

interface PrePdfCheckCorrection {
  field_path: string;
  original_text?: string;
  suggested_text: string;
  severity: "critical" | "warning" | "suggestion";
  reason: string;
}

interface PrePdfCheckOutput {
  readiness: "ready" | "ready_with_minor_edits" | "not_ready";
  corrections: PrePdfCheckCorrection[];
  export_blocked: boolean;
  overall_notes: string;
}

const SEVERITY_CLASS: Record<string, string> = {
  critical: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  warning:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suggestion:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

function downloadUrl(artifactId: string): string {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/download`;
}

function latestJsonArtifact(
  artifacts: WorkspaceArtifactSummary[],
): WorkspaceArtifactSummary | undefined {
  return artifacts.find(
    (a) => a.artifactType === "pre_pdf_check_json" && a.isLatest,
  );
}

interface PrePdfCheckPanelProps {
  workspaceId: string;
  status: string;
  artifacts: WorkspaceArtifactSummary[];
}

export function PrePdfCheckPanel({
  workspaceId,
  status,
  artifacts,
}: PrePdfCheckPanelProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PrePdfCheckOutput | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [loadedArtifactId, setLoadedArtifactId] = useState<string | null>(null);

  const jsonArtifact = latestJsonArtifact(artifacts);
  const isLoadingResult =
    jsonArtifact != null && loadedArtifactId !== jsonArtifact.id && resultError === null;

  useEffect(() => {
    if (!jsonArtifact) {
      return;
    }

    let cancelled = false;
    fetch(downloadUrl(jsonArtifact.id))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load result (status ${response.status})`);
        }
        return response.json() as Promise<PrePdfCheckOutput>;
      })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoadedArtifactId(jsonArtifact.id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setResultError(error instanceof Error ? error.message : "Failed to load result");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jsonArtifact]);

  if (!ELIGIBLE_STATUSES.includes(status)) {
    return null;
  }

  function runCheck() {
    setErrors([]);
    setIsPending(true);
    runPrePdfCheckAction(workspaceId).then((actionResult) => {
      setIsPending(false);
      if (actionResult.ok) {
        if (actionResult.data.success) {
          router.refresh();
        } else {
          setErrors([actionResult.data.validationError ?? "Pre-PDF check failed"]);
        }
      } else {
        setErrors(actionResult.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Pre-PDF check
      </h2>
      <div>
        <button
          type="button"
          disabled={isPending}
          onClick={runCheck}
          className={buttonClass}
        >
          {isPending ? "Working…" : "Run pre-PDF check"}
        </button>
      </div>

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

      {result && !isLoadingResult && (
        <div className="flex flex-col gap-3">
          {result.export_blocked ? (
            <div className="rounded-md border border-red-400 bg-red-100 p-3 text-sm font-semibold text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
              Export blocked — readiness: {result.readiness}
            </div>
          ) : (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              Export allowed — readiness: {result.readiness}
            </div>
          )}

          {result.corrections.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No corrections suggested.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {result.corrections.map((correction, index) => (
                <li
                  key={`${correction.field_path}-${index}`}
                  className={`rounded-md border p-3 text-sm ${SEVERITY_CLASS[correction.severity] ?? SEVERITY_CLASS.suggestion}`}
                >
                  <div className="font-mono text-xs">{correction.field_path}</div>
                  <div className="mt-1 font-semibold uppercase tracking-wide text-xs">
                    {correction.severity}
                  </div>
                  <p className="mt-1">{correction.reason}</p>
                  <p className="mt-1">
                    <span className="font-medium">Suggested:</span> {correction.suggested_text}
                  </p>
                  {correction.original_text && (
                    <p className="mt-1">
                      <span className="font-medium">Original:</span> {correction.original_text}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Overall notes:</span> {result.overall_notes}
          </div>
        </div>
      )}
    </section>
  );
}
