# Current Task

No active task.

**TASK-098** (add `ApplicationWorkspace.manualNote` field and `POST /workspaces/:id/manual-note`
endpoint, first task of EPIC-23's second track) is DONE (2026-08-10) — see
`project-management/completed-tasks/TASK-098-manual-note-field.md` and the 2026-08-10
`TEST_LOG.md` entry. New nullable `manualNote` field (distinct from the pre-existing, unrelated
application-tracking `notes` field), append-with-timestamp semantics (whitespace-only rejected by
DTO validation, not just empty string), no workspace-status precondition. Verified against the
real local dev DB via curl, not just mocked unit tests. Does not wire the note into any prompt
input builder yet — that's TASK-099.

No further task selected — per Operating Rules, task selection is not automatic. Recommended
next: **TASK-099** (wire `manualNote` into Prompt 1 / Prompt 2 / cover-letter input builders) —
depends on TASK-098's field and service method, both of which now exist and are merged-ready. See
`project-management/TASK_BOARD.md`'s "Current Focus" section for the full picture.
