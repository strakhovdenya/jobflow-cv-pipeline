# JobFlow CV Pipeline — Task Backlog

## 1. Purpose

This document breaks the JobFlow CV Pipeline epics into small Claude-Code-friendly implementation tasks.

Each task is intended to be small enough for one focused implementation step with Claude Code. The backlog follows the existing project documents:

- `docs/00_product_vision_updated_consistent.md`
- `docs/01_requirements.md`
- `docs/02_user_flows_v3_consistent.md`
- `docs/03_domain_model.md`
- `docs/04_architecture.md`
- `docs/05_epics.md`
- `docs/06_roadmap.md`
- `docs/08_ai_pipeline.md`
- `docs/09_artifact_storage.md`

Key scope rules preserved in this backlog:

- first usable MVP starts with manual workspace creation;
- existing folder import is P1 optional, robust import is later;
- Prompt 1 must pause for human review;
- `apply` and `maybe` continue only after user approval;
- `skip` creates `01_skip_reason.md/json` and stops the pipeline;
- `00_vacancy_source.txt` is the canonical internal vacancy file;
- PDF is the default physical CV export;
- Prompt 3 and Prompt 5 are P1 optional, not MVP blockers;
- cover letter generation is Phase 2;
- Redis/BullMQ and Next.js dashboard are later;
- anti-overclaiming guard is MVP required;
- PostgreSQL metadata must persist through local Docker container restart/recreation when the named volume is preserved.
- unit tests are required for P0 deterministic MVP logic before real AI integration is treated as ready.
- first usable MVP means a real OpenAI-backed run on a real vacancy that produces a real generated CV PDF; fake-provider E2E proves mechanics but is not enough for MVP acceptance.

## 1.1 MVP Readiness Levels

The backlog distinguishes two readiness levels:

```text
Mechanical MVP readiness:
  fake AI provider
  -> deterministic E2E flow
  -> artifacts and PostgreSQL metadata verified
  -> no external AI cost

Practical MVP readiness:
  real OpenAI provider
  -> real vacancy
  -> real Prompt 1 analysis
  -> human approval
  -> real Prompt 2 CV content
  -> anti-overclaiming guard
  -> clean two-column PDF export
  -> manual acceptance notes saved
```

`TASK-038` validates mechanical MVP readiness. `TASK-038A` validates practical MVP readiness and is required before the project is treated as the first usable MVP.

## 2. Task Format

Each task contains:

- id;
- title;
- context;
- files likely affected;
- acceptance criteria;
- test requirement;
- done definition.

## 3. Phase 0 — Project Foundation

### TASK-001 — Initialize NestJS project structure

**Context:** Create the backend-first foundation for the project.

**Files likely affected:**

```text
package.json
tsconfig.json
nest-cli.json
src/main.ts
src/app.module.ts
README.md
```

**Acceptance criteria:**

- NestJS project starts locally.
- Health endpoint returns a simple success response.
- Project uses TypeScript.
- README includes local start command.

**Test requirement:**

- Add a basic health endpoint test or basic app bootstrap test.

**Done definition:**

- `npm install`, `npm run start:dev`, and tests work locally.

### TASK-002 — Add project documentation skeleton

**Context:** Keep the repository aligned with the planning documents.

**Files likely affected:**

```text
docs/00_product_vision_updated_consistent.md
docs/01_requirements.md
docs/02_user_flows_v3_consistent.md
docs/03_domain_model.md
docs/04_architecture.md
docs/05_epics.md
docs/06_roadmap.md
docs/07_task_backlog.md
docs/08_ai_pipeline.md
docs/09_artifact_storage.md
README.md
```

**Acceptance criteria:**

- `docs/` folder exists.
- Current planning files are copied or referenced.
- README links to the most important docs.

**Test requirement:**

- No automated test required.
- Manual check that docs are present and readable.

**Done definition:**

- Repository contains a stable documentation baseline.

### TASK-003 — Add CLAUDE.md project rules

**Context:** Claude Code should follow project-specific implementation boundaries.

**Files likely affected:**

```text
CLAUDE.md
README.md
```

**Acceptance criteria:**

- `CLAUDE.md` defines backend-first approach.
- Rules mention NestJS, Prisma, PostgreSQL, filesystem artifacts and tests.
- Rules prohibit scope creep into frontend/queues before planned phases.
- Rules require preserving human review gates and anti-overclaiming logic.

**Test requirement:**

- Manual review only.

**Done definition:**

- Claude Code has clear project instructions before multi-file implementation.

### TASK-004 — Configure Docker Compose with persistent PostgreSQL volume

**Context:** PostgreSQL must survive normal local Windows development shutdowns, Docker Desktop restarts, container removal and recreation, as long as the named volume is not explicitly deleted.

**Files likely affected:**

```text
docker-compose.yml
.env.example
README.md
docs/04_architecture.md
```

**Acceptance criteria:**

- `docker-compose.yml` defines a `postgres` service.
- PostgreSQL uses a named volume, for example `postgres_data:/var/lib/postgresql/data`.
- Top-level `volumes.postgres_data` is defined.
- `.env.example` includes database variables.
- README warns that `docker compose down -v` deletes data.

**Test requirement:**

- Manual persistence check:
  1. start PostgreSQL;
  2. create a test table or record;
  3. run `docker compose down`;
  4. run `docker compose up -d postgres`;
  5. verify the data still exists.

**Done definition:**

- PostgreSQL data survives container stop/start and container recreation without volume deletion.

### TASK-005 — Add PostgreSQL persistence verification script or checklist

**Context:** Persistence must be checked, not only assumed.

**Files likely affected:**

```text
scripts/check-postgres-persistence.md
scripts/check-postgres-persistence.sh
README.md
package.json
```

**Acceptance criteria:**

- A documented checklist or script verifies named-volume persistence.
- The flow checks that data exists after `docker compose down` and `docker compose up -d postgres`.
- The flow states that `docker compose down -v` is destructive and not part of normal startup.

**Test requirement:**

- Run the checklist manually once and document result in README or local notes.

**Done definition:**

- A developer can verify that database tables and data survive local Docker restart.

### TASK-006 — Add Prisma setup

**Context:** PostgreSQL metadata should be managed via Prisma.

**Files likely affected:**

```text
prisma/schema.prisma
prisma/migrations/**
src/prisma/prisma.module.ts
src/prisma/prisma.service.ts
.env.example
package.json
```

**Acceptance criteria:**

- Prisma connects to PostgreSQL.
- Initial migration can run.
- PrismaService is available as NestJS provider.
- No destructive reset command is used in normal startup.

**Test requirement:**

- Add a test or script that verifies database connection.

**Done definition:**

- `npx prisma migrate dev` works locally and persists schema in PostgreSQL.

### TASK-006A — Add unit test setup and conventions

**Context:** The project needs a predictable testing baseline from the beginning. Unit tests must be available before expanding the AI pipeline, and core services must be testable without calling real AI providers.

**Files likely affected:**

```text
package.json
jest.config.ts
test/setup.ts
src/**/*.spec.ts
docs/07_task_backlog.md
```

**Acceptance criteria:**

- Jest is configured for the NestJS application.
- Unit tests can be run with `npm run test`.
- Test file naming convention is documented or obvious from examples.
- Core services can be tested without real OpenAI/Anthropic calls.
- AI provider abstraction can be mocked or replaced with a fake provider in tests.
- Tests do not require the full prompt pipeline to be implemented.

**Test requirement:**

- Add at least one passing sample unit test for a pure service.
- `npm run test` must pass locally.

**Done definition:**

- The repository has a working unit test baseline and Claude Code can safely add tests for new services.

### TASK-006B — Add P0 unit tests for core MVP logic

