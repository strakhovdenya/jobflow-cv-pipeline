import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisReasoningPanel } from "./analysis-reasoning-panel";
import type { WorkspaceArtifactSummary } from "@/lib/api";

// Mock browser-translate so the component test is independent of the Translator global.
// The Translator global contract is exercised separately in browser-translate.spec.ts.
vi.mock("@/lib/browser-translate", () => ({
  isEnRuTranslationAvailable: vi.fn(),
  translateEnToRu: vi.fn(),
}));

import {
  isEnRuTranslationAvailable,
  translateEnToRu,
} from "@/lib/browser-translate";

const isEnRuTranslationAvailableMock = vi.mocked(isEnRuTranslationAvailable);
const translateEnToRuMock = vi.mocked(translateEnToRu);

function makeAnalysisArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-analysis-1",
    artifactType: "vacancy_analysis_json",
    canonicalFileName: "01_vacancy_analysis.json",
    downloadFileName: "01_vacancy_analysis.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 512,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const SAMPLE_DATA = {
  summary: "Strong match with relevant backend experience.",
  top_reasons: [
    "Meets all must-have requirements",
    "Strong TypeScript and NestJS background",
  ],
  score: 85,
  quality_score: 0.9,
};

const RU_SUMMARY = "Сильное совпадение с соответствующим опытом бэкенда.";
const RU_REASONS = [
  "Соответствует всем обязательным требованиям",
  "Сильный фон TypeScript и NestJS",
];

