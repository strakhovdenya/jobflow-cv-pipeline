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

## 2026-07-05 — TASK-PH-004 — Add husky + lint-staged pre-commit hooks

### Scope

Install `husky` v9 and `lint-staged` v16 as devDependencies. Wire `prepare: "husky"` in `package.json`. Create `.husky/pre-commit` that runs `npx lint-staged`. Configure `lint-staged` to run `eslint --fix` + `prettier --write` on staged `*.ts` files. Manual verification that a commit with an unfixable lint error is rejected.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install --save-dev husky lint-staged  # → husky@9.1.7, lint-staged@16.4.0

# Init husky (v9 — sets prepare: "husky" in package.json, creates .husky/)
npx husky init

# Manual lint rejection test
echo "const lintTest = 'unused';" > src/_lint_test_temp.ts
git add src/_lint_test_temp.ts
git commit -m "test: lint hook verification"
# → commit rejected: 'lintTest' is assigned a value but never used (no-unused-vars)

# Clean up test file
git rm --cached src/_lint_test_temp.ts && rm src/_lint_test_temp.ts

# After changes
npm run test  # → 31 suites, 292 tests, 0 failures (unchanged)
```

### Result

PASS. Test count unchanged. Commit correctly rejected on lint error.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- Lint rejection output (abridged):
  ```
  [FAILED] eslint --fix [FAILED]
  ✖ eslint --fix:
  src/_lint_test_temp.ts
    1:7  error  'lintTest' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  ✖ 1 problem (1 error, 0 warnings)
  husky - pre-commit script failed (code 1)
  ```
- `prepare: "husky"` script set by `npx husky init`
- `.husky/pre-commit` contains `npx lint-staged`
- `lint-staged` config in `package.json`: `{ "*.ts": ["eslint --fix", "prettier --write"] }`

### Note on husky v9 vs task spec

`CURRENT_TASK.md` references v8 commands (`prepare: "husky install"`, `npx husky install`). In husky v9 the equivalent is `prepare: "husky"` and `npx husky init`. The end behavior is identical — hooks installed on `npm install`.

### Follow-up

- Next: TASK-PH-005 or TASK-PH-006 (CI/GitHub Actions)

---

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

## 2026-07-05 — TASK-PH-006 — GitHub Actions CI pipeline

### Scope

Создать `.github/workflows/ci.yml` с четырьмя job: lint, typecheck, test (PostgreSQL service + prisma migrate deploy), build. Node.js 20.x, npm cache по `package-lock.json`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Push PR → CI запустился автоматически
gh pr create --title "chore: TASK-PH-006 GitHub Actions CI pipeline" --base main
# PR: https://github.com/strakhovdenya/jobflow-cv-pipeline/pull/27
```

### Result

PASS — все 4 CI job прошли

### Evidence

GitHub Actions run: https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/runs/28750227123

| Job | Status | Duration |
|---|---|---|
| Lint | ✅ pass | 28s |
| Typecheck | ✅ pass | 30s |
| Test | ✅ pass | 52s |
| Build | ✅ pass | 26s |

### Follow-up

- Next: TASK-PH-007 (structured logging — nestjs-pino)

---

## 2026-07-05 — TASK-PH-005 — Production Dockerfile (multi-stage, non-root user)

### Scope

Create multi-stage production Dockerfile (builder + runner, `node:20-alpine`, `USER node`, `HEALTHCHECK`), `.dockerignore`, and optional `app` service in `docker-compose.yml`. Verify `docker build`, `docker compose up app`, and `curl /health`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Build image
docker build -t jobflow-cv-pipeline .

# Start full stack via compose (postgres already running)
docker compose up app -d

# Smoke test
curl http://localhost:3000/health
# → {"status":"ok"}

# docker run standalone test (requires network + DATABASE_URL override)
docker run --rm -d --name jobflow_test \
  --env-file .env \
  --network jobflow-cv-pipeline_default \
  -e DATABASE_URL=postgresql://jobflow:jobflow_secret@postgres:5432/jobflow_cv \
  -e STORAGE_ROOT=/tmp/storage \
  -p 3000:3000 jobflow-cv-pipeline
