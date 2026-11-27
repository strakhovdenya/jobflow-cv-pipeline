import { describe, expect, it } from "vitest";
import {
  buildArtifactCards,
  buildMainActionCard,
  buildStages,
  buildStatusHeaderData,
  findLatestCoverLetterPdfDownloadUrl,
  findLatestCvAtsPdfDownloadUrl,
  findLatestCvPdfDownloadUrl,
  nextActionLabel,
  statusLabel,
} from "./pipeline-view-model";
import type { WorkspaceAnalysisPolicy, WorkspaceArtifactSummary, WorkspaceDetail } from "@/lib/api";

// The ADR-046 detail fields of a never-forked legacy workspace (ISSUE-716).
const LEGACY_DETAIL_FIELDS = {
  isArchived: false,
  analysisStrategy: "legacy",
  contextLayout: "single",
  contextSourceSet: "full",
  forkedFromWorkspaceId: null,
  comparisonGroupId: null,
  sourcesChangedSinceAnalysis: false,
} as const;

const ALL_STATUSES = [
  "source_saved",
  "analysis_running",
  "analysis_ready",
  "paused_after_analysis",
  "skipped",
  "cv_generation_running",
  "cv_draft_ready",
  "paused_after_cv_draft",
  "pre_pdf_check_ready",
  "paused_before_export",
  "export_running",
  "cv_pdf_generated",
  "final_check_ready",
  "cover_letter_generated",
  "ready_to_apply",
  "applied",
  "rejected",
  "archived",
  "failed",
];

describe("buildStages", () => {
  it.each(ALL_STATUSES)("produces exactly one 'current' stage among 11 for status %s", (status) => {
    const { stages, progress } = buildStages(status, "apply");
    expect(stages).toHaveLength(11);
    expect(progress.total).toBe(11);
    const current = stages.filter((s) => s.state === "current");
    expect(current).toHaveLength(1);
    expect(progress.step).toBe(current[0].n);
  });

  it("marks all prior stages done and later stages upcoming", () => {
    const { stages } = buildStages("cv_draft_ready", "apply");
    expect(stages[0].state).toBe("done");
    expect(stages[3].state).toBe("done");
    expect(stages[4].state).toBe("current");
    expect(stages[5].state).toBe("upcoming");
  });

  it("marks every prior stage done for a terminal status like archived", () => {
    const { stages } = buildStages("archived", "apply");
    expect(stages.slice(0, 10).every((s) => s.state === "done")).toBe(true);
    expect(stages[10].state).toBe("current");
  });

  it("ADR-027: single Approve option while still deciding (AI recommended apply)", () => {
    const { stages } = buildStages("paused_after_analysis", "apply");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve", state: "next" },
      { label: "Skip", state: "open" },
    ]);
  });

  it("ADR-027: Approve stays open (override_to_apply) for an unconfirmed skip override", () => {
    const { stages } = buildStages("paused_after_analysis", "skip");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve", state: "open" },
      { label: "Skip", state: "chosen", reason: "Manually overridden to skip" },
    ]);
  });

  it("ADR-027: Approve stays open for the terminal skipped status (not the unconfirmed-override shape)", () => {
    const { stages } = buildStages("skipped", "skip");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve", state: "open" },
      { label: "Skip", state: "chosen", reason: undefined },
    ]);
  });

  it("ADR-027: matches the resolved decision-stage options once past the decision stage", () => {
    const { stages } = buildStages("cv_generation_running", "apply");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve", state: "chosen" },
      { label: "Skip", state: "pruned" },
    ]);
  });

  it("ADR-029: matches mockup 06's cvreview-stage options while still deciding (Pause/Not worth applying removed)", () => {
    const { stages } = buildStages("cv_draft_ready", "apply");
    const cvReviewStage = stages[4];
    expect(cvReviewStage.options).toEqual([
      { label: "Approve", state: "next" },
      { label: "Regenerate", state: "open" },
    ]);
  });

  it("ADR-029: matches mockup 09's resolved cvreview-stage options once past the cvreview stage", () => {
    const { stages } = buildStages("cv_pdf_generated", "apply");
    const cvReviewStage = stages[4];
    expect(cvReviewStage.options).toEqual([
      { label: "Approve", state: "chosen" },
      { label: "Regenerate", state: "pruned" },
    ]);
  });

  it("does not populate decision options before any decision exists", () => {
    const { stages } = buildStages("analysis_running", null);
    expect(stages[2].options).toBeUndefined();
  });

  it("maps analysis_ready to the decision stage (skip-confirm retry), not the analysis stage", () => {
    const { stages, progress } = buildStages("analysis_ready", "skip");
    expect(stages[2].state).toBe("current");
    expect(progress.step).toBe(3);
    expect(stages[2].options).toEqual([
      { label: "Approve", state: "open" },
      { label: "Skip", state: "chosen", reason: "Manually overridden to skip" },
    ]);
  });

  it("ADR-027: attaches recommendation/decision badges to the decision stage, distinct from its options", () => {
    const { stages } = buildStages(
      "paused_after_analysis",
      "skip",
      [],
      "apply",
      "overridden",
    );
    expect(stages[2].badges).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "decision", value: "skip" },
    ]);
  });

  it("ADR-027: shows decision badge as a placeholder before reviewState is set", () => {
    const { stages } = buildStages("paused_after_analysis", "apply", [], "apply", null);
    expect(stages[2].badges).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "decision", value: "—" },
    ]);
  });

  // Found live during TASK-091's Flow variant 2 re-run: review-gates.service.ts's overrideSkip()
  // sets currentDecision to VacancyDecision.manual_override_apply, not plain "apply" — the
  // sidebar's decision badge was showing the raw enum value unformatted.
  it("strips the manual_override_ prefix from the decision badge (post Override-skip)", () => {
    const { stages } = buildStages(
      "cv_generation_running",
      "manual_override_apply",
      [],
      "apply",
      "overridden",
    );
    expect(stages[2].badges).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "decision", value: "apply" },
    ]);
  });

  it("does not attach decision badges to stages without decision options", () => {
    const { stages } = buildStages("paused_after_analysis", "apply", [], "apply", "approved");
    expect(stages[0].badges).toBeUndefined();
    expect(stages[4].badges).toBeUndefined();
  });

  function makeArtifact(artifactType: string): WorkspaceArtifactSummary {
    return {
      id: `artifact-${artifactType}`,
      artifactType,
      canonicalFileName: `${artifactType}.txt`,
      downloadFileName: `${artifactType}.txt`,
      isLatest: true,
      version: 1,
      mimeType: "text/plain",
      fileSizeBytes: 1,
      createdAt: "2026-07-30T00:00:00.000Z",
    };
  }

  it("positions failed at the analysis stage when no analysis artifact exists yet", () => {
    const { stages } = buildStages("failed", null, [makeArtifact("vacancy_source")]);
    expect(stages[1].state).toBe("current");
  });

  it("positions failed at the cv-generation stage when analysis succeeded but no CV content exists", () => {
    const { stages } = buildStages("failed", "apply", [
      makeArtifact("vacancy_source"),
      makeArtifact("vacancy_analysis_json"),
    ]);
    expect(stages[3].state).toBe("current");
  });

  it("positions failed at the export stage when the CV content draft already exists", () => {
    const { stages } = buildStages("failed", "apply", [
      makeArtifact("vacancy_source"),
      makeArtifact("vacancy_analysis_json"),
      makeArtifact("targeted_cv_content_json"),
    ]);
    expect(stages[6].state).toBe("current");
  });

  it("does not mark the final stage done at cover_letter_generated when final check never ran (TASK-074)", () => {
    const { stages } = buildStages("cover_letter_generated", "apply", []);
    expect(stages[8].key).toBe("final");
    expect(stages[8].state).toBe("upcoming");
    expect(stages[9].state).toBe("current");
  });

  it("marks the final stage done at cover_letter_generated once a final check artifact exists (TASK-074)", () => {
    const { stages } = buildStages("cover_letter_generated", "apply", [
      makeArtifact("final_check_json"),
    ]);
    expect(stages[8].state).toBe("done");
  });
});

