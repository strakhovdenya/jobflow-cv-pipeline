import type {
  AnalysisStrategy,
  ComparisonMember,
  ComparisonSummary,
  ContextLayout,
  ContextSourceSet,
  EnqueueAiStepResult,
  ForkWorkspaceInput,
  ForkWorkspaceResult,
} from "@/lib/api";
import type { ActionResult } from "./actions";

/**
 * The compare run of ISSUE-717: per selected strategy a fork (ADR-046 item 8), then the existing
 * run-analysis call, only for an idle fork. Pure: the API calls are injected, so the dialog, the
 * comparison view and the tests share one implementation. Request keys are never created here
 * (INV-6) — they come with the request.
 */

export interface StrategyOption {
  strategy: AnalysisStrategy;
  label: string;
  description: string;
}

export const STRATEGY_OPTIONS: readonly StrategyOption[] = [
  { strategy: "legacy", label: "Legacy", description: "Original analysis pipeline" },
  { strategy: "b", label: "Strategy B", description: "Combined structured analysis" },
  {
    strategy: "c",
    label: "Strategy C",
    description: "Vacancy requirement extraction followed by candidate fit assessment",
  },
];

export const STRATEGY_LABEL: Record<AnalysisStrategy, string> = {
  legacy: "Legacy",
  b: "Strategy B",
  c: "Strategy C",
};

// A display constant (INV-4): what one analysis of the strategy is expected to call. Not a limit —
// the runner runs a carried-over X1 again when its identity, hash or contract no longer passes.
const EXPECTED_PAID_CALLS: Record<AnalysisStrategy, number> = { legacy: 1, b: 1, c: 2 };
const C_CARRY_OVER_PAID_CALLS = 1;

export function expectedPaidCalls(
  request: Pick<ForkWorkspaceInput, "analysisStrategy" | "carryOverRequirements">,
): number {
  if (request.analysisStrategy === "c" && request.carryOverRequirements) {
    return C_CARRY_OVER_PAID_CALLS;
  }
  return EXPECTED_PAID_CALLS[request.analysisStrategy];
}

export const DEFAULT_CONTEXT_LAYOUT: ContextLayout = "single";
export const DEFAULT_CONTEXT_SOURCE_SET: ContextSourceSet = "full";
export const CONTEXT_LAYOUTS: readonly ContextLayout[] = ["single", "boundary"];
export const CONTEXT_SOURCE_SETS: readonly ContextSourceSet[] = ["full", "assessment"];

const REQUIREMENTS_ARTIFACT_TYPE = "vacancy_requirements_json";

// Offered for a `c` source with a latest `01a`; the API stays the authority and may still refuse
// (for example a carried `01a` of a fork), which shows as that row's fork error.
export function canOfferCarryOver(
  analysisStrategy: string | null | undefined,
  artifacts: ReadonlyArray<{ artifactType: string; isLatest: boolean }>,
): boolean {
  return (
    analysisStrategy === "c" &&
    artifacts.some((artifact) => artifact.artifactType === REQUIREMENTS_ARTIFACT_TYPE && artifact.isLatest)
  );
}

// ---------- the idle-fork rule (INV-8) ----------

const NO_ACTIVE_JOB = "none";
const UNKNOWN_JOB_STATE = "unknown";
const START_STATUS = "source_saved";

export type MemberAnalysisAction =
  | { kind: "start" }
  | { kind: "run_again" }
  | { kind: "none"; reason: string };

/**
 * What may be started for a member, read only from the comparison summary: `activeJob.state` tells
 * "no job" (`none`) apart from "the queue cannot be read" (`unknown`), which the workspace detail
 * does not. A member with a recorded analysis run has been tried before: starting it again is a new
 * paid attempt, so it is only ever "Run again", never part of a compare run.
 */
export function memberAnalysisAction(member: ComparisonMember): MemberAnalysisAction {
  if (member.status !== START_STATUS) {
    return { kind: "none", reason: `The workspace is at "${member.status}", not at "${START_STATUS}".` };
  }
  if (member.activeJob.state === UNKNOWN_JOB_STATE) {
    return { kind: "none", reason: "The queue state is unknown, so nothing was started. Reload to check." };
  }
  if (member.activeJob.state !== NO_ACTIVE_JOB) {
    return { kind: "none", reason: "An analysis job is already open for this workspace." };
  }
  const hasAnalysisRun = member.stages.some((stage) => stage.promptRunCount > 0);
  return hasAnalysisRun ? { kind: "run_again" } : { kind: "start" };
}

export function isJobOpenOrUnknown(member: ComparisonMember): boolean {
  return member.activeJob.state !== NO_ACTIVE_JOB;
}

