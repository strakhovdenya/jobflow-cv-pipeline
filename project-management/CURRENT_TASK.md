# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-078

Component: ArtifactList / ArtifactCard — fourth implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/artifact-list.tsx` + `artifact-card.tsx` replace the old bare
Type/File/Version/Latest table with a flat list of expandable cards labelled by
`stage`/`type`/`ext`/`version`/`date`, toggling an inline `preview` text block on click (row click
or an explicit `View`/`Hide` button), with a colored 3-letter `kind` badge (fixed dictionary:
`source→SRC`, `analysis→ANL`, `cv→CV`, `check→CHK`, `html→HTM`, `pdf→PDF`, reverse-engineered from
the mockup screenshots). New `apps/web/src/lib/types.ts` additions: `ArtifactKind`,
`ArtifactCardData` — mirrors the mockups' `artifacts[]` shape exactly, plus one field not in the
mockup contract: optional `downloadUrl?: string`, added specifically to preserve TASK-064's
download-link capability without dropping it (real wiring from `WorkspaceArtifactSummary` is
TASK-083's job). Data contract extracted from mockups 03/04/09. Visual direction confirmed by the
project owner against the real mockups with no revision rounds needed. 124/124 `apps/web` tests
pass (19 new). Archived verbatim to
`project-management/completed-tasks/TASK-078-artifact-list.md`.

Also this task: added a new standing process rule to `CLAUDE.md`'s Task Closure Checklist, at the
project owner's request — before every task-closure `git commit`, explicitly ask whether to run
`/code-review` against the working diff, and wait for an explicit yes/no.

## Recommended next

Per `TASK_BOARD.md`: **TASK-079** (Component: WorkspaceForm — new-workspace creation form), the
fifth implementation sub-task of the TASK-073 epic, on a new branch off the epic base branch
`task/TASK-073-redesign-base` (already exists) — per the branch-sequencing rule (ADR-025), wait
until TASK-078's own PR has merged into the base branch before branching TASK-079 off it. Awaiting
explicit user selection before starting.
