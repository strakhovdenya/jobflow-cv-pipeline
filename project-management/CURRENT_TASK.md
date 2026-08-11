# Current Task

No active task.

**TASK-099** (wire `manualNote` into Prompt 1 / Prompt 2 / cover-letter input builders) is DONE
(2026-08-11) — see `project-management/completed-tasks/TASK-099-manual-note-wiring.md` and the
2026-08-11 `TEST_LOG.md` entry. Added optional `manualNote?: string | null` to all three builders'
workspace-context interfaces; each `*Service` call site passes `workspace.manualNote` through;
each builder appends a `=== MANUAL NOTE ===` block only when the note is present, byte-identical
output when absent. Manual e2e check against the real dev DB and fake AI provider confirmed the
note changes `PromptRun.inputHash` at every step. Closes EPIC-23's second track (TASK-098 +
TASK-099).

No further task selected — per Operating Rules, task selection is not automatic. Remaining EPIC-23
backlog: **TASK-100** (add `quality_score` to `VacancyAnalysis`/`TargetedCvContentOutput`, new
active `PromptTemplate` version) and **TASK-101** (UI: manual-note control on the workspace detail
page, `apps/web`) — both TODO. See `project-management/TASK_BOARD.md`'s "Current Focus" section
for the full picture.
