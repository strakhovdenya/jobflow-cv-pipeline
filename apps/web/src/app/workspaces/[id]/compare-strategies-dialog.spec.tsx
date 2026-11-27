import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComparisonMember, ForkWorkspaceInput } from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("./actions", () => ({
  forkWorkspaceAction: vi.fn(),
  getComparisonAction: vi.fn(),
  runAnalysisAction: vi.fn(),
}));

import { forkWorkspaceAction, getComparisonAction, runAnalysisAction } from "./actions";
import { CompareStrategiesDialog } from "./compare-strategies-dialog";
import { FAILED_FORK_TEXT, ROWS_PARAM, decodeRowNotes } from "./compare-strategies";

const forkMock = vi.mocked(forkWorkspaceAction);
const comparisonMock = vi.mocked(getComparisonAction);
const startMock = vi.mocked(runAnalysisAction);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function idleMember(workspaceId: string): ComparisonMember {
  return {
    workspaceId,
    workspaceSlug: workspaceId,
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
      usage: {
        isMeasured: false,
        inputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      },
      estimate: {
        isEstimate: true,
        label: "list-price estimate, not an invoice",
        currency: "USD",
        pricingVersion: "v",
        amount: null,
        reason: "no provider call",
      },
    },
  };
}

function forkSucceeds(_sourceId: string, input: ForkWorkspaceInput) {
  return Promise.resolve({
    ok: true as const,
    data: {
      id: `fork-${input.analysisStrategy}`,
      isNew: true,
      status: "source_saved",
      workspaceSlug: `fork_${input.analysisStrategy}`,
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
  });
}

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });
const confirmButton = () => screen.getByRole("button", { name: /Create and start|Retry failed forks/ });
const sentForks = () => forkMock.mock.calls.map((call) => call[1]);

function renderDialog(canCarryOver = false) {
  const onClose = vi.fn();
  render(<CompareStrategiesDialog sourceWorkspaceId="source" canCarryOver={canCarryOver} onClose={onClose} />);
  return { onClose };
}