**Context:** Before connecting real AI generation, the deterministic MVP logic must be protected by unit tests. These tests should cover the rules that are easy to break later: slug normalization, workspace validation, canonical artifact names, skip handling, approval gates and anti-overclaiming guard basics.

**Files likely affected:**

```text
src/common/slug/slug.service.ts
src/workspaces/workspace.service.ts
src/artifacts/artifact.service.ts
src/prompt-runs/prompt-run.service.ts
src/decision-gates/decision-gate.service.ts
src/evidence-guard/evidence-guard.service.ts
src/**/*.spec.ts
```

**Acceptance criteria:**

- Unit tests cover `company_slug` normalization.
- Unit tests cover `role_slug` normalization with Unicode Cyrillic letters.
- Unit tests cover empty company / role / vacancy validation.
- Unit tests cover canonical artifact names, including `00_vacancy_source.txt`, `01_skip_reason.md/json`, `02_targeted_cv_content.md/json` and `04_cv_export.pdf`.
- Unit tests cover skip decision behavior: create skip artifacts and stop the CV pipeline.
- Unit tests cover blocking Prompt 2 until the user approves `apply` or `maybe`.
- Unit tests cover manual override from `skip` to continue, with override logging required.
- Unit tests cover basic anti-overclaiming guard rules for risky claims such as commercial AI/LLM, commercial NestJS, production Docker ownership, Kubernetes, AWS/DynamoDB/MySQL without evidence and fluent language claims.

**Test requirement:**

- Jest unit tests with deterministic inputs.
- No real OpenAI/Anthropic calls.
- No real filesystem dependency unless explicitly mocked or isolated in a temporary directory.
- No destructive database reset commands.

**Done definition:**

- Core MVP business rules have unit test coverage and `npm run test` passes locally.

## 4. Phase 1 — Manual Workspace Creation

### TASK-007 — Implement company and role slug normalization utility

**Context:** New workspaces must use underscore-based safe naming with separate company and role rules.

**Files likely affected:**

```text
src/common/slug/slug.service.ts
src/common/slug/slug.service.spec.ts
src/common/slug/slug.module.ts
```

**Acceptance criteria:**

- Company slug preserves English letters, Unicode Cyrillic letters, numbers and underscores.
- Role slug preserves English letters, Unicode Cyrillic letters and underscores.
- Role slug removes numbers unless rules change later.
- Separators and whitespace are converted to underscores.
- Repeated underscores are collapsed.
- Original values are not mutated.

**Test requirement:**

- Unit tests for Action1, CHECK24, Omega CRM, Ukrainian/Cyrillic company examples and role examples.

**Done definition:**

- Slug rules match User Flows and Artifact Storage documents.

### TASK-008 — Create Company and JobVacancy Prisma models

**Context:** Company and vacancy metadata must preserve original display values and normalized slugs.

**Files likely affected:**

```text
prisma/schema.prisma
prisma/migrations/**
src/company/**
src/vacancy/**
```

**Acceptance criteria:**

- `Company` stores original name and company slug.
- `JobVacancy` stores original role title, role slug, source URL, language hint and vacancy text hash/path references.
- Relations support one company to many vacancies.

**Test requirement:**

- Prisma integration test or service test for create/read company and vacancy.

**Done definition:**

- Company and vacancy records can be created and queried from PostgreSQL.

### TASK-009 — Create ApplicationWorkspace Prisma model

**Context:** ApplicationWorkspace is the central aggregate for a single job opportunity.

**Files likely affected:**

```text
prisma/schema.prisma
prisma/migrations/**
src/workspaces/**
```

**Acceptance criteria:**

- Workspace links to Company and JobVacancy.
- Workspace stores workspace slug, status, decision and review state.
- Initial status is `source_saved`.
- Workspace supports future prompt runs, artifacts and drafts.

**Test requirement:**

- Service test for creating a workspace with company and vacancy.

**Done definition:**

- Workspace can be created and retrieved with linked company/vacancy metadata.

### TASK-010 — Implement manual workspace creation DTO validation

**Context:** User must enter company name, role title and vacancy text separately.

**Files likely affected:**

```text
src/workspaces/dto/create-workspace.dto.ts
src/workspaces/workspaces.controller.ts
src/workspaces/workspaces.service.ts
src/common/validation/**
```

**Acceptance criteria:**

- `companyNameOriginal` is required.
- `roleTitleOriginal` is required.
- `vacancyText` is required for manual creation.
- Source URL is optional.
- Validation returns clear errors.

**Test requirement:**

- Controller or DTO tests for missing company, missing role and missing vacancy text.

**Done definition:**

- Invalid workspace input is blocked before filesystem or database write.

### TASK-011 — Create workspace folder and canonical vacancy artifact

**Context:** New workspaces must create a filesystem folder and save vacancy text as `00_vacancy_source.txt`.

**Files likely affected:**

```text
src/artifacts/artifact-storage.service.ts
src/workspaces/workspaces.service.ts
src/config/storage.config.ts
storage/applications/**
```

**Acceptance criteria:**

- Workspace folder uses `<date>_<company_slug>_<role_slug>` format.
- Vacancy text is saved as `00_vacancy_source.txt`.
- Vacancy text is stored as UTF-8.
- Line breaks and special characters inside vacancy text are preserved.
- File path and content hash are available for metadata storage.

**Test requirement:**

- Service test creates a workspace and checks physical file exists with exact content.

**Done definition:**

- Manual workspace creation produces a database record and a real vacancy source file.

### TASK-012 — Add workspace creation endpoint

**Context:** The API must expose manual workspace creation.

**Files likely affected:**

```text
src/workspaces/workspaces.controller.ts
src/workspaces/workspaces.service.ts
src/workspaces/dto/**
src/workspaces/workspaces.module.ts
```

**Acceptance criteria:**

- `POST /workspaces` creates company, vacancy, workspace and vacancy source artifact.
- Response includes workspace ID, status, slugs, folder path and canonical file path.
- Response includes preview-style metadata.

**Test requirement:**

- E2E or controller test for successful creation.

**Done definition:**

- A user can create a workspace through the API from separate company, role and vacancy text inputs.

### TASK-013 — Add workspace list and detail endpoints

**Context:** User must inspect workspace status and artifacts.

**Files likely affected:**

```text
src/workspaces/workspaces.controller.ts
src/workspaces/workspaces.service.ts
```

**Acceptance criteria:**

- `GET /workspaces` returns basic list.
- `GET /workspaces/:id` returns company, role, status, decision, paths and artifact summary.
- Supports simple ordering by created date.

**Test requirement:**

- Controller/service tests for list and detail.

**Done definition:**

- Existing workspace states are inspectable through the API.

## 5. Phase 2 — Metadata, Artifacts & Source Knowledge Base

### TASK-014 — Create GeneratedArtifact model and registry service

**Context:** Every physical artifact must be tracked in PostgreSQL.

**Files likely affected:**

```text
prisma/schema.prisma
src/artifacts/generated-artifact.model.ts
src/artifacts/artifacts.service.ts
src/artifacts/artifacts.controller.ts
```

**Acceptance criteria:**

- `GeneratedArtifact` stores workspace ID, type, format, canonical file name, path, hash, origin, prompt run ID optional and latest flag.
- Vacancy source file is registered as a generated/source artifact.
- Multiple artifacts can belong to one workspace.

**Test requirement:**

- Service test for registering an artifact and querying by workspace.

**Done definition:**

- PostgreSQL knows which files belong to which workspace.

### TASK-015 — Implement artifact hashing utility

**Context:** Hashes are needed for duplicate detection, idempotency and reproducibility.

**Files likely affected:**

```text
src/artifacts/hash.service.ts
src/artifacts/hash.service.spec.ts
```