describe("statusLabel / nextActionLabel", () => {
  it("returns a human label for every known status", () => {
    for (const status of ALL_STATUSES) {
      expect(statusLabel(status)).not.toBe("");
      expect(nextActionLabel(status, "apply")).not.toBe("");
    }
  });

  it("falls back to the raw status string for an unknown status", () => {
    expect(statusLabel("totally_unknown")).toBe("totally_unknown");
  });

  it("returns 'Confirm the skip decision' for paused_after_analysis with a skip decision", () => {
    expect(nextActionLabel("paused_after_analysis", "skip")).toBe("Confirm the skip decision");
  });

  it("returns the generic review wording for paused_after_analysis with a non-skip decision", () => {
    expect(nextActionLabel("paused_after_analysis", "apply")).toBe(
      "Review the analysis result and decide apply/skip",
    );
  });

  it("returns 'Confirm the skip decision' for analysis_ready with a skip decision (failed confirm-skip retry)", () => {
    expect(nextActionLabel("analysis_ready", "skip")).toBe("Confirm the skip decision");
  });
});

describe("buildStatusHeaderData", () => {
  it("maps a WorkspaceDetail into WorkspaceStatusHeaderData", () => {
    const workspace: WorkspaceDetail = {
      ...LEGACY_DETAIL_FIELDS,
      id: "ws-1",
      status: "paused_after_analysis",
      currentDecision: "apply",
      originalDecision: "apply",
      workspaceSlug: "acme_backend_dev",
      createdAt: "2026-07-26T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: { id: "jv-1", roleTitleOriginal: "Backend Dev", roleSlug: "backend_dev" },
      reviewState: "pending",
      score: 8,
      skipReasonSummary: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      manualNotes: [],
      manualNoteForcedClaims: [],
      manualNoteForcedClaimsUnreadable: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
      activeJob: null,
    };

    const header = buildStatusHeaderData(workspace);

    expect(header).toEqual({
      company: "Acme",
      role: "Backend Dev",
      slug: "acme_backend_dev",
      statusLabel: statusLabel("paused_after_analysis"),
      recommendation: "apply",
      decision: "apply",
      score: 8,
      nextAction: nextActionLabel("paused_after_analysis", "apply"),
      sourceUrl: null,
    });
  });

  it("passes the vacancy source url to the status header data", () => {
    const workspace: WorkspaceDetail = {
      ...LEGACY_DETAIL_FIELDS,
      id: "ws-1",
      status: "source_saved",
      currentDecision: null,
      originalDecision: null,
      workspaceSlug: "acme_backend_dev",
      createdAt: "2026-07-26T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: {
        id: "jv-1",
        roleTitleOriginal: "Backend Dev",
        roleSlug: "backend_dev",
        sourceUrl: "https://example.com/jobs/backend-dev",
      },
      reviewState: null,
      score: null,
      skipReasonSummary: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      manualNotes: [],
      manualNoteForcedClaims: [],
      manualNoteForcedClaimsUnreadable: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
      activeJob: null,
    };

    expect(buildStatusHeaderData(workspace).sourceUrl).toBe("https://example.com/jobs/backend-dev");
  });

  it("returns a null source url when the vacancy has none", () => {
    const workspace: WorkspaceDetail = {
      ...LEGACY_DETAIL_FIELDS,
      id: "ws-1",
      status: "source_saved",
      currentDecision: null,
      originalDecision: null,
      workspaceSlug: "acme_backend_dev",
      createdAt: "2026-07-26T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: {
        id: "jv-1",
        roleTitleOriginal: "Backend Dev",
        roleSlug: "backend_dev",
        sourceUrl: null,
      },
      reviewState: null,
      score: null,
      skipReasonSummary: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      manualNotes: [],
      manualNoteForcedClaims: [],
      manualNoteForcedClaimsUnreadable: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
      activeJob: null,
    };

    expect(buildStatusHeaderData(workspace).sourceUrl).toBeNull();
  });

  // Found live during TASK-091's Flow variant 2 re-run: review-gates.service.ts's overrideSkip()
  // sets currentDecision to the distinct VacancyDecision.manual_override_apply/maybe/skip enum
  // value (an audit-trail distinction from a plain apply/maybe/skip) — the "decision" pill was
  // showing that raw enum value unformatted.
  it("strips the manual_override_ prefix from recommendation/decision (post Override-skip)", () => {
    const workspace: WorkspaceDetail = {
      ...LEGACY_DETAIL_FIELDS,
      id: "ws-1",
      status: "cv_generation_running",
      currentDecision: "manual_override_apply",
      originalDecision: "apply",
      workspaceSlug: "acme_backend_dev",
      createdAt: "2026-07-26T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: { id: "jv-1", roleTitleOriginal: "Backend Dev", roleSlug: "backend_dev" },
      reviewState: "overridden",
      score: 75,
      skipReasonSummary: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      manualNotes: [],
      manualNoteForcedClaims: [],
      manualNoteForcedClaimsUnreadable: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
      activeJob: null,
    };

    const header = buildStatusHeaderData(workspace);

    expect(header.recommendation).toBe("apply");
    expect(header.decision).toBe("apply");
  });
});

