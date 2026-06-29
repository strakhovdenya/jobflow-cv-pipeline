# Current Task

## Task ID

`TASK-008 + TASK-009`

## Title

Create Company, JobVacancy and ApplicationWorkspace Prisma models

## Source

`docs/07_task_backlog.md`

## Goal

Add Company, JobVacancy and ApplicationWorkspace models to prisma/schema.prisma, run migration, and create NestJS services for each entity.

## Scope

Allowed:

- add Company, JobVacancy, ApplicationWorkspace models to prisma/schema.prisma;
- add WorkspaceStatus, VacancyDecision, UserReviewState enums;
- run npx prisma migrate dev --name add-core-models;
- create src/company/company.service.ts and company.module.ts;
- create src/vacancy/vacancy.service.ts and vacancy.module.ts;
- create src/workspaces/workspaces.service.ts and workspaces.module.ts;
- add basic service tests for create/read operations.

Not allowed:

- adding DTO validation (TASK-010);
- creating workspace folders on disk (TASK-011);
- adding HTTP endpoints/controllers (TASK-012, TASK-013);
- adding GeneratedArtifact or other Phase 2 models;
- implementing business features beyond model setup;
- changing product scope.

## Acceptance Criteria

- Company stores nameOriginal and companySlug.
- JobVacancy stores roleTitleOriginal, roleSlug, sourceUrl, vacancyTextPath, vacancyTextHash, companyId relation.
- ApplicationWorkspace links to Company and JobVacancy.
- ApplicationWorkspace stores workspaceSlug, status, currentDecision, reviewState.
- Initial workspace status is source_saved.
- Relations: Company 1 → * JobVacancy, JobVacancy 1 → 1 ApplicationWorkspace.
- Migration runs without errors.
- Company and vacancy records can be created and queried from PostgreSQL.
- Workspace can be created and retrieved with linked company/vacancy metadata.

## Test Requirement

- Service test for create/read Company.
- Service test for create/read JobVacancy linked to Company.
- Service test for create/read ApplicationWorkspace linked to Company and JobVacancy.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- All three models exist in PostgreSQL via Prisma migration.
- Services can create and query all three entities.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-008 and TASK-009 sections in docs/07_task_backlog.md.
4. Read domain model in docs/03_domain_model.md for exact field definitions.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact Prisma model fields.
7. List files expected to change.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows migration output and test results.
3. Explains how acceptance criteria were met.
4. Updates project-management/TEST_LOG.md.
5. Suggests next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-008-009-prisma-core-models`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-008+009 add Company, JobVacancy and ApplicationWorkspace Prisma models"`
3. `gh pr create --title "feat: TASK-008+009 core Prisma models" --body "Closes TASK-008, Closes TASK-009" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`