**Acceptance criteria:**

- Hash service calculates stable content hash for text and files.
- Hash is stored for generated artifacts.
- Hashing supports UTF-8 vacancy text.

**Test requirement:**

- Unit tests for same content same hash, changed content different hash.

**Done definition:**

- GeneratedArtifact records can store reliable content hashes.

### TASK-016 — Add artifact access endpoints

**Context:** User must preview/download artifacts.

**Files likely affected:**

```text
src/artifacts/artifacts.controller.ts
src/artifacts/artifacts.service.ts
```

**Acceptance criteria:**

- `GET /workspaces/:id/artifacts` lists artifacts.
- `GET /artifacts/:id/download` downloads file.
- File paths are validated against storage root.
- Missing file returns clear error.

**Test requirement:**

- Controller test for listing artifacts and blocked unsafe path access.

**Done definition:**

- User can access generated physical files through the backend.

### TASK-017 — Create KnowledgeSource model and import service

**Context:** Source knowledge files are the evidence base for prompts.

**Files likely affected:**

```text
prisma/schema.prisma
src/knowledge-sources/**
```

**Acceptance criteria:**

- KnowledgeSource stores path, type, active flag, hash, version label and imported timestamp.
- Supports core source files: master profile, tech stack matrix, case deep dives, CV rules and certifications.
- Source file can be activated/deactivated.

**Test requirement:**

- Service test for importing a knowledge source and calculating hash.

**Done definition:**

- Source knowledge files are tracked in PostgreSQL.

### TASK-018 — Add KnowledgeSource selection for prompt steps

**Context:** Prompt runs must know which source files were used.

**Files likely affected:**

```text
src/knowledge-sources/**
src/prompt-runs/**
prisma/schema.prisma
```

**Acceptance criteria:**

- Active knowledge sources can be selected for Prompt 1 and Prompt 2.
- PromptRun stores a source snapshot with file IDs, paths, hashes and version labels.
- Inactive sources are not used by default.
- Prompt-step source selection is explicit and deterministic; Prompt 1 and Prompt 2 do not simply include every registered source by default.
- The service supports the MVP source groups documented in `docs/08_ai_pipeline.md`: candidate profile, evidence, CV rules, certifications, layout reference and prompt source files.
- Source selection is implemented separately from Prompt 2 generation, so it can be tested before real OpenAI calls are introduced.

**Test requirement:**

- Service test for source selection and snapshot creation.

**Done definition:**

- Prompt outputs can be traced back to exact source files.

### TASK-019 — Create EvidenceItem model and basic seed data

**Context:** Anti-overclaiming requires structured evidence rules.

**Files likely affected:**

```text
prisma/schema.prisma
src/evidence/**
prisma/seed.ts
```

**Acceptance criteria:**

- EvidenceItem can represent allowed, risky and unsupported claim areas.
- Seed includes examples for Node.js, TypeScript, Azure Functions, PostgreSQL, NestJS, Docker, Kubernetes, AWS, AI/RAG.
- Evidence categories align with project docs.

**Test requirement:**

- Test that seed or service returns expected evidence categories.

**Done definition:**

- The backend can query evidence rules for safety checks.

## 6. Phase 3 — Prompt Templates, AI Runs & Prompt 1

### TASK-020 — Create PromptTemplate model and CRUD service

**Context:** Prompt versions must be reproducible and never silently overwritten.

**Files likely affected:**

```text
prisma/schema.prisma
src/prompt-templates/**
```

**Acceptance criteria:**

- PromptTemplate stores key, step, version, content, active flag and description.
- Creating a new version does not overwrite old versions.
- Only one active template per prompt step is allowed by service logic.

**Test requirement:**

- Service tests for version creation and active template selection.

**Done definition:**

- Prompt templates are versioned and queryable.

### TASK-021 — Seed MVP prompt templates

**Context:** MVP needs Prompt 1 and Prompt 2 templates at minimum.

**Files likely affected:**

```text
prisma/seed.ts
src/prompt-templates/seeds/**
```

**Acceptance criteria:**

- Seed creates Prompt 1 vacancy analysis template.
- Seed creates Prompt 2 targeted CV content template.
- Prompt 3, Prompt 5 and cover letter templates may be seeded inactive or later.

**Test requirement:**

- Seed verification or service test that active Prompt 1 and Prompt 2 exist.

**Done definition:**

- A fresh database can run MVP prompts without manual prompt insertion.

### TASK-022 — Create AiRun model with token usage fields

**Context:** AI usage must be tracked per provider call.

**Files likely affected:**

```text
prisma/schema.prisma
src/ai-runs/**
```

**Acceptance criteria:**

- AiRun stores provider, model, status, request hash, response hash, error message optional.
- AiRun stores `input_tokens`, `output_tokens`, `total_tokens` when available.
- Optional fields exist for cached input tokens, reasoning tokens, raw usage JSON, cost estimate and pricing config version.

**Test requirement:**

- Service test for saving successful and failed AiRun records.

**Done definition:**

- Every AI call can be audited with token usage when provider returns it.

### TASK-023 — Implement AI provider abstraction interface

**Context:** The app should support OpenAI or Anthropic without coupling pipeline code to one provider.

**Files likely affected:**

```text
src/ai/ai-provider.interface.ts
src/ai/ai-provider.service.ts
src/ai/providers/**
src/ai/ai.module.ts
```

**Acceptance criteria:**

- Provider interface accepts prompt, input context and JSON mode flag if supported.
- Provider output returns text, parsed JSON optional, raw response optional and usage data optional.
- Provider implementation can be swapped via config.

**Test requirement:**

- Unit test using a fake provider.

**Done definition:**

- Prompt pipeline can call an AI provider through a stable interface.

### TASK-024 — Implement PromptRun model and service

**Context:** PromptRun connects workspace, prompt template, source snapshots, AI run and output artifacts.

**Files likely affected:**

```text
prisma/schema.prisma
src/prompt-runs/**
```

**Acceptance criteria:**

- PromptRun stores workspace ID, prompt step, template ID/version, status, input hash, source snapshot and output artifact IDs.
- PromptRun status supports pending, running, completed and failed.
- PromptRun can link to AiRun.

**Test requirement:**

- Service test for creating and completing a PromptRun.

**Done definition:**

- Every generated AI output has traceable prompt execution metadata.

### TASK-025 — Implement Prompt 1 input builder

**Context:** Prompt 1 must combine vacancy source, template and relevant knowledge sources.

**Files likely affected:**

```text
src/pipeline/prompt-input-builder.service.ts
src/pipeline/prompt1/**
```

**Acceptance criteria:**

- Reads `00_vacancy_source.txt`.
- Includes company and role metadata.
- Includes selected source knowledge file content or summaries.
- Preserves source hashes in PromptRun snapshot.

**Test requirement:**

- Unit test with fake workspace and fake knowledge sources.

**Done definition:**

- Prompt 1 receives reproducible inputs.

### TASK-026 — Implement Prompt 1 vacancy analysis execution

**Context:** Prompt 1 is the first AI pipeline step.

**Files likely affected:**

```text
src/pipeline/prompt1/prompt1.service.ts
src/pipeline/pipeline.module.ts
src/workspaces/workspaces.service.ts
```

**Acceptance criteria:**

- `POST /workspaces/:id/run-analysis` runs Prompt 1 synchronously in MVP.
- Creates PromptRun and AiRun records.
- Saves `01_vacancy_analysis.md` and `01_vacancy_analysis.json`.
- Workspace status becomes `paused_after_analysis`.
- Decision is stored as apply/maybe/skip.

**Test requirement:**

- Service test using fake AI provider with deterministic analysis output.

**Done definition:**

- A workspace can produce Prompt 1 artifacts and pause for human review.

