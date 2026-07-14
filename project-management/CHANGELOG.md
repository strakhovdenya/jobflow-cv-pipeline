# Changelog

All meaningful implementation changes should be recorded here. Keep entries short and factual.

## Unreleased

- TASK-045: added `ImportService.scanRoot()` (`src/import/import.service.ts`) — read-only
  scanner for legacy `Company/YYYY.MM.DD/` application folders. Detects vacancy `.txt`
  source candidates (excluding `SKIP_*.txt`), `03_targeted_CV_content_*.md`, `*_CV.pdf`,
  `*_Cover_Letter.pdf`/`cover_letter.pdf`, and `SKIP_*.md`/`SKIP_*.txt`, and suggests a
  status per the docs §15.8 priority (`skipped` > `cover_letter_generated` >
  `cv_pdf_generated` > `cv_draft_ready` > `source_saved` > `import_needs_review`).
  Company/role slugs reuse the existing `SlugService`; role title is inferred by stripping
  the company-name prefix from the vacancy (or skip) file name. Ambiguous cases (multiple
  `.txt` candidates, mismatched vacancy-vs-skip role titles, a file not prefixed with the
  detected company name) are surfaced as `warnings` rather than guessed. New `GET
  /import/scan?rootPath=...` endpoint (`ImportController`, Swagger-documented). Purely
  read-only — never writes, renames or deletes anything under the scanned root, and
  creates no `ApplicationWorkspace`/`GeneratedArtifact` DB records (preview/confirmation
  is TASK-046/047). 8 new tests with fixture folders for Action1, Amach, AppsFlyer and
  Broadvoice; 50/50 suites, 497/497 tests pass; `npx tsc --noEmit` and `npm run build` clean.
