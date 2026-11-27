"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  ComparisonInputEquality,
  ComparisonMember,
  ComparisonStage,
  ComparisonSummary,
  CostEstimate,
  InputEqualityFlag,
  UsageBreakdown,
} from "@/lib/api";
import { buttonKindClasses } from "@/components/main-action-card";
import { Spinner } from "@/components/spinner";
import {
  displayDecision,
  isExperimentalStrategy,
  recommendationTitle,
  statusLabel,
} from "@/lib/pipeline-view-model";
import { forkWorkspaceAction, getComparisonAction, runAnalysisAction, type ActionResult } from "../actions";
import {
  START_NOTE_TEXT,
  STRATEGY_LABEL,
  comparisonHref,
  isJobOpenOrUnknown,
  memberAnalysisAction,
  runCompareRow,
  startMemberAnalysis,
  type CompareApi,
  type CompareRowNotes,
  type FailedForkRow,
  type StartOutcome,
} from "../compare-strategies";

const COMPARE_API: CompareApi = {
  fork: forkWorkspaceAction,
  getComparison: getComparisonAction,
  startAnalysis: runAnalysisAction,
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 600; // ~30 minutes at POLL_INTERVAL_MS
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

const UNKNOWN_JOB_STATE = "unknown";
const JOB_STATE_LABEL: Record<string, string> = {
  waiting: "Queued",
  prioritized: "Queued",
  delayed: "Queued",
  active: "Running…",
  [UNKNOWN_JOB_STATE]: "Queue state unknown",
};

const STAGE_LABEL: Record<string, string> = {
  prompt_1: "Prompt 1",
  analysis_b: "B",
  analysis_x1: "X1 · requirements",
  analysis_x2: "X2 · assessment",
};

const EQUALITY_LABEL: Record<keyof ComparisonInputEquality, string> = {
  vacancyHash: "Vacancy text",
  companyAndRole: "Company and role",
  notes: "Manual notes",
  snapshot: "Source snapshot",
  model: "Model",
};
const EQUALITY_KEYS = Object.keys(EQUALITY_LABEL) as (keyof ComparisonInputEquality)[];

// ---------- formatting (display only; every number comes from the API as is) ----------

const formatTokens = (count: number) => count.toLocaleString("en-US");
const formatDuration = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

// A small non-zero estimate is never rounded to a misleading zero.
function formatAmount(amount: number, currency: string): string {
  const prefix = currency === "USD" ? "$" : `${currency} `;
  if (amount === 0) return `${prefix}0`;
  if (amount < 0.0001) return `< ${prefix}0.0001`;
  return `${prefix}${amount.toFixed(4)}`;
}

function UsageLines({ usage }: { usage: UsageBreakdown }) {
  return (
    <>
      <span>
        Input {formatTokens(usage.inputTokens)} (incl. cache read {formatTokens(usage.cacheReadTokens)}, cache
        write {formatTokens(usage.cacheWriteTokens)})
      </span>
      <span>
        Output {formatTokens(usage.outputTokens)} (incl. reasoning {formatTokens(usage.reasoningTokens)})
      </span>
    </>
  );
}

function EstimateText({ estimate }: { estimate: CostEstimate }) {
  if (estimate.amount === null) {
    return (
      <span className="flex flex-col">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">Not available</span>
        {estimate.reason && <span className="text-zinc-500 dark:text-zinc-400">{estimate.reason}</span>}
      </span>
    );
  }
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-black dark:text-zinc-50">
        {formatAmount(estimate.amount, estimate.currency)}
      </span>
      {estimate.reason && <span className="text-zinc-500 dark:text-zinc-400">{estimate.reason}</span>}
    </span>
  );
}

function StageItem({ stage }: { stage: ComparisonStage }) {
  const label = STAGE_LABEL[stage.stepKey] ?? stage.stepKey;
  if (stage.isCarriedOver) {
    return (
      <li className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span>Carried over from the source — no call</span>
      </li>
    );
  }
  return (
    <li className="flex flex-col">
      <span className="font-semibold">
        {label}: {stage.callCount} {stage.callCount === 1 ? "call" : "calls"}
        {stage.failedCallCount > 0 && `, ${stage.failedCallCount} failed`}
      </span>
      {stage.usage.isMeasured ? <UsageLines usage={stage.usage} /> : <span>Usage not measured</span>}
      <span>Duration {formatDuration(stage.durationMs)}</span>
      {stage.models.length > 0 && <span className="font-mono">{stage.models.join(", ")}</span>}
    </li>
  );
}