curl http://localhost:3000/health
# → {"status":"ok"}
docker stop jobflow_test
```

### Result

PASS

### Evidence

- `docker build -t jobflow-cv-pipeline .` — exits cleanly
- `docker compose up app -d` — container starts, status `Up (healthy)` after ~15s
- `curl http://localhost:3000/health` → `{"status":"ok"}`
- `docker run` standalone with network override → `{"status":"ok"}`
- Prisma engine binary in image: `libquery_engine-linux-musl-openssl-3.0.x.so.node` (correct for Alpine)

### Notes / Discovered issues

**Prisma + Alpine 3.22 (OpenSSL 3.5.x) compatibility:**  
`node:20-alpine` ships OpenSSL 3.5.7 but no `openssl` CLI. Prisma 5.22's platform detection runs `openssl version`; without the CLI it falls back to `linux-musl` (OpenSSL 1.1), which is absent on modern Alpine. Fix: `apk add --no-cache openssl` in both builder and runner stages installs the CLI, enabling Prisma to detect OpenSSL 3.x and generate the `linux-musl-openssl-3.0.x` binary (links against `libssl.so.3` which is present by default).

**Prisma schema must be present before `npm ci`:**  
`@prisma/client` runs `prisma generate` as a postinstall hook. Copying `prisma/` before `npm ci` ensures the generated typed client matches the project schema.

**Husky in production install:**  
`npm ci --omit=dev` in a runner stage still triggers the `prepare: "husky"` lifecycle script, which fails because husky is a devDependency. Workaround: use `npm prune --omit=dev` in the builder stage after build (preserving Prisma generated client), then `COPY --from=builder /app/node_modules` — avoids a fresh install in runner entirely.

**DATABASE_URL in docker-compose.yml:**  
`env_file: .env` sets `DATABASE_URL=...@localhost:5432/...` which is only valid on the host. The `environment:` override corrects the host to the `postgres` service name and hardcodes port `5432` (the container-internal port, not `${POSTGRES_PORT}` which is the host-side mapping).

**Standalone `docker run --env-file .env` note:**  
Without `--network` and a `DATABASE_URL` override, the container cannot reach the postgres service. For full-stack local testing, `docker compose up app` is preferred; `docker run` needs the extra flags documented above.

### Follow-up

- Next: TASK-PH-006 (GitHub Actions CI)

---

## 2026-07-06 — TASK-PH-007A — Docker build validation in CI

### Scope

Add `docker-build` CI job to `.github/workflows/ci.yml`. Job builds production Docker image, applies Prisma migrations, starts container via `docker run --network host`, polls `/health` (max 60s), verifies no pending migrations via `npx prisma migrate status`, then tears down the container.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Change
# Added docker-build job to .github/workflows/ci.yml (no code changes)

# After change
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)

# CI verification — push PR, watch GitHub Actions
gh pr create --title "chore: TASK-PH-007A Docker build validation in CI" --base main
```

### Result

PASS — pending CI run result (to be updated after GitHub Actions completes)

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions; only YAML changed)
- Only `.github/workflows/ci.yml` modified — no application code touched
- New job structure: postgres service → npm ci → prisma migrate deploy → docker build → docker run → /health poll → prisma migrate status → teardown
- `--network host` comment added (Linux ubuntu-latest specific)
- Existing 4 jobs (lint, typecheck, test, build) unchanged

### Follow-up

- Update this entry with actual CI run URL and job duration once PR is merged and Actions completes.
- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-PH-008 — Swagger/OpenAPI documentation

### Scope

Added `@nestjs/swagger` (v7.4.2, compatible with the project's NestJS v10) and `swagger-ui-express`. Configured `SwaggerModule` in `main.ts` with `DocumentBuilder` (title `JobFlow CV Pipeline`, version `0.1.0`, one-line description, `addBearerAuth()`). Swagger is mounted only when `NODE_ENV !== 'production'`. Added `@ApiTags`/`@ApiOperation` to all three controllers (`AppController`, `ArtifactsController`, `WorkspacesController`) and `@ApiProperty()` to all fields of all four DTOs (`CreateWorkspaceDto`, `SubmitDecisionDto`, `OverrideSkipDto`, `CvDraftReviewDto`).

### Commands

```bash
# Baseline
npm run build          # → success
npm run test           # → 31 suites, 292 tests, 0 failures

