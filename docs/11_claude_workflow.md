# JobFlow CV Pipeline — Claude Code Workflow

## 1. Purpose

This document explains how to use Claude Code safely and productively for JobFlow CV Pipeline implementation.

Claude Code should be used as an implementation assistant, not as an autonomous product manager. Product scope comes from `docs/` and execution scope comes from `project-management/CURRENT_TASK.md`.

## 2. Core Principle

```text
One task -> one plan -> approved implementation -> tests/checks -> status update.
```

Claude Code must not jump between tasks, silently expand scope, or modify unrelated documentation/code.

## 3. Required Files

Before starting Claude Code, the repository should contain:

```text
CLAUDE.md
docs/00_product_vision_updated_consistent.md
docs/01_requirements.md
docs/02_user_flows_v3_consistent.md
docs/03_domain_model.md
docs/04_architecture.md
docs/05_epics.md
docs/06_roadmap.md
docs/07_task_backlog.md
docs/08_ai_pipeline.md
docs/09_artifact_storage.md
project-management/TASK_BOARD.md
project-management/CURRENT_TASK.md
project-management/DECISIONS.md
project-management/TEST_LOG.md
project-management/BLOCKERS.md
project-management/CHANGELOG.md
```

## 4. Selecting a Task

1. Open `project-management/TASK_BOARD.md`.
2. Pick the next `TODO` task with satisfied dependencies.
3. Copy the full task details from `docs/07_task_backlog.md` into `project-management/CURRENT_TASK.md`.
4. Mark the task as `IN_PROGRESS` in `TASK_BOARD.md`.
5. Start Claude Code from the repository root.

Do not let Claude Code choose the next task automatically.

## 5. First Prompt for Claude Code

Use this prompt at the start of a task:

```text
Read CLAUDE.md and project-management/CURRENT_TASK.md.
Then read the matching task in docs/07_task_backlog.md and only the related docs needed for this task.

Before editing files, propose:
1. implementation plan;
2. files you expect to change;
3. commands you expect to run;
4. tests/checks you will use;
5. risks or assumptions.

Do not edit files until I approve the plan.
```

## 6. Reviewing the Plan

Approve the plan only if:

- it matches the current task;
- it does not add unrelated features;
- it does not move P1/P2 features into MVP;
- it includes tests/checks;
- it respects PostgreSQL/filesystem/AI provider architecture;
- it does not overwrite existing docs unnecessarily.

If the plan is too broad, ask Claude Code to reduce scope.

## 7. Implementation Rules

Claude Code may edit files only after the plan is approved.

During implementation:

- keep changes small;
- prefer pure services for deterministic logic;
- keep AI provider calls behind an interface;
- keep filesystem paths centralized;
- keep PostgreSQL metadata separate from physical artifacts;
- do not use real AI calls in unit tests;
- avoid changing docs outside the task scope.

## 8. Testing Rules

For every implementation task, ask Claude Code:

```text
Run the relevant tests and show the results.
If tests cannot be run, explain why and provide exact manual verification steps.
```

Required MVP test areas:

- slug normalization;
- workspace validation;
- canonical artifact naming;
- skip handling;
- approval gates;
- anti-overclaiming guard;
- PostgreSQL persistence;
- first usable MVP smoke test.

## 9. PostgreSQL Persistence Verification

For Docker/PostgreSQL tasks, verify that local data survives:

```bash
docker compose up -d
# create test table/record
docker compose down
docker compose up -d
# verify test table/record still exists
```

Expected result:

```text
Data survives because PostgreSQL uses named volume postgres_data.
```

Do not treat `docker compose down -v` as a normal command. It deletes the volume and local database data.

Record the result in `project-management/TEST_LOG.md`.

## 10. Handling Failed Tests

If tests fail:

1. Do not continue to unrelated work.
2. Ask Claude Code to explain the failure.
3. Fix only what is needed for the current task.
4. Re-run tests.
5. If blocked, update `project-management/BLOCKERS.md`.

## 11. Updating Project Management Files

After a task is implemented:

- update `TASK_BOARD.md` status to `REVIEW` or `DONE`;
- update `TEST_LOG.md` with commands/results;
- update `CHANGELOG.md` with short factual notes;
- update `BLOCKERS.md` if something remains unresolved;
- update `EPIC_PROGRESS.md` if a phase changed meaningfully.

Do not update statuses without evidence.

## 12. Commit Workflow

Recommended commit process:

```bash
git status
git diff
npm run test
# optional: npm run lint, npm run build when available
git add <task-related-files>
git commit -m "TASK-XXX: short description"
```

Commit message examples:

```text
TASK-004: add persistent PostgreSQL docker compose setup
TASK-007: add slug normalization utility
TASK-029: add skip reason artifact generation
```

## 13. Scope Control

Claude Code should not:

- implement multiple backlog tasks at once;
- introduce frontend before the frontend phase;
- add Redis/BullMQ before the async phase;
- make Prompt 3/Prompt 5 mandatory for MVP;
- make cover letters part of first MVP;
- change canonical artifact names without approval;
- replace filesystem artifact storage with database-only storage;
- call real AI providers in unit tests.

## 14. When to Update CLAUDE.md

Update `CLAUDE.md` only when:

- Claude repeats the same mistake;
- a code review finds a rule that should have been known;
- a project convention becomes stable;
- a new command or test becomes standard.

Keep `CLAUDE.md` concise. Detailed process belongs in this file or path-specific docs.

## 15. End-of-Task Prompt

Use this after implementation:

```text
Summarize:
1. files changed;
2. what was implemented;
3. commands/tests run;
4. acceptance criteria status;
5. remaining risks;
6. recommended TASK_BOARD status.

Do not start the next task.
```
