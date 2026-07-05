# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@project-management/CURRENT_TASK.md
@project-management/DECISIONS.md

## Project Purpose

JobFlow CV Pipeline is a backend-first application for AI-assisted vacancy analysis, evidence-based targeted CV generation and physical CV PDF export for real job applications.

The project is also a portfolio-quality backend project for Node.js/TypeScript/NestJS/PostgreSQL/Prisma/Docker/AI workflow experience.

## Read First

Before implementation, read:

- `project-management/CURRENT_TASK.md`
- The doc sections or line ranges listed in `## Docs to Read` inside `CURRENT_TASK.md` — read those targeted sections first, not whole files.

## Claude Code Configuration

`.claude/settings.json` is committed to the repo and contains project-wide hooks:

- **PostToolUse `Write|Edit`** — runs `npm run lint -- --fix` automatically after every file write or edit, so ESLint/Prettier formatting is applied without a manual step.

## Commands

```bash
# Install dependencies
npm install

# Start development server (NestJS watch mode)
npm run start:dev

# Build
npm run build

# Run all unit tests
npm run test

# Run a single test file
npm run test -- --testPathPattern=slug.service

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Prisma: apply migrations (never use reset in normal startup)
npx prisma migrate dev

# Prisma: generate client after schema changes
npx prisma generate

# Prisma: seed database
npx prisma db seed

# Docker: start PostgreSQL only
docker compose up -d postgres

# Docker: stop containers WITHOUT deleting data
docker compose down

# DESTRUCTIVE — deletes all PostgreSQL data:
# docker compose down -v
```

## High-Level Architecture

This is a NestJS monolith with a clear module boundary per pipeline stage. The backend does all the work; no frontend exists in MVP.

### Module Map

```
src/
  app.module.ts              root module
  main.ts                    bootstrap

  common/
    slug/                    SlugService — deterministic company and role slug normalization
                             Unicode Cyrillic (\p{Script=Cyrillic}) + English + underscore
                             Company slug allows numbers; role slug does not.

  workspaces/                ApplicationWorkspace CRUD, status transitions, review gates
  company/                   Company records (linked 1-N to workspaces)
  vacancy/                   JobVacancy records (linked 1-1 to workspace)

  artifacts/                 ArtifactStorageService — read/write/register physical files
                             HashService — stable content hashing
                             GeneratedArtifact registry in PostgreSQL
                             Path safety: never write outside storage root

  knowledge-sources/         KnowledgeSource registry — source files used as prompt context
  evidence/                  EvidenceItem rules + EvidenceGuardService (anti-overclaiming)

  prompt-templates/          PromptTemplate versioning — never silently overwrite versions
  ai/                        AiProvider interface + provider implementations
                             OpenAI is the first real MVP provider; Anthropic is future/fallback
                             AiUsageTrackingService — token counts stored on AiRun

  pipeline/
    prompt1/                 Vacancy analysis (Prompt 1) — pauses for human review after
    prompt2/                 Targeted CV generation (Prompt 2) — blocked until approval
    prompt3/                 Pre-PDF check (P1 optional)
    prompt5/                 Final check (P1 optional)
    skip/                    SkipReasonService — creates 01_skip_reason.md/json, stops pipeline
    prompt-input-builder     Combines vacancy source + template + knowledge sources

  review-gates/              DecisionGateService — enforces apply/maybe/skip/override logic
  document-export/           HtmlRendererService + PdfExportService (deterministic, no AI call)

  prisma/                    PrismaModule, PrismaService

  import/                    Existing-folder scanner (P1 optional)
  queue/                     BullMQ abstraction (Phase 2)
```

### Data Flow (MVP)

```
POST /workspaces
  -> SlugService (slugs)
  -> WorkspaceService (DB: Company, JobVacancy, ApplicationWorkspace)
  -> ArtifactStorageService (fs: storage/applications/<date>_<co>_<role>/00_vacancy_source.txt)
  -> GeneratedArtifact record
  <- status: source_saved

POST /workspaces/:id/run-analysis
  -> PromptPipelineService: builds input, calls AiProvider
  -> ArtifactStorageService: 01_vacancy_analysis.md/json
  -> PromptRun + AiRun records (with token usage)
  <- status: paused_after_analysis  [human must review]

POST /workspaces/:id/decision  (apply | maybe | skip)
  skip -> SkipReasonService: 01_skip_reason.md/json, status: skipped, pipeline stops
  apply/maybe -> ReviewGateService records approval, status allows Prompt 2

POST /workspaces/:id/generate-cv-content
  -> Prompt2Service (only after approval)
  -> EvidenceGuardService (anti-overclaiming check)
  -> 02_targeted_cv_content.md/json
  <- status: paused_after_cv_draft  [human must review]

POST /workspaces/:id/export-cv
  -> DocumentExportService reads 02_targeted_cv_content.json
  -> reads 03_pre_pdf_check.json if exists (Prompt 3 recommendations become mandatory context)
  -> HtmlRenderer -> 04_cv_export.html
  -> PdfExportService -> 04_cv_export.pdf
  -> NO AiRun created, NO tokens consumed
  <- status: cv_pdf_generated
```