describe("buildMainActionCard", () => {
  it("ADR-027: shows a single Approve button labeled from currentDecision when the AI recommended apply", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.title).toBe("Analysis review");
    expect(card.meta).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "score", value: 75 },
      { label: "decision", value: "apply" },
    ]);
    const approveButton = card.buttons.find((b) => b.label === "Approve (apply)");
    expect(approveButton?.kind).toBe("primary");
    expect(card.buttons.some((b) => b.label === "Pause")).toBe(false);
    expect(card.buttons.some((b) => b.label === "Skip")).toBe(true);
  });

  it("ADR-027: shows decision as a placeholder before any human action (reviewState still null)", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: null,
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.meta).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "score", value: 75 },
      { label: "decision", value: "—" },
    ]);
  });

  it("ADR-027: falls back recommendation to currentDecision for historical rows with no originalDecision", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "apply",
      originalDecision: null,
      reviewState: null,
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.meta?.[0]).toEqual({ label: "recommendation", value: "apply" });
  });

  it("ADR-027: shows a single Approve button labeled from currentDecision when the AI recommended maybe", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "maybe",
      originalDecision: "maybe",
      reviewState: "approved",
      score: 60,
      skipReasonSummary: null,
    });
    const approveButton = card.buttons.find((b) => b.label === "Approve (maybe)");
    expect(approveButton?.kind).toBe("primary");
  });

  it("ADR-028: matches mockup 10's shape for an unconfirmed skip override, and Approve (apply) can still override to apply", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "skip",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.meta).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "score", value: 75 },
      { label: "decision", value: "skip" },
    ]);
    // ADR-028: no separate "Confirm skip" button — a single "Skip" button drives both
    // change_to_skip and confirm-skip (main-action-panel.tsx orchestrates the sequence).
    const skipButton = card.buttons.find((b) => b.label === "Skip");
    expect(skipButton?.kind).toBe("primary");
    expect(card.buttons.find((b) => b.label === "Approve (apply)")?.kind).toBe("primary");
  });

  it("ADR-028: matches mockup 10's shape for analysis_ready (failed confirm-skip retry) and flags the retry", () => {
    const card = buildMainActionCard({
      status: "analysis_ready",
      currentDecision: "skip",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.buttons.find((b) => b.label === "Skip")?.kind).toBe("primary");
    expect(card.info?.text).toBe("The previous skip confirmation attempt failed — click Skip to retry.");
  });

  it("matches mockup 11's select/reasonNote shape for status skipped", () => {
    const card = buildMainActionCard({
      status: "skipped",
      currentDecision: "skip",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: "Requires German C1",
    });
    expect(card.select).toEqual({ label: "Override to", value: "Apply" });
    expect(card.notice).toBe("Requires German C1");
  });

  it("returns an empty button list for a purely informational status", () => {
    const card = buildMainActionCard({
      status: "final_check_ready",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.buttons).toEqual([]);
  });

  it("cv_pdf_generated shows both buttons when both download URLs are present", () => {
    const card = buildMainActionCard({
      status: "cv_pdf_generated",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
      cvPdfDownloadUrl: "/api/artifacts/design-1/download",
      cvAtsPdfDownloadUrl: "/api/artifacts/ats-1/download",
    });
    expect(card.buttons).toHaveLength(2);
    expect(card.buttons[0].label).toBe("Download CV (Design)");
    expect(card.buttons[0].kind).toBe("primary");
    expect(card.buttons[1].label).toBe("Download CV (ATS)");
    expect(card.buttons[1].kind).toBe("primary");
  });

  it("cv_pdf_generated shows only Download CV (Design) when only design URL is present", () => {
    const card = buildMainActionCard({
      status: "cv_pdf_generated",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
      cvPdfDownloadUrl: "/api/artifacts/design-1/download",
      cvAtsPdfDownloadUrl: null,
    });
    expect(card.buttons).toHaveLength(1);
    expect(card.buttons[0].label).toBe("Download CV (Design)");
  });

  it("cv_pdf_generated shows only Download CV (ATS) when only ATS URL is present", () => {
    const card = buildMainActionCard({
      status: "cv_pdf_generated",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
      cvPdfDownloadUrl: null,
      cvAtsPdfDownloadUrl: "/api/artifacts/ats-1/download",
    });
    expect(card.buttons).toHaveLength(1);
    expect(card.buttons[0].label).toBe("Download CV (ATS)");
  });

  it("cv_pdf_generated shows empty buttons array when neither URL is present", () => {
    const card = buildMainActionCard({
      status: "cv_pdf_generated",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: "approved",
      score: 75,
      skipReasonSummary: null,
      cvPdfDownloadUrl: null,
      cvAtsPdfDownloadUrl: null,
    });
    expect(card.buttons).toHaveLength(0);
  });
});