### TASK-027 — Add Prompt 1 JSON validation

**Context:** AI output must be structured enough for decision gates.

**Files likely affected:**

```text
src/pipeline/schemas/prompt1.schema.ts
src/pipeline/prompt1/**
```

**Acceptance criteria:**

- Prompt 1 JSON includes score, decision, must-have, nice-to-have, wishlist, hidden role logic, risks and next action.
- Invalid JSON fails safely and marks PromptRun/AiRun failed.
- Markdown output can still be saved if JSON parsing fails, if available.

**Test requirement:**

- Unit tests for valid and invalid Prompt 1 JSON.

**Done definition:**

- Prompt 1 output can reliably drive review gate logic.

## 7. Phase 4 — Skip Handling & Manual Override

### TASK-028 — Implement Prompt 1 decision gate endpoint

**Context:** Prompt 1 must not automatically continue to Prompt 2.

**Files likely affected:**

```text
src/review-gates/**
src/workspaces/workspaces.controller.ts
src/workspaces/workspaces.service.ts
```

**Acceptance criteria:**

- API exposes decision review action.
- User can approve apply, approve maybe, pause, change to skip or override skip.
- Review decision is stored.
- Only approved apply/maybe can proceed to Prompt 2.

**Test requirement:**

- Service tests for apply approval, maybe pause and skip override.

**Done definition:**

- Human-in-the-loop decision gate is enforced by backend state transitions.

### TASK-029 — Implement skip reason generation

**Context:** If decision is skip, the system must create skip artifacts and stop pipeline.

**Files likely affected:**

```text
src/pipeline/skip/skip-reason.service.ts
src/artifacts/**
src/workspaces/**
```

**Acceptance criteria:**

- Skip creates `01_skip_reason.md` and `01_skip_reason.json` as canonical internal artifacts.
- Human-readable download name can be generated as `SKIP_<company_slug>_<role_slug>_reason_RU.md`.
- Workspace status becomes `skipped`.
- Pipeline cannot run Prompt 2 unless manual override is logged.

**Test requirement:**

- Service test for skip decision producing artifacts and blocking Prompt 2.

**Done definition:**

- Broadvoice-style skip flow is supported.

### TASK-030 — Implement manual override logging

**Context:** Overrides must be explicit and auditable.

**Files likely affected:**

```text
prisma/schema.prisma
src/review-gates/**
src/workspaces/**
```

**Acceptance criteria:**

- Override stores previous decision, new decision, reason optional, timestamp and user review state.
- Override from skip to continue changes decision to manual override value.
- Artifacts are not deleted.

**Test requirement:**

- Service test for override transition and audit data.

**Done definition:**

- Risky manual decisions are traceable.

## 8. Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard

### TASK-031 — Implement Prompt 2 input builder

**Context:** Prompt 2 must use Prompt 1 analysis, vacancy source and evidence sources.

**Files likely affected:**

```text
src/pipeline/prompt2/**
src/pipeline/prompt-input-builder.service.ts
```

**Acceptance criteria:**

- Prompt 2 input includes vacancy source, Prompt 1 artifacts, source knowledge files, CV rules and evidence rules.
- Prompt 2 cannot run unless apply/maybe was approved or skip was overridden.

**Test requirement:**

- Unit test for blocked Prompt 2 without approval and allowed Prompt 2 after approval.

**Done definition:**

- Prompt 2 receives safe, traceable and approved inputs.

### TASK-032 — Implement Prompt 2 targeted CV generation

**Context:** Generate evidence-based targeted CV content. Prompt 2 decides the CV content: bullet count, bullet wording, selected projects, certifications and optional sections. The renderer must not make these content decisions.

**Files likely affected:**

```text
src/pipeline/prompt2/prompt2.service.ts
src/pipeline/schemas/prompt2.schema.ts
src/artifacts/**
```

**Acceptance criteria:**

- Saves `02_targeted_cv_content.md`.
- Saves `02_targeted_cv_content.json`.
- Prompt 2 output includes structured experience items where AI decides bullet count and exact bullet wording based on vacancy relevance and evidence.
- Prompt 2 output includes selected current/personal projects when they are relevant to the role and supported by project inventory.
- Personal/current projects are labeled separately from commercial work experience.
- Prompt 2 output provides rendering hints/priorities, but the renderer does not rewrite content.
- Creates PromptRun and AiRun records with token usage when available.
- Workspace status becomes `paused_after_cv_draft`.

**Test requirement:**

- Service test using fake AI output.
- Schema/contract test verifies Prompt 2 output accepts variable bullet counts per experience item.
- Schema/contract test verifies selected current/personal projects can be included with `include`, `project_type`, `relevance_reason`, `display_priority`, `safe_label`, `bullets`, `tech_stack` and evidence references.
- Test verifies personal/current projects are not stored under commercial experience.

**Done definition:**

- Approved workspace can produce a targeted CV draft artifact with AI-selected bullets and optional relevant personal/current projects.

### TASK-033 — Implement basic anti-overclaiming guard

**Context:** MVP must prevent unsupported claims from reaching CV output. The guard follows the strict MVP policy: critical unsupported claims block PDF export unless the user explicitly overrides with a note; medium warnings are stored for review but do not block export.

**Files likely affected:**

```text
src/evidence/evidence-guard.service.ts
src/pipeline/prompt2/**
src/evidence/**
```

**Acceptance criteria:**

- Guard flags unsupported claims such as commercial AI/RAG, commercial NestJS, commercial JobFlow/NestJS/OpenAI production experience, Docker production ownership, Kubernetes production experience, AWS without evidence.
- Guard distinguishes `critical`, `warning` and `needs_evidence` severities.
- Critical unsupported claims set export readiness to blocked until the claim is removed, safely rephrased or manually overridden with an audit note.
- Medium warnings do not block export by default.
- Guard outputs warning severity and safe wording suggestion.
- Prompt 2 output stores guard warnings in JSON.
- Guard must not invent evidence; missing support remains `needs evidence`.

**Test requirement:**

- Unit tests for known risky claims.

**Done definition:**

- CV draft includes explicit overclaiming warnings or safe alternatives.

### TASK-034 — Add CV draft review endpoint

**Context:** User must review generated CV draft before export.

**Files likely affected:**

```text
src/cv-drafts/**
src/review-gates/**
src/workspaces/**
```

**Acceptance criteria:**

- User can approve CV draft for export.
- User can mark as not worth applying, which triggers skip/update skip reason flow.
- User can pause after CV draft.

**Test requirement:**

- Service test for approve, pause and mark-not-worth-applying transitions.

**Done definition:**

- CV draft review gate is enforced before PDF export.

## 9. Phase 6 — PDF Export by Default: First Usable MVP

### TASK-035A — Write approved CV visual concept and flexible block rules

**Context:** The CV visual concept is decided with the user in planning chat before implementation. This task does not perform open-ended analysis. It converts the already approved chat decision into implementation-ready documentation for the renderer/template tasks.

Current approved MVP direction:

```text
Clean two-column CV layout, not overloaded, application-ready, not a pixel-perfect clone of old PDFs.
```

Approved reference source for the discussion before this task starts:

```text
D:\infa\Documents\jobs for analys\2026
```

CV reference discovery rules:

```text
include:
  **/Denys_Strakhov_*_CV*.pdf
  **/Denis_Strakhov_*_CV*.pdf

exclude:
  *_Cover_Letter.pdf
  *Cover_Letter*
  *Anschreiben*
  *End_to_End*
  *Cover*
  *Letter*
```

The expected output is a concise implementation spec, not a new research task.

**Files likely affected:**

```text
docs/cv-template-design/
  visual-concept.md        — approved clean two-column concept with rationale
  block-rules.md           — required / optional / conditional sections and absent-section behavior
```

