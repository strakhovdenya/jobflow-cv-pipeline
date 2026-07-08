# Changelog

All meaningful implementation changes should be recorded here. Keep entries short and factual.

## Unreleased

- TASK-038: added `POST /workspaces/:id/generate-cv-content` to `WorkspacesController` (`Prompt2Service.generateCvContent` was already implemented and exported from `PipelineModule` but had no HTTP route — gap found while scoping this task, fixed with user approval). Added `test/mvp-flow.e2e-spec.ts` — one automated e2e test proving the full MVP mechanics (vacancy → analysis → apply approval → CV draft generation + anti-overclaiming guard → draft approval → PDF export) work end-to-end with the fake AI provider, no external AI cost; asserts artifacts on disk and in PostgreSQL, and that export creates no `AiRun` (ADR-012).
- TASK-037D: documentation-only — verified `.env.example` already had all 8 required vars (`DATABASE_URL`, `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT`, `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`) and `.env` already in `.gitignore`; expanded `README.md` "Local Start" into the full onboarding sequence (install → env → Docker → `prisma migrate dev` → `prisma generate` → `prisma db seed` → `register-knowledge-sources` → `start:dev` → create first workspace) and added an "AI Provider" note (OpenAI first real MVP provider, Anthropic later/fallback, not required for MVP).
- TASK-037C: registered 9 real knowledge-source content files (master CV, profile summary, LinkedIn source decision, project inventory, career case deep dives, tech stack matrix, CV format rules, certifications inventory, CV layout reference PDF) into `knowledge-sources/**`. Added `scripts/register-knowledge-sources.ts` (`npm run register-knowledge-sources`) — idempotent registration (find-then-upsert keyed by `filePath`, no schema migration) storing file path, `sourceType`, `versionLabel` and content hash per source; `sourceType` values aligned with `KnowledgeSourceSelectionService`'s existing explicit per-step source groups. Documented `KNOWLEDGE_SOURCES_ROOT` and the registration command in `README.md`.
- TASK-037A: `OpenAiProvider` (`src/ai/providers/openai.provider.ts`) — real `AiProvider` implementation using the official `openai` npm SDK (`openai@6.45.0`); model/API key read via `ConfigService` (`OPENAI_MODEL`, default `gpt-4o`; `OPENAI_API_KEY`); maps `CompletionUsage` into `AiProviderUsage` (incl. cached/reasoning tokens). `ai.module.ts` now selects the provider through a `createAiProvider(configService)` factory keyed on `AI_PROVIDER` (`fake` default, `openai` opt-in) instead of a hardcoded `useClass`. Added `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` to `env.validation.ts` and `.env.example`. `FakeAiProvider` and all pipeline services unchanged; tests still use only `FakeAiProvider`.
- TASK-037 marked SKIPPED — optional Markdown/JSON export endpoints not implemented; PDF remains default export.
- TASK-036A: `PdfExportService.htmlFileToPdf(htmlFilePath, pdfOutputPath)` — Puppeteer-based HTML→PDF conversion (A4 format); standalone `@Injectable()` class (no NestJS module, same pattern as `HtmlRendererService` — DI wiring deferred to TASK-036B); browser closed via `finally` on every call; confirmed working on Windows 11 with default launch options (no `--no-sandbox` needed).
- Phase PH (Production Hardening): 8 unplanned quick-win tasks added to backlog and TASK_BOARD after production-readiness audit (2026-07-05); covers @nestjs/config, helmet+CORS, rate limiting, husky, Dockerfile, GitHub Actions CI, structured logging, Swagger; all P0/P1, to be done after Phase 6 MVP; TASK-058 superseded by TASK-PH-006.

