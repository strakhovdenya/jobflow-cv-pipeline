# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-080

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

## Recommended next

Per `TASK_BOARD.md`: **TASK-081** (Screen: assemble `/workspaces/[id]` from PipelineStages +
WorkspaceStatusHeader + MainActionCard + ArtifactList), on a new branch off the epic base branch
`task/TASK-073-redesign-base` — per the branch-sequencing rule (ADR-025), wait until TASK-080's own
PR has merged into the base branch before branching TASK-081 off it. Awaiting explicit user
selection before starting.