function MeasuredUsage({ member }: { member: ComparisonMember }) {
  const { totals, stages } = member;
  if (stages.length === 0) {
    return <span className="text-zinc-500 dark:text-zinc-400">No calls yet</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-black dark:text-zinc-50">
        {totals.callCount} {totals.callCount === 1 ? "call" : "calls"}
        {totals.failedCallCount > 0 && `, ${totals.failedCallCount} failed`}
      </span>
      {totals.usage.isMeasured ? (
        <UsageLines usage={totals.usage} />
      ) : (
        <span className="text-zinc-500 dark:text-zinc-400">Not measured</span>
      )}
      {totals.unmeasuredCallCount > 0 && (
        <span className="text-amber-700 dark:text-amber-400">
          {totals.unmeasuredCallCount} {totals.unmeasuredCallCount === 1 ? "call" : "calls"} without recorded usage
        </span>
      )}
      <span>Duration {formatDuration(totals.durationMs)}</span>
      <details>
        <summary className="cursor-pointer text-indigo-700 dark:text-indigo-300">Per stage</summary>
        <ul className="mt-1 flex flex-col gap-2">
          {stages.map((stage) => (
            <StageItem key={stage.stepKey} stage={stage} />
          ))}
        </ul>
      </details>
    </div>
  );
}