**Acceptance criteria:**

- `visual-concept.md` states the approved MVP layout: clean two-column, readable, not overloaded, not pixel-perfect clone.
- `block-rules.md` documents that Prompt 2 / AI decides bullet count, bullet content and selected project inclusion; renderer decides only placement/page breaks.
- `block-rules.md` documents which sections are always present, optional or conditional, including the semi-fixed current-work block.
- Rules cover: contact, headline, summary, skills, commercial experience, selected projects, certifications, languages, education and links.
- Conditional rendering rules are explicit: absent optional sections are hidden/collapsed, not rendered as empty placeholders.
- Commercial experience, current-work block and personal/project exposure are visually distinguishable when they exist.
- The spec is short enough for Claude Code to implement directly in TASK-035B without re-opening product/design questions.

**Test requirement:**

- No code in this task. Manual check that the two design docs exist and are implementation-ready.

**Done definition:**

- `docs/cv-template-design/visual-concept.md` and `docs/cv-template-design/block-rules.md` exist and match the approved chat decision. TASK-035B can start without additional design discovery.

---

### TASK-035B — Define CV JSON schemas and implement flexible HTML template

**Context:** Based on the approved visual concept and block rules from TASK-035A, define the exact `02_targeted_cv_content.json` and `03_pre_pdf_check.json` schemas and implement the HTML template. The template must be as flexible as the AI's previous output — sections render only when content exists, Prompt 3 corrections apply as a layer on top without modifying original artifacts.

**Depends on:** TASK-035A (approved design doc required before starting)

**Files likely affected:**

```text
src/pipeline/schemas/cv-content.schema.ts
src/pipeline/schemas/pre-pdf-check.schema.ts
src/document-export/templates/cv.template.html
docs/03_domain_model.md
```

**Acceptance criteria:**

- `02_targeted_cv_content.json` schema defined and validated: contact info, summary, current-work block, experience sections (commercial vs personal), skills, education, language risks, selected current/personal projects with inclusion flags, all optional sections from TASK-035A block rules.
- `03_pre_pdf_check.json` schema defined: list of correction items referencing specific fields, with suggested replacement text and severity.
- HTML template renders all required sections and conditionally renders optional sections per TASK-035A rules.
- HTML template renders the bullet arrays and selected project blocks exactly as provided by Prompt 2; it does not generate, rewrite or remove bullets except by explicit Prompt 2 rendering hints / priorities.
- Template accepts optional Prompt 3 corrections map and applies field-level overrides before rendering — original JSON artifacts unchanged.
- Template renders correctly with no Prompt 3 corrections present.
- Template renders correctly with Prompt 3 corrections applied.

**Test requirement:**

- Unit test: render with only Prompt 2 content — all required sections present, absent optional sections not rendered.
- Unit test: render with Prompt 2 + Prompt 3 corrections — corrected fields reflect Prompt 3 text.
- Unit test: schema validator rejects malformed `02_targeted_cv_content.json`.
- Unit test: renderer uses Prompt 2 bullet arrays as-is and does not generate or rewrite bullet text.
- Unit test: renderer renders current-work block before Professional Experience when Prompt 2 includes it.
- Unit test: renderer renders selected current/personal projects only when Prompt 2 marks them for inclusion.

**Done definition:**

- Both schemas validated and documented. HTML template renders a flexible, visually consistent CV matching the approved concept from TASK-035A.

---

### TASK-035 — Implement deterministic CV draft to HTML renderer

**Context:** PDF generation should have an HTML intermediate for preview/debugging. This is part of Step 4 deterministic document export and must not call any AI provider. If `03_pre_pdf_check.md/json` exists, the renderer must use those recommendations as mandatory CV-specific context before producing HTML.

**Files likely affected:**

```text
src/document-export/html-renderer.service.ts
src/document-export/templates/**
```

**Acceptance criteria:**

- Converts approved `02_targeted_cv_content.json` into `04_cv_export.html`.
- Uses a clean, readable layout.
- Does not require exact final visual template in MVP.
- Does not call OpenAI, Anthropic or any other AI provider.
- Does not modify CV wording or add new claims during templating.
- Reads existing Prompt 3 recommendations when `03_pre_pdf_check.md/json` exists and reflects the approved/recommended fixes in rendered output.

**Test requirement:**

- Unit test verifies HTML contains expected sections.
- Unit test verifies the AI provider mock is not called.
- Unit test verifies existing Prompt 3 recommendations are loaded when present and ignored when absent.

**Done definition:**

- Approved CV draft can be rendered to HTML artifact.

### TASK-036 — Implement deterministic PDF export by default

**Context:** The first usable MVP requires a physical CV PDF. Step 4 is not an AI prompt; it must render approved structured CV content into HTML/PDF without creating an AiRun or consuming tokens. If Prompt 3 was run, its recommendations are more specific than generic export instructions and must be applied before generating the PDF.

**Files likely affected:**

```text
src/document-export/pdf-export.service.ts
src/document-export/document-export.controller.ts
src/artifacts/**
```

**Acceptance criteria:**

- Default export action reads approved `02_targeted_cv_content.json`.
- Default export action creates `04_cv_export.pdf`.
- Also creates or updates `04_cv_export.html` if needed.
- Registers artifacts in PostgreSQL.
- Workspace status becomes `cv_pdf_generated`.
- Download/export file name can be generated as `Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf`.
- No AI provider is called.
- No `AiRun` is created for Step 4.
- Token usage for this step is zero / not applicable.
- If `03_pre_pdf_check.md/json` exists, export reads it and records that pre-PDF recommendations were used.
- If Prompt 3 artifacts do not exist, export proceeds without requiring them.

**Test requirement:**

- Service test with mocked renderer or lightweight PDF generation check.
- Test verifies PDF file exists and file size is greater than zero.
- Test verifies the AI provider mock is not called.
- Test verifies export uses existing Prompt 3 recommendations when present and does not fail when they are absent.

**Done definition:**

- User can download a physical PDF generated from approved targeted CV content without AI usage in the export step.

### TASK-037 — Add optional Markdown and JSON export endpoints

**Context:** JSON/Markdown are useful but not the default physical CV output.

**Files likely affected:**

```text
src/document-export/**
src/artifacts/**
```

**Acceptance criteria:**

- User can download internal Markdown draft.
- User can download structured JSON export if generated.
- PDF remains default when no format is selected.

**Test requirement:**

- Controller tests for default PDF and explicit markdown/json download.

**Done definition:**

- Output format rules match Product Vision and User Flows.

### TASK-037A — Implement real OpenAI provider

**Context:** FakeAiProvider is used in all tests but a real provider is required to run the actual MVP pipeline. OpenAI is the first real provider for MVP. The AiProvider abstraction remains provider-neutral so Anthropic or other providers can be added later without rewriting pipeline services.

**Files likely affected:**

```text
src/ai/providers/openai.provider.ts  (or anthropic.provider.ts)
src/ai/ai.module.ts
.env
.env.example
```

**Acceptance criteria:**

- OpenAI provider implementation exists.
- Provider is selected via `AI_PROVIDER` env var (`fake` | `openai`).
- `fake` remains the default for tests; OpenAI is used when env var is set to `openai`.
- `.env.example` includes `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT` and `AI_MODEL_DEFAULT`.
- Token usage is extracted from provider response and passed to AiRunsService.
- Unit tests continue to use FakeAiProvider — no real API calls in tests.

**Test requirement:**

- Existing unit tests must still pass with FakeAiProvider.
- Manual smoke test: provider returns a parseable response for Prompt 1.

**Done definition:**

- A real OpenAI call can be made through the AiProvider abstraction using env-configured credentials, while tests still run only with FakeAiProvider.