- TASK-044: added `SafeWordingService` (`src/evidence/safe-wording.service.ts`) — given a claim and its matching `EvidenceItem` (or `null`), returns a distinct suggested-wording string per real seed `category` value: `allowed` preserves commercial wording, `risky` rephrases as personal-project/non-commercial experience, `unsupported` rephrases as basic/training exposure, and no matching evidence item produces a needs-evidence suggestion. Registered as a provider/export in `EvidenceModule` alongside the existing `EvidenceGuardService`/`EvidenceService`. Standalone service only — no endpoint or wiring into `EvidenceGuardService`/Prompt 3/export pipeline, matching the literal backlog acceptance criteria. 49/49 suites, 489/489 tests pass; `npx tsc --noEmit` clean.
- TASK-PH-012: enabled all 5 previously-disabled `tsconfig.json` strictness flags (`forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`, `strictBindCallApply`, `noImplicitAny`, `strictNullChecks`), one at a time in 5 commits, verifying `npx tsc --noEmit` and `npm run test` after each. `noImplicitAny` surfaced 53 implicit-any errors, all fixed with real type annotations (Prisma model types on test mocks; the project's own `VacancyAnalysis`/`TargetedCvContentOutput`/`PrePdfCheckOutput`/`FinalCheckOutput`/`SkipReasonAnalysis`/`TargetedCvBullet` schema types on `fake.provider.ts`'s fixtures), never `any`. `strictNullChecks` surfaced 6 errors: `ArtifactStorageService` now uses `ConfigService.getOrThrow('STORAGE_ROOT')` instead of `.get()` (matches the real guarantee — `env.validation.ts` requires it with no default), plus two justified non-null assertions in a controller spec where a preceding `toHaveLength` assertion already proves the array entries exist. No `any`, no unjustified `!`, no runtime behavior changes. 48/48 suites, 484/484 tests, e2e 2/2 pass throughout.
- TASK-PH-011: added minimal API-key authentication — global `ApiKeyGuard` (registered via `APP_GUARD`, alongside the existing `ThrottlerGuard`) requires an `X-API-Key` header matching the new required `API_KEY` env var on every endpoint. `GET /health` is exempted via a new `@SkipAuth()` decorator (mirrors the existing `@SkipThrottle()` convention) so container healthchecks/uptime monitors keep working unauthenticated. Swagger `DocumentBuilder`'s unused `.addBearerAuth()` placeholder replaced with `.addApiKey()` describing the real header. Single shared-secret design — no user table, login flow, or JWT/session issuance, matching this project's single-operator scope. 48/48 suites, 484/484 tests pass (new `api-key.guard.spec.ts`); `npx tsc --noEmit` clean; manual curl checks recorded in `TEST_LOG.md`.
- TASK-PH-015: cleared 6 Dependabot alerts (glob high, tmp high+low, picomatch moderate+high, webpack low x2), all transitive devDependencies pulled in via the `@nestjs/cli` -> `@angular-devkit/*` build-tooling chain — bumped `@nestjs/cli` (`^10.0.0` -> `^11.0.24`) and `@nestjs/schematics` (`^10.0.0` -> `^11.1.0`), devDependencies only, no production dependency touched. The remaining moderate `@nestjs/core` alert is the same one already investigated and accepted as risk in TASK-PH-013 (no fix without a NestJS v10->v11 major upgrade) — left untouched, out of scope. Verified via full test/e2e/build plus a manual `start:dev` boot smoke check.
- TASK-PH-014: fixed CodeQL code-scanning findings surfaced by TASK-PH-010's workflow — `ArtifactStorageService.saveVacancySource()` now calls `assertInsideStorageRoot()` before writing (was missing the guard present on the sibling `writeFile()` method; not currently exploitable, but closes the gap for future callers), and `CreateWorkspaceDto.companyNameOriginal`/`roleTitleOriginal` gained `@MaxLength(200)` to bound input feeding `slug.service.ts`'s regexes (flagged as polynomial-ReDoS candidates, though the patterns themselves are simple single-quantifier, not classic exponential ReDoS). 4 new unit tests added; 47/47 suites, 479/479 tests pass.
- TASK-PH-013: fixed the 7 high-severity Dependabot alerts surfaced by TASK-PH-010 (`multer` via `@nestjs/platform-express`, `lodash` via `@nestjs/swagger`) plus moderate `qs`/`file-type`/`js-yaml` advisories, via a `package.json` `"overrides"` entry pinning each to a patched version on the same major line already present in the tree — avoiding the NestJS v10→v11 breaking-change upgrade `npm audit fix --force` would otherwise require. `npm audit --omit=dev` dropped from 11 vulnerabilities (7 high) to 3 (0 high, 3 moderate — remaining `@nestjs/core` injection advisory has no fix without the v11 major bump, left open and documented). Verified via full test/e2e/build plus manual Swagger and CV-PDF-export smoke checks.
- TASK-PH-010: added baseline GitHub security governance — `SECURITY.md` (supported versions: "latest `main` only"; vulnerability reporting via GitHub Security Advisories, user's explicit channel choice), `.github/dependabot.yml` (weekly `npm` + `github-actions` update checks), `.github/workflows/codeql.yml` (CodeQL `javascript-typescript` analysis on push/PR to `main` and weekly cron, `github/codeql-action@v3`). No `src/**` changes; `npm run test` (47/47 suites, 475/475 tests) and `npx tsc --noEmit` unaffected.
- TASK-PH-009: reapplied rate limiting fresh against current `main`, superseding the orphaned, never-merged `task/TASK-PH-003-rate-limiting` branch (now marked `SKIPPED` in `TASK_BOARD.md`). Installed `@nestjs/throttler`; `ThrottlerModule.forRootAsync` registered in `app.module.ts` reads `THROTTLE_TTL`/`THROTTLE_LIMIT` via `ConfigService` (TTL converted seconds→ms for throttler v6); `ThrottlerGuard` registered globally via `APP_GUARD`. `GET /health` exempted via `@SkipThrottle()` (user-confirmed scope addition) so container healthchecks are never throttled. New `test/rate-limiting.e2e-spec.ts` asserts `429` past the configured limit and confirms `/health` stays exempt.
- Renamed `prompt1.schema.ts`/`prompt2.schema.ts` to `vacancy-analysis.schema.ts`/`targeted-cv-content.schema.ts` (with all exported types/functions renamed to match: `Prompt1Analysis` → `VacancyAnalysis`, `Prompt2Output` → `TargetedCvContentOutput`, etc.), unifying schema-file naming on the canonical-artifact convention already used by `skip-reason.schema.ts`, `pre-pdf-check.schema.ts` and `final-check.schema.ts` (ADR-021). Pure rename flagged and fixed at user's request during TASK-043 review; verified via `npx tsc --noEmit` and the full test/e2e suite.
- Split `validatePrePdfCheckJson` tests out of `cv-content.schema.spec.ts` into their own `pre-pdf-check.schema.spec.ts`, and added missing `skip-reason.schema.spec.ts` coverage (ADR-020) — flagged and fixed at user's request during TASK-042 review.
- TASK-043: added the optional Prompt 5 final check — `Prompt5InputBuilderService` + `Prompt5Service` (`src/pipeline/prompt5/`), `POST /workspaces/:id/run-final-check`. Gates on `workspace.status === cv_pdf_generated`; writes `05_final_check.md/.json` and registers both as `GeneratedArtifact` rows (`origin: 'prompt_5'`). New `src/pipeline/schemas/final-check.schema.ts` with `final_decision: 'ready_to_send' | 'needs_edit' | 'do_not_send'` and a boolean `final_checklist`. Unlike Prompt 3, on success `workspace.status` transitions `cv_pdf_generated -> final_check_ready` (docs/08_ai_pipeline.md §14.6, confirmed scope decision); on failure status stays at `cv_pdf_generated` so the PDF remains downloadable. `WorkspaceStatusService.TRANSITIONS` updated to match. Seeded a placeholder `prompt_5` `PromptTemplate` (`prisma/prompts/prompt5.txt`) — real prompt-engineering content is a follow-up task.
- TASK-042: added the optional Prompt 3 pre-PDF safety check — `Prompt3InputBuilderService` + `Prompt3Service` (`src/pipeline/prompt3/`), `POST /workspaces/:id/run-pre-pdf-check`. Gates on `workspace.status` in `{cv_draft_ready, paused_after_cv_draft}`; writes `03_pre_pdf_check.md/.json` and registers both as `GeneratedArtifact` rows (`origin: 'prompt_3'`). Extended `PrePdfCheckOutput` (`src/pipeline/schemas/pre-pdf-check.schema.ts`) with a required `readiness: 'ready' | 'ready_with_minor_edits' | 'not_ready'` field. Deliberately does not change `workspace.status` — the default MVP flow (CV draft → export) must not depend on this optional step, confirmed manually: `export-cv` still succeeds with or without a `03_pre_pdf_check.json` present, and Step 4's existing correction-application logic (`html-renderer.service.ts`, built in an earlier task) was exercised end-to-end for the first time. Seeded a placeholder `prompt_3` `PromptTemplate` (`prisma/prompts/prompt3.txt`) — real prompt-engineering content is a follow-up task, matching how TASK-037B finalized Prompt 1/2 content separately from their execution services.
- TASK-041: `ArtifactsService.register()` now supports version replacement — before creating a new `GeneratedArtifact` row, it looks up the current `isLatest: true` row for the same `workspaceId + artifactType`, flips it to `isLatest: false`, and assigns the new row `version = previous.version + 1` (starts at `1` if none exists). No schema migration needed (`isLatest`/`version` already existed with defaults). Existing `register()` callers unaffected.
- TASK-040: extended `GET /workspaces/:id` (`WorkspacesService.getWorkspaceDetail`) to return `status`, `currentDecision`, `score` and a new `artifacts` summary array (id, artifactType, `canonicalFileName`, `downloadFileName`, `isLatest`, `version`, `mimeType`, `fileSizeBytes`, `createdAt`) in a single response — gives enough information to resume work from one call instead of two. The separate `GET /workspaces/:id/artifacts` endpoint (TASK-016, full raw `GeneratedArtifact[]`) is unchanged.
- TASK-039: added `WorkspaceStatusService` (`src/workspaces/workspace-status.service.ts`) — a standalone, tested `isValidTransition`/`assertValidTransition` unit encoding the real `WorkspaceStatus` transition graph as observed across `prompt1.service.ts`, `prompt2.service.ts`, `skip-reason.service.ts`, `review-gates.service.ts` and `document-export.service.ts`. Registered as a provider in `WorkspacesModule`; existing services were deliberately not refactored to call it (scope decision — wiring it in as an enforced gate is a future task). Note: the transition map follows real code, not `docs/03_domain_model.md` §8.6, which documents an `analysis_running → analysis_ready → paused_after_analysis` path that `prompt1.service.ts` does not actually take.
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

