"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccordionSection } from "@/components/accordion-section";
import { useArtifactJson } from "@/lib/use-artifact-json";
import type { WorkspaceAnalysisPolicy, WorkspaceArtifactSummary } from "@/lib/api";
import { displayDecision, isExperimentalStrategy } from "@/lib/pipeline-view-model";
import {
  isEnRuTranslationAvailable,
  translateEnToRu,
} from "@/lib/browser-translate";
import { buttonKindClasses } from "@/components/main-action-card";
import { Spinner } from "@/components/spinner";
import { CompareStrategiesDialog } from "./compare-strategies-dialog";
import { canOfferCarryOver } from "./compare-strategies";

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
  // Without a workspace id the panel offers no comparison (no source to fork).
  workspaceId?: string;
  status?: string;
  isArchived?: boolean;
  analysisStrategy?: string | null;
  analysisPolicy?: WorkspaceAnalysisPolicy | null;
  sourcesChangedSinceAnalysis?: boolean;
  comparisonGroupId?: string | null;
}

const FLAG_PILL_CLASS =
  "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300";

// ADR-046 item 4: why the policy decided as it did. Every element appears only when the API reports
// it; nothing here is computed from other fields.
function PolicyDetails({ policy }: { policy: WorkspaceAnalysisPolicy }) {
  const hasFlags = policy.borderline || policy.manualReviewRequired;
  return (
    <section
      aria-label="Policy details"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 text-sm dark:border-zinc-800"
    >
      <h2 className="text-sm font-bold text-black dark:text-zinc-50">Policy details</h2>
      <p className="text-zinc-700 dark:text-zinc-300">
        <span className="text-zinc-500 dark:text-zinc-400">Advisory (model): </span>
        <span className="font-semibold">{displayDecision(policy.advisoryDecision)}</span>
        {policy.advisoryDiffers && (
          <span className="text-zinc-500 dark:text-zinc-400"> — differs from the policy decision</span>
        )}
      </p>
      {hasFlags && (
        <div className="flex flex-wrap gap-2">
          {policy.borderline && <span className={FLAG_PILL_CLASS}>Borderline</span>}
          {policy.manualReviewRequired && <span className={FLAG_PILL_CLASS}>Manual review required</span>}
        </div>
      )}
      {policy.borderline && policy.borderlineReasons.length > 0 && (
        <p className="text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">Borderline because: </span>
          {policy.borderlineReasons.join(", ")}
        </p>
      )}
      {policy.decidingRule.trim() !== "" && (
        <p className="text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">Deciding rule: </span>
          <span className="font-mono font-semibold">{policy.decidingRule}</span>
        </p>
      )}
      {policy.openQuestions.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Open questions
          </h3>
          <ul className="flex flex-col gap-1">
            {policy.openQuestions.map((question, index) => (
              <li key={index} className="text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{question.condition}</span>
                {question.note !== "" && <span> — {question.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function AnalysisReasoningPanel({
  artifacts,
  currentDecision,
  originalDecision,
  workspaceId,
  status,
  isArchived = false,
  analysisStrategy = null,
  analysisPolicy = null,
  sourcesChangedSinceAnalysis = false,
  comparisonGroupId = null,
}: AnalysisReasoningPanelProps) {
  const [isCompareOpen, setIsCompareOpen] = useState(false);
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

  const canCompare = workspaceId !== undefined && !isArchived && status !== "archived";
  const policy = isExperimentalStrategy(analysisStrategy) ? analysisPolicy : null;
  const compareButtonClass = `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${buttonKindClasses.secondary}`;

  // ADR-046 item 13: the API reports it only for an experimental analysis; legacy shows nothing new.
  const sourcesNotice = sourcesChangedSinceAnalysis && isExperimentalStrategy(analysisStrategy) ? (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
    >
      <p className="font-semibold text-amber-950 dark:text-amber-100">Knowledge sources changed</p>
      <p className="text-amber-900 dark:text-amber-200">
        The active sources differ from the ones this analysis used, or that snapshot cannot be
        verified, so the analysis may no longer reflect the current sources. A new comparison run
        re-assesses the vacancy in new workspaces (paid); nothing starts until you confirm it.
      </p>
      {canCompare && (
        <div>
          <button type="button" onClick={() => setIsCompareOpen(true)} className={compareButtonClass}>
            Compare strategies again
          </button>
        </div>
      )}
    </div>
  ) : null;

  const hasComparisonLink = workspaceId !== undefined && comparisonGroupId !== null;
  // With the notice shown, its own button is the compare action; the strip keeps only the link.
  const showStripCompare = canCompare && sourcesNotice === null;
  const compareStrip =
    showStripCompare || hasComparisonLink ? (
      <div className="flex flex-wrap items-center gap-3">
        {showStripCompare && (
          <button type="button" onClick={() => setIsCompareOpen(true)} className={compareButtonClass}>
            Compare strategies
          </button>
        )}
        {hasComparisonLink && (
          <Link
            href={`/workspaces/${encodeURIComponent(workspaceId)}/comparison`}
            className="text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
          >
            Open comparison
          </Link>
        )}
      </div>
    ) : null;

  const dialog =
    isCompareOpen && workspaceId !== undefined ? (
      <CompareStrategiesDialog
        sourceWorkspaceId={workspaceId}
        canCarryOver={canOfferCarryOver(analysisStrategy, artifacts)}
        onClose={() => setIsCompareOpen(false)}
      />
    ) : null;

  // The dialog keeps one position in every branch, so a refresh that adds the first `01` while it is
  // open does not remount it (its request keys and lock must live as long as it is open, INV-6).
  if (!artifactId) {
    const body =
      sourcesNotice || compareStrip ? (
        <div className="flex flex-col gap-3">
          {sourcesNotice}
          {compareStrip}
        </div>
      ) : null;
    return (
      <>
        {body}
        {dialog}
      </>
    );
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

  const accordion = (
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

  const body =
    !sourcesNotice && !compareStrip && !policy ? (
      accordion
    ) : (
      <div className="flex flex-col gap-3">
        {sourcesNotice}
        {policy && <PolicyDetails policy={policy} />}
        {accordion}
        {compareStrip}
      </div>
    );

  return (
    <>
      {body}
      {dialog}
    </>
  );
}