describe("CompareStrategiesDialog", () => {
  beforeEach(() => {
    forkMock.mockImplementation(forkSucceeds);
    comparisonMock.mockImplementation(async (workspaceId) => ({
      ok: true,
      data: {
        workspaceId,
        comparisonGroupId: "source",
        members: [idleMember(workspaceId)],
        inputEquality: {
          vacancyHash: { isEqual: true, unrecordedWorkspaceIds: [] },
          companyAndRole: { isEqual: true, unrecordedWorkspaceIds: [] },
          notes: { isEqual: true, unrecordedWorkspaceIds: [] },
          snapshot: { isEqual: true, unrecordedWorkspaceIds: [] },
          model: { isEqual: true, unrecordedWorkspaceIds: [] },
        },
      },
    }));
    startMock.mockImplementation(async (workspaceId) => ({ ok: true, data: { jobId: `job-${workspaceId}` } }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows workspaces and expected paid calls for the selection", () => {
    renderDialog(true);
    expect(screen.getByText("0 new workspaces · 0 expected paid calls")).toBeInTheDocument();

    fireEvent.click(checkbox(/Legacy/));
    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(checkbox(/Strategy C/));
    expect(screen.getByText("3 new workspaces · 4 expected paid calls")).toBeInTheDocument();

    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(checkbox(/Strategy C/));
    expect(screen.getByText("1 new workspace · 1 expected paid call")).toBeInTheDocument();

    fireEvent.click(checkbox(/Legacy/));
    fireEvent.click(checkbox(/Strategy B/));
    expect(screen.getByText("1 new workspace · 1 expected paid call")).toBeInTheDocument();

    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(checkbox(/Strategy C/));
    expect(screen.getByText("1 new workspace · 2 expected paid calls")).toBeInTheDocument();

    fireEvent.click(checkbox(/Carry over/));
    expect(screen.getByText("1 new workspace · 1 expected paid call")).toBeInTheDocument();
    // No monetary estimate before the run.
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });

  it("disables confirmation without a selected strategy", () => {
    renderDialog();
    for (const name of [/Legacy/, /Strategy B/, /Strategy C/]) {
      expect(checkbox(name)).not.toBeChecked();
    }
    expect(confirmButton()).toBeDisabled();

    fireEvent.click(checkbox(/Strategy B/));
    expect(confirmButton()).toBeEnabled();
    fireEvent.click(checkbox(/Strategy B/));
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(forkMock).not.toHaveBeenCalled();
  });

  it("offers carry-over only for a c source with 01a", async () => {
    renderDialog(false);
    expect(screen.queryByRole("checkbox", { name: /Carry over/ })).not.toBeInTheDocument();
    fireEvent.click(checkbox(/Strategy C/));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(sentForks()).toEqual([expect.objectContaining({ analysisStrategy: "c", carryOverRequirements: false })]);

    cleanup();
    forkMock.mockClear();
    pushMock.mockClear();
    renderDialog(true);
    expect(checkbox(/Carry over/)).toBeDisabled();
    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(checkbox(/Strategy C/));
    fireEvent.click(checkbox(/Carry over/));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(sentForks()).toEqual([
      expect.objectContaining({ analysisStrategy: "b", carryOverRequirements: false }),
      expect.objectContaining({ analysisStrategy: "c", carryOverRequirements: true }),
    ]);
  });

  it("shows errors when every fork fails", async () => {
    forkMock.mockImplementation(async (_sourceId, input) => ({
      ok: false,
      errors: [`${input.analysisStrategy} could not be forked`],
    }));
    renderDialog();
    fireEvent.click(checkbox(/Legacy/));
    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(confirmButton());

    expect(await screen.findByText("legacy could not be forked")).toBeInTheDocument();
    expect(screen.getByText("b could not be forked")).toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
    expect(comparisonMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps one request key per row across submissions", async () => {
    forkMock.mockImplementation(async () => ({ ok: false, errors: ["Backend unreachable"] }));
    renderDialog(true);
    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(checkbox(/Strategy C/));
    fireEvent.click(checkbox(/Carry over/));
    fireEvent.change(screen.getByLabelText("Request layout"), { target: { value: "boundary" } });
    fireEvent.click(confirmButton());
    await screen.findAllByText("Backend unreachable");

    // Locked after the first submission: the options cannot change before the retry.
    expect(checkbox(/Strategy B/)).toBeDisabled();
    expect(checkbox(/Legacy/)).toBeDisabled();
    expect(screen.getByLabelText("Request layout")).toBeDisabled();
    expect(confirmButton()).toHaveTextContent("Retry failed forks");

    forkMock.mockImplementation(forkSucceeds);
    fireEvent.click(confirmButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalled());

    const sent = sentForks();
    expect(sent).toHaveLength(4);
    expect(sent.slice(2)).toEqual(sent.slice(0, 2));
    expect(sent[0]).toMatchObject({ analysisStrategy: "b", contextLayout: "boundary", carryOverRequirements: false });
    expect(sent[1]).toMatchObject({ analysisStrategy: "c", contextLayout: "boundary", carryOverRequirements: true });
    expect(sent[0].requestKey).toMatch(UUID);
    expect(sent[1].requestKey).toMatch(UUID);
    expect(sent[0].requestKey).not.toBe(sent[1].requestKey);
  });

  it("navigates with the failed rows after a partial failure", async () => {
    forkMock.mockImplementation(async (sourceId, input) =>
      input.analysisStrategy === "legacy"
        ? { ok: false, errors: ["Vacancy source is missing"] }
        : forkSucceeds(sourceId, input),
    );
    renderDialog();
    fireEvent.click(checkbox(/Legacy/));
    fireEvent.click(checkbox(/Strategy B/));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));

    expect(startMock).toHaveBeenCalledWith("fork-b");
    const href = pushMock.mock.calls[0][0] as string;
    expect(href.startsWith("/workspaces/source/comparison?")).toBe(true);
    const notes = decodeRowNotes(new URL(href, "http://localhost").searchParams.get(ROWS_PARAM) ?? undefined);
    const legacyRequest = sentForks().find((input) => input.analysisStrategy === "legacy");
    expect(notes.failedForks).toEqual([{ request: legacyRequest, message: FAILED_FORK_TEXT }]);
    // The backend's error text is shown in the dialog only, never written to the URL.
    expect(atob((new URL(href, "http://localhost").searchParams.get(ROWS_PARAM) ?? "").replace(/-/g, "+").replace(/_/g, "/"))).not.toContain(
      "Vacancy source is missing",
    );
    expect(notes.startNotes).toEqual([]);
  });

  it("keeps keyboard focus inside the dialog and returns it on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { onClose } = renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();

    fireEvent.click(checkbox(/Strategy B/));
    const confirm = confirmButton();
    confirm.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(checkbox(/Legacy/)).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    cleanup();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("closes on Escape and on Cancel", () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