### Key Invariants

- `PromptRun` links to `PromptTemplate` version and `AiRun`. `GeneratedArtifact` links to `PromptRun` or has `origin = generated_by_export_service`.
- Step 4 (export) is **not** an AI prompt. Never create an `AiRun` for it.
- Prompt 2 is **blocked** until apply/maybe is explicitly approved or a skip override is logged.
- Manual overrides must be written to the database (audit trail).
- Filesystem root is configurable via `STORAGE_ROOT` env var; code must never write outside it.
- Slug regex must use `\p{Script=Cyrillic}` (Unicode flag), not a character list.

### PostgreSQL Models (MVP)

`Company` → `JobVacancy` → `ApplicationWorkspace` → `PromptRun` → `AiRun`  
`ApplicationWorkspace` → `GeneratedArtifact` (many)  
`KnowledgeSource` → `EvidenceItem` (many)  
`PromptTemplate` → `PromptRun` (one active version per type at a time)

### Workspace Status Sequence (MVP required)

```
source_saved -> analysis_running -> paused_after_analysis
  -> skipped  (skip path, pipeline stops)
  -> cv_generation_running -> paused_after_cv_draft -> export_running -> cv_pdf_generated
  -> failed  (any step)
```

## Insufficient Context Rule

The line ranges in `## Docs to Read` are a starting point, not a ceiling.

If the listed sections are not enough to safely implement `## State Machine` or satisfy
`## Acceptance Criteria` — Claude Code must either:
- read more lines from the same document, or
- stop and explicitly ask what is missing.

Never guess or derive logic from incomplete context. This rule overrides any "read only X" instruction.

## CURRENT_TASK.md Authoring Rules

When writing a new CURRENT_TASK.md, always include:

- `## Docs to Read` — list only the specific sections needed. Use exact line ranges when they are stable and available; otherwise use precise section names.
  Example: `docs/03_domain_model.md lines 698–709 (section 8.6 — state transitions)` or `docs/08_ai_pipeline.md section 6.8 — Prompt-Step Source Selection`.
  Do not list a whole file unless the whole file is genuinely needed.
  For tasks that write a new service, also list every service the new service will call,
  with the specific method signatures to read:
  Example:
  - `src/prompt-runs/prompt-runs.service.ts` — `create()` DTO shape
  - `src/ai-runs/ai-runs.service.ts` — `saveFailed()` / `saveSuccess()` parameter shape

- `## State Machine` — required for any task with status or enum transitions. Use a table:

  | Action | Precondition | Field A after | Field B after | Status after |
  |---|---|---|---|---|

  When this table is present, Claude Code must not derive transitions from docs — use the table directly.
  If anything in the table seems inconsistent with a referenced doc, stop and ask — do not silently correct it.

- `## Key Invariants` — list any non-obvious rules that affect this task's implementation.
  Example: `canProceedToPrompt2 checks status, not reviewState — see ADR-015`

- `## Git Instructions` — always use this commit/PR order:
  1. `git add <files>`
  2. `git commit -m "feat: TASK-XXX ..."`
  3. `git push -u origin <branch-name>`
  4. `gh pr create --title "..." --body "..." --base main`
  5. Stops completely. Does not do anything else.
  Never call `gh pr create` before `git push` — it will always fail.

## Operating Rules

- Work on one task at a time.
- Do not choose the next task automatically.
- Before multi-file edits, propose a plan and list expected files to change.
- Do not silently change product scope.
- If a task cannot be completed safely, mark/suggest `BLOCKED` instead of inventing a workaround.
- Update project-management files only when the current task requires it.
- Keep changes reviewable and small.

## Architecture Rules

- Backend-first MVP.
- Use TypeScript, NestJS, PostgreSQL, Prisma and Docker Compose.
- PostgreSQL stores metadata and workflow state.
- Filesystem stores physical artifacts.
- Do not store generated PDFs or large text artifacts only in PostgreSQL.
- Use stable canonical internal artifact names.
- Use human-readable download names separately when needed.

