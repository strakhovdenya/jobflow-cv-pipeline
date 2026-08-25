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

## ADR-025 — Multi-task epics use an intermediate integration branch, not direct-to-main per task

Status: `Accepted`

Decision:
When a body of work spans multiple `task/TASK-XXX-...` tasks that together form one epic (e.g. a
staged UI redesign delivered as several sequential tasks), the epic gets its own long-lived
integration branch, branched from up-to-date `main`:

```
task/TASK-XXX-<epic-short-name>-base
```

The `-base` suffix is mandatory and is what makes the branch match the CI wildcard below — an
epic base branch that omits it silently loses CI coverage on every sub-task PR.

Each sub-task branches off that base branch (not off `main`) and opens its PR **into the base
branch** (`gh pr create --base task/TASK-XXX-<epic-short-name>-base`), following the same
commit/PR mechanics as any other task. `main` only receives one final PR from the base branch once
every sub-task in the epic is merged and the epic as a whole is verified. This is additive to
ADR-014, not a replacement — single-task work still branches from and merges directly to `main` as
before; this rule applies only when a task is explicitly scoped as one step of a larger epic.

CI implication: `.github/workflows/ci.yml` and `.github/workflows/codeql.yml` trigger on
`push`/`pull_request` to `branches: [main, 'task/*-base']`. The `task/*-base` glob matches any
epic base branch following the naming convention above, so CI works for every future epic without
touching the workflow files again — as long as the `-base` suffix convention is followed.

Reason:
`main` must stay releasable at every merge (ADR-014: "main — только завершённые задачи"). A
redesign or other wide-reaching epic is visually/functionally incomplete after each individual
sub-task, so merging each one straight to `main` would leave `main` in an inconsistent
intermediate state for the epic's whole duration. Routing sub-task PRs through a shared base branch
keeps `main` stable throughout while still preserving full per-task commit/PR history (nothing is
squashed or skipped) and ending with one clean, reviewable epic-level PR into `main`.

Source: user request, 2026-07-23 — planning the git strategy for an upcoming multi-task web
redesign epic (new HTML/CSS renders to be broken into several sequential tasks).

**Process note (added 2026-07-26, TASK-076 review):** creating an epic base branch
(`git checkout -b task/TASK-XXX-<epic-short-name>-base`, branched from `main`) is not itself
sufficient — CI running on its sub-task PRs (per the `task/*-base` wildcard above) does not mean
the GitHub PR "Merge" button is blocked on those checks passing. That only happens if the base
branch also has a GitHub branch protection rule with "Require status checks to pass before
merging" configured — `main` has this configured (`Lint`, `Typecheck`, `Test (apps/api)`,
`Test (e2e)`, `Build`, `Docker Build & Smoke Test`, `Analyze (javascript-typescript)`,
`codecov/patch`, `Dependabot Severity Gate`), but no epic base branch ever had this set up, so the
Merge button on TASK-076's PR (#141, into `task/TASK-073-redesign-base`) was clickable while
checks were still `pending` — discovered by the project owner in the GitHub UI, not a git/GitHub
bug, just a missing setup step. **Creating an epic base branch must include configuring the same
required-status-checks branch protection on it as `main` has** (`gh api
repos/:owner/:repo/branches/:branch/protection` with `required_status_checks`, or the GitHub UI
equivalent) — add this as an explicit step alongside `git checkout -b .../-base` in the
Branch-first protocol, not just for `main`.

