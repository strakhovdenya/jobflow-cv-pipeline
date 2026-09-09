import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisReasoningPanel } from "./analysis-reasoning-panel";
import type { WorkspaceArtifactSummary } from "@/lib/api";

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

describe("AnalysisReasoningPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});
