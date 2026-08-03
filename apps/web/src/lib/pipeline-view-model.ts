import type {
  ArtifactCardData,
  ArtifactKind,
  MainActionCardData,
  Progress,
  Stage,
  StageBadge,
  StageKey,
  StageOption,
  WorkspaceStatusHeaderData,
} from "@/lib/types";
import type { WorkspaceArtifactSummary, WorkspaceDetail } from "@/lib/api";
import { downloadUrl } from "@/lib/artifact-download";

/**
 * status -> stages/mainCard/artifacts mapping. Wording/structure for the 6 statuses with a real
 * mockup (source_saved, paused_after_analysis, cv_generation_running, cv_draft_ready,
 * cv_pdf_generated, skipped) is taken verbatim from that mockup's `<script type="text/x-dc">` data
 * contract (docs/mockups/03,04,05,06,09,10,11). Every other real WorkspaceStatus value is
 * extrapolated by the same pattern.
 *
 * Button enabled/disabled/pruned state is derived from the real backend preconditions (TASK-083),
 * not guessed:
 * - apply/maybe approve buttons: `review-gates.service.ts` `submitDecision()` requires
 *   `currentDecision` to already equal the action's target ("apply"/"maybe") — set by Prompt 1's
 *   AI recommendation.
 * - pause / change-to-skip: unconditional in `submitDecision()` (skip only rejected once
 *   `currentDecision` is already "skip").
 * - "Confirm skip": `skip-reason.service.ts confirmSkip()` requires status
 *   `paused_after_analysis` or `analysis_ready`, and `currentDecision === "skip"`.
 * - "Override skip": `review-gates.service.ts overrideSkip()` requires status `skipped`.
 * - CV draft approve/pause/mark-not-worth-applying: `submitCvDraftReview()` only checks status is
 *   `cv_draft_ready`/`paused_after_cv_draft` — no decision-based disabling.
 *
 * `analysis_ready` and `failed` are handled specially — see their definitions below.
 */

interface StageDef {
  key: StageKey;
  label: string;
}

// Exact labels() from docs/mockups/04-analysis-review.html.
const STAGE_DEFS: StageDef[] = [
  { key: "source", label: "Source saved" },
  { key: "analysis", label: "Analysis" },
  { key: "decision", label: "Analysis review" },
  { key: "cvgen", label: "CV generation" },
  { key: "cvreview", label: "CV draft review" },
  { key: "prepdf", label: "Pre-PDF check" },
  { key: "export", label: "Export PDF" },
  { key: "pdfgen", label: "PDF generated" },
  { key: "final", label: "Final check" },
  { key: "cover", label: "Cover letter" },
  { key: "tracking", label: "Application tracking" },
];

const STATUS_STAGE_INDEX: Record<string, number> = {
  source_saved: 0,
  analysis_running: 1,
  // `analysis_ready` is only reached as a rollback from skip-reason.service.ts confirmSkip() when
  // the AI call/validation fails while currentDecision is "skip" — never on the successful Prompt 1
  // path (prompt1.service.ts goes analysis_running -> paused_after_analysis directly). It is the
  // same review moment as paused_after_analysis, not a variant of "waiting for analysis".
  analysis_ready: 2,
  paused_after_analysis: 2,
  skipped: 2,
  cv_generation_running: 3,
  cv_draft_ready: 4,
  paused_after_cv_draft: 4,
  pre_pdf_check_ready: 5,
  paused_before_export: 6,
  export_running: 6,
  cv_pdf_generated: 7,
  final_check_ready: 8,
  cover_letter_generated: 9,
  ready_to_apply: 10,
  applied: 10,
  rejected: 10,
  archived: 10,
};

/**
 * `failed` (workspace-status.service.ts TRANSITIONS) is only reachable from analysis_running,
 * cv_generation_running or export_running. Infer which one from the furthest real artifact type
 * already present on the workspace — no new backend field needed, `artifacts[]` is already part of
 * WorkspaceDetail.
 */