## PostgreSQL / Docker Rules

- PostgreSQL must use a named Docker volume: `postgres_data`.
- Data must survive container restart, Docker Desktop restart and `docker compose down`.
- `docker compose down -v` is destructive and must be documented as deleting local data.
- Add or update persistence checks when changing Docker/PostgreSQL setup.

## Artifact Rules

Canonical internal files:

- `00_vacancy_source.txt`
- `01_vacancy_analysis.md/json`
- `01_skip_reason.md/json`
- `02_targeted_cv_content.md/json`
- `03_pre_pdf_check.md/json` optional/P1
- `04_cv_export.html/pdf/json/md`
- `05_final_check.md/json` optional/P1
- `cover_letter.md/pdf` Phase 2

New workspaces use underscore-based slugs. Role slugs allow English letters, Unicode Cyrillic letters and underscores. Company slugs may also preserve numbers.

## Prompt Pipeline Rules

- Prompt 1 produces vacancy analysis and `apply` / `maybe` / `skip` recommendation.
- After Prompt 1, always pause for human review.
- `apply` and `maybe` continue only after user approval.
- `skip` creates `01_skip_reason.md/json` and stops the pipeline by default.
- Prompt 2 runs only after approval or manual override.
- PDF export is the default physical CV output.
- Prompt 3 and Prompt 5 are optional/P1, not first MVP blockers.
- If Prompt 3 artifacts exist, Step 4 document export must read and apply their recommendations; if they do not exist, export must not require them.
- Cover letter generation is Phase 2.

## AI Provider Rules

- Use an AI provider abstraction.
- Do not couple application logic directly to provider SDKs.
- Store AI run metadata and token usage when provider returns it.
- Unit tests must use mocks/fakes, not real AI calls.
- AI output must be validated before being trusted.

## Anti-Overclaiming Rules

The generated CV must not invent experience.

Always preserve these safety rules:

- Mark unsupported claims as `needs evidence`.
- Separate commercial experience from personal/project experience.
- Do not present personal AI/FastAPI/OpenAI/MCP/Claude Code work as commercial production experience.
- Do not present Docker/NestJS/Kubernetes/AWS as commercial core skills unless evidence is added later.
- Keep German language risk and English communication risk explicit when relevant.

## Module Rules

- **Root module imports only top-level feature modules.** `AppModule` should import only the shared infrastructure module (e.g. `PrismaModule`) and the feature modules whose controllers it registers. If `AppModule` has no provider that injects from a given module, that import does not belong in `AppModule` — add it to the feature module that actually needs it.
- **Each module imports its own dependencies directly.** NestJS module exports are not transitive — only providers explicitly listed in `exports: []` are visible to the importing module. Never rely on a parent or sibling module to supply a dependency indirectly.
- **Exports must be intentional.** Only add a provider to `exports: []` if another module is expected to inject it. Do not export everything by default.
- **No orphaned `*.module.ts` files.** A module file that nothing imports (and that is not `AppModule`) is dead code and a double-registration risk. Delete it or wire it up.
- **`@Global()` modules need only one import site.** If a module is decorated `@Global()`, its providers are available everywhere once registered. Repeating the import in other modules is harmless self-documentation but adds no DI value. Do not add or remove such imports as part of unrelated tasks.
- **Split a module only when the split reduces real complexity.** If candidate sub-modules would share most of the same imports, the split adds duplication without benefit. A concrete reason to split: a new service has zero shared dependencies with the rest, or test isolation is blocked. See ADR-017.

## Testing Rules

- Unit tests are required for deterministic MVP logic.
- Run `npm run test` after code changes when tests exist.
- Core P0 tests must cover slug normalization, workspace validation, canonical artifact naming, skip handling, approval gates and anti-overclaiming guard.
- Do not make unit tests depend on real AI providers.
- Use temporary directories or mocks for filesystem tests.
- Record important manual checks in `project-management/TEST_LOG.md`.

## Documentation Rules

- Keep docs consistent with product scope.
- Do not move P1/P2 features into MVP unless explicitly requested.
- If existing docs need changes beyond the current task, propose them first and wait for approval.
- Update `project-management/CHANGELOG.md` after meaningful completed work.

## Git / Review Rules

- Keep commits task-focused.
- Do not mix unrelated tasks in one change.
- Summarize changed files and verification steps after implementation.
- Never commit secrets, API keys, `.env`, generated local databases, or private local paths that should remain machine-specific.