describe("buildMainActionCard button ids", () => {
  const base = {
    originalDecision: null,
    reviewState: null,
    score: null,
    skipReasonSummary: null,
    cvPdfDownloadUrl: "/pdf",
    cvAtsPdfDownloadUrl: "/ats",
  };
  const idsFor = (status: string, currentDecision: string | null = null) =>
    buildMainActionCard({ ...base, status, currentDecision }).buttons.map(
      (button) => button.id,
    );

  it("assigns a stable id to every button, independent of its label", () => {
    expect(idsFor("source_saved")).toEqual(["start_analysis"]);
    expect(idsFor("paused_after_analysis", "apply")).toEqual(["approve_analysis", "skip"]);
    expect(idsFor("paused_after_analysis", "skip")).toEqual(["approve_analysis", "skip"]);
    expect(idsFor("skipped")).toEqual(["override_skip"]);
    expect(idsFor("cv_generation_running")).toEqual(["generate_cv_draft"]);
    expect(idsFor("cv_draft_ready")).toEqual(["approve_cv_draft", "regenerate_cv_draft"]);
    expect(idsFor("paused_before_export")).toEqual(["export_pdf"]);
    expect(idsFor("export_running")).toEqual(["export_pdf"]);
    expect(idsFor("cv_pdf_generated")).toEqual(["download_cv_design", "download_cv_ats"]);
    expect(idsFor("failed")).toEqual([]);
  });

  it("keeps the same approve id whatever decision the label mentions", () => {
    const labels = ["apply", "maybe", "skip"].map(
      (decision) =>
        buildMainActionCard({ ...base, status: "paused_after_analysis", currentDecision: decision })
          .buttons[0],
    );
    expect(new Set(labels.map((button) => button.id))).toEqual(new Set(["approve_analysis"]));
    expect(labels.map((button) => button.label)).toEqual([
      "Approve (apply)",
      "Approve (maybe)",
      "Approve (apply)",
    ]);
  });
});

