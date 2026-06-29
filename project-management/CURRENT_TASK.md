# Current Task

## Task ID

`TASK-007`

## Title

Implement company and role slug normalization utility

## Source

`docs/07_task_backlog.md`

## Goal

Create a SlugService with separate normalization rules for company slugs and role slugs. Slugs are used for workspace folder naming and must be safe, consistent, and Unicode-aware.

## Scope

Allowed:

- create src/common/slug/slug.service.ts with normalizeCompanySlug and normalizeRoleSlug methods;
- create src/common/slug/slug.module.ts;
- create src/common/slug/slug.service.spec.ts with unit tests;
- export SlugModule for use in other modules.

Not allowed:

- creating Prisma models (TASK-008);
- creating workspace folders on disk (TASK-011);
- implementing business features beyond slug normalization;
- changing product scope.

## Acceptance Criteria

- Company slug preserves English letters, Unicode Cyrillic letters, numbers and underscores.
- Role slug preserves English letters, Unicode Cyrillic letters and underscores.
- Role slug removes numbers unless rules change later.
- Separators and whitespace are converted to underscores.
- Repeated underscores are collapsed.
- Leading and trailing underscores are trimmed.
- Original values are not mutated.

## Test Requirement

- Unit tests cover: Action1, CHECK24, Omega CRM, Ukrainian/Cyrillic company examples.
- Unit tests cover role slug examples with numbers removed.
- Unit tests cover edge cases: repeated spaces, mixed separators, empty string.
- `npm run test` must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- Slug rules match docs/02_user_flows_v3_consistent.md and docs/09_artifact_storage.md.
- All unit tests pass.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-007 section in docs/07_task_backlog.md.
4. Read slug rules in docs/02_user_flows_v3_consistent.md and docs/09_artifact_storage.md.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact slug transformation examples.
7. List files expected to change.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows test results.
3. Explains how acceptance criteria were met.
4. Updates project-management/TEST_LOG.md.
5. Suggests next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-007-slug-normalization`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-007 implement company and role slug normalization utility"`
3. `gh pr create --title "feat: TASK-007 slug normalization utility" --body "Closes TASK-007" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`