const ANALYSIS_ARTIFACT_TYPES = new Set(["vacancy_analysis_md", "vacancy_analysis_json"]);
const CV_CONTENT_ARTIFACT_TYPES = new Set(["targeted_cv_content_md", "targeted_cv_content_json"]);
/**
 * cover_letter_generated (index 9) sits after the `final` stage (index 8) in STATUS_STAGE_INDEX,
 * but final check is now optionally runnable *after* cover letter generation too (TASK-074) — so
 * an index-only "done" derivation would falsely mark `final` as done even when it never ran. Check
 * real artifact presence instead whenever this ambiguity is possible.
 *
 * Only `final_check_json` counts: prompt5.service.ts writes `final_check_md` unconditionally
 * (even on AI JSON-validation failure) but registers `final_check_json` only on success — same
 * convention `cover-letter-panel.tsx`'s `hasCoverLetterArtifact` and `final-check-panel.tsx`'s
 * `latestJsonArtifactId` already follow. Counting the `.md` artifact too would mark `final` "done"
 * after a failed attempt, contradicting `final-check-panel.tsx`'s own `hasResult` (JSON-only),
 * which would still correctly show the "Run final check" button and error.
 */
function hasFinalCheckArtifact(artifacts: WorkspaceArtifactSummary[]): boolean {
  return artifacts.some((artifact) => artifact.artifactType === "final_check_json");
}

function inferFailedStageIndex(artifacts: WorkspaceArtifactSummary[]): number {
  const types = new Set(artifacts.map((artifact) => artifact.artifactType));
  const has = (kinds: Set<string>) => [...kinds].some((kind) => types.has(kind));

  if (has(CV_CONTENT_ARTIFACT_TYPES)) return STATUS_STAGE_INDEX.export_running;
  if (has(ANALYSIS_ARTIFACT_TYPES)) return STATUS_STAGE_INDEX.cv_generation_running;
  return STATUS_STAGE_INDEX.analysis_running;
}

