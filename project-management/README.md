# Project Management

This folder replaces Jira/Trello for the JobFlow CV Pipeline project.

## Files

- `TASK_BOARD.md` — live execution board for tasks.
- `EPIC_PROGRESS.md` — high-level phase/epic progress.
- `CURRENT_TASK.md` — the only task Claude Code is allowed to implement in the current session.
- `DECISIONS.md` — architecture/product decisions that should remain stable.
- `TEST_LOG.md` — test and verification log.
- `BLOCKERS.md` — unresolved blockers.
- `CHANGELOG.md` — implementation changelog.

## Rules

- `docs/07_task_backlog.md` is the source of truth for task content.
- `TASK_BOARD.md` tracks status.
- `CURRENT_TASK.md` controls Claude Code scope.
- Work on one task at a time.
- Do not mark tasks as done without tests/checks.
- Do not let Claude Code silently change product scope.
