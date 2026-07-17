# Architecture Decisions

This file records decisions that should not be rediscovered or re-debated during implementation.

## ADR-001 — Backend-first MVP

Status: `Accepted`

Decision:
The first usable MVP is backend-first with NestJS, PostgreSQL, Prisma and filesystem artifacts.

Reason:
Keeps the project aligned with Backend Developer / Software Engineer portfolio value.

## ADR-002 — PostgreSQL metadata + filesystem artifacts

Status: `Accepted`

Decision:
PostgreSQL stores metadata/state. Filesystem stores physical artifacts such as vacancy text, Markdown, JSON, HTML and PDF.

Reason:
Keeps generated files usable outside the app while preserving structured state.

## ADR-003 — PDF is default CV export

Status: `Accepted`

Decision:
The default physical CV export format is PDF. HTML/JSON/Markdown are optional.

Reason:
PDF is the practical format used for real applications.

## ADR-004 — Prompt 1 requires human review gate

Status: `Accepted`

Decision:
After Prompt 1, the system always pauses for Apply/Maybe/Skip review.

Reason:
Prevents wasting time and prevents unsafe automation.

## ADR-005 — Skip stops pipeline by default

Status: `Accepted`

Decision:
A skip decision creates `01_skip_reason.md/json` and stops CV generation unless manually overridden.

Reason:
Skipped vacancies still become useful evidence without generating unnecessary CVs.

## ADR-006 — Canonical internal artifact names

Status: `Accepted`

Decision:
Internal files use stable step-based names such as `00_vacancy_source.txt`, `02_targeted_cv_content.md`, `04_cv_export.pdf`. Download names may include company and role slugs.

Reason:
Simplifies backend logic and tests while preserving human-readable exports.

## ADR-007 — PostgreSQL Docker volume must persist data

Status: `Accepted`

Decision:
Local PostgreSQL must use a named Docker volume and must survive container restart, Docker Desktop restart and `docker compose down`. `docker compose down -v` is destructive.

Reason:
Prevents local data loss during development.

## ADR-008 — Unit tests required for deterministic MVP logic

Status: `Accepted`

Decision:
P0 deterministic business logic must have unit tests: slug normalization, workspace validation, artifact naming, skip handling, approval gates and anti-overclaiming guard.

Reason:
Keeps the MVP reliable before adding real AI and queues.

## ADR-009 — Prompt 3 and Prompt 5 are optional quality steps

Status: `Accepted`

Decision:
Pre-PDF check and final check are P1/MVP optional, not first usable MVP blockers.

Reason:
Allows reaching physical PDF output faster while preserving safety roadmap.

## ADR-010 — Cover letter is Phase 2

Status: `Accepted`

Decision:
Cover letter/recruiter message generation is part of product vision but not required for first usable MVP.

Reason:
Keeps MVP focused on targeted CV PDF and skip handling.

## ADR-011 — Import existing folders is P1 optional

Status: `Accepted`

Decision:
Manual workspace creation is the primary MVP path. Basic import is P1 optional; robust import is later.

Reason:
Avoids blocking the MVP on legacy folder edge cases.

## ADR-012 — Step 4 is deterministic document export

Status: `Accepted`

Decision:
Step 4 document export is not an AI prompt. It must not use PromptTemplate and must not create an AiRun. It reads approved `02_targeted_cv_content.json` and existing `03_pre_pdf_check.md/json` when present.

Reason:
Keeps PDF generation deterministic and separates document rendering from AI-assisted steps.

## ADR-013 — Unicode Cyrillic slug support

Status: `Accepted`

Decision:
Slug normalization must support Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters.

Reason:
Real folder/company names include Cyrillic/Ukrainian characters.

## ADR-014 — Git branching strategy

Status: `Accepted`

Decision:
- `main` — стабильная ветка, только завершённые задачи (статус DONE).
- `task/TASK-XXX-short-description` — отдельная ветка на каждую задачу.
- Merge в main только после того как acceptance criteria выполнены и тесты прошли.
- Прямые коммиты в main запрещены кроме первоначального бутстрапа.

Reason:
Позволяет откатиться к рабочему состоянию если Claude Code сделал что-то лишнее.
Чистая история коммитов важна для портфолио.