// ---------- the compare run ----------

export interface CompareApi {
  fork: (sourceId: string, input: ForkWorkspaceInput) => Promise<ActionResult<ForkWorkspaceResult>>;
  getComparison: (workspaceId: string) => Promise<ActionResult<ComparisonSummary>>;
  startAnalysis: (workspaceId: string) => Promise<ActionResult<EnqueueAiStepResult>>;
}

export type StartOutcome =
  | { kind: "started"; jobId: string }
  | { kind: "not_started"; reason: string }
  | { kind: "start_failed"; errors: string[] };

export type CompareRowOutcome =
  | { kind: "fork_failed"; request: ForkWorkspaceInput; errors: string[] }
  | ({ request: ForkWorkspaceInput; forkId: string } & StartOutcome);

// A server action can reject (network loss, a lost response); that is the row's failure, never a
// reason to stop the other rows.
async function settle<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The request failed";
    return { ok: false, errors: [message] };
  }
}

/**
 * Re-reads the member and starts its analysis only while it still allows `expected`. Used by the
 * compare run (`start`) and by the comparison view's explicit "Start analysis" / "Run again".
 */
export async function startMemberAnalysis(
  workspaceId: string,
  expected: "start" | "run_again",
  api: Pick<CompareApi, "getComparison" | "startAnalysis">,
): Promise<StartOutcome> {
  const summary = await settle(() => api.getComparison(workspaceId));
  if (!summary.ok) {
    return { kind: "start_failed", errors: ["The current state could not be read.", ...summary.errors] };
  }
  const member = summary.data.members.find((item) => item.workspaceId === workspaceId);
  if (!member) {
    return { kind: "not_started", reason: "The workspace is not part of the comparison." };
  }
  const action = memberAnalysisAction(member);
  if (action.kind === "none") return { kind: "not_started", reason: action.reason };
  if (action.kind !== expected) {
    return { kind: "not_started", reason: "The state of the workspace changed; nothing was started." };
  }
  const started = await settle(() => api.startAnalysis(workspaceId));
  return started.ok
    ? { kind: "started", jobId: started.data.jobId }
    : { kind: "start_failed", errors: started.errors };
}

export async function runCompareRow(
  sourceId: string,
  request: ForkWorkspaceInput,
  api: CompareApi,
): Promise<CompareRowOutcome> {
  const fork = await settle(() => api.fork(sourceId, request));
  if (!fork.ok) return { kind: "fork_failed", request, errors: fork.errors };
  const forkId = fork.data.id;
  const start = await startMemberAnalysis(forkId, "start", api);
  return { ...start, request, forkId };
}

// Every row runs on its own; the result keeps the order of the requests.
export function runCompareStrategies(
  sourceId: string,
  requests: readonly ForkWorkspaceInput[],
  api: CompareApi,
): Promise<CompareRowOutcome[]> {
  return Promise.all(requests.map((request) => runCompareRow(sourceId, request, api)));
}

// ---------- the failed rows carried to the comparison view (INV-9) ----------

// The URL carries no backend or network text: such a message can name an internal host, a path or
// validated content, so it stays in memory only. The parameter holds the request (enum values and a
// UUID) with an allowlisted safe error text, and start notes as a fork id and a fixed note kind.
export interface FailedForkRow {
  request: ForkWorkspaceInput;
  // always one of SAFE_FORK_ERROR_TEXTS
  message: string;
}

export type StartNoteKind = "start_failed" | "not_started";

export interface StartNote {
  forkId: string;
  kind: StartNoteKind;
}

export interface CompareRowNotes {
  failedForks: FailedForkRow[];
  startNotes: StartNote[];
}

export const FAILED_FORK_TEXT =
  "The fork request failed before a workspace was confirmed. Retry fork re-sends the same request.";

export const START_NOTE_TEXT: Record<StartNoteKind, string> = {
  start_failed: "The analysis start request failed; nothing was started by the compare run.",
  not_started: "The compare run did not start this analysis; the state above shows why.",
};

const START_NOTE_KINDS: readonly string[] = Object.keys(START_NOTE_TEXT);
const SAFE_FORK_ERROR_TEXTS: readonly string[] = [FAILED_FORK_TEXT];

// Any text that is not an allowlisted safe text is replaced, on encoding and on decoding.
const safeForkError = (text: unknown): string =>
  typeof text === "string" && SAFE_FORK_ERROR_TEXTS.includes(text) ? text : FAILED_FORK_TEXT;

export const ROWS_PARAM = "rows";
const MAX_PARAM_LENGTH = 8000;
const MAX_ROWS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORKSPACE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const STRATEGIES: readonly string[] = STRATEGY_OPTIONS.map((option) => option.strategy);

