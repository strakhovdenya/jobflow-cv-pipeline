# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-076

Component: WorkspaceStatusHeader — second implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/workspace-status-header.tsx` renders the shared workspace header: a
small avatar-initial + `{company} · application` caption and a status pill on the top row, the
`role` as the large heading with `slug` in small monospace text below it, and
`decision`/`score`/`reviewState` as compact single-line bordered pills stacked to the right of the
title, with a `next: {nextAction}` hint beneath them. New `apps/web/src/lib/types.ts` adds
`WorkspaceStatusHeaderData`. Visual direction confirmed by the project owner against the real
mockups (03/04/05) after two review round-trips — see the archived task's "Progress Notes"
section for what changed and why (the initial layout assumption from planning, before the real
mockups were compared live in-browser, inverted the company/role hierarchy and used stacked
rather than single-line field pills). 104/104 `apps/web` tests pass (3 new). Archived verbatim to
`project-management/completed-tasks/TASK-076-workspace-status-header.md`.

## Recommended next

Per `TASK_BOARD.md`: **TASK-077** (Component: MainActionCard), the third implementation sub-task
of the TASK-073 epic, on a new branch off the epic base branch `task/TASK-073-redesign-base`
(already exists) — awaiting explicit user selection before starting.
