# Test Log

## Purpose

Record test commands, manual verification steps and results. This file is especially important for checks that are not fully automated yet: PostgreSQL persistence, filesystem artifact creation, PDF export and AI provider mocks.

## Entry Template

```md
## YYYY-MM-DD — TASK-XXX — Short title

### Scope

What was tested.

### Commands

```bash
# commands here
```

### Result

PASS / FAIL / PARTIAL

### Evidence

- output summary;
- generated file paths;
- database rows checked;
- notes/screenshots if needed.

### Follow-up

- none;
- or link to BLOCKERS.md / next task.
```

## 2026-07-05 — TASK-032A — Add missing current_work_block to Prompt2CvContent

### Scope

Schema/fixture fix: add `current_work_block` to `Prompt2CvContent`, `validatePrompt2Json()`, `FAKE_PROMPT2_JSON`, and affected test fixtures.

### Commands

```bash
# Baseline (before changes)
npm run test  # → 30 suites, 283 tests

# After changes
npm run test  # → 30 suites, 285 tests (+2 new tests for current_work_block)
npx tsc --noEmit  # → clean
```

### Result

PASS. +2 tests (accepts valid current_work_block / rejects missing current_work_block). TypeScript clean.

---

## 2026-07-05 — TASK-035C — NestJS module architecture cleanup

### Scope

Verify test suite remains stable after removing 7 redundant AppModule imports and deleting orphaned `skip-reason.module.ts`.

### Commands

```bash
# Baseline (before changes)
npm run test
# → 30 suites, 283 tests, 0 failures

# After changes
npm run test
# → 30 suites, 283 tests, 0 failures

npx tsc --noEmit
# → no output (clean)

# Confirm SkipReasonModule is gone
grep -r "SkipReasonModule" src/
# → no matches
```

### Result

PASS. Test count unchanged (283/283). TypeScript clean. No references to `SkipReasonModule` remain.

---

## 2026-06-28 — TASK-001 — Initialize NestJS project structure

### Scope

Basic NestJS bootstrap: health endpoint, unit test, TypeScript build.

### Commands

```bash
npm install
npm run test
npm run build
```

### Result

PASS

### Evidence

