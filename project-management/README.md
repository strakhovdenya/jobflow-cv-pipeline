# Project Management

This folder replaces Jira/Trello for the JobFlow CV Pipeline project. As of 2026-08-19 (ADR-030),
task creation/execution tracking itself lives on GitHub Issues + the `JobFlow CV Pipeline` GitHub
Project (https://github.com/users/strakhovdenya/projects/1) — this folder now holds project
context that genuinely belongs in the repo (decisions, test/change log, PRDs/plans) rather than
live task state.

## Files

- `TASK_BOARD.md` — **frozen 2026-08-19**, historical execution log up to that date only.
- `EPIC_PROGRESS.md` — high-level phase/epic progress (see root `CLAUDE.md`'s caveat about its
  staleness — cross-check against the GitHub Project instead).
- `CURRENT_TASK.md` — **removed 2026-08-19** (ADR-030); the active GitHub Issue is now the single
  source of truth for "what is being worked on right now."
- `DECISIONS.md` — architecture/product decisions that should remain stable (ADRs).
- `TEST_LOG.md` — test and verification log — still live, referencing GitHub issue numbers instead
  of `TASK-XXX` for anything after 2026-08-19.
- `BLOCKERS.md` — unresolved blockers.
- `CHANGELOG.md` — implementation changelog.
- `completed-tasks/` — **frozen 2026-08-19**, archive of tasks closed before that date only; a
  closed GitHub Issue is now the record for anything after.
- `prd/`, `plan/` — PRD and phase-plan documents (see `.claude/skills/prd`/`.claude/skills/plan`),
  feeding into GitHub Issues via `.claude/skills/issues`.

## Rules

- GitHub Issues are the source of truth for task content, creation and execution (ADR-030) —
  `docs/07_task_backlog.md` is frozen historical record, not where new tasks are defined.
- The GitHub Project (milestone/issue state) tracks status — `TASK_BOARD.md` is frozen.
- Work on one task at a time.
- Do not mark tasks as done without tests/checks.
- Do not let Claude Code silently change product scope.