describe("findLatestCvPdfDownloadUrl / findLatestCvAtsPdfDownloadUrl", () => {
  function makeArtifact(
    artifactType: string,
    id: string,
    isLatest = true,
  ): WorkspaceArtifactSummary {
    return {
      id,
      artifactType,
      canonicalFileName: `${artifactType}.pdf`,
      downloadFileName: `${artifactType}.pdf`,
      isLatest,
      version: 1,
      mimeType: "application/pdf",
      fileSizeBytes: 100,
      createdAt: "2026-07-30T00:00:00.000Z",
    };
  }

  it("findLatestCvPdfDownloadUrl returns the download URL for the latest cv_export_pdf artifact", () => {
    const artifacts = [makeArtifact("cv_export_pdf", "pdf-1")];
    expect(findLatestCvPdfDownloadUrl(artifacts)).toBe("/api/artifacts/pdf-1/download");
  });

  it("findLatestCvPdfDownloadUrl returns null when no matching artifact exists", () => {
    const artifacts = [makeArtifact("cv_export_ats_pdf", "ats-1")];
    expect(findLatestCvPdfDownloadUrl(artifacts)).toBeNull();
  });

  it("findLatestCvAtsPdfDownloadUrl returns the download URL for the latest cv_export_ats_pdf artifact", () => {
    const artifacts = [makeArtifact("cv_export_ats_pdf", "ats-1")];
    expect(findLatestCvAtsPdfDownloadUrl(artifacts)).toBe("/api/artifacts/ats-1/download");
  });

  it("findLatestCvAtsPdfDownloadUrl returns null when no matching artifact exists", () => {
    const artifacts = [makeArtifact("cv_export_pdf", "pdf-1")];
    expect(findLatestCvAtsPdfDownloadUrl(artifacts)).toBeNull();
  });

  it("findLatestCvAtsPdfDownloadUrl returns null when the artifact is not isLatest", () => {
    const artifacts = [makeArtifact("cv_export_ats_pdf", "ats-old", false)];
    expect(findLatestCvAtsPdfDownloadUrl(artifacts)).toBeNull();
  });
});

describe("findLatestCoverLetterPdfDownloadUrl", () => {
  function makeArtifact(
    artifactType: string,
    id: string,
    isLatest = true,
  ): WorkspaceArtifactSummary {
    return {
      id,
      artifactType,
      canonicalFileName: `cover_letter.${artifactType.endsWith("_pdf") ? "pdf" : "md"}`,
      downloadFileName: `Strakhov_Denys_Acme_Backend_CoverLetter.${artifactType.endsWith("_pdf") ? "pdf" : "md"}`,
      isLatest,
      version: 1,
      mimeType: artifactType.endsWith("_pdf") ? "application/pdf" : "text/markdown",
      fileSizeBytes: 100,
      createdAt: "2026-09-04T00:00:00.000Z",
    };
  }

  it("findLatestCoverLetterPdfDownloadUrl returns the download URL for the latest cover_letter_pdf artifact", () => {
    const artifacts = [makeArtifact("cover_letter_pdf", "cl-pdf-1")];
    expect(findLatestCoverLetterPdfDownloadUrl(artifacts)).toBe("/api/artifacts/cl-pdf-1/download");
  });

  it("findLatestCoverLetterPdfDownloadUrl returns null when no cover_letter_pdf artifact exists", () => {
    const artifacts = [makeArtifact("cover_letter_md", "cl-md-1")];
    expect(findLatestCoverLetterPdfDownloadUrl(artifacts)).toBeNull();
  });

  it("findLatestCoverLetterPdfDownloadUrl returns null when the artifact is not isLatest", () => {
    const artifacts = [makeArtifact("cover_letter_pdf", "cl-pdf-old", false)];
    expect(findLatestCoverLetterPdfDownloadUrl(artifacts)).toBeNull();
  });
});

