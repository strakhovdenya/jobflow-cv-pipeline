```markdown
# Current Task

## Task ID

`TASK-005`

## Title

Add PostgreSQL persistence verification script or checklist

## Source

`docs/07_task_backlog.md`

## Goal

Create a documented checklist or script that verifies PostgreSQL named-volume persistence after container stop and restart.

## Scope

Allowed:

- create scripts/check-postgres-persistence.md with step-by-step checklist;
- optionally create scripts/check-postgres-persistence.sh for automation;
- add npm script in package.json to reference the check;
- update README with a note about the persistence check.

Not allowed:

- changing docker-compose.yml (TASK-004 scope);
- adding Prisma schema (TASK-006);
- implementing business features;
- changing product scope.

## Acceptance Criteria

- scripts/check-postgres-persistence.md exists with step-by-step checklist.
- Checklist covers: start postgres, create test data, docker compose down, docker compose up -d postgres, verify data exists.
- Checklist explicitly states that docker compose down -v is destructive and must not be used in normal startup.
- README references the persistence check.

## Test Requirement

- Run the checklist manually once against the running Docker setup.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- A developer can follow the checklist and verify that data survives local Docker restart.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-005 section in docs/07_task_backlog.md.
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
1. `git checkout -b task/TASK-005-postgres-persistence-check`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-005 add PostgreSQL persistence verification checklist"`
3. `gh pr create --title "feat: TASK-005 PostgreSQL persistence checklist" --body "Closes TASK-005" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`
```