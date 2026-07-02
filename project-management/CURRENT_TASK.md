# Current Task

## Status

`DONE` — accepted 2026-07-02. Awaiting git commit/push/PR from user approval.

Next task: `TASK-032` — Implement Prompt 2 targeted CV generation.

## Task ID

`TASK-018`

## Title

Add KnowledgeSource selection for prompt steps

## Source

`docs/07_task_backlog.md`

## Goal

Finish explicit, deterministic KnowledgeSource selection before Prompt 2 generation continues.

The purpose is to ensure that Prompt 1 and Prompt 2 do not simply include every active knowledge source by accident. Each prompt step must use a documented, reproducible source map and store an exact snapshot with source IDs, paths, hashes and version labels.

Because TASK-025 and TASK-031 already implemented prompt input builders with source snapshots, this task should first audit whether the acceptance criteria are already satisfied. If they are fully satisfied, mark TASK-018 as accepted with evidence. If not, implement the missing explicit source-selection layer.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-018
- `docs/08_ai_pipeline.md` section 6 — Source Knowledge Files
- `docs/08_ai_pipeline.md` section 6.8 — Prompt-Step Source Selection
- `docs/08_ai_pipeline.md` section 8.2 — Prompt 1 Inputs
- `docs/08_ai_pipeline.md` section 10.3 — Prompt 2 Inputs
- `docs/03_domain_model.md` — KnowledgeSource, PromptRun and source snapshot fields
- `docs/09_artifact_storage.md` section 13 — Knowledge Source Storage

If these sections are insufficient or conflict with the existing implementation, stop and ask.

## Existing Services / Files to Inspect

- `src/knowledge-sources/knowledge-sources.service.ts`
- `src/pipeline/prompt-input-builder.service.ts`
- `src/pipeline/prompt2/prompt2-input-builder.service.ts`
- `src/prompt-runs/prompt-runs.service.ts`
- `prisma/schema.prisma`
- related tests for Prompt 1 input builder and Prompt 2 input builder

## Required Audit Questions

Before implementing new code, check:

```text
1. Does the current system select knowledge sources by prompt step explicitly?
2. Or does it include every active KnowledgeSource by default?
3. Does Prompt 1 have a deterministic source group map?
4. Does Prompt 2 have a deterministic source group map?
5. Does PromptRun store source snapshot IDs, paths, hashes and version labels?
6. Are inactive sources excluded by default?
7. Are source groups aligned with docs/08_ai_pipeline.md section 6.8?
```

## Acceptance Criteria

- Active knowledge sources can be selected for Prompt 1 and Prompt 2.
- PromptRun stores a source snapshot with file IDs, paths and hashes.
- Inactive sources are not used by default.
- Prompt-step source selection is explicit and deterministic; Prompt 1 and Prompt 2 do not simply include every registered source by default.
- The service supports the MVP source groups documented in `docs/08_ai_pipeline.md`: candidate profile, evidence, CV rules, certifications, layout reference and prompt source files.
- Source selection is implemented separately from Prompt 2 generation, so it can be tested before real OpenAI calls are introduced.

## Test Requirement

- Service test for source selection and snapshot creation.
- Test that inactive sources are not selected.
- Test that Prompt 1 and Prompt 2 receive different source groups if their maps differ.
- Test that unknown / unsupported prompt step fails safely or returns a clear error.
- `npm run test` must pass locally.
- Record result in `project-management/TEST_LOG.md`.

## Scope

Allowed:

- add a dedicated KnowledgeSourceSelectionService or equivalent;
- add prompt-step source group mapping;
- update Prompt 1 and Prompt 2 input builders to use explicit selection instead of all active sources;
- update tests;
- update `TEST_LOG.md` after implementation or acceptance audit.

Not allowed:

- calling AI provider;
- generating Prompt 2 content;
- changing prompt templates;
- implementing anti-overclaiming guard;
- implementing renderer/PDF export;
- changing source file contents;
- bypassing review gates.

## Done Definition

- Prompt source inclusion is explicit, deterministic and traceable for Prompt 1 and Prompt 2.
- TASK-032 can start without risk that Prompt 2 uses accidental source context.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md`.
2. Read this file fully.
3. Read all Docs to Read listed above.
4. Inspect existing Prompt 1 and Prompt 2 input builders.
5. Decide whether TASK-018 is already fully satisfied or needs implementation.
6. Show an audit table against each acceptance criterion.
7. If code changes are needed, propose exact method signatures and file list.
8. Wait for user approval before making code changes.

After implementation or acceptance audit is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files, if any.
3. Show test results.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-018 can be marked DONE.
6. Stop and wait for user approval.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-018-knowledge-source-selection
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "feat: TASK-018 add knowledge source selection"
git push -u origin task/TASK-018-knowledge-source-selection
gh pr create --title "feat: TASK-018 KnowledgeSource selection" --body "Closes TASK-018" --base main
```

Then stop completely. User handles merge, checkout main and pull.