describe("buildArtifactCards", () => {
  function makeArtifact(overrides: Partial<WorkspaceArtifactSummary> = {}): WorkspaceArtifactSummary {
    return {
      id: "artifact-1",
      artifactType: "vacancy_source",
      canonicalFileName: "00_vacancy_source.txt",
      downloadFileName: "SOURCE_acme_dev.txt",
      isLatest: true,
      version: 1,
      mimeType: "text/plain",
      fileSizeBytes: 123,
      createdAt: "2026-07-19T12:34:56.000Z",
      ...overrides,
    };
  }

  it("maps a source artifact to kind 'source'", () => {
    const [card] = buildArtifactCards([makeArtifact()]);
    expect(card.kind).toBe("source");
    expect(card.ext).toBe("txt");
    expect(card.date).toBe("2026-07-19");
    expect(card.downloadUrl).toBe("/api/artifacts/artifact-1/download");
  });

  it("infers kind 'pdf' from the file extension regardless of artifactType", () => {
    const [card] = buildArtifactCards([
      makeArtifact({ artifactType: "cv_export_pdf", canonicalFileName: "04_cv_export.pdf" }),
    ]);
    expect(card.kind).toBe("pdf");
  });

  it("infers kind 'check' from the artifactType", () => {
    const [card] = buildArtifactCards([
      makeArtifact({ artifactType: "pre_pdf_check_json", canonicalFileName: "03_pre_pdf_check.json" }),
    ]);
    expect(card.kind).toBe("check");
  });

  it("passes through isLatest: true from the artifact summary", () => {
    const [card] = buildArtifactCards([makeArtifact({ isLatest: true })]);
    expect(card.isLatest).toBe(true);
  });

  it("passes through isLatest: false from the artifact summary", () => {
    const [card] = buildArtifactCards([makeArtifact({ isLatest: false })]);
    expect(card.isLatest).toBe(false);
  });
});

describe("buildMainActionCard — last step error (ISSUE-307)", () => {
  const input = {
    status: "paused_before_export",
    currentDecision: "apply",
    originalDecision: "apply",
    reviewState: "approved",
    score: 8,
    skipReasonSummary: null,
  };

  it("shows step error banner and keeps step button", () => {
    const message = "PDF export failed: the PDF renderer (Chromium) could not run. Retry the step.";

    const withError = buildMainActionCard({
      ...input,
      lastStepErrorStep: "export",
      lastStepErrorMessage: message,
    });
    const withoutError = buildMainActionCard(input);

    expect(withError.stepError).toBe(message);
    expect(withError.buttons).toEqual(withoutError.buttons);
    expect(withError.buttons.length).toBeGreaterThan(0);
  });

  it("hides the banner of a step the workspace has moved past", () => {
    const stale = {
      ...input,
      status: "cv_pdf_generated",
      lastStepErrorStep: "prompt_3",
      lastStepErrorMessage: "Pre-PDF check failed: network error",
    };

    expect(buildMainActionCard(stale).stepError).toBeUndefined();
    expect(buildMainActionCard({ ...stale, status: "pre_pdf_check_ready" }).stepError).toBe(
      "Pre-PDF check failed: network error",
    );
  });

  it("keeps the CV generation error where a regenerate can be re-run", () => {
    const failed = {
      ...input,
      lastStepErrorStep: "prompt_2",
      lastStepErrorMessage: "CV generation failed: network error",
    };

    for (const status of ["pre_pdf_check_ready", "paused_before_export", "cv_draft_ready"]) {
      expect(buildMainActionCard({ ...failed, status }).stepError).toBe(
        "CV generation failed: network error",
      );
    }
    expect(buildMainActionCard({ ...failed, status: "cv_pdf_generated" }).stepError).toBeUndefined();
  });

  it("hides error banner when no step error", () => {
    expect(buildMainActionCard(input).stepError).toBeUndefined();
    expect(buildMainActionCard({ ...input, lastStepErrorMessage: null }).stepError).toBeUndefined();
    expect(buildMainActionCard({ ...input, lastStepErrorMessage: "" }).stepError).toBeUndefined();
  });
});

