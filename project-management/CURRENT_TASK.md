# Current Task

## Status

No active task. TASK-038 (Create mechanical MVP smoke test with fake provider)
completed 2026-07-08 — see `TASK_BOARD.md` and `TEST_LOG.md` for closure evidence.

All Acceptance Criteria met:

- [x] Test creates workspace.
- [x] Runs fake Prompt 1 analysis.
- [x] Approves apply.
- [x] Runs fake Prompt 2 CV generation — required adding `POST /workspaces/:id/generate-cv-content`, which did not previously exist (in-scope addition, approved by user).
- [x] Runs fake/deterministic anti-overclaiming guard and verifies no critical unsupported claims block export.
- [x] Approves CV draft.
- [x] Exports PDF.
- [x] Verifies artifacts exist in DB and filesystem.

Per Operating Rules (CLAUDE.md), the next task is not selected automatically.
Recommended next task (per `TASK_BOARD.md` Current Focus): TASK-038A (practical MVP real-provider smoke test).
