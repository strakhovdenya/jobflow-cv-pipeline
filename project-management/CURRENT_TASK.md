# Current Task

## Task ID

`TASK-028`

## Title

Implement Prompt 1 decision gate endpoint

## Source

`docs/07_task_backlog.md`

## Goal

Expose an API endpoint that lets a human reviewer approve apply, approve maybe, pause, or change the Prompt 1 decision to skip. Only approved apply/maybe can proceed to Prompt 2.

## Scope

Allowed:

- create src/review-gates/review-gates.service.ts and review-gates.module.ts;
- add POST /workspaces/:id/review-decision endpoint accepting approve_apply, approve_maybe, pause, change_to_skip;
- update workspaces.service.ts to store reviewState and enforce decision gate logic;
- add service and controller tests.

Not allowed:

- implementing skip artifact generation (TASK-029);
- implementing manual override logging (TASK-030);
- implementing Prompt 2 (TASK-031+);
- changing product scope.

## Acceptance Criteria

- API exposes decision review action via POST /workspaces/:id/review-decision.
- User can approve apply, approve maybe, pause, or change to skip.
- Review decision and reviewState are stored on the workspace.
- Only approved apply/maybe allows proceeding to Prompt 2 — enforced at service level.
- Pausing keeps the workspace in a non-progressable state without losing the original Prompt 1 decision.

## Test Requirement

- Service test for apply approval — workspace unlocked for Prompt 2.
- Service test for maybe approval — workspace unlocked for Prompt 2.
- Service test for pause — workspace stays blocked.
- Service test for change_to_skip — workspace status updates, blocked from Prompt 2.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- A human reviewer can approve, pause, or change a Prompt 1 decision through the API, and the backend enforces that only approved apply/maybe can continue.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-028 section in docs/07_task_backlog.md.
4. Read docs/08_ai_pipeline.md section on the Prompt 1 decision gate.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with the exact decision state machine.
7. List files expected to change.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows test results.
3. Shows example requests for each decision path.
4. Explains how acceptance criteria were met.
5. Updates project-management/TEST_LOG.md.
6. Suggests next status for project-management/TASK_BOARD.md.
7. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-028-decision-gate`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-028 implement Prompt 1 decision gate endpoint"`
3. `gh pr create --title "feat: TASK-028 Prompt 1 decision gate" --body "Closes TASK-028" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`