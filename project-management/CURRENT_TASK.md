# Current Task

## Task ID

`TASK-020 + TASK-021 + TASK-022 + TASK-023 + TASK-024`

## Title

PromptTemplate model, AiRun model, AI provider abstraction and PromptRun model

## Source

`docs/07_task_backlog.md`

## Goal

Build the complete infrastructure for AI prompt execution: versioned prompt templates, AI usage tracking, provider abstraction interface and PromptRun traceability model.

## Scope

Allowed:

- add PromptTemplate, AiRun, PromptRun models to prisma/schema.prisma;
- run migration;
- create src/prompt-templates/prompt-templates.service.ts with create, findActive, findByStep methods;
- seed Prompt 1 and Prompt 2 templates in prisma/seed.ts;
- create src/ai-runs/ai-runs.service.ts for saving AI call records;
- create src/ai/ai-provider.interface.ts with provider contract;
- create src/ai/providers/fake.provider.ts for testing;
- create src/ai/ai.module.ts;
- create src/prompt-runs/prompt-runs.service.ts with create and complete methods;
- add service tests for all new modules.

Not allowed:

- implementing real OpenAI or Anthropic API calls (TASK-026);
- implementing Prompt 1 input builder (TASK-025);
- implementing Prompt 1 execution (TASK-026);
- adding frontend;
- changing product scope.

## Acceptance Criteria

- PromptTemplate stores promptKey, step, version, content, isActive, description.
- Creating a new version does not overwrite old versions.
- Only one active template per step enforced by service logic.
- Seed creates active Prompt 1 and Prompt 2 templates.
- AiRun stores provider, model, status, requestHash, responseHash, inputTokens, outputTokens, totalTokens, errorMessage.
- AI provider interface accepts prompt text, input context and returns text, usage data.
- Provider can be swapped via config or injection.
- FakeProvider returns predictable output for tests.
- PromptRun stores workspaceId, promptStep, templateId, templateVersion, status, inputHash, sourceSnapshot, aiRunId, outputArtifactIds.
- PromptRun status: pending, running, completed, failed.

## Test Requirement

- Service tests for PromptTemplate: version creation, active template selection, one active per step.
- Seed verification: active Prompt 1 and Prompt 2 exist after seed.
- Service tests for AiRun: save successful run, save failed run.
- Unit test for FakeProvider: returns expected output.
- Service tests for PromptRun: create and complete.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- Fresh database has Prompt 1 and Prompt 2 templates after seed.
- AI calls can be logged with token usage.
- Prompt pipeline can call AI through a stable interface.
- Every AI output has traceable prompt execution metadata.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-020, TASK-021, TASK-022, TASK-023, TASK-024 sections in docs/07_task_backlog.md.
4. Read docs/08_ai_pipeline.md for prompt pipeline architecture.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact model fields.
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
1. `git checkout -b task/TASK-020-024-ai-pipeline-infrastructure`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-020+021+022+023+024 PromptTemplate, AiRun, AI provider abstraction and PromptRun models"`
3. `gh pr create --title "feat: TASK-020-024 AI pipeline infrastructure" --body "Closes TASK-020, Closes TASK-021, Closes TASK-022, Closes TASK-023, Closes TASK-024" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`