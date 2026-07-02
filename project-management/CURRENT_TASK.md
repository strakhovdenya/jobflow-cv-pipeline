# Current Task

## Task ID

`TASK-032`

## Title

Implement Prompt 2 targeted CV generation

## Source

`docs/07_task_backlog.md`

## Goal

Generate evidence-based targeted CV content via Prompt 2. Prompt 2 decides the CV content: bullet count, bullet wording, selected projects, certifications and optional sections. The renderer must not make these content decisions.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-032
- `docs/08_ai_pipeline.md` section 10.3 — Prompt 2 Inputs
- `docs/08_ai_pipeline.md` section 6.8 — Prompt-Step Source Selection (already implemented in TASK-018, verify integration)
- `docs/03_domain_model.md` — PromptRun, AiRun, workspace status fields
- `docs/09_artifact_storage.md` — targeted CV content artifact storage rules

If these sections are insufficient or conflict with the existing implementation, stop and ask.

## Existing Services / Files to Inspect

- `src/pipeline/prompt2/prompt2-input-builder.service.ts` (from TASK-018/TASK-031, now uses explicit source selection)
- `src/pipeline/prompt1/prompt1.service.ts` (reference pattern for PromptRun/AiRun creation)
- `src/knowledge-sources/knowledge-source-selection.service.ts` (from TASK-018)
- `prisma/schema.prisma`
- `src/workspaces/**` (workspace status transitions)

## Files Likely Affected

```text
src/pipeline/prompt2/prompt2.service.ts
src/pipeline/schemas/prompt2.schema.ts
src/artifacts/**
```

## Acceptance Criteria

- Saves `02_targeted_cv_content.md`.
- Saves `02_targeted_cv_content.json`.
- Prompt 2 output includes structured experience items where AI decides bullet count and exact bullet wording based on vacancy relevance and evidence.
- Prompt 2 output includes selected current/personal projects when they are relevant to the role and supported by project inventory.
- Personal/current projects are labeled separately from commercial work experience.
- Prompt 2 output provides rendering hints/priorities, but the renderer does not rewrite content.
- Creates PromptRun and AiRun records with token usage when available.
- Workspace status becomes `cv_draft_ready`.

## Test Requirement

- Service test using fake AI output.
- Schema/contract test verifies Prompt 2 output accepts variable bullet counts per experience item.
- Schema/contract test verifies selected current/personal projects can be included with `include`, `project_type`, `relevance_reason`, `display_priority`, `safe_label`, `bullets`, `tech_stack` and evidence references.
- Test verifies personal/current projects are not stored under commercial experience.
- `npm run test` must pass locally.
- Record result in `project-management/TEST_LOG.md`.

## Scope

Allowed:

- implement `Prompt2Service` for targeted CV content generation;
- implement/extend `prompt2.schema.ts` contract (variable bullets, personal/current projects fields);
- save `02_targeted_cv_content.md` and `02_targeted_cv_content.json` artifacts;
- create PromptRun and AiRun records with token usage;
- transition workspace status to `cv_draft_ready`;
- update/add tests for the above.

Not allowed:

- calling the real AI provider (use fake AI output in tests);
- implementing the anti-overclaiming guard (TASK-033);
- implementing CV draft review endpoint (TASK-034);
- implementing renderer/PDF export;
- changing prompt-step source selection logic from TASK-018;
- changing prompt templates content itself;
- bypassing review gates.

## Done Definition

- Approved workspace can produce a targeted CV draft artifact with AI-selected bullets and optional relevant personal/current projects. Workspace status is `cv_draft_ready` after generation; transition to `paused_after_cv_draft` is handled by TASK-034.

## Notes

### 2026-07-02 — Acceptance Criteria Correction

Original formulation said: _"Workspace status becomes `paused_after_cv_draft`"_.

Corrected to `cv_draft_ready` after verbatim cross-check with `docs/03_domain_model.md §8.5–8.6`:

- §8.5 Manual MVP lifecycle explicitly lists `cv_draft_ready` as the status set when Prompt 2 completes.
- §8.6 State transition table: `cv_generation_running → cv_draft_ready` (Prompt 2 completes); `cv_draft_ready → paused_after_cv_draft` (CV draft review gate is shown — TASK-034).

The original task wording conflated the two steps. The domain model is authoritative. This correction was propagated to both `Acceptance Criteria` / `Done Definition` and `Scope → Allowed` (the latter originally still referenced `paused_after_cv_draft` and has been aligned).

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md`.
2. Read this file fully.
3. Read all Docs to Read listed above.
4. Inspect existing Prompt 1 service and Prompt 2 input builder (post-TASK-018) as reference patterns.
5. Confirm Prompt 2 input builder from TASK-018 already provides correctly-scoped `KnowledgeSource[]` — do not re-implement source selection.
6. Propose exact method signatures and file list for `Prompt2Service` and schema changes.
7. Wait for user approval before making code changes.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files.
3. Show test results.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-032 can be marked DONE.
6. Stop and wait for user approval.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-032-prompt2-targeted-cv-generation
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "feat: TASK-032 implement Prompt 2 targeted CV generation"
git push -u origin task/TASK-032-prompt2-targeted-cv-generation
gh pr create --title "feat: TASK-032 Prompt 2 targeted CV generation" --body "Closes TASK-032" --base main
```

Then stop completely. User handles merge, checkout main and pull.
