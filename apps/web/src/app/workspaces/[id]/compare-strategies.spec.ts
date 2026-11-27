import { describe, expect, it, vi, type Mock } from "vitest";
import type {
  ComparisonMember,
  ComparisonSummary,
  CostEstimate,
  ForkWorkspaceInput,
  UsageBreakdown,
} from "@/lib/api";
import {
  ROWS_PARAM,
  canOfferCarryOver,
  comparisonHref,
  decodeRowNotes,
  encodeRowNotes,
  expectedPaidCalls,
  memberAnalysisAction,
  notesFromOutcomes,
  runCompareStrategies,
  type CompareApi,
} from "./compare-strategies";

const KEYS = {
  legacy: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  c: "33333333-3333-4333-8333-333333333333",
};

const request = (
  analysisStrategy: ForkWorkspaceInput["analysisStrategy"],
  overrides: Partial<ForkWorkspaceInput> = {},
): ForkWorkspaceInput => ({
  analysisStrategy,
  contextLayout: "single",
  contextSourceSet: "full",
  carryOverRequirements: false,
  requestKey: KEYS[analysisStrategy],
  ...overrides,
});

const THREE_ROWS = [request("legacy"), request("b"), request("c")];

// Builds a `rows` parameter from any value, as a tampered URL could.
function rawEncode(value: unknown): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(JSON.stringify(value))) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64UrlForTest(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

const NO_USAGE: UsageBreakdown = {
  isMeasured: false,
  inputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
};
const NO_ESTIMATE: CostEstimate = {
  isEstimate: true,
  label: "list-price estimate, not an invoice",
  currency: "USD",
  pricingVersion: "2026-11-27",
  amount: null,
  reason: "no provider call",
};

function member(workspaceId: string, overrides: Partial<ComparisonMember> = {}): ComparisonMember {
  return {
    workspaceId,
    workspaceSlug: `slug_${workspaceId}`,
    isRequested: true,
    isGroupRoot: false,
    forkedFromWorkspaceId: "source",
    analysisStrategy: "b",
    contextLayout: "single",
    contextSourceSet: "full",
    carryOverRequirements: false,
    status: "source_saved",
    isArchived: false,
    activeJob: { state: "none", jobId: null, step: null },
    lastStepError: null,
    currentDecision: null,
    originalDecision: null,
    score: null,
    analysisPolicy: null,
    stages: [],
    totals: {
      callCount: 0,
      failedCallCount: 0,
      unmeasuredCallCount: 0,
      durationMs: 0,
      usage: NO_USAGE,
      estimate: NO_ESTIMATE,
    },
    ...overrides,
  };
}

const summaryOf = (...members: ComparisonMember[]): ComparisonSummary => ({
  workspaceId: members[0]?.workspaceId ?? "source",
  comparisonGroupId: "source",
  members,
  inputEquality: {
    vacancyHash: { isEqual: true, unrecordedWorkspaceIds: [] },
    companyAndRole: { isEqual: true, unrecordedWorkspaceIds: [] },
    notes: { isEqual: true, unrecordedWorkspaceIds: [] },
    snapshot: { isEqual: true, unrecordedWorkspaceIds: [] },
    model: { isEqual: true, unrecordedWorkspaceIds: [] },
  },
});

const forkIdOf = (input: ForkWorkspaceInput) => `fork-${input.analysisStrategy}`;

// A fake API: every fork returns an idle fork unless a test overrides a call.
type MockApi = { [K in keyof CompareApi]: Mock<CompareApi[K]> };

function fakeApi(overrides: Partial<MockApi> = {}): MockApi {
  const api = {
    fork: vi.fn<CompareApi["fork"]>(async (_sourceId, input) => ({
      ok: true as const,
      data: {
        id: forkIdOf(input),
        isNew: true,
        status: "source_saved",
        workspaceSlug: `slug_${forkIdOf(input)}`,
        forkedFromWorkspaceId: "source",
        comparisonGroupId: "source",
        analysisStrategy: input.analysisStrategy,
        contextLayout: input.contextLayout,
        contextSourceSet: input.contextSourceSet,
        carryOverRequirements: input.carryOverRequirements,
        requestKey: input.requestKey,
        vacancyTextHash: "hash",
        createdAt: "2026-11-27T00:00:00.000Z",
      },
    })),
    getComparison: vi.fn<CompareApi["getComparison"]>(async (workspaceId) => ({
      ok: true as const,
      data: summaryOf(member(workspaceId)),
    })),
    startAnalysis: vi.fn<CompareApi["startAnalysis"]>(async (workspaceId) => ({
      ok: true as const,
      data: { jobId: `job-${workspaceId}` },
    })),
    ...overrides,
  };
  return api;
}

describe("expected paid calls and carry-over eligibility", () => {
  it("is a display constant per strategy", () => {
    expect(expectedPaidCalls(request("legacy"))).toBe(1);
    expect(expectedPaidCalls(request("b"))).toBe(1);
    expect(expectedPaidCalls(request("c"))).toBe(2);
    expect(expectedPaidCalls(request("c", { carryOverRequirements: true }))).toBe(1);
  });

  it("offers carry-over only for a c source with a latest 01a", () => {
    const latest01a = [{ artifactType: "vacancy_requirements_json", isLatest: true }];
    expect(canOfferCarryOver("c", latest01a)).toBe(true);
    expect(canOfferCarryOver("b", latest01a)).toBe(false);
    expect(canOfferCarryOver("legacy", latest01a)).toBe(false);
    expect(canOfferCarryOver("c", [{ artifactType: "vacancy_requirements_json", isLatest: false }])).toBe(false);
    expect(canOfferCarryOver("c", [])).toBe(false);
  });
});

describe("runCompareStrategies", () => {
  it("forks and starts each row independently", async () => {
    const api = fakeApi();
    const outcomes = await runCompareStrategies("source", THREE_ROWS, api);

    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["started", "started", "started"]);
    expect(api.fork.mock.calls.map((call) => call[1].requestKey)).toEqual([KEYS.legacy, KEYS.b, KEYS.c]);
    expect(api.startAnalysis.mock.calls.map((call) => call[0]).sort()).toEqual(
      ["fork-b", "fork-c", "fork-legacy"],
    );
    // The state is read from the fork's own comparison member before each start.
    expect(api.getComparison.mock.calls.map((call) => call[0]).sort()).toEqual(
      ["fork-b", "fork-c", "fork-legacy"],
    );

    // One fork answers an error, one fork call rejects (a lost response), one start rejects:
    // the remaining row is still forked and started.
    const failing = fakeApi({
      fork: vi.fn<CompareApi["fork"]>(async (sourceId, input) => {
        if (input.analysisStrategy === "legacy") return { ok: false, errors: ["409 conflict"] };
        if (input.analysisStrategy === "b") throw new Error("network down");
        return fakeApi().fork(sourceId, input);
      }),
    });
    const mixed = await runCompareStrategies("source", THREE_ROWS, failing);
    expect(mixed[0]).toMatchObject({ kind: "fork_failed", errors: ["409 conflict"] });
    expect(mixed[1]).toMatchObject({ kind: "fork_failed", errors: ["network down"] });
    expect(mixed[2]).toMatchObject({ kind: "started", forkId: "fork-c", jobId: "job-fork-c" });
    expect(failing.startAnalysis).toHaveBeenCalledTimes(1);

    const startRejects = fakeApi({
      startAnalysis: vi.fn<CompareApi["startAnalysis"]>(async (workspaceId) => {
        if (workspaceId === "fork-b") throw new Error("timeout");
        return { ok: true, data: { jobId: `job-${workspaceId}` } };
      }),
    });
    const partial = await runCompareStrategies("source", THREE_ROWS, startRejects);
    expect(partial.map((outcome) => outcome.kind)).toEqual(["started", "start_failed", "started"]);
    expect(partial[1]).toMatchObject({ forkId: "fork-b", errors: ["timeout"] });
  });

  it("does not start a fork that is already running or analysed", async () => {
    const states: Record<string, Partial<ComparisonMember>> = {
      "fork-legacy": { status: "paused_after_analysis" },
      "fork-b": { activeJob: { state: "active", jobId: "job-x", step: "prompt_1" } },
      "fork-c": { activeJob: { state: "unknown", jobId: null, step: null } },
    };
    const api = fakeApi({
      getComparison: vi.fn<CompareApi["getComparison"]>(async (workspaceId) => ({
        ok: true,
        data: summaryOf(member(workspaceId, states[workspaceId])),
      })),
    });
    const outcomes = await runCompareStrategies("source", THREE_ROWS, api);

    expect(api.startAnalysis).not.toHaveBeenCalled();
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["not_started", "not_started", "not_started"]);
    expect(outcomes[0]).toMatchObject({ reason: expect.stringContaining("paused_after_analysis") });
    expect(outcomes[1]).toMatchObject({ reason: expect.stringContaining("already open") });
    expect(outcomes[2]).toMatchObject({ reason: expect.stringContaining("queue state is unknown") });

    // A replayed fork whose analysis ran and rolled back is not paid for again by a compare run.
    const failedBefore = fakeApi({
      fork: vi.fn<CompareApi["fork"]>(async (sourceId, input) => {
        const result = await fakeApi().fork(sourceId, input);
        return result.ok ? { ok: true, data: { ...result.data, isNew: false } } : result;
      }),
      getComparison: vi.fn<CompareApi["getComparison"]>(async (workspaceId) => ({
        ok: true,
        data: summaryOf(
          member(workspaceId, {
            lastStepError: { step: "prompt_1", message: "X2 failed", at: null },
            stages: [
              {
                stepKey: "analysis_b",
                isCarriedOver: false,
                carriedOverFromWorkspaceId: null,
                promptRunCount: 1,
                callCount: 1,
                failedCallCount: 1,
                unmeasuredCallCount: 1,
                durationMs: 1000,
                models: ["fake/fake"],
                usage: NO_USAGE,
                estimate: NO_ESTIMATE,
              },
            ],
          }),
        ),
      })),
    });
    const replayed = await runCompareStrategies("source", [request("b")], failedBefore);
    expect(replayed[0].kind).toBe("not_started");
    expect(failedBefore.startAnalysis).not.toHaveBeenCalled();

    // A state that cannot be read is a failed start, not a permission to start.
    const unreadable = fakeApi({
      getComparison: vi.fn<CompareApi["getComparison"]>(async () => ({ ok: false, errors: ["503"] })),
    });
    const [outcome] = await runCompareStrategies("source", [request("b")], unreadable);
    expect(outcome.kind).toBe("start_failed");
    expect(unreadable.startAnalysis).not.toHaveBeenCalled();
  });

  it("starts a carry-over fork whose carried X1 row made no call", () => {
    const carried = member("fork-c", {
      analysisStrategy: "c",
      carryOverRequirements: true,
      stages: [
        {
          stepKey: "analysis_x1",
          isCarriedOver: true,
          carriedOverFromWorkspaceId: "source",
          promptRunCount: 0,
          callCount: 0,
          failedCallCount: 0,
          unmeasuredCallCount: 0,
          durationMs: 0,
          models: [],
          usage: NO_USAGE,
          estimate: NO_ESTIMATE,
        },
      ],
    });
    expect(memberAnalysisAction(carried)).toEqual({ kind: "start" });
  });

  it("reuses request keys on resubmission", async () => {
    const api = fakeApi({
      fork: vi.fn<CompareApi["fork"]>(async () => ({ ok: false, errors: ["unreachable"] })),
    });
    const rows = [request("b", { contextLayout: "boundary" }), request("c", { carryOverRequirements: true })];
    await runCompareStrategies("source", rows, api);
    await runCompareStrategies("source", rows, api);

    const sent = api.fork.mock.calls.map((call) => call[1]);
    expect(sent).toHaveLength(4);
    expect(sent.slice(2)).toEqual(sent.slice(0, 2));
    expect(sent.map((input) => input.requestKey)).toEqual([KEYS.b, KEYS.c, KEYS.b, KEYS.c]);
  });

  it("reports start failures after successful forks", async () => {
    const api = fakeApi({
      startAnalysis: vi.fn<CompareApi["startAnalysis"]>(async () => ({
        ok: false,
        errors: ["Too many requests"],
      })),
    });
    const outcomes = await runCompareStrategies("source", THREE_ROWS, api);

    expect(api.fork).toHaveBeenCalledTimes(3);
    expect(outcomes).toEqual([
      expect.objectContaining({ kind: "start_failed", forkId: "fork-legacy", errors: ["Too many requests"] }),
      expect.objectContaining({ kind: "start_failed", forkId: "fork-b", errors: ["Too many requests"] }),
      expect.objectContaining({ kind: "start_failed", forkId: "fork-c", errors: ["Too many requests"] }),
    ]);
  });
});