---

### TASK-037B — Seed real Prompt 1 and Prompt 2 template content

**Context:** Prisma seed currently inserts placeholder prompt templates. Real prompts are required for the AI to produce useful vacancy analysis and CV content. Prompt 2 template content must implement the content-selection contract from `docs/08_ai_pipeline.md`: AI decides bullet count, bullet wording, selected project inclusion and rendering priorities; the renderer only renders approved structured content.

**Files likely affected:**

```text
prisma/seed.ts
prisma/prompts/prompt1.txt  (or inline in seed)
prisma/prompts/prompt2.txt
```

**Acceptance criteria:**

- Prompt 1 template instructs AI to analyze a vacancy and return structured JSON (decision, score, must_have, top_reasons, manual_review_required).
- Prompt 2 template instructs AI to generate targeted CV content from vacancy analysis + knowledge sources.
- Prompt 2 template explicitly instructs AI to decide bullet count and exact bullet wording based on vacancy relevance, evidence and target page count.
- Prompt 2 template explicitly instructs AI to include the semi-fixed current-work block when needed to close the post-EPAM timeline gap.
- Prompt 2 template explicitly instructs AI to include current/personal projects when relevant to the role and safely supported by `Project_Inventory`.
- Prompt 2 template explicitly instructs AI to label current-work and current/personal projects separately from commercial work experience.
- Prompt 2 template requires selected projects to include `include`, `project_type`, `relevance_reason`, `display_priority`, `safe_label`, `bullets` and `tech_stack` fields.
- Prompt 2 template requires experience bullets to include `priority`, `evidence_source` and safe rendering hints.
- Prompt 2 template explicitly states that the renderer must not generate, rewrite or reinterpret CV content.
- Both templates are seeded as active versions.
- Re-running seed does not create duplicate active versions (existing guard in PromptTemplatesService applies).

**Test requirement:**

- Existing unit tests must still pass.
- Add a prompt-template contract test or seed verification that checks the active Prompt 2 template contains the required content-selection instructions: bullet count decision, current-work block handling, personal/current project inclusion, separate project labeling, evidence source requirement, rendering hints/priorities and no renderer rewriting.

**Done definition:**

- Running `npx prisma db seed` produces working Prompt 1 and Prompt 2 templates that produce valid AI output.

---

### TASK-037C — Register and activate knowledge source files

**Context:** Prompt 2 input builder reads active knowledge sources from the DB and includes their content in the AI prompt. Without real files registered, the AI has no CV data to work from. MVP source files should live in a stable repo-level folder, separate from generated workspace artifacts.

Recommended folder:

```text
knowledge-sources/
  candidate-profile/
  evidence/
  cv-rules/
  certifications/
  layout/
  prompts/
```

Required MVP source files:

```text
knowledge-sources/candidate-profile/Master_CV_RU_v0_6_current_work_sync.md
knowledge-sources/candidate-profile/Master_Profile_Summary_RU_v0_6_current_work_sync.md
knowledge-sources/candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md
knowledge-sources/evidence/Project_Inventory_RU_v0_6_current_work_sync.md
knowledge-sources/evidence/Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md
knowledge-sources/evidence/Tech_Stack_Matrix_RU_v2_3_current_work_sync.md
knowledge-sources/cv-rules/CV_Format_Rules_EN_v0_3_current_work_sync.md
knowledge-sources/certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-06.md
knowledge-sources/layout/CV_Layout_Reference_EN_2026-06.pdf
knowledge-sources/prompts/prompt_1_vacancy_analysis.md
knowledge-sources/prompts/prompt_2_targeted_cv_content.md
knowledge-sources/prompts/prompt_3_pre_pdf_check.md
knowledge-sources/prompts/prompt_4_pdf_export_rules.md
knowledge-sources/prompts/prompt_5_final_check.md
knowledge-sources/prompts/prompt_2_1_cover_letter.md
```

**Files likely affected:**

```text
scripts/register-knowledge-sources.ts  (or seed extension)
prisma/seed.ts
knowledge-sources/**
README.md or docs/00_setup.md
```

**Acceptance criteria:**

- All required knowledge source files exist on disk under `knowledge-sources/`.
- Files are registered via KnowledgeSourcesService and marked active.
- Script or seed step can be re-run without creating duplicates.
- Source registration records file path, type, version label, active flag and content hash.
- Prompt-step source selection uses explicit source groups from `docs/08_ai_pipeline.md`; sources are not included randomly or only because they exist on disk.
- `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT` and file paths are documented.

**Test requirement:**

- Manual verification: `GET /knowledge-sources` (or DB query) shows active sources with correct file paths.

**Done definition:**

- `buildPrompt2Input()` assembles a prompt that includes real CV content from knowledge sources.

---

### TASK-037D — Complete .env setup and developer onboarding documentation

**Context:** `.env.example` currently only has PostgreSQL vars. API keys, storage root, and AI provider selection are not documented. A developer must be able to set up the project from scratch.

**Files likely affected:**

```text
.env.example
README.md  (or docs/00_setup.md)
```

**Acceptance criteria:**

- `.env.example` includes all required vars: `DATABASE_URL`, `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT`, `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`.
- Setup steps documented: Docker, migrations, seed, knowledge sources, env vars.
- OpenAI is documented as the first real provider for MVP; Anthropic is later/fallback, not required for MVP.
- `.env` is in `.gitignore` (already is — verify).

**Test requirement:**

- Manual: fresh checkout → follow docs → `npm run start:dev` → first workspace created successfully.

**Done definition:**

- Another developer can set up and run the project without asking the author.

---

### TASK-038 — Create mechanical MVP smoke test with fake provider

**Context:** This test proves the workflow mechanics from vacancy to PDF without external API calls or AI cost. It is required, but it is not sufficient to accept the practical MVP.

**Files likely affected:**

```text
test/mvp-flow.e2e-spec.ts
src/**
```

**Acceptance criteria:**

- Test creates workspace.
- Runs fake Prompt 1 analysis.
- Approves apply.
- Runs fake Prompt 2 CV generation.
- Runs fake/deterministic anti-overclaiming guard and verifies no critical unsupported claims block export.
- Approves CV draft.
- Exports PDF.
- Verifies artifacts exist in DB and filesystem.

**Test requirement:**

- This task itself is the E2E test.

**Done definition:**

- One automated or semi-automated fake-provider test proves the core MVP mechanics.

### TASK-038A — Run practical MVP real-provider smoke test

**Context:** First usable MVP means a real OpenAI-backed run on a real vacancy that produces a real generated CV PDF. This task is manual or semi-automated because it uses a real provider and a real vacancy.

**Files likely affected:**

```text
project-management/MVP_ACCEPTANCE.md
project-management/TEST_LOG.md
```

**Acceptance criteria:**

- Real workspace is created from a real vacancy.
- Real OpenAI Prompt 1 runs and creates `01_vacancy_analysis.md/json`.
- User approves `apply` or `maybe`, or explicitly overrides if needed.
- Real OpenAI Prompt 2 runs and creates `02_targeted_cv_content.md/json`.
- Anti-overclaiming guard runs; critical unsupported claims are absent, fixed or manually overridden with note.
- User approves CV draft.
- Deterministic export creates `04_cv_export.html` and `04_cv_export.pdf` without creating an AiRun.
- PDF file opens, has non-zero size and is downloadable.
- PostgreSQL contains GeneratedArtifact records for all expected files.
- `project-management/MVP_ACCEPTANCE.md` records provider/model, test vacancy, workspace path, generated artifacts, known issues and MVP status.

**Test requirement:**

- Manual real-provider smoke test documented in `project-management/TEST_LOG.md`.
- No real API call is executed from unit tests or CI.