// ADR-046 item 4 / ISSUE-717 INV-1: the legacy view is frozen. The snapshot below was written by the
// view model before the experimental labels were added; it is never regenerated to make a change pass.
describe("legacy recommendation view baseline", () => {
  const DECISION_PAIRS: ReadonlyArray<{ current: string | null; original: string | null }> = [
    { current: null, original: null },
    { current: "apply", original: "apply" },
    { current: "skip", original: "skip" },
    { current: "skip", original: "apply" },
    { current: "manual_override_apply", original: "skip" },
    { current: "apply", original: null },
  ];
  const REVIEW_STATES: ReadonlyArray<string | null> = [null, "pending_review"];
  const ANALYSIS_ARTIFACT: WorkspaceArtifactSummary = {
    id: "artifact-analysis",
    artifactType: "vacancy_analysis_json",
    canonicalFileName: "01_vacancy_analysis.json",
    downloadFileName: "01_vacancy_analysis.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 100,
    createdAt: "2026-11-01T00:00:00.000Z",
  };
  const POLICY: WorkspaceAnalysisPolicy = {
    decision: "maybe",
    score: 61,
    advisoryDecision: "apply",
    advisoryDiffers: true,
    borderline: true,
    borderlineReasons: ["score_margin"],
    manualReviewRequired: true,
    decidingRule: "S2",
    openQuestions: [{ condition: "work_authorisation", note: "Not stated." }],
    policyVersion: "1.0.0",
  };

  function legacyViewLines(analysisStrategy: string | undefined, withPolicy = false): string[] {
    const lines: string[] = [];
    for (const status of ALL_STATUSES) {
      for (const { current, original } of DECISION_PAIRS) {
        for (const reviewState of REVIEW_STATES) {
          const artifacts = status === "failed" ? [ANALYSIS_ARTIFACT] : [];
          const strategyFields = {
            ...(analysisStrategy === undefined ? {} : { analysisStrategy }),
            ...(withPolicy ? { analysisPolicy: POLICY } : {}),
          };
          const workspace = {
            id: "ws-1",
            status,
            currentDecision: current,
            originalDecision: original,
            workspaceSlug: "acme_backend_dev",
            createdAt: "2026-07-26T00:00:00.000Z",
            updatedAt: "2026-07-26T00:00:00.000Z",
            company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
            jobVacancy: { id: "jv-1", roleTitleOriginal: "Backend Dev", roleSlug: "backend_dev" },
            reviewState,
            score: 64,
            skipReasonSummary: "Not a fit",
            lastStepErrorStep: null,
            lastStepErrorMessage: null,
            lastStepErrorAt: null,
            manualNotes: [],
            manualNoteForcedClaims: [],
            manualNoteForcedClaimsUnreadable: [],
            artifacts,
            activeJob: null,
            ...strategyFields,
          } as unknown as WorkspaceDetail;
          const card = buildMainActionCard({
            status,
            currentDecision: current,
            originalDecision: original,
            reviewState,
            score: 64,
            skipReasonSummary: "Not a fit",
            cvPdfDownloadUrl: "/download/design",
            cvAtsPdfDownloadUrl: "/download/ats",
            lastStepErrorStep: "prompt_1",
            lastStepErrorMessage: "Analysis failed",
            ...strategyFields,
          });
          const stages = buildStages(status, current, artifacts, original, reviewState, analysisStrategy);
          const key = `${status}|${current}|${original}|${reviewState}`;
          lines.push(`${key} ${JSON.stringify({ header: buildStatusHeaderData(workspace), card, stages })}`);
        }
      }
    }
    return lines;
  }

  it("keeps the legacy recommendation view unchanged", () => {
    const legacy = legacyViewLines("legacy");
    expect(legacy).toMatchSnapshot();
    expect(legacyViewLines(undefined)).toEqual(legacy);
    expect(legacyViewLines("legacy", true)).toEqual(legacy);
  });
});

describe("experimental policy recommendation (ADR-046 item 4)", () => {
  const POLICY: WorkspaceAnalysisPolicy = {
    decision: "maybe",
    score: 61,
    advisoryDecision: "apply",
    advisoryDiffers: true,
    borderline: true,
    borderlineReasons: ["score_margin"],
    manualReviewRequired: false,
    decidingRule: "S2",
    openQuestions: [],
    policyVersion: "1.0.0",
  };

  function experimentalWorkspace(overrides: Partial<WorkspaceDetail> = {}): WorkspaceDetail {
    return {
      ...LEGACY_DETAIL_FIELDS,
      analysisStrategy: "b",
      forkedFromWorkspaceId: "ws-source",
      comparisonGroupId: "ws-source",
      analysisPolicy: POLICY,
      id: "ws-fork",
      status: "paused_after_analysis",
      currentDecision: "maybe",
      originalDecision: "maybe",
      workspaceSlug: "acme_backend_dev_fork_1",
      createdAt: "2026-11-27T00:00:00.000Z",
      updatedAt: "2026-11-27T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: { id: "jv-1", roleTitleOriginal: "Backend Dev", roleSlug: "backend_dev" },
      reviewState: null,
      score: 61,
      skipReasonSummary: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      manualNotes: [],
      manualNoteForcedClaims: [],
      manualNoteForcedClaimsUnreadable: [],
      artifacts: [],
      activeJob: null,
      ...overrides,
    };
  }

  it("labels the policy recommendation and the advisory decision", () => {
    for (const analysisStrategy of ["b", "c"] as const) {
      const card = buildMainActionCard({
        status: "paused_after_analysis",
        currentDecision: "maybe",
        originalDecision: "maybe",
        reviewState: null,
        score: 61,
        skipReasonSummary: null,
        analysisStrategy,
        analysisPolicy: POLICY,
      });
      expect(card.subtitle).toBe("Recommendation (policy): maybe");
      expect(card.subtitle).not.toContain("AI recommendation");
      expect(card.meta).toEqual([
        { label: "recommendation (policy)", value: "maybe" },
        { label: "advisory (model)", value: "apply" },
        { label: "score", value: 61 },
        { label: "decision", value: "—" },
      ]);

      const header = buildStatusHeaderData(experimentalWorkspace({ analysisStrategy }));
      expect(header.recommendationLabel).toBe("recommendation (policy)");
      expect(header.recommendation).toBe("maybe");
      expect(header.decision).toBe("—");

      const { stages } = buildStages("paused_after_analysis", "maybe", [], "maybe", null, analysisStrategy);
      expect(stages[2].badges).toEqual([
        { label: "recommendation (policy)", value: "maybe" },
        { label: "decision", value: "—" },
      ]);
    }

    // A skip override keeps the policy label, and a human decision still fills the decision badge.
    const overridden = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "skip",
      originalDecision: "maybe",
      reviewState: "approved",
      score: 61,
      skipReasonSummary: null,
      analysisStrategy: "c",
      analysisPolicy: POLICY,
    });
    expect(overridden.subtitle).toBe(
      "Recommendation (policy): maybe — decision manually overridden to skip",
    );
    expect(overridden.meta?.find((item) => item.label === "decision")?.value).toBe("skip");
  });

  it("shows no policy rows before the analysis", () => {
    const fresh = experimentalWorkspace({
      analysisStrategy: "c",
      analysisPolicy: undefined,
      status: "source_saved",
      currentDecision: null,
      originalDecision: null,
      score: null,
    });
    expect(() => buildStatusHeaderData(fresh)).not.toThrow();
    expect(buildStatusHeaderData(fresh).recommendation).toBe("—");

    const sourceSaved = buildMainActionCard({
      status: "source_saved",
      currentDecision: null,
      originalDecision: null,
      reviewState: null,
      score: null,
      skipReasonSummary: null,
      analysisStrategy: "c",
      analysisPolicy: null,
    });
    expect(sourceSaved.meta).toBeUndefined();

    // An unreadable `01c` (no policy fields) after the analysis: the label stays, no advisory row.
    const withoutPolicy = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "apply",
      originalDecision: "apply",
      reviewState: null,
      score: 70,
      skipReasonSummary: null,
      analysisStrategy: "b",
    });
    expect(withoutPolicy.meta?.map((item) => item.label)).toEqual([
      "recommendation (policy)",
      "score",
      "decision",
    ]);
    expect(withoutPolicy.meta?.some((item) => item.label === "advisory (model)")).toBe(false);
  });
});

