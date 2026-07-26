# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-077

Component: MainActionCard — third implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/main-action-card.tsx` renders the unified "what can I do right now"
action card: `title`/`subtitle`, optional `meta` pills, an optional bordered `info` banner,
an optional plain-string `notice` banner, an optional labelled `select` dropdown, an optional
`reasonNote` text-input slot (boolean or string, generic label when `reasonNoteLabel` absent),
and `buttons[]` with `primary`/`secondary`/`disabled` treatment (`disabled` stays visible with its
`reason` as a `title` tooltip). New `apps/web/src/lib/types.ts` adds `MainActionCardData` and
sibling field types. Visual direction confirmed by the project owner against the real mockups
(03/04/05/06/11) with no revision rounds needed. 111/111 `apps/web` tests pass (7 new). Archived
verbatim to `project-management/completed-tasks/TASK-077-main-action-card.md`.

Also this task: fixed a branch-sequencing process gap — this task's branch was created off the
epic base branch before the preceding sub-task's PR (#141) had merged into it, requiring a
stash/fast-forward/conflict-resolution reconciliation once it did merge. CLAUDE.md's Branch-first
protocol and `DECISIONS.md` ADR-025 were both updated with an explicit check for this going
forward — see the archived task's "Progress Notes" section.

## Recommended next

Per `TASK_BOARD.md`: **TASK-078** (Component: ArtifactList / ArtifactCard), the fourth
implementation sub-task of the TASK-073 epic, on a new branch off the epic base branch
`task/TASK-073-redesign-base` (already exists) — per the branch-sequencing fix above, wait until
TASK-077's own PR has merged into the base branch before branching TASK-078 off it. Awaiting
explicit user selection before starting.
