# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-085

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

## Previously completed: TASK-084

Sixth component sub-task of the TASK-073 epic. Added `apps/web/src/components/checks-panel.tsx`, a
pure presentation component rendering two independent optional top-level `PipelineScreen` props:
`checks` (pre-PDF check, Prompt 3 — `not_run` or `result` with `readiness`/`suggestions`/
`blockers`/optional `findings[]`/`notes`) and `finalCheckPanel` (final check, Prompt 5 — `banner`/
`checks[]`/`emptySections[]`/`warnings[]`). Exact contracts extracted from mockups 06/07/08/13's
`<script type="text/x-dc">` `renderVals()` blocks via `node -e`. Findings-list rendering is driven
strictly by key presence (`'findings' in checks`), not by `compact` or array length, so mockup 08's
`compact: true` example (where `findings` is absent entirely) renders no findings section at all,
while a present-but-empty array renders an explicit "No findings." row. New types (`ChecksData`,
`ChecksFinding`, `ChecksReadiness`, `FindingSeverity`, `FinalCheckPanelData`,
`FinalCheckEmptySection`) added to `apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]`
in this task, and does not map real `pre-pdf-check.schema.ts`/`final-check.schema.ts` field names —
only their enum values were read to know what the component must be able to style. 195/195
`apps/web` tests pass (15 new in `checks-panel.spec.tsx`). Manual visual check used a temporary
preview route (deleted before commit) against the already-running dev server; no automated
screenshot tool (`chromium-cli`/Playwright) was available in this environment, so the project owner
opened the page directly and confirmed it rendered correctly. Archived verbatim to
`project-management/completed-tasks/TASK-084-checks-panel.md`.
