"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
} from "@/lib/api";
import { buttonKindClasses } from "@/components/main-action-card";
import { Spinner } from "@/components/spinner";
import { forkWorkspaceAction, getComparisonAction, runAnalysisAction } from "./actions";
import {
  CONTEXT_LAYOUTS,
  CONTEXT_SOURCE_SETS,
  DEFAULT_CONTEXT_LAYOUT,
  DEFAULT_CONTEXT_SOURCE_SET,
  STRATEGY_OPTIONS,
  comparisonHref,
  expectedPaidCalls,
  notesFromOutcomes,
  runCompareStrategies,
  type CompareApi,
  type CompareRowOutcome,
  type CompareRowRequest,
} from "./compare-strategies";

const COMPARE_API: CompareApi = {
  fork: forkWorkspaceAction,
  getComparison: getComparisonAction,
  startAnalysis: runAnalysisAction,
};

type RequestKeys = Record<AnalysisStrategy, string>;
type Selection = Record<AnalysisStrategy, boolean>;

const NO_SELECTION: Selection = { legacy: false, b: false, c: false };

const HEX = "0123456789abcdef";
const FOCUSABLE = "button, input, select, summary, a[href], [tabindex]:not([tabindex='-1'])";

// A v4 UUID. `randomUUID` exists only in secure contexts; `getRandomValues` everywhere.
function createRequestKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let hex = "";
  for (const byte of bytes) hex += HEX[byte >> 4] + HEX[byte & 0x0f];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// INV-6: one key per strategy row, created once when the dialog opens and kept for every