const STATUS_LABELS: Record<string, string> = {
  source_saved: "Source saved",
  analysis_running: "Analysis running",
  analysis_ready: "Analysis ready",
  paused_after_analysis: "Paused after analysis",
  skipped: "Skipped",
  cv_generation_running: "CV generation running",
  cv_draft_ready: "CV draft ready",
  paused_after_cv_draft: "Paused after CV draft review",
  pre_pdf_check_ready: "Pre-PDF check ready",
  paused_before_export: "Paused before export",
  export_running: "Export running",
  cv_pdf_generated: "PDF generated",
  final_check_ready: "Final check ready",
  cover_letter_generated: "Cover letter generated",
  ready_to_apply: "Ready to apply",
  applied: "Applied",
  rejected: "Rejected",
  archived: "Archived",
  failed: "Failed",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function nextActionLabel(status: string, currentDecision: string | null): string {
  if ((status === "paused_after_analysis" || status === "analysis_ready") && currentDecision === "skip") {
    return "Confirm the skip decision";
  }

  const table: Record<string, string> = {
    source_saved: "Start analysis",
    analysis_running: "Waiting for analysis to complete",
    // Reachable only via a failed confirm-skip retry (skip-reason.service.ts) — currentDecision is
    // always "skip" in practice, so the special case above normally wins over this fallback.
    analysis_ready: "Skip confirmation failed previously — retry Confirm skip, or change the decision",
    paused_after_analysis: "Review the analysis result and decide apply/maybe/skip/pause",
    skipped: "Override the skip decision if this vacancy should be reconsidered",
    cv_generation_running: "Waiting for CV draft generation to complete",
    cv_draft_ready: "Review the CV draft and decide approve/pause",
    paused_after_cv_draft: "Review the CV draft and decide approve/pause/regenerate",
    pre_pdf_check_ready: "Review the pre-PDF check result",
    paused_before_export: "Continue to export when ready",
    export_running: "Waiting for PDF export to complete",
    cv_pdf_generated: "Download the generated CV / proceed to next steps",
    final_check_ready: "Review the final check result",
    cover_letter_generated: "Review the generated cover letter",
    ready_to_apply: "Mark applied once you submit the application",
    applied: "Track the outcome (rejected/archived) once known",
    rejected: "Save rejection feedback or archive",
    archived: "No further action — workspace archived",
    failed: "A pipeline step failed — check logs and retry",
  };

  return table[status] ?? "No action defined for this status";
}

/**
 * ADR-027: mirrors the redesigned single-Approve-button `MainActionCard` (see
 * buildMainActionCard's `paused_after_analysis`/`analysis_ready` case) — one "Approve" option
 * instead of separate Approve·apply/Approve·maybe entries (only one could ever be clickable, since
 * currentDecision already fixes which), and no "Pause" (a no-op at this stage — see the comment on
 * that case). "Approve" stays available even when currentDecision is "skip", since
 * override_to_apply lets a human approve past a skip recommendation.
 */
function buildDecisionOptions(
  status: string,
  currentDecision: string | null,
  activeIndex: number,
): StageOption[] | undefined {
  const isDecisionCurrent = activeIndex === 2;
  const isPastDecision = activeIndex > 2;
  if (currentDecision === null || (!isDecisionCurrent && !isPastDecision)) {
    return undefined;
  }

  if (currentDecision === "skip") {
    // `status === "skipped"` is the terminal state (mockup 11, confirmed skip): "Approve" here
    // is only reachable via the separate "Override skip" recovery action, so it's shown as open
    // rather than chosen/pruned. `paused_after_analysis` with decision=skip is the mid-flow,
    // unconfirmed override (mockup 10, ADR-016): Skip explains why it was chosen.
    const isUnconfirmedOverride = isDecisionCurrent && status !== "skipped";
    return [
      { label: "Approve", state: "open" },
      {
        label: "Skip",
        state: "chosen",
        reason: isUnconfirmedOverride ? "Manually overridden to skip" : undefined,
      },
    ];
  }

  return [
    { label: "Approve", state: isPastDecision ? "chosen" : "next" },
    { label: "Skip", state: isPastDecision ? "pruned" : "open" },
  ];
}

/** Mirrors docs/mockups/06 (deciding) and 09 (already resolved) `cvreview` stage `options[]`. */
function buildCvReviewOptions(activeIndex: number): StageOption[] | undefined {
  if (activeIndex === 4) {
    return [
      { label: "Approve", state: "next" },
      { label: "Pause", state: "open" },
      { label: "Not worth applying", state: "open" },
      { label: "Regenerate", state: "open" },
    ];
  }
  if (activeIndex > 4) {
    return [
      { label: "Approve", state: "chosen" },
      { label: "Pause", state: "pruned" },
      { label: "Not worth applying", state: "pruned" },
      { label: "Regenerate", state: "pruned" },
    ];
  }
  return undefined;
}

export function buildStages(
  status: string,
  currentDecision: string | null,
  artifacts: WorkspaceArtifactSummary[] = [],
  originalDecision: string | null = null,
  reviewState: string | null = null,
): { stages: Stage[]; progress: Progress } {
  const activeIndex = status === "failed" ? inferFailedStageIndex(artifacts) : (STATUS_STAGE_INDEX[status] ?? 0);
  const decisionOptions = buildDecisionOptions(status, currentDecision, activeIndex);
  const cvReviewOptions = buildCvReviewOptions(activeIndex);
  // Same recommendation/decision distinction as buildMainActionCard's meta row and
  // buildStatusHeaderData's pills (ADR-027) — shown here too so the sidebar's Approve/Skip
  // options are legible without needing to look elsewhere for what was actually decided.
  const decisionBadges: StageBadge[] | undefined =
    decisionOptions !== undefined
      ? [
          { label: "recommendation", value: originalDecision ?? currentDecision ?? "—" },
          { label: "decision", value: reviewState != null ? (currentDecision ?? "—") : "—" },
        ]
      : undefined;
  const finalCheckDone = hasFinalCheckArtifact(artifacts);

  // cover_letter_generated (index 9) sits after `final` (index 8) in STATUS_STAGE_INDEX, but final
  // check is optionally runnable *after* cover letter generation too (TASK-074) — so `final` isn't
  // reliably done just because this status is further along. Other terminal statuses past `final`
  // (ready_to_apply/applied/rejected/archived) are unaffected: nothing in the real state machine
  // reaches them without final check already having run when it was the exclusive earlier gate.
  const finalMayBeUndone = status === "cover_letter_generated" && !finalCheckDone;

  const stages: Stage[] = STAGE_DEFS.map((def, index) => {
    const isPast = index < activeIndex;
    const state: Stage["state"] =
      def.key === "final" && isPast && finalMayBeUndone
        ? "upcoming"
        : isPast
          ? "done"
          : index === activeIndex
            ? "current"
            : "upcoming";
    return {
      n: index + 1,
      key: def.key,
      label: def.label,
      state,
      options: def.key === "decision" ? decisionOptions : def.key === "cvreview" ? cvReviewOptions : undefined,
      badges: def.key === "decision" ? decisionBadges : undefined,
    };
  });

  return {
    stages,
    progress: { step: activeIndex + 1, total: STAGE_DEFS.length },
  };
}

export function buildStatusHeaderData(workspace: WorkspaceDetail): WorkspaceStatusHeaderData {
  return {
    company: workspace.company.nameOriginal,
    role: workspace.jobVacancy.roleTitleOriginal,
    slug: workspace.workspaceSlug,
    statusLabel: statusLabel(workspace.status),
    recommendation: workspace.originalDecision ?? workspace.currentDecision ?? "—",
    // Mirrors buildMainActionCard's own meta row: currentDecision is the AI's own call until a
    // human action sets reviewState — showing it as "decision" before that would misleadingly
    // imply a human choice already exists.
    decision: workspace.reviewState != null ? (workspace.currentDecision ?? "—") : "—",
    score: workspace.score ?? "—",
    reviewState: workspace.reviewState ?? "—",
    nextAction: nextActionLabel(workspace.status, workspace.currentDecision),
  };
}

export interface MainActionCardInput {
  status: string;
  currentDecision: string | null;
  originalDecision: string | null;
  reviewState: string | null;
  score: number | null;
  skipReasonSummary: string | null;
}

export function buildMainActionCard({
  status,
  currentDecision,
  originalDecision,
  reviewState,
  score,
  skipReasonSummary,
}: MainActionCardInput): MainActionCardData {
  switch (status) {
    // docs/mockups/03-source-saved.html
    case "source_saved":
      return {
        title: "Source saved",
        subtitle: "Vacancy source captured and ready for analysis",
        buttons: [
          { label: "Start analysis", kind: "primary" },
          { label: "Start analysis (async)", kind: "secondary" },
        ],
      };

    case "analysis_running":
      return {
        title: "Analysis in progress",
        subtitle: "Waiting for the AI analysis to complete.",
        info: { kind: "info", text: "This page refreshes automatically once analysis finishes." },
        buttons: [],
      };

    // docs/mockups/04-analysis-review.html / 10-skip-confirm-skip.html
    //
    // ADR-027: a single "Approve" button replaces the old separate Approve·apply/Approve·maybe
    // buttons (one was always disabled, since currentDecision already fixes which one can
    // succeed — see review-gates.service.ts's own guards). Its label mirrors whatever
    // currentDecision currently is; the actual server action it triggers is resolved in
    // main-action-panel.tsx (approve_apply/approve_maybe/override_to_apply). "Pause" is removed
    // — review-gates.service.ts's own `pause` case is a no-op here (status and decision both stay
    // unchanged; we're already sitting at paused_after_analysis waiting on a decision).
    // `originalDecision` (immutable, set once by prompt1.service.ts) and `currentDecision`
    // (mutable via override) are shown as separate meta rows so a skip-override never loses the
    // AI's actual original call.
    case "paused_after_analysis":
    case "analysis_ready": {
      const isSkip = currentDecision === "skip";

      return {
        title: "Analysis review",
        subtitle: isSkip
          ? `AI recommendation: ${originalDecision ?? "—"} — decision manually overridden to skip`
          : `AI recommendation: ${originalDecision ?? currentDecision ?? "—"}`,
        // analysis_ready only happens when a previous Confirm skip attempt failed
        // (skip-reason.service.ts confirmSkip() rolls back to analysis_ready on AI/validation
        // error) — surface that so retrying isn't a mystery.
        info:
          status === "analysis_ready"
            ? { kind: "info", text: "The previous skip confirmation attempt failed — retry Confirm skip." }
            : undefined,
        meta: [
          // Falls back to currentDecision for workspaces analyzed before ADR-027's
          // originalDecision field existed (historical rows only — new analyses always set it).
          { label: "recommendation", value: originalDecision ?? currentDecision ?? "—" },
          { label: "score", value: score ?? "—" },
          // "decision" reflects a human choice, not the AI's own call — reviewState === null means
          // prompt1.service.ts has run but no human action has happened yet (approve/skip/override
          // all set reviewState explicitly). Show the placeholder rather than hiding the row, for
          // the same reason recommendation/score always render (consistent row set, no layout
          // jump once a decision is made).
          { label: "decision", value: reviewState != null ? (currentDecision ?? "—") : "—" },
        ],
        buttons: [
          { label: `Approve (${currentDecision ?? "—"})`, kind: "primary" },
          ...(isSkip
            ? [
                // ActionsPanel (TASK-087) doesn't exist yet — its one action is folded into
                // this card rather than left functionally unreachable (see TASK-081 Progress
                // Notes).
                { label: "Confirm skip", kind: "primary" as const },
              ]
            : [{ label: "Skip", kind: "secondary" as const }]),
        ],
      };
    }

    // docs/mockups/11-skip-skipped-final.html
    case "skipped":
      return {
        title: "Override skip",
        subtitle: "This workspace was skipped.",
        notice: skipReasonSummary ?? "Override to resume the pipeline.",
        select: { label: "Override to", value: "Apply" },
        reasonNote: true,
        reasonNoteLabel: "Reason note (optional)",
        buttons: [{ label: "Override skip", kind: "primary" }],
      };

    // docs/mockups/05-cv-generation.html
    case "cv_generation_running":
      return {
        title: "CV generation",
        subtitle: "Analysis approved. Generate the targeted CV draft.",
        info: { kind: "info", text: "CV generation is ready to start" },
        buttons: [{ label: "Generate CV draft", kind: "primary" }],
      };

    // docs/mockups/06-cv-draft-ready.html
    case "cv_draft_ready":
    case "paused_after_cv_draft":
      return {
        title: "CV draft review",
        subtitle: "Review the CV draft — approve to export, or pause",
        reasonNote: true,
        buttons: [
          { label: "Approve", kind: "primary" },
          { label: "Pause", kind: "secondary" },
          { label: "Mark not worth applying", kind: "secondary" },
          { label: "Regenerate CV draft", kind: "secondary" },
        ],
      };

    case "pre_pdf_check_ready":
      return {
        title: "Pre-PDF check ready",
        subtitle: "Review the pre-PDF check result below before exporting.",
        buttons: [],
      };

    case "paused_before_export":
      return {
        title: "Ready to export",
        info: { kind: "info", text: "Waiting to begin PDF export." },
        buttons: [{ label: "Export PDF", kind: "primary" }],
      };

    case "export_running":
      return {
        title: "Exporting PDF",
        buttons: [{ label: "Export PDF", kind: "primary" }],
      };

    // docs/mockups/09-pdf-generated.html
    case "cv_pdf_generated":
      return {
        title: "PDF generated",
        subtitle: "Export completed. Continue to final check, cover letter and application tracking.",
        buttons: [{ label: "Download CV PDF", kind: "primary" }],
      };

    case "final_check_ready":
      return {
        title: "Final check ready",
        info: { kind: "info", text: "Final check results are ready — see below." },
        buttons: [],
      };

    case "cover_letter_generated":
      return {
        title: "Cover letter generated",
        info: { kind: "info", text: "Cover letter generated — see below." },
        buttons: [],
      };

    case "ready_to_apply":
    case "applied":
    case "rejected":
    case "archived":
      return {
        title: statusLabel(status),
        subtitle: nextActionLabel(status, currentDecision),
        buttons: [],
      };

    case "failed":
      return {
        title: "Pipeline step failed",
        subtitle: "Check logs and retry.",
        buttons: [],
      };

    default:
      return {
        title: statusLabel(status),
        buttons: [],
      };
  }
}

const KIND_STAGE_LABEL: Record<ArtifactKind, string> = {
  source: "Source",
  analysis: "Analysis",
  cv: "CV",
  check: "Check",
  html: "Export",
  pdf: "Export",
};

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function inferArtifactKind(artifact: WorkspaceArtifactSummary, ext: string): ArtifactKind {
  if (ext === "pdf") return "pdf";
  if (ext === "html") return "html";
  if (artifact.artifactType.includes("cover_letter") || artifact.artifactType.includes("cv")) {
    return "cv";
  }
  if (artifact.artifactType.includes("check")) return "check";
  if (artifact.artifactType.includes("analysis")) return "analysis";
  return "source";
}

const CV_PDF_ARTIFACT_TYPES = new Set(["cv_export_pdf", "legacy_cv_pdf"]);

export function findLatestCvPdfDownloadUrl(artifacts: WorkspaceArtifactSummary[]): string | null {
  const artifact = artifacts.find((a) => CV_PDF_ARTIFACT_TYPES.has(a.artifactType) && a.isLatest);
  return artifact ? downloadUrl(artifact.id) : null;
}

export function buildArtifactCards(artifacts: WorkspaceArtifactSummary[]): ArtifactCardData[] {
  return artifacts.map((artifact) => {
    const ext = extensionOf(artifact.canonicalFileName);
    const kind = inferArtifactKind(artifact, ext);
    return {
      type: artifact.artifactType,
      kind,
      ext,
      version: artifact.version,
      date: artifact.createdAt.slice(0, 10),
      stage: KIND_STAGE_LABEL[kind],
      expanded: false,
      // Inline preview fetching against the real artifact content is TASK-083's job — this
      // task only needs artifacts to render and be downloadable.
      preview: "",
      downloadUrl: downloadUrl(artifact.id),
    };
  });
}