- `npm run test`: 1 suite, 1 test — `AppController › health › returns { status: "ok" }` — PASS (3.7s)
- `npm run build`: exits cleanly, no TypeScript errors
- Files created: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.js`, `.prettierrc`, `.gitignore`, `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.controller.spec.ts`, `test/jest-e2e.json`, `README.md`

### Follow-up

- Next task: TASK-002 or TASK-004 (per backlog dependency order)

---

## 2026-06-28 — TASK-004 — PostgreSQL persistence verification

### Scope

Named Docker volume `postgres_data` survives `docker compose down` + `docker compose up -d postgres`.

### Commands

```bash
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "CREATE TABLE persistence_check (id serial PRIMARY KEY, note text); INSERT INTO persistence_check (note) VALUES ('task-004-test');"
docker compose down
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT * FROM persistence_check;"
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "DROP TABLE persistence_check;"
```

### Result

PASS

### Evidence

- Container started on port 5433 (5432 was already allocated on this machine; `POSTGRES_PORT` in `.env` set to 5433)
- `CREATE TABLE` + `INSERT 0 1` — row written before stop
- `docker compose down` removed container and network, volume `postgres_data` retained
- After `docker compose up -d postgres`, row `id=1, note='task-004-test'` still present
- Test table dropped after verification

### Follow-up

- `.env.example` uses port 5432 (default). Local `.env` uses 5433 due to host conflict. No change needed to example — developers adjust `POSTGRES_PORT` if their 5432 is occupied.
- Next task: TASK-005 (persistence checklist script) or TASK-006 (Prisma setup).

---

## 2026-06-28 — TASK-005 — PostgreSQL persistence verification script

### Scope

`scripts/check-postgres-persistence.sh` automated script verified against live Docker container.

### Commands

```bash
bash scripts/check-postgres-persistence.sh
# or
npm run db:check-persistence
```

### Result

PASS

### Evidence

- Script ran via Git Bash
- Row `persist-check-20260628185341` inserted before `docker compose down`
- Container removed, volume `postgres_data` retained
- After `docker compose up -d postgres`, row still present (count: 1)
- Test table dropped cleanly
- Final output: `PASS — data survived docker compose down + up`

### Follow-up

- `npm run db:check-persistence` works via Git Bash; PowerShell cannot run bash scripts directly (WSL path issue on this machine)
- Next task: TASK-006 (Prisma setup)

---

## 2026-06-28 — TASK-006 — Prisma setup and database connection

### Scope

Prisma 5 installed, schema.prisma created, PrismaService created, AppModule updated, connection verified.

### Commands

```bash
npm install prisma@^5 @prisma/client@^5
npx prisma migrate dev --name init
npx tsc --noEmit
npm run test
```

### Result

PASS

### Evidence

- `npm install` — prisma@5.22.0 and @prisma/client@5.22.0 installed
- `npx prisma migrate dev` output: "Datasource "db": PostgreSQL database "jobflow_cv" at "localhost:5433" — Already in sync, no schema change or pending migration was found" — confirms DB connection works
- `npx tsc --noEmit` — no TypeScript errors
- `npm run test` — 1 test PASS (AppController health)
- Note: `prisma generate` produces "no models" warning — expected at this stage; domain models come in TASK-008/009
- Prisma downgraded from v7 (latest) to v5 LTS — v7 removed `url` from datasource in schema.prisma, breaking the standard NestJS pattern

### Follow-up

- Next task: TASK-006A (unit test setup) or TASK-007 (slug normalization)

---

## 2026-06-29 — TASK-006A — Unit test setup and conventions

### Scope

Jest baseline confirmed: AppService unit test + AppController mock injection test.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- 2 test suites, 3 tests — all PASS
- `src/app.service.spec.ts` — pure service test, no TestingModule
- `src/app.controller.spec.ts` — controller test with mocked AppService via `{ provide: AppService, useValue: jest.fn() }` — demonstrates the pattern for PrismaService and AiProvider mocking
- `npx tsc --noEmit` — clean, no errors
- Added `"types": ["jest", "node"]` to `tsconfig.json` — fixes VS Code globals (`describe`, `it`, `expect`)
- `test/setup.ts` — conventions document for future tests

### Follow-up

- Next: TASK-007 (slug normalization) then TASK-006B (P0 unit tests)

---

## 2026-06-29 — TASK-007 — Slug normalization unit tests

### Scope

`SlugService.normalizeCompanySlug()` and `normalizeRoleSlug()` — all doc examples + edge cases.

### Commands

```bash
npm run test
```

### Result

PASS

### Evidence

- 3 test suites, 25 tests — all PASS
- Company slug: Action1, CHECK24, Omega CRM, Ukrainian Cyrillic, repeated separators, empty string
- Role slug: all doc examples, numbers removed, Cyrillic+Latin mix, em dash, C#/.NET, edge cases
- Regex uses `\p{Script=Cyrillic}` with `u` flag as required

### Follow-up

- Next: TASK-008 (Company and JobVacancy Prisma models)

---

## 2026-06-29 — TASK-008+009 — Company, JobVacancy, ApplicationWorkspace Prisma models

### Scope

Prisma schema enums (WorkspaceStatus, VacancyDecision, UserReviewState) and three models. Migration applied. NestJS services created and unit tested with mocked PrismaService.

### Commands

```bash
npx prisma migrate dev --name add-core-models
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629150407_add_core_models` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 6 suites, 34 tests — all PASS
  - `company.service.spec.ts` — create, findById, not-found (3 tests)
  - `vacancy.service.spec.ts` — create linked to company, findById, not-found (3 tests)
  - `workspaces.service.spec.ts` — create with status source_saved, findById with company+vacancy included, not-found (3 tests)
- All services use mocked PrismaService — no real DB calls in unit tests
- `WorkspacesService.create()` always sets `status: source_saved` regardless of caller input
- `WorkspacesService.findById()` includes `company` and `jobVacancy` relations in result

### Follow-up

- Next: TASK-010 (DTO validation) or TASK-011 (workspace folder + vacancy artifact creation)

---

## 2026-06-29 — TASK-010+011+012+013 — Manual workspace creation API

### Scope

DTO validation, ArtifactStorageService (folder + file creation), WorkspacesController (POST/GET/GET:id), full orchestration in WorkspacesService.

### Commands

```bash
npm install class-validator class-transformer
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 9 suites, 53 tests — all PASS
- New test files:
  - `create-workspace.dto.spec.ts` — 10 tests: missing/empty required fields, valid sourceUrl, invalid URL
  - `artifact-storage.service.spec.ts` — 4 tests: folder created on disk, path inside storage root, path traversal rejected, file saved with exact content + correct SHA-256 hash, Cyrillic text preserved
  - `workspaces.controller.spec.ts` — 4 tests: POST creates workspace, GET returns list, GET:id returns detail, GET:id unknown returns NotFoundException
  - `workspaces.service.spec.ts` — updated with mocks for all 5 injected dependencies (PrismaService, SlugService, CompanyService, VacancyService, ArtifactStorageService); 3 existing tests all PASS
- `ValidationPipe({ whitelist: true })` enabled globally in main.ts
- `storage/applications/` directory created and tracked in git
- Folder naming: `<YYYY_MM_DD>_<companySlug>_<roleSlug>` (e.g. `2026_06_29_Action1_Backend_Developer_Node_js`)
- Vacancy text saved as UTF-8 with SHA-256 hash; line breaks and special characters preserved exactly
- POST /workspaces returns: id, status, companySlug, roleSlug, workspaceSlug, folderPath, vacancySourcePath, vacancyTextHash, companyId, jobVacancyId, createdAt
- Path safety: path traversal attempts throw an error before any disk write

### Follow-up