**Process note (added 2026-07-16, TASK-052):** during TASK-052 implementation, edits were made
directly on the leftover `task/TASK-051-...` branch instead of a fresh branch off updated `main`,
discovered only at commit time. Root cause: no explicit checkpoint verifying the current branch
before the first file edit. Fixed by adding a "Branch-first protocol" rule to `CLAUDE.md` Operating
Rules — verify/create the correct `task/TASK-XXX-...` branch off up-to-date `main` immediately after
plan approval, before any `Write`/`Edit` call.

## ADR-015 — canProceedToPrompt2 checks status, not reviewState

Status: `Accepted`

Decision:
The gate that allows Prompt 2 to run checks `workspace.status === cv_generation_running`,
not `workspace.reviewState === approved`.

Reason:
`reviewState = approved` is set by ReviewGatesService but `status = cv_generation_running`
is the canonical pipeline signal consumed by all other services. Checking status keeps
the gate consistent with the state machine in docs/03_domain_model.md §8.6.
Source: derived and confirmed during TASK-028 implementation.

## ADR-017 — NestJS module boundary rules

Status: `Accepted`

Decision:

**1. Root module (AppModule) imports only top-level feature modules.**
AppModule should contain only: the shared infrastructure module that needs global registration (e.g. `PrismaModule`) and the feature modules whose HTTP controllers it registers. Any module that AppModule's own providers do not inject should be moved to the feature module that actually needs it.

*Example*: in TASK-035C, `AppModule` had 7 redundant imports — none of them were injected by `AppController` or `AppService`. Each was already imported by the sub-module that needed it.

**2. Each module imports its own dependencies directly.**
NestJS module exports are not transitive. A module can only see providers that are explicitly listed in the `exports` array of an imported module. No module should rely on a parent or sibling module to supply a dependency indirectly.

**3. Exports must be intentional and minimal.**
Only add a provider to `exports: []` when another module is expected to inject it. Do not export everything by default.

**4. Orphaned module files must not exist.**
A `*.module.ts` file that no other module imports (and is not `AppModule` itself) is dead code and a latent double-registration risk. Either wire it up or delete it.

*Example*: `skip-reason.module.ts` existed alongside `pipeline.module.ts` which already registered `SkipReasonService`. The file was deleted in TASK-035C.

**5. `@Global()` modules need only one import site.**
Once a `@Global()` module is imported (typically in `AppModule`), its exported providers are available everywhere in the application. Repeating the import in other modules is harmless self-documentation but adds no DI value. Do not add or remove such imports as part of unrelated tasks.

**6. Split a module only when the split reduces real complexity.**
If candidate sub-modules would share most of the same imports, the split adds boilerplate without benefit. A valid reason to split: a new service has zero dependency overlap with the existing module, or unit test isolation is actively blocked. Otherwise keep the module together and document why in the task that introduces the new service.

Reason:
Architectural audit after TASK-035B revealed concrete violations of NestJS module boundary best practices. The rules above are derived from those findings and apply to all future modules added to the project.

Source: TASK-035C audit findings.

## ADR-018 — current_work_block was designed in TASK-032 spec but omitted from implementation

Status: `Accepted`

Decision:
`current_work_block` is part of the `Prompt2CvContent` contract as specified in `docs/08_ai_pipeline.md §10.4` and required by `CvContent` (the renderer input contract). It was not added to `Prompt2CvContent` or `FAKE_PROMPT2_JSON` during TASK-032 implementation. TASK-032A adds it as a schema-only fix without retroactively changing any other TASK-032 acceptance criteria.

`Prompt2CurrentWorkBlock` mirrors `CvCurrentWorkBlock` with `priority: string` (not a union) consistent with the loose-typing pattern used elsewhere in prompt2.schema.ts. The `purpose` field present in the docs JSON example is intentionally omitted from the TypeScript type — it is an AI-internal annotation not consumed by the renderer.

Reason:
The gap was discovered during TASK-035 implementation review. Fixing it in isolation (TASK-032A) keeps TASK-032 history clean and avoids mixing a schema fix into the renderer task.

Source: TASK-032A gap analysis.

## ADR-016 — change_to_skip keeps status at paused_after_analysis until artifacts exist

Status: `Accepted`

Decision:
The `change_to_skip` review action sets `currentDecision = skip` and `reviewState = overridden`
but leaves `status = paused_after_analysis`. The transition to `status = skipped` happens
only when skip artifacts (01_skip_reason.md/json) are physically created (TASK-029).

Reason:
Status `skipped` implies artifacts exist on disk. Setting it before artifact creation
leaves the workspace in an inconsistent state. Two-step approach: decision first (TASK-028),
artifacts + final status transition second (TASK-029).
Source: derived and confirmed during TASK-028 implementation.

