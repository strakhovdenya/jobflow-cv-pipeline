# Current Task

## TASK-074 — Fix: final check (Prompt 5) becomes permanently unreachable once cover letter is generated first

Penultimate sub-task of the TASK-073 epic (ADR-025). Branch: `task/TASK-074-final-check-after-cover-letter`,
off `task/TASK-073-redesign-base`. PR targets the base branch, not `main`. TASK-091 (manual
re-verification of TASK-072's four flows against the redesigned UI) follows this task but is not
started automatically.

## Context

Found during TASK-072's manual flow-variant verification (Flow variant 3, "Monpay — Fullstack
Engineer": export PDF → generate cover letter, no final check run in that chat). The two optional
Phase-15 steps (TASK-067 final check, TASK-068 cover letter) have an asymmetric status guard:

- `cover-letter-input-builder.service.ts`: `COVER_LETTER_ALLOWED_STATUSES = ['cv_pdf_generated',
  'final_check_ready']` — cover letter explicitly allowed to run **after** final check.
- `prompt5-input-builder.service.ts`: `FINAL_CHECK_ALLOWED_STATUSES = ['cv_pdf_generated']` only —
  final check does **not** allow running after cover letter.

Since generating a cover letter moves `status` from `cv_pdf_generated` to `cover_letter_generated`
(docs/08_ai_pipeline.md §15.7) and `WorkspaceStatusService.TRANSITIONS[cover_letter_generated]` is
`[]` (terminal, one-way), a user who generates the cover letter before running final check
permanently loses the ability to run Prompt 5 — rejected by the backend itself
(`BadRequestException`), not just hidden in the UI.

Separately, `apps/web/src/lib/pipeline-view-model.ts`'s `buildStages` derives each stage's
`done`/`current`/`upcoming` state purely from `STATUS_STAGE_INDEX` position
(`final_check_ready: 8`, `cover_letter_generated: 9`). Any stage index below the active index is
marked `"done"` unconditionally — so a workspace at `cover_letter_generated` that never ran final
check currently renders the `final` stage as falsely `"done"`. This is the deeper bug behind
`docs/mockups/12-cover-letter-generated-final.html` omitting the `final` stage entirely from its
`labels()` override (10 stages instead of 11).

## Files Affected

- `apps/api/src/pipeline/prompt5/prompt5-input-builder.service.ts`
- `apps/api/src/pipeline/prompt5/prompt5-input-builder.service.spec.ts`
- `apps/api/src/pipeline/prompt5/prompt5.service.ts`
- `apps/api/src/pipeline/prompt5/prompt5.service.spec.ts`
- `apps/web/src/app/workspaces/[id]/final-check-panel.tsx`
- `apps/web/src/app/workspaces/[id]/final-check-panel.spec.tsx`
- `apps/web/src/lib/pipeline-view-model.ts`
- `apps/web/src/lib/pipeline-view-model.spec.ts`

## Docs to Read

- `apps/api/src/pipeline/prompt5/prompt5-input-builder.service.ts` — current status guard
- `apps/api/src/pipeline/prompt5/prompt5.service.ts` — where `workspaceStatus` is written after a
  successful run (currently hardcodes `final_check_ready`)
- `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts` — the wider guard being
  mirrored
- `apps/api/src/workspaces/workspace-status.service.ts` — `TRANSITIONS` map (`cover_letter_generated`
  is terminal; confirms why status must not naively flip to `final_check_ready` from there)
- `apps/web/src/app/workspaces/[id]/final-check-panel.tsx` — real wired panel (not legacy/dead code;
  confirmed via `page.tsx`), `RUNNABLE_STATUS` gate
- `apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx` — sibling panel's
  `RUNNABLE_STATUSES`/`hasCoverLetterArtifact` pattern to mirror
- `apps/web/src/lib/pipeline-view-model.ts` — `STATUS_STAGE_INDEX`, `buildStages` — current
  index-only done/current/upcoming derivation
- `project-management/TEST_LOG.md` 2026-07-21 TASK-072 Flow variant 3 entry — how the bug was found

## Key Invariants

- Prompt 5 validates the exported PDF, not the cover letter — running it after cover letter
  generation is semantically correct and must not require regenerating/revalidating the cover
  letter.
- The fix must widen the final-check gate, not narrow the cover-letter gate. Both orders
  (final-check-then-cover-letter and cover-letter-then-final-check) are legitimate, confirmed by
  real historical flows in TASK-072.
- When final check succeeds starting from `cover_letter_generated`, workspace status must **stay**
  `cover_letter_generated` (not regress to `final_check_ready`) — regressing would make the UI
  imply the cover letter needs regenerating and would conflict with `cover-letter-panel.tsx`'s own
  status-based eligibility gate.
- Because `cover_letter_generated` is terminal, the usual "status moves out of the allowed list"
  one-shot lock (used everywhere else: `cover-letter-panel.tsx`, `pre-pdf-check-panel.tsx`, the
  original `final-check-panel.tsx` `cv_pdf_generated → final_check_ready` flow) doesn't apply here.
  An explicit idempotency guard (reject if `05_final_check.json` already exists) is added instead,
  backend-enforced, with the frontend button hiding once a result exists (mirrors
  `cover-letter-panel.tsx`'s `hasResult`-driven pattern).
- `pipeline-view-model.ts`'s `final` stage must reflect real `final_check_md`/`final_check_json`
  artifact presence when its index is behind the active status index, not assume "done" from index
  math alone.

## State Machine

| Action | Precondition | Status before | Status after (success) |
|---|---|---|---|
| Run final check | status = `cv_pdf_generated` | `cv_pdf_generated` | `final_check_ready` (unchanged from current behavior) |
| Run final check | status = `cover_letter_generated` AND no `05_final_check.json` yet | `cover_letter_generated` | `cover_letter_generated` (unchanged — new) |
| Run final check | status = `cover_letter_generated` AND `05_final_check.json` already exists | `cover_letter_generated` | rejected, `BadRequestException` (new guard) |
| Run final check | any other status | — | rejected, `BadRequestException` (unchanged) |

## Acceptance Criteria

- [x] `FINAL_CHECK_ALLOWED_STATUSES` includes `cover_letter_generated` alongside `cv_pdf_generated`.
- [x] Running final check from `cover_letter_generated` with no prior final-check artifact succeeds
      and writes `05_final_check.md/json`; workspace status remains `cover_letter_generated`.
- [x] Running final check a second time from `cover_letter_generated` (artifact already exists) is
      rejected with `BadRequestException`.
- [x] `final-check-panel.tsx` shows the "Run final check" button at `cover_letter_generated` when no
      result exists yet, and hides it (while still showing the fetched result) once one does —
      mirroring the existing artifact-driven eligibility test already in
      `final-check-panel.spec.tsx`.
- [x] `pipeline-view-model.ts`'s `buildStages` renders the `final` stage as `"upcoming"` (not
      `"done"`) when status is `cover_letter_generated` and no final-check artifact exists yet, and
      `"done"` once one does.
- [x] Existing `cv_pdf_generated → final_check_ready` path has no regressions.

## Test Requirement

- New unit tests in `prompt5-input-builder.service.spec.ts`: `cover_letter_generated` with no prior
  artifact succeeds; `cover_letter_generated` with an existing `05_final_check.json` throws.
- New/updated test in `prompt5.service.spec.ts`: success starting from `cover_letter_generated`
  leaves `workspaceStatus` as `cover_letter_generated` in both the DB update and the returned
  result.
- New test in `final-check-panel.spec.tsx`: button appears at `cover_letter_generated` with
  `artifacts=[]`, and clicking it calls the action (mirrors the existing `cv_pdf_generated` case).
- New tests in `pipeline-view-model.spec.ts`: `final` stage state at `cover_letter_generated` with
  and without a `final_check_json`/`final_check_md` artifact present.
- Full `apps/api` (`npm run test`) and `apps/web` (`npx vitest run`) suites pass.

## Progress Notes

`pipeline-view-model.ts`'s fix was narrowed during implementation from "any status whose index sits
past `final`'s index gets artifact-checked" to "only `cover_letter_generated` gets artifact-checked."
The broader version broke a pre-existing passing test (`buildStages("archived", ...)` expects all
prior stages unconditionally `"done"` with no artifacts) — `ready_to_apply`/`applied`/`rejected`/
`archived` are not actually reachable without final check already having run under today's real
state machine (unlike `cover_letter_generated`, the one status TASK-072 proved reachable without
it), so narrowing the check to that one status fixes the real bug without regressing statuses that
were never actually ambiguous.

A same-session `/code-review` found one bug in this fix: `hasFinalCheckArtifact()` originally
checked for `final_check_md` OR `final_check_json`, but `prompt5.service.ts` writes
`final_check_md` unconditionally — even when the AI returns invalid JSON and validation fails —
while `final_check_json` is registered only on success (same convention already followed by
`cover-letter-panel.tsx`'s `hasCoverLetterArtifact` and `final-check-panel.tsx`'s
`latestJsonArtifactId`). Counting the `.md` artifact meant a failed final-check attempt from
`cover_letter_generated` would still mark the `final` stage `"done"`, contradicting
`final-check-panel.tsx`'s own strictly-JSON-gated `hasResult`, which would correctly keep showing
the "Run final check" button and the error. Fixed by checking `final_check_json` only; re-ran the
full `apps/web` suite (210/210 pass), `tsc --noEmit` and `lint` (both clean) afterward.

## Done Definition

A workspace that generated its cover letter before running final check can still successfully run
final check through the real UI, without backend or frontend rejection, and `PipelineStages`
correctly reflects whether final check has actually run — without regressing the existing
`cv_pdf_generated`-first path.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-074 ..."`
3. `git push -u origin task/TASK-074-final-check-after-cover-letter`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not start TASK-091 automatically.

## Last completed: TASK-089

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
