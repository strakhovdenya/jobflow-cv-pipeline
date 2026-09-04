# Completed task archive

> **Archived 2026-08-19 (ADR-030).** No new files are added here — task closure now lives entirely
> on the closed GitHub Issue (comments, checked Acceptance Criteria, final state) plus
> `TEST_LOG.md`; there is no `CURRENT_TASK.md` left to snapshot. This folder stays as historical
> record for tasks closed before that date.

One file per closed task: the final state of `project-management/CURRENT_TASK.md` at the moment
that task closed, copied here before it gets overwritten by the next task. This is the most
complete record of what a given task actually did — richer than the one-line `TASK_BOARD.md` Notes
column, and not scattered across git log the way a PR diff is.

## Convention

- Filename: `TASK-XXX-short-name.md` — same task ID and short name as the branch
  (`task/TASK-XXX-short-name`) and the `TASK_BOARD.md` row.
- Content: `CURRENT_TASK.md`'s content at closure time, verbatim (including whatever was appended
  during execution — findings, checked-off Acceptance Criteria, status notes). Not summarized, not
  reformatted.
- Created as part of the task's own closure commit — no separate PR for the archive copy (see
  `CLAUDE.md` Task Closure Checklist).

## When to read this folder

Only when the other, cheaper sources are genuinely insufficient for the decision at hand:
`TASK_BOARD.md` (status/summary), `TEST_LOG.md` (what was tested), `docs/07_task_backlog.md`
(original spec), git log/PR diff (actual code change), `DECISIONS.md` (ADRs). Reach for a specific
file here only when a real, current task needs the fine-grained detail of *what happened* during
one particular past task, not as routine background reading — these files are not summarized, so
opening one is comparatively token-expensive.
