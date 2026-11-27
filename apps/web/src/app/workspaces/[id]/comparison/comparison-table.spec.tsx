import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ComparisonMember,
  ComparisonStage,
  ComparisonSummary,
  CostEstimate,
  UsageBreakdown,
} from "@/lib/api";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: replaceMock }),
}));

vi.mock("../actions", () => ({
  forkWorkspaceAction: vi.fn(),
  getComparisonAction: vi.fn(),
  runAnalysisAction: vi.fn(),
}));

import { forkWorkspaceAction, getComparisonAction, runAnalysisAction } from "../actions";
import { FAILED_FORK_TEXT, START_NOTE_TEXT, type CompareRowNotes, type CompareRowRequest } from "../compare-strategies";
import { ComparisonTable } from "./comparison-table";

const forkMock = vi.mocked(forkWorkspaceAction);
const comparisonMock = vi.mocked(getComparisonAction);
const startMock = vi.mocked(runAnalysisAction);

const NO_USAGE: UsageBreakdown = {
  isMeasured: false,
  inputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
};
const MEASURED: UsageBreakdown = {
  isMeasured: true,
  inputTokens: 1200,
  cacheReadTokens: 300,
  cacheWriteTokens: 200,
  outputTokens: 450,
  reasoningTokens: 120,
};
const estimate = (amount: number | null, reason: string | null = null): CostEstimate => ({
  isEstimate: true,
  label: "list-price estimate, not an invoice",
  currency: "USD",
  pricingVersion: "2026-11-27",
  amount,
  reason,
});

function stage(stepKey: string, overrides: Partial<ComparisonStage> = {}): ComparisonStage {
  return {
    stepKey,
    isCarriedOver: false,
    carriedOverFromWorkspaceId: null,
    promptRunCount: 1,
    callCount: 1,
    failedCallCount: 0,
    unmeasuredCallCount: 0,
    durationMs: 4200,
    models: ["openai/gpt-6-luna"],
    usage: MEASURED,
    estimate: estimate(0.0123),
    ...overrides,
  };
}

function member(workspaceId: string, overrides: Partial<ComparisonMember> = {}): ComparisonMember {
  return {
    workspaceId,
    workspaceSlug: `slug_${workspaceId}`,
    isRequested: false,
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
      estimate: estimate(null, "no provider call"),
    },
    ...overrides,
  };
}

const EQUAL = { isEqual: true, unrecordedWorkspaceIds: [] };

function summaryOf(members: ComparisonMember[], inputEquality: Partial<ComparisonSummary["inputEquality"]> = {}) {
  return {
    workspaceId: "source",
    comparisonGroupId: "source",
    members,
    inputEquality: {
      vacancyHash: EQUAL,
      companyAndRole: EQUAL,
      notes: EQUAL,
      snapshot: EQUAL,
      model: EQUAL,
      ...inputEquality,
    },
  } satisfies ComparisonSummary;
}

const SOURCE = member("source", {
  forkedFromWorkspaceId: null,
  isRequested: true,
  isGroupRoot: true,
  analysisStrategy: "legacy",
  status: "paused_after_analysis",
  currentDecision: "apply",
  originalDecision: "apply",
  score: 72,
  stages: [stage("prompt_1")],
  totals: {
    callCount: 1,
    failedCallCount: 0,
    unmeasuredCallCount: 0,
    durationMs: 4200,
    usage: MEASURED,
    estimate: estimate(0.0123),
  },
});

const COMPLETED_B = member("fork-b", {
  status: "paused_after_analysis",
  currentDecision: "maybe",
  originalDecision: "maybe",
  score: 63,
  analysisPolicy: {
    decision: "maybe",
    score: 63,
    advisoryDecision: "apply",
    advisoryDiffers: true,
    borderline: true,
    borderlineReasons: ["score_margin"],
    manualReviewRequired: true,
    decidingRule: "C2",
    openQuestions: [],
    policyVersion: "1.0.0",
  },
  stages: [stage("analysis_b")],
  totals: {
    callCount: 1,
    failedCallCount: 0,
    unmeasuredCallCount: 0,
    durationMs: 5000,
    usage: MEASURED,
    estimate: estimate(0.00004),
  },
});

