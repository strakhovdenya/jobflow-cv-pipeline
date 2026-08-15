# Current Task

No active task.

**TASK-100** (add `quality_score` to `VacancyAnalysis`/`TargetedCvContentOutput`, new active
`PromptTemplate` version) is DONE (2026-08-14, merged via PR #187) — see
`project-management/completed-tasks/TASK-100-quality-score.md` and the 2026-08-14 `TEST_LOG.md`
entry. Additive `quality_score: number` field on both schemas (isNumber validation, mirroring
`FinalCheckOutput`); new `prompt1_v2.txt`/`prompt2_v2.txt` (v1 files preserved unchanged) add the
field plus a short self-assessment rubric and rewrite the stale "knowledge sources may be
name-only" caveat now that TASK-094/095/096/097 inline real content. `seed.ts`'s upsert loop fixed
to support more than one active version per step — verified idempotent against a freshly-reset
local dev DB.

**TASK-102** (bump Node.js 20→22 and puppeteer 24→25 to close GHSA-jmr9-qjv8-65gv) is also DONE
(2026-08-15, merged via PR #188 + a small closure-docs follow-up) — discovered live while opening
TASK-100's PR #187 (the required Dependabot Severity Gate check, unrelated to TASK-100's own diff).
See `project-management/TASK_BOARD.md`'s TASK-102 row and the 2026-08-15 `TEST_LOG.md` entry for
full detail.

No further task selected — per Operating Rules, task selection is not automatic. Remaining EPIC-23
backlog: **TASK-101** (UI: manual-note control on the workspace detail page, `apps/web`) — TODO,
depends on TASK-098+TASK-099 (both merged-ready). See `project-management/TASK_BOARD.md`'s
"Current Focus" section for the full picture.
