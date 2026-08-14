# Current Task

No active task.

**TASK-100** (add `quality_score` to `VacancyAnalysis`/`TargetedCvContentOutput`, new active
`PromptTemplate` version) is DONE (2026-08-14) — see
`project-management/completed-tasks/TASK-100-quality-score.md` and the 2026-08-14 `TEST_LOG.md`
entry. Additive `quality_score: number` field on both schemas (isNumber validation, mirroring
`FinalCheckOutput`); new `prompt1_v2.txt`/`prompt2_v2.txt` (v1 files preserved unchanged) add the
field plus a short self-assessment rubric and rewrite the stale "knowledge sources may be
name-only" caveat now that TASK-094/095/096/097 inline real content. `seed.ts`'s upsert loop fixed
to support more than one active version per step — verified idempotent against a freshly-reset
local dev DB.

No further task selected — per Operating Rules, task selection is not automatic. Remaining EPIC-23
backlog: **TASK-101** (UI: manual-note control on the workspace detail page, `apps/web`) — TODO,
depends on TASK-098+TASK-099 (both merged-ready). See `project-management/TASK_BOARD.md`'s
"Current Focus" section for the full picture.