- Next: TASK-014 (GeneratedArtifact model and registry service)

---

## 2026-06-30 — TASK-014+015+016 — GeneratedArtifact model, HashService and artifact access endpoints

### Scope

GeneratedArtifact Prisma model + migration, HashService (SHA-256 utility), ArtifactsService (DB register/query), ArtifactsController (GET /workspaces/:id/artifacts, GET /artifacts/:id/download with path safety), vacancy source registered as artifact during POST /workspaces.

### Commands

```bash
npx prisma migrate dev --name add-generated-artifact
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629220531_add_generated_artifact` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 12 suites, 70 tests — all PASS
- New test files:
  - `hash.service.spec.ts` — 5 tests: hex format, same content same hash, different content different hash, Cyrillic UTF-8, whitespace sensitivity
  - `artifacts.service.spec.ts` — 5 tests: register creates record, isLatest defaults to true, findByWorkspaceId returns ordered list, empty list, findById returns null
  - `artifacts.controller.spec.ts` — 6 tests: list by workspace, empty list, NotFoundException when artifact not in DB, ForbiddenException for path traversal, NotFoundException when file missing on disk, correct headers on download
- `workspaces.service.spec.ts` — updated: added `ArtifactsService` mock to providers (6 dependencies total)
- Path safety: `path.resolve()` + `startsWith(storageRoot + sep)` check before any file read
- Vacancy source auto-registered as `vacancy_source` artifact with `origin: pasted` on every `POST /workspaces`
- `GeneratedArtifact` fields: workspaceId, promptRunId?, artifactType, canonicalFileName, filePath, storageRoot, contentHash, isLatest, version, origin, status, mimeType?, fileSizeBytes?, downloadFileName?

### Follow-up

- Next: TASK-017 (KnowledgeSource model and import service)

---

## 2026-06-30 — TASK-017+019 — KnowledgeSource model, import service and EvidenceItem seed data

### Scope

KnowledgeSource Prisma model + EvidenceItem Prisma model + migration, KnowledgeSourcesService (importSource/activate/deactivate/findActive), EvidenceService (findByCategory/findAll), prisma/seed.ts with 9 EvidenceItem records.

### Commands

```bash
npx prisma migrate dev --name add-knowledge-source-and-evidence-item
npm run test
npx prisma db seed
```

### Result

PASS

### Evidence

- Migration `20260629222909_add_knowledge_source_and_evidence_item` applied — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 14 suites, 82 tests — all PASS
- `npx prisma db seed`: Seeded 9 EvidenceItem records — no errors
- New test files:
  - `knowledge-sources.service.spec.ts` — 8 tests: importSource creates record with hash, versionLabel null when not provided, activate sets isActive true, activate throws NotFoundException, deactivate sets isActive false, deactivate throws NotFoundException, findActive returns active only, findActive returns empty array
  - `evidence.service.spec.ts` — 4 tests: findByCategory returns allowed items, findByCategory returns risky items, findByCategory returns empty, findAll returns 9 items across all categories
- Seed data covers: Node.js (allowed), TypeScript (allowed), Azure Functions (allowed), PostgreSQL (allowed), NestJS (risky), Docker (risky), AI/RAG (risky), Kubernetes (unsupported), AWS (unsupported)
- KnowledgeSourcesService uses HashService.hashFile() for content hash on import
- package.json updated with `prisma.seed` config pointing to `ts-node prisma/seed.ts`

### Follow-up

- Next: TASK-020 (PromptTemplate model and CRUD service)

## 2026-06-30 — TASK-020+021+022+023+024 — AI pipeline infrastructure

### Scope

PromptTemplate model and versioning, AiRun model with token usage, AI provider abstraction with FakeProvider, PromptRun model linking workspace/template/AiRun.

### Commands

