import { describe, expect, it, vi } from "vitest";
import { buildMainActionCard } from "@/lib/pipeline-view-model";
import { createMainActionHandlers } from "./main-action-handlers";

vi.mock("./actions", () => ({
  runAnalysisAction: vi.fn(),
  submitReviewDecisionAction: vi.fn(),
  overrideSkipAction: vi.fn(),
  submitCvDraftReviewAction: vi.fn(),
  generateCvContentAction: vi.fn(),
  exportCvAction: vi.fn(),
  confirmSkipAction: vi.fn(),
}));

const STATUSES = [
  "source_saved",
  "analysis_running",
  "paused_after_analysis",
  "analysis_ready",
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
const DECISIONS = [null, "apply", "maybe", "skip"];

const context = {
  workspaceId: "workspace-1",
  currentDecision: null,
  cvPdfDownloadUrl: "/design.pdf",
  cvAtsPdfDownloadUrl: "/ats.pdf",
  navigate: vi.fn(),
};

describe("createMainActionHandlers", () => {
  it("has a handler for every button id buildMainActionCard can emit", () => {
    const handlers = createMainActionHandlers(context);
    const emitted = new Set<string>();
    for (const status of STATUSES) {
      for (const currentDecision of DECISIONS) {
        const card = buildMainActionCard({
          status,
          currentDecision,
          originalDecision: currentDecision,
          reviewState: null,
          score: null,
          skipReasonSummary: null,
          cvPdfDownloadUrl: "/design.pdf",
          cvAtsPdfDownloadUrl: "/ats.pdf",
        });
        for (const button of card.buttons) emitted.add(button.id);
      }
    }

    expect(emitted.size).toBeGreaterThan(0);
    for (const id of emitted) {
      expect(handlers, `no handler for ${id}`).toHaveProperty(id);
    }
  });

  it("navigates to the matching download url", () => {
    const navigate = vi.fn();
    const handlers = createMainActionHandlers({ ...context, navigate });
    const design = handlers.download_cv_design;
    const ats = handlers.download_cv_ats;
    if (design.kind !== "navigate" || ats.kind !== "navigate") {
      throw new Error("download handlers must be navigate handlers");
    }

    design.go();
    ats.go();

    expect(navigate.mock.calls).toEqual([["/design.pdf"], ["/ats.pdf"]]);
  });

  it("does not navigate when a download url is missing", () => {
    const navigate = vi.fn();
    const handlers = createMainActionHandlers({
      ...context,
      cvPdfDownloadUrl: null,
      cvAtsPdfDownloadUrl: null,
      navigate,
    });
    for (const id of ["download_cv_design", "download_cv_ats"] as const) {
      const handler = handlers[id];
      if (handler.kind !== "navigate") throw new Error(`${id} must navigate`);
      handler.go();
    }

    expect(navigate).not.toHaveBeenCalled();
  });
});
