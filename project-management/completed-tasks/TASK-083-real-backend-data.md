# Current Task

## TASK-083 — Wire real backend workspace data into the PipelineScreen data contract

Status: `DONE`

### Context

Final integration sub-task of the TASK-073 redesign epic (before TASK-074, which the project owner
explicitly wants last). TASK-081 built `apps/web/src/lib/pipeline-view-model.ts` with a status →
`stages`/`mainCard`/`artifacts` mapping that was largely correct but had two real gaps versus actual
backend behavior (`apps/api/src/review-gates/review-gates.service.ts`,
`apps/api/src/workspaces/workspace-status.service.ts`,
`apps/api/src/pipeline/skip/skip-reason.service.ts`):

1. **`analysis_ready` is mismapped.** The real Prompt 1 success path
   (`apps/api/src/pipeline/prompt1/prompt1.service.ts`) transitions
   `analysis_running → paused_after_analysis` directly — it never sets `analysis_ready`.
   `analysis_ready` is set **only** by `skip-reason.service.ts` as a rollback when `confirm-skip`'s
   AI call fails or returns invalid JSON (workspace stays `currentDecision = skip`). The current
   mapping buckets `analysis_ready` with `analysis_running` ("waiting for analysis to complete",
   zero buttons) — a dead end for the user. It must instead behave like the
   `paused_after_analysis` + `currentDecision = skip` branch (the "Confirm skip" retry UI),
   activeIndex = 2 (`decision` stage), not 1.
   - Note: `docs/03_domain_model.md` §8.6 documents `analysis_running → analysis_ready →
     paused_after_analysis` as the primary flow — the real code does not do this. This task follows
     the real code (`prompt1.service.ts`/`skip-reason.service.ts`), not that doc text. This
     discrepancy is not fixed project-wide here (out of scope), only noted.
2. **`failed` stage position is hardcoded to index 0.** `WorkspaceStatus.failed` is only reachable
   from `analysis_running`, `cv_generation_running` or `export_running`
   (`workspace-status.service.ts` TRANSITIONS). `WorkspaceDetail.artifacts[]` (already returned by
   the API, already passed to the frontend) is enough to infer which of those three it was, by
   presence of `vacancy_analysis_*` / `targeted_cv_content_*` / `cv_export_*` artifact types — no
   backend change needed.

Everything else in the current mapping (`paused_after_analysis` apply/maybe/pause/skip button
states, `cv_draft_ready`/`paused_after_cv_draft`, `skipped`) was verified against
`review-gates.service.ts` and already matches the real preconditions — kept as-is, just
re-documented accurately (the file's top comment currently calls the whole mapping "mock/
placeholder", which is no longer true).

### Files Affected

- `apps/web/src/lib/pipeline-view-model.ts` — fix `analysis_ready` and `failed` mapping; widen
  `buildStages`/`buildMainActionCard` to accept `artifacts: WorkspaceArtifactSummary[]`; rewrite the
  top-of-file comment to document the real precondition each button encodes.
- `apps/web/src/lib/pipeline-view-model.spec.ts` — tests for the `analysis_ready` skip-retry branch
  and the three `failed` artifact-inference cases.
- `apps/web/src/app/workspaces/[id]/page.tsx` — pass `workspace.artifacts` into `buildStages`.
- `apps/web/src/app/workspaces/[id]/main-action-panel.tsx` — pass `artifacts` into
  `buildMainActionCard`.
- No `apps/api` changes (see Key Invariants).

### Docs to Read

- `apps/web/src/lib/pipeline-view-model.ts` (full file — already read this session)
- `apps/api/src/review-gates/review-gates.service.ts` — `submitDecision()`, `overrideSkip()`,
  `submitCvDraftReview()` precondition checks (already read this session)
- `apps/api/src/workspaces/workspace-status.service.ts` — `TRANSITIONS` table (already read this
  session)
- `apps/api/src/pipeline/skip/skip-reason.service.ts` — `confirmSkip()`, in particular the
  `WorkspaceStatus.analysis_ready` rollback branches (already read this session)
- `docs/03_domain_model.md` §5.1 (WorkspaceStatus enum) and §8.6 (state transition rules)

### Key Invariants

- No backend/state-machine changes — the two fixes use data already returned by the API
  (`artifacts[]`) or already-correct real logic; if implementation reveals a genuine need for a new
  backend field, stop and propose that as a separate task rather than bundling it here.
- The status → view mapping stays in the single `pipeline-view-model.ts` module — not spread across
  page/component files.
- `cv_generation_running` maps to a plain in-flight spinner (synchronous `generate-cv-content` call)
  — not an async/polling UI. `run-analysis` has async+polling (TASK-065); `generate-cv-content` does
  not.

### Acceptance Criteria

- [x] Every real `WorkspaceStatus` (19 values, `apps/api/prisma/schema.prisma`) produces a correct
      `stages`/`mainCard`/`artifacts` mapping.
- [x] `analysis_ready` renders as the skip-confirmation-retry variant of `paused_after_analysis`
      (decision stage active, "Confirm skip" available), not as a passive waiting state.
- [x] `failed` positions the active stage based on the furthest artifact type present, not always
      index 0.
- [x] Button disabled/pruned reasons match the real `review-gates.service.ts` preconditions.
- [x] No regression in the TASK-072 manual flow scenarios — at least one re-run and logged.

### Test Requirement

- [x] Unit tests in `pipeline-view-model.spec.ts` covering every `WorkspaceStatus` value, including
      the new `analysis_ready` and `failed` branches.
- [x] At least one TASK-072 flow scenario manually re-run against the real backend + redesigned UI,
      logged in `project-management/TEST_LOG.md`.

### Done Definition

TASK-073 epic is functionally complete: every real workspace state renders correctly through the
new component set with real backend data, no mock/placeholder mapping remaining.

### Progress Notes

- **`buildMainActionCard` did not need `artifacts`.** The original Files Affected list assumed both
  `buildStages` and `buildMainActionCard` (and therefore `main-action-panel.tsx`) would need
  `artifacts` for the `failed` fix. In practice only the sidebar stage position (`buildStages`,
  wired through `page.tsx`) needs it — `buildMainActionCard`'s `failed` case is already
  status-generic ("Pipeline step failed — check logs and retry") regardless of which stage it
  happened at, so `main-action-panel.tsx` was left unchanged.
- **Investigated "map cv_draft_ready to real evidence-guard data"** (a TASK_BOARD.md forward-note
  from when mockup 06 was processed). Confirmed `needs_evidence` markers
  (`apps/api/src/evidence/evidence-guard.service.ts`) are baked directly into the
  `targeted_cv_content_md/json` artifact content itself — there is no separate structured
  evidence-guard API/field to wire. That content already flows through `ArtifactList` (TASK-078)
  via the existing artifact preview/download mechanism. No additional wiring was needed or possible
  here without a new backend endpoint, which Key Invariants rule out for this task; flagged as a
  possible future task if the project owner wants a structured evidence-flag summary surfaced
  outside the raw CV content.
- Confirmed (not fixed, out of scope): `docs/03_domain_model.md` §8.6 documents
  `analysis_running → analysis_ready → paused_after_analysis` as the primary flow; the real
  `prompt1.service.ts` skips `analysis_ready` entirely on success. This task's mapping follows the
  real code.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-083 ..."`
3. `git push -u origin task/TASK-083-real-backend-data`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.
