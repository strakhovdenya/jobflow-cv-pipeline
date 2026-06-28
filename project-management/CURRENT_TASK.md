# Current Task

## Task ID

`TASK-006`

## Title

Add Prisma setup

## Source

`docs/07_task_backlog.md`

## Goal

Add Prisma ORM to the NestJS project and connect it to PostgreSQL. Create PrismaService as a NestJS provider. Run an initial empty migration to verify the setup works.

## Scope

Allowed:

- install Prisma and @prisma/client;
- create prisma/schema.prisma with datasource and generator blocks only;
- create src/prisma/prisma.module.ts and src/prisma/prisma.service.ts;
- register PrismaModule in AppModule;
- update .env.example with DATABASE_URL if not already present;
- run initial migration with npx prisma migrate dev;
- add prisma generate to package.json scripts.

Not allowed:

- adding any domain models to schema.prisma (TASK-008, TASK-009);
- adding Redis or queues;
- implementing business features;
- changing product scope.

## Acceptance Criteria

- Prisma connects to PostgreSQL.
- prisma/schema.prisma exists with datasource postgresql and generator client.
- Initial migration runs without errors.
- PrismaService is available as NestJS provider via PrismaModule.
- No destructive reset command is used in normal startup.
- npx prisma migrate dev works locally.

## Test Requirement

- Add a test or script that verifies database connection via PrismaService.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- npx prisma migrate dev works locally and persists schema in PostgreSQL.
- PrismaService can be injected in other NestJS modules.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-006 section in docs/07_task_backlog.md.
4. Create git branch as specified in Git Instructions.
5. Propose an implementation plan.
6. List files expected to change.
7. List commands expected to run.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows commands run and results.
3. Explains how acceptance criteria were met.
4. Updates project-management/TEST_LOG.md.
5. Suggests next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-006-prisma-setup`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-006 add Prisma setup and PrismaService"`
3. `gh pr create --title "feat: TASK-006 Prisma setup" --body "Closes TASK-006" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`