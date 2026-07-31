# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-084

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

## Previously completed: TASK-083

Final integration sub-task of the TASK-073 epic wiring real backend data into
`apps/web/src/lib/pipeline-view-model.ts`'s `stages`/`mainCard`/`artifacts` mapping. Most of
TASK-081's mapping already matched the real `review-gates.service.ts`/`workspace-status.service.ts`
preconditions; fixed two real gaps found by reading the actual backend code: `analysis_ready` (only
reachable in practice as a rollback from a failed `confirm-skip` attempt in
`skip-reason.service.ts`, not a "waiting for analysis" state — was mismapped as the latter, a UI
dead end) now renders as the decision-stage skip-confirmation-retry variant of
`paused_after_analysis`; `failed` (only reachable from `analysis_running`/`cv_generation_running`/
`export_running` per `workspace-status.service.ts` TRANSITIONS) now infers its stage position from
the real `artifacts[]` already returned by the API, instead of a hardcoded index 0. `buildStages`
gained an `artifacts` parameter (`page.tsx` updated to pass it); `buildMainActionCard` did not need
it — its `failed` case is already status-generic. 180/180 `apps/web` tests pass (6 new in
`pipeline-view-model.spec.ts`). Investigated and closed out a TASK_BOARD.md forward-note about
"mapping cv_draft_ready to real evidence-guard data": `needs_evidence` markers are baked into the
`targeted_cv_content_md/json` artifact content itself (no separate structured field exists to wire)
and already flow through TASK-078's `ArtifactList` preview — nothing further needed or possible
without a new backend endpoint, which this task's Key Invariants ruled out. Manual verification
against a real `apps/api` + Postgres backend (`AI_PROVIDER=fake`): re-ran TASK-072 Flow 2 (skip,
override-driven) end-to-end with no regression, plus a direct-DB state simulation (since the fake
provider never actually fails) confirming both the `analysis_ready` retry UI and the `failed`
artifact-based stage inference render correctly. Archived verbatim to
`project-management/completed-tasks/TASK-083-real-backend-data.md`; see its "Progress Notes" for
the scope corrections against TASK_BOARD.md's older, partly-aspirational description of this task.
