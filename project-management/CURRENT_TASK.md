# Current Task

## TASK-091 — Manual verification pass: re-run TASK-072's real historical flow variants against the redesigned UI

Last sub-task of the TASK-073 epic, run after TASK-074 and before the epic's single final PR from
`task/TASK-073-redesign-base` into `main` (per ADR-025). Every TASK-073 epic component now exists
and is wired to real backend data (TASK-075–085, TASK-087–089, TASK-083), and TASK-074's fix means
the final-check-after-cover-letter ordering hazard found during TASK-072 no longer blocks Flow
variant 3. This task is the redesign's own equivalent of TASK-072: TASK-072 verified the
pre-redesign UI against real historical flows before TASK-073 started; this task re-verifies the
same flows against the finished redesigned UI before the epic merges to `main`, confirming the
redesign preserves — not just visually replaces — the underlying pipeline logic.

## Execution protocol (agreed 2026-08-02)

Human-in-the-loop manual pass, not browser automation. For each step of each flow variant: Claude
Code posts the next concrete step in chat (exact screen + action, taken from the TASK-072
`TEST_LOG.md` scripts) together with the expected result; the project owner performs that step in
the real `apps/web` UI and replies with a screenshot plus a short comment (matches / doesn't match
/ anything unexpected); Claude Code compares against the expected result before moving to the next
step. Only after all steps of all four flow variants are walked does Claude Code write the
consolidated `TEST_LOG.md` entry (matching TASK-072's per-flow format) and, if any small in-place
fixes were made per this task's Key Invariants, include them in the same commit.

## Flows to re-run

- **Flow variant 1** ("Hired — Fullstack Developer", apply → CV → pre-PDF check → export): clean
  PASS in TASK-072. Re-run against the redesigned `/workspaces/[id]` (PipelineStages +
  WorkspaceStatusHeader + MainActionCard + ArtifactList + ChecksPanel) to confirm identical
  end-state behavior through the new components.
- **Flow variant 2** ("6037 — Senior Back-End Engineer", skip, override-driven): PASS in TASK-072,
  already re-confirmed once during TASK-083. Re-run once more here as part of the complete set,
  since TASK-083's re-run predates TASK-084/087/088/089's components landing.
- **Flow variant 3** ("Monpay — Fullstack Engineer", maybe → CV → pre-PDF check → export → cover
  letter): PASS in TASK-072 but with a finding filed as TASK-074 (final check permanently blocked
  once cover letter generated first). Re-run and additionally exercise running the final check
  *after* the cover letter, confirming it now succeeds and that `PipelineStages` still shows the
  `final` stage (not silently omitted).
- **Flow variant 4** ("SME Careers — Full Stack Engineer", maybe → CV → pre-PDF check → export →
  final check): PASS in TASK-072, confirming correct ordering (final check before cover letter)
  already worked. Re-run to confirm the redesigned `ChecksPanel`/`UpcomingStepsPanel` still reflect
  this correctly.

Any new gap found specific to the redesigned UI (not a re-confirmation of an already-known/fixed
issue) gets filed as its own follow-up backlog task, per TASK-072's own established discipline.

## Docs to Read

- `project-management/TEST_LOG.md` 2026-07-21 TASK-072 Flow variant 1–4 entries — the exact
  screen → action → expected scripts this task re-runs.
- `project-management/TEST_LOG.md` 2026-07-30 TASK-083 entry — Flow variant 2's earlier partial
  re-check, not to be duplicated without adding new coverage.
- `project-management/TEST_LOG.md` 2026-08-02 TASK-074 entry — the fix Flow variant 3 specifically
  re-validates.
- `apps/web/src/app/workspaces/[id]/page.tsx` and its assembled panels (`main-action-panel.tsx`,
  `pre-pdf-check-panel.tsx`, `final-check-panel.tsx`, `cover-letter-panel.tsx`,
  `application-tracking-panel.tsx`) — confirmed already wired to real data as of TASK-083/084/087/
  088/089.

## Key Invariants

- This task re-runs **existing known-good flows**; it does not invent new ones. Goal is regression
  parity between old and new UI, not new coverage.
- Minor bugs found during this pass (label wrong, button gating off-by-one, visual glitch) may be
  fixed directly within this task rather than always filed as separate follow-ups — unlike
  TASK-072's stricter rule. Anything bigger (backend status-guard logic, new tests beyond the
  existing suite) still gets filed as its own task.
- Flow variant 3's re-run is the actual functional verification of TASK-074's fix — if this manual
  re-run still shows the final check blocked or the `final` stage missing after cover-letter
  generation, that is a real gap in TASK-074's fix, not a new/separate bug.