**Done definition:**

- A real vacancy has produced a real generated CV PDF through the OpenAI-backed MVP flow, and the acceptance note is saved.

## 10. Phase 7 — Workspace Status, Review Gates & Artifact Access

### TASK-039 — Implement workspace status transition service

**Context:** Status changes must be controlled and predictable.

**Files likely affected:**

```text
src/workspaces/workspace-status.service.ts
src/workspaces/**
```

**Acceptance criteria:**

- Valid transitions are enforced.
- Invalid transitions return explicit error.
- Skip and manual override rules are enforced.

**Test requirement:**

- Unit tests for valid/invalid transitions.

**Done definition:**

- Workspace lifecycle is protected from inconsistent state.

### TASK-040 — Add workspace artifact summary API

**Context:** User must see what exists for a workspace.

**Files likely affected:**

```text
src/workspaces/workspaces.controller.ts
src/artifacts/**
```

**Acceptance criteria:**

- Detail response shows current status, decision, score if available, and artifact list.
- Response distinguishes canonical internal names and download names.

**Test requirement:**

- Controller test for workspace with vacancy, analysis and PDF artifacts.

**Done definition:**

- Workspace detail gives enough information to resume work.

### TASK-041 — Implement artifact latest-version marking

**Context:** Re-runs may create multiple versions later.

**Files likely affected:**

```text
src/artifacts/**
prisma/schema.prisma
```

**Acceptance criteria:**

- Artifact has `isLatest` flag.
- Registering a new artifact of same type can mark previous latest as false.
- Existing artifact history is preserved.

**Test requirement:**

- Service test for version replacement behavior.

**Done definition:**

- Artifact registry supports reproducibility and regeneration.

## 11. Phase 8 — P1 Safety & Quality Layer

### TASK-042 — Implement Prompt 3 pre-PDF check

**Context:** Prompt 3 is P1 optional, not MVP blocker, but improves safety.

**Files likely affected:**

```text
src/pipeline/prompt3/**
src/pipeline/schemas/prompt3.schema.ts
src/artifacts/**
```

**Acceptance criteria:**

- Runs only when CV draft exists.
- Saves `03_pre_pdf_check.md/json`.
- Produces readiness value: ready, ready_with_minor_edits or not_ready.
- Produces recommendations in a form that Step 4 can read and apply before export.
- Can block export only if user chooses strict mode later; default MVP flow should not depend on it.

**Test requirement:**

- Service test using fake AI output.

**Done definition:**

- User can run an optional pre-PDF safety check.
- Once run, its recommendations become required context for the next export step.

### TASK-043 — Implement Prompt 5 final check

**Context:** Final check is optional after PDF exists.

**Files likely affected:**

```text
src/pipeline/prompt5/**
src/artifacts/**
```

**Acceptance criteria:**

- Runs only when CV artifact exists.
- Saves `05_final_check.md/json`.
- Output includes ready_to_send, needs_edit or do_not_send.

**Test requirement:**

- Service test for Prompt 5 with fake final check output.

**Done definition:**

- User can optionally review final output before sending.

### TASK-044 — Add safer wording suggestion service

**Context:** Evidence guard should suggest safe replacement wording.

**Files likely affected:**

```text
src/evidence/safe-wording.service.ts
src/evidence/**
```

**Acceptance criteria:**

- Risky claim produces suggested safe wording.
- Suggestions distinguish commercial, personal project and basic exposure.

**Test requirement:**

- Unit tests for AI/RAG, NestJS, Docker, Kubernetes, AWS examples.

**Done definition:**

- Guard output is actionable, not only warning-based.

## 12. Phase 9 — Basic Existing Folder Import

### TASK-045 — Implement existing folder scanner

**Context:** Import current folders like Action1, Amach, AppsFlyer and Broadvoice.

**Files likely affected:**

```text
src/import/import.service.ts
src/import/import.controller.ts
src/import/import.module.ts
```

**Acceptance criteria:**

- Scanner reads `Company/YYYY.MM.DD/` style folders.
- Detects vacancy `.txt`, legacy targeted CV markdown, CV PDF, cover letter PDF and SKIP files.
- Does not import automatically without preview confirmation.

**Test requirement:**

- Unit test with fixture folder structure for Action1, Amach, AppsFlyer and Broadvoice.

**Done definition:**

- Existing manual application folders can be detected.

### TASK-046 — Implement import preview and manual metadata correction

**Context:** Import inference can be uncertain and must be reviewed.

**Files likely affected:**

```text
src/import/**
src/workspaces/**
```

**Acceptance criteria:**

- Preview shows detected company, role, date, artifacts and status.
- User can edit company and role before creating workspace records.
- Duplicates are detected by path/hash.

**Test requirement:**

- Service test for uncertain metadata and user correction.

**Done definition:**

- Import is safe and human-reviewed.

### TASK-047 — Implement import confirmation and artifact registration

**Context:** Confirmed import should create ApplicationWorkspace and GeneratedArtifact records.

**Files likely affected:**

```text
src/import/**
src/artifacts/**
src/workspaces/**
```

**Acceptance criteria:**

- Confirmed import creates database records without changing original files unless configured.
- Legacy artifact names are preserved as imported artifact metadata.
- Optional canonical copy to `00_vacancy_source.txt` is supported if configured.

**Test requirement:**

- Integration test with fixture files.

**Done definition:**

- Action1, Amach, AppsFlyer and Broadvoice-style folders can be represented in the app.

## 13. Phase 10 — Cover Letter & Recruiter Message

### TASK-048 — Create CoverLetterDraft model/service

**Context:** Cover letter is Phase 2, not first MVP.

**Files likely affected:**

```text
prisma/schema.prisma
src/cover-letters/**
```

**Acceptance criteria:**

- CoverLetterDraft links to workspace and prompt run.
- Stores status, markdown artifact and PDF artifact optional.
- Cannot be generated for skipped workspace unless manually overridden.

**Test requirement:**

- Service test for create cover letter draft after CV exists.

**Done definition:**

- Cover letter workflow has database support.

### TASK-049 — Implement cover letter generation step

**Context:** Generate targeted cover letter or recruiter message after CV draft/PDF exists.

**Files likely affected:**

```text
src/pipeline/cover-letter/**
src/document-export/**
```

**Acceptance criteria:**

- Saves `cover_letter.md`.
- Optionally exports `cover_letter.pdf`.
- Uses vacancy, analysis, targeted CV content and source profile.

**Test requirement:**

- Service test with fake AI provider.

**Done definition:**

- User can generate a cover letter package after CV generation.

## 14. Phase 11 — Application Tracking & Rejection Analysis

### TASK-050 — Add application status tracking fields/endpoints

**Context:** User should track applied/rejected/interview statuses later.

**Files likely affected:**

```text
prisma/schema.prisma
src/application-tracking/**
src/workspaces/**
```

**Acceptance criteria:**

- Workspace can be marked applied, rejected, archived or ready_to_apply.
- Applied date, channel and notes are stored.
- Submitted artifact IDs can be stored.

**Test requirement:**

- Service tests for status updates.

**Done definition:**

- Job application lifecycle can be tracked beyond CV generation.

### TASK-051 — Implement rejection text artifact and analysis placeholder

**Context:** Rejection analysis is later but should fit artifact model.

**Files likely affected:**

```text
src/rejections/**
src/artifacts/**
```

**Acceptance criteria:**

- User can save rejection text as artifact.
- Optional later AI analysis can be linked to PromptRun/AiRun.
- No automatic source rule updates happen without user approval.

**Test requirement:**

- Service test for saving rejection artifact.

**Done definition:**

- Rejections can be stored for future learning analysis.

## 15. Phase 12 — Redis/BullMQ Async Processing

