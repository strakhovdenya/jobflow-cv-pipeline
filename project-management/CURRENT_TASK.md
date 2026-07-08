# Current Task

## Status

No active task. TASK-039 (Implement workspace status transition service)
completed 2026-07-08 — see `TASK_BOARD.md` and `TEST_LOG.md` for closure evidence.

Per Operating Rules (CLAUDE.md), the next task is not selected automatically.
Recommended next task (per `TASK_BOARD.md` Current Focus): TASK-040 (Add
workspace artifact summary API, Phase 7).

## Docs to Read

- `docs/03_domain_model.md` lines 163–187 (§5.1 — `WorkspaceStatus` enum, MVP subset)
- `docs/03_domain_model.md` lines 696–710 (§8.6 — documented state transition rules; superseded in two places by real code, see State Machine table below)
- `docs/07_task_backlog.md` lines 1625–1651 (TASK-039 acceptance/test/done definition)
- `prisma/schema.prisma` lines 10–30 (`enum WorkspaceStatus` — authoritative status values)
- `src/pipeline/prompt1/prompt1.service.ts` lines 105–274 (`analysis_running` → `paused_after_analysis`/`failed`, skips `analysis_ready`)
- `src/pipeline/prompt2/prompt2.service.ts` lines 125–270 (`cv_generation_running` → `cv_draft_ready`/`failed`)
- `src/pipeline/skip/skip-reason.service.ts` lines 24–239 (`paused_after_analysis`/`analysis_ready` → `skipped`, retry loop back to `analysis_ready`)
- `src/review-gates/review-gates.service.ts` (all three methods — `submitDecision`, `overrideSkip`, `submitCvDraftReview` — full transition set)
- `src/document-export/document-export.service.ts` lines 40–90 (`export_running` → `cv_pdf_generated`/`failed`)
- `src/workspaces/workspaces.module.ts` (provider/module registration pattern to follow)

## Scope Decision (user-confirmed, 2026-07-08)

- The documented §8.6 table and the real code disagree on one point: docs say
  `analysis_running → analysis_ready → paused_after_analysis`; the real code
  (`prompt1.service.ts`) transitions `analysis_running → paused_after_analysis`
  directly and only uses `analysis_ready` as a retry/failure state inside the
  skip flow. **Decision: code is the source of truth.** The transition map
  built in this task must match actual runtime behavior, not the doc table.
  Do not silently edit `docs/03_domain_model.md` — flag the doc/code drift in
  the PR description only.
- **No refactor of existing call sites in this task.** `WorkspacesService`,
  `ReviewGatesService`, `SkipReasonService`, `DocumentExportService`,
  `Prompt1Service`, `Prompt2Service` keep writing `status` via
  `prisma.applicationWorkspace.update(...)` directly, exactly as today.
  `WorkspaceStatusService` is added as a standalone, tested validation unit
  (`assertValidTransition` / `isValidTransition`) — not wired into any
  existing service or controller. Wiring it in as an enforced gate is a
  separate future task.

## State Machine

Transition map to implement in `WorkspaceStatusService`, derived from the
actual call sites listed above (not from the docs table):

| From | To | Triggered by |
|---|---|---|
| `source_saved` | `analysis_running` | Prompt 1 starts |
| `analysis_running` | `paused_after_analysis` | Prompt 1 completes successfully |
| `analysis_running` | `failed` | Prompt 1 provider/validation error |
| `paused_after_analysis` | `paused_after_analysis` | Review gate `pause` action, or `change_to_skip` (ADR-016: decision changes, status stays) |
| `paused_after_analysis` | `cv_generation_running` | Review gate `approve_apply` / `approve_maybe` |
| `paused_after_analysis` | `analysis_ready` | Skip confirmation AI/validation failure (retry allowed) |
| `paused_after_analysis` | `skipped` | Skip confirmation succeeds |
| `analysis_ready` | `analysis_ready` | Skip confirmation retried and fails again |
| `analysis_ready` | `skipped` | Skip confirmation succeeds after retry |
| `skipped` | `cv_generation_running` | Manual override (`overrideSkip`, `DecisionOverride` row required) |
| `cv_generation_running` | `cv_draft_ready` | Prompt 2 completes successfully |
| `cv_generation_running` | `failed` | Prompt 2 provider/validation error |
| `cv_draft_ready` | `export_running` | CV draft review `approve` |
| `cv_draft_ready` | `paused_after_cv_draft` | CV draft review `pause` or `mark_not_worth_applying` |
| `paused_after_cv_draft` | `export_running` | CV draft review `approve` |
| `paused_after_cv_draft` | `paused_after_cv_draft` | CV draft review `pause` or `mark_not_worth_applying` retried |
| `export_running` | `cv_pdf_generated` | Document export succeeds |
| `export_running` | `failed` | Document export fails |

Any pair not in this table is an invalid transition and
`assertValidTransition` must throw `BadRequestException` with a message
naming both the current and requested status.

`failed`, `cv_pdf_generated` and `skipped` (except the documented override)
are terminal for this task — no further transitions are defined out of them;
do not invent recovery transitions not seen in the real code.

## Key Invariants

- The enum values and spellings must come from `WorkspaceStatus` in
  `@prisma/client` — do not hand-roll a parallel string union.
- `skipped → cv_generation_running` is the *only* transition out of
  `skipped`. This is the "skip and manual override rules are enforced"
  acceptance criterion — encode it as exactly one allowed target, matching
  `ReviewGatesService.overrideSkip`.
- Self-loops (`paused_after_analysis → paused_after_analysis`,
  `analysis_ready → analysis_ready`, `paused_after_cv_draft →
  paused_after_cv_draft`) are valid transitions, not errors — the real
  services use them for pause/retry actions.
- Do not add `analysis_ready` as an intermediate step of the main
  `analysis_running → paused_after_analysis` path — that would contradict
  `prompt1.service.ts`'s actual behavior (see Scope Decision above).

## Acceptance Criteria

- [x] `WorkspaceStatusService` (`src/workspaces/workspace-status.service.ts`) implements the transition map above.
- [x] Valid transitions are accepted (no throw / return true).
- [x] Invalid transitions throw an explicit, descriptive error (`BadRequestException`).
- [x] Skip and manual override rules are enforced: only `skipped → cv_generation_running` is valid out of `skipped`.
- [x] Unit tests cover every row of the table above (valid) and representative invalid pairs (including `skipped → export_running`, `source_saved → cv_draft_ready`, `cv_pdf_generated → *`).
- [x] `WorkspaceStatusService` is registered as a provider in `WorkspacesModule` (not exported — no existing consumer yet).
- [x] No existing service's status-writing behavior changes.
- [x] `npm run test` passes for the full suite (no regressions) — 40/40 suites, 377/377 tests.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-039 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
