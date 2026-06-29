# Current Task

## Task ID

`TASK-017 + TASK-019`

## Title

KnowledgeSource model, import service and EvidenceItem model with seed data

## Source

`docs/07_task_backlog.md`

## Goal

Track source knowledge files in PostgreSQL via KnowledgeSource model. Add EvidenceItem model with seed data for anti-overclaiming checks.

## Scope

Allowed:

- add KnowledgeSource model to prisma/schema.prisma;
- add EvidenceItem model to prisma/schema.prisma;
- run migration;
- create src/knowledge-sources/knowledge-sources.service.ts with import, activate/deactivate, findActive methods;
- create src/knowledge-sources/knowledge-sources.module.ts;
- create src/evidence/evidence.service.ts with findByCategory method;
- create src/evidence/evidence.module.ts;
- create prisma/seed.ts with EvidenceItem seed data for Node.js, TypeScript, Azure Functions, PostgreSQL, NestJS, Docker, Kubernetes, AWS, AI/RAG;
- add service tests for both modules.

Not allowed:

- adding KnowledgeSource selection for PromptRun (TASK-018 — depends on Phase 3);
- adding PromptTemplate model (TASK-020);
- adding AI pipeline or prompt runs;
- changing product scope.

## Acceptance Criteria

- KnowledgeSource stores filePath, sourceType, isActive, contentHash, versionLabel, importedAt.
- Supported sourceTypes: master_profile, tech_stack_matrix, case_deep_dive, cv_rules, certifications.
- Source file can be activated and deactivated via service method.
- EvidenceItem stores claimArea, category (allowed/risky/unsupported), description, notes.
- Seed includes evidence categories for: Node.js, TypeScript, Azure Functions, PostgreSQL, NestJS, Docker, Kubernetes, AWS, AI/RAG.
- Migration runs without errors.
- npx prisma db seed works.

## Test Requirement

- Service test for importing a knowledge source and calculating hash.
- Service test for activate/deactivate.
- Service test that seed returns expected evidence categories.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- Source knowledge files are tracked in PostgreSQL.
- Backend can query evidence rules for safety checks.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-017 and TASK-019 sections in docs/07_task_backlog.md.
4. Read docs/08_ai_pipeline.md for knowledge source types and evidence categories.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact model fields and seed data examples.
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
1. `git checkout -b task/TASK-017-019-knowledge-evidence`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-017+019 KnowledgeSource model, import service and EvidenceItem seed data"`
3. `gh pr create --title "feat: TASK-017+019 knowledge sources and evidence items" --body "Closes TASK-017, Closes TASK-019" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`