### TASK-052 — Add Redis to Docker Compose for later phase

**Context:** Queues are later, not first usable MVP.

**Files likely affected:**

```text
docker-compose.yml
.env.example
src/queue/**
```

**Acceptance criteria:**

- Redis service can be started locally.
- Redis is not required for MVP synchronous flow.
- Config uses `REDIS_URL`.

**Test requirement:**

- Manual check that Redis container starts.

**Done definition:**

- Project is ready for BullMQ integration without breaking MVP.

### TASK-053 — Implement BullMQ queue abstraction

**Context:** Later pipeline steps should run in background jobs.

**Files likely affected:**

```text
src/queue/**
src/pipeline/**
```

**Acceptance criteria:**

- Queue abstraction supports enqueue, status, retry and cancel.
- Supports analysis, CV generation, export and final check queues.
- Existing synchronous services remain reusable by workers.

**Test requirement:**

- Unit tests with mocked queue.

**Done definition:**

- Queue layer can run pipeline jobs without changing business logic.

### TASK-054 — Implement queued Prompt 1 analysis worker

**Context:** First queue-backed workflow should be Prompt 1.

**Files likely affected:**

```text
src/queue/workers/analysis.worker.ts
src/pipeline/prompt1/**
```

**Acceptance criteria:**

- User starts background analysis job.
- Job creates/updates PromptRun, AiRun and artifacts.
- Completion opens the same human review gate.

**Test requirement:**

- Integration test or worker test with fake AI provider.

**Done definition:**

- Queues automate execution, not decision-making.

## 16. Phase 13 — Frontend Dashboard

### TASK-055 — Bootstrap Next.js dashboard

**Context:** Frontend is later; backend-first remains primary.

**Files likely affected:**

```text
apps/web/**
package.json
```

**Acceptance criteria:**

- Next.js app starts locally.
- It can call backend health endpoint.
- No complex auth required.

**Test requirement:**

- Basic render test or manual smoke test.

**Done definition:**

- Dashboard foundation exists without changing backend contracts.

### TASK-056 — Implement workspace creation UI

**Context:** UI should support separate company, role and vacancy text fields.

**Files likely affected:**

```text
apps/web/app/workspaces/new/**
apps/web/lib/api.ts
```

**Acceptance criteria:**

- User enters company name, role title and multi-line vacancy text separately.
- UI shows generated slug/file preview.
- Submit calls backend `POST /workspaces`.

**Test requirement:**

- Component or manual UI test for validation and submission.

**Done definition:**

- User can create workspace from dashboard.

### TASK-057 — Implement workspace review screens

**Context:** Human review gates should be visible in UI.

**Files likely affected:**

```text
apps/web/app/workspaces/[id]/**
apps/web/components/**
```

**Acceptance criteria:**

- Workspace detail shows status, decision, artifacts and next action.
- Analysis screen supports approve/maybe/skip/override actions.
- CV draft screen supports approve/pause/regenerate placeholder actions.

**Test requirement:**

- Manual or component test for decision gate UI.

**Done definition:**

- Dashboard supports human-in-the-loop workflow.

## 17. Phase 14 — Tests, CI/CD & Portfolio Polish

### TASK-058 — Add GitHub Actions CI

**Context:** Portfolio-ready project should show automated quality checks.

**Files likely affected:**

```text
.github/workflows/ci.yml
package.json
```

**Acceptance criteria:**

- CI installs dependencies.
- CI runs lint/typecheck/tests.
- CI can start PostgreSQL service or use Docker for integration tests.

**Test requirement:**

- CI itself must pass on push/PR.

**Done definition:**

- Repository demonstrates basic CI/CD practice.

### TASK-059 — Add integration tests for database persistence assumptions

**Context:** PostgreSQL persistence is important for local development reliability.

**Files likely affected:**

```text
test/postgres-persistence.e2e-spec.ts
scripts/check-postgres-persistence.*
README.md
```

**Acceptance criteria:**

- A documented/manual or automated test verifies data remains after normal container restart.
- Test does not run destructive `docker compose down -v`.
- README explains what is and is not protected.

**Test requirement:**

- Run persistence check locally at least once.

**Done definition:**

- PostgreSQL persistence behavior is verified and documented.

### TASK-060 — Add README portfolio documentation

**Context:** The project should be understandable for recruiters/hiring managers without overclaiming.

**Files likely affected:**

```text
README.md
docs/**
```

**Acceptance criteria:**

- README explains backend-first architecture.
- README shows MVP flow: vacancy -> analysis -> review -> CV draft -> PDF.
- README explains AI usage tracking, artifact storage and PostgreSQL metadata.
- README clearly marks the project as a personal project, not commercial production AI experience.

**Test requirement:**

- Manual review against CV safety rules.

**Done definition:**

- Repository is portfolio-readable and honest.

### TASK-061 — Add architecture diagram or Mermaid flow

**Context:** Visual architecture helps portfolio presentation.

**Files likely affected:**

```text
README.md
docs/04_architecture.md
docs/assets/**
```

**Acceptance criteria:**

- Diagram shows NestJS API, PostgreSQL, filesystem artifacts, AI Provider, Prompt Pipeline, Document Export and later Redis/Next.js.
- Diagram does not imply cloud production deployment if not implemented.

**Test requirement:**

- Manual rendering check if Mermaid is used.

**Done definition:**

- Architecture can be explained quickly in GitHub or interview context.

## 18. Backlog Dependency Summary

Recommended implementation order:

```text
TASK-001 -> TASK-006 -> TASK-006A -> TASK-006B
TASK-007 -> TASK-013
TASK-014 -> TASK-017 -> TASK-019
TASK-020 -> TASK-027
TASK-018
TASK-028 -> TASK-030
TASK-031 -> TASK-034
TASK-035A -> TASK-035B -> TASK-035 -> TASK-036 -> TASK-037
TASK-037A -> TASK-037B -> TASK-037C -> TASK-037D
TASK-038 -> TASK-038A
TASK-039 -> TASK-041
TASK-042+ as P1/later
```

First usable MVP ends when these tasks are done:

```text
TASK-001 through TASK-038A, including TASK-006A, TASK-006B and TASK-018
```

`TASK-038` proves the mechanical fake-provider flow. `TASK-038A` proves the practical MVP flow with OpenAI and a generated PDF. TASK-037A-D are required before TASK-038A because the practical MVP needs a real provider, real prompt content, registered knowledge sources and complete environment setup.

`TASK-006A` and `TASK-006B` are P0 quality-gate tasks. They should be completed before the project is treated as a reliable first usable MVP, even if the first UI/API flow can technically run earlier.

With one practical caveat: `TASK-042` Prompt 3 and `TASK-043` Prompt 5 are useful safety tasks, but they are not blockers for the first usable MVP according to the current project scope.

## 19. MVP Physical Result

After the MVP task set, a real workspace should contain:

```text
storage/applications/<date>_<company_slug>_<role_slug>/
  00_vacancy_source.txt
  01_vacancy_analysis.md
  01_vacancy_analysis.json
  02_targeted_cv_content.md
  02_targeted_cv_content.json
  04_cv_export.html
  04_cv_export.pdf
```

For skipped vacancies:

```text
storage/applications/<date>_<company_slug>_<role_slug>/
  00_vacancy_source.txt
  01_vacancy_analysis.md
  01_vacancy_analysis.json
  01_skip_reason.md
  01_skip_reason.json
```

PostgreSQL should contain:

```text
Company
JobVacancy
ApplicationWorkspace
GeneratedArtifact
KnowledgeSource
EvidenceItem
PromptTemplate
PromptRun
AiRun
CvDraft
```

The PostgreSQL data must still exist after normal local Docker shutdown and restart when the named volume is preserved.
