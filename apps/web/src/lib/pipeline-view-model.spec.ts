import { describe, expect, it } from "vitest";
import {
  buildArtifactCards,
  buildMainActionCard,
  buildStages,
  buildStatusHeaderData,
  nextActionLabel,
  statusLabel,
} from "./pipeline-view-model";
import type { WorkspaceArtifactSummary, WorkspaceDetail } from "@/lib/api";

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
      manualNotes: [],
      manualNoteForcedClaims: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
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
    });
  });

  // Found live during TASK-091's Flow variant 2 re-run: review-gates.service.ts's overrideSkip()
  // sets currentDecision to the distinct VacancyDecision.manual_override_apply/maybe/skip enum
  // value (an audit-trail distinction from a plain apply/maybe/skip) — the "decision" pill was
  // showing that raw enum value unformatted.
  it("strips the manual_override_ prefix from recommendation/decision (post Override-skip)", () => {
    const workspace: WorkspaceDetail = {
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
      manualNotes: [],
      manualNoteForcedClaims: [],
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
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
});
