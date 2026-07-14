# Current Task

## TASK-PH-018 — Seed skip_reason PromptTemplate to fix confirm-skip

User-selected 2026-07-14 (Phase PH-2 out-of-band addition — closes a gap logged during
TASK-PH-017, not part of the original Phase 9 sequence).

## Status

DONE (closed 2026-07-14).

## Context

`SkipReasonService.confirmSkip()` (`src/pipeline/skip/skip-reason.service.ts`) looks up
an active `PromptTemplate` for step `skip_reason` and throws `500 — No active skip_reason
template found` if none exists. `prisma/seed.ts` currently seeds `PromptTemplate` rows for
`prompt_1`, `prompt_2`, `prompt_3` and `prompt_5` only — there is no `skip_reason` row and
no `prisma/prompts/skip_reason.txt` content file. This means `POST
/workspaces/:id/confirm-skip` 500s on any environment provisioned via the standard seed
script (including CI). Discovered 2026-07-14 during TASK-PH-017; descoped from that task
per user decision and logged in `TASK_BOARD.md` under "Known Gaps".

The `FakeAiProvider` (`src/ai/providers/fake.provider.ts`) already has a
`FAKE_SKIP_REASON_JSON` fixture and already branches on `options.step === 'skip_reason'`
— the code path is complete. This is purely a seed-data gap.

## Docs to Read

- `src/pipeline/skip/skip-reason.service.ts` — full file (`confirmSkip()` method: template
  lookup at line 73, artifact writes, status transition to `skipped`).
- `src/pipeline/schemas/skip-reason.schema.ts` — full file (`SkipReasonAnalysis` interface
  and `validateSkipReasonJson()` — defines the exact JSON shape the seeded prompt content
  must instruct the model to return).
- `src/ai/providers/fake.provider.ts` — `FAKE_SKIP_REASON_JSON` fixture (lines 27–56) and
  the `options.step === 'skip_reason'` branch (lines 300–301) — confirms the fake-provider
  path is already correct and needs no code change.
- `prisma/seed.ts` — full file (`promptTemplates` array structure, `readPromptFile()`
  helper, upsert pattern).
- `prisma/prompts/prompt3.txt` — full file (placeholder-prompt pattern to follow: explicit
  output contract, field-by-field rules, an explicit note that it is placeholder content
  pending full prompt-engineering review).
- `test/skip-flow.e2e-spec.ts` — full file (existing `change_to_skip` (ADR-016) e2e test
  and its `NOTE` comment explaining why `confirm-skip` was not exercised — this task
  removes that limitation).
- `project-management/DECISIONS.md` — ADR-005 (skip stops pipeline by default, confirm-skip
  creates `01_skip_reason.md/json` and transitions `status = skipped`), ADR-016
  (`change_to_skip` vs `confirm-skip` two-step distinction — do not confuse the two).

## Key Invariants

- Do not change `SkipReasonService`, `skip-reason.schema.ts`, or `fake.provider.ts` — the
  code path is already correct; this task is seed-data + placeholder-prompt-content only.
- The seeded `skip_reason.txt` prompt must instruct the model to return JSON with exactly
  the fields required by `validateSkipReasonJson()`: `schema_version`, `step`,
  `decision: "skip"`, `score` (integer), `company`, `role`, `location_remote`,
  `core_stack[]`, `main_skip_reason`, `key_mismatches[]`, `evidence_from_profile[]`,
  `risks_if_applying_anyway[]`, `useful_keywords_to_track_later[]`,
  `future_reconsideration_condition`. Missing/mistyped fields fail validation the same way
  a bad AI response would (see the `validation.success === false` branch in
  `skip-reason.service.ts`, which still writes `01_skip_reason.md` but not `.json` and
  reverts `status` to `analysis_ready`).
- Follow the same placeholder-content pattern already accepted for `prompt3.txt`/
  `prompt5.txt` (placeholder pending full prompt-engineering review) — do not attempt to
  author production-quality prompt content in this task.
- `prisma/seed.ts` upserts by fixed `id` (`seed-skip-reason-v1`) — never change an existing
  seed row's `id` once added, per the seed script's own upsert contract.
- ADR-016: `confirm-skip` requires `workspace.currentDecision === 'skip'` and
  `status` in `(paused_after_analysis, analysis_ready)` — the extended e2e test must call
  `change_to_skip` first (as the existing test already does) before `confirm-skip`.

## Acceptance Criteria

- [x] `prisma/prompts/skip_reason.txt` added — placeholder content instructing the model to
      return JSON matching `SkipReasonAnalysis` exactly, following the `prompt3.txt`/
      `prompt5.txt` output-contract style.
- [x] `prisma/seed.ts` `promptTemplates[]` gains a `skip_reason` entry (`id:
      'seed-skip-reason-v1'`, `promptKey: 'skip_reason'`, `step: 'skip_reason'`,
      `version: 1`, `content: readPromptFile('skip_reason.txt')`) and `npx prisma db seed`
      runs cleanly (idempotent, verified by running it twice).
- [x] `test/skip-flow.e2e-spec.ts` extended: after `change_to_skip`, calls `POST
      /workspaces/:id/confirm-skip` and asserts `status` transitions to `skipped`,
      `01_skip_reason.md` and `01_skip_reason.json` exist on disk, and both are registered
      as `GeneratedArtifact` rows. The old `NOTE` comment explaining the previous gap is
      removed/updated.
- [x] `npm run test` all suites green; `npm run test:e2e` all suites green; `npx tsc
      --noEmit` clean.
- [x] `TASK_BOARD.md` "Known Gaps" entry for `confirm-skip` removed/resolved; row for
      TASK-PH-018 added with status `DONE`.
- [x] `project-management/TEST_LOG.md` has a dated entry with commands + results.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-PH-018 ..."`
3. `git push -u origin task/TASK-PH-018-seed-skip-reason-template`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
