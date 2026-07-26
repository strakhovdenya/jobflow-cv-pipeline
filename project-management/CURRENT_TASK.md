# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-079

Component: WorkspaceForm — fifth implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/workspace-form.tsx` renders the "01 - New workspace" mockup's `form`
variant (company/role/source-URL/vacancy-text fields plus a live `storage/applications/<slug>/
00_vacancy_source.txt` preview path via the existing `previewWorkspaceSlug` helper, unchanged from
TASK-056). Unlike the old inline form, it does not call the creation API itself — it calls an
`onSubmit(input: CreateWorkspaceInput): void` callback prop (mirroring `MainActionCard`'s
`onAction` convention) plus optional `errors`/`isSubmitting` props, so TASK-080 can wire in the
real server action and mockup "02"'s post-create success screen without touching this component
again. Following the same pattern as TASK-075/076/077/078, this is a standalone presentational
component only — not yet wired into the real `/workspaces/new` route (still TASK-056's
implementation unchanged). Visual direction confirmed by the project owner against
`docs/mockups/01-new-workspace-screenshot.png` with no revision rounds needed. `/code-review` found
and fixed one bug: company/role names were submitted untrimmed (whitespace-only input would pass
both the HTML `required` attribute and the backend's untrimmed `IsNotEmpty` check), now trimmed
like `sourceUrl` already was. 131/131 `apps/web` tests pass (7 new). Archived verbatim to
`project-management/completed-tasks/TASK-079-workspace-form.md`.

## Recommended next

Per `TASK_BOARD.md`: **TASK-080** (Screen: assemble `/workspaces/new` from `WorkspaceForm`), on a
new branch off the epic base branch `task/TASK-073-redesign-base` (already exists) — per the
branch-sequencing rule (ADR-025), wait until TASK-079's own PR has merged into the base branch
before branching TASK-080 off it. Awaiting explicit user selection before starting.
