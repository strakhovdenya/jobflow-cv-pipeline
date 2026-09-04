# Current Task

**TASK-103** — Fix stale TASK_BOARD.md status rows for TASK-067 and TASK-073

## Context

Discovered during a routine "is anything left in the backlog?" check after closing TASK-101:
`project-management/TASK_BOARD.md`'s per-task table has two rows still marked `TODO` for work
that is actually long merged and DONE:

- **TASK-067** (Add Prompt 5 final check trigger and results view, `apps/web`) — the table row
  (originally around line 841) says `TODO`, but the file's own "Current Focus" narrative section
  (around line 425-426) already correctly states: "Previously: TASK-067 (Add Prompt 5 final check
  trigger and results view) — DONE, branch `task/TASK-067-final-check-ui`, PR #126 (merged)."
  Confirmed independently: `apps/web/src/app/workspaces/[id]/final-check-panel.tsx` exists, is
  wired into `page.tsx`, and its git history shows `5d8bf54 feat: TASK-067 add Prompt 5 final
  check trigger and results view` (2026-07-20) plus a same-day review-fix commit and a later
  TASK-074 extension. `project-management/TEST_LOG.md` has a 2026-07-20 TASK-067 entry.
- **TASK-073** (Full apps/web UI/UX redesign pass, epic) — the table row (originally around line
  847) also says `TODO`, but the file's own text (around line 168-169) already states: "that PR
  (#158, `task/TASK-073-redesign-base` → `main`) was already [merged]." All of TASK-073's declared
  sub-tasks (TASK-075 through TASK-089, per ADR-025's epic-base-branch pattern) plus the
  discovered-during-it TASK-074 are independently marked `DONE` in the same table.

This is a docs-only correction — the underlying work was already done and verified in its own
original task closures; this task exists solely to reconcile the summary table row with the facts
already recorded elsewhere in the same file. No new code, no new tests, no product change.

**Out of scope (intentionally not touched):**
- **TASK-086** (regression guard tests for `PromptTemplate` content) stays `TODO`. Unlike the two
  above, this is a genuine open question, not a stale-doc bug: a pre-existing spec file
  (`apps/api/src/pipeline/prompt-template-content.spec.ts`) already covers roughly what TASK-086
  asks for, but only for the v1 `prompt1.txt`/`prompt2.txt` templates — not the newer
  `prompt1_v2.txt`/`prompt2_v2.txt` templates TASK-100 (2026-08-14) made active. Whether that gap
  is worth closing, and how, is a separate decision — not part of this docs-fix task.
- `docs/07_task_backlog.md` — that file is the content source of truth per `TASK_BOARD.md`'s own
  stated purpose ("`docs/07_task_backlog.md` is the source of truth for task content. This file
  [`TASK_BOARD.md`] tracks execution state only.") — an execution-status correction belongs only
  in `TASK_BOARD.md`.
- No new `project-management/completed-tasks/TASK-067-*.md` / `TASK-073-*.md` archive files —
  both tasks predate this repo's current archival convention (no earlier task in that range has
  one either); backfilling them would be a separate, larger, and riskier undertaking than this
  narrow row fix.

## Files Affected

```text
project-management/TASK_BOARD.md   (two table rows: TASK-067, TASK-073)
```

## Docs to Read

- `project-management/TASK_BOARD.md` lines ~168-169 (TASK-073 epic PR #158 merge note) and
  ~425-463 (TASK-067 "Current Focus" DONE narrative + TEST_LOG pointer) — the already-correct
  prose this task reconciles the table rows against.
- `project-management/TASK_BOARD.md`'s TASK-067 row (~line 841), TASK-073 row (~line 847), and the
  already-`DONE` TASK-074/TASK-075–089 rows immediately following it — for the exact column format
  (Status / PR-commit / Notes) to match.

## Key Invariants

- Do not alter any other row's status — only TASK-067 and TASK-073 change in this task.
- Do not touch TASK-086's row — its `TODO` status is a real open question, not a doc bug.
- Sourced entirely from facts already present elsewhere in `TASK_BOARD.md` and confirmed via git
  history (`5d8bf54`, PR #126, PR #158) — no new claims invented.

## Acceptance Criteria

- [x] TASK-067's table row: `TODO` → `DONE`, PR/commit column filled with
      `branch task/TASK-067-final-check-ui, PR #126`, Notes column filled with a short pointer to
      the 2026-07-20 `TEST_LOG.md` entry and to TASK-074 (which later extended it).
- [x] TASK-073's table row: `TODO` → `DONE`, PR/commit column filled with
      `epic base branch task/TASK-073-redesign-base, PR #158 (→ main)`, Notes column explains it's
      an epic umbrella closed via its sub-tasks (TASK-075–089) plus TASK-074, per ADR-025.
- [x] No other row changed.

## Test Requirement

None — documentation-only change, no testable logic.

## Done Definition

Both rows corrected and internally consistent with the rest of `TASK_BOARD.md` (matching the
existing narrative text this task is reconciling against). No `tsc`/`lint`/`test` run needed (no
code touched).

## Dependencies

None.

## Git Instructions

1. `git add project-management/TASK_BOARD.md`
2. `git commit -m "docs: TASK-103 ..."`
3. `git push -u origin task/TASK-103-fix-stale-task-board-rows`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.
