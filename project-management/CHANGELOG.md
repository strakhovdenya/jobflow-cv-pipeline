# Changelog

All meaningful implementation changes should be recorded here. Keep entries short and factual.

## Unreleased

### Added

- Project management structure.
- Task board for Markdown-based Jira-lite tracking.
- Current task workflow for Claude Code.
- Architecture decisions log.
- Test log template.
- Blocker tracking.
- TASK-030: `DecisionOverride` Prisma model — stores `workspaceId`, `fromDecision`, `toDecision`, `reviewState`, `reasonNote?`, `createdAt` as an immutable audit record for skip overrides.
- TASK-030: `POST /workspaces/:id/override-skip` endpoint — transitions `status=skipped` workspace to `cv_generation_running`, sets `currentDecision` to `manual_override_apply` or `manual_override_maybe`, sets `reviewState=overridden`. Rejected with 400 if workspace is not in `skipped` status.
- TASK-030: Skip artifacts (`01_skip_reason.md/json`) are preserved — `overrideSkip` is database-only, no filesystem access.
- TASK-031: `Prompt2InputBuilderService` — guard (status=cv_generation_running), reads `00_vacancy_source.txt` + `01_vacancy_analysis.json` (fallback `.md`), includes active Prompt 2 template + knowledge sources, returns `sourceSnapshot` with SHA-256 hashes.
- TASK-018: `KnowledgeSourceSelectionService` — `selectForStep(step, allSources)` filters knowledge sources by step using a documented source-type map (`prompt_1`: profile_summary, tech_stack, project_inventory, career_cases, cv_rules + optional certifications; `prompt_2`: adds master_cv + optional layout). Throws `BadRequestException` for unknown steps. Excludes `isActive:false` sources as defense-in-depth.
- TASK-018: `Prompt1Service` updated to call `selectForStep('prompt_1', activeSources)` before building prompt input — no longer passes all active sources to the builder.
- TASK-018: `Prompt2InputBuilderService` refactored: removed `knowledgeSources` parameter; now self-contained — injects `KnowledgeSourcesService` + `KnowledgeSourceSelectionService` and calls `findActive()` + `selectForStep('prompt_2', ...)` internally.
- TASK-018: `SourceSnapshotEntry` (Prompt 1) and `Prompt2SourceSnapshotEntry` extended with `versionLabel: string | null` field for full traceability.
- TASK-032: `Prompt2Service.generateCvContent(workspaceId)` — full Prompt 2 pipeline: guard (cv_generation_running enforced by Prompt2InputBuilderService), calls AI provider with `step: 'prompt_2'`, saves `02_targeted_cv_content.md` and `02_targeted_cv_content.json`, creates PromptRun + AiRun with token usage, transitions workspace to `cv_draft_ready` (per §8.6 docs/03_domain_model.md; `paused_after_cv_draft` is set by TASK-034 review gate).
- TASK-032: `validatePrompt2Json(raw)` — flat result type validation for Prompt 2 JSON output; validates required fields; md artifact saved even when JSON validation fails so raw output is preserved.
- TASK-032: `prompt2.schema.ts` interfaces matching docs/08_ai_pipeline.md §10.4: `Prompt2Bullet`, `Prompt2ExperienceItem` (commercial, can_split_across_pages), `Prompt2SelectedProject` (personal/current projects separate from experience array), `Prompt2Output`.
- TASK-032: `FAKE_PROMPT2_JSON` added to `FakeAiProvider` — routed by `options.step === 'prompt_2'`; 1 commercial experience item + 1 current_personal_project; all required output fields present.
- TASK-032: `Prompt2Service` registered in `PipelineModule` providers and exports.
- TASK-032: 16 unit tests (`prompt2.service.spec.ts`) + 6 schema tests (`prompt2.schema.spec.ts`). 203/203 tests pass.
- TASK-035A added to backlog: design `02_targeted_cv_content.json` and `03_pre_pdf_check.json` schemas + HTML template with conditional section support and Prompt 3 correction layer. Blocked on user-provided description of optional CV block logic.
- TASK-037A–D added to backlog: real AI provider, real prompt content, knowledge source file registration, .env setup — all required before TASK-038 smoke test.
- ESLint: added `varsIgnorePattern: '^_'` to allow intentionally-unused destructure variables.
- VS Code: added `editor.formatOnSave: true` to `.vscode/settings.json`; removed Prettier step from `scripts/lint-hook.js` (now handled by VS Code natively).

### Changed

- —

### Fixed

- —

### Verified

- —

## Entry Template

```md
## YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Verified
- ...
```
## Documentation sync — Current-work CV block and source names

- Updated docs to reference active current-work source files (`v0_6` / `v2_3` / CV rules `v0_3`).
- Added semi-fixed `Current Independent Work & Portfolio Projects` rules for CV generation and rendering.
- Preserved existing human-in-the-loop, evidence guard, Prompt 2 content ownership and deterministic renderer logic.
- Task backlog changes were limited to sections after TASK-032.