describe("experimental policy skip wording (PR #726 review)", () => {
  const POLICY_SKIP: WorkspaceAnalysisPolicy = {
    decision: "skip",
    score: 48,
    advisoryDecision: "maybe",
    advisoryDiffers: true,
    borderline: false,
    borderlineReasons: [],
    manualReviewRequired: false,
    decidingRule: "H2",
    openQuestions: [],
    policyVersion: "1.0.0",
  };
  const skipCardInput = {
    status: "paused_after_analysis",
    currentDecision: "skip",
    score: 48,
    skipReasonSummary: null,
    analysisStrategy: "c",
    analysisPolicy: POLICY_SKIP,
  };

  it("shows a policy skip without manual-override wording", () => {
    const card = buildMainActionCard({ ...skipCardInput, originalDecision: "skip", reviewState: null });
    expect(card.subtitle).toBe("Recommendation (policy): skip");
    expect(card.subtitle).not.toContain("overridden");
    expect(card.meta).toEqual([
      { label: "recommendation (policy)", value: "skip" },
      { label: "advisory (model)", value: "maybe" },
      { label: "score", value: 48 },
      { label: "decision", value: "—" },
    ]);
    // The gate actions are unchanged: Approve still overrides the skip to apply, Skip confirms it.
    expect(card.buttons).toEqual([
      { id: "approve_analysis", label: "Approve (apply)", kind: "primary" },
      { id: "skip", label: "Skip", kind: "primary" },
    ]);

    const { stages } = buildStages("paused_after_analysis", "skip", [], "skip", null, "c");
    expect(stages[2].options).toEqual([
      { label: "Approve", state: "open" },
      { label: "Skip", state: "chosen", reason: undefined },
    ]);
    expect(stages[2].badges).toEqual([
      { label: "recommendation (policy)", value: "skip" },
      { label: "decision", value: "—" },
    ]);
  });

  it("keeps the manual-override wording for a real skip override", () => {
    const overridden = buildMainActionCard({
      ...skipCardInput,
      originalDecision: "apply",
      reviewState: "approved",
    });
    expect(overridden.subtitle).toBe(
      "Recommendation (policy): apply — decision manually overridden to skip",
    );
    expect(overridden.meta?.find((item) => item.label === "decision")?.value).toBe("skip");

    const { stages } = buildStages("paused_after_analysis", "skip", [], "apply", "approved", "b");
    expect(stages[2].options?.[1]).toEqual({
      label: "Skip",
      state: "chosen",
      reason: "Manually overridden to skip",
    });

    // Without a recorded human action the wording is not claimed, even if the values differ.
    const unreviewed = buildMainActionCard({ ...skipCardInput, originalDecision: "apply", reviewState: null });
    expect(unreviewed.subtitle).toBe("Recommendation (policy): apply");

    // Legacy keeps ADR-027's wording for any current skip (pinned by the baseline snapshot).
    const legacy = buildMainActionCard({
      ...skipCardInput,
      analysisStrategy: "legacy",
      analysisPolicy: null,
      originalDecision: "skip",
      reviewState: null,
    });
    expect(legacy.subtitle).toBe("AI recommendation: skip — decision manually overridden to skip");
  });
});