# Install
npm install @nestjs/swagger@7.4.2 swagger-ui-express

# After change
npm run build           # → success
npx tsc --noEmit        # → no errors
npm run test             # → 31 suites, 292 tests, 0 failures (no regressions)

# Manual verification — dev mode (NODE_ENV unset)
npm run start:dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api          # → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api-json     # → 200
curl -s http://localhost:3000/health                                       # → {"status":"ok"} (tried via Swagger-equivalent GET)

# Manual verification — production mode
NODE_ENV=production PORT=3001 node dist/src/main.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api         # → 404 (Swagger not mounted)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api-json    # → 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health      # → 200 (business logic unaffected)
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npx tsc --noEmit` — clean, no errors
- `GET /api` (dev) → 200, Swagger UI HTML served
- `GET /api-json` (dev) → 200, valid OpenAPI 3.0 document; `info.title = "JobFlow CV Pipeline"`, `info.version = "0.1.0"`, `components.securitySchemes.bearer` present
- All 12 endpoints present in the OpenAPI document: `GET /health`, `GET /version`, `POST /workspaces`, `GET /workspaces`, `GET /workspaces/{id}`, `POST /workspaces/{id}/run-analysis`, `POST /workspaces/{id}/review-decision`, `POST /workspaces/{id}/confirm-skip`, `POST /workspaces/{id}/override-skip`, `POST /workspaces/{id}/review-cv-draft`, `GET /workspaces/{id}/artifacts`, `GET /artifacts/{id}/download`
- `GET /health` executed successfully (200, `{"status":"ok"}`), confirming a live request works against the documented API
- `GET /api` and `GET /api-json` → 404 when `NODE_ENV=production`; `GET /health` still 200 in the same run, confirming business logic and existing endpoints are untouched by the Swagger gating

### Follow-up

- Pre-existing, unrelated issue noticed during manual verification: `start:prod` script (`node dist/main`) does not match actual build output path (`dist/src/main.js`). Out of scope for TASK-PH-008 (Key Invariants forbid touching build/CI config); flagging for a future task.
- Next: none selected — awaiting user's next task pick per `CLAUDE.md` "do not choose the next task automatically."

---

## 2026-07-05 — TASK-PH-007 — Structured logging (nestjs-pino)

### Scope

Install `nestjs-pino`, `pino-http`, `pino-pretty`. Wire `LoggerModule.forRootAsync()` in `AppModule` with `ConfigService` for `LOG_LEVEL`. Enable `pino-pretty` transport in `NODE_ENV !== 'production'`. Replace `console.log()` in `main.ts` with `app.get(Logger).log()`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Install
npm install nestjs-pino pino-http pino-pretty

# After changes
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)
npm run build   # → success

# Manual: production mode (JSON logs)
NODE_ENV=production LOG_LEVEL=info node dist/src/main

# Manual: development mode (pretty logs)
NODE_ENV=development LOG_LEVEL=info node dist/src/main
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npm run build` — clean

**Production mode JSON log sample:**
```json
{"level":30,"time":1783276322101,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"NestFactory","msg":"Starting Nest application..."}
{"level":30,"time":1783276322103,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"InstanceLoader","msg":"PrismaModule dependencies initialized"}
```

**Development mode pretty log sample:**
```
[20:32:15.855] INFO (31780): Starting Nest application... {"context":"NestFactory"}
[20:32:15.855] INFO (31780): PrismaModule dependencies initialized {"context":"InstanceLoader"}
```

- `nestjs-pino`, `pino-http`, `pino-pretty` added to `dependencies` (not devDependencies — pino-pretty needed in dev Docker containers)
- `bufferLogs: true` in `NestFactory.create` — ensures buffered NestJS bootstrap logs go through Pino
- `transport` key present only when `NODE_ENV !== 'production'` (spread pattern, not `undefined` value)
- `console.log()` on `main.ts:15` replaced with `app.get(Logger).log()`

### Follow-up

- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-035 — Deterministic CV draft to HTML renderer

### Scope