describe("AnalysisReasoningPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Default: translation available unless overridden per test
    isEnRuTranslationAvailableMock.mockResolvedValue(true);
    translateEnToRuMock.mockResolvedValue([RU_SUMMARY, ...RU_REASONS]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ─── no-artifact guard ────────────────────────────────────────────────────

  it("renders nothing when no vacancy_analysis_json artifact exists", () => {
    const { container } = render(
      <AnalysisReasoningPanel
        artifacts={[]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when vacancy_analysis_json artifact is not latest", () => {
    const { container } = render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact({ isLatest: false })]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when artifacts list has no vacancy_analysis_json type (other types present)", () => {
    const otherArtifact: WorkspaceArtifactSummary = {
      id: "other-1",
      artifactType: "targeted_cv_content_json",
      canonicalFileName: "02_targeted_cv_content.json",
      downloadFileName: "02_targeted_cv_content.json",
      isLatest: true,
      version: 1,
      mimeType: "application/json",
      fileSizeBytes: 200,
      createdAt: "2026-09-01T00:00:00.000Z",
    };
    const { container } = render(
      <AnalysisReasoningPanel
        artifacts={[otherArtifact]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ─── loading state ─────────────────────────────────────────────────────────

  it("shows loading state while fetch is in progress", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    expect(screen.getByText("Loading analysis…")).toBeInTheDocument();
  });

  // ─── error states ──────────────────────────────────────────────────────────

  it("shows error message when HTTP response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load analysis/)).toBeInTheDocument();
    });
  });

  it("shows error message when fetch rejects (network error)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"));

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  // ─── loaded content ────────────────────────────────────────────────────────

  it("renders summary, top_reasons, score, and quality_score after successful fetch", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Meets all must-have requirements"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Strong TypeScript and NestJS background"),
    ).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("0.9")).toBeInTheDocument();
  });

  it("fetches from the correct artifact download URL", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/artifacts/artifact-analysis-1/download",
      );
    });
  });

  // ─── collapsed by default ─────────────────────────────────────────────────

  it("renders collapsed by default (details element has no open attribute)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    const details = screen.getByText("Why apply").closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  // ─── panel title (recommendation) ─────────────────────────────────────────

  it("uses currentDecision for title when originalDecision is null", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="maybe"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Why maybe")).toBeInTheDocument();
    });
  });

  it("prefers originalDecision over currentDecision for title (ADR-027 recommendation pattern)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="maybe"
        originalDecision="apply"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Why apply")).toBeInTheDocument();
    });

    expect(screen.queryByText("Why maybe")).not.toBeInTheDocument();
  });

  it("strips manual_override_ prefix from title (ADR-027 displayDecision pattern)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="manual_override_apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Why apply")).toBeInTheDocument();
    });
  });

  it("falls back to generic title when both decisions are null", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision={null}
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Analysis reasoning")).toBeInTheDocument();
    });
  });

  // ─── translation toggle ────────────────────────────────────────────────────

  it("renders translate button disabled with tooltip when translation is unavailable", async () => {
    isEnRuTranslationAvailableMock.mockResolvedValue(false);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    // Confirm the availability check has actually resolved — the initial "checking"
    // state renders the button disabled too, so without this the assertions below
    // could trivially pass against "checking" rather than the resolved "unavailable".
    await waitFor(() => {
      expect(isEnRuTranslationAvailableMock).toHaveResolved();
    });

    // Wait for availability check to settle (resolves false → disabled + tooltip)
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "Перевод недоступен в этом браузере");
    });
  });

  it("disables the button without a tooltip while the availability check is still pending", async () => {
    let resolveAvailability!: (value: boolean) => void;
    isEnRuTranslationAvailableMock.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveAvailability = resolve;
      }),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    // Availability check is still pending ("checking") — button disabled, but the
    // tooltip must not claim translation is unavailable when that isn't known yet.
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("title");

    resolveAvailability(true);
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("clicking button while showing English translates to Russian", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    // Wait for data and availability
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(RU_SUMMARY)).toBeInTheDocument();
    });

    expect(screen.getByText(RU_REASONS[0])).toBeInTheDocument();
    expect(screen.getByText(RU_REASONS[1])).toBeInTheDocument();
    // Original English summary should no longer be visible
    expect(
      screen.queryByText("Strong match with relevant backend experience."),
    ).not.toBeInTheDocument();
  });

  it("clicking again after translation restores English without a second translate call", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    // First click: translate to Russian
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(RU_SUMMARY)).toBeInTheDocument();
    });

    // Second click: restore English
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    // translateEnToRu must have been called exactly once total (second click did not re-translate)
    expect(translateEnToRuMock).toHaveBeenCalledTimes(1);
  });

  it("ignores additional clicks while translation is loading (mock called only once)", async () => {
    let resolveTranslate!: (value: string[]) => void;
    translateEnToRuMock.mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveTranslate = resolve;
      }),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    // First click starts translation (pending)
    fireEvent.click(screen.getByRole("button"));

    // Second click while pending — button is disabled, should be a no-op
    fireEvent.click(screen.getByRole("button"));

    // Resolve the translation
    resolveTranslate([RU_SUMMARY, ...RU_REASONS]);
    await waitFor(() => {
      expect(screen.getByText(RU_SUMMARY)).toBeInTheDocument();
    });

    // translateEnToRu was only invoked once despite two clicks
    expect(translateEnToRuMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to English and does not crash when translateEnToRu rejects", async () => {
    translateEnToRuMock.mockRejectedValue(
      new Error("Translation API unavailable"),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_DATA),
    } as Response);

    render(
      <AnalysisReasoningPanel
        artifacts={[makeAnalysisArtifact()]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button"));

    // After rejection, original English text must still be shown
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });

    // Button should be back to interactive (idle state, not stuck loading)
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("discards Russian translation when artifact changes and does not restore it on back-navigation", async () => {
    const ARTIFACT_1 = makeAnalysisArtifact({ id: "artifact-analysis-1" });
    const ARTIFACT_2 = makeAnalysisArtifact({
      id: "artifact-analysis-2",
      version: 2,
    });

    const NEW_DATA = {
      summary: "Different workspace, different analysis.",
      top_reasons: ["Completely different reasons"],
      score: 60,
      quality_score: 0.6,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_DATA),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(NEW_DATA),
      } as Response)
      // Third fetch: back to artifact-1
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_DATA),
      } as Response);

    const { rerender } = render(
      <AnalysisReasoningPanel
        artifacts={[ARTIFACT_1]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    // Wait for first artifact data + availability
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    // Translate to Russian
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(RU_SUMMARY)).toBeInTheDocument();
    });

    // Re-render with a new artifact (simulates navigating to a different workspace analysis)
    rerender(
      <AnalysisReasoningPanel
        artifacts={[ARTIFACT_2]}
        currentDecision="maybe"
        originalDecision={null}
      />,
    );

    // New English data for artifact-2 should appear; stale Russian translation discarded
    await waitFor(() => {
      expect(
        screen.getByText("Different workspace, different analysis."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(RU_SUMMARY)).not.toBeInTheDocument();

    // Navigate back to artifact-1 — state must truly be reset, not just filtered.
    // A filter-based approach would reshow the cached Russian text here.
    rerender(
      <AnalysisReasoningPanel
        artifacts={[ARTIFACT_1]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    // English text for artifact-1 must be shown again (Russian must not reappear)
    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(RU_SUMMARY)).not.toBeInTheDocument();
  });

  it("discards a still-in-flight translation result if the artifact changes before it resolves", async () => {
    const ARTIFACT_1 = makeAnalysisArtifact({ id: "artifact-analysis-1" });
    const ARTIFACT_2 = makeAnalysisArtifact({
      id: "artifact-analysis-2",
      version: 2,
    });
    const NEW_DATA = {
      summary: "Different workspace, different analysis.",
      top_reasons: ["Completely different reasons"],
      score: 60,
      quality_score: 0.6,
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(SAMPLE_DATA),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(NEW_DATA),
      } as Response);

    let resolveTranslate!: (value: string[]) => void;
    translateEnToRuMock.mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveTranslate = resolve;
      }),
    );

    const { rerender } = render(
      <AnalysisReasoningPanel
        artifacts={[ARTIFACT_1]}
        currentDecision="apply"
        originalDecision={null}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Strong match with relevant backend experience."),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    // Start translating artifact-1, but don't let it resolve yet.
    fireEvent.click(screen.getByRole("button"));

    // Switch to a different artifact while the translate call is still in flight —
    // this fires the render-phase reset to "idle" for artifact-2.
    rerender(
      <AnalysisReasoningPanel
        artifacts={[ARTIFACT_2]}
        currentDecision="maybe"
        originalDecision={null}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByText("Different workspace, different analysis."),
      ).toBeInTheDocument();
    });

    // Now let artifact-1's translate call resolve. Without the artifactId guard,
    // this would overwrite the reset and show artifact-1's Russian translation
    // against artifact-2's English data. `act()`'s async form flushes the
    // `await translateEnToRu(...)` continuation and its subsequent setState to
    // completion before returning — unlike a plain `waitFor`, which only proves a
    // condition was true at some polled instant and can return before a later
    // microtask flips it, silently missing the regression.
    await act(async () => {
      resolveTranslate([RU_SUMMARY, ...RU_REASONS]);
    });

    expect(screen.queryByText(RU_SUMMARY)).not.toBeInTheDocument();
    expect(
      screen.getByText("Different workspace, different analysis."),
    ).toBeInTheDocument();
  });
});
