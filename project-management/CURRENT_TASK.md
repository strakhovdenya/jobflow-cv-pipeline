# Current Task

## Task ID

`TASK-029`

## Title

Implement skip reason generation

## Source

`docs/07_task_backlog.md`

## Goal

When a workspace decision is or becomes `skip`, generate canonical skip artifacts (01_skip_reason.md/json), transition workspace status to `skipped`, and block Prompt 2 unless a manual override is logged later (TASK-030).

## Docs to Read

- `docs/08_ai_pipeline.md` lines 511–600 (section 9 — Skip Branch: purpose, inputs, output artifacts, expected JSON schema, markdown sections)
- `docs/09_artifact_storage.md` lines 140–250 (canonical vs download artifact naming, SKIP_<company_slug>_<role_slug>_reason_RU.md pattern)
- `project-management/DECISIONS.md` — ADR-015, ADR-016 (already loaded via CLAUDE.md context, re-check before implementing status transition)

If these sections are insufficient to safely implement the State Machine below, stop and ask — do not guess.

## State Machine

| Trigger | Precondition (`status`) | `currentDecision` after | `status` after | Artifacts created |
|---|---|---|---|---|
| Prompt 1 decision = `skip` (no review yet) | `paused_after_analysis` | `skip` (unchanged) | `paused_after_analysis` | none yet — waits for explicit trigger below |
| User confirms skip via new endpoint | `paused_after_analysis`, `currentDecision = skip` | `skip` (unchanged) | `skipped` | `01_skip_reason.md`, `01_skip_reason.json` |
| User confirmed skip after `change_to_skip` override (TASK-028) | `paused_after_analysis`, `currentDecision = skip`, `reviewState = overridden` | `skip` (unchanged) | `skipped` | `01_skip_reason.md`, `01_skip_reason.json` |

If anything in this table seems inconsistent with the referenced docs, stop and ask — do not silently correct it.

## Scope

Allowed:

- create src/pipeline/skip/skip-reason.service.ts;
- create src/pipeline/skip/skip-reason.module.ts;
- create src/pipeline/skip/schemas/skip-reason.schema.ts (manual validation, matching pattern from TASK-027's prompt1.schema.ts);
- add POST /workspaces/:id/confirm-skip endpoint;
- update workspaces.service.ts to support status transition to skipped;
- generate 01_skip_reason.md and 01_skip_reason.json as GeneratedArtifact;
- register human-readable download name SKIP_<company_slug>_<role_slug>_reason_RU.md as downloadFileName on the artifact;
- use existing AiProvider interface and FakeAiProvider — no real API calls;
- block Prompt 2 endpoint when workspace.status === skipped;
- add service and controller tests.

Not allowed:

- implementing manual override logging/audit model (TASK-030);
- implementing Prompt 2 (TASK-031+);
- adding real OpenAI/Anthropic provider;
- changing product scope.

## Acceptance Criteria

- POST /workspaces/:id/confirm-skip generates skip artifacts and transitions status.
- Precondition: workspace.status === paused_after_analysis and workspace.currentDecision === skip. Otherwise 400.
- 01_skip_reason.json matches the schema in docs/08_ai_pipeline.md section 9.4 (schema_version, step, decision, score, company, role, location_remote, core_stack, main_skip_reason, key_mismatches, evidence_from_profile, risks_if_applying_anyway, useful_keywords_to_track_later, future_reconsideration_condition).
- 01_skip_reason.md is generated from the same data (Russian language content per docs/08_ai_pipeline.md 9.5, structure only needs to be reasonable — content comes from FakeAiProvider in this task).
- Both files registered as GeneratedArtifact, linked to workspace.
- Human-readable download name follows SKIP_<company_slug>_<role_slug>_reason_RU.md pattern.
- workspace.status becomes skipped after successful generation.
- Calling Prompt 2 endpoint (POST /workspaces/:id/generate-cv-content, if it exists from a later task — otherwise just enforce at service level for now) on a skipped workspace is blocked.
- Invalid AI output (malformed JSON) does not crash the endpoint — saves markdown if available, leaves workspace in paused_after_analysis, returns clear error.

## Test Requirement

- Service test: confirm-skip on valid paused_after_analysis + skip workspace — artifacts created, status becomes skipped.
- Service test: confirm-skip blocked when status is not paused_after_analysis — 400 error.
- Service test: confirm-skip blocked when currentDecision is not skip — 400 error.
- Service test: invalid AI JSON output — workspace stays paused_after_analysis, no crash, clear error returned.
- Unit test: download file name generation follows SKIP_<company_slug>_<role_slug>_reason_RU.md pattern.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- A workspace with decision=skip can have its skip reason generated through the API, producing real artifact files on disk, a skipped workspace status, and a Prompt 2 block — using FakeAiProvider.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file, including Docs to Read and State Machine sections above.
3. Read TASK-029 section in docs/07_task_backlog.md.
4. Create git branch as specified in Git Instructions.
5. Propose an implementation plan with exact skip JSON schema fields and FakeAiProvider sample output.
6. List files expected to change.
7. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Check each Acceptance Criterion — show as a table (✅/❌). Fix before reporting if any ❌.
2. Show changed files.
3. Show test results (one line: X/X passed).
4. Update project-management/TEST_LOG.md.
5. Suggest next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Key Invariants

- Skip artifact generation is its own AI call (uses FakeAiProvider, creates its own PromptRun/AiRun) — it is not reusing the Prompt 1 AiRun.
- `status = skipped` is only set after artifacts are physically written and registered — never set status first (see ADR-016 reasoning, applied here for the final transition).

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-029-skip-reason-generation`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-029 implement skip reason generation"`
3. `gh pr create --title "feat: TASK-029 skip reason generation" --body "Closes TASK-029" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`