## Acceptance Criteria

- [ ] All four TASK-072 flow variants re-driven end-to-end through the real redesigned `apps/web`
      UI against a real `apps/api` backend, each outcome recorded in `TEST_LOG.md` following
      TASK-072's per-flow entry format.
- [ ] Flow variant 3 additionally confirms: (a) running the final check after the cover letter now
      succeeds, and (b) `PipelineStages` still lists the `final` stage in that scenario.
- [ ] Any small UI bug found (label, gating, visual glitch) is fixed within this task and covered
      by the existing test suite passing; anything larger is filed as its own new backlog task.

## Test Requirement

- This task *is* the test — a recorded manual pass in `project-management/TEST_LOG.md` covering
  all four flow variants against the redesigned UI, matching TASK-072's level of detail.
- If any in-place fix is made, `npm run test` for `apps/web` (and `apps/api` if a backend fix was
  also needed) must still pass in full afterward.

## Done Definition

All four flow variants from TASK-072 are confirmed working end-to-end through the finished
redesigned UI, with TASK-074's fix specifically re-validated via Flow variant 3, before the
TASK-073 epic's final PR from `task/TASK-073-redesign-base` into `main` is opened.

## Progress Notes (added during implementation, 2026-08-03)

Diverged from the original scope above in two ways, both explicitly requested and confirmed by the
project owner mid-pass, during Flow variant 1's manual re-run:

1. **UI layout fixes beyond "small, obviously-safe" wording tweaks** — matches the Key Invariants'
   allowance for in-place fixes, but larger than a label/off-by-one:
   - `pre-pdf-check-panel.tsx`'s rendered position moved from below `ArtifactList` (bottom of page)
     to directly under `MainActionPanel`, matching `docs/mockups/06-cv-draft-ready.html` and
     `07-pre-pdf-check-result.html`'s actual layout (mainCard → checks → artifacts, not
     mainCard → artifacts → checks).
   - `final-check-panel.tsx` + `cover-letter-panel.tsx` moved from full-width stacked sections below
     `ArtifactList` into a 2-column grid inside the top card, directly under `PrePdfCheckPanel` and
     above `ArtifactList` — both are simultaneously visible at `cv_pdf_generated` and were previously
     easy to miss at the bottom of a long page.
2. **A real backend behavior change, not just a UI fix** — filed as **ADR-026** (supersedes ADR-009
   for Prompt 3 only): the pre-PDF check is now a mandatory-but-skippable gate before export, not a
   parallel optional action. `CvDraftReviewAction.approve` now targets `pre_pdf_check_ready` instead
   of `export_running`; a new `POST /workspaces/:id/skip-pre-pdf-check` endpoint
   (`ReviewGatesService.skipPrePdfCheck`) clears the gate without running the AI check;
   `DocumentExportService.exportCv()` accepts `paused_before_export` (new) or `export_running`
   (legacy, kept for backward compatibility) as its precondition. See ADR-026 for the full design
   and reasoning. This is bigger than the Key Invariants' "small in-place fix" allowance (it touches
   backend status-guard logic and required new tests) — the project owner was explicitly asked to
   confirm this before proceeding, given it overrides an existing Accepted ADR, and confirmed twice.