export function notesFromOutcomes(outcomes: readonly CompareRowOutcome[]): CompareRowNotes {
  const failedForks: FailedForkRow[] = [];
  const startNotes: StartNote[] = [];
  for (const outcome of outcomes) {
    if (outcome.kind === "fork_failed") {
      failedForks.push({ request: outcome.request, message: FAILED_FORK_TEXT });
    } else if (outcome.kind === "start_failed" || outcome.kind === "not_started") {
      startNotes.push({ forkId: outcome.forkId, kind: outcome.kind });
    }
  }
  return { failedForks, startNotes };
}

function toBase64Url(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// Writes only the allowlisted fields, whatever else the objects carry.
export function encodeRowNotes(notes: CompareRowNotes): string {
  const payload: CompareRowNotes = {
    failedForks: notes.failedForks.map(({ request, message }) => ({
      message: safeForkError(message),
      request: {
        analysisStrategy: request.analysisStrategy,
        contextLayout: request.contextLayout,
        contextSourceSet: request.contextSourceSet,
        carryOverRequirements: request.carryOverRequirements,
        requestKey: request.requestKey,
      },
    })),
    startNotes: notes.startNotes.map(({ forkId, kind }) => ({ forkId, kind })),
  };
  return toBase64Url(JSON.stringify(payload));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseRequest(value: unknown): ForkWorkspaceInput | null {
  if (!isRecord(value)) return null;
  const { analysisStrategy, contextLayout, contextSourceSet, carryOverRequirements, requestKey } = value;
  if (typeof analysisStrategy !== "string" || !STRATEGIES.includes(analysisStrategy)) return null;
  if (typeof contextLayout !== "string" || !(CONTEXT_LAYOUTS as readonly string[]).includes(contextLayout)) {
    return null;
  }
  const sourceSets = CONTEXT_SOURCE_SETS as readonly string[];
  if (typeof contextSourceSet !== "string" || !sourceSets.includes(contextSourceSet)) return null;
  if (typeof carryOverRequirements !== "boolean") return null;
  if (carryOverRequirements && analysisStrategy !== "c") return null;
  if (typeof requestKey !== "string" || !UUID.test(requestKey)) return null;
  return {
    analysisStrategy: analysisStrategy as AnalysisStrategy,
    contextLayout: contextLayout as ContextLayout,
    contextSourceSet: contextSourceSet as ContextSourceSet,
    carryOverRequirements,
    requestKey,
  };
}

function parseFailedFork(value: unknown): FailedForkRow | null {
  if (!isRecord(value)) return null;
  const request = parseRequest(value.request);
  return request ? { request, message: safeForkError(value.message) } : null;
}

function parseStartNote(value: unknown): StartNote | null {
  if (!isRecord(value)) return null;
  const { forkId, kind } = value;
  if (typeof forkId !== "string" || !WORKSPACE_ID.test(forkId)) return null;
  if (typeof kind !== "string" || !START_NOTE_KINDS.includes(kind)) return null;
  return { forkId, kind: kind as StartNoteKind };
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const item of value.slice(0, MAX_ROWS)) {
    const parsed = parse(item);
    if (parsed !== null) items.push(parsed);
  }
  return items;
}

const EMPTY_NOTES: CompareRowNotes = { failedForks: [], startNotes: [] };

/** The `rows` search parameter is untrusted: only valid rows survive, anything else is dropped. */
export function decodeRowNotes(param: string | string[] | undefined): CompareRowNotes {
  if (typeof param !== "string" || param.length === 0 || param.length > MAX_PARAM_LENGTH) {
    return EMPTY_NOTES;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(param));
  } catch {
    return EMPTY_NOTES;
  }
  if (!isRecord(parsed)) return EMPTY_NOTES;
  const failedForks = parseList(parsed.failedForks, parseFailedFork);
  const seenKeys = new Set<string>();
  const uniqueForks = failedForks.filter((row) => {
    if (seenKeys.has(row.request.requestKey)) return false;
    seenKeys.add(row.request.requestKey);
    return true;
  });
  return { failedForks: uniqueForks, startNotes: parseList(parsed.startNotes, parseStartNote) };
}

export function comparisonHref(sourceId: string, notes: CompareRowNotes): string {
  const path = `/workspaces/${encodeURIComponent(sourceId)}/comparison`;
  const hasNotes = notes.failedForks.length > 0 || notes.startNotes.length > 0;
  return hasNotes ? `${path}?${ROWS_PARAM}=${encodeRowNotes(notes)}` : path;
}