```bash
npx prisma migrate dev --name add_prompt_template_ai_run_prompt_run
npx prisma db seed
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Migration `20260629224728_add_prompt_template_ai_run_prompt_run` applied; Prisma Client regenerated (v5.22.0)
- `npx prisma db seed`: Seeded 9 EvidenceItem records + 2 active PromptTemplate records (Prompt 1 vacancy analysis, Prompt 2 targeted CV content) — no errors
- `npm run test`: 18 suites, 103 tests — all PASS
- New test files:
  - `prompt-templates.service.spec.ts` — 7 tests: create assigns version 1 with no prior template, increments version on existing template, never overwrites (always creates new record), activate deactivates other templates for the step first, findActive returns active/null, findByStep returns all versions desc
  - `ai-runs.service.spec.ts` — 3 tests: saveSuccess creates record with status completed and token fields, saveFailed creates record with status failed and errorMessage
  - `fake.provider.spec.ts` — 6 tests: provider/model name, non-empty text, usage token counts, parsedJson only in jsonMode, predictable repeated output
  - `prompt-runs.service.spec.ts` — 5 tests: create starts at status pending, complete sets status completed + links aiRunId + serializes outputArtifactIds, fail sets status failed, markRunning sets status running
- `npx tsc --noEmit`: no errors
- `npm run lint`: auto-fixed formatting only, no logic changes
- Only one active PromptTemplate per step enforced in `PromptTemplatesService.activate()` via `updateMany` deactivation before activating target

### Follow-up

- Next: TASK-025 (Prompt 1 input builder) — not started in this task, per scope boundaries

---

## 2026-06-30 — TASK-025+026+027 — Prompt 1 input builder, execution and JSON validation

### Scope

PromptInputBuilderService (vacancy source + template + knowledge sources → prompt text), Prompt1Service (full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save, workspace status transition), Prompt 1 JSON schema manual validation, POST /workspaces/:id/run-analysis endpoint.

### Commands

```bash
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- `npm run test`: 21 suites, 145 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `prompt1.schema.spec.ts` — 13 tests: valid JSON accepted, invalid JSON rejected, array at root, missing/invalid fields (decision, workspace, company_slug, score, must_have, top_reasons, manual_review_required), all three decision values accepted
  - `prompt-input-builder.service.spec.ts` — 9 tests: vacancy file path construction, metadata inclusion, snapshot serialization, multiple knowledge sources
  - `prompt1.service.spec.ts` — 18 tests: success path (7), invalid JSON output (6), AI provider failure (3), missing template (1), workspace not found (1)
  - `workspaces.controller.spec.ts` — updated: added Prompt1Service mock to resolve new dependency (4 tests still PASS)
- FakeAiProvider updated with complete Prompt 1 JSON including `workspace` field
- ArtifactStorageService: added `readFile()` and `resolveWorkspacePath()` methods
- Prompt1 JSON validation uses flat result type (`{ success: boolean; data?: Prompt1Analysis; error?: string }`) to avoid TypeScript discriminated-union narrowing issues
- Workspace status transitions: `analysis_running` → `paused_after_analysis` on success, `failed` on AI error or invalid JSON
- AI provider errors caught and saved as failed AiRun; markdown still saved when JSON is invalid
- POST /workspaces/:id/run-analysis added to WorkspacesController

### Follow-up

- Next: TASK-028 (Prompt 1 decision gate endpoint — apply/maybe/skip)

---

## 2026-06-30 — TASK-028 — Prompt 1 decision gate endpoint

### Scope

ReviewGatesService with 4-action state machine (approve_apply, approve_maybe, pause, change_to_skip). POST /workspaces/:id/review-decision endpoint. canProceedToPrompt2 flag based on `status === cv_generation_running`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 22 suites, 155 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `review-gates.service.spec.ts` — 8 tests: approve_apply transitions to cv_generation_running + canProceedToPrompt2 true, approve_apply rejects wrong decision, approve_maybe transitions to cv_generation_running + canProceedToPrompt2 true, pause keeps status paused_after_analysis + canProceedToPrompt2 false, pause preserves currentDecision, change_to_skip sets decision skip + reviewState overridden + canProceedToPrompt2 false, change_to_skip rejects already-skip, NotFoundException on missing workspace, BadRequestException on wrong status
- `workspaces.controller.spec.ts` updated: added ReviewGatesService mock
- State machine: approve_apply/approve_maybe → cv_generation_running (Prompt 2 unlocked); pause → paused_after_analysis (status unchanged); change_to_skip → decision=skip, status stays paused_after_analysis (actual skipped transition is TASK-029)
- `canProceedToPrompt2 = status === cv_generation_running` (not reviewState — per docs/03_domain_model.md §8.6)
- No Prisma migration needed — reviewState and currentDecision fields already in schema from TASK-008/009

### Follow-up

- Next: TASK-029 (skip artifact generation — 01_skip_reason.md/json + status=skipped)

---

## 2026-06-30 — TASK-029 — Skip reason generation

### Scope

SkipReasonService with POST /workspaces/:id/confirm-skip. Skip JSON schema validation. 01_skip_reason.md/json artifact generation. Status transition to `skipped`. Retry path from `analysis_ready`. FakeAiProvider updated with `step` parameter and `FAKE_SKIP_REASON_JSON`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 164 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `skip-reason.service.spec.ts` — 6 tests: success from `paused_after_analysis`, success from `analysis_ready` (retry), BadRequest on wrong status, BadRequest on wrong decision, NotFoundException on missing workspace, invalid JSON → status=`analysis_ready` + markdown saved
  - `fake.provider.spec.ts` — 1 new test: step=`skip_reason` returns FAKE_SKIP_REASON_JSON with decision=skip
- State machine: confirm-skip accepts `paused_after_analysis` OR `analysis_ready` (Variant A, per §9.8 retry path)
- Failure: status rolls back to `analysis_ready` per docs/08_ai_pipeline.md §9.8
- `status = skipped` only set after both artifacts physically written to disk (ADR-016)
- `buildDownloadFileName()` follows `SKIP_<company_slug>_<role_slug>_reason_RU.md` pattern
- FakeAiProvider: `step?: string` added to `AiProviderOptions`; returns step-specific JSON