3. **A second real backend + design change, found during Flow variant 2's re-run** — filed as
   **ADR-027**: the Analysis review card's "Approve · apply"/"Approve · maybe" buttons collapsed
   into a single "Approve" button (label mirrors `currentDecision`; the disabled twin was pure
   visual noise since `review-gates.service.ts`'s own guards mean only one could ever be
   clickable), "Pause" was removed from this card (a no-op at this stage), and a new
   `override_to_apply` review action + `ApplicationWorkspace.originalDecision` field (migration
   `20260803122702_add_original_decision`) were added so approving past a skip recommendation is
   possible without losing the AI's original call. This also fixed a real bug found live: the
   badge shown as "recommendation"/"decision" in three places (`MainActionCard` meta,
   `WorkspaceStatusHeader` pills, and the new `PipelineStages` sidebar `badges`) previously
   conflated `currentDecision` (the AI's own call) with an actual human decision, showing e.g.
   "decision: apply" before any human had acted. All three now consistently show `recommendation`
   (from `originalDecision`, immutable) and `decision` (from `currentDecision`, but only once
   `reviewState` is non-null — placeholder "—" otherwise) as two always-rendered badges. Separately,
   badges across the app (`MetaPill`, `FieldPill`, `StageBadgeItem`) were restyled pill-shaped/
   filled/borderless to stay visually distinct from actual buttons, which kept their existing
   bordered/rectangular style — the two had become visually ambiguous once badges started
   appearing in the sidebar next to the (now single) Approve/Skip options. See ADR-027 for full
   design and reasoning. Like ADR-026, this exceeds the Key Invariants' "small in-place fix"
   allowance and was explicitly confirmed by the project owner before implementation (including a
   dedicated confirmation for the schema migration).

4. **A small in-place bug found live during Flow variant 2's re-run**: the single Approve button
   (ADR-027) was labeled `Approve (${currentDecision})`, so once `currentDecision` was overridden
   to `skip`, the button read "Approve (skip)" even though clicking it actually calls
   `override_to_apply` (approves *to* apply, past the skip recommendation) — a misleading label
   that read as a no-op. Fixed in `pipeline-view-model.ts`/`main-action-panel.tsx`: the label (and
   the dispatch-map key, which must stay in sync since the label doubles as the lookup key) now
   says `Approve (apply)` whenever `currentDecision === "skip"`. Covered by an updated
   `pipeline-view-model.spec.ts` assertion.

5. **A third real UX + backend-orchestration change, found during Flow variant 2's re-run** —
   filed as **ADR-028**: the separate "Confirm skip" click was removed. A single "Skip" button now
   drives both `change_to_skip` and `confirm-skip` in one click (`main-action-panel.tsx`'s new
   `skipWorkspace()` calls them in sequence, only skipping `change_to_skip` on the `analysis_ready`
   retry path where the decision is already flagged skip). This is **frontend-only** — both backend
   endpoints and their preconditions/error-rollback behavior (ADR-016) are unchanged; only the
   forced two-click UI gate was removed, since `confirm-skip` still makes a real, potentially-
   failing AI call and needed to stay a distinct request. See ADR-028 for full reasoning. Like
   ADR-026/027, explicitly requested and confirmed by the project owner before implementation.

6. **A follow-up cleanup found live right after ADR-028**: `WorkspaceStatusHeader`'s fourth pill
   (`review`, the raw `reviewState` enum) was removed — the project owner noticed it showed
   `review: overridden` immediately after clicking "Skip" (before "Override skip" was ever
   touched), which reads as if the skip had already been undone. It actually meant something
   unrelated ("a human decision overrode the AI's recommendation"), and was fully redundant once
   `recommendation`/`decision` are both always-rendered — comparing the two already conveys the
   same information without the confusing label. See ADR-027's 2026-08-03 follow-up note for full
   detail. `MainActionCard`/`PipelineStages` never had this pill, so only `WorkspaceStatusHeader`
   changed.

7. **A second raw-enum display bug, found live testing "Override skip" on a throwaway workspace**:
   `review-gates.service.ts`'s pre-existing `overrideSkip()` (predates this task) sets
   `currentDecision` to `manual_override_apply`/`maybe`/`skip` (an audit-trail distinction from
   plain `apply`/`maybe`/`skip`), and once ADR-027 made the decision badge always-rendered, it
   showed that raw value unformatted (e.g. "decision: manual_override_apply"). Fixed with a
   `displayDecision()` helper that strips the `manual_override_` prefix for display only, applied
   to `buildStatusHeaderData`, `buildMainActionCard`'s meta/subtitle, and `buildStages`' sidebar
   badges. Covered by two new regression tests. See ADR-027's second 2026-08-03 follow-up note.

All three ADR-level changes (ADR-026, ADR-027, ADR-028) plus the three small fixes (the "Approve
(skip)" label bug, the redundant "review" pill removal, and the manual_override_ prefix leak) are
covered by the full test suite (`apps/api` 654/654, `apps/web` 223/223, both apps'
`tsc --noEmit`/`lint` clean) and were manually
re-verified live through Flow variants 1 and 2's re-runs before continuing to Flow variants 3–4.
Flow variants 3 and 4 (not yet run as of this note) must additionally expect: the ADR-026 pre-PDF-
check gate (Approve → Pre-PDF check ready → Run/Skip → Ready to export → Export PDF, instead of the
old direct Approve → Export PDF path in TASK-072's original `TEST_LOG.md` entries) at their
CV-draft-review step, and the ADR-027 single-Approve-button + recommendation/decision badges (no
separate `review` pill) at their analysis-review step (both flows use "Approve (apply)" via the
fake provider's canned `apply` recommendation, same substitution TASK-072 already documented — not
a new gap). ADR-028 does not affect Flow variants 3/4, since neither reaches a skip decision.

## Git Instructions

1. `git add <files>`
2. `git commit -m "test: TASK-091 ..."`
3. `git push -u origin task/TASK-091-manual-verification-pass`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Does not do anything else.