`HtmlRendererService.renderToHtml(workspaceId)`: reads `02_targeted_cv_content.json`, maps `Prompt2Output` → `CvContent` via `mapPrompt2OutputToCvContent()` (new mapper, `src/document-export/prompt2-to-cv-content.mapper.ts`), sources candidate identity/education/languages/links/volunteering from the new static config `src/document-export/candidate-profile.config.ts`, optionally applies `03_pre_pdf_check.json` corrections, calls existing `renderCvTemplate()`, writes `04_cv_export.html`, registers `GeneratedArtifact` with `origin = generated_by_export_service`. No AI provider call, no workspace status transition.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 31 suites / 292 tests passed, `npm run build` clean.
- After implementation: `npm run test` → 33 suites / 302 tests passed (2 new spec files, 10 new tests), `npx tsc --noEmit` clean, `npm run build` clean.
- New tests: `src/document-export/prompt2-to-cv-content.mapper.spec.ts` (current_work_block/experience/selected_projects copied verbatim; candidate/education/languages/links/volunteering sourced from static config, not Prompt2Output) and `src/document-export/html-renderer.service.spec.ts` (renders expected sections; 404 on missing workspace; Prompt 3 corrections applied when `03_pre_pdf_check.json` present and skipped on `ENOENT`; non-ENOENT read errors rethrown; `GeneratedArtifact` registered with canonical name `04_cv_export.html` and `origin = generated_by_export_service`; no AI provider dependency exists on the service at all).
- No real filesystem/DB run performed (unit tests only, per task scope — no controller/module wiring yet, that is TASK-036B).

### Follow-up

- Static config `candidate-profile.config.ts` contains a placeholder education entry (institution/degree/dates) — needs real data filled in before a real export is generated.
- Next: TASK-036A (choose PDF library) → TASK-036B (export controller + status transitions), which will wire `HtmlRendererService` into a NestJS module.

---

## 2026-07-06 — TASK-036A — Choose PDF library and implement PdfExportService

### Scope

