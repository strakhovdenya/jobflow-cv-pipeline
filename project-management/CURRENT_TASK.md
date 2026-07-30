# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-082

Screen: assemble `/workspaces` list — third integration sub-task of the TASK-073 epic, and the
first mockup in the epic NOT built on the shared `PipelineScreen` component. Rewrote
`apps/web/src/app/workspaces/page.tsx` to render a new `apps/web/src/components/workspace-list.tsx`
instead of the previous plain `<table>`, per `docs/mockups/14-workspaces-list.html`/`-screenshot.png`.
`WorkspaceListItem` (`apps/web/src/lib/api.ts`) gained `score`/`updatedAt` fields — the backend
already returned them, this was a frontend type-narrowing gap only, no backend change needed.
`workspace-list.tsx` reuses the existing `statusLabel()` from `pipeline-view-model.ts` (all 19 real
`WorkspaceStatus` values) instead of copying the mockup's own partial (11-status) label map, and
adds its own status→color-category mapping covering all 19 values explicitly.
`needsReview` is derived generically as `status.startsWith('paused_')`. Also corrected a
pre-existing "18 vs 19 real WorkspaceStatus values" off-by-one found in project documentation while
reading the schema (not fixed project-wide, out of scope; this task's own docs/tests use the
correct count of 19). 174/174 `apps/web` tests pass (16 new in `workspace-list.spec.tsx`, 2 new in
a first-ever `page.spec.tsx` for this route). Manual visual comparison: project owner opened the
real running `/workspaces` page (26 real workspaces) against the mockup screenshot and confirmed
layout/status pills/needs-review highlighting/decision colors all match; one wording difference
(real `statusLabel()` text vs. the mockup's shorter strings) was flagged and explicitly confirmed
acceptable, per the task's own planned Key Invariant. Archived verbatim to
`project-management/completed-tasks/TASK-082-workspaces-list-screen.md`.

## Previously completed: TASK-081

Screen: assemble `/workspaces/[id]` from `PipelineStages` + `WorkspaceStatusHeader` +
`MainActionCard` + `ArtifactList` — second integration sub-task of the TASK-073 epic, and its main
deliverable. Rewrote `apps/web/src/app/workspaces/[id]/page.tsx` as a two-column layout (fixed-width
`PipelineStages` sidebar + a content column holding `WorkspaceStatusHeader`/`MainActionPanel`/
`ArtifactList`) — corrected mid-task from an initial single-column stack after visual comparison
against the mockup screenshots showed the real layout is two-column. New
`apps/web/src/lib/pipeline-view-model.ts` maps all 18 real `WorkspaceStatus` values to
`stages`/`mainCard`/`artifacts`, including the `decision`/`cvreview` stage branching `options[]`
(the actual pain-point-#5 branching-visualization feature, also missing from the first pass and
added after visual review) — wording and structure for the 6 statuses with a real mockup taken
verbatim from each mockup's data contract. New `apps/web/src/app/workspaces/[id]/main-action-panel.tsx`
(client wrapper) dispatches `MainActionCard` button clicks to the existing real `actions.ts` server
actions. Deleted `analysis-review-gate.tsx`, `cv-draft-review-gate.tsx`, `pipeline-actions.tsx`,
`analysis-triggers.tsx`, `async-analysis-trigger.tsx`, `artifact-viewer.tsx` (+ specs) — folded into
the new assembly, tests migrated (ADR-020). Kept `pre-pdf-check-panel.tsx`, `final-check-panel.tsx`,
`cover-letter-panel.tsx`, `application-tracking-panel.tsx` unchanged below the new assembly — their
owning replacement components (TASK-084/088/089) don't exist yet. 155/155 `apps/web` tests pass.
Self-review found and fixed a real bug (the mockup-literal "Download CV PDF" button had no dispatch
handler). Manual end-to-end smoke test against a real `apps/api` + Postgres backend — two real
workspaces driven by the project owner through `source_saved → cv_pdf_generated` (real AI analysis
call, real CV generation, real PDF export and download), confirming the branching stage options and
resolved/pruned states match mockups 04/05/06/09 exactly. Archived verbatim to
`project-management/completed-tasks/TASK-081-workspace-detail-screen.md`; see its "Progress Notes"
for the full list of mid-task corrections.
