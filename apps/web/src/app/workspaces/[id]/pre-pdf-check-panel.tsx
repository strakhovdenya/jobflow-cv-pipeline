"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import { AccordionSection } from "@/components/accordion-section";
import { ActionButton } from "@/components/main-action-card";
import { downloadUrl } from "@/lib/artifact-download";
import { diffWords, type DiffToken } from "@/lib/text-diff";
import {
  generateCvContentAction,
  runPrePdfCheckAction,
  skipPrePdfCheckAction,
} from "./actions";

// Panel is only actionable (Run/Skip) at pre_pdf_check_ready; it stays visible read-only at
// paused_before_export so results remain viewable once the gate has been cleared.
const RUNNABLE_STATUSES = ["pre_pdf_check_ready"];
const ELIGIBLE_STATUSES = ["pre_pdf_check_ready", "paused_before_export"];

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

// cv_content is a plain, deeply-nested JSON object (TargetedCvContentBlock) — we only need
// generic property/array-index access here, not its full shape (see isFieldPathUserForced).
export type CvContentForForcedCheck = Record<string, unknown>;

function parseFieldPathSegments(fieldPath: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const tokenPattern = /([a-zA-Z_$][\w$]*)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(fieldPath)) !== null) {
    segments.push(match[1] !== undefined ? match[1] : Number(match[2]));
  }
  return segments;
}

/**
 * Returns true when the given field_path targets a Prompt 2 bullet marked user_forced (ADR-034).
 *
 * Generic by design — walks `field_path` (e.g. `experience[0].bullets[1].text`,
 * `current_work_block.bullets[0].text`) as a sequence of property/array-index accesses against
 * `cv_content`, then checks `user_forced` on the object one level up from the final named field
 * (i.e. the bullet object itself, not the leaf `.text` value) — so any current or future
 * bullet-bearing field (`current_work_block`, `experience[]`, `selected_projects[]`, or whatever
 * is added later) is covered without hardcoding its name here. A path with no trailing property
 * after a bullet index (e.g. `experience[0].bullets[1]`, missing `.text`) intentionally does not
 * match — Prompt 3 never emits a field_path shaped that way (see prompt3_v6.txt's field_path
 * format), and matching the bullets array itself rather than a field on the bullet would be a
 * different, unintended check. An unresolvable path (e.g. a wrapper-prefixed
 * `cv_content.experience[0]...`, which Prompt 3 is explicitly told never to emit) safely
 * returns false rather than throwing.
 */
export function isFieldPathUserForced(
  fieldPath: string,
  cvContent: CvContentForForcedCheck,
): boolean {
  const segments = parseFieldPathSegments(fieldPath);
  if (segments.length === 0) {
    return false;
  }

  let parent: unknown = cvContent;
  for (let i = 0; i < segments.length - 1; i++) {
    if (parent === null || typeof parent !== "object") {
      return false;
    }
    parent = (parent as Record<string | number, unknown>)[segments[i]];
  }

  if (parent === null || typeof parent !== "object") {
    return false;
  }
  return (parent as { user_forced?: boolean }).user_forced === true;
}

