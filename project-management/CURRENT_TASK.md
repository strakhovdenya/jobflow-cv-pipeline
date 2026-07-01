# Current Task

## Task ID

`TASK-030`

## Title

Implement manual override logging

## Source

`docs/07_task_backlog.md`

## Goal

Allow a user to override a skipped workspace and explicitly continue toward Prompt 2, with the override logged as an auditable event. Artifacts created during skip are never deleted.

## Docs to Read

- `docs/03_domain_model.md` lines 217–234 (VacancyDecision enum, manual_override_* meaning, "logged through fields or a later ReviewDecision/ApplicationEvent table")
- `docs/03_domain_model.md` lines 2085–2105 (section 20.3 — skip flow + override sub-flow, exact transition)
- `docs/08_ai_pipeline.md` lines 621–648 (section 9.7 — Manual Review Point: user options including Override and Continue, section 9.8 Failure Handling row "User overrides skip")
- `project-management/DECISIONS.md` — ADR-016 (status=skipped meaning), and ADR-017 if added in TASK-029 (re-check before implementing status transition)

If these sections are insufficient to safely implement the State Machine below, stop and ask — do not guess.

## Existing Services to Call

- `src/review-gates/review-gates.service.ts` — review existing method signatures (submitDecision pattern from TASK-028) before adding the override method, to keep a consistent service shape.
- `src/workspaces/workspaces.service.ts` — review existing `updateStatus()` / `updateDecision()` helpers (added in TASK-025-027) — reuse them, do not duplicate status-update logic.

## State Machine

| Trigger | Precondition (`status`) | `currentDecision` after | `reviewState` after | `status` after | Side effects |
|---|---|---|---|---|---|
| User overrides a skipped workspace | `status = skipped` | `manual_override_apply` (or `manual_override_maybe` if caller specifies) | `overridden` | `cv_generation_running` | Override event logged (audit record); 01_skip_reason.md/json NOT deleted |

If anything in this table seems inconsistent with the referenced docs, stop and ask — do not silently correct it.

## Scope

Allowed:

- add an audit model to prisma/schema.prisma (e.g. DecisionOverride or ReviewDecision) storing workspaceId, fromDecision, toDecision, reasonNote (optional), reviewState, createdAt;
- run migration;
- add POST /workspaces/:id/override-skip endpoint accepting an optional reason note and a target decision (apply or maybe);
- create or extend review-gates.service.ts with an override method;
- ensure 01_skip_reason.md/json artifacts are preserved (not deleted) during override;
- add service and controller tests.

Not allowed:

- implementing Prompt 2 (TASK-031+);
- modifying skip-reason.service.ts generation logic itself (TASK-029 is closed);
- adding real OpenAI/Anthropic provider;
- changing product scope.

## Acceptance Criteria

- POST /workspaces/:id/override-skip is rejected with 400 if workspace.status !== skipped.
- Override stores fromDecision (skip), toDecision (manual_override_apply or manual_override_maybe), optional reasonNote, timestamp, reviewState.
- Override changes workspace.currentDecision to manual_override_apply or manual_override_maybe.
- Override changes workspace.status to cv_generation_running (canonical signal Prompt 2 can run — same pattern as ADR-015).
- Override changes workspace.reviewState to overridden.
- 01_skip_reason.md and 01_skip_reason.json GeneratedArtifact records and physical files are not deleted or modified.
- Audit record is queryable (e.g. via a service method) for traceability.

## Test Requirement

- Service test: override on a skipped workspace — status becomes cv_generation_running, decision becomes manual_override_apply, audit record created.
- Service test: override on a workspace not in skipped status — 400 error, no audit record created.
- Service test: skip artifacts (GeneratedArtifact rows) still exist and are unchanged after override.
- Service test: audit record stores fromDecision, toDecision, reasonNote, timestamp correctly.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- A skipped workspace can be manually overridden through the API, the override is permanently logged with before/after state, and the original skip artifacts remain untouched.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file, including Docs to Read, Existing Services to Call, and State Machine sections above.
3. Read TASK-030 section in docs/07_task_backlog.md.
4. Create git branch as specified in Git Instructions.
5. Propose an implementation plan with exact audit model fields and migration.
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

- `status = cv_generation_running` after override, not `skipped` — this is the same canonical "Prompt 2 may run" signal used in ADR-015, applied here for the override path.
- Skip artifacts are immutable after override — only new audit data is added, nothing is deleted or overwritten.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-030-manual-override-logging`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-030 implement manual override logging"`
3. `git push -u origin task/TASK-030-manual-override-logging`
4. `gh pr create --title "feat: TASK-030 manual override logging" --body "Closes TASK-030" --base main`
5. Stops completely. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`