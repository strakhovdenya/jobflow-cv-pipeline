# Current Task

## Task ID

`TASK-025 + TASK-026 + TASK-027`

## Title

Prompt 1 input builder, vacancy analysis execution and JSON validation

## Source

`docs/07_task_backlog.md`

## Goal

Implement the full Prompt 1 pipeline: build input from vacancy + knowledge sources, execute via AI provider abstraction (FakeAiProvider for now), validate JSON output, save artifacts, and pause workspace for human review.

## Scope

Allowed:

- create src/pipeline/prompt-input-builder.service.ts;
- create src/pipeline/prompt1/prompt1.service.ts;
- create src/pipeline/pipeline.module.ts;
- create src/pipeline/schemas/prompt1.schema.ts with Zod or class-validator schema;
- add POST /workspaces/:id/run-analysis endpoint;
- update workspaces.service.ts to support status transition to paused_after_analysis;
- save 01_vacancy_analysis.md and 01_vacancy_analysis.json as GeneratedArtifact;
- use existing AiProvider interface and FakeAiProvider (TASK-023) — no real API calls;
- add unit and service tests.

Not allowed:

- implementing real OpenAI/Anthropic provider (still FakeAiProvider only);
- implementing decision gate endpoint or manual override (TASK-028, TASK-030);
- implementing Prompt 2 (TASK-031+);
- adding frontend;
- changing product scope.

## Acceptance Criteria

- Prompt input builder reads 00_vacancy_source.txt content.
- Input includes company and role metadata.
- Input includes active knowledge source content or summaries.
- Source hashes are preserved in PromptRun sourceSnapshot.
- POST /workspaces/:id/run-analysis runs Prompt 1 synchronously.
- Creates PromptRun and AiRun records linked to workspace.
- Saves 01_vacancy_analysis.md and 01_vacancy_analysis.json as artifacts.
- Workspace status transitions to paused_after_analysis after successful run.
- Decision stored as apply/maybe/skip on workspace.
- Prompt 1 JSON schema includes score, decision, mustHave, niceToHave, wishlist, hiddenRoleLogic, risks, nextAction.
- Invalid JSON output marks PromptRun and AiRun as failed, does not crash the endpoint.
- If JSON parsing fails but markdown is available, markdown is still saved.

## Test Requirement

- Unit test for input builder with fake workspace and fake knowledge sources.
- Service test for run-analysis using FakeAiProvider with deterministic valid output.
- Service test for run-analysis with invalid JSON output — verify failed status, no crash.
- Unit tests for Prompt 1 schema: valid JSON passes, invalid JSON fails with clear error.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- Calling POST /workspaces/:id/run-analysis on a real workspace produces real artifact files on disk and a paused_after_analysis workspace, using FakeAiProvider.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-025, TASK-026, TASK-027 sections in docs/07_task_backlog.md.
4. Read docs/08_ai_pipeline.md for Prompt 1 expected output structure.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact Prompt 1 JSON schema fields and FakeAiProvider sample output.
7. List files expected to change.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows test results.
3. Shows example request/response for POST /workspaces/:id/run-analysis.
4. Explains how acceptance criteria were met.
5. Updates project-management/TEST_LOG.md.
6. Suggests next status for project-management/TASK_BOARD.md.
7. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-025-027-prompt1-pipeline`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-025+026+027 Prompt 1 input builder, execution and JSON validation"`
3. `gh pr create --title "feat: TASK-025-027 Prompt 1 pipeline" --body "Closes TASK-025, Closes TASK-026, Closes TASK-027" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`