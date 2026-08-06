# Current Task

## TASK-085: Component: UpcomingStepsPanel (next-steps summary after PDF export)

Seventh component sub-task of the TASK-073 epic (full `apps/web` redesign). Found while parsing
mockup "09 - PDF generated" (2026-07-25): the `PipelineScreen` contract has a top-level `upcoming`
field not covered by any of the six components already built (TASK-075–079, TASK-084).

### Context

Epic TASK-073 progress so far, merged into `task/TASK-073-redesign-base`: TASK-075
(PipelineStages), TASK-076 (WorkspaceStatusHeader), TASK-077 (MainActionCard), TASK-078
(ArtifactList/ArtifactCard), TASK-079 (WorkspaceForm), TASK-080 (`/workspaces/new` assembly),
TASK-081 (`/workspaces/[id]` assembly), TASK-082 (`/workspaces` list assembly), TASK-083 (real
backend data mapping in `pipeline-view-model.ts`), TASK-084 (`ChecksPanel`, PR #150, merged
2026-07-31).

Exact contract, extracted from `docs/mockups/09-pdf-generated.html`'s
`<script type="text/x-dc">` `renderVals()` block via `node -e` (not guessed from the screenshot):

```js
upcoming: {
  finalCheck: { status: 'Not started' },
  coverLetter: { status: 'Not started' },
  tracking: { fields: ['Mark ready to apply','Applied via','Applied date','Notes',
                        'Submitted CV artifact','Submitted cover letter artifact'] }
}
```

Mockup 09 only shows `status: 'Not started'` for both `finalCheck` and `coverLetter` (both are
P1/Phase-2 steps per ADR-009/ADR-010, so "not started" is a normal terminal state here, not an
error) — but `status` must render as an arbitrary string, not a hardcoded literal (a future mockup
may show "Skipped" or a completion date). `tracking.fields` is a static list of field labels for a
future tracking form preview (not the form itself — the real form is TASK-089's `TrackingPanel`,
a separate component; do not conflate the two).

### Files Affected

- `apps/web/src/components/upcoming-steps-panel.tsx` (new)
- `apps/web/src/components/upcoming-steps-panel.spec.tsx` (new)
- `apps/web/src/lib/types.ts` (new types: `UpcomingStepsData`, `UpcomingStepStatus`,
  `UpcomingTrackingData`)

### Docs to Read

- `docs/mockups/09-pdf-generated.html` `<script type="text/x-dc">` block (contract already
  extracted above).
- `apps/web/src/components/checks-panel.tsx` + `checks-panel.spec.tsx` (TASK-084) — sibling
  "status summary" component, style/structure pattern to follow.
- `apps/web/src/lib/types.ts` lines ~90–135 — existing type conventions
  (`ChecksData`/`FinalCheckPanelData` etc.) to match when adding the new `Upcoming*` types.

### Key Invariants

- Pure presentation component: takes `upcoming` as a prop, does not decide when a workspace has
  reached "PDF generated", and does not compute status strings itself — that mapping work belongs
  to `pipeline-view-model.ts` (TASK-083's pattern), not this component.
- `finalCheck.status` / `coverLetter.status` render as-is, for any string value — must not
  hardcode or special-case the literal `'Not started'`.
- `tracking.fields[]` renders as an ordered list of plain labels (no form controls) — order
  preserved, arbitrary length.
- Not wired into `/workspaces/[id]` (TASK-081) in this task — standalone component, same pattern
  as TASK-075–079/084.
- Only one real example exists (`'Not started'` for both steps) — do not invent other status
  values or a "done" visual treatment; if a future mockup shows a different status, that's a
  follow-up, not something to guess now.

### Acceptance Criteria

- [x] Renders `finalCheck.status` and `coverLetter.status` as given, for any string value.
- [x] Renders `tracking.fields[]` as a labeled list/preview, preserving order, for arbitrary length.
- [x] Renders correctly against the exact mockup "09" example.

### Test Requirement

`upcoming-steps-panel.spec.tsx` (Vitest + RTL): mockup-09 fixture, plus at least one alternate
`status` value (e.g. `'Done'`) proving the `'Not started'` literal is not hardcoded.

### Done Definition

`UpcomingStepsPanel` can be dropped onto a page with a mock `upcoming` prop and renders correctly
independent of real workspace data.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-085 ..."`
3. `git push -u origin task/TASK-085-upcoming-steps-panel`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

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
