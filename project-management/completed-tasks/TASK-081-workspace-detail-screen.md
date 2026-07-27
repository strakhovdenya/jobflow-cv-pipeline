# Current Task

## TASK-081 — Screen: assemble /workspaces/[id] from PipelineStages + WorkspaceStatusHeader + MainActionCard + ArtifactList

**Context:** Second integration sub-task of the TASK-073 epic (branch `task/TASK-081-workspace-
detail-screen`, off `task/TASK-073-redesign-base`) — the epic's main deliverable. Assembles
TASK-075 (`PipelineStages`), TASK-076 (`WorkspaceStatusHeader`), TASK-077 (`MainActionCard`) and
TASK-078 (`ArtifactList`/`ArtifactCard`) into the real `/workspaces/[id]` page, replacing the
scattered, independently-styled gate/panel sections (TASK-073 pain point #1) for the core
`source_saved -> cv_pdf_generated` pipeline flow, across all 18 real `WorkspaceStatus` values (not
just the three states shown in mockups "03"/"04"/"05").

**Mockup reference:** `docs/mockups/03-source-saved-screenshot.png`,
`docs/mockups/04-analysis-review-screenshot.png`, `docs/mockups/05-cv-generation-screenshot.png`,
`docs/mockups/06-cv-draft-ready-screenshot.png`, `docs/mockups/09-pdf-generated-screenshot.png`,
`docs/mockups/10-skip-confirm-skip-screenshot.png`, `docs/mockups/11-skip-skipped-final-screenshot.png`,
`docs/mockups/12-cover-letter-generated-final-screenshot.png`,
`docs/mockups/13-final-check-pdf-ready-screenshot.png` (pattern-establishing only; most statuses
assembled here are extrapolated, not directly mocked up — see `docs/mockups/README.md`). Fields
introduced by later mockups with no owning component yet (`checks`, `upcoming`, `actionsPanel`,
`coverLetterPanel`, `trackingPanel`, `finalCheckPanel` — owned by TASK-084/085/087/088/089,
none of which exist yet) are explicitly **not** built here.

**Files affected:**

```text
apps/web/src/lib/pipeline-view-model.ts               (new — status -> stages/mainCard/
                                                         header/artifacts mock mapping)
apps/web/src/lib/pipeline-view-model.spec.ts           (new)
apps/web/src/app/workspaces/[id]/main-action-panel.tsx (new — client wrapper owning
                                                          interactive state, wires
                                                          MainActionCard buttons to the
                                                          existing actions.ts server actions;
                                                          see Progress Notes — renamed from a
                                                          broader workspace-pipeline-view.tsx)
apps/web/src/app/workspaces/[id]/main-action-panel.spec.tsx (new)
apps/web/src/app/workspaces/[id]/page.tsx              (rewritten to assemble a two-column
                                                          PipelineStages sidebar +
                                                          WorkspaceStatusHeader/
                                                          MainActionPanel/ArtifactList content
                                                          column, keeping the legacy panels
                                                          below — see Progress Notes)
apps/web/src/app/workspaces/[id]/analysis-review-gate.tsx      (deleted — folded in)
apps/web/src/app/workspaces/[id]/cv-draft-review-gate.tsx      (deleted — folded in)
apps/web/src/app/workspaces/[id]/pipeline-actions.tsx(+.spec)  (deleted — folded in)
apps/web/src/app/workspaces/[id]/analysis-triggers.tsx(+.spec) (deleted — folded in)
apps/web/src/app/workspaces/[id]/async-analysis-trigger.tsx(+.spec) (deleted — folded in)
apps/web/src/app/workspaces/[id]/artifact-viewer.tsx(+.spec)   (deleted — replaced by ArtifactList)
```

Kept unchanged (no owning replacement component exists yet — TASK-084/085/087/088/089):
`pre-pdf-check-panel.tsx`, `final-check-panel.tsx`, `cover-letter-panel.tsx`,
`application-tracking-panel.tsx`, `error-list.tsx`, `actions.ts`.

**Docs to Read:**

- `apps/web/src/components/pipeline-stages.tsx`, `workspace-status-header.tsx`,
  `main-action-card.tsx`, `artifact-list.tsx`/`artifact-card.tsx` — prop contracts (read).
- `apps/web/src/lib/types.ts` — `Stage`/`Progress`/`WorkspaceStatusHeaderData`/
  `MainActionCardData`/`ArtifactCardData` shapes (read).
- `apps/web/src/lib/api.ts` — `WorkspaceDetail`/`WorkspaceArtifactSummary` shapes, all
  action-triggering functions and their result types (read).
- `docs/03_domain_model.md` §5.1/8.6 — full `WorkspaceStatus` enum (18 values) (read).
- `docs/07_task_backlog.md` TASK-081/TASK-083 entries and `docs/mockups/README.md` (read).

**Key Invariants:**

- This task uses **mock/placeholder mapping** for stage positions and main-action-card
  enable/disable reasoning (real `review-gates.service.ts` business rules land in TASK-083).
  Button *click handlers* are wired to the real, already-existing `actions.ts` server actions
  (no new backend calls invented) since that wiring is free/mechanical, not business-rule
  mapping.
- No backend/state-machine changes.
- Must remain self-contained/tab-ready per EPIC-26.
- Legacy panels with no owning replacement component yet (pre-PDF check, final check, cover
  letter, application tracking) are kept rendered below the new assembly, unchanged — deleting
  them now would be a functional regression with nothing to replace them, not an
  intentionally-deferred mock.

**Acceptance Criteria:**

- [x] All 11 pipeline stages/statuses render a coherent `PipelineStages` + `WorkspaceStatusHeader`
      + `MainActionCard` + `ArtifactList` assembly, not just the three mocked-up states.
- [x] Pain point #1 (scattered gate/action UI) is fixed for the core pipeline flow on this screen.
- [x] Existing Vitest+RTL tests for replaced components are migrated/rewritten (ADR-020), not
      orphaned.

**Test Requirement:**

- Component tests for the assembled page/view across representative statuses: `source_saved`,
  `paused_after_analysis`, `cv_generation_running`, `paused_after_cv_draft`, `cv_pdf_generated`
  (plus `pipeline-view-model.spec.ts` covering all 18 statuses' stage-index mapping).
- Manual smoke test driving a real workspace through several real statuses against a real
  `apps/api` + Postgres backend, recorded in `TEST_LOG.md`.

**Done Definition:**

A user can look at `/workspaces/[id]` at any real status and immediately understand where the
workspace is, what happened, and what can happen next.

**Progress Notes:**

- **Layout was initially wrong and corrected mid-task.** The first implementation stacked
  `PipelineStages`, `MainActionCard` and `ArtifactList` vertically in a single column. Visual
  comparison against `docs/mockups/03-source-saved-screenshot.png` (done with the project owner,
  since no Chromium/Playwright tooling is available in this environment) showed the real mockup is
  a **two-column layout**: a fixed-width `PipelineStages` sidebar (~280px) beside a content column
  holding `WorkspaceStatusHeader`/`MainActionCard`/`ArtifactList`. Restructured `page.tsx`
  accordingly (`grid-cols-[280px_1fr]`) and narrowed the client wrapper from a broad
  `WorkspacePipelineView` (owned stages+card+artifacts) to `MainActionPanel` (owns only the card +
  dispatch logic), since `PipelineStages`/`ArtifactList` need no client-side interactivity and now
  render directly from the server component.
- **Stage-level branching `options[]` were missing entirely from the first pass** — the
  `decision`/`cvreview` stages rendered as plain labels instead of the branching option lists
  (`→ Approve · apply`, greyed `Approve · maybe`, etc.) that are `PipelineStages`' actual
  pain-point-#5 feature. Caught during the same visual review. Fixed by extracting the exact
  `options[]` shapes (state values `next`/`pruned`/`chosen`/`open`, reason text) from mockups
  04/05/06/09/10/11's `<script type="text/x-dc">` data contracts (read via `node -e`, per
  `docs/mockups/README.md`) and implementing `buildDecisionOptions()`/`buildCvReviewOptions()` to
  match verbatim rather than inventing wording.
- Once the exact mockup contracts were pulled, `mainCard`/`statusLabel`/stage-label wording was
  also tightened to match verbatim for the 6 statuses with a real mockup, rather than the
  paraphrased wording used in the first pass.
- **Known, deliberate limitation:** `MainActionCard`'s `select`/`reasonNote` inputs are
  uncontrolled per its already-merged TASK-077 contract (`onAction` receives only the clicked
  button's label, not current input values). This means "Override skip" always submits a fixed
  `apply` target with no reason note, regardless of what the user actually typed/selected — unlike
  the old `AnalysisReviewGate`/`CvDraftReviewGate`, which did capture these values. Not fixed here
  because it would require changing `MainActionCard`'s already-shipped contract; matches the
  backlog's established pattern of deferring "actual submit wiring" to TASK-083 for other
  not-yet-built panels.
- **Scope decision on mockup 10's `actionsPanel`:** mockup 10 (skip, unconfirmed) puts "Confirm
  skip" in a separate `actionsPanel` field owned by TASK-087 (not yet built). Rather than leaving
  the confirm-skip action functionally unreachable in this task, it was folded as an extra button
  into `mainCard` for that one sub-case — a deliberate, called-out compromise, not a silent scope
  merge with TASK-087.
- **Bug found and fixed during self-review:** the mockup-literal "Download CV PDF" button label
  (status `cv_pdf_generated`) had no dispatch handler, so clicking it did nothing. Fixed by adding
  `findLatestCvPdfDownloadUrl()` and wiring the button to a real download navigation; confirmed via
  the manual smoke test (real PDF downloaded).
- **Bug found and fixed by `/code-review`:** `buildDecisionOptions()` conflated status `skipped`
  with `paused_after_analysis` + `currentDecision: 'skip'` (both map to `activeIndex === 2`), so
  the terminal `skipped` screen (mockup 11) incorrectly rendered `Pause` as `open` and `Skip` with
  a `"Manually overridden to skip"` reason tooltip — both belonging only to the mid-flow,
  unconfirmed-override screen (mockup 10). Fixed by passing `status` into `buildDecisionOptions()`
  and checking `status !== "skipped"` explicitly, rather than inferring from `activeIndex` alone.
  Added a regression test (`pipeline-view-model.spec.ts`) exercising `buildStages("skipped", "skip")`
  specifically, since no existing test caught this.
- **Fragility flagged by `/code-review` (fixed):** `decisionButton()` inferred which decision
  ("apply" vs "maybe") a disabled-reason string referred to via `label.includes("apply")` — worked
  today only because those are the sole two labels in use, but would silently produce the wrong
  wording if a label changed. Replaced with an explicit `decisionOptionValue: "apply" | "maybe"`
  parameter instead of inferring from the label string.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-081 ..."`
3. `git push -u origin task/TASK-081-workspace-detail-screen`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.