// The estimate of each stage sits in the estimate column, apart from the measured usage (INV-5).
function CostCell({ member }: { member: ComparisonMember }) {
  const pricedStages = member.stages.filter((stage) => !stage.isCarriedOver);
  return (
    <div className="flex flex-col gap-0.5">
      <EstimateText estimate={member.totals.estimate} />
      <span className="text-zinc-400">{member.totals.estimate.label}</span>
      {pricedStages.length > 1 && (
        <details>
          <summary className="cursor-pointer text-indigo-700 dark:text-indigo-300">Per stage</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {pricedStages.map((stage) => (
              <li key={stage.stepKey} className="flex flex-col">
                <span className="font-semibold">{STAGE_LABEL[stage.stepKey] ?? stage.stepKey}</span>
                <EstimateText estimate={stage.estimate} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------- input equality ----------

// An unrecorded member was not compared: its input is never presented as verified equal.
function equalityState(flag: InputEqualityFlag): "differs" | "unrecorded" | "equal" {
  if (!flag.isEqual) return "differs";
  return flag.unrecordedWorkspaceIds.length > 0 ? "unrecorded" : "equal";
}

function equalityVerdict(flag: InputEqualityFlag, memberCount: number): string {
  if (!flag.isEqual) return "Differs";
  const unrecordedCount = flag.unrecordedWorkspaceIds.length;
  if (unrecordedCount === 0) return "Equal";
  return unrecordedCount >= memberCount ? "Not recorded" : "Equal where recorded";
}

const EQUALITY_CLASS = {
  differs: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  unrecorded:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  equal: "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
};

function InputEquality({ summary }: { summary: ComparisonSummary }) {
  const slugById = new Map(summary.members.map((member) => [member.workspaceId, member.workspaceSlug]));
  if (summary.members.length < 2) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Only this workspace is in the group, so there is nothing to compare its inputs with yet.
      </p>
    );
  }
  return (
    <section aria-label="Input equality" className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-black dark:text-zinc-50">Input equality</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {EQUALITY_KEYS.map((key) => {
          const flag = summary.inputEquality[key];
          const state = equalityState(flag);
          const unrecorded = flag.unrecordedWorkspaceIds.map((id) => slugById.get(id) ?? id);
          const verdict = equalityVerdict(flag, summary.members.length);
          return (
            <li
              key={key}
              data-equality={state}
              className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-xs ${EQUALITY_CLASS[state]}`}
            >
              <span className="font-semibold">{EQUALITY_LABEL[key]}</span>
              <span>{verdict}</span>
              {unrecorded.length > 0 && (
                <span className="[overflow-wrap:anywhere]">Not compared: {unrecorded.join(", ")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- rows ----------

function Recommendation({ member }: { member: ComparisonMember }) {
  const isExperimental = isExperimentalStrategy(member.analysisStrategy);
  const policy = isExperimental ? member.analysisPolicy : null;
  const decisionChanged =
    member.currentDecision !== null &&
    member.originalDecision !== null &&
    member.currentDecision !== member.originalDecision;
  return (
    <div className="flex flex-col gap-0.5">
      <span>
        <span className="text-zinc-500 dark:text-zinc-400">{recommendationTitle(member.analysisStrategy)}: </span>
        <span className="font-semibold text-black dark:text-zinc-50">
          {displayDecision(member.originalDecision)}
        </span>
      </span>
      {policy && (
        <span>
          <span className="text-zinc-500 dark:text-zinc-400">Advisory (model): </span>
          {displayDecision(policy.advisoryDecision)}
        </span>
      )}
      {decisionChanged && (
        <span>
          <span className="text-zinc-500 dark:text-zinc-400">Decision changed to: </span>
          {displayDecision(member.currentDecision)}
        </span>
      )}
      <span>
        <span className="text-zinc-500 dark:text-zinc-400">Score: </span>
        {member.score ?? "—"}
      </span>
    </div>
  );
}

function PolicyCell({ member }: { member: ComparisonMember }) {
  const policy = isExperimentalStrategy(member.analysisStrategy) ? member.analysisPolicy : null;
  if (!policy) return <span className="text-zinc-500 dark:text-zinc-400">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {policy.decidingRule.trim() !== "" && (
        <span>
          <span className="text-zinc-500 dark:text-zinc-400">Rule: </span>
          <span className="font-mono font-semibold">{policy.decidingRule}</span>
        </span>
      )}
      {policy.borderline && (
        <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Borderline
        </span>
      )}
      {policy.borderline && policy.borderlineReasons.length > 0 && (
        <span className="text-zinc-600 dark:text-zinc-400">{policy.borderlineReasons.join(", ")}</span>
      )}
      {policy.manualReviewRequired && (
        <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Manual review required
        </span>
      )}
    </div>
  );
}

const ACTION_BUTTON_CLASS = "inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold";

function RowActionButton({
  label,
  isBusy,
  onClick,
}: {
  label: string;
  isBusy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={onClick}
      className={`${ACTION_BUTTON_CLASS} ${isBusy ? buttonKindClasses.disabled : buttonKindClasses.secondary}`}
    >
      {isBusy && <Spinner className="h-3 w-3" />}
      {label}
    </button>
  );
}

// A rejected server action (lost network) is a failed read, never an unhandled rejection.
async function readComparison(workspaceId: string): Promise<ActionResult<ComparisonSummary>> {
  try {
    return await getComparisonAction(workspaceId);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "The comparison could not be read"] };
  }
}

function outcomeMessages(outcome: StartOutcome): string[] {
  if (outcome.kind === "started") return [];
  if (outcome.kind === "not_started") return [outcome.reason];
  return outcome.errors;
}

const CELL_CLASS = "px-3 py-3 align-top";

interface ComparisonTableProps {
  sourceWorkspaceId: string;
  initialSummary: ComparisonSummary | null;
  initialError: string | null;
  initialNotes: CompareRowNotes;
}

export function ComparisonTable({
  sourceWorkspaceId,
  initialSummary,
  initialError,
  initialNotes,
}: ComparisonTableProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<ComparisonSummary | null>(initialSummary);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [failedForks, setFailedForks] = useState<readonly FailedForkRow[]>(initialNotes.failedForks);
  const [startNotes, setStartNotes] = useState(initialNotes.startNotes);
  const [rowMessages, setRowMessages] = useState<Record<string, string[]>>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});
  const busyRef = useRef(new Set<string>());
  const [pollStoppedMessage, setPollStoppedMessage] = useState<string | null>(null);
  const [pollGeneration, setPollGeneration] = useState(0);
  // Every summary read takes a number; only the newest one is applied, so a slow poll answer never
  // replaces the state an action has just read.
  const summaryRequestRef = useRef(0);
  const hasNoteChangeRef = useRef(false);

  const shouldPoll = summary !== null && summary.members.some(isJobOpenOrUnknown) && pollStoppedMessage === null;

  // Keeps the `rows` parameter in step with the rows still failed, so a reload shows the same view.
  useEffect(() => {
    if (!hasNoteChangeRef.current) return;
    router.replace(comparisonHref(sourceWorkspaceId, { failedForks: [...failedForks], startNotes }), {
      scroll: false,
    });
  }, [failedForks, startNotes, router, sourceWorkspaceId]);

  // ADR-040: read-only polling while a member has an open (or unknown) job. It only reads the summary;
  // nothing here can start or retry an analysis.
  useEffect(() => {
    if (!shouldPoll) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let failures = 0;

    async function poll() {
      const request = ++summaryRequestRef.current;
      const result = await readComparison(sourceWorkspaceId);
      if (cancelled) return;
      if (request !== summaryRequestRef.current) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        return;
      }
      if (!result.ok) {
        failures += 1;
        if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setPollStoppedMessage(`Refreshing stopped: ${result.errors.join("; ")}`);
          return;
        }
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        return;
      }
      failures = 0;
      attempts += 1;
      setSummary(result.data);
      if (!result.data.members.some(isJobOpenOrUnknown)) return;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setPollStoppedMessage("Refreshing stopped after 30 minutes. Reload to check again.");
        return;
      }
      timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldPoll, sourceWorkspaceId, pollGeneration]);

  async function refreshSummary() {
    const request = ++summaryRequestRef.current;
    const result = await readComparison(sourceWorkspaceId);
    if (request !== summaryRequestRef.current) return;
    if (result.ok) {
      setSummary(result.data);
      setLoadError(null);
      setPollStoppedMessage(null);
      setPollGeneration((generation) => generation + 1);
    } else {
      setLoadError(result.errors.join("; "));
    }
  }

  async function runRowAction(rowId: string, action: () => Promise<string[]>) {
    if (busyRef.current.has(rowId)) return;
    busyRef.current.add(rowId);
    setBusyRows((previous) => ({ ...previous, [rowId]: true }));
    try {
      const messages = await action();
      setRowMessages((previous) => ({ ...previous, [rowId]: messages }));
      await refreshSummary();
    } finally {
      busyRef.current.delete(rowId);
      setBusyRows((previous) => ({ ...previous, [rowId]: false }));
    }
  }

  function handleStart(member: ComparisonMember, expected: "start" | "run_again") {
    void runRowAction(member.workspaceId, async () =>
      outcomeMessages(await startMemberAnalysis(member.workspaceId, expected, COMPARE_API)),
    );
  }

  // Re-sends the stored request key and options (INV-6): a fork the first request created is
  // returned, not duplicated. Its analysis then starts only when it is idle.
  function handleRetryFork(row: FailedForkRow) {
    const rowId = row.request.requestKey;
    void runRowAction(rowId, async () => {
      const outcome = await runCompareRow(sourceWorkspaceId, row.request, COMPARE_API);
      if (outcome.kind === "fork_failed") return outcome.errors;
      setFailedForks((previous) => previous.filter((item) => item.request.requestKey !== rowId));
      if (outcome.kind !== "started") {
        // The detailed reason stays in memory; the URL keeps only the note kind (INV-9).
        const { forkId } = outcome;
        setRowMessages((previous) => ({ ...previous, [forkId]: outcomeMessages(outcome) }));
        setStartNotes((previous) => [...previous, { forkId, kind: outcome.kind }]);
      }
      hasNoteChangeRef.current = true;
      return [];
    });
  }

  if (summary === null) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          The comparison could not be loaded: {loadError ?? "unknown error"}
        </p>
        <div>
          <button
            type="button"
            onClick={() => void refreshSummary()}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${buttonKindClasses.secondary}`}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const startNoteById = new Map(startNotes.map((note) => [note.forkId, START_NOTE_TEXT[note.kind]]));
  const estimateCurrency = summary.members[0]?.totals.estimate.currency ?? "USD";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <InputEquality summary={summary} />

      {(pollStoppedMessage || loadError) && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-amber-800 dark:text-amber-300">
          <span role="status">{pollStoppedMessage ?? `The comparison could not be refreshed: ${loadError}`}</span>
          <button
            type="button"
            onClick={() => void refreshSummary()}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${buttonKindClasses.secondary}`}
          >
            Refresh
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs text-zinc-700 dark:text-zinc-300">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Workspace</th>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Status</th>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Recommendation</th>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Policy</th>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Measured usage</th>
              <th scope="col" className={`${CELL_CLASS} font-semibold`}>Estimated cost ({estimateCurrency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {summary.members.map((member) => {
              const isFork = member.forkedFromWorkspaceId !== null;
              const action = memberAnalysisAction(member);
              const jobLabel = JOB_STATE_LABEL[member.activeJob.state];
              const messages = [
                ...(startNoteById.has(member.workspaceId) && (action.kind === "start" || member.activeJob.state === UNKNOWN_JOB_STATE)
                  ? [startNoteById.get(member.workspaceId) as string]
                  : []),
                ...(rowMessages[member.workspaceId] ?? []),
              ];
              const isBusy = busyRows[member.workspaceId] === true;
              return (
                <tr key={member.workspaceId} data-member={member.workspaceId}>
                  <th scope="row" className={`${CELL_CLASS} font-normal`}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-black dark:text-zinc-50">
                        {STRATEGY_LABEL[member.analysisStrategy] ?? member.analysisStrategy}
                        {!isFork && <span className="ml-1.5 text-xs font-normal text-zinc-500">(source)</span>}
                      </span>
                      {member.analysisStrategy !== "legacy" && (
                        <span>
                          Context: {member.contextLayout} / {member.contextSourceSet}
                        </span>
                      )}
                      {member.carryOverRequirements && (
                        <span className="w-fit rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          01a carried over
                        </span>
                      )}
                      <span className="break-all font-mono text-[11px] text-zinc-400">{member.workspaceSlug}</span>
                      <Link
                        href={`/workspaces/${encodeURIComponent(member.workspaceId)}`}
                        className="w-fit font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
                      >
                        Open workspace
                      </Link>
                    </div>
                  </th>
                  <td className={CELL_CLASS}>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-black dark:text-zinc-50">{statusLabel(member.status)}</span>
                      {jobLabel && <span>{jobLabel}</span>}
                      {member.lastStepError?.message && (
                        <span className="text-red-600 dark:text-red-400">{member.lastStepError.message}</span>
                      )}
                      <div role="status" className="flex flex-col gap-1">
                        {messages.map((message, index) => (
                          <span key={index} className="text-amber-800 dark:text-amber-300">
                            {message}
                          </span>
                        ))}
                      </div>
                      {isFork && action.kind === "start" && (
                        <RowActionButton
                          label="Start analysis"
                          isBusy={isBusy}
                          onClick={() => handleStart(member, "start")}
                        />
                      )}
                      {isFork && action.kind === "run_again" && (
                        <RowActionButton
                          label="Run again"
                          isBusy={isBusy}
                          onClick={() => handleStart(member, "run_again")}
                        />
                      )}
                    </div>
                  </td>
                  <td className={CELL_CLASS}>
                    <Recommendation member={member} />
                  </td>
                  <td className={CELL_CLASS}>
                    <PolicyCell member={member} />
                  </td>
                  <td className={CELL_CLASS}>
                    <MeasuredUsage member={member} />
                  </td>
                  <td className={CELL_CLASS}>
                    <CostCell member={member} />
                  </td>
                </tr>
              );
            })}
            {failedForks.map((row) => {
              const rowId = row.request.requestKey;
              const isBusy = busyRows[rowId] === true;
              return (
                <tr key={rowId} data-failed-fork={rowId}>
                  <th scope="row" className={`${CELL_CLASS} font-normal`}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-black dark:text-zinc-50">
                        {STRATEGY_LABEL[row.request.analysisStrategy]}
                      </span>
                      {row.request.analysisStrategy !== "legacy" && (
                        <span>
                          Context: {row.request.contextLayout} / {row.request.contextSourceSet}
                        </span>
                      )}
                      {row.request.carryOverRequirements && <span>01a carry-over requested</span>}
                    </div>
                  </th>
                  <td className={CELL_CLASS} colSpan={5}>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-red-700 dark:text-red-400">Fork failed</span>
                      <span className="text-red-600 dark:text-red-400">{row.message}</span>
                      <div role="status" className="flex flex-col gap-1">
                        {(rowMessages[rowId] ?? []).map((message, index) => (
                          <span key={index} className="text-red-600 dark:text-red-400">
                            {message}
                          </span>
                        ))}
                      </div>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        If the request reached the server, its fork may already be listed above: Retry fork
                        re-sends the same request key and returns that fork instead of creating another.
                      </span>
                      <RowActionButton label="Retry fork" isBusy={isBusy} onClick={() => handleRetryFork(row)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Measured usage comes from the provider&apos;s recorded usage; the estimate applies list prices to it
        and is not an invoiced amount. Approve, override and CV generation stay on each workspace&apos;s own
        page.
      </p>
    </div>
  );
}