describe("failed-row notes in the comparison URL", () => {
  it("round-trips the failed rows and start notes", () => {
    const notes = notesFromOutcomes([
      { kind: "fork_failed", request: request("c", { carryOverRequirements: true }), errors: ["Bad", "Request"] },
      { kind: "start_failed", request: request("b"), forkId: "fork-b", errors: ["Throttled"] },
      { kind: "not_started", request: request("legacy"), forkId: "fork-legacy", reason: "queue unknown" },
      { kind: "started", request: request("c"), forkId: "fork-c", jobId: "job-1" },
    ]);
    expect(notes.failedForks).toEqual([{ request: request("c", { carryOverRequirements: true }) }]);
    expect(notes.startNotes).toEqual([
      { forkId: "fork-b", kind: "start_failed" },
      { forkId: "fork-legacy", kind: "not_started" },
    ]);

    const href = comparisonHref("source", notes);
    const param = new URL(href, "http://localhost").searchParams.get(ROWS_PARAM);
    expect(href.startsWith("/workspaces/source/comparison?rows=")).toBe(true);
    expect(decodeRowNotes(param ?? undefined)).toEqual(notes);
    expect(comparisonHref("source", { failedForks: [], startNotes: [] })).toBe("/workspaces/source/comparison");
  });

  it("keeps backend and network error text out of the URL", () => {
    const secret = "connect ECONNREFUSED 10.0.0.5:3000 /internal/path vacancy text";
    const notes = notesFromOutcomes([
      { kind: "fork_failed", request: request("b"), errors: [secret] },
      { kind: "start_failed", request: request("c"), forkId: "fork-c", errors: [secret] },
      { kind: "not_started", request: request("legacy"), forkId: "fork-legacy", reason: secret },
    ]);
    // Extra fields smuggled onto the objects are not written either.
    const smuggled = {
      failedForks: notes.failedForks.map((row) => ({ ...row, message: secret })),
      startNotes: notes.startNotes.map((note) => ({ ...note, message: secret })),
    };
    for (const encoded of [encodeRowNotes(notes), encodeRowNotes(smuggled)]) {
      const json = fromBase64UrlForTest(encoded);
      expect(json).not.toContain("ECONNREFUSED");
      expect(json).not.toContain("message");
      expect(JSON.parse(json)).toEqual({
        failedForks: [{ request: request("b") }],
        startNotes: [
          { forkId: "fork-c", kind: "start_failed" },
          { forkId: "fork-legacy", kind: "not_started" },
        ],
      });
    }
    // A hand-made parameter with text decodes to the fixed kinds only.
    const decoded = decodeRowNotes(
      rawEncode({
        failedForks: [{ request: request("b"), message: secret }],
        startNotes: [{ forkId: "fork-c", kind: "start_failed", message: secret }],
      }),
    );
    expect(JSON.stringify(decoded)).not.toContain("ECONNREFUSED");
    expect(decoded).toEqual({
      failedForks: [{ request: request("b") }],
      startNotes: [{ forkId: "fork-c", kind: "start_failed" }],
    });
  });

  it("drops malformed failed rows", () => {
    const valid = { request: request("b") };

    expect(decodeRowNotes(undefined)).toEqual({ failedForks: [], startNotes: [] });
    expect(decodeRowNotes(["a", "b"])).toEqual({ failedForks: [], startNotes: [] });
    expect(decodeRowNotes("%%%not-base64")).toEqual({ failedForks: [], startNotes: [] });
    expect(decodeRowNotes(rawEncode("just a string"))).toEqual({ failedForks: [], startNotes: [] });
    expect(decodeRowNotes("A".repeat(9000))).toEqual({ failedForks: [], startNotes: [] });

    const tampered = decodeRowNotes(
      rawEncode({
        failedForks: [
          valid,
          { request: { ...request("b"), analysisStrategy: "d" } },
          { request: { ...request("b"), requestKey: "not-a-uuid" } },
          { request: { ...request("b"), carryOverRequirements: true } },
          { request: { ...request("b"), contextLayout: "wide" } },
          { request: request("b") },
          null,
        ],
        startNotes: [
          { forkId: "../../etc", kind: "start_failed" },
          { forkId: "fork-1", kind: "free text" },
          { forkId: "fork-2", kind: "not_started" },
        ],
      }),
    );
    expect(tampered.failedForks).toEqual([valid]);
    expect(tampered.startNotes).toEqual([{ forkId: "fork-2", kind: "not_started" }]);

    const tooMany = decodeRowNotes(
      rawEncode({
        failedForks: Array.from({ length: 20 }, (_, index) => ({
          request: request("b", { requestKey: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111` }),
        })),
        startNotes: [],
      }),
    );
    expect(tooMany.failedForks.length).toBeLessThanOrEqual(10);
  });
});