`PdfExportService.htmlFileToPdf(htmlFilePath, pdfOutputPath)`: launches Puppeteer, navigates to the `file://` URL of the input HTML file, calls `page.pdf({ format: 'A4' })`, closes the browser in a `finally` block. Standalone `@Injectable()` class, same pattern as `HtmlRendererService` (TASK-035) — no NestJS module created, not registered as a provider anywhere (DI wiring is TASK-036B). No workspace/DB reads, no `GeneratedArtifact` writes, no status transitions.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
npm run lint
npx jest src/document-export/pdf-export.service.spec.ts --detectOpenHandles
tasklist | findstr /I chrome   # PowerShell/cmd equivalent used to check for leaked processes
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 33 suites / 302 tests passed, `npm run build` clean.
- `npm install puppeteer` → added `puppeteer@^24.43.1`, exit code 0. Warnings were pre-existing unrelated peer-dependency notices (`@nestjs/swagger` vs `class-validator`), not caused by this install.
- Puppeteer launched successfully on this Windows 11 machine with **default options — no `--no-sandbox` or other launch flags required**.
- **CI update (PR #32 review):** `Test` job failed on GitHub Actions (Linux runner) with `Failed to launch the browser process` / `FATAL:...zygote_host_impl_linux.cc: No usable sandbox!` — GitHub Actions' Linux containers disable unprivileged user namespaces, so Chromium's sandbox cannot start there even though it works unsandboxed on this Windows 11 dev machine. Added `{ args: ['--no-sandbox'] }` to `puppeteer.launch()` per the Library Decision fallback documented in `CURRENT_TASK.md`, with a code comment explaining the CI-vs-local discrepancy. Re-ran locally after the fix: still 34/34 suites, 303/303 tests, `tsc --noEmit` clean.
- After implementation: `npm run test` → 34 suites / 303 tests passed (1 new spec file, 1 new test), `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` clean.
- New test `src/document-export/pdf-export.service.spec.ts`: writes a minimal HTML file to a real temp directory (`fs.mkdtemp`), calls `htmlFileToPdf`, asserts `statSync(pdfPath).size > 0` on a real Puppeteer-generated PDF — no mocking of Puppeteer.
- Full suite run showed a Jest warning ("A worker process has failed to exit gracefully... force exited"). Investigated: running `pdf-export.service.spec.ts` in isolation with `--detectOpenHandles` shows **no open handles and no warning**; running the full suite with the new spec stashed out shows **no warning** (confirms the warning only appears when this spec runs inside the larger parallel suite). Checked running Chrome processes via `wmic process where "name='chrome.exe'" get ProcessId,CommandLine` after a full test run — no headless/puppeteer-flagged Chrome process was found, only the developer's regular browser windows. Conclusion: this is a known Jest-worker-teardown timing artifact of Puppeteer's internal transport handle under parallel Jest workers, not a leaked Chrome process — the browser is correctly closed via the `finally` block on every call.

### Follow-up

- None for this task. TASK-036B will wire `PdfExportService` into `document-export.module.ts` alongside `HtmlRendererService`.

---

## 2026-07-06 — TASK-036B — DocumentExportController and full export orchestration

### Scope

`DocumentExportService.exportCv(workspaceId)`: guards on `status === export_running` (400 `BadRequestException` otherwise), calls `HtmlRendererService.renderToHtml()` then `PdfExportService.htmlFileToPdf()` in order, hashes the resulting PDF binary via a local `createHash('sha256')` over the raw `Buffer` (not `HashService.hashFile`, which reads as `utf-8` text and would corrupt a binary hash), registers `04_cv_export.pdf` as a `GeneratedArtifact` (`origin: generated_by_export_service`), and transitions workspace status to `cv_pdf_generated` on success or `failed` on any thrown error (rethrown after the status update). `DocumentExportController`: `POST /workspaces/:id/export-cv` delegates to the service; `GET /workspaces/:id/download-cv` resolves the workspace's company/role slugs and the most recently registered PDF `GeneratedArtifact`, applies the same path-safety check as `ArtifactsController.download`, and streams the file with `Content-Disposition: attachment; filename="Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf"`. `DocumentExportModule` follows ADR-017 (imports `PrismaModule`, `ArtifactStorageModule`, `ArtifactsModule` directly; no `exports`) and is registered in `AppModule`. Both endpoints carry `@ApiOperation` per ADR-019.

### Commands

```bash
git checkout -b task/TASK-036B-document-export-controller
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → 34 suites / 303 tests passed.
- After implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (2 new spec files, 13 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (no errors/warnings).
- New tests in `src/document-export/document-export.service.spec.ts` (7 tests, manual jest mocks — no real Prisma/Puppeteer): 404 when workspace missing; 400 `BadRequestException` when status is not `export_running` (and neither collaborator is called); `HtmlRendererService.renderToHtml` called before `PdfExportService.htmlFileToPdf` (call-order assertion); status → `cv_pdf_generated` on success; status → `failed` and error rethrown when `PdfExportService` throws; `ArtifactsService.register` called with `canonicalFileName: '04_cv_export.pdf'`, `origin: 'generated_by_export_service'`, `mimeType: 'application/pdf'`; constructor arity check (`DocumentExportService.length === 4`) confirms no `AiProvider`/`AI_PROVIDER` dependency exists to call.
- New tests in `src/document-export/document-export.controller.spec.ts` (6 tests): `POST :id/export-cv` delegates to `DocumentExportService.exportCv`; `GET :id/download-cv` sets the exact expected `Content-Disposition` filename and streams the PDF buffer; picks the most recently registered PDF artifact when more than one exists for the workspace; 404 when workspace does not exist; 404 when no PDF artifact has been registered yet; 404 when the registered PDF's file is missing on disk.
- No `AiRun` created and no AI provider invoked anywhere in the new code — confirmed by inspection (`DocumentExportService`'s constructor has no `AI_PROVIDER`/`AiProvider`/`AiRunsService` parameter) and by the constructor-arity unit test above.
- Manual end-to-end run against a live workspace/DB was not performed in this session (would require a workspace already parked at `export_running` with an approved `02_targeted_cv_content.json` on disk); coverage relies on the unit tests above plus the already-verified real-Puppeteer test in `pdf-export.service.spec.ts` (TASK-036A) and the already-verified `HtmlRendererService` rendering tests (TASK-035).

### Follow-up

- TASK-037 (Markdown/JSON export endpoints) is next in the Phase 6 order; not implemented in this task.

---

## 2026-07-06 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implements the existing `AiProvider` interface unchanged: `providerName = 'openai'`, `modelName` read from `ConfigService.get('OPENAI_MODEL')` (falls back to `'gpt-4o'`), constructs an `openai` SDK client with `apiKey` from `ConfigService.get('OPENAI_API_KEY')`. `complete(prompt, inputContext, options)` calls `chat.completions.create()` with `prompt` as the `system` message and `inputContext` as the `user` message, requests `response_format: { type: 'json_object' }` when `options.jsonMode` is set, and maps the response into `AiProviderResult` (`text` from `choices[0].message.content`, `parsedJson` via `JSON.parse(text)` when `jsonMode`, `rawResponse` as the raw SDK response, `usage` mapped from `CompletionUsage` — `prompt_tokens`→`inputTokens`, `completion_tokens`→`outputTokens`, `total_tokens`→`totalTokens`, `prompt_tokens_details.cached_tokens`→`cachedInputTokens`, `completion_tokens_details.reasoning_tokens`→`reasoningTokens`, full raw usage JSON stringified into `rawJson`). `ai.module.ts` now exports a `createAiProvider(configService: ConfigService): AiProvider` factory function used as the `AI_PROVIDER` provider's `useFactory` (`inject: [ConfigService]`): returns `new OpenAiProvider(configService)` when `configService.get('AI_PROVIDER') === 'openai'`, otherwise `new FakeAiProvider()` (default, unchanged behavior when `AI_PROVIDER` is unset). Added `AI_PROVIDER` (`Joi.string().valid('fake','openai').default('fake')`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` (all optional) to `src/config/env.validation.ts`, and documented all five in `.env.example` (`AI_PROVIDER_DEFAULT`/`AI_MODEL_DEFAULT` noted as reserved for future step-level overrides — not read by any code yet, matching the ambiguous but explicit backlog acceptance criterion). `FakeAiProvider`, `Prompt1Service`, `Prompt2Service`, `SkipReasonService` and the `AiProvider`/`AiProviderOptions`/`AiProviderResult`/`AiProviderUsage` contracts were not touched.

### Commands

```bash
git checkout -b task/TASK-037A-openai-provider
npm install openai
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (confirmed fresh, not assumed from `TASK_BOARD.md`).
- `openai` SDK added as a production dependency after explicit user confirmation (no OpenAI SDK previously in `package.json`) — installed `openai@6.45.0`.
- After implementation: `npm run build` clean; `npm run test` → **38 suites / 324 tests passed** (2 new spec files, 8 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (auto-fix reformatted line-wrapping only, no errors/warnings).
- New tests in `src/ai/providers/openai.provider.spec.ts` (5 tests, `openai` SDK client mocked via `jest.mock('openai', ...)` — no real network calls): provider/model name reflects `ConfigService` values; falls back to `'gpt-4o'` when `OPENAI_MODEL` is unset; maps a mocked plain-text response into `AiProviderResult` and asserts the exact `messages`/`model` payload sent to `chat.completions.create`; requests `response_format: json_object` and parses `parsedJson` when `jsonMode` is enabled, including cached/reasoning token mapping; returns `usage: undefined` when the mocked response has no `usage` field.
- New tests in `src/ai/ai.module.spec.ts` (3 tests): `createAiProvider()` returns `FakeAiProvider` when `AI_PROVIDER` is unset; returns `FakeAiProvider` when explicitly `'fake'`; returns `OpenAiProvider` when `'openai'`.
- All pre-existing `FakeAiProvider`/pipeline tests (`fake.provider.spec.ts`, `prompt1.service.spec.ts`, `prompt2.service.spec.ts`, `skip-reason.service.spec.ts`, etc.) pass unmodified — no source changes to any pipeline consumer of `AI_PROVIDER`.
- Manual smoke test with a real `OPENAI_API_KEY` against the live OpenAI API was **not performed** in this session (no API key available in this environment); documenting the intended manual check instead: set `AI_PROVIDER=openai` and a real `OPENAI_API_KEY`/`OPENAI_MODEL` in a local `.env` (never commit it), then call `Prompt1Service`'s pipeline (or invoke `OpenAiProvider.complete()` directly in a scratch script) and confirm a non-empty `text`/`parsedJson` response with populated `usage` fields. This manual check is a follow-up for whoever runs the first real pipeline call, not a blocker for closing this task per its Done Definition (abstraction works with fake provider; wiring to a real key is an operational step).

### Follow-up

- TASK-037B (seed real Prompt 1/Prompt 2 template content) and TASK-037D (.env/onboarding docs) are next in the recommended Phase 6 order — not implemented in this task.
- The real-provider manual smoke test above should be performed once a real `OPENAI_API_KEY` is available, ideally as part of TASK-038A (practical MVP real-provider smoke test).

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

## 2026-07-07 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implementing `AiProvider` via the `openai` SDK. `AiModule` (`src/ai/ai.module.ts`) selects `FakeAiProvider` or `OpenAiProvider` via a `createAiProvider(configService)` factory keyed on `AI_PROVIDER` env var (`fake` default, `openai` when set). `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` added to `src/config/env.validation.ts` and `.env.example`.

### Commands

```bash
npm run test
```

Baseline before this task (last recorded, TASK-036B): 36 suites, 316 tests.
Result after TASK-037A: 38 suites, 324 tests, 0 failures.

### Result

PASS

### Evidence

- `src/ai/providers/openai.provider.spec.ts` mocks the OpenAI SDK client — no real network call in unit tests.
- `src/ai/ai.module.ts` factory tested for both `AI_PROVIDER` unset/`fake` (returns `FakeAiProvider`) and `AI_PROVIDER=openai` (returns `OpenAiProvider`) selection paths.
- `OpenAiProvider.complete()` maps `response.choices[0].message.content` → `text`, parses `text` to `parsedJson` when `options.jsonMode` is set, and maps `response.usage` → `AiProviderUsage` (`inputTokens`, `outputTokens`, `totalTokens`, `cachedInputTokens`, `reasoningTokens`, `rawJson`).
- Existing `FakeAiProvider` and pipeline tests unmodified and passing.
- `.env.example` documents all 5 new vars without a real key committed.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` (Prompt 1 call through `AiProvider` abstraction with `AI_PROVIDER=openai`) not yet performed/recorded — required before TASK-038A (real-provider MVP smoke test).
- Next recommended task: TASK-037B (seed real Prompt 1/Prompt 2 template content).

## 2026-07-07 — TASK-037B — Seed real Prompt 1 and Prompt 2 template content

### Scope

Replaced placeholder `PromptTemplate` seed content with real prompts implementing the content-selection contract from `docs/08_ai_pipeline.md` §8.4/§10.6–10.8. Prompt text stored as `prisma/prompts/prompt1.txt` and `prisma/prompts/prompt2.txt`, read via `fs.readFileSync` in `prisma/seed.ts` (`readPromptFile()` helper). No changes to `PromptTemplate` model, `PromptTemplatesService`, `AiProvider`/`OpenAiProvider`/`FakeAiProvider`, pipeline services, HTML renderer or CV JSON schema. Prompts adapted from a user-supplied ChatGPT-style conversational draft: condensed the full scoring/risk/safety logic (German language gate, current-work block rules, overclaiming guardrails, risk-stacking) into strict JSON-only output instructions matching `prompt1.schema.ts`/`prompt2.schema.ts` field names exactly — the original draft targeted a human chat session (markdown file creation, follow-up questions, quality-score sections) and was not usable verbatim against `AiProvider.complete(..., { jsonMode: true })`.

### Commands

```bash
npm run test
npx prisma db seed
npx prisma db seed   # re-run to verify idempotency
```

Baseline before this task (TASK-037A): 38 suites, 324 tests.
Result after TASK-037B: 39 suites, 339 tests, 0 failures (+1 suite / +15 tests: new `src/pipeline/prompt-template-content.spec.ts` contract test; all pre-existing tests unmodified and passing).

### Result

PASS

### Evidence

- `npx prisma db seed` run twice against the local dev Postgres (`jobflow_postgres` container): both runs report "Seeded 2 active PromptTemplate records", no errors.
- DB verification query after both runs:
  ```
  id                                    | promptKey                    | step     | version | isActive | content_len
  seed-prompt-1-vacancy-analysis-v1     | prompt_1_vacancy_analysis    | prompt_1 |    1    | t        | 9741
  seed-prompt-2-targeted-cv-content-v1  | prompt_2_targeted_cv_content | prompt_2 |    1    | t        | 11075
  ```
  Exactly 2 rows both times — confirms the fixed-ID upsert pattern in `seed.ts` does not create duplicate active versions on re-run.
- `src/pipeline/prompt-template-content.spec.ts` (15 tests) verifies: Prompt 1 requires JSON-only output and the exact `Prompt1Analysis` field names; Prompt 2 covers all 10 points of the §10.8 template contract (bullet count/wording decision, evidence-based bullets, mandatory current-work block, personal/project inclusion, separate labeling from commercial experience, `include`/`project_type`/`relevance_reason` fields on selected projects, rendering hints/priorities, no fixed bullet count, no moving current-work/projects into commercial history, `needs evidence` marking) plus the "renderer must not invent/rewrite/reinterpret" statement.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` and a real vacancy (Prompt 1 + Prompt 2 end-to-end through `AiProvider`) not yet performed — still pending before TASK-038A.
- Known MVP gap (pre-existing, not introduced by this task): `PromptInputBuilderService`/`Prompt2InputBuilderService` list knowledge sources by name only (`[content not loaded in MVP]`), so the seeded prompts instruct the AI to treat unloaded source content as unverifiable and mark related claims `needs evidence` rather than assuming file content is available. Loading actual source content into the input context is out of scope for TASK-037B (see TASK-037C-0/037C).
- Next recommended task: per `TASK_BOARD.md`, TASK-037C-0 (create and commit knowledge source content files).

## 2026-07-07 — TASK-037C-0 — Create and commit knowledge source content files

### Scope

Created the `knowledge-sources/` folder structure (`candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/`, `prompts/`) with `.gitkeep` in each empty subfolder. Copied the user-supplied prompt source files (from `D:\infa\Documents\jobs for analys\New folder`) into `knowledge-sources/prompts/` under the backlog-mandated filenames, verbatim: `prompt_1_vacancy_analysis.md`, `prompt_2_targeted_cv_content.md`, `prompt_2_1_cover_letter.md`, `prompt_3_pre_pdf_check.md`, `prompt_4_pdf_export_rules.md`, `prompt_5_final_check.md`. Two additional files (`prompt_4_1_optional_html.md`, `prompt_6_recruiter_message.md`) were renamed and placed for future use only — not wired into any pipeline logic, `Prompt2InputBuilder`, or registration script. Added `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources` to `.env.example`. Documented the git strategy (commit all files to the private repo, no `.gitignore` changes) in `knowledge-sources/README.md`. No content was created for `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` — that remains manual developer work outside this session, per `CURRENT_TASK.md` scope. No Prisma schema, controller, service, or DB registration changes — that is TASK-037C.

### Commands

```bash
find knowledge-sources -type f
diff <source file> knowledge-sources/prompts/<renamed file>   # x8, all identical
```

### Result

PASS

### Evidence

- `find knowledge-sources -type f` confirms all 6 backlog-mandated prompt files plus `README.md` and 5 `.gitkeep` files exist at the expected paths.
- `diff` between each of the 8 source files (in `D:\infa\Documents\jobs for analys\New folder`) and its renamed copy in `knowledge-sources/prompts/` reported no differences — content copied byte-for-byte, no text edits.
- `.env.example` contains `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources`.
- `knowledge-sources/README.md` documents the git strategy and explicitly flags `prompt_4_1_optional_html.md` / `prompt_6_recruiter_message.md` as future-scope, not consumed by TASK-037C.

### Follow-up

- Developer role (per `docs/07_task_backlog.md` TASK-037C-0 section) still open: populate `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` with real content files. Not required for TASK-037C-0's Claude Code scope but is required before TASK-037C (registration) can reference them.
- Next recommended task: per `TASK_BOARD.md`, TASK-037C (register and activate knowledge source files) — blocked until developer supplies the content files above.

