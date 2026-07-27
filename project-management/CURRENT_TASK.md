# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-081

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

## Previously completed: TASK-080

Screen: assemble `/workspaces/new` from `WorkspaceForm` — sixth sub-task of the TASK-073 epic, and
the first integration sub-task (the first time a standalone component from TASK-075–079 is wired
into a real route). Rewrote `apps/web/src/app/workspaces/new/page.tsx` to render TASK-079's
`WorkspaceForm` (from `@/components/workspace-form`), wrapping it in a real call to the existing
`createWorkspaceAction` server action and owning `errors`/`isSubmitting`/success state at the page
level. On successful creation, renders a `success` screen per mockup "02 - Workspace created"
(green checkmark banner, workspace slug/folder path/vacancy source fields, "View workspace" link to
`/workspaces/${result.id}`) — folded directly into `page.tsx` rather than its own component, per the
backlog's guidance for this small single-use shape. Deleted the superseded TASK-056 files
(`workspace-form.tsx`/`workspace-form.spec.tsx` in the route folder); their test cases were migrated
into a new `page.spec.tsx` (ADR-020). `actions.ts` reused unchanged — no `POST /workspaces` API
contract change. 131/131 `apps/web` tests pass. Manual end-to-end smoke test performed against a
real `apps/api` + Postgres backend — real workspace created, success screen visually confirmed
against `docs/mockups/02-workspace-created-screenshot.png` by the project owner. Archived verbatim
to `project-management/completed-tasks/TASK-080-workspace-new-screen.md`.