- TASK-032A: added missing `current_work_block` field to `Prompt2CvContent` interface and `FAKE_PROMPT2_JSON` fixture; added `validatePrompt2Json` validation for the field; unblocks TASK-035 (ADR-018).
- TASK-035C: removed 7 redundant imports from `AppModule` (ArtifactsModule, KnowledgeSourcesModule, EvidenceModule, PromptTemplatesModule, AiRunsModule, AiModule, PromptRunsModule — none were used by AppController/AppService); deleted orphaned `skip-reason.module.ts` (SkipReasonService already registered in PipelineModule); documented NestJS module boundary rules in `CLAUDE.md` and `DECISIONS.md` (ADR-017).

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
- TASK-033: `EvidenceGuardService.checkOutput(output, evidenceItems)` — deterministic rule-based anti-overclaiming guard with 15 critical patterns (merged from backlog + docs/08_ai_pipeline.md §11.4). No AI provider call. Populates `overclaiming_check.critical_issues`, `warnings` (always []), and `needs_evidence` (from AI `evidence_table` + tech skills without matching `EvidenceItem.claimArea`).
- TASK-033: Guard integrated into `Prompt2Service` between `validatePrompt2Json` and `buildMarkdown` — both `.md` and `.json` artifacts receive guard result, not passive AI output.
- TASK-033: 25 unit tests in `evidence-guard.service.spec.ts` — 15 pattern tests, conservative rule, deduplication, needs_evidence sources, false-positive check. Pattern 7 (`Kubernetes`) tightened from `{0,30}` to `{0,10}` after false-positive detected and confirmed by user.
- TASK-033: `EvidenceModule` updated to export `EvidenceGuardService`; `PipelineModule` imports `EvidenceModule`. 232/232 tests pass.
- TASK-034: `ReviewGatesService.submitCvDraftReview(workspaceId, action, reasonNote?)` — 3-action CV draft review gate: `approve` (`cv_draft_ready`/`paused_after_cv_draft` → `export_running`), `pause` (→ `paused_after_cv_draft`), `mark_not_worth_applying` (creates `DecisionOverride` with `toDecision=manual_override_skip`, workspace `currentDecision=manual_override_skip`, status stays `paused_after_cv_draft`).
- TASK-034: `CvDraftReviewDto` + `CvDraftReviewAction` enum (`approve` / `pause` / `mark_not_worth_applying`) — `reasonNote` optional string for audit trail.
- TASK-034: `POST /workspaces/:id/review-cv-draft` endpoint — enforces CV draft review gate before export; accepts both `cv_draft_ready` and `paused_after_cv_draft` as valid preconditions per §8.6.
- TASK-034: No new Prisma migrations — all enum values and `DecisionOverride` model already present. No changes to `SkipReasonService`. 240/240 tests pass.
- TASK-035B: `CvContent` renderer input schema (`src/pipeline/schemas/cv-content.schema.ts`) — full target contract for `renderCvTemplate()` with `validateCvContentJson()`. Richer than `Prompt2CvContent`; gap resolved by TASK-035 `HtmlRendererService`.
- TASK-035B: `PrePdfCheckOutput` + `PrePdfCheckCorrection` schema (`src/pipeline/schemas/pre-pdf-check.schema.ts`) — Prompt 3 correction overlay with `field_path` addressing (`"headline"`, `"summary[0]"`, `"experience[0].bullets[1].text"`); `validatePrePdfCheckJson()`.
- TASK-035B: Handlebars two-column HTML template (`src/document-export/templates/cv.template.html`) — 27% left column (Contact, Work Authorization, Top Skills, Languages, Certifications?, Links?), 73% main (Name, Headline, ATS line, Summary, current_work_block?, Professional Experience, Education, Selected Projects?, Volunteering?). Density CSS classes: compact/normal/extended.
- TASK-035B: Pure renderer module (`src/document-export/cv-template-renderer.ts`) — `renderCvTemplate(content, corrections?)` and `applyCorrectionsToCvContent(content, corrections)`. No file I/O, no DB. Template embedded as string constant for isolation.
- TASK-035B: `current_work_block` is a required top-level block rendered before Professional Experience; `include: boolean` toggles visibility.
- TASK-035B: `docs/03_domain_model.md` §23 — schema documentation with TypeScript file references as source of truth.
- TASK-035B: 43 new unit tests (20 schema + 23 renderer). 283/283 tests pass.
- TASK-035: `HtmlRendererService.renderToHtml(workspaceId)` (`src/document-export/html-renderer.service.ts`) — reads `02_targeted_cv_content.json`, maps `Prompt2Output` → `CvContent` via `mapPrompt2OutputToCvContent()`, optionally applies `03_pre_pdf_check.json` corrections (absent file treated as no corrections, other read errors rethrown), calls existing `renderCvTemplate()`, writes `04_cv_export.html`, registers `GeneratedArtifact` (`origin: generated_by_export_service`). No AI provider, no workspace status transition (TASK-036B).
- TASK-035: `mapPrompt2OutputToCvContent()` (`src/document-export/prompt2-to-cv-content.mapper.ts`) — pure mapping function; copies headline/summary/top_skills/current_work_block/experience/selected_projects/rendering_hints verbatim from Prompt2Output, sources candidate/education/languages/links/volunteering from the new static `CANDIDATE_PROFILE_CONFIG`.
- TASK-035: `src/document-export/candidate-profile.config.ts` — static candidate identity/profile config (name, contact, location, work_authorization, education, languages, links, volunteering); these fields have no source in Prompt2Output or in the Company/JobVacancy DB models (those describe the employer/vacancy, not the applicant). Education entry is a placeholder pending real data.
- TASK-035: 10 new unit tests (mapper + renderer service). 302/302 tests pass.
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

