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

  it("matches mockup 04's decision-stage options while still deciding (AI recommended apply)", () => {
    const { stages } = buildStages("paused_after_analysis", "apply");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve · apply", state: "next", reason: undefined },
      {
        label: "Approve · maybe",
        state: "pruned",
        reason: 'AI recommended "apply", not "maybe" — disabled',
      },
      { label: "Pause", state: "open" },
      { label: "Skip", state: "open" },
    ]);
  });

  it("matches mockup 10's decision-stage options for an unconfirmed skip override", () => {
    const { stages } = buildStages("paused_after_analysis", "skip");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve · apply", state: "pruned" },
      { label: "Approve · maybe", state: "pruned" },
      { label: "Pause", state: "open" },
      { label: "Skip", state: "chosen", reason: "Manually overridden to skip" },
    ]);
  });

  it("matches mockup 11's decision-stage options for the terminal skipped status (not the unconfirmed-override shape)", () => {
    const { stages } = buildStages("skipped", "skip");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve · apply", state: "pruned" },
      { label: "Approve · maybe", state: "pruned" },
      { label: "Pause", state: "pruned" },
      { label: "Skip", state: "chosen", reason: undefined },
    ]);
  });

  it("matches mockup 05's resolved decision-stage options once past the decision stage", () => {
    const { stages } = buildStages("cv_generation_running", "apply");
    const decisionStage = stages[2];
    expect(decisionStage.options).toEqual([
      { label: "Approve · apply", state: "chosen", reason: undefined },
      { label: "Approve · maybe", state: "pruned", reason: undefined },
      { label: "Pause", state: "pruned" },
      { label: "Skip", state: "pruned" },
    ]);
  });

  it("matches mockup 06's cvreview-stage options while still deciding", () => {
    const { stages } = buildStages("cv_draft_ready", "apply");
    const cvReviewStage = stages[4];
    expect(cvReviewStage.options).toEqual([
      { label: "Approve", state: "next" },
      { label: "Pause", state: "open" },
      { label: "Not worth applying", state: "open" },
      { label: "Regenerate", state: "open" },
    ]);
  });

  it("matches mockup 09's resolved cvreview-stage options once past the cvreview stage", () => {
    const { stages } = buildStages("cv_pdf_generated", "apply");
    const cvReviewStage = stages[4];
    expect(cvReviewStage.options).toEqual([
      { label: "Approve", state: "chosen" },
      { label: "Pause", state: "pruned" },
      { label: "Not worth applying", state: "pruned" },
      { label: "Regenerate", state: "pruned" },
    ]);
  });

  it("does not populate decision options before any decision exists", () => {
    const { stages } = buildStages("analysis_running", null);
    expect(stages[2].options).toBeUndefined();
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
      "Review the analysis result and decide apply/maybe/skip/pause",
    );
  });
});

describe("buildStatusHeaderData", () => {
  it("maps a WorkspaceDetail into WorkspaceStatusHeaderData", () => {
    const workspace: WorkspaceDetail = {
      id: "ws-1",
      status: "paused_after_analysis",
      currentDecision: "apply",
      workspaceSlug: "acme_backend_dev",
      createdAt: "2026-07-26T00:00:00.000Z",
      company: { id: "co-1", nameOriginal: "Acme", companySlug: "acme" },
      jobVacancy: { id: "jv-1", roleTitleOriginal: "Backend Dev", roleSlug: "backend_dev" },
      reviewState: "pending",
      score: 8,
      skipReasonSummary: null,
      updatedAt: "2026-07-26T00:00:00.000Z",
      artifacts: [],
    };

    const header = buildStatusHeaderData(workspace);

    expect(header).toEqual({
      company: "Acme",
      role: "Backend Dev",
      slug: "acme_backend_dev",
      statusLabel: statusLabel("paused_after_analysis"),
      decision: "apply",
      score: 8,
      reviewState: "pending",
      nextAction: nextActionLabel("paused_after_analysis", "apply"),
    });
  });
});

describe("buildMainActionCard", () => {
  it("matches mockup 04's shape when the AI recommended apply", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "apply",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.title).toBe("Analysis review");
    expect(card.meta).toEqual([
      { label: "recommendation", value: "apply" },
      { label: "score", value: 75 },
    ]);
    const applyButton = card.buttons.find((b) => b.label === "Approve (apply)");
    const maybeButton = card.buttons.find((b) => b.label === "Approve (maybe)");
    expect(applyButton?.kind).toBe("primary");
    expect(maybeButton?.kind).toBe("disabled");
  });

  it("matches mockup 10's shape for an unconfirmed skip override", () => {
    const card = buildMainActionCard({
      status: "paused_after_analysis",
      currentDecision: "skip",
      score: 75,
      skipReasonSummary: null,
    });
    expect(card.buttons.some((b) => b.label === "Confirm skip")).toBe(true);
    expect(card.buttons.find((b) => b.label === "Skip")?.kind).toBe("primary");
  });

  it("matches mockup 11's select/reasonNote shape for status skipped", () => {
    const card = buildMainActionCard({
      status: "skipped",
      currentDecision: "skip",
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