### Follow-up

- Next: TASK-030 (manual override logging)

---

## 2026-07-01 — TASK-030 — Manual override logging

### Scope

`ReviewGatesService.overrideSkip()` — skip→cv_generation_running transition, audit record creation, artifact immutability, audit field correctness. New `DecisionOverride` Prisma model with migration.

### Commands

```bash
npx prisma migrate dev --name add-decision-override
npx prisma migrate dev --name add-decision-override-review-state
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 168 tests — all PASS
- 4 new `overrideSkip` tests in `review-gates.service.spec.ts`:
  - Override on skipped workspace → `status=cv_generation_running`, `toDecision=manual_override_apply`, `canProceedToPrompt2=true`, audit record created
  - Override on non-skipped workspace → `BadRequestException`, no `$transaction` call, no audit record
  - `GeneratedArtifact` mocks (`findMany`, `delete`, `deleteMany`) never called during override — artifacts untouched
  - Audit record `create` called with correct `fromDecision=skip`, `toDecision=manual_override_maybe`, `reviewState=overridden`, `reasonNote`
- New endpoint: `POST /workspaces/:id/override-skip`
- New migration: `DecisionOverride` model with `workspaceId`, `fromDecision`, `toDecision`, `reviewState`, `reasonNote?`, `createdAt`
- No filesystem writes or deletions — `overrideSkip` is DB-only

### Follow-up

- Next: TASK-031 (Prompt 2 input builder)

---

## 2026-07-01 — TASK-031 — Prompt 2 input builder

### Scope

`Prompt2InputBuilderService.buildPrompt2Input()` — guard (status check), vacancy source + analysis reading, analysis fallback (.json → .md), knowledge source snapshot with hashes.

### Commands

```bash
npm run test -- --testPathPattern=prompt2-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 24 suites, 173 tests — all PASS
- 5 new tests in `prompt2-input-builder.service.spec.ts`:
  - Approved workspace (`cv_generation_running`) → returns `inputContext` with vacancy source, analysis, workspace metadata, knowledge sources
  - Non-approved statuses (`source_saved`, `paused_after_analysis`, `skipped`, `cv_pdf_generated`) → `BadRequestException`, `readFile` never called
  - `sourceSnapshot` contains 64-char hex `vacancySourceHash` and per-source `contentHash`
  - Fallback: `01_vacancy_analysis.json` missing → reads `01_vacancy_analysis.md`
  - Both analysis artifacts missing → `BadRequestException`
- No filesystem writes, no AI calls — builder is read-only

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-035A — CV visual concept and block rules

### Scope

Manual planning/documentation verification for the approved clean two-column CV concept and flexible block rules.

### Commands

```bash
# Documentation-only task; no code commands run.
```

### Result

PASS

### Evidence

- Created `docs/cv-template-design/visual-concept.md`.
- Created `docs/cv-template-design/block-rules.md`.
- Block rules cover required / optional / conditional sections, priority model, hide-if-no-space order, page-break behavior and renderer schema fields.
- Prompt 2 owns content selection: variable bullet counts, exact bullet wording and selected personal/current project inclusion.
- Renderer owns layout only: placement, page breaks, column rendering and conditional hiding based on Prompt 2 priorities.

### Follow-up

- Implementation continues with TASK-032 first, because Prompt 2 generation must produce the structured content that later TASK-035B will render.
- TASK-035B can use the two design docs when Phase 6 implementation starts.

---

## 2026-07-02 — TASK-018 — KnowledgeSource selection for prompt steps

### Scope

`KnowledgeSourceSelectionService.selectForStep()` — step-to-sourceType filtering, defense-in-depth isActive guard, BadRequestException for unknown step. `Prompt1Service` updated to use `selectForStep('prompt_1', activeSources)`. `Prompt2InputBuilderService` made self-contained: removed `knowledgeSources` parameter, now injects `KnowledgeSourcesService` + `KnowledgeSourceSelectionService` and calls `findActive()` + `selectForStep('prompt_2', ...)` internally. `SourceSnapshotEntry` and `Prompt2SourceSnapshotEntry` extended with `versionLabel`.

### Commands

```bash
npm run test -- --testPathPattern="knowledge-source-selection|prompt1.service|prompt2-input-builder"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 3 suites, 34 tests — all PASS
- Full suite: 25 suites, 181 tests — all PASS
- 6 new tests in `knowledge-source-selection.service.spec.ts`: prompt_1 required+optional types, prompt_2 includes master_cv, prompt_1 excludes master_cv, unknown step throws BadRequestException, isActive:false excluded (defense in depth), optional certifications included when present
- `prompt1.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_1', [])` (explicit step assert)
- `prompt2-input-builder.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_2', allActiveSources)` (explicit step assert); all existing tests updated to remove 4th `knowledgeSources` argument; `versionLabel` field asserted in snapshot
- `pipeline.module.ts` — no change needed: `KnowledgeSourcesModule` already imported, exports both services

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-032 — Prompt 2 targeted CV generation

