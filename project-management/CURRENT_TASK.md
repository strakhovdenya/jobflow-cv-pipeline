# Current Task

## Task ID

`TASK-004`

## Title

Configure Docker Compose with persistent PostgreSQL volume

## Source

`docs/07_task_backlog.md`

## Goal

Add Docker Compose with PostgreSQL that survives container restarts and recreation as long as the named volume is not explicitly deleted.

## Scope

Allowed:

- create docker-compose.yml with postgres service and named volume;
- add .env.example with database variables;
- update README with Docker start command and data-loss warning;
- add POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB variables.

Not allowed:

- adding Redis or other services (later tasks);
- adding Prisma schema (TASK-006);
- implementing business features;
- changing product scope.

## Acceptance Criteria

- docker-compose.yml defines a postgres service.
- PostgreSQL uses a named volume: postgres_data:/var/lib/postgresql/data.
- Top-level volumes.postgres_data is defined.
- .env.example includes database connection variables.
- README warns that docker compose down -v deletes data.
- docker compose up -d postgres starts successfully.
- PostgreSQL is reachable after container restart.

## Test Requirement

- Manual check: start postgres, stop with docker compose down, restart, verify data survives.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- PostgreSQL starts via Docker Compose.
- Data survives docker compose down and docker compose up -d postgres.
- README explains this clearly.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-004 section in docs/07_task_backlog.md.
4. Propose an implementation plan.
5. List files expected to change.
6. List commands/tests expected to run.
7. Wait for user approval before multi-file edits.

After implementation:

1. Show changed files.
2. Show commands run and results.
3. Explain how acceptance criteria were met.
4. Update project-management/TEST_LOG.md.
5. Suggest the next status for project-management/TASK_BOARD.md.