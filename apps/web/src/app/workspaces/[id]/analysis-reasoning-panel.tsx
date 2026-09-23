"use client";

import { useEffect, useRef, useState } from "react";
import { AccordionSection } from "@/components/accordion-section";
import { useArtifactJson } from "@/lib/use-artifact-json";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { displayDecision } from "@/lib/pipeline-view-model";
import {
  isEnRuTranslationAvailable,
  translateEnToRu,
} from "@/lib/browser-translate";
import { buttonKindClasses } from "@/components/main-action-card";
import { Spinner } from "@/components/spinner";

interface AnalysisData {
  summary: string;
  top_reasons: string[];
  score: number;
  quality_score: number;
}

type TranslationAvailability = "checking" | "available" | "unavailable";

type TranslatedText = { summary: string; top_reasons: string[] };

type TranslationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "translated"; text: TranslatedText };

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
  const {
    data,
    error: errorMessage,
    isLoading,
  } = useArtifactJson<AnalysisData>(artifactId, { errorLabel: "analysis" });
  const [translationAvailability, setTranslationAvailability] =
    useState<TranslationAvailability>("checking");
  const [translationState, setTranslationState] = useState<TranslationState>({
    status: "idle",
  });
  // Tracks the last artifactId for which translationState is valid (KI-5).
  // When artifactId changes, we reset translation synchronously during render using
  // React's "adjusting state when a prop changes" pattern — avoids setState-in-effect
  // lint violation while still guaranteeing a stale Russian translation is never reshown
  // when navigating back to a previously-translated artifact.
  const [translationArtifactId, setTranslationArtifactId] = useState<
    string | null
  >(artifactId);
  if (translationArtifactId !== artifactId) {
    setTranslationArtifactId(artifactId);
    setTranslationState({ status: "idle" });
  }
  // Latest artifactId, readable from inside handleTranslateToggle's async closure —
  // lets an in-flight translate() call detect that the artifact changed underneath it
  // (see the ref check after `await` below) instead of overwriting the render-phase
  // reset above with a now-stale translated result once it resolves. Updated via effect,
  // not during render — writing to a ref while rendering is itself a lint violation.
  const artifactIdRef = useRef(artifactId);
  useEffect(() => {
    artifactIdRef.current = artifactId;
  }, [artifactId]);

  // Check browser translation availability once on mount.
  useEffect(() => {
    let cancelled = false;
    isEnRuTranslationAvailable()
      .then((available) => {
        if (!cancelled) {
          setTranslationAvailability(available ? "available" : "unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranslationAvailability("unavailable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!artifactId) {
    return null;
  }

  const rawRecommendation = originalDecision ?? currentDecision;
  const panelTitle = rawRecommendation
    ? `Why ${displayDecision(rawRecommendation)}`
    : "Analysis reasoning";

  const activeTranslation =
    translationState.status === "translated" ? translationState.text : null;

  async function handleTranslateToggle() {
    if (!data || translationState.status === "loading") return;

    if (activeTranslation) {
      // Toggle back: restore cached original English text.
      setTranslationState({ status: "idle" });
      return;
    }

    const requestedArtifactId = artifactId;
    setTranslationState({ status: "loading" });
    try {
      const texts = [data.summary, ...data.top_reasons];
      const translated = await translateEnToRu(texts);
      if (artifactIdRef.current !== requestedArtifactId) {
        // Artifact changed while translating (render-phase reset above already
        // fired) — discard this now-stale result instead of overwriting "idle".
        return;
      }
      setTranslationState({
        status: "translated",
        text: {
          summary: translated[0],
          top_reasons: translated.slice(1),
        },
      });
    } catch (error) {
      if (artifactIdRef.current === requestedArtifactId) {
        console.error("Translation failed:", error);
        setTranslationState({ status: "idle" });
      }
    }
  }

  const isTranslateDisabled =
    !data ||
    translationAvailability !== "available" ||
    translationState.status === "loading";

  const translateButton = (
    <button
      type="button"
      disabled={isTranslateDisabled}
      title={
        translationAvailability === "unavailable"
          ? "Перевод недоступен в этом браузере"
          : undefined
      }
      onClick={(e) => {
        // Stop propagation so clicking the button does not toggle the <details> accordion.
        e.stopPropagation();
        void handleTranslateToggle();
      }}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        isTranslateDisabled ? buttonKindClasses.disabled : buttonKindClasses.secondary
      }`}
    >
      {translationState.status === "loading" ? (
        <>
          <Spinner />
          Translating…
        </>
      ) : activeTranslation ? (
        "RU → EN"
      ) : (
        "EN → RU"
      )}
    </button>
  );

  const displaySummary = activeTranslation?.summary ?? data?.summary;
  const displayTopReasons = activeTranslation?.top_reasons ?? data?.top_reasons;

  return (
    <AccordionSection
      title={panelTitle}
      defaultOpen={false}
      headerExtra={translateButton}
    >
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
            {displaySummary}
          </p>
          {displayTopReasons && displayTopReasons.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {displayTopReasons.map((reason, index) => (
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
