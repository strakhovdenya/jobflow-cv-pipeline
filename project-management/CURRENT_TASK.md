# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-083

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

## Previously completed: TASK-082

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
