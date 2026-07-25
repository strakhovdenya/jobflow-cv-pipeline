# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-072

Manual verification pass (4 real historical flow variants, all PASS, 1 finding filed as
TASK-074). Archived verbatim to
`project-management/completed-tasks/TASK-072-manual-verification-pass.md` (2026-07-25 —
retroactively; this copy was missing until now, a real Task Closure Checklist gap this session's
new hook, see below, would have caught going forward).

## Since TASK-072: TASK-073 epic — mockup grooming pass (no active task, doc-only)

Not itself a numbered task — backlog/doc grooming ahead of picking up an actual TASK-073
sub-task implementation. No branch, no code changes; direct edits to `docs/07_task_backlog.md`,
`docs/mockups/README.md` and `project-management/TASK_BOARD.md`.

All 13 project-owner-supplied Claude Artifact mockups (01–13) are now processed, renamed to the
`NN-slug.html` convention, and indexed in `docs/mockups/`:

- Mockups 01/03–10 were already processed in an earlier session.
- **Mockup 11** ("SKIP - Skipped final") extended TASK-077's `mainCard` contract with `notice`,
  `select`, `reasonNoteLabel` — folded in, no new component.
- **Mockup 12** ("COVER LETTER - Generated final") introduced `coverLetterPanel`/`trackingPanel`
  with no owning component — filed **TASK-088** (CoverLetterPanel) and **TASK-089**
  (TrackingPanel). Its `labels()` also omits the `'final'` stage entirely when a cover letter is
  generated before a final check — corroborating evidence added to **TASK-074** and TASK-083.
- **Mockup 13** ("FINAL CHECK PDF - Ready") resolved TASK-084's deferred final-check half: a
  **parallel `finalCheckPanel` prop**, not a `checks.state` variant as originally guessed —
  TASK-084 amended in place, no longer deferred. Also supplied the `coverLetterPanel: { button }`
  variant (folded into TASK-088) and confirmed `trackingPanel`'s shape (folded into TASK-089).
- **Mockup 02** ("Workspace created") — a small `screenType: 'success'` confirmation shown right
  after `POST /workspaces` succeeds. Folded directly into **TASK-080** (single call site, no
  reusable component needed).

Net result: TASK-073 epic is now broken into TASK-075 through TASK-085, TASK-087 through
TASK-089, plus TASK-074 sequenced last — see `docs/07_task_backlog.md` and
`project-management/TASK_BOARD.md` "Current Focus" for full detail. No implementation has
started on any of these yet.

## Also this session: tooling — task-archive-sync-hook

New `.claude/settings.json` PreToolUse hook on `Bash` (`scripts/task-archive-sync-hook.js`):
on any `git commit`, if the current branch is `task/TASK-XXX-...` and `TASK_BOARD.md` marks that
task `DONE`, it auto-syncs `project-management/completed-tasks/TASK-XXX-*.md` to match the staged
`CURRENT_TASK.md` verbatim (creating it if missing) and stages the archive file — implementing
CLAUDE.md's Task Closure Checklist archive-copy rule without relying on manual memory, including
across a closure that spans multiple commits. Verified in an isolated scratch repo (create/
idempotent-no-op/re-sync-after-stale-edit) and live-fired through the real `.claude/settings.json`
wiring via a sentinel-echo proof, then reverted. Not itself a numbered backlog task — a config/
tooling change, no `apps/api`/`apps/web` code touched.

## Recommended next

Per `TASK_BOARD.md`: **TASK-075** (Component: PipelineStages), the first implementation
sub-task of the TASK-073 epic, on a new branch off the epic base branch
`task/TASK-073-redesign-base` (create it first if it doesn't exist yet, per ADR-025) — awaiting
explicit user selection before starting.
