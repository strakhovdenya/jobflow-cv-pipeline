# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-087

Eighth component sub-task of the TASK-073 epic. Added `apps/web/src/components/actions-panel.tsx`,
a pure presentation component rendering the top-level `actionsPanel` `PipelineScreen` field
(`title` + `buttons[]`), the "secondary pipeline step-trigger actions" card distinct from
`mainCard`. Reuses a new `ActionButtonRow` component exported from
`apps/web/src/components/main-action-card.tsx` (which itself wraps the already-existing
`ActionButton`, also newly exported) for the `kind` (primary/secondary/disabled+reason) button
row, rather than duplicating that JSX. `ActionButtonRow` was extracted during a same-session
`/code-review` pass that found the button-row block duplicated between the two components and the
`key={button.label}` pattern (copied from `MainActionCard`) not collision-safe — fixed by sharing
one component keyed by `` `${label}-${index}` ``; see the archived task's "Progress Notes" for
detail. New `ActionsPanelData` type added to `apps/web/src/lib/types.ts`, reusing the existing
`MainActionButton`/`ActionButtonKind` types. Not wired into `/workspaces/[id]` in this task. Exact
contract extracted from mockup 10's `<script type="text/x-dc">` block via `node -e` (`grep -c
actionsPanel docs/mockups/*.html` confirmed exactly one match). 203/203 `apps/web` tests pass (4
new in `actions-panel.spec.tsx`). No manual visual check performed — no dev server started, since
the component only reuses `MainActionCard`'s already visually-verified button styling. Archived
verbatim to `project-management/completed-tasks/TASK-087-actions-panel.md`.

## Previously completed: TASK-085

Seventh component sub-task of the TASK-073 epic. Added
`apps/web/src/components/upcoming-steps-panel.tsx`, a pure presentation component rendering the
top-level `upcoming` `PipelineScreen` field: `finalCheck.status` and `coverLetter.status` (short
status strings, rendered as-is for any value — not hardcoded to the mockup's `'Not started'`
literal) plus `tracking.fields[]` (a static, order-preserving preview list of the future
application-tracking form's field labels — not the form itself, which is TASK-089's
`TrackingPanel`). Exact contract extracted from mockup 09's `<script type="text/x-dc">`
`renderVals()` block via `node -e`. New types (`UpcomingStepsData`, `UpcomingStepStatus`,
`UpcomingTrackingData`) added to `apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in
this task. 199/199 `apps/web` tests pass (4 new in `upcoming-steps-panel.spec.tsx`, including an
explicit alternate-status test proving no literal is hardcoded). Manual visual check used a
temporary preview route (deleted before commit) against the already-running dev server; no
automated screenshot tool available in this environment, so the project owner opened the page
directly and confirmed correct rendering via screenshot. Archived verbatim to
`project-management/completed-tasks/TASK-085-upcoming-steps-panel.md`.
