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