const RUNNING_C = member("fork-c", {
  analysisStrategy: "c",
  status: "analysis_running",
  activeJob: { state: "active", jobId: "job-c", step: "prompt_1" },
});

const FAILED_C = member("fork-c-failed", {
  analysisStrategy: "c",
  lastStepError: { step: "prompt_1", message: "Stage X2 failed: invalid JSON", at: null },
  stages: [stage("analysis_x1"), stage("analysis_x2", { failedCallCount: 1 })],
});

const IDLE_LEGACY = member("fork-legacy", { analysisStrategy: "legacy" });

const NO_NOTES: CompareRowNotes = { failedForks: [], startNotes: [] };

const FAILED_FORK_REQUEST: CompareRowRequest = {
  analysisStrategy: "c",
  contextLayout: "boundary",
  contextSourceSet: "assessment",
  carryOverRequirements: true,
  requestKey: "33333333-3333-4333-8333-333333333333",
};

function renderTable(summary: ComparisonSummary | null, notes = NO_NOTES, initialError: string | null = null) {
  return render(
    <ComparisonTable
      sourceWorkspaceId="source"
      initialSummary={summary}
      initialError={initialError}
      initialNotes={notes}
    />,
  );
}

const rowOf = (workspaceId: string) => {
  const row = document.querySelector(`[data-member="${workspaceId}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${workspaceId}`);
  return row;
};