### Scope

`Prompt2Service.generateCvContent()` — full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save (md + json), AiRun with token usage, workspace status transition to `cv_draft_ready`. `validatePrompt2Json()` schema contract with variable bullet counts and personal/current project fields.

### Commands

```bash
npm run test -- --testPathPattern="prompt2.schema|prompt2.service"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 2 suites, 22 tests — all PASS
- Full suite: 27 suites, 203 tests — all PASS
- New test files:
  - `prompt2.schema.spec.ts` — 6 tests: valid JSON with 1 bullet, variable bullet counts (3 bullets), selected_projects with all required fields, personal/current projects separate from commercial experience, missing cv_content → fail, invalid JSON → fail
  - `prompt2.service.spec.ts` — 16 tests: success path (6), invalid JSON output (5), AI provider failure (3), workspace not found (1), missing template (1)
- State machine: `cv_generation_running` → `cv_draft_ready` on success (per docs/03_domain_model.md §8.6); `failed` on AI error or invalid JSON; `paused_after_cv_draft` is TASK-034
- `02_targeted_cv_content.md` saved before JSON validation (matches Prompt 1 pattern)
- `02_targeted_cv_content.json` saved only after successful validation
- `FAKE_PROMPT2_JSON` added to fake.provider with 2 experience bullets + 1 selected_project

### Follow-up

- Next: TASK-033 (anti-overclaiming guard) or TASK-034 (CV draft review endpoint)

---

## 2026-07-04 — TASK-033 — Basic anti-overclaiming guard

### Scope

`EvidenceGuardService.checkOutput()` — deterministic rule-based scanning of `Prompt2Output` for 15 critical claim patterns (merged from backlog + docs/08_ai_pipeline.md §11.4). Integration into `Prompt2Service` between JSON validation and artifact write, so both `.md` and `.json` artifacts contain the guard result. `needs_evidence` populated from AI `evidence_table` entries and tech skills without matching `EvidenceItem.claimArea`.

### Commands

```bash
npm run test -- --testPathPattern="evidence-guard" --forceExit
npm run test -- --forceExit
```

### Result

PASS

### Evidence

- Targeted guard run: 25/25 tests — all PASS (4.057s)
- Full suite: 28 suites, 232 tests — all PASS (22s)
- New test file `evidence-guard.service.spec.ts`: 25 tests covering:
  - 15 individual critical pattern tests (patterns 1–15, plus pattern 4b for OpenAI variant)
  - conservative rule: Kubernetes pattern flagged even when EvidenceItem exists
  - deduplication: same pattern in headline + bullet → one entry in critical_issues
  - needs_evidence source 1: evidence_table entry with status='needs evidence' → claim added
  - needs_evidence source 2: tech skill with no EvidenceItem match → added; with match → not added
  - warnings always []
  - clean input → empty result
  - false-positive check (see note below)
- Updated `prompt2.service.spec.ts`: 4 new guard integration tests:
  - evidenceService.findAll and evidenceGuard.checkOutput called on success path
  - guard receives validated Prompt2Output
  - JSON artifact written with guard-populated overclaiming_check
  - guard NOT called when JSON validation fails

#### False-positive resolution (pattern 7)

Initial pattern `/Kubernetes.{0,30}production|production.{0,30}Kubernetes/i` triggered on test text `"Production environment uses Kubernetes documentation for learning purposes only."` — 18 chars between "Production" and "Kubernetes", within the `{0,30}` limit.

Decision (confirmed by user): tighten to `{0,10}` for pattern 7 only. All legitimate CV claims place the two keywords within 1–10 chars; false-positive text has 18 chars. Pattern updated. All 25 tests pass after fix.

### Follow-up

- `exportBlocked` flag not in scope for TASK-033 — will be derived from `overclaiming_check.critical_issues.length > 0` in TASK-034 (CV draft review) or export gate.
- `warnings: []` always empty from guard — no documented warning-level pattern list exists in docs.

---

## 2026-07-04 — TASK-034 — CV draft review endpoint

### Scope

`ReviewGatesService.submitCvDraftReview()` — 3-action state machine for the CV draft review gate. `POST /workspaces/:id/review-cv-draft` endpoint. New `CvDraftReviewDto` with `CvDraftReviewAction` enum.

### Commands

```bash
npm run test -- --testPathPattern=review-gates.service
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 21/21 tests — all PASS (5.21s)
- Full suite: 28 suites, 240 tests — all PASS (20.6s)
- New DTO: `src/review-gates/dto/cv-draft-review.dto.ts` — `CvDraftReviewAction` (approve / pause / mark_not_worth_applying) + `CvDraftReviewDto` with optional `reasonNote`
- Extended `ReviewGatesService` with `submitCvDraftReview()` and `CvDraftReviewResult` interface
- New endpoint: `POST /workspaces/:id/review-cv-draft`
- 9 new tests in `review-gates.service.spec.ts`:
  - `approve` from `cv_draft_ready` → `export_running`, `canProceedToExport = true`
  - `approve` from `paused_after_cv_draft` → `export_running`, `canProceedToExport = true`
  - `pause` from `cv_draft_ready` → `paused_after_cv_draft`, `canProceedToExport = false`
  - `pause` from `paused_after_cv_draft` → stays `paused_after_cv_draft`
  - `mark_not_worth_applying` → creates `DecisionOverride` with `toDecision = manual_override_skip`, workspace `currentDecision = manual_override_skip`, `reviewState = overridden`, `canProceedToExport = false`
  - `mark_not_worth_applying` → stores `null` reasonNote when not provided
  - `NotFoundException` when workspace not found
  - `BadRequestException` when status is not `cv_draft_ready` or `paused_after_cv_draft`
