# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-074

Penultimate sub-task of the TASK-073 epic — fixed final check (Prompt 5) becoming permanently
unreachable once a cover letter is generated first. Root cause: `prompt5-input-builder.service.ts`'s
`FINAL_CHECK_ALLOWED_STATUSES = ['cv_pdf_generated']` only, while
`cover-letter-input-builder.service.ts`'s own guard already allowed running after final check
(`final_check_ready`) — an asymmetric relationship. Since cover letter generation moves status to
the terminal `cover_letter_generated` (`WorkspaceStatusService.TRANSITIONS[cover_letter_generated]
= []`), generating it before final check permanently blocked Prompt 5 for that workspace. Fixed by
widening `FINAL_CHECK_ALLOWED_STATUSES` to include `cover_letter_generated`, mirroring the
cover-letter guard's symmetric allowance. Because that status is terminal, the usual "status leaves
the allowed list" one-shot lock used everywhere else (`cover-letter-panel.tsx`,
`pre-pdf-check-panel.tsx`, the original `cv_pdf_generated → final_check_ready` path) doesn't apply
here — added an explicit idempotency guard instead (`BadRequestException` if `05_final_check.json`
already exists for the workspace). `Prompt5Service` now keeps `workspaceStatus` at
`cover_letter_generated` on success from that entry point rather than regressing to
`final_check_ready`, which would have wrongly implied the cover letter needed regenerating and
conflicted with `cover-letter-panel.tsx`'s own status-based eligibility gate.

Frontend: `final-check-panel.tsx`'s "Run final check" button now shows at `cover_letter_generated`
only when no result exists yet (`hasResult`-driven, mirroring `cover-letter-panel.tsx`'s existing
pattern) and hides once one does. `pipeline-view-model.ts`'s `buildStages` previously derived every
stage's `done`/`current`/`upcoming` state purely from `STATUS_STAGE_INDEX` position — since
`cover_letter_generated` (index 9) sits after `final` (index 8), a workspace that reached
`cover_letter_generated` without ever running final check rendered the `final` stage as falsely
`"done"`. This was the deeper bug behind `docs/mockups/12-cover-letter-generated-final.html`
omitting the `final` stage entirely (10 stages instead of 11). Fixed by checking real final-check
artifact presence — but **narrowed during implementation** to apply only when status is exactly
`cover_letter_generated`, not to every status whose index sits past `final`'s: a broader
per-status-index check broke a pre-existing passing test expecting `archived` (and by extension
`ready_to_apply`/`applied`/`rejected`) to unconditionally mark all prior stages `"done"` with no
artifacts — those terminal statuses are not actually reachable without final check already having
run under today's real state machine, unlike `cover_letter_generated` (the one status TASK-072
proved reachable without it), so narrowing the check avoided a false regression while still fixing
the real bug. See the archived task's "Progress Notes" for detail.

A same-session `/code-review` found one bug in this fix: `hasFinalCheckArtifact()` originally
checked for `final_check_md` OR `final_check_json`, but `prompt5.service.ts` writes
`final_check_md` unconditionally — even when the AI returns invalid JSON and validation fails —
while `final_check_json` is registered only on success (same convention already followed by
`cover-letter-panel.tsx`'s `hasCoverLetterArtifact` and `final-check-panel.tsx`'s
`latestJsonArtifactId`). Counting the `.md` artifact meant a failed final-check attempt from
`cover_letter_generated` would still mark the `final` stage `"done"`, contradicting
`final-check-panel.tsx`'s own strictly-JSON-gated `hasResult`, which would correctly keep showing
the "Run final check" button and the error. Fixed by checking `final_check_json` only.

4 new backend unit tests (`prompt5-input-builder.service.spec.ts` x2, `prompt5.service.spec.ts`
x2), 1 new frontend component test (`final-check-panel.spec.tsx`), 2 new frontend unit tests
(`pipeline-view-model.spec.ts`). 643/643 `apps/api` tests pass, 210/210 `apps/web` tests pass, both
apps' `tsc --noEmit` and `lint` clean. No manual browser verification performed in this task — real
end-to-end re-validation of this fix through the actual UI is deferred to TASK-091's Flow variant 3
re-run, per its own explicit scope. Archived verbatim to
`project-management/completed-tasks/TASK-074-final-check-after-cover-letter.md`.

## Previously completed: TASK-089

Tenth component sub-task of the TASK-073 epic. Added `apps/web/src/components/tracking-panel.tsx`,
exporting `PresentationalTrackingPanel` — a pure presentation component rendering the top-level
`trackingPanel` `PipelineScreen` field: `{ textFields: [{ label }], selectFields: [{ label, value }] }`,
identical in shape across mockups 12 and 13 (only `selectFields[].value` differs between them).
Renders each `textFields[]` entry as a labeled read-only input and each `selectFields[]` entry as a
labeled disabled select pre-set to its `value`. The non-standard `PresentationalTrackingPanel` name
was chosen up front (not discovered mid-task like TASK-088's `PresentationalCoverLetterPanel`) —
before starting, `Glob` confirmed a fully-wired `ApplicationTrackingPanel` already exists at
`apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` (own state, server actions, own
`ArtifactSelect`), so the collision was avoided rather than fixed after the fact. Exact contract
extracted from mockups 12/13's `<script type="text/x-dc">` `renderVals()` blocks via `node -e`. New
types (`TrackingPanelData`, `TrackingTextField`, `TrackingSelectField`) added to
`apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task. This closes out the
epic's planned component sub-tasks — every component (TASK-075–079/084/085/087/088/089) is now
built; only TASK-074 (sequenced last) and the epic's final PR into `main` remain. A same-session
`/code-review` found one bug: both `textFields.map`/`selectFields.map` keyed rows and derived each
input/select `id` purely from `field.label`, with no index fallback — two same-labeled fields would
collide on both React `key` and DOM `id` (breaking the `<label htmlFor>` association for the
second), the same class of bug already fixed once in `main-action-card.tsx`/`ActionsPanel`
(TASK-087, `` `${label}-${index}` ``). Fixed by applying the identical `` `${label}-${index}` ``
pattern here. 207/207 `apps/web` tests pass (2 new in `tracking-panel.spec.tsx`, re-verified after
the fix). No manual visual check performed — no dev server started, since the component only reuses
`WorkspaceForm`/`main-action-card.tsx`'s already visually-verified input/select Tailwind classes.
Archived verbatim to `project-management/completed-tasks/TASK-089-tracking-panel.md`.
