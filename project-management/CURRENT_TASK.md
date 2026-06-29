# Current Task

## Task ID

`TASK-006A`

## Title

Add unit test setup and conventions

## Source

`docs/07_task_backlog.md`

## Goal

Establish a working unit test baseline for the NestJS project. Core services must be testable without real AI provider calls.

## Scope

Allowed:

- configure Jest for NestJS if not already configured;
- create jest.config.ts if needed;
- create test/setup.ts with shared test configuration;
- add at least one passing sample unit test for a pure service;
- document test file naming convention;
- ensure AI provider abstraction can be mocked in tests.

Not allowed:

- writing P0 business logic unit tests (TASK-006B);
- implementing any business features;
- adding real OpenAI/Anthropic calls;
- changing product scope.

## Acceptance Criteria

- Jest is configured for the NestJS application.
- Unit tests can be run with `npm run test`.
- Test file naming convention is documented or obvious from examples.
- Core services can be tested without real OpenAI/Anthropic calls.
- AI provider abstraction can be mocked or replaced with a fake provider in tests.
- Tests do not require the full prompt pipeline to be implemented.

## Test Requirement

- At least one passing sample unit test for a pure service.
- `npm run test` must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- The repository has a working unit test baseline and Claude Code can safely add tests for new services.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-006A section in docs/07_task_backlog.md.
4. Create git branch as specified in Git Instructions.
5. Propose an implementation plan.
6. List files expected to change.
7. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows commands run and results.
3. Explains how acceptance criteria were met.
4. Updates project-management/TEST_LOG.md.
5. Suggests next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-006A-unit-test-setup`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-006A add unit test setup and conventions"`
3. `gh pr create --title "feat: TASK-006A unit test setup" --body "Closes TASK-006A" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`