## ADR-019 — Every new HTTP endpoint must be Swagger-documented

Status: `Accepted`

Decision:
Every new controller method exposing an HTTP endpoint must have `@ApiOperation({ summary: '...' })`. Every new or changed DTO field must have `@ApiProperty()` (or `@ApiPropertyOptional()` for optional fields). This is an ongoing requirement for all future endpoints, not a one-time backfill.

Reason:
TASK-PH-008 added `@nestjs/swagger` and documented all controllers/DTOs that existed at that time, but that was a one-time backfill task. Without a standing rule, new endpoints added afterward would silently go undocumented and Swagger UI/`GET /api-json` would drift out of sync with the real API surface.
Source: user request, 2026-07-06.

## ADR-020 — One source file, one spec file, same name

Status: `Accepted`

Decision:
Every source file that exports testable logic (`x.ts`) must have its tests in a spec file with the matching name (`x.spec.ts`), never inside another file's spec file. When logic is split out of an existing file into a new file, its tests move with it into their own matching spec file in the same change.

Reason:
During TASK-042 review, `validatePrePdfCheckJson` (defined in `pre-pdf-check.schema.ts`) was found to have its tests living inside `cv-content.schema.spec.ts` instead of a `pre-pdf-check.schema.spec.ts` — apparently left behind when `pre-pdf-check.schema.ts` was split out of `cv-content.schema.ts` in an earlier task. This made the tests undiscoverable by filename (had to grep to find them) and violated the 1:1 naming convention used everywhere else in the codebase (`vacancy-analysis.schema.ts`/`.spec.ts`, `targeted-cv-content.schema.ts`/`.spec.ts` — see ADR-021). Fixed by moving the block into its own `pre-pdf-check.schema.spec.ts`. Same review also found `skip-reason.schema.ts` had no dedicated spec file at all (only indirect coverage via `skip-reason.service.spec.ts`'s happy path); added `skip-reason.schema.spec.ts`.
Source: user request during TASK-042 review, 2026-07-13.

## ADR-021 — AI-output schema files are named after their canonical artifact, not the prompt step number

Status: `Accepted`

Decision:
`src/pipeline/schemas/*.schema.ts` files (and the TypeScript types/functions they export) are named after the canonical artifact they validate (per ADR-006), not after the internal pipeline step number that produces them. Renamed during TASK-043 review:

- `prompt1.schema.ts` → `vacancy-analysis.schema.ts` (matches `01_vacancy_analysis.md/json`); `Prompt1Analysis` → `VacancyAnalysis`, `validatePrompt1Json` → `validateVacancyAnalysisJson`, and all sibling `Prompt1*` types renamed to `VacancyAnalysis*`.
- `prompt2.schema.ts` → `targeted-cv-content.schema.ts` (matches `02_targeted_cv_content.md/json`); `Prompt2Output` → `TargetedCvContentOutput`, `validatePrompt2Json` → `validateTargetedCvContentJson`, and sibling `Prompt2*` types renamed to `TargetedCv*` (the nested `cv_content` field type became `TargetedCvContentBlock` to avoid a doubled "Content" in the name).

`skip-reason.schema.ts`, `pre-pdf-check.schema.ts` and `final-check.schema.ts` already followed this convention (named after `01_skip_reason`, `03_pre_pdf_check`, `05_final_check` respectively) — `prompt1.schema.ts`/`prompt2.schema.ts` were the only two outliers.

Note this governs *schema* files only (AI JSON I/O contracts). `PromptNService`/`PromptNInputBuilderService` classes under `src/pipeline/promptN/` keep the step-number naming — they orchestrate a numbered pipeline step, not an artifact shape, and that naming is unambiguous and unaffected.

Reason:
Flagged by the user while reviewing TASK-043 (`src/pipeline/schemas/final-check.schema.ts`, which correctly followed the artifact-name convention): `prompt1.schema.ts`/`prompt2.schema.ts` broke that same convention by naming after the internal step number instead. Artifact-based naming is more meaningful (it ties directly to the already-documented canonical file names in ADR-006) and was already the majority convention (3 of 5 schema files). Fixed by renaming the two outliers rather than the other three, since that was the smaller, majority-preserving change. Mechanical rename verified by `npx tsc --noEmit` (zero errors) and the full test/e2e suite (all green) — pure identifier rename, no behavior change.
Source: user request during TASK-043 review, 2026-07-13.

## ADR-022 — Coverage strategy: measured global floor + enforced diff coverage + CI-enforced e2e

Status: `Accepted`

Decision:
Coverage is protected by three complementary mechanisms rather than a single blind global threshold:

1. **Global coverage floor** (`package.json` Jest `coverageThreshold`) — set from a *measured* local baseline (`npm run test:cov`), not guessed. Baseline on 2026-07-14: statements 91.59%, branches 71.21%, functions 92.01%, lines 91.41%. Threshold set to statements 90 / branches 68 / functions 90 / lines 90 — a regression floor with a small margin, not a target to chase. `collectCoverageFrom` excludes `*.module.ts`, `*.dto.ts`, `main.ts` and `prisma/**` since these are boilerplate, not logic.
2. **Diff/patch coverage** (Codecov `patch` status, `codecov.yml`, target 80%) — the primary ongoing quality gate for new/changed code. The Codecov `project` status is informational only for now (the Jest global threshold is the real global gate).
3. **CI-enforced e2e** — `.github/workflows/ci.yml` gained a `test-e2e` job (Postgres service + `prisma migrate deploy` + `prisma db seed` + `npm run test:e2e`). Previously `test/mvp-flow.e2e-spec.ts` and `test/rate-limiting.e2e-spec.ts` only ran locally; CI never executed them.

Reason:
A blind global threshold set without a measured baseline is unreliable — either trivially met (set too low) or blocks all future PRs (set too high, since the actual number was unknown; the real baseline turned out to be ~91%, far above what would have been assumed). Diff coverage protects new work without punishing legacy gaps, fitting the existing unit-test culture (ADR-008, ADR-020) without demanding a rewrite of test strategy. Enforcing the existing e2e suite in CI closes a real gap where a green CI badge did not reflect the project's best end-to-end test actually running.

During implementation, a new `test/skip-flow.e2e-spec.ts` covering the `change_to_skip` two-step transition (ADR-016) was added. A second planned scenario — exercising `confirm-skip` through to `01_skip_reason.md/json` + `status = skipped` (ADR-005) — was descoped after discovering `prisma/seed.ts` does not seed an active `skip_reason` PromptTemplate, so `confirm-skip` 500s on any standard-seeded environment. This is a pre-existing product gap, not introduced by this task; tracked as a follow-up in `TASK_BOARD.md`.

Source: user-selected task (TASK-PH-017) following coverage-strategy analysis, 2026-07-14.

## ADR-023 — Monorepo layout: backend moved to apps/api, peer to apps/web

Status: `Accepted`

Decision:
The NestJS backend, previously living at the repository root, moved to `apps/api/` — a peer of `apps/web/` (added in TASK-055). Each app is fully self-contained: its own `package.json`, `node_modules`, lockfile, `tsconfig.json`, `.eslintrc`/`eslint.config`, and (for `apps/api`) `Dockerfile`. No npm workspaces were introduced — this matches the "fully independent" decision already made for `apps/web` in TASK-055, applied consistently to `apps/api`.

The repository root now holds only cross-cutting, shared concerns: `docs/`, `project-management/`, `README.md`, `CLAUDE.md`, `SECURITY.md`, `.github/`, and `docker-compose.yml` (which orchestrates both apps' infra — Postgres, Redis — and builds the `apps/api` image). A minimal root `package.json` exists solely to hold `husky` + `lint-staged` as dev tooling for the Git pre-commit hook, which now routes matched files to each app's own local `eslint`/`prettier` binaries by path (`apps/api/{src,libs,test}/**/*.ts` → `apps/api/node_modules/.bin/...`, `apps/web/src/**/*.{ts,tsx}` → `apps/web/node_modules/.bin/...`). `docker-compose.yml` keeps a small root-level `.env`/`.env.example` of its own (Postgres/Redis/port vars only) purely for Compose's own variable substitution — distinct from `apps/api/.env`, which holds the backend's full runtime config (`DATABASE_URL`, `STORAGE_ROOT`, `API_KEY`, AI provider settings, etc.) and is what the app itself reads.

`.claude/settings.json`'s PostToolUse hooks (`scripts/lint-hook.js`, new `scripts/typecheck-hook.js`) were rewritten to detect which app an edited file belongs to (by path prefix) and invoke that app's own local `eslint`/`tsc` binary with the correct `cwd` — previously a single root-scoped hook assumed one backend-at-root project; a naive version would now either miss `apps/web` entirely or run the wrong app's config against the other app's files.

Reason:
`apps/web` (TASK-055) was originally bootstrapped as a subdirectory of what was, at the time, the backend's own root — meaning the two apps were structurally asymmetric (frontend nested inside backend) despite being conceptually peers. This already caused two real collisions before the move (root `tsconfig.json` picking up `apps/web/**` for type-checking, and the root lint-staged/lint globs matching frontend files with the backend's ESLint config). Moving the backend into `apps/api/` makes the two apps symmetric, matches the standard convention for multi-app repos without a build orchestrator (Nx/Turborepo default to the same `apps/<name>/` layout), and removes the structural asymmetry at its root cause rather than continuing to patch each new collision as it surfaces.

This changes prior assumptions in ADR-001 ("Backend-first MVP") only insofar as "backend = repository root" is no longer true; the backend-first *priority* (build/ship backend functionality before frontend polish) is unchanged and still governs task sequencing.

Verified after the move: `apps/api` — `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 59/59 suites / 637/637 tests, `npm run test:e2e` 3/3 suites / 4/4 tests, `npm run build` clean, `docker compose config` resolves without warnings and picks up the correct build context. Root `npx lint-staged` verified against real staged files from the move (both apps' eslint/prettier ran without cross-contamination). Manual smoke test: real backend (`apps/api`, `npm run start:dev`) + real frontend (`apps/web`, `npm run dev`) — page still showed "Backend status: ok" end-to-end from their new locations.

Source: user request during TASK-055 review, 2026-07-17 — "я хочу 2 раздельных приложения бек и фронт в одном репо но так чтоб это было согласно лучшим практикам" (doubts about `apps/web` living inside the backend's own root).

## ADR-024 — Dockerize apps/web, add web service to docker-compose

Status: `Accepted`

Decision:
`apps/web` gained its own `Dockerfile` (`node:20-alpine`, 3-stage: `deps` → `builder` → `runner`),
using Next.js's `output: "standalone"` (set in `apps/web/next.config.ts`) to produce a minimal
runtime bundle rather than shipping the full `node_modules`. `docker-compose.yml` gained a new
`web` service, `depends_on: app`, exposed on `${WEB_PORT:-3001}` (host) → `3000` (container).

`NEXT_PUBLIC_API_BASE_URL` is passed as a Docker **build arg** (`docker-compose.yml`'s
`build.args`), defaulting to `http://app:3000` — the in-network service name. This is required
because Next.js inlines `NEXT_PUBLIC_*` env vars into the compiled bundle at build time; setting
it as a plain container runtime env var (e.g. via `docker run -e`) has no effect once the image is
built. The default value in `apps/web/Dockerfile`'s `ARG` (`http://localhost:3000`) is a
standalone-build fallback for building the image outside this compose file; `docker-compose.yml`
always overrides it.

`apps/web/Dockerfile`'s runner stage sets `ENV HOSTNAME="0.0.0.0"` explicitly. This was found
necessary during verification: without it, the Next.js standalone `server.js` bound to
`172.20.0.5:3000` (the container's own network IP) instead of `0.0.0.0:3000`, because it reads
`$HOSTNAME` if set — and Docker auto-sets `HOSTNAME` to the container's own hostname by default.
The container was still reachable from the **host** (Docker's NAT routes the published port
directly to the container's IP:port), which masked the bug in a first manual check — but anything
connecting via `localhost` **from inside the container itself** (the `HEALTHCHECK` directive,
`docker exec ... curl localhost:3000`) failed with connection refused. Fixed and re-verified:
`docker compose ps` shows `jobflow_web` as `(healthy)`, `docker exec jobflow_web curl
localhost:3000/` succeeds, and the host-side page (`http://localhost:3001`) still renders "Backend
status: ok" against the real containerized backend.

Reason:
User requested full-stack containerization ("добавляй сейчас") after reviewing the ADR-023
restructuring and confirming `apps/web` would stay out of Docker for now — then changed direction
and asked for it immediately rather than deferring to a later task. `output: "standalone"` was
chosen over a naive `npm run build && npm start` image because it is the Next.js-documented
approach for minimal, production-appropriate Docker images and avoids shipping devDependencies or
the full framework source into the runtime image.

Source: user request, 2026-07-17 — "добавляй сейчас" (add the web app to Docker now), after
initially agreeing to defer it (see ADR-023's "Docker: apps/web?" discussion in TASK-055 review).