const SEVERITY_CLASS: Record<string, string> = {
  critical:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  warning:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suggestion:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

function DiffTokens({ tokens }: { tokens: DiffToken[] }) {
  return (
    <>
      {tokens.map((token, index) =>
        token.type === "same" ? (
          <span key={index}>{token.text}</span>
        ) : (
          <mark
            key={index}
            className={
              token.type === "removed"
                ? "rounded-sm bg-red-200 text-red-900 line-through dark:bg-red-900/50 dark:text-red-200"
                : "rounded-sm bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-200"
            }
          >
            {token.text}
          </mark>
        ),
      )}
    </>
  );
}

/**
 * Keyed by artifactId so a fetch result for an older artifact never lingers once a newer
 * artifact id becomes latest (see the isLoadingResult/result/resultError derivations below).
 */
type FetchState =
  | { status: "idle" }
  | { status: "loaded"; artifactId: string; data: PrePdfCheckOutput }
  | { status: "error"; artifactId: string; message: string };

type CvContentFetchState =
  | { status: "idle" }
  | { status: "loaded"; artifactId: string; data: CvContentForForcedCheck }
  | { status: "error"; artifactId: string; message: string };

function latestJsonArtifactId(artifacts: WorkspaceArtifactSummary[]): string | null {
  return (
    artifacts.find((a) => a.artifactType === "pre_pdf_check_json" && a.isLatest)?.id ??
    null
  );
}

function latestCvContentArtifactId(
  artifacts: WorkspaceArtifactSummary[],
): string | null {
  return (
    artifacts.find(
      (a) => a.artifactType === "targeted_cv_content_json" && a.isLatest,
    )?.id ?? null
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
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [cvContentFetchState, setCvContentFetchState] = useState<CvContentFetchState>({
    status: "idle",
  });
  // Selections keyed by pre-pdf-check artifact id — automatically "resets" when a new
  // Prompt 3 run produces a new artifact id, without needing a separate reset effect.
  // Keyed by the correction's index in `result.corrections` (its position in the array), not by
  // `field_path` — the schema (pre-pdf-check.schema.ts) does not guarantee field_path is unique
  // across corrections (e.g. two distinct findings, different severities, for the same field are
  // legal), so a field_path-keyed Set would make two such corrections impossible to select
  // independently.
  const [selectionsByArtifact, setSelectionsByArtifact] = useState<
    Record<string, Set<number>>
  >({});

  const isEligible = ELIGIBLE_STATUSES.includes(status);
  const isRunnable = RUNNABLE_STATUSES.includes(status);
  const jsonArtifactId = latestJsonArtifactId(artifacts);
  const cvContentArtifactId = latestCvContentArtifactId(artifacts);

  // Derived — automatically scoped to the current artifact; no explicit reset needed.
  const selectedIndices: Set<number> =
    jsonArtifactId !== null
      ? (selectionsByArtifact[jsonArtifactId] ?? new Set())
      : new Set();

  useEffect(() => {
    if (!isEligible || !jsonArtifactId) {
      return;
    }

    let cancelled = false;
    fetch(downloadUrl(jsonArtifactId))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load result (status ${response.status})`);
        }
        return response.json() as Promise<PrePdfCheckOutput>;
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
  }, [isEligible, jsonArtifactId]);

  // Fetch the latest targeted CV content to detect user_forced bullets (ADR-034).
  useEffect(() => {
    if (!isEligible || !cvContentArtifactId) {
      return;
    }

    let cancelled = false;
    fetch(downloadUrl(cvContentArtifactId))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load CV content (status ${response.status})`);
        }
        return response.json() as Promise<{ cv_content: CvContentForForcedCheck }>;
      })
      .then((data) => {
        if (!cancelled) {
          setCvContentFetchState({
            status: "loaded",
            artifactId: cvContentArtifactId,
            data: data.cv_content,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCvContentFetchState({
            status: "error",
            artifactId: cvContentArtifactId,
            message:
              error instanceof Error ? error.message : "Failed to load CV content",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEligible, cvContentArtifactId]);

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
  const isLoadingResult =
    jsonArtifactId != null &&
    !(fetchState.status !== "idle" && fetchState.artifactId === jsonArtifactId);

  const cvContent =
    cvContentFetchState.status === "loaded" &&
    cvContentFetchState.artifactId === cvContentArtifactId
      ? cvContentFetchState.data
      : null;

  const cvContentError =
    cvContentFetchState.status === "error" &&
    cvContentFetchState.artifactId === cvContentArtifactId
      ? cvContentFetchState.message
      : null;

  // Corrections whose field_path does NOT target a user_forced bullet (ADR-034), paired with
  // their original index in `result.corrections` (the selection key — see selectionsByArtifact's
  // comment for why index, not field_path). Fail CLOSED (not open) while cv content hasn't
  // successfully loaded yet (still fetching, or the fetch errored): until we can positively
  // confirm a correction does NOT target forced content, it must not be selectable — the
  // opposite default would let a fast click select (and submit) a forced correction during the
  // loading window, or permanently if the fetch never succeeds, silently defeating ADR-034.
  const selectableCorrectionEntries: { correction: PrePdfCheckCorrection; index: number }[] =
    cvContent === null
      ? []
      : (result?.corrections ?? [])
          .map((correction, index) => ({ correction, index }))
          .filter(({ correction }) => !isFieldPathUserForced(correction.field_path, cvContent));

  // Count how many currently-selected indices are still selectable (non-forced). Using this
  // instead of raw selectedIndices.size prevents stale selections (e.g. a forced correction
  // selected in a prior render before cv content loaded, or one that stopped being selectable)
  // from keeping the Regenerate button enabled.
  const selectedSelectableCount = selectableCorrectionEntries.filter(({ index }) =>
    selectedIndices.has(index),
  ).length;

  function toggleIndex(index: number) {
    if (!jsonArtifactId) return;
    setSelectionsByArtifact((prev) => {
      const current = prev[jsonArtifactId] ?? new Set<number>();
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return { ...prev, [jsonArtifactId]: next };
    });
  }

  function runCheck() {
    setErrors([]);
    startTransition(async () => {
      const actionResult = await runPrePdfCheckAction(workspaceId);
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

  function skipCheck() {
    setErrors([]);
    startTransition(async () => {
      const actionResult = await skipPrePdfCheckAction(workspaceId);
      if (actionResult.ok) {
        router.refresh();
      } else {
        setErrors(actionResult.errors);
      }
    });
  }

  function regenerateWithFeedback() {
    if (selectedSelectableCount === 0 || !result) return;
    setErrors([]);
    startTransition(async () => {
      const selected = selectableCorrectionEntries
        .filter(({ index }) => selectedIndices.has(index))
        .map(({ correction }) => correction);
      const notes = [
        "Selected Prompt 3 pre-PDF check findings to address:",
        ...selected.map(
          (c) =>
            `- [${c.severity}] ${c.field_path} — ${c.reason} Suggested: "${c.suggested_text}"`,
        ),
      ].join("\n");

      const actionResult = await generateCvContentAction(workspaceId, notes);
      if (actionResult.ok) {
        router.refresh();
      } else {
        setErrors(actionResult.errors);
      }
    });
  }

  const runKind = isPending ? ("disabled" as const) : ("primary" as const);
  const skipKind = isPending ? ("disabled" as const) : ("secondary" as const);
  const regenKind =
    isPending || selectedSelectableCount === 0
      ? ("disabled" as const)
      : ("primary" as const);
  const regenReason = isPending
    ? "Working…"
    : selectedSelectableCount === 0
      ? "Select findings above first"
      : undefined;
  const hasSelectableCorrections = selectableCorrectionEntries.length > 0;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Pre-PDF check
      </h2>
      {isRunnable && (
        <div className="flex gap-2">
          <ActionButton
            label="Run pre-PDF check"
            kind={runKind}
            reason={isPending ? "Working…" : undefined}
            onAction={() => runCheck()}
          />
          <ActionButton
            label="Skip pre-PDF check"
            kind={skipKind}
            reason={isPending ? "Working…" : undefined}
            onAction={() => skipCheck()}
          />
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

      {result && !isLoadingResult && (
        <AccordionSection
          title="Results"
          countBadge={result.corrections.length}
          defaultOpen={false}
        >
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
                {result.corrections.map((correction, index) => {
                  // Fail closed: only known-unforced (cvContent loaded AND not forced) renders a
                  // checkbox. While cvContent is still loading/unresolved, isSelectable is false —
                  // same rule as selectableCorrectionEntries above, kept in sync deliberately.
                  const isForced =
                    cvContent !== null &&
                    isFieldPathUserForced(correction.field_path, cvContent);
                  const isSelectable = cvContent !== null && !isForced;
                  const isKnownForced = isForced;
                  const isSelected = isSelectable && selectedIndices.has(index);

                  return (
                    <li
                      key={`${correction.field_path}-${index}`}
                      className={`rounded-md border p-3 text-sm ${SEVERITY_CLASS[correction.severity] ?? SEVERITY_CLASS.suggestion}`}
                    >
                      <div className="flex items-start gap-2">
                        {isSelectable && (
                          <input
                            type="checkbox"
                            aria-label={`Select correction: ${correction.field_path}`}
                            checked={isSelected}
                            onChange={() => toggleIndex(index)}
                            className="mt-0.5 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs">{correction.field_path}</div>
                          <div className="mt-1 font-semibold uppercase tracking-wide text-xs">
                            {correction.severity}
                            {isKnownForced && (
                              <span className="ml-1 font-normal normal-case">
                                (user-forced, not selectable)
                              </span>
                            )}
                          </div>
                          <p className="mt-1">{correction.reason}</p>
                          {correction.original_text ? (
                            (() => {
                              const diff = diffWords(
                                correction.original_text!,
                                correction.suggested_text,
                              );
                              return (
                                <>
                                  <p className="mt-1">
                                    <span className="font-medium">Suggested:</span>{" "}
                                    <DiffTokens tokens={diff.after} />
                                  </p>
                                  <p className="mt-1">
                                    <span className="font-medium">Original:</span>{" "}
                                    <DiffTokens tokens={diff.before} />
                                  </p>
                                </>
                              );
                            })()
                          ) : (
                            <p className="mt-1">
                              <span className="font-medium">Suggested:</span>{" "}
                              {correction.suggested_text}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-medium">Overall notes:</span> {result.overall_notes}
            </div>
          </div>
        </AccordionSection>
      )}

      {result && cvContentError && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Could not load CV content for forced-finding detection — corrections cannot be
          selected for regeneration until this succeeds (fail-closed, per ADR-034).
        </p>
      )}

      {result && hasSelectableCorrections && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <ActionButton
              label="Regenerate CV draft with selected feedback"
              kind={regenKind}
              reason={regenReason}
              onAction={() => regenerateWithFeedback()}
            />
            {selectedSelectableCount > 0 && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {selectedSelectableCount} finding
                {selectedSelectableCount !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
