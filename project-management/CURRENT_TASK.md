# Current Task

## Task ID

`TASK-010 + TASK-011 + TASK-012 + TASK-013`

## Title

Manual workspace creation — DTO validation, folder creation, API endpoints

## Source

`docs/07_task_backlog.md`

## Goal

Implement the full manual workspace creation flow: DTO validation → folder creation on disk → vacancy file saved → database records created → API endpoints exposed.

## Scope

Allowed:

- create src/workspaces/dto/create-workspace.dto.ts with validation;
- install and configure class-validator and class-transformer if not present;
- update workspaces.service.ts to orchestrate company + vacancy + workspace creation;
- create src/artifacts/artifact-storage.service.ts for folder/file operations;
- create src/config/storage.config.ts for storage root path;
- create storage/applications/ directory;
- implement POST /workspaces endpoint;
- implement GET /workspaces and GET /workspaces/:id endpoints;
- add controller and service tests.

Not allowed:

- adding GeneratedArtifact model (TASK-014);
- adding AI pipeline or prompt runs;
- adding frontend;
- changing product scope.

## Acceptance Criteria

- companyNameOriginal is required, empty string rejected.
- roleTitleOriginal is required, empty string rejected.
- vacancyText is required, empty string rejected.
- sourceUrl is optional.
- Validation returns clear error messages.
- Workspace folder format: storage/applications/YYYY_MM_DD_company_slug_role_slug/
- Vacancy text saved as 00_vacancy_source.txt in UTF-8.
- Line breaks and special characters in vacancy text are preserved.
- File path and content hash stored in JobVacancy record.
- POST /workspaces returns workspace ID, status, slugs, folder path and canonical file path.
- GET /workspaces returns list ordered by createdAt desc.
- GET /workspaces/:id returns company, role, status, decision, paths.

## Test Requirement

- DTO tests for missing companyNameOriginal, roleTitleOriginal, vacancyText.
- Service test verifies physical file exists with exact content after creation.
- Controller test for POST /workspaces successful creation.
- Controller tests for GET /workspaces and GET /workspaces/:id.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- A user can call POST /workspaces and get a workspace with a real folder and 00_vacancy_source.txt on disk.
- GET endpoints return correct data.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-010, TASK-011, TASK-012, TASK-013 sections in docs/07_task_backlog.md.
4. Read docs/02_user_flows_v3_consistent.md for workspace folder naming rules.
5. Read docs/09_artifact_storage.md for artifact storage structure.
6. Create git branch as specified in Git Instructions.
7. Propose an implementation plan with folder naming example.
8. List files expected to change.
9. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows test results.
3. Shows example POST /workspaces request and response.
4. Explains how acceptance criteria were met.
5. Updates project-management/TEST_LOG.md.
6. Suggests next status for project-management/TASK_BOARD.md.
7. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-010-013-workspace-creation-api`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-010+011+012+013 manual workspace creation API with folder and file storage"`
3. `gh pr create --title "feat: TASK-010-013 workspace creation API" --body "Closes TASK-010, Closes TASK-011, Closes TASK-012, Closes TASK-013" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`