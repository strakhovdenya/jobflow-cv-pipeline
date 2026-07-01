# Current Task

## Task ID

`TASK-031`

## Title

Implement Prompt 2 input builder

## Source

`docs/07_task_backlog.md`

## Goal

Собрать все входные данные для запуска Prompt 2: vacancy source, артефакты Prompt 1, source knowledge files, активный шаблон Prompt 2 и evidence rules. Реализовать guard: Prompt 2 не может запуститься, если workspace.status !== cv_generation_running.

## Docs to Read

- `docs/08_ai_pipeline.md` section 10.2 — Run Conditions (когда Prompt 2 может запуститься)
- `docs/08_ai_pipeline.md` section 10.3 — Inputs (полный список required и optional входных файлов)
- `docs/03_domain_model.md` — WorkspaceStatus enum, значение cv_generation_running
- `docs/09_artifact_storage.md` — canonical artifact paths (00_vacancy_source.txt, 01_vacancy_analysis.json/md)

If these sections are insufficient to safely implement the Guard below, stop and ask — do not guess.

## Existing Services to Call

- `src/pipeline/prompt-input-builder.service.ts` — review existing Prompt 1 builder before adding Prompt 2 builder, to keep a consistent service shape.
- `src/artifacts/artifact-storage.service.ts` — reuse existing readFile() / resolveWorkspacePath() for reading workspace artifacts.
- `src/knowledge-sources/knowledge-sources.service.ts` — reuse findActive() to get active knowledge source files.
- `src/prompt-templates/prompt-templates.service.ts` — reuse findActive() to get active Prompt 2 template.

## Guard (Run Conditions)

| Precondition | Result |
|---|---|
| `workspace.status === cv_generation_running` | Build input, return snapshot |
| `workspace.status !== cv_generation_running` | Throw BadRequestException, do not build input |

This covers all three approved paths: apply approved (TASK-028), maybe explicitly approved (TASK-028), skip overridden (TASK-030).

If anything in this table seems inconsistent with the referenced docs, stop and ask — do not silently correct it.

## Scope

Allowed:

- create src/pipeline/prompt2/prompt2-input-builder.service.ts;
- read 00_vacancy_source.txt and 01_vacancy_analysis.json (md as fallback) from workspace folder;
- include active Prompt 2 template content and version;
- include active knowledge source file content;
- return input snapshot with vacancy source hash and knowledge source hashes;
- add service tests.

Not allowed:

- calling AI provider (TASK-032);
- saving any artifacts (TASK-032);
- implementing anti-overclaiming guard (TASK-033);
- modifying existing Prompt 1 builder logic;
- adding real OpenAI/Anthropic provider;
- changing product scope.

## Acceptance Criteria

- Prompt 2 input builder is rejected with 400 if workspace.status !== cv_generation_running.
- Builder reads 00_vacancy_source.txt from workspace folder.
- Builder reads 01_vacancy_analysis.json (or .md as fallback) from workspace folder.
- Builder includes active Prompt 2 template content and version.
- Builder includes active knowledge source file content.
- Builder returns input snapshot with vacancy source hash and knowledge source hashes.
- No AI call is made inside the builder.

## Test Requirement

- Service test: builder on approved workspace (status=cv_generation_running) — returns input with vacancy source, analysis, template, knowledge sources.
- Service test: builder on non-approved workspace (status !== cv_generation_running) — throws BadRequestException.
- Service test: input snapshot contains vacancy source hash and knowledge source hashes.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- Prompt 2 input builder safely assembles all required inputs only for approved workspaces, with a traceable input snapshot.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file, including Docs to Read, Existing Services to Call, and Guard sections above.
3. Read TASK-031 section in docs/07_task_backlog.md.
4. Read src/pipeline/prompt-input-builder.service.ts to mirror the existing pattern.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with exact method signatures and file list.
7. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Check each Acceptance Criterion — show as a table (✅/❌). Fix before reporting if any ❌.
2. Show changed files.
3. Show test results (one line: X/X passed).
4. Update project-management/TEST_LOG.md.
5. Suggest next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Key Invariants

- `status = cv_generation_running` is the only gate — builder does not check currentDecision or reviewState directly.
- Builder is read-only — no artifacts are written, no AI calls are made, no workspace fields are updated.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-031-prompt2-input-builder`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-031 implement Prompt 2 input builder"`
3. `git push -u origin task/TASK-031-prompt2-input-builder`
4. `gh pr create --title "feat: TASK-031 Prompt 2 input builder" --body "Closes TASK-031" --base main`
5. Stops completely. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`