- State machine matches §8.6 exactly: `cv_draft_ready` / `paused_after_cv_draft` → `export_running` (approve) or `paused_after_cv_draft` (pause / mark_not_worth_applying)
- No new Prisma migrations — all enum values already present
- No changes to `SkipReasonService` — `mark_not_worth_applying` uses `manual_override_skip` (distinct from `skip`), audit path via `DecisionOverride` only

### Follow-up

- Next: TASK-035B (CV template schemas + renderer) or TASK-036 (PDF export)

---

## 2026-07-04 — TASK-035B — CV JSON schemas and flexible HTML template

### Scope

`CvContent` renderer input schema, `PrePdfCheckOutput` correction overlay schema, Handlebars HTML template, and pure `renderCvTemplate()` / `applyCorrectionsToCvContent()` functions. No file I/O, no NestJS services.

### Commands

```bash
npm run test -- --testPathPattern=cv-content.schema
npm run test -- --testPathPattern=cv-template-renderer
npm run test
```

### Result

PASS

### Evidence

- Schema tests: 20/20 PASS (`cv-content.schema.spec.ts` — 14 CvContent + 6 PrePdfCheckOutput)
- Renderer tests: 23/23 PASS (`cv-template-renderer.spec.ts`)
- Full suite: 30 suites, 283 tests — all PASS (21.0s)
- New files:
  - `src/pipeline/schemas/cv-content.schema.ts` — `CvContent` renderer contract with `validateCvContentJson()`
  - `src/pipeline/schemas/pre-pdf-check.schema.ts` — `PrePdfCheckOutput` + `PrePdfCheckCorrection` with `validatePrePdfCheckJson()`
  - `src/document-export/templates/cv.template.html` — Handlebars two-column CSS Grid template (27% left / 73% main)
  - `src/document-export/cv-template-renderer.ts` — pure functions: `renderCvTemplate()` + `applyCorrectionsToCvContent()`
  - `src/pipeline/schemas/cv-content.schema.spec.ts`
  - `src/document-export/cv-template-renderer.spec.ts`
- `docs/03_domain_model.md` §23 — brief documentation of both schemas with TypeScript file references
- Key invariant: `current_work_block` is a required top-level block rendered before Professional Experience; `include: boolean` controls visibility
- Prompt 3 corrections applied in memory via `field_path` (e.g. `"experience[0].bullets[1].text"`) — original `CvContent` never mutated

### Follow-up

- Next: TASK-035 (`HtmlRendererService` — orchestrates file I/O, reads `03_pre_pdf_check.json` if present, calls `renderCvTemplate()`, writes `04_cv_export.html`) or TASK-036 (PDF export)

---

## 2026-07-05 — TASK-PH-001 — Add @nestjs/config with Joi env validation

### Scope

Install `@nestjs/config` and `joi`. Create `src/config/env.validation.ts` Joi schema (8 vars). Wire `ConfigModule.forRoot({ isGlobal: true })` as first import in `AppModule`. Replace all direct `process.env` reads with `ConfigService`. Delete `src/config/storage.config.ts` (only used in `ArtifactStorageService`). Update spec to use mock `ConfigService` instead of `process.env.STORAGE_ROOT`. Add `env.validation.spec.ts` unit tests.

### Commands

```bash
# Baseline
npm run test  # → 30 suites, 285 tests, 0 failures

# Install
npm install @nestjs/config joi

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (+7 new tests in env.validation.spec.ts)
npx tsc --noEmit    # → no output (clean)
```

### Result

PASS. +1 suite, +7 tests. TypeScript clean.

### Evidence

- `npm run test` before: 30 suites, 285 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `grep -rn "process.env" src/` after changes — only `artifact-storage.service.spec.ts` lines that SET `process.env` via mock removed; zero production `process.env` reads remain
- `src/config/storage.config.ts` deleted (only consumer was `ArtifactStorageService`; decision: delete file, inject `ConfigService` directly)
- `DATABASE_URL` note: validated by Joi schema at boot; not read via `process.env` in NestJS application code (Prisma reads it from the environment directly, outside NestJS DI) — no substitution needed in application code
- New files: `src/config/env.validation.ts`, `src/config/env.validation.spec.ts`
- Updated files: `src/app.module.ts`, `src/main.ts`, `src/artifacts/artifact-storage.service.ts`, `src/artifacts/artifact-storage.service.spec.ts`, `.env.example`
- Deleted files: `src/config/storage.config.ts`