// resubmission of that row. Closing the dialog drops them.
function createRequestKeys(): RequestKeys {
  return { legacy: createRequestKey(), b: createRequestKey(), c: createRequestKey() };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface CompareStrategiesDialogProps {
  sourceWorkspaceId: string;
  canCarryOver: boolean;
  onClose: () => void;
}

export function CompareStrategiesDialog({
  sourceWorkspaceId,
  canCarryOver,
  onClose,
}: CompareStrategiesDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const [requestKeys] = useState(createRequestKeys);
  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [carryOver, setCarryOver] = useState(false);
  const [contextLayout, setContextLayout] = useState<ContextLayout>(DEFAULT_CONTEXT_LAYOUT);
  const [contextSourceSet, setContextSourceSet] = useState<ContextSourceSet>(DEFAULT_CONTEXT_SOURCE_SET);
  // The requests of the first submission. Once set, the options are locked and every resubmission
  // sends exactly these (T5 answers 409 to a known key with other options).
  const [submitted, setSubmitted] = useState<readonly CompareRowRequest[] | null>(null);
  const [outcomes, setOutcomes] = useState<readonly CompareRowOutcome[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isLocked = submitted !== null || isSubmitting;

  // Focus moves into the dialog on open and back to the control that opened it on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    // Escape closes (not while submitting); Tab stays inside the modal dialog.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function buildRequests(): CompareRowRequest[] {
    return STRATEGY_OPTIONS.filter((option) => selection[option.strategy]).map(({ strategy }) => {
      const isExperimental = strategy !== "legacy";
      return {
        analysisStrategy: strategy,
        contextLayout: isExperimental ? contextLayout : DEFAULT_CONTEXT_LAYOUT,
        contextSourceSet: isExperimental ? contextSourceSet : DEFAULT_CONTEXT_SOURCE_SET,
        carryOverRequirements: strategy === "c" && canCarryOver && carryOver,
        requestKey: requestKeys[strategy],
      };
    });
  }

  const requests = submitted ?? buildRequests();
  const totalPaidCalls = requests.reduce((sum, request) => sum + expectedPaidCalls(request), 0);
  const canConfirm = requests.length > 0 && !isSubmitting;

  async function handleConfirm() {
    if (isSubmittingRef.current || requests.length === 0) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const failedKeys = new Set(
      outcomes.filter((outcome) => outcome.kind === "fork_failed").map((outcome) => outcome.request.requestKey),
    );
    const toSend = submitted === null ? requests : requests.filter((request) => failedKeys.has(request.requestKey));
    setSubmitted(requests);
    const result = await runCompareStrategies(sourceWorkspaceId, toSend, COMPARE_API);
    if (result.some((outcome) => outcome.kind !== "fork_failed")) {
      // Stays locked while the comparison view loads: no second submission from this dialog.
      router.push(comparisonHref(sourceWorkspaceId, notesFromOutcomes(result)));
      return;
    }
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setOutcomes(result);
  }

  const errorsByKey = new Map(
    outcomes.flatMap((outcome) =>
      outcome.kind === "fork_failed" ? [[outcome.request.requestKey, outcome.errors] as const] : [],
    ),
  );
  const confirmLabel = submitted === null ? "Create and start" : "Retry failed forks";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-bold text-black dark:text-zinc-50">
            Compare strategies
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Each selected strategy gets its own copy of this vacancy and starts its analysis. This
            workspace stays unchanged.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2" disabled={isLocked}>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Strategies
          </legend>
          {STRATEGY_OPTIONS.map(({ strategy, label, description }) => {
            const rowRequest = requests.find((request) => request.analysisStrategy === strategy);
            const rowErrors = errorsByKey.get(requestKeys[strategy]) ?? [];
            const calls = expectedPaidCalls({
              analysisStrategy: strategy,
              carryOverRequirements: rowRequest?.carryOverRequirements ?? false,
            });
            return (
              <div
                key={strategy}
                className="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selection[strategy]}
                    onChange={(event) =>
                      setSelection((previous) => ({ ...previous, [strategy]: event.target.checked }))
                    }
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-black dark:text-zinc-50">{label}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {plural(calls, "paid call", "paid calls")}
                  </span>
                </label>
                {strategy === "c" && canCarryOver && (
                  <label className="ml-7 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={carryOver}
                      disabled={!selection.c}
                      onChange={(event) => setCarryOver(event.target.checked)}
                    />
                    Carry over this workspace&apos;s requirements (01a) — X1 is not run again
                  </label>
                )}
                {rowErrors.length > 0 && (
                  <ul role="alert" className="ml-7 flex flex-col gap-0.5 text-xs text-red-600 dark:text-red-400">
                    {rowErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </fieldset>

        <details className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Context profile (B and C): {contextLayout} / {contextSourceSet}
          </summary>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Request layout
              <select
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                value={contextLayout}
                disabled={isLocked}
                onChange={(event) => setContextLayout(event.target.value as ContextLayout)}
              >
                {CONTEXT_LAYOUTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              Source set
              <select
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                value={contextSourceSet}
                disabled={isLocked}
                onChange={(event) => setContextSourceSet(event.target.value as ContextSourceSet)}
              >
                {CONTEXT_SOURCE_SETS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            single / full reproduces the legacy request; the others are for factor measurements.
          </p>
        </details>

        <div className="flex flex-col gap-1 rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-black dark:text-zinc-50" aria-live="polite">
            {plural(requests.length, "new workspace", "new workspaces")} ·{" "}
            {plural(totalPaidCalls, "expected paid call", "expected paid calls")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Expected, not a limit: a carried-over X1 that fails its checks runs again. No cost estimate
            before the run — measured usage and a list-price estimate appear in the comparison view.
          </p>
          {submitted !== null && !isSubmitting && (
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Retrying re-sends the same requests, so a fork that already exists is not duplicated.
              Closing this dialog starts over with new requests.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              isSubmitting ? buttonKindClasses.disabled : buttonKindClasses.secondary
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              canConfirm ? buttonKindClasses.primary : buttonKindClasses.disabled
            }`}
          >
            {isSubmitting && <Spinner className="h-4 w-4" />}
            {isSubmitting ? "Starting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
