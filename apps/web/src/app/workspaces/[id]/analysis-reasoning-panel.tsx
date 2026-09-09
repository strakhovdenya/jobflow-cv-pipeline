"use client";

import { useEffect, useState } from "react";
import { AccordionSection } from "@/components/accordion-section";
import { downloadUrl } from "@/lib/artifact-download";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { displayDecision } from "@/lib/pipeline-view-model";

interface AnalysisData {
  summary: string;
  top_reasons: string[];
  score: number;
  quality_score: number;
}

// Keyed by artifactId — stale data from a prior artifact id never shows for a new one.
type FetchState =
  | { status: "idle" }
  | { status: "loaded"; artifactId: string; data: AnalysisData }
  | { status: "error"; artifactId: string; message: string };

function latestVacancyAnalysisArtifactId(
  artifacts: WorkspaceArtifactSummary[],
): string | null {
  return (
    artifacts.find(
      (a) => a.artifactType === "vacancy_analysis_json" && a.isLatest,
    )?.id ?? null
  );
}

interface AnalysisReasoningPanelProps {
  artifacts: WorkspaceArtifactSummary[];
  currentDecision: string | null;
  originalDecision: string | null;
}

export function AnalysisReasoningPanel({
  artifacts,
  currentDecision,
  originalDecision,
}: AnalysisReasoningPanelProps) {
  const artifactId = latestVacancyAnalysisArtifactId(artifacts);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!artifactId) {
      return;
    }

    let cancelled = false;

    fetch(downloadUrl(artifactId))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load analysis (HTTP ${response.status})`);
        }
        return response.json() as Promise<AnalysisData>;
      })
      .then((data) => {
        if (!cancelled) {
          setFetchState({ status: "loaded", artifactId, data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchState({
            status: "error",
            artifactId,
            message:
              error instanceof Error
                ? error.message
                : "Failed to load analysis",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artifactId]);

  if (!artifactId) {
    return null;
  }

  const rawRecommendation = originalDecision ?? currentDecision;
  const panelTitle = rawRecommendation
    ? `Why ${displayDecision(rawRecommendation)}`
    : "Analysis reasoning";

  const data =
    fetchState.status === "loaded" && fetchState.artifactId === artifactId
      ? fetchState.data
      : null;
  const errorMessage =
    fetchState.status === "error" && fetchState.artifactId === artifactId
      ? fetchState.message
      : null;
  // Loading = we have an artifact but no settled result for it yet.
  const isLoading = data === null && errorMessage === null;

  return (
    <AccordionSection title={panelTitle} defaultOpen={false}>
      {isLoading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading analysis…
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-6 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Score:{" "}
              <span className="font-semibold text-black dark:text-zinc-50">
                {data.score}
              </span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Quality score:{" "}
              <span className="font-semibold text-black dark:text-zinc-50">
                {data.quality_score}
              </span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {data.summary}
          </p>
          {data.top_reasons.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {data.top_reasons.map((reason, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span
                    className="mt-1 shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AccordionSection>
  );
}