### Follow-up

- Unblocks TASK-PH-002 (helmet + CORS — uses `CORS_ORIGIN` from ConfigService)
- Unblocks TASK-PH-003 (throttler — uses `THROTTLE_TTL` / `THROTTLE_LIMIT` from ConfigService)
- Unblocks TASK-PH-007 (Pino logging — uses `LOG_LEVEL` from ConfigService)

---

## 2026-07-05 — TASK-PH-003 — Add rate limiting (@nestjs/throttler)

### Scope

Install `@nestjs/throttler` v6. Wire `ThrottlerModule.forRootAsync` in `AppModule` via `ConfigService` (`THROTTLE_TTL` × 1000 ms, `THROTTLE_LIMIT`). Set `APP_GUARD` globally to `ThrottlerGuard`. Add integration test that verifies 429 on limit exceeded.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install @nestjs/throttler  # → v6.5.0

# After changes
npm run test        # → 32 suites, 294 tests, 0 failures (+1 suite, +2 tests)
npx tsc --noEmit    # → no output (clean)
```

### Result

PASS. +1 suite, +2 tests. TypeScript clean. All 5 acceptance criteria met.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 32 suites, 294 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- New test file `src/throttler.spec.ts`: 2 tests:
  - "allows requests within the limit" — 2 requests at limit=2 → both 200 ✅
  - "returns 429 when limit is exceeded" — 3rd request at same limit → 429 ✅
- ThrottlerModule configured: `ttl = THROTTLE_TTL * 1000` (ms), `limit = THROTTLE_LIMIT`
- `THROTTLE_TTL` default 60 (seconds) → 60 000 ms; `THROTTLE_LIMIT` default 100
- `APP_GUARD` globally wired — all endpoints protected

### Note on TTL units

`@nestjs/throttler` v5+ uses **milliseconds** for TTL (breaking change from v4). `THROTTLE_TTL=60` (seconds) is multiplied by 1000 in `useFactory`. Runtime value: 60 000 ms = 1 minute, matching the "100 req/min" spec.

### Follow-up

- Next parallel task: TASK-PH-004 (husky + lint-staged)

---

## 2026-07-05 — TASK-PH-002 — Add security headers: helmet + CORS

### Scope

Install `helmet`, wire `app.use(helmet())` and `app.enableCors(...)` in `src/main.ts` using `ConfigService`. Manual curl check of response headers.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install helmet

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (no regressions)
npx tsc --noEmit    # → clean

# Manual curl check (server started with STORAGE_ROOT set)
curl -I http://localhost:3000/health
```

### Result

PASS. Test count unchanged. TypeScript clean. All required security headers present.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `curl -I http://localhost:3000/health` output (selected headers):
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self';base-uri 'self';...
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-DNS-Prefetch-Control: off
  X-XSS-Protection: 0
  Access-Control-Allow-Origin: *
  ```
- All acceptance-criteria headers confirmed present
- `Access-Control-Allow-Origin: *` confirms CORS enabled (no CORS_ORIGIN set → fallback to `'*'`)
- `allowSyntheticDefaultImports: true` in tsconfig allows `import helmet from 'helmet'` (no esModuleInterop needed)

### Note on STORAGE_ROOT

`.env` did not yet contain `STORAGE_ROOT` (added to `.env.example` in PH-001 but not yet propagated to local `.env`). Server started for curl test with `STORAGE_ROOT=./storage/applications` set inline. User should add `STORAGE_ROOT` to their `.env` before running the app normally.

### Follow-up

- Unblocks nothing new (PH-003, PH-004 already unblocked by PH-001)
- Next parallel tasks: TASK-PH-003 (throttler) and TASK-PH-004 (husky)

---

## Required MVP Test Areas

- Unit test setup: `npm run test`.
- Slug normalization unit tests.
- Workspace validation unit tests.
- Canonical artifact naming unit tests.
- Skip decision / approval gate unit tests.
- Anti-overclaiming guard unit tests.
- PostgreSQL persistence verification.
- First usable MVP smoke test.

## PostgreSQL Persistence Verification Template

```md
## YYYY-MM-DD — TASK-005 — PostgreSQL persistence verification

### Commands

```bash
docker compose up -d
# create table/record through psql or script
docker compose down
docker compose up -d
# verify table/record still exists
```

### Expected Result

Data survives `docker compose down` and restart because the database uses named volume `postgres_data`.

### Destructive Command Warning

`docker compose down -v` removes the named volume and deletes local database data. Use it only intentionally.
```
## Documentation consistency check — Current-work source sync

Manual documentation check completed:

- Verified old source-name references were replaced with current active source names.
- Verified current-work block is documented separately from commercial experience and selected projects.
- Verified no task sections before or including TASK-032 were intentionally changed.
- No code tests were run; documentation-only sync.

