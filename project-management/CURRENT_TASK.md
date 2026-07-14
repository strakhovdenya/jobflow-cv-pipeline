# Current Task

## Status

No active task. TASK-PH-017 (Add coverage measurement, diff/patch coverage gating and
CI-enforced e2e suite) is DONE — see `project-management/TASK_BOARD.md` for the
recommended next task (TASK-046). Per Operating Rules, work does not start until the
user explicitly selects it.

---

Record kept below for reference (TASK-PH-017, closed 2026-07-14):

## TASK-PH-017 — Add coverage measurement, diff/patch coverage gating and CI-enforced e2e suite

User-selected 2026-07-14 (Phase PH-2 out-of-band addition, not part of the original Phase 9 sequence). Full task definition: `docs/07_task_backlog.md` § "TASK-PH-017".

## Docs to Read

- `docs/07_task_backlog.md` — `### TASK-PH-017` section (Context, Files likely affected, Scope decision, Acceptance criteria, Test requirement, Done definition) — full section, already short.
- `package.json` — `scripts` and `jest` sections (current `collectCoverageFrom`, no `coverageThreshold` yet).
- `test/jest-e2e.json` — current e2e Jest config (no coverage config).
- `.github/workflows/ci.yml` — full file (existing `test` job's Postgres service + `prisma migrate deploy` steps, to mirror in the new `test-e2e` job).
- `test/mvp-flow.e2e-spec.ts` — full file (existing e2e harness pattern: workspace creation, fake-provider analysis, review-decision, generate-cv-content, review-cv-draft, export-cv — reuse this setup pattern for the two new scenarios).
- `project-management/DECISIONS.md` — ADR-005 (skip stops pipeline by default), ADR-016 (`change_to_skip` keeps `status = paused_after_analysis` until skip artifacts physically exist), ADR-008 (unit test mandate), ADR-012 (export creates no AiRun — already asserted in `mvp-flow.e2e-spec.ts`, do not duplicate that assertion incorrectly in new files).
- `src/review-gates/review-gates.service.ts` — `change_to_skip` action signature and current behavior, to write the new e2e assertion correctly.
- `src/pipeline/skip/skip-reason.service.ts` — method that creates `01_skip_reason.md/json`, to know what triggers the actual `status = skipped` transition after `change_to_skip`.

## Key Invariants

- Do not guess a global `coverageThreshold` — measure the real local baseline via `npm run test:cov` first (after applying the `collectCoverageFrom` exclusions), then set the threshold just below the measured number. This is the reason the analysis avoided a blind global gate.
- Diff/patch coverage (Codecov `patch` status, 80% target) is the primary enforced gate for new code; the global threshold is a regression floor only.
- `test:e2e` must actually run in CI after this task — it does not today, only locally.
- ADR-016: `change_to_skip` sets `currentDecision = skip` / `reviewState = overridden` but leaves `status = paused_after_analysis`. The transition to `status = skipped` happens only when skip artifacts are physically created. The new e2e test must assert this two-step behavior, not assume `status` flips immediately on the review-decision call.
- ADR-012: export must never create a new `AiRun`. If a new e2e scenario touches export, do not regress this existing assertion pattern.
- Do not modify `prompt3`/`prompt5`/OpenAI-provider e2e scope — out of scope per the task's Scope decision.

## Acceptance Criteria

- [x] `package.json` `collectCoverageFrom` excludes `*.module.ts`, `*.dto.ts`, `main.ts`, `prisma/**`.
- [x] `package.json` sets `coverageThreshold.global` based on the measured local baseline (documented in `TEST_LOG.md`). Measured baseline: statements 91.59%, branches 71.21%, functions 92.01%, lines 91.41%; threshold set to 90/68/90/90.
- [x] `codecov.yml` present, configuring `patch` target at 80%.
- [x] `.github/workflows/ci.yml` `test` job runs `npm run test:cov` and uploads the lcov report to Codecov.
- [x] `.github/workflows/ci.yml` has a new `test-e2e` job that provisions Postgres, runs `prisma migrate deploy` + `prisma db seed`, then `npm run test:e2e`, and this job is green.
- [x] **Scope change (user-confirmed):** the skip-decision-path criterion is descoped to the `change_to_skip` transition only. `confirm-skip` (which would create `01_skip_reason.md/json` and flip `status` to `skipped`) cannot be exercised because `prisma/seed.ts` does not seed an active `skip_reason` PromptTemplate — calling it throws `500`. This is a pre-existing product gap discovered during this task, not caused by it. Logged as a follow-up gap in `TASK_BOARD.md`; out of scope for TASK-PH-017 per user decision.
- [x] New e2e test covers the `change_to_skip` override path per ADR-016: `status` remains `paused_after_analysis` until skip artifacts are physically created.
- [x] README has a coverage badge.
- [x] A new ADR (ADR-022) in `project-management/DECISIONS.md` records the strategy (global floor + diff coverage + CI-enforced e2e).

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-PH-017 ..."`
3. `git push -u origin task/TASK-PH-017-coverage-and-e2e-ci`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.