describe("ComparisonTable", () => {
  beforeEach(() => {
    comparisonMock.mockResolvedValue({ ok: true, data: summaryOf([SOURCE]) });
    startMock.mockResolvedValue({ ok: true, data: { jobId: "job-new" } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("highlights unequal inputs and separates usage from estimate", () => {
    renderTable(
      summaryOf([SOURCE, COMPLETED_B, IDLE_LEGACY], {
        snapshot: { isEqual: false, unrecordedWorkspaceIds: [] },
        model: { isEqual: true, unrecordedWorkspaceIds: ["fork-legacy"] },
      }),
    );

    const equality = screen.getByRole("region", { name: "Input equality" });
    const snapshot = within(equality).getByText("Source snapshot").closest("li") as HTMLElement;
    expect(snapshot).toHaveAttribute("data-equality", "differs");
    expect(within(snapshot).getByText("Differs")).toBeInTheDocument();

    const model = within(equality).getByText("Model").closest("li") as HTMLElement;
    expect(model).toHaveAttribute("data-equality", "unrecorded");
    expect(within(model).queryByText("Equal")).not.toBeInTheDocument();
    expect(within(model).getByText("Not compared: slug_fork-legacy")).toBeInTheDocument();

    const vacancy = within(equality).getByText("Vacancy text").closest("li") as HTMLElement;
    expect(vacancy).toHaveAttribute("data-equality", "equal");

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toContain("Measured usage");
    expect(headers).toContain("Estimated cost (USD)");
    const usageIndex = headers.indexOf("Measured usage");
    const costIndex = headers.indexOf("Estimated cost (USD)");

    const cells = within(rowOf("source")).getAllByRole("cell");
    // The row header is the first column; the data cells follow it.
    const usageCell = cells[usageIndex - 1];
    const costCell = cells[costIndex - 1];
    expect(usageCell).toHaveTextContent("Input 1,200 (incl. cache read 300, cache write 200)");
    expect(usageCell).toHaveTextContent("Output 450 (incl. reasoning 120)");
    expect(usageCell).not.toHaveTextContent("$");
    expect(costCell).toHaveTextContent("$0.0123");
    expect(costCell).toHaveTextContent("list-price estimate, not an invoice");
    expect(costCell).not.toHaveTextContent("Input");
    // A small non-zero amount is not rounded to zero.
    expect(within(rowOf("fork-b")).getAllByRole("cell")[costIndex - 1]).toHaveTextContent("< $0.0001");
  });

  it("shows per-member status, failure and navigation", () => {
    renderTable(summaryOf([SOURCE, COMPLETED_B, RUNNING_C, FAILED_C]));

    expect(within(rowOf("fork-c")).getByText("Analysis running")).toBeInTheDocument();
    expect(within(rowOf("fork-c")).getByText("Running…")).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText("Paused after analysis")).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText("Recommendation (policy):")).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText("Advisory (model):")).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText("C2")).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText(/Borderline/)).toBeInTheDocument();
    expect(within(rowOf("fork-b")).getByText("Manual review required")).toBeInTheDocument();
    expect(within(rowOf("source")).getByText("AI recommendation:")).toBeInTheDocument();
    expect(within(rowOf("source")).queryByText("Recommendation (policy):")).not.toBeInTheDocument();

    const failedRow = rowOf("fork-c-failed");
    expect(within(failedRow).getByText("Stage X2 failed: invalid JSON")).toBeInTheDocument();
    expect(within(failedRow).getAllByRole("button")).toHaveLength(1);
    expect(within(failedRow).getByRole("button", { name: "Run again" })).toBeInTheDocument();
    expect(within(rowOf("fork-c")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rowOf("fork-b")).queryByRole("button")).not.toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: "Open workspace" }).map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "/workspaces/source",
      "/workspaces/fork-b",
      "/workspaces/fork-c",
      "/workspaces/fork-c-failed",
    ]);
    expect(screen.queryByRole("button", { name: /approve|override|generate|export/i })).not.toBeInTheDocument();
  });

  it("offers the matching retry action per failure kind", async () => {
    forkMock.mockResolvedValue({
      ok: true,
      data: {
        id: "fork-c-new",
        isNew: false,
        status: "source_saved",
        workspaceSlug: "slug_fork-c-new",
        forkedFromWorkspaceId: "source",
        comparisonGroupId: "source",
        analysisStrategy: "c",
        contextLayout: "boundary",
        contextSourceSet: "assessment",
        carryOverRequirements: true,
        requestKey: FAILED_FORK_REQUEST.requestKey,
        vacancyTextHash: "hash",
        createdAt: "2026-11-27T00:00:00.000Z",
      },
    });
    comparisonMock.mockImplementation(async (workspaceId) => ({
      ok: true,
      data: summaryOf([SOURCE, IDLE_LEGACY, FAILED_C, member(workspaceId)]),
    }));
    renderTable(summaryOf([SOURCE, IDLE_LEGACY, FAILED_C]), {
      failedForks: [{ request: FAILED_FORK_REQUEST, message: FAILED_FORK_TEXT }],
      startNotes: [{ forkId: "fork-legacy", kind: "start_failed" }],
    });

    const failedForkRow = document.querySelector(`[data-failed-fork="${FAILED_FORK_REQUEST.requestKey}"]`) as HTMLElement;
    expect(within(failedForkRow).getByText("Fork failed")).toBeInTheDocument();
    expect(within(failedForkRow).getByText(FAILED_FORK_TEXT)).toBeInTheDocument();
    expect(within(failedForkRow).getByRole("button", { name: "Retry fork" })).toBeInTheDocument();
    expect(within(rowOf("fork-legacy")).getByRole("button", { name: "Start analysis" })).toBeInTheDocument();
    expect(within(rowOf("fork-legacy")).getByText(START_NOTE_TEXT.start_failed)).toBeInTheDocument();
    expect(within(rowOf("fork-c-failed")).getByRole("button", { name: "Run again" })).toBeInTheDocument();
    // The source workspace is not a fork: it keeps its own page actions.
    expect(within(rowOf("source")).queryByRole("button")).not.toBeInTheDocument();

    // Rendering triggers nothing.
    expect(forkMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();

    fireEvent.click(within(failedForkRow).getByRole("button", { name: "Retry fork" }));
    await waitFor(() => expect(startMock).toHaveBeenCalledWith("fork-c-new"));
    expect(forkMock).toHaveBeenCalledTimes(1);
    expect(forkMock).toHaveBeenCalledWith("source", FAILED_FORK_REQUEST);
    await waitFor(() =>
      expect(document.querySelector(`[data-failed-fork="${FAILED_FORK_REQUEST.requestKey}"]`)).toBeNull(),
    );
    expect(replaceMock).toHaveBeenCalled();

    startMock.mockClear();
    fireEvent.click(within(rowOf("fork-legacy")).getByRole("button", { name: "Start analysis" }));
    await waitFor(() => expect(startMock).toHaveBeenCalledWith("fork-legacy"));
    expect(comparisonMock).toHaveBeenCalledWith("fork-legacy");

    startMock.mockClear();
    comparisonMock.mockImplementation(async () => ({
      ok: true,
      data: summaryOf([SOURCE, IDLE_LEGACY, FAILED_C]),
    }));
    fireEvent.click(within(rowOf("fork-c-failed")).getByRole("button", { name: "Run again" }));
    await waitFor(() => expect(startMock).toHaveBeenCalledWith("fork-c-failed"));
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("does not start when the re-read member is no longer idle", async () => {
    // "Start analysis": another tab started the fork in the meantime.
    comparisonMock.mockImplementation(async () => ({
      ok: true,
      data: summaryOf([
        SOURCE,
        member("fork-legacy", {
          analysisStrategy: "legacy",
          status: "analysis_running",
          activeJob: { state: "waiting", jobId: "job-other-tab", step: "prompt_1" },
        }),
      ]),
    }));
    const { unmount } = renderTable(summaryOf([SOURCE, IDLE_LEGACY]));
    fireEvent.click(within(rowOf("fork-legacy")).getByRole("button", { name: "Start analysis" }));
    await waitFor(() => expect(within(rowOf("fork-legacy")).getByText(/not at "source_saved"/)).toBeInTheDocument());
    expect(comparisonMock).toHaveBeenCalledWith("fork-legacy");
    expect(startMock).not.toHaveBeenCalled();
    unmount();

    // "Run again": the failed fork was meanwhile run again and has finished.
    comparisonMock.mockReset();
    comparisonMock.mockImplementation(async () => ({
      ok: true,
      data: summaryOf([SOURCE, member("fork-c-failed", { analysisStrategy: "c", status: "paused_after_analysis" })]),
    }));
    renderTable(summaryOf([SOURCE, FAILED_C]));
    fireEvent.click(within(rowOf("fork-c-failed")).getByRole("button", { name: "Run again" }));
    await waitFor(() =>
      expect(within(rowOf("fork-c-failed")).getByText(/paused_after_analysis/)).toBeInTheDocument(),
    );
    expect(comparisonMock).toHaveBeenCalledWith("fork-c-failed");
    expect(startMock).not.toHaveBeenCalled();
    expect(within(rowOf("fork-c-failed")).queryByRole("button", { name: "Run again" })).not.toBeInTheDocument();
  });

  it("keeps both rows resolved when two failed forks are retried at once", async () => {
    const second: CompareRowRequest = {
      ...FAILED_FORK_REQUEST,
      analysisStrategy: "b",
      carryOverRequirements: false,
      requestKey: "44444444-4444-4444-8444-444444444444",
    };
    let release: () => void = () => {};
    const firstDone = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The first retry answers only after the second one has finished.
    forkMock.mockImplementationOnce(async (_sourceId, input) => {
      await firstDone;
      return {
        ok: true,
        data: {
          id: `fork-${input.analysisStrategy}-new`,
          isNew: true,
          status: "analysis_running",
          workspaceSlug: "slug",
          forkedFromWorkspaceId: "source",
          comparisonGroupId: "source",
          analysisStrategy: input.analysisStrategy,
          contextLayout: input.contextLayout ?? "single",
          contextSourceSet: input.contextSourceSet ?? "full",
          carryOverRequirements: input.carryOverRequirements ?? false,
          requestKey: input.requestKey ?? null,
          vacancyTextHash: "hash",
          createdAt: "2026-11-27T00:00:00.000Z",
        },
      };
    });
    forkMock.mockImplementationOnce(async (_sourceId, input) => ({
      ok: true,
      data: {
        id: `fork-${input.analysisStrategy}-new`,
        isNew: true,
        status: "analysis_running",
        workspaceSlug: "slug",
        forkedFromWorkspaceId: "source",
        comparisonGroupId: "source",
        analysisStrategy: input.analysisStrategy,
        contextLayout: input.contextLayout ?? "single",
        contextSourceSet: input.contextSourceSet ?? "full",
        carryOverRequirements: input.carryOverRequirements ?? false,
        requestKey: input.requestKey ?? null,
        vacancyTextHash: "hash",
        createdAt: "2026-11-27T00:00:00.000Z",
      },
    }));
    renderTable(summaryOf([SOURCE]), {
      failedForks: [
        { request: FAILED_FORK_REQUEST, message: FAILED_FORK_TEXT },
        { request: second, message: FAILED_FORK_TEXT },
      ],
      startNotes: [],
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Retry fork" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Retry fork" })[1]);
    await waitFor(() => expect(document.querySelector(`[data-failed-fork="${second.requestKey}"]`)).toBeNull());
    release();
    await waitFor(() =>
      expect(document.querySelector(`[data-failed-fork="${FAILED_FORK_REQUEST.requestKey}"]`)).toBeNull(),
    );
    // Neither fork is analysis-idle, so nothing is started; the URL no longer carries either row.
    expect(startMock).not.toHaveBeenCalled();
    const lastHref = replaceMock.mock.calls.at(-1)?.[0] as string;
    expect(lastHref).toBe("/workspaces/source/comparison?rows=" + lastHref.split("rows=")[1]);
    const { decodeRowNotes } = await import("../compare-strategies");
    expect(decodeRowNotes(lastHref.split("rows=")[1]).failedForks).toEqual([]);
  });

  it("stops refreshing with a message when the comparison read rejects", async () => {
    vi.useFakeTimers();
    comparisonMock.mockRejectedValue(new Error("network down"));
    renderTable(summaryOf([SOURCE, RUNNING_C]));
    for (let tick = 0; tick < 3; tick++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(comparisonMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Refreshing stopped: network down")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(comparisonMock).toHaveBeenCalledTimes(3);
    expect(startMock).not.toHaveBeenCalled();
  });

  it("renders a single-member group", () => {
    renderTable({ ...summaryOf([{ ...SOURCE }]), comparisonGroupId: null });
    expect(rowOf("source")).toBeInTheDocument();
    expect(screen.getByText(/Only this workspace is in the group/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Input equality" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-equality]")).toBeNull();
  });

  it("shows an error when the comparison cannot be loaded", () => {
    renderTable(null, NO_NOTES, "Workspace \"x\" not found");
    expect(screen.getByRole("alert")).toHaveTextContent('The comparison could not be loaded: Workspace "x" not found');
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps the load error when a reload fails", async () => {
    comparisonMock.mockRejectedValue(new Error("still unreachable"));
    renderTable(null, NO_NOTES, "The backend could not be reached.");
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("still unreachable"));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers no start while the queue state is unknown", () => {
    renderTable(
      summaryOf([SOURCE, member("fork-unknown", { activeJob: { state: "unknown", jobId: null, step: null } }), {
        ...FAILED_C,
        activeJob: { state: "unknown", jobId: null, step: null },
      }]),
    );
    expect(within(rowOf("fork-unknown")).getByText("Queue state unknown")).toBeInTheDocument();
    expect(within(rowOf("fork-unknown")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rowOf("fork-c-failed")).getByText("Queue state unknown")).toBeInTheDocument();
    expect(within(rowOf("fork-c-failed")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows missing usage and unavailable estimates without zeros", () => {
    const unmeasured = member("fork-c-carried", {
      analysisStrategy: "c",
      carryOverRequirements: true,
      status: "paused_after_analysis",
      stages: [
        stage("analysis_x1", {
          isCarriedOver: true,
          carriedOverFromWorkspaceId: "source",
          promptRunCount: 0,
          callCount: 0,
          usage: NO_USAGE,
          estimate: estimate(null, "no provider call"),
        }),
        stage("analysis_x2", {
          unmeasuredCallCount: 1,
          usage: NO_USAGE,
          estimate: estimate(null, "no call of this group has recorded usage"),
        }),
      ],
      totals: {
        callCount: 1,
        failedCallCount: 0,
        unmeasuredCallCount: 1,
        durationMs: 3000,
        usage: NO_USAGE,
        estimate: estimate(null, "no call of this group has recorded usage"),
      },
    });
    renderTable(summaryOf([SOURCE, unmeasured, IDLE_LEGACY]));

    const row = rowOf("fork-c-carried");
    expect(within(row).getByText("Not measured")).toBeInTheDocument();
    expect(within(row).getByText("1 call without recorded usage")).toBeInTheDocument();
    expect(within(row).getAllByText("Not available").length).toBeGreaterThan(0);
    expect(within(row).getAllByText("no call of this group has recorded usage").length).toBeGreaterThan(0);
    expect(within(row).getByText("Carried over from the source — no call")).toBeInTheDocument();
    expect(within(row).getByText("01a carried over")).toBeInTheDocument();
    expect(row).not.toHaveTextContent("$0");
    expect(row).not.toHaveTextContent("Input 0");

    const idle = rowOf("fork-legacy");
    expect(within(idle).getByText("No calls yet")).toBeInTheDocument();
    expect(within(idle).getByText("Not available")).toBeInTheDocument();
    expect(within(idle).getByText("no provider call")).toBeInTheDocument();
    expect(idle).not.toHaveTextContent("$0");
  });

  it("refreshes while a job is active without starting anything", async () => {
    vi.useFakeTimers();
    comparisonMock.mockResolvedValue({ ok: true, data: summaryOf([SOURCE, RUNNING_C]) });
    renderTable(summaryOf([SOURCE, RUNNING_C]));

    expect(comparisonMock).not.toHaveBeenCalled();
    for (let tick = 0; tick < 3; tick++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(comparisonMock).toHaveBeenCalledTimes(3);
    expect(comparisonMock).toHaveBeenCalledWith("source");

    // An unknown queue state is not taken as "done": it keeps refreshing too.
    comparisonMock.mockResolvedValue({
      ok: true,
      data: summaryOf([SOURCE, { ...RUNNING_C, activeJob: { state: "unknown", jobId: null, step: null } }]),
    });
    for (let tick = 0; tick < 2; tick++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(comparisonMock).toHaveBeenCalledTimes(5);
    expect(startMock).not.toHaveBeenCalled();
    expect(forkMock).not.toHaveBeenCalled();
  });

  it("stops refreshing when no job is active", async () => {
    vi.useFakeTimers();
    comparisonMock.mockResolvedValue({
      ok: true,
      data: summaryOf([SOURCE, { ...RUNNING_C, status: "paused_after_analysis", activeJob: { state: "none", jobId: null, step: null } }]),
    });
    const { unmount } = renderTable(summaryOf([SOURCE, RUNNING_C]));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(comparisonMock).toHaveBeenCalledTimes(1);
    expect(within(rowOf("fork-c")).getByText("Paused after analysis")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(comparisonMock).toHaveBeenCalledTimes(1);
    unmount();

    // A group without any open job never starts refreshing.
    comparisonMock.mockClear();
    renderTable(summaryOf([SOURCE, COMPLETED_B]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(comparisonMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });
});