Reason: without this, the base branch offers no real merge gate — a sub-task PR can be merged into
it (and eventually flow into `main` via the epic's final PR) even with a red or still-running CI
run, silently defeating the whole point of routing sub-task PRs through review.
Source: project owner, 2026-07-26, reviewing TASK-076's PR.

**Process note (added 2026-07-26, TASK-077 branch-off timing):** TASK-077's branch
(`task/TASK-077-main-action-card`) was created off `task/TASK-073-redesign-base` while TASK-076's
PR (#141, the immediately-preceding sub-task) was still open/unmerged — breaking the sequential
pattern actually followed for TASK-075 → TASK-076 (TASK-076 only branched after PR #139 merged).
Nothing in ADR-025's original text required waiting, so this wasn't caught until the project owner
flagged it mid-task. Consequence: `task/TASK-077-main-action-card` had already diverged from the
base by the time #141 merged, requiring a `git stash` + fast-forward + stash-pop-with-conflict-
resolution (in `apps/web/src/lib/types.ts` and `project-management/CURRENT_TASK.md`, both touched
by both tasks) to reconcile — avoidable if the branch simply hadn't been created yet. **Before
branching a new epic sub-task off its base branch, check whether the immediately-preceding
sub-task's PR into that base branch is still open; if so, stop and ask the project owner whether to
wait for it to merge or to proceed in parallel anyway** — added as an explicit check in CLAUDE.md's
Branch-first protocol.

Reason: an epic base branch is a shared, evolving target — branching a new sub-task off it before
the previous sub-task lands risks silent divergence (missed files/types the next task didn't know
it needed yet) that surfaces only as a merge conflict later, instead of being avoided by sequencing
branch creation after each merge, matching how TASK-075 → TASK-076 was already actually done.

Source: project owner, 2026-07-26, reviewing TASK-077's branch timing.

## ADR-026 — Pre-PDF check becomes a mandatory-but-skippable gate before export (supersedes ADR-009 for Prompt 3 only)

Status: `Accepted`

Decision:
Approving the CV draft (`POST /workspaces/:id/review-cv-draft`, action `approve`) no longer
transitions the workspace directly to `export_running`. It now transitions to
`pre_pdf_check_ready` — a gate that must be cleared before `POST /workspaces/:id/export-cv` will
run — by one of two actions:

- `POST /workspaces/:id/run-pre-pdf-check` (existing endpoint, Prompt 3): on success (regardless of
  the AI's `readiness` verdict — the verdict itself never blocks export, only having run does),
  transitions to `paused_before_export`.
- `POST /workspaces/:id/skip-pre-pdf-check` (new endpoint, `ReviewGatesService.skipPrePdfCheck`):
  transitions `pre_pdf_check_ready -> paused_before_export` directly, with no AI call.

`DocumentExportService.exportCv()` now accepts either `paused_before_export` (the new path) or
`export_running` (kept for backward compatibility; nothing in the current flow transitions into it
anymore, but it remains a valid precondition rather than being silently orphaned).
`WorkspaceStatusService.TRANSITIONS` was updated to match, and both `pre_pdf_check_ready` and
`paused_before_export` — previously present in the `WorkspaceStatus` Prisma enum and in
`pipeline-view-model.ts`'s `STATUS_STAGE_INDEX`/`buildMainActionCard` as unreachable stubs (`buttons:
[]`, empty `TRANSITIONS` entries) — are now live. Frontend: `pre-pdf-check-panel.tsx` only shows
the "Run pre-PDF check" / "Skip pre-PDF check" buttons at `pre_pdf_check_ready`, and keeps showing
results (read-only) at `paused_before_export`; `paused_before_export`'s main-action card gained an
"Export PDF" button (mirroring `export_running`'s existing one).

Reason:
This directly overrides ADR-009's "Prompt 3 and Prompt 5 are optional/P1, not first MVP blockers"
for Prompt 3 specifically — Prompt 5 (final check) is unaffected and remains fully optional. The
project owner requested this while walking through TASK-091's Flow variant 1 manual re-verification
pass: the pre-PDF check screen was visually reachable but functionally a no-op detour (nothing
required running or skipping it before exporting), which didn't match the real intent of having a
safety check before a CV goes out. The `pre_pdf_check_ready`/`paused_before_export` statuses already
existed in the Prisma enum and had partial frontend stubs (stage index 5/6, label/subtitle text)
that were never wired up — this ADR is what finishes wiring them, rather than introducing new
schema. Verified via the full `apps/api` (650/650) and `apps/web` (214/214) test suites, both apps'
`tsc --noEmit` and `lint` clean, and a live manual re-run of TASK-072's Flow variant 1 through the
real `apps/web` UI (approve → pre-PDF check ready → run check → paused before export → export PDF →
PDF generated).

Source: project owner, 2026-08-03, during TASK-091's Flow variant 1 manual verification pass.

## ADR-027 — Analysis review: originalDecision field, single Approve button, and a consistent recommendation/decision badge system

Status: `Accepted`

Decision:

1. **`originalDecision` field** (`ApplicationWorkspace.originalDecision`, nullable `VacancyDecision`,
   migration `20260803122702_add_original_decision`): set once by `prompt1.service.ts` alongside
   `currentDecision` and never touched again — preserves the AI's actual recommendation even after
   a human override (`change_to_skip`, `override_to_apply`) rewrites `currentDecision`. Historical
   rows created before this migration have `originalDecision = null`; every read path falls back to
   `currentDecision` for those (`originalDecision ?? currentDecision ?? "—"`).

2. **Single "Approve" button** replaces the old separate "Approve · apply"/"Approve · maybe"
   buttons in `buildMainActionCard`'s `paused_after_analysis`/`analysis_ready` case. Only one of
   the two old buttons could ever be enabled — `review-gates.service.ts`'s own guards require
   `currentDecision` to already equal the target — so the disabled twin was pure visual noise. The
   single button's label mirrors `currentDecision` (`Approve (apply)` / `Approve (maybe)` /
   `Approve (skip)`); which server action it actually triggers is resolved in
   `main-action-panel.tsx`'s `approveAnalysisReview()` (`approve_apply` / `approve_maybe` /
   `override_to_apply`).

3. **New `override_to_apply` review action** (`ReviewAction.override_to_apply`,
   `ReviewGatesService.submitDecision()`): lets a human approve past an AI/human `skip`
   recommendation without first confirming the skip. Requires `currentDecision === "skip"`,
   transitions to `cv_generation_running`, and logs a `DecisionOverride` row
   (`fromDecision: skip, toDecision: apply`) — same audit-trail convention as
   `mark_not_worth_applying`/`overrideSkip`. `SubmitDecisionDto` gained an optional `reasonNote`
   (unused by the other actions, mirrors `CvDraftReviewDto`'s pattern).

4. **"Pause" removed from the Analysis review card**: `review-gates.service.ts`'s own `pause` case
   was already a no-op at this stage (status stays `paused_after_analysis`, decision doesn't
   change, only `reviewState` resets to `pending_review` — which is very likely its value already,
   since nothing has happened yet). The backend action and endpoint are unchanged (still used by
   the unrelated CV-draft-review "Pause" button); only this specific card's button was removed.

5. **Recommendation vs. decision — the actual bug this ADR traces back to**: `currentDecision` is
   populated immediately by `prompt1.service.ts`, before any human acts — it is the AI's own call,
   not evidence a human decided anything. Labeling it "decision" and showing it as already-resolved
   while `reviewState` is still `null` (no human action yet) is misleading. Fixed with two rules
   applied consistently in all three places this workspace's decision state is rendered
   (`buildMainActionCard`'s `meta`, `buildStatusHeaderData`'s pills, and `buildStages`'s new
   per-stage `badges`, all in `pipeline-view-model.ts`):
   - `recommendation` always shows `originalDecision ?? currentDecision ?? "—"` (the AI's call,
     immutable).
   - `decision` always shows `reviewState != null ? currentDecision : "—"` (a human's call — only
     populated once `reviewState` moves off its initial `null`, matching the exact set of actions
     that touch it: `approve_apply`/`approve_maybe`/`change_to_skip`/`override_to_apply`/`pause`).
   Both rows always render (with the "—" placeholder) rather than one disappearing — this was a
   deliberate revision during implementation: an earlier version hid the "decision" row entirely
   until decided, but the project owner asked for a stable 3-badge layout instead, matching how
   `recommendation`/`score` already always render (no layout jump once a decision lands).

6. **`Stage.badges` (new field, distinct from `Stage.options`)**: the `PipelineStages` sidebar's
   "decision" stage previously showed only the old two-button/Pause/Skip `options` list; it now
   also carries `recommendation`/`decision` badges (via `buildStages`'s new `originalDecision`/
   `reviewState` parameters), matching the same rule as above. The sidebar's `options` list itself
   was also collapsed to match #2: a single "Approve" entry (state `next`/`chosen`, or `open` when
   `currentDecision === "skip"` — since `override_to_apply` makes it always re-clickable there) plus
   "Skip" — no more `Approve · apply`/`Approve · maybe`/`Pause` entries.

7. **Badges are now visually distinct from buttons app-wide**: `MainActionCard`'s `MetaPill`,
   `WorkspaceStatusHeader`'s `FieldPill`, and `PipelineStages`' new `StageBadgeItem` were previously
   styled almost identically to `secondary`-kind `ActionButton`s (`rounded-md`, bordered, white/light
   background) — visually ambiguous at a glance, particularly the sidebar's `options` list sitting
   directly below its new `badges` row. All three badge components were restyled to `rounded-full`,
   filled (`bg-zinc-100`/`dark:bg-zinc-900`), borderless, no hover/cursor affordance — buttons keep
   their existing `rounded-md`, bordered, hoverable style unchanged. Same color palette throughout
   (zinc/black/white + indigo accents), only shape/fill differs, so info (non-interactive) and
   actions (interactive) read as visually distinct categories without introducing a new visual
   language.

Reason:
All seven points were raised by the project owner in the same session, driving TASK-091's Flow
variant 2 manual re-verification pass: reviewing the redesigned "Analysis review" card surfaced
that (a) one of its two Approve buttons was always inert dead weight, (b) the AI's original call
was silently lost the moment a human overrode it (no field preserved it), and (c) the badge/pill
components used for read-only info were easy to mistake for clickable actions at a glance,
including in the newly-added sidebar badges. Fixing the badge semantics (recommendation vs.
decision) without also fixing their visual ambiguity from actual buttons would have left the
underlying confusion (which motivated the whole redesign) only half-solved.

Verified via the full `apps/api` (654/654) and `apps/web` (220/220) test suites, both apps'
`tsc --noEmit`/`lint` clean, and a live manual walkthrough through the real `apps/web` UI during
TASK-091's Flow variant 2 re-run (Analysis review → Skip → recommendation/decision badges correct
at every step → Approve still available post-skip via override).

**Follow-up (added 2026-08-03, same TASK-091 Flow variant 2 re-run):** `WorkspaceStatusHeader`'s
fourth pill — `review` (the raw `reviewState` enum: `pending_review`/`approved`/`overridden`) —
was removed entirely. The project owner questioned why a workspace they had just clicked "Skip"
on (not yet touched "Override skip") already showed `review: overridden`, since "overridden" reads
as if the skip itself had been undone. Investigated: `reviewState: overridden` is set by
`change_to_skip`/`override_to_apply` in `review-gates.service.ts` and means "a human decision
overrode the AI's original recommendation" — an unrelated concept from the "Override skip" button
(which resumes the pipeline from the terminal `skipped` status). Once `recommendation` and
`decision` are both always-rendered badges (this same ADR), comparing them already tells a viewer
whether the decision matches or overrides the recommendation — the `review` pill added no
information beyond that, only a confusing, coincidentally-overlapping label. Removed
`reviewState` from `WorkspaceStatusHeaderData` (`types.ts`), `buildStatusHeaderData`
(`pipeline-view-model.ts`), and the `FieldPill` in `workspace-status-header.tsx`; `MainActionCard`
and the `PipelineStages` sidebar never had this pill (only `WorkspaceStatusHeader` did), so nothing
else changed. `reviewState` itself remains a real, used field elsewhere (computing the `decision`
badge value, and `MainActionPanel`'s own logic) — only its raw-enum *display* was removed.
Covered by updated `workspace-status-header.spec.tsx`/`pipeline-view-model.spec.ts` assertions;
full `apps/web` suite (221/221) and `tsc --noEmit`/`lint` clean.

**Second follow-up (added 2026-08-03, same re-run, live-tested via "Override skip"):**
`review-gates.service.ts`'s pre-existing `overrideSkip()` (unrelated to this task's own
ADR-026/027/028 work — it predates all three) sets `currentDecision` to the distinct
`VacancyDecision.manual_override_apply`/`manual_override_maybe`/`manual_override_skip` enum
values, not plain `apply`/`maybe`/`skip` — an intentional audit-trail distinction ("this decision
came from overriding a fully-confirmed skip", vs. the lighter-weight pre-confirm
`override_to_apply`). Once ADR-027 made `recommendation`/`decision` always-rendered badges, this
was the first time either got shown to a user, and the raw enum value ("decision:
manual_override_apply") leaked through unformatted — found live testing "Override skip" on a
throwaway workspace during this task. Added a `displayDecision()` helper in
`pipeline-view-model.ts` that strips the `manual_override_` prefix for *display* only (the stored
enum value and any backend logic keyed on it are untouched); applied everywhere
`currentDecision`/`originalDecision` becomes a badge value: `buildStatusHeaderData`,
`buildMainActionCard`'s analysis-review meta row and subtitle, and `buildStages`' sidebar
`decisionBadges`. Covered by two new regression tests (`pipeline-view-model.spec.ts`) asserting
`manual_override_apply` displays as `apply` in both the header and the sidebar badge. Full
`apps/web` suite (223/223) and `tsc --noEmit`/`lint` clean.

## ADR-028 — Skip and confirm-skip collapse into a single "Skip" click (frontend-only; supersedes ADR-016's two-step UX)

Status: `Accepted`

Decision:
Clicking "Skip" on the Analysis review card now drives the whole `change_to_skip` →
`confirm-skip` sequence in one click, instead of requiring a separate "Confirm skip" click on an
intermediate "decision flagged but not yet confirmed" screen. This is a **frontend-only**
change — both backend endpoints (`POST /workspaces/:id/decision` action `change_to_skip`, and
`POST /workspaces/:id/confirm-skip`) are unchanged, keep their existing preconditions, and are
still called as two separate HTTP requests; `main-action-panel.tsx`'s new `skipWorkspace()`
function just chains them client-side:

- If `currentDecision !== "skip"`: call `change_to_skip`, then (only if that succeeds)
  `confirm-skip`.
- If `currentDecision === "skip"` already (the only way this happens is the `analysis_ready`
  rollback path — `skip-reason.service.ts confirmSkip()` rolls back to `analysis_ready` on an
  AI/validation failure, per ADR-016 — a genuine retry case): skip the `change_to_skip` call
  (its precondition would fail anyway, since it's already `skip`) and call only `confirm-skip`.

`buildMainActionCard`'s `paused_after_analysis`/`analysis_ready` case
(`pipeline-view-model.ts`) no longer renders a separate "Confirm skip" button — both the
first-time and retry cases now show a single "Skip" button (kept `primary` emphasis in the
retry case, `secondary` otherwise, mirroring the old "Confirm skip" button's `primary` kind).
The `analysis_ready` info banner text changed from "...retry Confirm skip." to "...click Skip to
retry." to match.

Reason:
Raised by the project owner while manually re-running TASK-091's Flow variant 2: after clicking
"Skip", the card immediately showed a second click ("Confirm skip") that led to the exact same
place a moment later — no new information was presented between the two clicks, and the only
other place the flow can go from there is "Override skip" (undo). From the user's perspective,
the intermediate screen added a click without adding a decision point. Investigated before
agreeing: `confirmSkip()` is not a rubber-stamp — it makes a real AI-provider call to generate the
skip-reason content and can fail (existing `analysis_ready` rollback path, ADR-016) — so the
two backend steps stay genuinely separate calls (cheap decision-flag vs. fallible AI-backed
artifact generation), matching the same pattern used elsewhere (e.g. CV draft approval vs.
pre-PDF check, ADR-026). Only the UI's forced two-click gate was removed; the backend two-step
state machine and its failure/retry behavior (ADR-016) are otherwise unchanged. Chose
frontend-only orchestration over adding a new combined backend endpoint since it requires no
schema/endpoint changes and keeps `confirmSkip()`'s existing error/retry contract intact.

Verified via `apps/web`'s full test suite (221/221, up from 220 — two new tests added:
`skipWorkspace()` chains both calls on a fresh skip, and calls only `confirm-skip` on the
`analysis_ready` retry path) and `tsc --noEmit`/`lint` clean. Manually re-verified live through
Flow variant 2's continued re-run: clicking "Skip" went straight from `paused_after_analysis` to
`skipped` with `01_skip_reason.md/json` registered, no intermediate confirmation screen.

Source: project owner, 2026-08-03, during TASK-091's Flow variant 2 manual verification pass —
"этот шаг получается лишний... зачем подтверждать? посмотри со стороны юзера и юзер экспиренс".

## ADR-029 — CV draft review: remove Pause and Mark-not-worth-applying; fix and extend Regenerate CV draft with user feedback

Status: `Accepted`

Decision:

1. **"Pause" removed from the CV draft review card.** `CvDraftReviewAction.pause` moved
   `cv_draft_ready -> paused_after_cv_draft` and reset `reviewState` to `pending_review`, but
   `CV_DRAFT_VALID_STATUSES` already treats both statuses as identical preconditions for every
   subsequent action (`review-gates.service.ts`) — nothing becomes reachable or blocked by
   pausing. Same reasoning as the Analysis review card's Pause removal (ADR-027). The button was
   removed from `buildCvReviewOptions`/`buildMainActionCard`'s `cv_draft_ready`/
   `paused_after_cv_draft` case (`pipeline-view-model.ts`); the backend `CvDraftReviewAction.pause`
   case and `POST /workspaces/:id/review-cv-draft` action `pause` are unchanged (still a valid,
   documented action — only this card's button was removed, matching ADR-027's precedent).

2. **"Mark not worth applying" removed entirely — backend, frontend, schema, and docs.** Unlike
   Pause, this was a real action (`review-gates.service.ts`'s `mark_not_worth_applying` case wrote
   a `DecisionOverride` audit row and set `currentDecision = manual_override_skip`), but the
   project owner judged it unnecessary product surface: walking away from a workspace without
   applying doesn't need a dedicated decision/audit trail distinct from simply not acting on it.
   Removed:
   - `CvDraftReviewAction.mark_not_worth_applying` (backend DTO enum) and its `switch` case in
     `submitCvDraftReview()`.
   - `VacancyDecision.manual_override_skip` (Prisma enum) — its only producer. Migration
     `20260803145453_remove_manual_override_skip` recreates the enum type without it (Postgres has
     no `ALTER TYPE ... DROP VALUE`) and re-casts `ApplicationWorkspace.currentDecision`/
     `originalDecision` and `DecisionOverride.fromDecision`/`toDecision` through the new type.
     Verified no row anywhere in the dev database referenced the value before migrating (one
     leftover throwaway test workspace and one accidentally-clicked-during-this-session workspace
     were cleaned up/reset first — a real migration against production data would need the same
     check, or a data-backfill step, before this migration could run).
   - `reasonNote` was also dropped from `CvDraftReviewDto`/`submitCvDraftReview()`/
     `submitCvDraftReviewAction()` — it existed solely to attach an audit note to
     `mark_not_worth_applying`'s `DecisionOverride` row; `approve`/`pause` never used it, so once
     the removal left it fully unread, ESLint's `no-unused-vars` caught it immediately.
   - `"Mark not worth applying"`/`"Not worth applying"` button removed from
     `buildMainActionCard`/`buildCvReviewOptions` (`pipeline-view-model.ts`) and the
     `main-action-panel.tsx` dispatch map.
   - Docs updated to match (`docs/01_requirements.md` FR-037, `docs/02_user_flows_v3_consistent.md`
     §5.5, `docs/03_domain_model.md` §5.2/§17.2, `docs/04_architecture.md` §6.10,
     `docs/08_ai_pipeline.md` §10.9, `docs/07_task_backlog.md` TASK-034) — all previously listed
     `manual_override_skip`/"Mark as Not Worth Applying" as either a value or a user option;
     `docs/07_task_backlog.md`'s original TASK-034 acceptance criteria additionally turned out to
     describe a `skipped` + skip-reason-artifact flow that was **never what got implemented**
     (the real implementation set `manual_override_skip` + `paused_after_cv_draft`, not `skipped`)
     — noted inline rather than silently corrected, since TASK-034 itself is long closed.

3. **Regenerate CV draft: fixed a real bug, then extended it with user feedback.** Found live
   while manually testing the CV draft review card's fourth button: `prompt2-input-builder.service.ts`
   guarded `workspace.status !== 'cv_generation_running'` unconditionally, and nothing ever reset
   status back to `cv_generation_running` before a regenerate — so clicking "Regenerate CV draft"
   at `cv_draft_ready`/`paused_after_cv_draft` (the only statuses it's ever shown at) always threw
   a 400. This was a pre-existing bug, not introduced by this task. Fixed and extended per the
   project owner's request ("Regenerate CV draft надо поправить и делать новую генерацию но
   только с какими-то комментариями чтобы уходили в промпт"):
   - `Prompt2InputBuilderService.ALLOWED_STATUSES` now accepts `cv_generation_running` (first
     generation) alongside `cv_draft_ready`/`paused_after_cv_draft` (regenerate).
   - `buildPrompt2Input()` gained an optional `regenerateNotes` parameter. On a regenerate (status
     other than `cv_generation_running`), it best-effort reads the existing
     `02_targeted_cv_content.json` and appends both the previous draft and the user's notes as new
     `=== PREVIOUS CV DRAFT ===`/`=== USER FEEDBACK FOR REGENERATION ===` sections in
     `inputContext` — so the AI revises against concrete instructions instead of producing an
     unrelated fresh draft. Both blocks are skipped entirely on a first-time generation, even if a
     caller passed notes (defensive — the UI never does this, but the backend contract shouldn't
     silently mix up "first draft" and "revise this draft" semantics).
   - New optional `POST /workspaces/:id/generate-cv-content` body field `notes` (`GenerateCvContentDto`,
     `@ApiPropertyOptional`) threads through `Prompt2Service.generateCvContent()` to
     `buildPrompt2Input()`. The controller reads `dto?.notes` (not `dto.notes`) — Nest/Express
     resolves `@Body()` to `undefined`, not `{}`, when a request has no body at all (e.g. every
     pre-existing caller of this endpoint, including the original "Generate CV draft" button) —
     caught by a new e2e-equivalent unit test after the real e2e suite (`mvp-flow.e2e-spec.ts`)
     failed with exactly this `TypeError` on first run.
   - Frontend: `MainActionCard`'s `reasonNote` text input was previously decorative — `onAction`
     was only ever called with the button label, never the typed value (a pre-existing gap,
     found while implementing this). It now reads the input via a ref and calls
     `onAction(label, note)`; `main-action-panel.tsx`'s `dispatch(label, note)` passes `note`
     through only for `"Regenerate CV draft"`. The CV draft review card's `reasonNoteLabel`
     changed to "Feedback for regeneration (optional)" to match its new sole purpose.

Reason:
All three changes were raised by the project owner during TASK-091's Flow variant 3 setup, while
being walked through the CV draft review card's four buttons and their real backend behavior.
Pause and Mark-not-worth-applying were both judged unnecessary product surface once their actual
mechanics were explained (no-op vs. an audit trail nobody asked for); removing
`mark_not_worth_applying` in full (not just its UI button) was an explicit, separate confirmation
given it touches a Prisma enum migration and several requirement/architecture docs — the
same bar as ADR-026/027/028's ADR-overriding changes earlier in this same task. The Regenerate fix
turned from "explain what these buttons do" into "one of them doesn't actually work," which
justified fixing it in the same pass rather than filing it as a separate task, and the
notes-into-prompt extension was requested in the same breath as the fix itself.

Verified via the full `apps/api` (659/659 unit, 4/4 e2e) and `apps/web` (223/223) test suites,
both apps' `tsc --noEmit`/`lint` clean, and a live manual walkthrough of the Prisma migration
against the real dev database (confirmed zero affected rows before migrating, migration applied
cleanly, `prisma generate` succeeded once the locked query-engine file was released by stopping
the dev server first).

Source: project owner, 2026-08-03, during TASK-091's Flow variant 3 setup — "Mark not worth
applying - убрать и кнопку и функционал я думаю это не надо, Regenerate CV draft надо поправить и
делать новую генерацию но только с какими-то комментариями чтобы уходили в промпт".

Source: project owner, 2026-08-03, during TASK-091's Flow variant 2 manual verification pass.

## ADR-030 — GitHub Issues become the source of truth for task creation and execution

Status: `Accepted`

Decision:

GitHub Issues (in `strakhovdenya/jobflow-cv-pipeline`, tracked on the `JobFlow CV Pipeline` GitHub
Project, https://github.com/users/strakhovdenya/projects/1) replace `docs/07_task_backlog.md` +
`project-management/CURRENT_TASK.md` + `project-management/TASK_BOARD.md` as the live mechanism
for defining and tracking tasks, effective 2026-08-19. Concretely:

1. **Task spec.** A GitHub Issue's body is now the full spec (Context, Затрагивает, Docs to Read,
   Key Invariants, Acceptance Criteria, Test Requirement, Definition of Done, Dependencies) — the
   same field set `TASK-XXX` entries used in `docs/07_task_backlog.md`, per the format defined in
   `.claude/skills/issues/SKILL.md`'s "Формат Issue" (itself derived from that `TASK-XXX` format
   plus external best-practice research, `docs/research-github-issue-format-for-implementation.md`).
   This applies both to issues generated in bulk from an epic plan (`.claude/skills/issues`) and to
   a single ad-hoc issue created directly for a standalone task — same field set either way.
2. **`project-management/CURRENT_TASK.md` is removed entirely** (not kept as a pointer) — the
   active GitHub Issue itself is the single source of truth for "what is the active task and what
   does it require"; no local file duplicates it. Its final state remains in git history.
3. **`project-management/TASK_BOARD.md` is frozen as historical record** — execution state
   (open/closed, milestone, Project board column) is tracked by GitHub itself; "Current Focus"
   going forward means the Project's open issues, not a markdown section.
4. **`docs/07_task_backlog.md` is frozen as historical record** — no new `TASK-XXX` entries are
   added. The one open item at migration time, TASK-086, was migrated verbatim to
   [issue #215](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/215).
5. **`project-management/completed-tasks/`** stops receiving new archive copies — a closed GitHub
   Issue (with its full comment history) is itself the permanent record; no separate snapshot file
   is created on closure.
6. **Branch naming changes from `task/TASK-XXX-...` to `task/ISSUE-<n>-...`**, where `<n>` is the
   GitHub issue number — one identifier shared by branch, PR and issue, instead of a project-local
   `TASK-XXX` counter that has no direct link to GitHub. This supersedes ADR-014's naming pattern
   and ADR-025's `task/TASK-XXX-<epic-short-name>-base` epic-base-branch pattern going forward
   (epic base branches become `task/ISSUE-<tracking-issue-n>-<epic-short-name>-base`); ADR-025's
   other content (epic base branch requiring the same branch-protection status checks as `main`,
   the rule against branching a sub-task off a base branch while the prior sub-task's PR is still
   open) is unaffected and still applies verbatim, only the naming token changes.
7. **Root `CLAUDE.md`'s Operating Rules and Task Closure Checklist are rewritten accordingly** —
   "Task-file-first protocol" (write `CURRENT_TASK.md`) is replaced by an "Issue-first protocol"
   (ensure a fully-specced GitHub Issue exists — either pre-created via the `issues` skill from an
   epic plan, or created ad-hoc for standalone work — before the first implementation edit); the
   Task Closure Checklist's `TASK_BOARD.md`/`completed-tasks/`/`CURRENT_TASK.md` bullets are
   replaced by "close the GitHub Issue with its Acceptance Criteria checked" and "Project board
   reflects DONE". `project-management/TEST_LOG.md` and `project-management/CHANGELOG.md` are
   unaffected — they were never part of the old `TASK-XXX`/`CURRENT_TASK.md` mechanism and continue
   exactly as before.

Reason:

Prompted directly by two prior findings in this same session: (a) the `issues` skill's
GitHub-Issue output was found to be too thin to actually implement from (fixed by adopting the
`TASK-XXX`-equivalent field set, see `docs/research-github-issue-format-for-implementation.md`),
and (b) once that fix made GitHub Issues carry the same information depth as a `TASK-XXX` entry,
maintaining two parallel, manually-synced task-tracking systems (`docs/07_task_backlog.md` +
`CURRENT_TASK.md` + `TASK_BOARD.md` on one side, GitHub Issues + Project on the other) was flagged
as a real risk of drift with no corresponding benefit — GitHub already provides state (open/
closed), grouping (milestones), a board (Project), and permanent history (issue comments) for
free, which the markdown-file mechanism had to hand-maintain. History up to the migration date is
preserved as a frozen archive rather than deleted, per the project's existing "prefer archiving
over deleting project history" pattern (see how `docs/07_task_backlog.md`/`TASK_BOARD.md`/
`completed-tasks/` are treated above, as opposed to `CURRENT_TASK.md`, which had no historical
value beyond "what's active right now" and was removed outright once nothing pointed at it as
current).

Source: project owner, 2026-08-19 — "надо перейти для создания и выполнения тасок на новый
источник правды issues", following the `issues` skill body-format fix earlier the same session.

**Process note (added 2026-08-19, same session, pre-canary audit):** before running any real work
through the new flow, a global consistency pass over `CLAUDE.md`/`.claude/skills/issues/SKILL.md`/
the live GitHub Project found five gaps, fixed in the same session:

1. **Template duplication.** `CLAUDE.md`'s `## GitHub Issue Authoring Rules` had re-copied the
   issue Body template's field-by-field content (Docs to Read example, Key Invariants example)
   already fully defined in `.claude/skills/issues/SKILL.md`'s "Формат Issue" — the exact
   multi-file-drift risk this ADR exists to remove, reintroduced at the template level. Fixed:
   `CLAUDE.md` now only states the two rules that are genuinely about workflow (state-machine-table
   interpretation, Git/PR order) and points to the skill file for the template itself, no copy.
2. **Project `Status` field never moved off "Todo."** Verified live via `gh project item-list`:
   every open issue sat at `Status: Todo` regardless of whether work was in progress; only
   `Status: Done` was ever set, and only automatically by GitHub on issue close. Without an
   explicit step, the Project board — the whole point of which was portfolio-visible progress —
   could not distinguish "not started" from "actively being worked." Fixed: Branch-first protocol
   now sets `Status: In Progress` (`gh project item-edit` with the Project's real field/option IDs)
   as soon as the task branch is created.
3. **Branch-first protocol didn't guard against switching branches with uncommitted work.** Added
   an explicit check-and-commit-or-ask step before switching to `main` for a new task.
4. **Mixed-language template.** The issue Body template had one Russian header (`## Затрагивает`)
   among otherwise-English ones (`Docs to Read`, `Key Invariants`, etc.) — already propagated to
   every issue created so far. Renamed to `## Affects` in the skill template, `CLAUDE.md`, and
   retroactively in all 23 issues created up to that point (`#193`–`#215`, `#210`/`#211` excluded —
   they predate this Body format and use inline bold labels, not `##` headers).
5. **Commit-message example hardcoded `feat:`** as the only type in `## GitHub Issue Authoring
   Rules`'s Git/PR order — generalized to match whatever conventional-commit type the actual change
   is (`fix`/`docs`/`chore`/etc.), consistent with this repo's real `git log`.

Verified live against the real Project (`strakhovdenya/jobflow-cv-pipeline` project number 1):
Status field id `PVTSSF_lAHOAfTJXM4Bg0i5zhfypqs`, options `Todo=f75ad846` /
`In Progress=47fc9ee4` / `Done=98236657`, project id `PVT_kwHOAfTJXM4Bg0i5` — these are recorded
here (not just in `CLAUDE.md`) so a future session that needs to re-derive them can confirm against
this note rather than re-querying blind.

Source: project owner, 2026-08-19, requesting a "global analysis" of the rules before trusting the
new flow on a real task, then "исправь это" (fix it) once the findings were presented.

## ADR-031 — `export_blocked` remains advisory-only for Prompt 3 (extends ADR-026)

Status: `Accepted`

Decision:
`PrePdfCheckOutput.export_blocked` (`apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts`) stays
advisory-only. The field continues to be generated by Prompt 3 and surfaced to a human in
`03_pre_pdf_check.md`/`.json`, but the export path never reads or enforces it — confirmed by direct
code reading during this task: neither `DocumentExportService`, `HtmlRendererService`, nor
`document-export.controller.ts` inspects `export_blocked` anywhere. No code change is made to the
export path by this ADR; the decision is fixed here as a documented fact, not left implicit only in
a PRD.

`export_blocked`'s advisory-only status extends the same philosophy ADR-026 already established for
`readiness`: the AI's verdict never gates the pipeline by itself — only the human-facing gate
mechanism does (for `readiness`, that is "run-or-skip the pre-PDF check"; for `export_blocked`,
that is simply that a human reviewing `03_pre_pdf_check.md` before clicking "Export PDF" is the
actual control, not a field the backend enforces). Treating `export_blocked` as enforceable would
introduce a second, inconsistent blocking mechanism alongside ADR-026's existing gate, without a
corresponding product need identified — nothing in the Workspace Status Sequence or Prompt Pipeline
Rules ever called for it, and `paused_before_export → cv_pdf_generated` already requires a human to
have run or explicitly skipped the check.

If a future task identifies a real need to make `export_blocked` enforceable (e.g. hard-blocking
export on a `critical`-severity unresolved correction), that is a distinct code change to
`DocumentExportService` and a new decision — not something this ADR pre-authorizes or leaves open
by omission.

Reason:
Found and confirmed during Phase 9 (`project-management/prd/PRD-prompt3-calibration-against-manual-
baseline.md`, "Контекст и согласованность с проектом"): `export_blocked` has existed as a required,
validated field on `PrePdfCheckOutput` since Prompt 3 was first wired into the export path, but was
never actually consulted by any export-path code — an architectural loose end that had gone
undocumented rather than deliberately decided. Fixing this as a code change (enforcing the field)
was out of scope for a doc/prompt-calibration task and not something the project owner asked for;
the request was specifically to stop it being a silent, undecided gap. This ADR is the fixation of
that already-made call, per Issue #248's Acceptance Criteria.

Source: project owner, 2026-08-24, confirmed during the PRD-prompt3-calibration-against-manual-
baseline session; formalized in this ADR via Issue #248 (EPIC-24 Phase 9).

## ADR-032 — Candidate-profile placeholder guard is a separate deterministic check, not a Prompt 3 extension

Status: `Accepted`

Decision:
`CandidateProfileGuardService` (`apps/api/src/document-export/candidate-profile-guard.service.ts`)
is a standalone, non-AI check that scans every string field of the static
`CandidateProfileConfig` (`candidate-profile.config.ts` — candidate/contact, education, languages,
links, volunteering) for explicit placeholder markers (`Placeholder`, `TODO`, `FIXME`, `TBD`,
`XXX`, a leaked `see ... notes` reference, or an `internal note` reference — case-insensitive). It
is wired only into `DocumentExportService.exportCv()`, as a blocking precondition that runs
immediately after the existing status-precondition check and before any HTML/PDF rendering: a
failing check throws `BadRequestException` and the export never starts.

It is deliberately **not** wired into `POST /workspaces/:id/run-pre-pdf-check` (Prompt 3). This was
confirmed by direct code reading, not assumed: neither `Prompt3Service` nor
`prompt3-input-builder.service.ts` reads `candidate-profile.config.ts` at all — Prompt 3's AI
context never sees candidate/education/language/links/volunteering fields in the first place, so
there is nothing in that step for a guard over this specific file to check.

This guard is unrelated to and does not change ADR-026 (Prompt 3 mandatory-but-skippable gate) or
ADR-031 (`export_blocked` advisory-only): both of those govern Prompt 3's own AI-generated verdict,
which stays advisory. This guard checks static, already-known-bad data via plain string matching —
not an AI judgment — so a blocking, non-skippable behavior here does not reintroduce the problem
those two ADRs deliberately avoided (an AI verdict silently gating the pipeline). The two mechanisms
operate on different inputs (Prompt 3: AI-generated CV content; this guard: the static candidate
profile config) and can coexist without conflict.

Reason:
Even after ISSUE-257/258 fixed the concrete certifications-mapping and placeholder-data bugs found
in `candidate-profile.config.ts`, nothing prevented the same class of regression from recurring —
a future edit to that config could reintroduce a stray `Placeholder`/`TODO`/leaked internal note
with no automated signal before it reached a real exported PDF. Extending Prompt 3's AI context to
also inspect this file was considered and rejected: it would couple a cheap, deterministic
correctness check to an AI call (cost, latency, non-determinism) for data Prompt 3 has never needed
to see, and would blur ADR-026/031's carefully-scoped "AI verdict is advisory, human gate is what
blocks" model with an unrelated concern. A separate, blocking, code-only guard keeps the concerns
cleanly split: Prompt 3 judges CV *content* quality (advisory), this guard judges static candidate
*profile* data hygiene (blocking, because there is no legitimate reason placeholder text should
ever reach a real export).

Verified via `apps/api`'s full test suite (62/62 suites, 719/719 tests — including
`candidate-profile-guard.service.spec.ts`'s 6 cases and a new `document-export.service.spec.ts`
regression test for the blocking behavior) and `tsc --noEmit`/`lint` clean.

Source: project owner, 2026-08-25, via Issues #260–#262 (EPIC-25 · Фаза 2), following the same
guard-service pattern established by `evidence-guard.service.ts`.

## ADR-033 — Internal audit reasoning never becomes public CV text (standing principle)

Status: `Accepted`

Decision:
Every AI-facing pipeline prompt that produces both public, rendered CV content and internal/
diagnostic fields (evidence tables, gap analyses, overclaiming checks, coverage maps) must keep
those two kinds of output in strictly separate fields, and must say so as an explicit, named rule
— not leave it as an implicit expectation of "write a good CV."

Concretely, as of this ADR:
- `prompt2_v6.txt` (Prompt 2, targeted CV content generation) states this as a standing rule in its
  own `=== INTERNAL REASONING NEVER BECOMES PUBLIC CV TEXT ===` section: gap findings, unsupported-
  claim notes, and any reasoning about what the candidate's evidence does *not* cover belong only in
  `requirement_coverage.reason_if_not_shown`, `evidence_table` and `overclaiming_check` — never as a
  sentence inside any `cv_content.*` field. The distinguishing test given there is function, not
  vocabulary: a sentence describing what the work *is* stays; a sentence whose job is to state what
  the candidate *lacks* does not.
- `prompt3_v6.txt` (Prompt 3, pre-PDF check) gains a new, separately-tagged check (§6.2,
  `"[LEAK]"`) that scans every public CV field for exactly this failure mode after the fact — a
  second, independent line of defense in case Prompt 2's own instruction did not fully prevent it.

This is deliberately generalized into a standing principle rather than left as a single fix to one
field, because the same failure has now been observed twice, in two different fields, produced by
two different generation steps:
1. **Round 1** (pre-ISSUE-263): a raw internal review note — "see language risk notes" — leaked
   verbatim into public CV text. Fixed as a one-off wording correction at the time.
2. **Round 2** (this ADR, ISSUE-278 §G4): a self-disqualifying/gap-disclosure sentence (a bullet or
   summary line stating that some requirement is "not directly shown" or similar) leaked into public
   `cv_content` fields — a subtler instance of the identical underlying failure: the pipeline's own
   audit reasoning about the candidate's evidence gaps reaching a field the candidate did not intend
   as a confession of what they lack.

Any future prompt (Prompt 2, Prompt 3, or any later pipeline step producing both public and
internal output) that discovers a new instance of internal reasoning leaking into public text
should be treated as a further instance of this same class, not a new, unrelated one-off — fix the
generation-side prompt to name the rule explicitly for that field, and consider whether the
checking-side prompt needs a matching detection pass, per the two-line-of-defense pattern
established here.

Reason:
Patching each leak instance individually (as Round 1's fix did) treats a systemic prompt-design gap
as a series of unrelated typos, and offers no defense against the next field where the same failure
mode will eventually recur — which is exactly what happened between Round 1 and Round 2. Naming the
principle explicitly, in the generation prompt itself (where the leak originates) and as a matching
checker-side detection pass (where it is caught if the first line of defense fails), gives both a
concrete instruction the model can follow and a verifiable, testable backstop — consistent with how
this project already treats other recurring AI-output-quality issues (ADR-026/031's advisory-verdict
principle, ADR-032's guard-service pattern) as named, reusable rules rather than ad hoc fixes.

Source: project owner, via Issue #278 (Round 2 of the EPIC-25 Galaktica real-world QA pass,
`project-management/analysis-galaktica-real-world-cv-quality.md` "Round 2 (2026-08-25)" §G4),
2026-08-25.