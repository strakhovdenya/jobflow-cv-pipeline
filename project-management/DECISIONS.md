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

## ADR-034 — Manual note is a universal, explicitly-marked exception to the anti-overclaiming gate (extends ADR-033)

Status: `Accepted`

Decision:

`workspace.manualNote` becomes a forced-priority instruction across every pipeline step that
reads it: Prompt 1 (vacancy analysis), Prompt 2 (targeted CV content), skip-reason generation,
cover-letter generation, and any future step that consumes manual notes. Content derived from a
manual note is included in that step's output even when no `KnowledgeSource`/evidence supports
it — but it must always be distinguishable from AI-verified content:

1. Every AI-output schema for these four steps (`vacancy-analysis.schema.ts`,
   `targeted-cv-content.schema.ts`, `skip-reason.schema.ts`, `cover-letter.schema.ts`) gains a
   top-level `manual_note_forced_claims: { location: string; text: string }[]` field — always
   present, empty when nothing was forced — naming exactly which output field/bullet/paragraph
   carries manual-note-sourced content.
2. Wherever a schema already has a per-claim status enum (`TargetedCvEvidenceEntry.status`,
   `CoverLetterEvidenceAlignment.status`, `VacancyAnalysis` `must_have[].evidence_status` /
   `evidence_risks[].status`), it gains a new literal value `"user-forced, unverified"`, used
   instead of `"confirmed"` for entries sourced from the manual note.
3. `TargetedCvBullet` (Prompt 2 only) additionally gets `user_forced?: boolean`, since bullets are
   what actually render into the exported PDF — this is the field `apps/web` uses to badge
   individual CV lines before export.
4. `EvidenceGuardService` (and the equivalent check for the other three steps, where one exists)
   skips forced entries when collecting `needs_evidence` — they are a deliberate human override,
   not a gap to flag.
5. `apps/web` surfaces forced content wherever that step's output is reviewed by a human — CV
   draft review gets per-bullet badges from `user_forced`/the evidence table's forced status;
   analysis/skip-reason/cover-letter review surfaces a visible "user-forced" list built from
   `manual_note_forced_claims` — always before any export/send action.
6. **Prompt 3 (pre-PDF check) skips forced content rather than fighting it.** Prompt 3 does not
   read `manualNote` and so is not a force-priority step itself, but it *does* read Prompt 2's
   output, where forced bullets now live — and its §2/§2.1/§3 evidence and overclaiming passes
   would otherwise flag every forced bullet as unconfirmed and emit a correction removing it,
   closing a loop where the human forces content in and the very next step tells them to take it
   out. So a bullet marked `"user_forced": true` is skipped by those three sections, never counts
   toward `export_blocked`, and never lowers `readiness`; instead Prompt 3 reports once in
   `overall_notes` how many forced claims the draft carries and which fields hold them, so the
   human re-reads them before export. Surfacing them is the check. The exemption is from evidence
   and overclaiming judgement only — a forced bullet is still subject to §6/§6.1/§6.2's wording
   checks (leaked audit reasoning, banned vocabulary), which apply to every public field
   regardless of evidence, so ADR-033 remains fully enforced over forced content too.

ADR-033 ("internal audit reasoning never becomes public CV text") is unaffected: the forced
marking is provenance metadata stated as fact, the same pattern ADR-033 already allows for
`experience_type`/`safe_label` — it is not audit reasoning about a gap.

Reason:

Found live on workspace `Jobgether/Software_Engineer_Backend_Data_Layer` (2026-08-26): the
project owner added a manual note ("EGZ добавляй") expecting it to appear in the generated CV;
Prompt 2 correctly (per the anti-overclaiming rules in force at the time) refused, since no
evidence supported the claim. After the trade-off was explained, the project owner explicitly
confirmed they want manual notes to carry force-priority — and specifically requested this apply
across every step that reads `manualNote`, not only Prompt 2, while insisting forced content must
never be presented as AI-verified. A uniform, per-step-tailored marking mechanism (rather than a
blanket bypass) is the smallest change that satisfies both requirements without reintroducing the
exact failure ADR-033 was written to prevent — an unverified claim silently presented as
confirmed.

Source: project owner, 2026-08-26/2026-08-27, discussion of the EGZ case on
`Jobgether/Software_Engineer_Backend_Data_Layer`; ADR text drafted and approved before
implementation per the Plan-first protocol, via Issue #286.

## ADR-035 — `project-management/TEST_LOG.md` frozen; test evidence moves to GitHub Issue comments (extends ADR-030)

Status: `Accepted`

Decision:

`project-management/TEST_LOG.md` — the manual verification journal every task's closure appended
to per the Task Closure Checklist (commands, PASS/FAIL/PARTIAL, evidence) — is frozen as of
2026-09-04, at 11,009 lines. New test evidence is recorded as a comment on the relevant GitHub
Issue instead, not appended to this file. Existing content is not deleted or rewritten — same
historical-archive treatment ADR-030 already gave `TASK_BOARD.md`/`docs/07_task_backlog.md`/
`completed-tasks/`.

Concretely:
- Root `CLAUDE.md`'s Testing Rules bullet ("Record important manual checks in
  `project-management/TEST_LOG.md`") is replaced with recording test evidence as a GitHub Issue
  comment before closing the issue.
- The Task Closure Checklist's `TEST_LOG.md`-entry requirement is replaced with a requirement that
  a dated, issue-number-referencing comment with the same content (commands, result, evidence) is
  posted on the issue before closing.
- `TEST_LOG.md` itself gained a freeze notice at the top pointing here, per the same pattern as the
  other ADR-030-frozen files.
- The autonomous Ralph loop (`.claude/ralph/core.js`) is directly affected: its controller
  previously wrote a TEST_LOG entry via plain `fs.appendFileSync` (`appendTestLogEntry()`) after
  every agent DONE verdict — no GitHub permissions involved, since the agent itself never touches
  git/gh (see `.claude/ralph/README.md`). This is replaced by `postTestEvidenceComment()`, which
  posts a `gh issue comment` instead — requiring no new GitHub permissions, since the controller
  already posts issue comments elsewhere (`postBlockedComment()`, `postOutOfScopeNote()`). This
  landed combined with the (separately decided, same session) Acceptance-Criteria self-report
  comment introduced on `task/ISSUE-346-...`/#346 — one comment per DONE, not two, covering both
  the AC reconciliation and the test-evidence record. The same honesty framing the old TEST_LOG
  entry carried is preserved verbatim: explicitly labeled "Agent-reported DONE — self-reported by
  the autonomous agent, not independently re-verified by the controller."

Reason:

`TEST_LOG.md` was the one file ADR-030 explicitly left "unaffected — continues exactly as before"
when task tracking moved to GitHub Issues, on the reasoning that it wasn't part of the old
`TASK-XXX`/`CURRENT_TASK.md` mechanism. In practice it grew past 11,000 lines with no rotation or
archival, and its content mostly duplicates what GitHub already surfaces: automated pass/fail is
visible per-PR in the Actions tab, and manual verification is really scoped to one specific task —
it reads more naturally next to that task's own Acceptance Criteria (i.e. as a comment on the
Issue) than in one ever-growing shared file nobody rereads in full or archives. This is the same
underlying migration principle ADR-030 already applied to `TASK_BOARD.md`/`CURRENT_TASK.md`/
`docs/07_task_backlog.md` — GitHub already provides the durable, per-item record for free — applied
to the one file ADR-030 had carved out as an exception.

Source: project owner, 2026-09-04, prompted by the question "зачем нам TEST_LOG.md на 10000+
строк" while reviewing the Ralph loop's handling of issue #346; formalized via Issue #355.

## ADR-036 — One download mechanism for all CV export artifacts: registration-time downloadFileName + generic artifact endpoint

Status: `Accepted`

Decision:
All four CV export artifacts (design HTML, design PDF, ATS HTML, ATS PDF) are downloaded via a
single, already-existing endpoint: `GET /artifacts/:id/download`
(`apps/api/src/artifacts/artifacts.controller.ts`). The human-readable filename in the
`Content-Disposition` header (`Strakhov_Denys_{company}_{role}_CV[_ATS].{ext}`) is determined
entirely by `GeneratedArtifact.downloadFileName`, set once at artifact-registration time inside
the respective renderer/export service, using `buildCvDownloadFileName()` (`cv-download-filename.ts`).

Concretely, after this decision:
- `HtmlRendererService` and `AtsHtmlRendererService` already set `downloadFileName` at registration
  (landed in #346). `DocumentExportService.exportCv()` now does the same for `cv_export_pdf` and
  `cv_export_ats_pdf`, with `variant: 'design'`/`'ats'` and `extension: 'pdf'` respectively.
- `DocumentExportService.exportCv()` also adds `include: { company: true, jobVacancy: true }` to
  its workspace lookup — a gap #346 had already fixed for the HTML renderers but had left open in
  this service, since #346 never touched it.
- `GET /workspaces/:id/download-cv` and `GET /workspaces/:id/download-cv-ats`
  (`DocumentExportController`) are deleted (not deprecated-kept), along with their shared
  `resolveDownloadablePdf()` helper, the `DownloadableWorkspace` interface, and the now-dead
  imports (`ForbiddenException`, `Get`, `Res`, `fs`, `path`, `ArtifactsService`, `PrismaService`,
  `buildCvDownloadFileName`). Confirmed no remaining caller in `apps/web`, e2e tests, or docs
  before deletion.
- `apps/web`'s download buttons (`findLatestCvPdfDownloadUrl`/`findLatestCvAtsPdfDownloadUrl` in
  `pipeline-view-model.ts`) already call `GET /artifacts/:id/download` — no frontend change needed.
- `canonicalFileName` values (`04_cv_export.pdf`, `04_cv_export_ats.pdf`) are not changed — only
  `downloadFileName` gains a value; on-disk paths and DB artifact-type matching are unaffected.

The alternative — keeping the dedicated `/download-cv`/`/download-cv-ats` endpoints and rewiring
the frontend onto them (plus adding two more for the HTML variants) — was rejected: it would grow
API surface with CV-specific one-off endpoints that duplicate what the already-general,
already-used generic artifact-download endpoint does for every artifact type, for no benefit.
ADR-006 (canonical internal artifact names) and ADR-012 (Step 4 export is deterministic, never
creates an `AiRun`) are prior art; this decision only changes how download filenames are assigned
and which endpoint is used — neither invariant is affected.

Root cause of the bug this decision fixes: `#346` added `buildCvDownloadFileName()` and wired it
into the dedicated `/download-cv`/`/download-cv-ats` endpoints, but the real `apps/web` UI calls
`GET /artifacts/:id/download` — a wiring that predates any CV-specific naming and was never
changed. `#346`'s own verification tested the dedicated endpoints directly via `curl`, never the
actual browser download buttons, so the mismatch was invisible until live-testing #346's merged PR
by clicking the UI buttons and observing the files that landed on disk.

Reason:
Found by the project owner via real-world manual click-through after #346 merged — the browser
download buttons still produced files named `04_cv_export.pdf`/`04_cv_export_ats.pdf` instead of
the `Strakhov_Denys_...` names #346 was supposed to deliver. Investigation confirmed the two-path
bug: the UI called the generic endpoint, which fell back to `canonicalFileName` because
`downloadFileName` was never set on PDF artifact registrations. Consolidating onto one download
mechanism (the one the UI already uses) at the registration-time naming level eliminates the
divergence class entirely — a future artifact type gets the right download filename for free by
setting `downloadFileName` at registration, without needing its own dedicated endpoint.

Source: project owner, 2026-09-04, discovered live-testing #346's merged PR; formalized via
Issue #356.

## ADR-037 — Regenerate CV draft with selected Prompt 3 findings; unconditional rollback to cv_draft_ready; stale pre-PDF-check invalidation

Status: `Accepted`

Decision:

Prompt 3 (pre-PDF check)'s `corrections[]` findings can now be selectively fed back into a Prompt 2
regenerate, closing the loop this project's own ADR-029 `regenerateNotes` mechanism left half-open
(regenerate was only ever reachable before Prompt 3 had run). Concretely:

1. **No change to Prompt 3 itself.** `prompt3_v6.txt`'s `corrections[]` was already the safe,
   directly-actionable subset of findings (structural/uncertain findings stay prose-only in
   `overall_notes` — see its own §0.1/§0.2/§1.1 "do NOT emit a correction" rule); this feature only
   lets a human select some of those existing entries and serialize them into the existing `notes`
   string `generateCvContentAction`/`POST /workspaces/:id/generate-cv-content` already accepts
   (ADR-029) — no new backend field or endpoint.

2. **`Prompt2InputBuilderService.ALLOWED_STATUSES` gains `pre_pdf_check_ready` and
   `paused_before_export`** — the two statuses reachable once the pre-PDF check gate (ADR-026) has
   already been entered. `Prompt2Service.generateCvContent()` needed no other change: its success
   path already writes `status: cv_draft_ready` unconditionally via a direct Prisma update,
   bypassing `WorkspaceStatusService.assertValidTransition()` on that path — so the "roll back to
   `cv_draft_ready`" behavior fell out for free from existing code once the allow-list admitted the
   two new starting statuses. `WorkspaceStatusService.TRANSITIONS` was still updated to add
   `pre_pdf_check_ready -> cv_draft_ready` and `paused_before_export -> cv_draft_ready` — not
   because runtime code checks it on this path today, but because root `CLAUDE.md`'s Workspace
   Status Sequence and `apps/api/CLAUDE.md`'s "do not silently change the workspace status machine"
   rule both require the table to reflect every real transition, so a future refactor that starts
   validating this path generically doesn't reject a transition the product actually depends on.

3. **Stale `03_pre_pdf_check.md/json` invalidation.** Found during `/code-review` before this
   landed, not assumed: `HtmlRendererService.readCorrections()` reads `03_pre_pdf_check.json` by a
   fixed canonical on-disk path, with no check that it still matches the current CV draft. Without
   invalidation, a workspace could regenerate from `pre_pdf_check_ready`/`paused_before_export`
   (producing a new `02_targeted_cv_content.json`), then clear the pre-PDF-check gate again via
   **skip** (ADR-026 — skipping requires no new Prompt 3 run) rather than re-running the check, and
   `DocumentExportService`'s export path would silently apply the *previous* draft's corrections
   (`field_path`-keyed, whole-field overwrite) onto the *new* draft — garbled or
   re-introduced-overclaiming content in the exported PDF, with no error. Fixed: whenever
   `generateCvContent()` starts from either post-gate status, on success it now also (a) deletes
   `03_pre_pdf_check.md`/`.json` from disk (`ArtifactStorageService.deleteFileIfExists()`, new
   method — best-effort, ENOENT-safe) and (b) marks their `GeneratedArtifact` rows non-latest
   (`ArtifactsService.markNonLatest()`, new method — kept in `ArtifactsService`, not inlined as a
   direct Prisma call in `Prompt2Service`, per ADR-017's module-boundary rule: `ArtifactsService`
   owns `GeneratedArtifact` writes). This invalidation is deliberately **non-fatal and
   best-effort**: it runs after the new CV draft is already registered and the `PromptRun` already
   complete, so a failure here (e.g. a locked file) is logged as a warning rather than blocking the
   regenerate response — worst case, the exact pre-fix staleness risk persists for that one call,
   not a new, worse failure mode. The two file deletes use `Promise.allSettled` (not `Promise.all`)
   so one delete failing doesn't skip `markNonLatest` for both artifact types, which would otherwise
   leave a `GeneratedArtifact` row `isLatest: true` pointing at a file the *other*, successful
   delete already removed.

4. **`user_forced` (ADR-034) exclusion is entirely client-side, no new backend endpoint.**
   `pre-pdf-check-panel.tsx` already client-side-fetches `03_pre_pdf_check.json` via the generic
   `/artifacts/:id/download` route; it now does the same second fetch for the latest
   `targeted_cv_content_json` artifact and walks each `corrections[].field_path` against that JSON's
   `cv_content` object as a generic property/array-index path (not three hardcoded per-field
   regexes, which would silently fail to protect a future bullet-bearing field never added to an
   allowlist) to check whether the field being corrected belongs to a bullet marked
   `user_forced: true`. Such corrections are never rendered as a selectable checkbox — Prompt 3
   already deliberately skips evidence/overclaiming judgement on forced bullets (ADR-034 §6), so
   looping a "fix" for one back into Prompt 2 would silently undo a human's forced-priority
   instruction, exactly what ADR-034 exists to prevent.

5. **All three buttons in `pre-pdf-check-panel.tsx`** (Run, Skip, the new "Regenerate CV draft with
   selected feedback") were migrated from local, hand-written `buttonClass`/`secondaryButtonClass`
   Tailwind strings onto the shared `ActionButton` component (`main-action-card.tsx`) — found live
   during this task's own re-review that the pre-existing Run/Skip buttons already had the same
   "local classes silently drift from the shared component" bug ADR-036's sibling PR (#361, cover
   letter panel) had just fixed elsewhere; fixed here in the same change rather than left as a
   second occurrence of an already-diagnosed class of bug.

Reason:

The gap this closes was scoped and resolved as an analysis task first (#290, closed via its own
comment rather than a separate PRD/plan doc — judged proportionate to the small, concrete resulting
change, following the same standalone-issue-vs-epic judgment call this project already applies
elsewhere). Implementation surfaced two further issues neither the analysis nor the first
implementation pass caught: the stale-`03_pre_pdf_check.*` correctness bug (found only by a
dedicated `/code-review` pass against the real diff, not by design review alone) and the
already-existing `pre-pdf-check-panel.tsx` button-styling bug (found by cross-referencing this
task's own new buttons against the just-fixed cover-letter-panel precedent). Both are folded into
this same ADR rather than filed as separate follow-ups, since both are direct consequences of (the
staleness bug) or directly adjacent code touched by (the button styling) this same change — matching
root `CLAUDE.md`'s "work surfaces mid-task" rule for issues that are actually required for the
active change's own correctness, not unrelated scope creep.

Verified via the full `apps/api` (951/951) and `apps/web` (282/282) test suites, both apps'
`tsc --noEmit`/`lint` clean. Manual/visual verification (Playwright MCP or otherwise) was explicitly
excluded from this issue's scope per the project owner's instruction — the project owner performs
that pass themselves before merging the PR.

Source: project owner, via Issue #290 (analysis) and Issue #363 (implementation), 2026-09-05/06 —
"а что значит 3/3 когда я спросил на каком шаге остановился ральф?" prompted the manual
`/code-review` re-run (after the autonomous Ralph loop's own post-DONE review hit a Claude session
usage limit) that found the stale-artifact bug this ADR documents.

## ADR-038 — Workspace status is enforced: single `transition()` writer, atomic compare-and-set claims, one in-flight PromptRun per step

Status: `Accepted`

Decision:

1. **One writer for `ApplicationWorkspace.status`.** `WorkspaceStatusService.transition(id, from,
   to, { data, guard, client })` validates `from -> to` against `TRANSITIONS` (400 on an invalid
   move) and updates with `updateMany({ where: { id, status: { in: from } } })`, throwing
   `ConflictException` (409) when `count !== 1`. Prompt 1/2/3/5, skip-reason, cover-letter,
   review-gates, export and application-tracking all use it; none of them writes `status` through
   `prisma.applicationWorkspace.update` any more. `client` lets review-gates run it inside an
   interactive `$transaction` together with the `DecisionOverride` audit row, and `guard` lets
   `approve_apply` / `approve_maybe` / `change_to_skip` / `override_to_apply` only succeed while
   `currentDecision` is still the value they validated (closes the approve-vs-change_to_skip race).
2. **Prompt 1 is gated.** `runAnalysis` accepts only `source_saved` (normal), `failed` (retry of
   a failed analysis — the only retry path that existed) or `analysis_running` (recovers an
   analysis whose process died mid-way; a live run is rejected by the unique index of point 4, so
   the self-transition needs no status-level guard). It creates the `PromptRun` first (the
   unique index below answers 409 while another run is in flight, before any workspace state is
   touched) and then claims `analysis_running`, so it can no longer be re-run from `cv_pdf_generated`/`skipped`/
   `paused_after_analysis` (which reset the gate and burned tokens, bypassing "Prompt 2 blocked
   until approval"). Anything unexpected after the claim fails the run and moves the workspace to
   `failed` instead of leaving it stuck in `analysis_running`.
3. **Export claims `export_running`.** `exportCv` moves `paused_before_export -> export_running`
   atomically before rendering; the legacy `export_running` entry point (ADR-026) needs no claim.
   Success -> `cv_pdf_generated`, any failure -> `failed`.
4. **One in-flight PromptRun per workspace + step.** Steps without a distinct in-flight status
   (Prompt 2/3/5, skip-reason, cover-letter) are protected by a partial unique index on
   `PromptRun(workspaceId, promptStep) WHERE status IN ('pending','running')`
   (migration `20260924120000_prompt_run_single_active_per_step`, not expressible in
   `schema.prisma`; Prisma does not report it as drift). `PromptRunsService.create` maps the
   violation to 409 and first fails in-flight runs older than 15 minutes (`STALE_PROMPT_RUN_MS`)
   so a crashed process cannot block a step forever. The migration first marks any in-flight rows
   left over from before it as `failed`, since duplicates would make the index creation abort.
5. **`TRANSITIONS` now reflects every real write** (nothing new is invented, no enum values added):
   `failed -> analysis_running`, `paused_before_export -> export_running`, regenerate self-loops
   (`cv_draft_ready -> cv_draft_ready`, `paused_after_cv_draft -> cv_draft_ready`), and the
   application-tracking moves (`-> ready_to_apply | applied | rejected | archived`) that
   `ApplicationTrackingService` already performed but the table never listed.
6. **A failed regenerate no longer strands the draft.** When Prompt 2 fails while regenerating an
   existing draft (start status other than `cv_generation_running`), the workspace keeps its
   current status instead of moving to the `failed` dead end; only a failed *first* generation
   moves to `failed`. The failed `PromptRun`/`AiRun` still record what happened.
7. **Cleanup never masks the original error and never leaves a run blocking its step.** Every step
   that creates a `PromptRun` wraps the rest of the method so an unexpected error (disk, DB,
   artifact registration) marks the run failed via `PromptRunsService.failSafely()` (logs instead
   of throwing, and only touches a run that is still pending/running — it never overwrites a
   run that already completed) and rethrows the original; Prompt 1 additionally moves the workspace from
   `analysis_running` to `failed` when it had claimed it. Export marks the workspace `failed` the
   same way (`markExportFailed`). Without this the unique index of point 4 would block a step for
   up to 15 minutes after any such error.

Not decided here: the broader `failed` dead end (other exits from `failed`) remains ISSUE-307 —
including a transient Chromium error during export, which moves the workspace to `failed` exactly
as it did before this ADR (a `code-review` pass suggested reverting to `paused_before_export`
instead; deliberately left for #307 because it is a state-machine decision, not part of
enforcing the existing machine).

Reason:
Found in the 2026-09-23 code review (ISSUE-401): the state machine was documented but not
enforced — `assertValidTransition` was called from one place, Prompt 1 ran from any status, and
every AI/export step followed read, check, long AI/Chromium call, unconditional write, so a
double click created two `PromptRun`/`AiRun` and doubled token spend. Compare-and-set on the
status is the cheapest correct guard where a distinct in-flight status exists; the partial unique
index covers the steps where adding a status would have meant a new enum value.

Source: project owner, 2026-09-24, Issue #401.

## ADR-039 — Artifact registration and import confirm are atomic; GeneratedArtifact invariants are enforced by the database

Status: `Accepted`

Decision:

1. **`ArtifactsService.register(dto, tx?)` is one transaction.** It takes `SELECT ... FOR UPDATE`
   on the `ApplicationWorkspace` row, then reads the previous latest / max version, demotes the
   previous latest and creates the new row. The lock serializes concurrent registrations of one
   workspace (READ COMMITTED alone would let two of them read the same max version). With `tx`
   the registration joins the caller's transaction and the lock is held until it ends; without it
   the method opens its own.
2. **Database backstop.** Migration `20260924130000_generated_artifact_unique_version_and_latest`
   adds a unique index on `(workspaceId, artifactType, version)` (declared in `schema.prisma`) and
   a partial unique index on `(workspaceId, artifactType) WHERE isLatest = true` (SQL only, like
   ADR-038's PromptRun index). Rows written by the old non-atomic `register()` are repaired first:
   duplicate versions are renumbered in `(version, createdAt, id)` order and, if several rows were
   latest, only the highest version stays latest.
3. **Import confirm is all-or-nothing.** `ImportService.confirmImport` reads and hashes every file
   and creates the workspace folder first, then runs `Company`, `JobVacancy`, `ApplicationWorkspace`
   and every artifact registration in a single `$transaction` (30 s timeout). On any failure the
   folder it created is removed (a folder that already existed is left alone; a cleanup failure is
   logged, never masks the original error), so `sourceImportedPath` is never persisted for a
   half-imported folder and a repeated confirm is possible. A `workspaceSlug` collision maps to 409.
4. **`createWorkspace`** registers the `vacancy_source` artifact inside the same transaction as the
   company/vacancy/workspace rows.

Reason:
Found in the 2026-09-23 code review (Issue #402): the import wrote five kinds of rows without a
transaction, so a failure left orphan Company/folder/workspace rows and the duplicate check then
reported the folder as already imported; `register()` demoted and created in two statements, so
parallel registrations could produce two `isLatest` rows or a version collision.

Source: project owner, 2026-09-24, Issue #402.

**Amendment (2026-10-03, ISSUE-498): `PromptTemplate` has one active version per step and a unique `(step, version)`, both enforced by the database**

1. Migration `20261003120000_prompt_template_single_active` adds a unique index on `(step, version)` (declared in `schema.prisma` as `@@unique([step, version])`) and a partial unique index `PromptTemplate(step) WHERE "isActive" = true` (SQL only, like ADR-038's `PromptRun` index and point 2 of ADR-039's `GeneratedArtifact` index). Before creating them, the migration repairs existing data: for every step it keeps only the highest active version active. A pre-existing duplicate `(step, version)` pair is not repaired; creating the unique index then fails and the migration aborts, because choosing which of two rows with identical identity to renumber is a content decision.
2. `PromptTemplatesService.activate` runs its lookup, the deactivation of the other active versions of the step and the activation of the target in one interactive `$transaction`, so a failure in the deactivation never leaves the target active, and a step is never without an active version for longer than the transaction. `findActive` orders by `version` descending, so it is deterministic even if the index is ever dropped.
3. `PromptTemplatesService` is the only writer of `PromptTemplate.isActive` in `apps/api/src`; other modules read a template through `findActive`. `prisma/seed.ts` (`seedPromptTemplates`) writes every template in its own transaction and, before making one active, turns off every other active version of its step, so seeding never trips the index — also over a database that already holds a higher active version (an older branch, a prompt rollback). The seed list still keeps one active version per step and no repeated `(step, version)` pair.

Alternatives considered:
- Only make `activate` transactional, without the partial index — rejected: a manual DB edit or a second code path still produces two active versions, which `findFirst` then resolves arbitrarily.
- Declare `@@unique([step, isActive])` in `schema.prisma` — rejected: it would also forbid more than one inactive version per step, which is the normal state of the table.
- Renumber duplicate `(step, version)` rows in the migration, as the `GeneratedArtifact` migration does — rejected: artifacts are generated rows whose version is just a counter; a prompt template's version is a human-visible identity, so silently renumbering would change which prompt version a past run appears to have used.

Reason:
The "one active version per step" rule decides which prompt every paid AI call uses, yet lived only in code that did two separate writes; two parallel activations or a manual edit could leave two active versions and the step would silently alternate between prompts (audit 2026-09-24, P2-009). The database is the only place that can make the rule unbreakable.

Source: project owner, via Issue #498.

## ADR-040 — AI steps run as BullMQ background jobs; endpoints answer 202 + jobId

Status: `Accepted`

Decision:

1. **Every AI step is a background job.** Prompt 1 (`run-analysis`), Prompt 2 (`generate-cv-content`, including regenerate), Prompt 3 (`run-pre-pdf-check`), Prompt 5 (`run-final-check`), skip-reason (`confirm-skip`) and cover letter (`generate-cover-letter`) no longer run inside the HTTP request. The endpoint calls `AiStepsService.enqueue()` and answers `202 { jobId }`; a single `AiStepWorker` on the `ai-step-queue` BullMQ queue (Redis) calls the same `Prompt*Service`/`SkipReasonService`/`CoverLetterService` methods as before. Export (Step 4) stays synchronous — it is not an AI step (ADR-012).
2. **Broker: BullMQ + Redis** (already in the project), not RabbitMQ — a second broker would add a service and a rewrite of `QueueService`/worker for no benefit at one worker.
3. **No retries, no stalled re-runs.** Default job options are `attempts: 1`; the worker uses `maxStalledCount: 0`. A retry would repeat a paid AI call; a step whose process died is failed and the user re-runs it. ADR-038 (`PromptRun` unique index, `failSafely`, stale 15 min) is unchanged and remains the backstop.
4. **Duplicate protection in the queue:** `AiStepsService.enqueue()` first answers 404 for an unknown workspace, then uses one deterministic BullMQ job id per workspace + step (`<step>-<workspaceId>`; `:` is not allowed in custom ids), so two parallel requests cannot both be queued. An open (waiting/active/delayed/prioritized) job with that id gives 409; a finished one is removed so the id can be reused. `activeJob` is found by looking up the six ids of the workspace, not by scanning the queue. Status/gate errors (400/409 from the step service itself) now surface as a *failed job* (`failedReason`), not as the HTTP response of the enqueue call. A step service still reports its own failures (validation, provider) in its return value, so a `completed` job can carry `success: false`.
5. **Job API:** `GET /workspaces/:id/jobs/:jobId` (state, `returnValue`, `failedReason`; 404 for a job of another workspace) replaces `run-analysis-async` and `analysis-job/:jobId`. `GET /workspaces/:id` gained `activeJob: { jobId, step, state } | null` so a page reload during a running step keeps showing progress (a regenerate leaves the status at `cv_draft_ready`, so status alone cannot tell). If Redis is down, `activeJob` is `null` and logged; enqueueing answers 503.
6. **`REDIS_URL` is now required for AI steps** (503 without it). `QUEUE_PREFIX` (optional) isolates queues that share one Redis — the e2e suites use their own so a running dev server never picks up their jobs. `docker-compose.yml`'s `app` service gets `REDIS_URL=redis://redis:6379`; CI's e2e job gets a Redis service.
7. **Frontend:** the separate "Start analysis (async)" button is removed; all AI buttons use `useAiStepRunner` (`apps/web/src/lib/use-ai-step-runner.ts`), which enqueues via the server action, polls `getAiJobAction` every 2 s (up to 30 min, tolerating isolated poll failures), refreshes the page on a terminal state and adopts `activeJob` after a reload. If polling itself fails (3 consecutive failures, or 30 minutes) it stops without refreshing and tells the user the step may still be running and to reload — it never presents a possibly running job as finished; the backend 409 covers an early second click.

Reason:
Prompt 2 takes ~6 minutes; the browser/Next request timed out, the UI showed an error while the backend kept working, and a second click hit 409 "already running" (ADR-038) although the first run completed. Moving the work out of the request removes the timeout class of failure entirely.

Source: project owner, 2026-09-24, Issue #427.

## ADR-041 — Independent acceptance verifier in CI (OpenAI/Codex), verdict computed by a script

Status: `Accepted`

Decision:

1. **Independent acceptance check.** `.github/workflows/acceptance-verifier.yml` runs on `pull_request` for branches `task/ISSUE-<n>-*` opened from this repository (never `pull_request_target`, never forks). A different model (OpenAI, `openai/codex-action` pinned to a commit SHA, `codex-version` pinned, model from repo variable `VERIFIER_MODEL`) reads the linked Issue (Key Invariants, Acceptance Criteria, Test Requirement, Definition of Done), the diff and the checkout in a read-only sandbox and returns strict JSON (`.github/verifier/schema.json`). It fixes nothing and proposes nothing. It complements `.claude/agents/verify.md`, which only covers build/test mechanics from inside the author's session.
2. **The model never decides pass/fail.** The schema has no verdict field. `scripts/acceptance-verdict.js` computes it: PASS only with at least one criterion, all `PASS`, and empty `test_tampering`. Zero criteria, invalid JSON, a missing file or a failed `verify` job all mean FAIL (fail closed). `UNVERIFIABLE` is a non-pass unless the PR carries the `manual-verified` label (it never excuses `FAIL` or `test_tampering`).
3. **Trust boundaries.** `OPENAI_API_KEY` exists only in job `verify`; job `report` (`pull-requests: write`) has no key. Prompt, schema and the verdict script are checked out from the BASE commit, not the PR head, so a PR cannot weaken its own check; `.github/` and `.claude/` are owned via `CODEOWNERS` and count as a high-risk zone. Untrusted values (branch name, Issue text) reach shell only through `env:`. All Issue/diff content is declared data, not instructions, in the prompt.
4. **Advisory first, then required.** `report` always publishes (and updates in place) one PR comment. It exits 1 on a non-pass only when repo variable `VERIFIER_ENFORCE` is `true`; switching to a required check is a variable plus a branch-protection setting, no code change.
5. **Known consequence:** the PR that introduces the workflow has no prompt/script on its base, so the verifier reports FAIL there (advisory, does not block).

Reason:
The author model filled in its own Task Closure Checklist and no independent party compared the PR with the Issue's Acceptance Criteria. A second model with a clean context and a deterministic verdict removes both self-grading and model-controlled verdicts.

Source: project owner, 2026-09-24, Issue #429.

**Amendment (2026-09-24, ISSUE-424 branch): runs after CI via `workflow_run`; structured, machine-checked references.**

1. **Trigger.** `acceptance-verifier.yml` now runs on `workflow_run` of the `CI` workflow (`completed`, only `event == pull_request`, same-repo `task/ISSUE-<n>-*` head) instead of `pull_request`, so "checks are green" is judged from real results: `verify` writes `.verifier/ci.json` (CI conclusion, check-runs and commit statuses of the head commit). `workflow_run` always executes the workflow file, prompt, schema and verdict script from the default branch, so the earlier "read from the BASE commit" guarantee still holds (for a PR into a `task/*-base` branch the files come from `main`). The PR head is checked out only as data (read-only sandbox, never executed). A run whose PR head has moved on since CI started stops early (`stale`) and leaves the newer run to report.
2. **Result surface.** A `workflow_run` job is not attached to the PR, so `report` publishes the PR comment and a commit status `Acceptance Verifier` on the head SHA (`success` on PASS; on non-PASS `failure` only when `VERIFIER_ENFORCE=true`, otherwise `success` with an "Advisory" description). To make it required, require the `Acceptance Verifier` status in branch protection (not the `Report` job). Consequence: PRs from non-`task/ISSUE-*` branches never get this status, so requiring it blocks them; add it to a ruleset scoped to `task/ISSUE-*` if that matters.
3. **Report shape (`schema.json`).** Every Acceptance Criteria, Definition of Done and Test Requirement item is its own entry; `evidence` is replaced by `summary` plus `refs: [{path, line, quote}]`. `risk_zones` is a closed enum (`auth`, `secrets`, `ci`, `migrations`, `fs_shell_sinks`, `state_machine`, `dependencies`, `adr_034_manual_note`, `none`; at least one value, `none` only alone). `test_tampering`, `risk_zones` and `out_of_scope_files` are always rendered, as "none" when empty. The prompt requires cross-layer criteria (field/type/payload shared between `apps/web` and `apps/api`) to cite both sides and compare names.
4. **References are checked by code, not trusted.** After the model step, `acceptance-verdict.js --check-refs` verifies each reference against the PR checkout (path inside the checkout, not under `.git`/`trusted`, regular file, no symlinks, at most 2 MB, line in range, `quote` present on that line ignoring whitespace) and writes `refs-problems.json`. The verdict is FAIL if any reference is bad, if a PASS entry has no references, or if the check did not run.
5. **Bootstrap.** As before, the PR that changes these files is judged by the previous version on the default branch (advisory FAIL is expected there); the new behaviour applies from the next PR after merge.

**Amendment (2026-09-24, ISSUE-435): a failed CI check on the PR head is always FAIL.**

1. **Rule.** `scripts/acceptance-verdict.js --ci ci.json` reads the check-runs and commit statuses that `verify` collected into `ci.json` and adds a failure for each check-run with conclusion `failure`, `cancelled`, `timed_out`, `action_required` or `startup_failure`, and each commit status in state `failure` or `error`. The PR comment names every such check under "Why not PASS". This is computed from GitHub API data, never from the model report, so a red check that the Issue does not mention (CodeQL, `codecov/patch`, Docker smoke, Dependabot gate, web lint/test) can no longer sit next to a passing `Acceptance Verifier` status. Found on PR #434: CodeQL had failed before the verifier collected its inputs, yet the verdict was PASS because the Issue's Definition of Done named only `tsc`/`lint`/`test`/`test:e2e`.
2. **Not counted.** The verifier's own `Verify` and `Report` jobs and its `Acceptance Verifier` status, plus `success`, `neutral`, `skipped`, `pending` and still-running checks. A check still running when `ci.json` is collected is therefore not seen; that limit is accepted.
3. **Fail closed.** A missing, unreadable or malformed `ci.json` is FAIL ("CI results were not checked"). `verify` uploads `ci.json` in the `verdict` artifact and `report` passes it to the script, which is still read from the default branch and still runs without `OPENAI_API_KEY`.
4. `VERIFIER_ENFORCE` is unchanged: a non-PASS verdict is advisory unless it is `true`. As with the previous amendment, the PR that changes these files is judged by the version on the default branch.

**Amendment (2026-09-25, ISSUE-441): owner-driven manual checks are not gated.**

1. **Rule.** An issue may carry an optional section `## Manual verification (owner, not gated)` (template: `.claude/skills/issues/SKILL.md`). `.github/verifier/prompt.md` tells the verifier that this section is neither a criterion nor context to judge, so it produces no entry and no `UNVERIFIABLE`. Owner-driven manual UI passes belong there, not in `## Definition of Done` / `## Test Requirement`, where they always came back `UNVERIFIABLE` and coloured the report red (seen on PR #439).
2. **Unchanged.** `scripts/acceptance-verdict.js`, `schema.json` and the `manual-verified` label. A task that is manual as a whole keeps its manual check as a Test Requirement item and still needs the label. Issues created earlier keep their DoD items; for them the label applies.
3. As with earlier amendments, the PR that changes the prompt is judged by the version on the default branch, so an advisory FAIL there is expected.

**Amendment (2026-09-25, ISSUE-443): a file outside the issue's scope is always FAIL.**

1. **Rule.** `scripts/acceptance-verdict.js` adds a failure for every entry of `out_of_scope_files` ("out of scope file: <path>"), listed under "Why not PASS". Before this, the field was only rendered, so an agent (Ralph) touching a file the issue never mentioned still produced PASS. `.github/verifier/prompt.md` now says the list decides the verdict, so a file is listed only when neither the issue's `## Affects` nor its criteria and invariants account for it.
2. **How to make an extra file legitimate.** Name its path in the issue's `## Affects` before or while doing the work. There is no label bypass: `manual-verified` still excuses only `UNVERIFIABLE` and never excuses an out-of-scope file.
3. **Known limit.** The list is produced by the model, not by code, so a false positive is possible. It is accepted because the escape (add the path to `## Affects`) is cheap and visible, whereas a silent scope change by an autonomous agent is not. Comparing changed files with `## Affects` in deterministic code is a possible later hardening.
4. As with earlier amendments, the PR that changes these files is judged by the version on the default branch, so this PR itself is not judged by the new rule.

**Amendment (2026-09-25, ISSUE-445 branch): bounded verifier attempts with a lower-effort retry.**

1. **Why.** Observed on PR #446: the Codex response stream broke mid-answer (`Reconnecting... 1/5`, a truncated JSON printed twice as the final message) and the `Run verifier` step then hung past its own `timeout-minutes` and the job timeout until cancelled; a cancelled run leaves no log to read.
2. **Change.** `Run verifier` is now attempt 1 (`effort: high`, `continue-on-error`, 6-minute timeout). `jq` validates `verdict.json`; when the attempt failed, timed out or left an unusable verdict, the file is kept as `verdict-attempt1.json` and attempt 2 runs with `effort: medium` under the same bounds. A verdict still missing or invalid afterwards flows on to `Check references`/`Report` and is a FAIL (fail closed), never a hang. A `Verifier diagnostics` step writes both attempts' outcomes and file sizes to the job summary; `verdict-attempt1.json` is uploaded with the verdict artifact.
3. **Unchanged.** Codex CLI and action versions, prompt, schema, verdict script, `VERIFIER_ENFORCE`, trust boundaries. The cause of the stream break is not established; a newer Codex version was deliberately not applied without evidence.
4. As with earlier amendments, the PR that changes the workflow is judged by the workflow on the default branch, so this takes effect for the next PR after merge.

**Amendment (2026-09-25, ISSUE-449, landed on the ISSUE-440 branch): pin codex-action v1.11; the in-job retry is removed. Supersedes the ISSUE-445 amendment above.**

1. **The ISSUE-445 diagnosis was wrong.** Codex does not break mid-answer. The hanging runs end exactly like a successful one: `codex`, the final JSON, `tokens used`, the final JSON again. The JSON only looks truncated because the log viewer cuts long lines. After that output the step never finishes, and the job is killed at about 25 minutes (20-minute job timeout plus GitHub's 5-minute cancellation window). This happened on PR #446 and PR #448, four of the last four runs.
2. **Cause: an upstream regression in `openai/codex-action` v1.12** (`86365089…`), reported in openai/codex-action#150 and still reproduced after that issue was closed with "fixed in CLI 0.150.0". See #169 ("Codex CLI 0.150.1 still hangs after final output", open) and #172. The proposed fix is PR #151, "Fix action hang when descendants keep stdio open", which is not merged. We hang with CLI 0.156.1, so a CLI bump does not fix it. v1.12 starts Codex through a root-owned `sudo` → `setpriv` wrapper and waits for `child.on("close")`. That wrapper is also the likely reason the 6-minute step timeout had no effect. v1.11 drops sudo in a separate step and runs Codex directly as `runner`.
3. **Change.** The verifier step pins `openai/codex-action@52fe01ec70a42f454c9d2ebd47598f9fd6893d56` (v1.11). It is a single attempt with `timeout-minutes: 10` and `continue-on-error: true`. Codex CLI 0.156.1, `effort: high`, the prompt, the schema, the verdict script and all trust boundaries are unchanged. `Verifier diagnostics` reports the step outcome and whether `verdict.json` is present and valid. A missing or invalid verdict is still a FAIL.
4. **Why the retry is gone.** Neither v1.11 nor v1.12 can run `drop-sudo` twice in one job: v1.11 fails in `ensurePasswordlessSudo`, and v1.12 fails with "cannot run again after sudo has been removed; use a separate job". The second attempt from ISSUE-445 therefore could never run. A retry would have to be a separate job.
5. **Return to v1.12 or later** only after PR #151, or an equivalent fix, is in a released action version.
   The pin is kept in place by an `ignore` rule for `openai/codex-action` in `.github/dependabot.yml` (ISSUE-451), so Dependabot does not open a bump to v1.12. Removing that rule and moving the pin is tracked in issue #452.
6. As with earlier amendments, the workflow on the default branch judges this PR, so the fix applies from the next verifier run after merge.

**Amendment (2026-09-25, ISSUE-400): the report must cover every issue item; a rejected quote is printed.**

1. **Why.** On PR #463 two of three runs failed on noise, not on the change: one report listed 2 of 10 items, another 9 of 12, and in both a reference was rejected because the model glued stray JSON (`},{"`) to an otherwise correct quote. The shortened reports were not caught, because the script only rejected an empty `criteria` list, and the comment did not show which quote was rejected.
2. **Coverage.** `scripts/acceptance-verdict.js --check-refs ... --issue .verifier/issue.md` counts the top-level list items under `Acceptance Criteria`, `Definition of Done` and `Test Requirement` (a Test Requirement written as prose counts as one; nested items, fenced code and `Manual verification (owner, not gated)` do not count). A report with fewer `criteria` entries than that adds "report covers N of M issue items" to `refs-problems.json`, which is a FAIL through the existing path. More entries are accepted, since the prompt allows splitting a Test Requirement per sentence. Entries are compared by count, not text, because the model does not always quote an item exactly. An unreadable issue file is a problem too (fail closed).
3. **Rejected quote.** A "quote not found on that line" problem now includes the quote (JSON-encoded, first 200 characters).
4. **Unchanged.** Quote matching still ignores only whitespace; it was deliberately not relaxed, since trimming trailing text would accept invented references. Prompt, schema, `VERIFIER_ENFORCE` and trust boundaries are unchanged.
5. As with earlier amendments, the workflow and script on the default branch judge this PR, so the checks apply from the next verifier run after merge.

**Amendment (2026-09-27, ISSUE-518): the prompt forbids citing `trusted/` paths.**

1. **Why.** ISSUE-469 added `scripts/issue-lint.js` to the trusted sparse checkout. The same file, unchanged, also exists in the PR checkout at the same relative path, so the model had two identical copies to cite. On PR #517 it cited `trusted/scripts/issue-lint.js` 11 times. `checkRefs()` rejects any path under `trusted` (`FORBIDDEN_REF_ROOTS`), so the verdict was FAIL even though all 15 items were judged PASS.
2. **Change.** §5 "References" of `.github/verifier/prompt.md` now forbids citing any path that starts with `trusted/`. When a file exists in both places, the model must cite the copy in the main checkout. The rule applies to every file, so the next file added to the trusted checkout cannot cause the same collision.
3. **Unchanged.** `FORBIDDEN_REF_ROOTS` and the reference checks stay as they are. Relaxing them would weaken the protection that ISSUE-424 introduced.
4. As with earlier amendments, the default-branch prompt judges this PR. The new rule applies from the next verifier run after merge.

**Amendment (2026-09-29, ISSUE-521): `checkRefs` accepts a quote found within a ±2-line window around the cited line; an accepted shift is shown in the comment.**

1. **Why.** The verifier model is occasionally off by 1-2 lines on an otherwise-correct citation while the quoted text itself is genuine and verbatim: PR #520 cited `scripts/acceptance-verdict.js:313` quoting text that was actually on line 312; PR #525 showed the same pattern twice (`:603`→602, `:295`→296). Each produced a false FAIL on a criterion that was in fact correctly implemented and tested — an independent verifier (ADR-041) losing credibility to a line-number off-by-one is worse than the risk this amendment accepts, since a false FAIL erodes trust in true FAILs the same way an unhandled alert-fatigue problem does.
2. **Window and search order.** `readReferencedLine` (`scripts/acceptance-verdict/refs.js`) now searches lines `line - 2` through `line + 2`, clipped at the file's boundaries, instead of requiring an exact match on `line`. Search order: the cited line itself, then the two lines at distance 1 (above before below), then the two at distance 2 — so a nearer match always wins, and an equal-distance tie picks the line above (the smaller line number). The `line > file length` ("past the end") rejection is unchanged and still applies only to the cited line itself, not to the window — a wildly wrong line number is still rejected outright, not laundered into a window hit.
3. **Quote comparison is unchanged.** The quote must still match one whole line of the window after whitespace normalization (ADR-041, ISSUE-400 amendment) — no concatenation of adjacent lines, no quote truncation, no fuzzy comparison. An invented quote (e.g. `assert.strictEqual(noId.failures[0], 'report violates schema');`, absent from PR #520's second run) is still rejected even though nearby lines exist, since none of them contain the quoted text.
4. **Shifts are recorded, not silently absorbed.** `checkRefsWithNotes` (new function; `checkRefs` keeps its existing signature and return value, now a thin wrapper) additionally returns `notes: {list, entry, ref, cited, found}[]` for every reference accepted from a line other than the one cited — `list` is `criteria` or `invariants`, `entry`/`ref` are positions in the raw (pre-`mergeComputed`) report `checkRefsWithNotes` read. `--check-refs` writes this array to `--notes-out <file>` when passed (nothing is written without the flag). `evaluate()` (`scripts/acceptance-verdict/verdict.js`) accepts `refsNotes` (read via `readRefsNotes`, fail-open to `[]` on a missing/unreadable/malformed file — a shift is comment-display information only and never affects the verdict) and turns it into a `refsNotesByKey` lookup keyed by `list:entryId:refIndex` (via `notesByKey` in `refs.js`) rather than by raw array position, because `mergeComputed` reorders `report.criteria` for computed `ci`/`absence` entries and a stable id survives that reorder while a raw index does not. `renderComment`/`renderTable`/`renderRefs` (`render.js`) show a shifted reference as `path:cited→found` and every other reference exactly as before.
5. **Workflow wiring.** `.github/workflows/acceptance-verifier.yml`'s `Check references` step passes `--notes-out refs-notes.json`; `Upload verdict` includes it; `Compute verdict and comment`'s `rm -f` (run only when the `verify` job did not succeed) includes it, and the step passes `--refs-notes refs-notes.json` to the verdict script when the file exists — the same conditional-file pattern already used for `refs-problems.json`/`absence.json`.
6. **Window width is fixed, not configurable.** `REF_WINDOW_LINES = 2` is a constant in `refs.js`, not a project-specific value, a CLI flag, or a per-issue setting — consistent with `.github/verifier/prompt.md` staying unchanged: the model is still required to cite the exact line, and the window is a verification tolerance, not a relaxation of what the model is asked to do.

Alternatives considered:
- ±1-line window — rejected: does not cover a two-line shift, which PR #520's own case (`:313`→312, a distance-1 case) would have covered, but would not have caught a hypothetical distance-2 case, and a distance-2 real-world instance was judged plausible enough to guard against given two independent distance-1 instances were already observed in quick succession.
- ±3-line window — rejected: short, common quotes (a single import line, a closing brace, a one-word identifier) become increasingly likely to coincidentally match an unrelated line the further the window extends, trading false FAILs for false PASSes; ±2 was judged the point past which that risk starts to dominate the benefit.
- Silently accepting the shift with no record of it — rejected: the underlying problem is the model's own line-number citation drifting, not merely rejecting good citations; silently widening the accepted range would still hide that drift from anyone reading the verifier's comment, only for a future case to resurface as confusion (or as a real wrong-file citation, e.g. the separate case observed on PR #534 and deliberately left out of this amendment's scope) rather than a visible, self-explaining `cited→found` note.
- Fuzzy/substring-relaxed quote comparison instead of (or alongside) the line window — rejected: this is the exact protection the ISSUE-400 amendment introduced quote-truncation rejection to close; relaxing it to solve a line-number problem would reopen a quote-fabrication problem.

Reason:
An independent verifier is only as trustworthy as its false-positive rate for FAIL; a verifier that fails a genuinely correct, well-tested change because the model cited line 313 instead of 312 trains reviewers to treat every FAIL as suspect, defeating ADR-041's purpose. The window is scoped narrowly (a fixed ±2 lines, exact quote match unchanged, the "past the end" guard untouched) so it closes exactly the observed failure mode — a small, otherwise-correct citation's line number being off by 1-2 — without reopening the quote-fabrication or wrong-file-citation classes of problem ADR-041's other amendments (ISSUE-400, ISSUE-424) already closed. Verified via `scripts/acceptance-verdict/refs.spec.js`, `verdict.spec.js`, `render.spec.js` and `scripts/acceptance-verdict.spec.js`'s CLI end-to-end tests (window match/reject at each distance, boundary clipping, the equal-distance tie-break, `past the end` unaffected by the window, the comment's `cited→found` display, a missing/malformed `refs-notes.json` not changing the verdict) and the full `scripts/*.spec.js` suite.

Source: project owner, 2026-09-29, Issue #521 — filed directly off a false FAIL observed on PR #520, with a second confirming instance (PR #525) added as an issue comment before implementation, and a related-but-out-of-scope wrong-file-citation case (PR #534) recorded in a further comment and explicitly left for the owner to decide separately.

**Amendment (2026-10-01, ISSUE-489): pointer to ADR-042 for the deterministic-verifier mechanism built on top of this ADR.**

This ADR (ADR-041) stays the record of the original verifier design: the independent model, the
schema with no verdict field, `acceptance-verdict.js` computing `PASS`/`FAIL`, the `workflow_run`
trigger and trust boundaries, and this ADR's own line of amendments through ISSUE-521 above. Every
mechanism added afterward to make the issue spec itself machine-checkable and verifiable — the
issue contract and linter, spec freeze (`spec-approved`), label authorship, the deterministic
checks that replaced several model judgements, the `NEEDS_HUMAN` outcome, provenance/allowed-models
and the golden case set — is recorded in `## ADR-042` instead, not as further amendments here. A
reader who wants the current full picture of what the verifier checks should read both ADRs: this
one for the base mechanism, ADR-042 for everything built on top of it.

Alternatives considered:
- Keep adding these mechanisms as further amendments to this ADR (ADR-041) instead of to ADR-042 —
  rejected: `## ADR-042`'s own base decision (#464) and its subsequent amendments (#469–#488) are
  already the record of record for every one of these mechanisms; duplicating that history into a
  second ADR would create exactly the drift risk this skill's "never edit an accepted entry" rule
  and the spec-side/verifier-side separation (ADR-042, #488) both exist to prevent.
- Merge ADR-041 and ADR-042 into one entry — rejected: the ADR skill's "never edit an accepted
  entry's existing text" rule forbids rewriting either entry's already-accepted content, and the
  two ADRs already have distinct, well-established numbers cited throughout the codebase's own
  comments and workflow files (e.g. `"(ADR-041)"`/`"(ADR-042"` references in
  `scripts/acceptance-verdict/*.js` and `.github/workflows/acceptance-verifier.yml`); renumbering
  would break that traceability for no benefit.

Reason:
Issue #489 (EPIC-27 Phase 9) asked for ADR-041 to carry a pointer to ADR-042 rather than restating
or absorbing ADR-042's content, so a reader arriving at either ADR can find the other half of the
verifier's current design without the two histories being merged or duplicated.

Source: project owner, via Issue #489 (EPIC-27 · Фаза 9), 2026-10-01.

**Amendment (2026-10-01, ISSUE-565): pointer to ADR-044 for Calibration Judge.**

Calibration Judge (EPIC-31), a separate advisory workflow that performs post-hoc root-cause analysis of a verifier round, is a distinct mechanism recorded in `## ADR-044`, not an extension of this ADR. It reuses this ADR's trust-boundary pattern (trusted default-branch checkout, PR head as data only, scoped API key) and ADR-042's label-authorization mechanism, but it does not change the verdict this ADR's script computes, the `Acceptance Verifier` status, or any rule in this ADR or ADR-042.

Alternatives considered:
- Record Judge as a further amendment to this ADR or to ADR-042 instead of a new ADR — rejected: the same reasoning as this ADR's own ISSUE-489 amendment above applies again — Judge is a distinct, independently triggered workflow with its own model, taxonomy and storage, not a refinement of the verifier's own verdict computation; folding it in here would blur which ADR governs what, the exact drift this ADR's existing pointer convention exists to avoid.

Reason:
Issue #565 (EPIC-31) asked for a single binding ADR-044 covering Calibration Judge, cross-referenced from this ADR and from ADR-042, so a reader of either already-established verifier ADR can find the separate, advisory Judge mechanism without its decisions being folded into or confused with the verifier's own.

Source: project owner, via Issue #565 (EPIC-31), 2026-10-01.

**Amendment (2026-10-02, ISSUE-596): quote comparison strips markdown emphasis/code markers symmetrically; the prompt requires re-reading the exact file and confirming the full path before citing.**

`readReferencedLine` (`scripts/acceptance-verdict/refs.js`) now compares a reference's quote
against a candidate line after also stripping paired `**`, `__` and `` ` `` markdown markers from
both sides (`stripMarkdownMarkers`, applied via a new `normalizeQuoteText` that composes it with
the existing `normalizeSpaces`), in addition to the whitespace normalization ISSUE-521 already
established. This is symmetric — both the quote and the candidate line go through the same
stripping — so it only forgives the model's own markdown rewrapping (a bold `**word**` on the
actual source line rendered back as plain `word` in the model's quote) and does not weaken the
underlying content check: a quote that differs from the cited line by more than markup is still
rejected ("quote not found"). Found by `/code-review` before this landed: a quote made only of
stripped markers (e.g. `"**"`, `` "``" ``) normalizes to an empty string, and
`String.prototype.includes('')` is always `true`, so without an explicit guard every candidate
line in the window would have matched regardless of its real content — `readReferencedLine` now
rejects an empty normalized quote outright ("quote has no content once markdown markers are
stripped") instead of treating it as a match.

`.github/verifier/prompt.md`'s References section (§5) now also instructs the model to re-read the
exact cited file immediately before writing each reference and confirm the line number and quote
against the file's current content rather than from memory of an earlier part of the session, and
to confirm the full path (not only the file name) when more than one file in the checkout shares a
base name.

Alternatives considered:
- Widen `REF_WINDOW_LINES` beyond ±2 to also cover the 5-9 line drift observed on PR #595 —
  rejected: ISSUE-521 already weighed and rejected a wider window for the identical reason (short
  lines start matching coincidentally); this amendment does not revisit that choice.
- Strip single `*`/`_` characters too, not only paired `**`/`__` — rejected: a single underscore
  is common inside identifiers (snake_case) and a single asterisk inside code (multiplication);
  stripping it would merge unrelated adjacent lines into the same normalized text more often,
  where the existing paired-marker form only ever occurs as deliberate markdown emphasis/code-span
  syntax.
- Add a deterministic check that rejects a citation when a same-named file exists elsewhere in
  the checkout — rejected for this amendment: the file-confusion case observed
  (`calibration-judge.spec.js` vs `publish.spec.js`) has no reliable code-side signal (both are
  valid, existing files); the fix is the prompt's own re-reading instruction, left as a model-side
  mitigation rather than a new deterministic check.

Reason:
On PR #595, Calibration Judge's independent read reported two references shifted 5-9 lines
(outside the ±2 window ISSUE-521 established), one reference pointing at the wrong file entirely
(two spec files sharing a line number by coincidence), and one reference whose line number was
correct but whose quote had lost the `**bold**` markdown markup actually present in the source
line (`render.js:457`) — rejected as "quote not found" even though the citation was otherwise
exactly right. The last of these is a verifier false-FAIL class ISSUE-521 already named as a risk
to the verifier's own credibility; fixing the markup-stripping asymmetry closes it without
reopening the quote-fabrication protection ISSUE-400 built. The other two (line drift beyond the
window, file-name confusion) have no safe deterministic fix without reopening coincidental-match
risk, so they are addressed only by instructing the model to verify against the actual current
file content before citing, which is the generic root cause of all three symptoms.

Source: project owner, 2026-10-02, via Issue #596, after reviewing a Calibration Judge
independent-citation report on PR #595.

## ADR-042 — Machine-checkable issue contract: rules in `.github/verifier/issue-contract.json`

Status: `Accepted`

Decision:

1. **Two contract files.** `.github/verifier/issue-contract.json` holds the machine rules of the issue format: required sections (`Контекст`, `Affects`, `Docs to Read`, `Key Invariants`, `Acceptance Criteria`, `Test Requirement`, `Definition of Done`, `Dependencies`) and the optional `Manual verification (owner, not gated)`, the ID prefix of each item section (`AC`, `DOD`, `TR`, `INV`), item types (`behavior`, `doc`, `config`, `ci`, `absence`) with their `Verify:` grammar, forbidden wording (case-insensitive) and conditional-item markers. `.github/verifier/issue-contract.md` explains the same rules for people and the `issues` skill, with a full example issue under `## Пример`. `scripts/issue-contract.spec.js` fails when the md stops mentioning a section, prefix or type from the JSON.
2. **The JSON is the only source of rules for code.** The issue linter (next task of the phase) and the verifier read the JSON; they do not hardcode format rules. Rejected: constants inside `scripts/issue-lint.js`, which would make the verifier depend on a module of the spec side.
3. **Line syntax of an item:** `- [ ] AC-1 [behavior] <text>. Verify: <how>`; an invariant is `- INV-1 <text>`. Rejected: `Verify:` on a separate nested line, which is harder to parse.
4. **Scope.** The contract describes only the issue format, not how the verifier model judges or how the skill writes an issue. Parsing stays compatible with the current verdict script: `##` headings, top-level items only, fenced code ignored. The files live in `.github/verifier/`, which the verifier takes from the default branch (ADR-041).
5. **Issue linter and transition mode.** `scripts/issue-lint.js` reads all format rules from the JSON contract and emits `{ "format": "v2" | "legacy", "problems": [string], "items": [{ "id", "section", "type", "text", "verify" }] }`. A body with no ID item in the contract's check-item sections is `legacy`: it is accepted without v2 validation during the transition unless the caller passes `--require-v2`; a body with at least one such ID is `v2` and is checked completely against the contract.

Reason:
The format was described in three places (the `issues` skill prose, `.github/verifier/prompt.md`, and regexes in `scripts/acceptance-verdict.js`), so the spec side and the verifier side could drift. One data file both sides read removes that.

Source: project owner, 2026-09-26, Issue #464 (EPIC-27 · Фаза 1).

**Amendment (2026-09-27, ISSUE-469, EPIC-27 · Фаза 3): the verifier lints the issue body before calling the model; an invalid `v2` spec is FAIL without spending tokens; a `legacy` issue is labelled in the comment.**

1. **Preflight step.** `acceptance-verifier.yml`'s `verify` job runs a new `Lint issue against contract` step between `Collect inputs` and `Run verifier`, always from the trusted default-branch checkout: `node trusted/scripts/issue-lint.js .verifier/issue.md --contract trusted/.github/verifier/issue-contract.json --out spec-lint.json`. `trusted/scripts/issue-lint.js` was added to that checkout's sparse-checkout list alongside `.github/verifier` and `scripts/acceptance-verdict.js`, so this step (like `Run verifier`) is fed only from the default branch, never the PR head.
2. **Skip the model on an invalid `v2` spec.** The lint step gates on `issue-lint.js`'s own exit code directly (`if node trusted/scripts/issue-lint.js ...; then invalid=false; else invalid=true; fi`) — not a re-derived `jq` condition over `spec-lint.json`'s content. This matters for the crash case: `issue-lint.js` exits 0 only when it ran cleanly with zero problems, 1 when a `v2` body fails the contract, and 2 if it throws (e.g. a broken trusted `issue-contract.json`); all non-zero exits set `invalid=true`, so a crash fails closed (skips the costly Codex call) exactly like a real contract violation, instead of the file simply not existing and being misread as "no problems found". `steps.spec.outputs.invalid` gates `Run verifier`'s `if:` alongside the existing `stale` check.
3. **`spec-lint.json` flows through the same artifact as `verdict.json`/`ci.json`**: uploaded by `Upload verdict`, downloaded by `report`, and deleted alongside the others when the `verify` job itself did not succeed (`rm -f ... spec-lint.json`).
4. **`scripts/acceptance-verdict.js` gained `--spec <spec-lint.json>`**, always passed by the `report` job. Two distinct spec-problem cases are deliberately handled differently, found necessary during `/code-review` before this landed (not in the original design): a spec that is genuinely invalid — `format: "v2"` with non-empty `problems` — means the issue itself cannot be judged, so `evaluate()` returns immediately with `spec invalid: <problem>` failures (one per problem) **without reading the model report at all** (AC-5), matching `runVerdict()` skipping the report file read entirely in that one case. A spec that could not be checked at all (`readSpecResult()` → `null`: missing file, unparsable JSON, or wrong shape — e.g. because the `verify` job failed for an unrelated reason and `rm -f` removed it) is instead **folded into the normal failure list** as an additional `spec was not checked` entry, alongside whatever the model report/CI/refs checks already found — it does not replace or hide those diagnostics. Without this distinction, any unrelated `verify`-job failure (a Codex hang, a `Collect inputs` crash) would present only "spec was not checked" in the PR comment and discard the real, more useful failure reason (`report not readable: ...`, a failed CI check) that the pre-existing code already computed — a regression from the pre-#469 behavior that a bare "genuinely-invalid-spec short-circuits everything" design would have introduced. A `v2` spec with empty `problems` leaves the verdict identical to omitting `--spec`. A `legacy` spec (an issue with no ID-tagged items — the transition mode ADR-042 already defined) does not change the verdict path (`countIssueItems`/`checkCoverage`, unchanged) but adds `Issue format: legacy` to the rendered comment, so a legacy PASS/FAIL is visibly distinguished from a `v2` one.
5. **Two preflights, two jobs (INV-6, resolved, not re-litigated).** `git-closure-gate-hook.js` (#468) already lints an issue body at `gh issue create`/`edit`/MCP `issue_write` time; this amendment adds the same linter as a second, independent gate inside the verifier itself, because the hook cannot see every path that changes an issue body (e.g. an edit through the GitHub web UI bypasses the hook entirely). The verifier's own preflight remains the final, unavoidable gate.
6. **No new project-specific literals (INV-8).** The new step and script argument read the contract path, the issue body and the linter's own output from trusted/input files; nothing hardcodes a project-specific path, CI check name, ADR number or risk zone beyond what `acceptance-verifier.yml`/`acceptance-verdict.js` already used.

Reason:
Before this amendment, an issue body that fails the `v2` contract (missing sections, malformed item IDs, forbidden wording) still went through a full Codex call, whose report was then judged against a body it could not actually satisfy — wasted tokens and a verdict that depended on the model noticing the malformed spec on its own rather than on a deterministic check. Running the same linter that already gates issue authoring (`git-closure-gate-hook.js`, #468) as a preflight inside the verifier closes the one path that hook cannot cover (a body edited after creation, outside `gh`/the MCP tool) and gives a fail-closed, zero-token verdict for a broken spec, while a `legacy` issue (no ID items yet) keeps working exactly as before, just visibly labelled. An earlier draft of this same change used `jq` against `spec-lint.json`'s content for the gate and unconditionally short-circuited `evaluate()` on any spec problem (including a merely-unreadable one); `/code-review` caught both as fail-open/diagnostic-loss regressions before merge — fixed as described in points 2 and 4 above.

Verified via `scripts/acceptance-verdict.spec.js`'s new cases (an invalid `v2` spec fails closed without reading the model report; a valid `v2` spec does not change the verdict; a `legacy` spec labels the comment and keeps the existing PASS/FAIL path; a missing or unparsable spec file fails closed the same way; an unreadable spec is folded in alongside real report diagnostics rather than replacing them; both CLI end-to-end cases) and the full `scripts/*.spec.js` suite (130/130).

Source: project owner, 2026-09-27, Issue #469 (EPIC-27 · Фаза 3).

**Amendment (2026-09-27, ISSUE-470, EPIC-27 · Фаза 3): the report is matched to the issue by item ID; the comment shows the issue's own text; every `INV-n` gets an explicit status; `--check-refs` reads `--spec`.**

1. **Schema.** Each `criteria` entry has a required string `id`, and the report has a required root array `invariants` of `{id, status, summary, refs}` with `status` from `PASS`, `FAIL`, `N/A`. Structured output needs every property listed in `required`, so for a `legacy` issue the model sets `id: ""` and `invariants: []`. There is still no verdict field.
2. **ID matching for `v2`.** `acceptance-verdict.js --check-refs` takes `--spec spec-lint.json`. The workflow's `Check references` step passes it. For a `v2` spec it compares the report's IDs with the linter's `items` as sets. It compares `criteria` IDs with the IDs of checkable items and `invariants` IDs with the invariant IDs. The linter gives invariants `type: null`, so the script reads no section names. A missing, extra or repeated ID is written to `refs-problems.json` and makes the verdict FAIL. It appears under the existing `bad reference:` prefix. This replaces the count check (`checkCoverage`) for `v2`, so extra entries can no longer hide a missing item. For a `legacy` spec, or when `--spec` is not passed, the count check runs as before and `id` is ignored. A `--spec` that was passed but cannot be read or parsed is itself a problem (`spec was not checked, issue ids were not matched`), and the count check still runs as a floor (fail closed).
3. **Invariants are judged.** An invariant with status `FAIL` makes the verdict FAIL (`invariant failed: INV-n`). So does an invariant with status `PASS` and no references. `N/A` needs no references. References in `invariants` go through the same `checkRefs` as those in `criteria`. `checkRefs` also reports any `PASS` entry, criterion or invariant, that has no references (`<ID>: PASS without references`). There is no `UNVERIFIABLE` for invariants, so `manual-verified` never applies to them.
4. **Issue text in the comment.** For a `v2` spec, `evaluate()` carries the linter's `items`. The comment's Criterion column and a new Invariant table show `<ID> <item text from the issue>`. Model wording is never shown there. A reported ID that the issue does not have is shown as `<ID> (not in issue)`. A `legacy` comment is unchanged.
5. **The prompt refers to the contract.** `.github/verifier/prompt.md` no longer lists issue sections or the item format itself. It points to `trusted/.github/verifier/issue-contract.md` (the default-branch copy) as the only source of format rules and forbids using the pull request's copy. References still must not point under `trusted/` (ADR-041, ISSUE-518 amendment). `[ci]` and `[absence]` items are still judged by the model; moving them into the script is #472.
6. As with earlier amendments, the prompt, schema and script on the default branch judge the PR that introduces this change. The new rules apply from the next verifier run after merge.

Verified via `scripts/acceptance-verdict.spec.js` (new cases for ID match, missing/extra/duplicate ID, invariant PASS/N/A/FAIL/missing, invariant references, issue text in the comment, `(not in issue)` marking, legacy count path, `v2` overriding the count, schema rejection of an invariant `UNVERIFIABLE` and of a report without `id`/`invariants`, both `--check-refs --spec` CLI cases) and the full `scripts/*.spec.js` suite (146/146).

Source: project owner, 2026-09-27, Issue #470 (EPIC-27 · Фаза 3).

**Amendment (2026-09-27, ISSUE-471, EPIC-27 · Фаза 3): references carry a `kind`; a `v2` `behavior` PASS needs both an `impl` and a `test` reference.**

1. **`kind` is a closed enum on every reference.** `.github/verifier/schema.json`'s `refs` items (in both `criteria` and `invariants`) gained a required `kind: "impl" | "test" | "doc" | "config" | "ci"` field alongside `path`/`line`/`quote`. `scripts/acceptance-verdict.js`'s `isReference` rejects a reference with a missing or invalid `kind` the same way it already rejected a missing `quote` — via `parseReport`'s schema check, surfacing as `report violates schema`.
2. **`behavior` items must prove both sides.** A `v2` checkable item of type `behavior` (read from the issue linter's `items`, never from the model's own report) that the model marks PASS must carry at least one `kind: "impl"` reference and at least one `kind: "test"` reference; a PASS backed by only one side fails with `behavior item passed without impl and test references: <ID>`. Implemented as `checkBehaviorRefs(report, specItems)`, wired into the `--check-refs` step (`runCheckRefs`) alongside the existing `checkRefs`/ID-matching checks, so it flows into `refsProblems` and the verdict exactly like a bad quote or a mismatched ID. `doc`/`config`/`ci` items and legacy issues (`specItems` null) are untouched — the pairing rule is scoped to `behavior` only, per the same "type comes from the linter's `items`, not the model" principle #470 already established for invariants.
3. **`.github/verifier/prompt.md`** describes each `kind` value in its References section (§5) and states the impl+test requirement for `behavior` PASS items there, next to the existing reference-shape rules, rather than as a separate section.
4. **No new project-specific literals.** The enum values (`impl`/`test`/`doc`/`config`/`ci`) and the pairing rule are generic to the issue-contract's own item types (`.github/verifier/issue-contract.json`'s `itemTypes`), not tied to any path, CI check name or ADR number specific to this project.

Reason:
Before this, a `behavior` item's PASS required only "at least one reference" — a report could cite only the implementation (no test proves it actually works) or only a test (no cited line shows what it tests) and still pass. Naming what each reference actually shows, and requiring both sides for a claim about runtime behavior specifically, closes that gap the same way #470's ID matching closed the "the model can under-report items" gap.

Verified via the full `scripts/*.spec.js` suite (152/152, up from 146 — six new cases: behavior PASS missing impl, missing test, with both, a doc item's single doc reference not failing, a legacy item not requiring a test reference, and a reference with a missing/invalid `kind` being rejected by the schema).

Source: project owner, 2026-09-27, Issue #471 (EPIC-27 · Фаза 3).

**Amendment (2026-09-27, ISSUE-472, EPIC-27 · Фаза 3): `ci` and `absence` item types are computed by the script, not judged by the model.**

`scripts/acceptance-verdict.js` now computes the status of every `v2` item whose type is `ci` or `absence` directly, instead of relying on the model's own judgement:

1. `computeCiItems(specItems, ciRaw)`: for each `ci` item, parses its `Verify: ci "<check>"` grammar and looks up that exact check-run name in the already-collected `ci.json` — PASS only when the check exists exactly once with `status: completed` and `conclusion: success`; missing, still-running or failed all FAIL.
2. `computeAbsenceItems(specItems, root)`: for each `absence` item, parses `Verify: absent "<literal>" in <path>`, runs the referenced path through the same containment checks references already use (inside the checkout, not under `.git`/`trusted`, a regular file, no symlink, ≤ 2 MB) and does a plain-substring search for the literal (never a regex) — FAIL if found or if the containment check fails, PASS otherwise.

Both item types are excluded from the ID set compared against the model's own report (`idsOf`/`checkIds`): a model report missing an entry for a `ci`/`absence` id is not a failure, and an extra model entry for one is discarded, not compared. The computed entry always wins over any model-provided entry with the same id. The rendered PR comment shows the computed status with a `(computed)` suffix, so it reads distinctly from a model-judged entry — this applies to `v2` issues only; a `legacy` issue (no ID-tagged items) is unaffected, matching how this ADR's other ID-based mechanisms are already scoped.

`ci` computation happens in the `report` job's verdict step (`--ci`/`--spec` were already available there); `absence` computation happens in the `verify` job's `Check references` step (the only step with `--root`), and its result is carried to the verdict step through a new `absence.json` artifact file (`--absence-out` writes it, `--absence` reads it) — the same artifact-passing pattern `ci.json`/`spec-lint.json` already use.

`.github/verifier/prompt.md` now explicitly tells the model not to produce a "criteria" entry for a `ci`/`absence` item at all.

Alternatives considered:
- Keep both types model-judged, relying only on `checkRefs`'s existing behavior-item impl+test pairing (#471) to catch a wrong verdict — rejected: neither check is deterministic, so a `ci`/`absence` item's PASS/FAIL could still hinge on the model correctly reading `ci.json` or a file's content, which is exactly the class of judgement #470/#471 already moved out of the model's hands for other checks.
- Compute both `ci` and `absence` together in the `verify` job's `Check references` step (which already has `--root`, and `ci.json` sits in the same job's workspace) — rejected in favor of splitting them: `ci` computation needs only `--ci`/`--spec`, both of which the `report` job's verdict step already receives, so computing it there needed no new workflow wiring; only `absence` needed the new `absence.json` hand-off, keeping the change smaller.

Reason:
Both checks are deterministic in nature — a CI check's conclusion and a file's content are queryable facts, not judgement calls — yet were being decided by the model, adding token cost and a class of possible error (misreading `ci.json`, missing a literal in a large file) for something a script computes reliably. Excluding these ids from the model-report ID comparison (#470) prevents the model's now-mandatory silence on these items from registering as "missing from report."

Verified via `scripts/acceptance-verdict.spec.js`'s new cases (absence PASS/FAIL, absence containment failures on an outside path/`.git`/a symlink/an oversized file, a regex-like literal treated as a plain substring, ci PASS/FAIL on a matching/missing/in-progress/failed check-run, a model report without ci/absence entries not failing on a missing id, an extra model entry for such an id being ignored, the comment marking computed entries with `(computed)` and not marking others, a legacy issue's ci/absence items not being computed, and a CLI end-to-end case wiring `--absence-out`/`--absence`) and the full `scripts/*.spec.js` suite (167/167).

Source: project owner, 2026-09-27, Issue #472 (EPIC-27 · Фаза 3).

**Amendment (2026-09-28, ISSUE-473, EPIC-27 · Фаза 4): `manual-verified` is counted only when a trusted owner set it last on the PR's timeline.**

1. **Trusted owners file.** `.github/verifier/owners.json` (default branch, `["strakhovdenya"]`) lists GitHub logins authorized to set gated labels. It is a checked-in file, not a repo variable, so a change to who is trusted leaves a PR-reviewable diff and git history — a variable can be changed without either.
2. **`scripts/label-authority.js`** exports `authorizeLabel(events, owners, labelName)`: filters the PR/issue timeline to `labeled`/`unlabeled` events for `labelName`, and looks only at the most recent one. Authorized only if that event is `labeled`, its actor's login is not of the form `*[bot]` (checked by suffix, not by the specific `github-actions[bot]` name), and the login is in `owners`. No matching event, or the most recent one is `unlabeled`, returns `{authorized: false, actor: null}`. Its CLI (`--timeline <f> --owners <f> --label <name> [--json]`) prints bare `true`/`false` by default and is fail-closed: an unreadable or malformed timeline/owners file yields `false`, exit code 0, never a thrown error.
3. **`.github/workflows/acceptance-verifier.yml`'s `report` job** replaces its `grep -qx 'manual-verified' <<< "$LABELS"` presence check with the authorization result computed in a new `Check manual-verified label authorization` step: it fetches the PR's timeline via `gh api repos/$REPO/issues/$PR_NUMBER/timeline` (GitHub timeline events, never the model's own report) once and calls `label-authority.js --json` against it and the trusted `owners.json`, which returns `{authorized, actor, present}` — `present` (`label-authority.js`'s `isLabelPresent`, exported alongside `authorizeLabel`) is whether the label's last relevant timeline event is `labeled`, by anyone, and replaces `Compute verdict and comment`'s own separate `gh api .../labels` presence check entirely. Deriving both facts from the one timeline snapshot instead of two independent API calls (timeline for authorship, labels endpoint for presence) closes a TOCTOU window a `/code-review` pass caught before this landed: a label applied between the two calls would have read as authorized-empty (not present) rather than as the newly-applied, correctly-authorized label it actually was. A failed timeline fetch produces an empty timeline (label not counted, and not present), not a failed job; the same fetch step runs without `set -e`, so an unexpected failure of `label-authority.js` itself leaves its outputs empty and `Compute verdict and comment` falls into the same "not present" path as a GitHub API error — the label is not counted either way, with no separate error-handling code needed. Both `owners.json` and `label-authority.js` are read only from the job's existing trusted default-branch sparse checkout (same mechanism ADR-041 already uses for `acceptance-verdict.js`/the prompt/the schema), never from the PR head. The `report` job's `permissions` gained `issues: read` (needed to call the timeline endpoint); it still never receives `OPENAI_API_KEY` (that stays scoped to the `verify` job's Codex step only).
4. **`scripts/acceptance-verdict.js`** gained `--manual-verified-ignored <actor>` / `--manual-verified-ignored-unknown`: when the label is present but unauthorized, the rendered PR comment states `manual-verified ignored: set by <login>` (or `set by unknown` when no `labeled` event was found for the label), so a spoofed or bot-applied label is visibly called out rather than silently having no effect. This is purely informational — passing neither flag is equivalent to today's behavior, and not passing `--manual-verified` already causes any `UNVERIFIABLE` criterion to fail the verdict on its own (ADR-041 §2), so the ignored-label case does not need a separate pass/fail rule.
5. **Scope.** This closes the specific gap named in #473: `manual-verified` could previously be set by anyone with label-write access, including an agent using a `gh` token. The same trusted-owners mechanism is intended to be reused for `spec-approved` in #474; this amendment only wires it for `manual-verified`.

Alternatives considered:
- Check the label event's actor via `gh pr view --json` or the "who added this label" field surfaced in some GitHub UIs — rejected: no such field exists on the labels list itself; only the timeline API records label-change authorship, per GitHub's REST API shape.
- Store the owners list as a repo variable (`vars.LABEL_OWNERS`) instead of a checked-in file — rejected per INV-1: a variable can be changed without a PR or any git history, defeating the point of a trusted, auditable owners list.
- Treat any non-bot actor as sufficient (drop the owners allowlist, keep only the bot exclusion) — rejected: this would let any collaborator with label-write access self-approve `manual-verified`, the exact bypass this amendment exists to close.
- Keep presence and authorization as two independent `gh api` calls (an initial version of this change did: `Compute verdict and comment` called `gh api .../labels` directly) — rejected after a `/code-review` pass flagged the resulting TOCTOU window and the wasted extra call; deriving presence from the same timeline snapshot removes both at once.

Reason:
Found during EPIC-27 · Фаза 4 planning: `manual-verified` is read by `report`'s `Compute verdict and comment` step purely by checking whether the label is present on the PR (`grep -qx 'manual-verified' <<< "$LABELS"`), with no check of who applied it. Since the workflow's `github.token` (used by the autonomous Ralph agent and by CI-driven tooling) has `pull-requests: write` in other jobs of this same repo, an automated process — not only a human reviewer — could set this label and have its own `UNVERIFIABLE` criteria excused, undermining the manual-verification guarantee ADR-041 introduced the label for.

Verified via `scripts/label-authority.spec.js` (18 cases covering AC-1 through AC-20 and TR-1: owner/non-owner/bot/other-`[bot]`-suffix authorship, label removed after being set, label re-applied by a non-owner after an owner, empty timeline, no matching labeled event, unrelated-label events being ignored, `isLabelPresent`'s own true/false cases, the CLI's plain/`--json`/unreadable-file behavior) and `scripts/acceptance-verdict.spec.js`'s new cases (ignored-actor rendering when unauthorized, no rendering when authorized, `unknown` actor rendering, the two new CLI flags in `parseArgs`, and an end-to-end CLI case). Full `scripts/*.spec.js` suite green (193/193).

Source: project owner, 2026-09-28, Issue #473 (EPIC-27 · Фаза 4).

**Amendment (2026-09-28, ISSUE-474, EPIC-27 · Фаза 4): the issue spec is frozen by a `spec-approved` label and a sha256 of the normalized body; a changed or unapproved spec is FAIL.**

1. **Approval record.** When a trusted owner applies the `spec-approved` label to an issue, `.github/workflows/spec-approval.yml` (`issues: labeled`, only for that label) posts a `github-actions[bot]` comment whose body starts with `<!-- spec-approved sha256=<64 hex> -->`. The hash is `hash()` from `scripts/spec-hash.js`: sha256 of the issue body (title excluded) after normalization — CRLF to LF, every `[x]`/`[X]` list checkbox reset to `[ ]`, trailing whitespace of each line and trailing empty lines removed — so a checkbox ticked by Ralph (`checkOffAcceptanceCriteria`) or in the GitHub UI is not a spec change. Re-applying the label posts a new comment; the latest approval comment wins.
2. **Who may approve.** `spec-hash.js approve` decides, not workflow shell: the event sender must be listed in `.github/verifier/owners.json` and must not be a `[bot]` login (`isBotLogin` from `scripts/label-authority.js`, the same owners file and bot rule as the `manual-verified` amendment above). Otherwise no comment is produced. The workflow reads the script, its helper and `owners.json` only from the default branch, reads the body through the GitHub API into a file (never from the event payload, never interpolated into shell), and has only `contents: read` and `issues: write`.
3. **Only bot comments count.** `findApproval()` accepts a comment only when its author is exactly `github-actions[bot]` and its body starts with the marker carrying exactly 64 lowercase hex characters. A marker in anyone else's comment, a marker not at the start, or a malformed hash is ignored.
4. **Verifier check.** The `verify` job fetches the issue body the same way (GitHub API into a file) and its comments, and runs `spec-hash.js check` from the trusted default-branch checkout, which writes `spec-approval.json` `{approved_hash, current_hash}` using the same `hash()`. The file travels in the `verdict` artifact, is removed with the others when `verify` did not succeed, and is always passed to `acceptance-verdict.js --approval`. Verdict rules: `approved_hash` differing from `current_hash` is FAIL `spec changed after approval` for both formats; no approval (`approved_hash: null`) is FAIL `spec not approved` for a `v2` issue and only the comment line `Spec approval: not approved (legacy)` for a `legacy` issue; a missing, unparsable or wrongly shaped file is FAIL `spec approval was not checked` (fail closed). A failed `check` step leaves the file absent rather than failing the job, so the other diagnostics are kept.
5. **Scope.** The `spec-approved` label itself is created by the owner, not by this change. `scripts/label-authority.js`, the `manual-verified` authorization and the Ralph controller are unchanged. After re-approving, the whole verifier workflow must be re-run (the approval is read in `verify`), not only `Report`.

Alternatives considered:
- Snapshot the spec from the issue's edit history (compare the current body with the version at label time) — rejected: the verifier would have to reconstruct history through a separate API, and a later label re-application would still need a stored anchor; a hash in a bot comment is one lookup.
- Store the hash in a hidden block inside the issue body — rejected: the executor who edits the body could recompute and rewrite the hash together with it; only a `github-actions[bot]` comment is outside the executor's reach.
- Only warn (comment line) on a changed or unapproved spec instead of FAIL — rejected: an independent check (ADR-041) is meaningless if the checked party can weaken the criteria and still get PASS; a warning does not stop that. `legacy` issues keep the warning-only behaviour for a missing approval so existing open issues are not blocked during the transition, but a changed approved spec fails for them too.
- Decide sender authorization with `jq`/shell in the workflow — rejected: untestable, and a second implementation of the bot rule next to `label-authority.js`.

Reason:
The verifier judged a PR against the current issue body, and the executor can edit that body: the `issues` skill tells it to extend `Affects` via `gh issue edit`, and Ralph rewrites the body to tick checkboxes. An executor could therefore weaken criteria to match its implementation and still receive PASS, i.e. "the executor did what it wrote for itself." Freezing the approved spec by hash, with the hash held where the executor cannot write, closes that gap while ignoring the checkbox ticks that are a legitimate part of the workflow.

Source: project owner, 2026-09-28, Issue #474 (EPIC-27 · Фаза 4).

**Amendment (2026-09-28, ISSUE-477, EPIC-27 · Фаза 5): `out_of_scope_files` is computed by a script from `## Affects`, not judged by the model, for a `v2` issue.**

1. New script `scripts/affects-scope.js` compares the PR's changed files (`.verifier/files.txt`, `git diff --name-status`) against the paths and glob patterns quoted in backticks in the issue's `## Affects` section, and writes `scope.json` `{out_of_scope: [...]}`. Path matching: `*` matches within one path segment, `**` matches across `/` (and `**/` at a pattern's start also matches a root-level file), a pattern ending in `/` is a recursive directory prefix, everything else matches exactly; all other regex-special characters (including `(`, `)`, `.`, `+`, `[`) are escaped literally. A rename/copy line is checked by its new path only; a deletion line by the path removed.
2. `.github/workflows/acceptance-verifier.yml`'s `verify` job runs the script (from the trusted default-branch checkout, same as `acceptance-verdict.js` itself) right after `Collect inputs`, independent of the Codex step, and uploads `scope.json` alongside the other verdict artifacts.
3. `scripts/acceptance-verdict.js` gained `--scope <scope.json>`: for a `v2` issue, each path in `scope.json`'s `out_of_scope` fails the verdict as `out of scope file (computed): <path>`, and a missing or malformed `scope.json` fails as `scope was not checked` (fail closed, same pattern as `--spec`/`--approval`). The model's own `out_of_scope_files` no longer decides the verdict for a `v2` issue; it is rendered in the PR comment under "Model scope hints" instead. A `legacy` issue is unaffected: the model's `out_of_scope_files` still fails the verdict exactly as before this amendment.
4. `.github/verifier/prompt.md` §8 tells the model this distinction: for a `v2` issue, its `out_of_scope_files` list is a hint shown as "Model scope hints" and does not by itself fail the review; for a `legacy` issue the previous behavior is unchanged.

Alternatives considered:
- Leave `out_of_scope_files` model-judged and rely only on the existing behavior-item impl+test pairing (ISSUE-471) to catch a wrong verdict indirectly — rejected: that check says nothing about scope, so a model that both under-cites references and forgets to flag an out-of-scope file would still pass.
- Compare changed files against `## Affects` using plain string-prefix matching only (no glob syntax) — rejected: several existing issues' `## Affects` entries already use directory-prefix paths that would need one entry per file without glob support, and the issue itself (INV-3) specifies `*`/`**` semantics.

Reason:
`out_of_scope_files` was the last verdict-deciding check in the verifier still resolved by the model rather than by code — ADR-041's ISSUE-443 amendment (§3) already named it a "possible later hardening" once ISSUE-470/471/472 moved ID matching, `ci` items and `absence` items out of the model's hands for the same reason: a model-judged verdict is a class of risk the other ADR-042 amendments already closed elsewhere. Until this amendment, an autonomous agent (Ralph) could drift outside an issue's `## Affects` and the verifier would only catch it if the model happened to notice and report the mismatch itself.

Source: project owner, 2026-09-28, Issue #477 (EPIC-27 · Фаза 5).

**Amendment (2026-09-28, ISSUE-478, EPIC-27 · Фаза 5): a trusted `required-checks.json` list replaces the hardcoded CodeQL check in `parseCiFailures`; a missing, still-running or failed required check is FAIL.**

1. `ciFailuresOf`/`parseCiFailures` (`scripts/acceptance-verdict.js`) no longer single out `Analyze (javascript-typescript)`. A new `requiredCheckFailures(checks, requiredChecks)` checks every name in a caller-supplied `requiredChecks` list against `ci.json`'s `checks` array: no matching check-run name is `required check missing: <name>` (FAIL); a matching check-run whose `status` is not `completed` is `required check not completed: <name>` (FAIL); `completed` with a `conclusion` other than `success` is `required check failed: <name> (<conclusion>)` (FAIL). The existing rule that any failed check/status fails the verdict regardless of name (ADR-041, ISSUE-435 amendment) is unchanged and runs independently, so a required check can produce both messages.
2. The list itself lives in a new trusted file, `.github/verifier/required-checks.json` (default branch, same trusted-checkout mechanism as `scripts/acceptance-verdict.js` itself — ADR-041), read by a new `--required-checks <file>` CLI argument (`readRequiredChecks`, same undefined/null/array shape as `readScopeResult`/`readApproval`: omitted argument has no effect, an unreadable or non-string-array file is FAIL `required checks were not checked`). `.github/workflows/acceptance-verifier.yml`'s `report` job adds the file to its trusted sparse-checkout and always passes `--required-checks trusted/.github/verifier/required-checks.json`.
3. Initial content of `required-checks.json` is exactly the 12 job names from `.github/workflows/ci.yml`: `Lint`, `Typecheck`, `Lint (apps/web)`, `Typecheck (apps/web)`, `Test (apps/api)`, `Test (e2e)`, `Build`, `Docker Build & Smoke Test`, `Test (apps/web)`, `Test (scripts)`, `Dependabot Severity Gate`, `Analyze (javascript-typescript)`. `codecov/patch` is deliberately excluded — it is an asynchronous external commit status that can still be `pending` when `ci.json` is collected, and enforcing it as a required check would produce a false FAIL on a merge-eligible PR; a failed `codecov/patch` still fails the verdict through the existing generic "any failed check" rule.
4. No project-specific literal (check name, ADR number, risk zone) was added to `scripts/acceptance-verdict.js` or `.github/workflows/acceptance-verifier.yml` by this change — both read the list from the trusted config file or from `ci.json`. Literals are confined to `required-checks.json` itself and to `scripts/acceptance-verdict.spec.js`'s fixtures.

Alternatives considered:
- Move branch protection to GitHub rulesets so the actual required-check list could be read via API — rejected: this is a repository-settings change outside this task's scope, and would not by itself fix the verifier's hardcoded single-check assumption.
- Read classic branch protection's required-status-checks list at verify time via a PAT stored in a new CI secret — rejected: `GITHUB_TOKEN` cannot read classic branch protection, and a new PAT is a new secret and a new failure/leak point for a check whose real list changes rarely enough that a trusted config file is simpler and equally auditable (a diffable, PR-reviewable file instead of an opaque repository setting).

Reason:
`parseCiFailures` validated only one hardcoded check (`Analyze (javascript-typescript)`) as "required"; every other required status check configured on `main`'s branch protection (`Test (apps/api)`, `Build`, etc.) had no missing/still-running detection — the existing "failed check" rule only looks at checks that already have a terminal conclusion, so a required check that never ran or was still `in_progress` when `ci.json` was collected did not affect the verdict. Since `GITHUB_TOKEN` cannot read the repository's actual classic branch protection settings, the verdict is the only automated backstop against merging on an incomplete or missing required check, and it was tied to one specific check rather than the real list. A trusted, git-tracked config file generalizes the same fail-closed pattern ADR-042's earlier amendments already established for `--spec`/`--scope`/`--approval`.

Source: project owner, 2026-09-28, Issue #478 (EPIC-27 · Фаза 5).

**Amendment (2026-09-28, ISSUE-479, EPIC-27 · Фаза 5): a deterministic diff scanner adds `test tampering (scan)` failures alongside the model's own `test_tampering` judgement.**

1. **New script.** `scripts/test-tampering-scan.js` parses `.verifier/diff.patch` line by line — only added (`+`) and removed (`-`) lines, no filesystem access (INV-3) — and finds: an added skip-style marker (`.only(`, `.skip(`, `xit(`, `xdescribe(`, `it.todo(`, `test.todo(`) in a file of class "test"; an added lint/type suppression (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) in a file of class "test", "workflow" or "config"; an added `continue-on-error: true` or `if: false` in a file of class "workflow"; a numeric `"key": value` decreasing between a removed and the next added line for the same key **within the same diff hunk** in a file of class "config" (covers a lowered `coverageThreshold`, without hardcoding that key name — scoping the pairing to one hunk, not the whole file, was fixed during `/code-review` before this landed: matching by key across the whole file let an unrelated same-named key changed elsewhere steal the pairing slot and hide a real decrease); and a test-class file whose removed `expect(`/`assert.` lines outnumber its added ones. All five checks do plain substring matching on the raw line text (INV-10), the same style the verifier's own `absence` check already uses — not a YAML/AST parse. A path matching more than one class is checked under the union of all matching classes, not the first match (INV-9).
2. **File classes come only from a trusted config**, `.github/verifier/tampering-scan.json` (INV-1), never from literals in the script: `test` (`**/*.spec.ts`, `**/*.spec.tsx`, `**/*.spec.js`, `**/*.test.js`, `**/*.e2e-spec.ts`), `workflow` (`.github/workflows/*.yml`), `config` (`**/eslint.config.*`, `**/.eslintrc*`, `**/jest.config.*`, `**/vitest.config.*`, `**/tsconfig*.json`, `**/package.json`). Glob matching reuses `affects-scope.js`'s own `patternToRegex` (ISSUE-477) rather than a second implementation of the same `*`/`**` semantics.
3. **Wiring.** `.github/workflows/acceptance-verifier.yml`'s `verify` job adds `scripts/test-tampering-scan.js` to its trusted sparse-checkout (alongside `.github/verifier`, which already carries `tampering-scan.json`) and a new step, `Scan diff for test tampering`, independent of the Codex step, writing `tampering-scan-result.json`; that file is uploaded in the `verdict` artifact and always passed to `acceptance-verdict.js` as `--tampering-scan` from the `report` job (unconditionally, the same pattern `--ci` already uses — not gated behind a v2 spec check like `--scope`/`--approval`).
4. **`acceptance-verdict.js`** gained `--tampering-scan <file>`: each finding becomes a FAIL `test tampering (scan): <description>`, and a missing or unparsable file is FAIL `tampering scan was not run` (fail closed, mirroring `--ci`'s existing "CI results were not checked" pattern rather than `--spec`'s "omitted has no effect" pattern, since this check is mandatory, not optional). Findings from the scanner are never excused by `manual-verified` (INV-6), exactly like the model's own `test_tampering` entries.
5. **Second, independent layer.** The model's own `test_tampering` field in the JSON report (ADR-041) is unchanged and still runs; the scanner does not replace it, only adds a deterministic backstop for the same class of finding a missed model judgement could otherwise let through as PASS — the same "move a judgement out of the model's hands where it can be computed" pattern this ADR's ISSUE-470/471/472/477/478 amendments already established for ID matching, `ci`/`absence` items, `out_of_scope_files` and required checks.
6. **Test fixtures never contain the forbidden markers as contiguous literals** (INV-4): `scripts/test-tampering-scan.spec.js` builds each marker (`.only(`, `eslint-disable`, `continue-on-error: true`, etc.) by string concatenation, since the spec file itself is of class "test" and would otherwise be flagged by the very scanner it tests the next time it is edited.

Alternatives considered:
- Catch these markers/suppressions in every file, not just the configured test/workflow/config classes — rejected: `eslint-disable`/`@ts-ignore` can be legitimate in application code, and unlike `manual-verified` the scanner offers no label-based bypass, so unrestricted detection would produce false FAILs with no escape hatch.
- Full YAML/AST parsing for the workflow and coverage-threshold checks instead of line-level substring matching — rejected: added dependency and complexity to eliminate rare false positives that are cheap to fix in the PR itself, versus the real risk this scanner exists to catch (a missed test weakening going unnoticed).
- First-match class resolution (stop at the first matching config class) instead of union of all matching classes — rejected: this would make the order of keys in the JSON config silently decide which check applies to an ambiguous path, an unpredictable dependency on object key order.

Reason:
`test_tampering` in the verifier's JSON report (ADR-041) was judged only by the model — a PR could add `.only(` to a spec file, lower a numeric `coverageThreshold`, or delete `expect(` assertions, and the only defense was whether the model happened to notice it in that specific run. ADR-042's earlier amendments already moved `ci`/`absence` items (ISSUE-472), ID matching (ISSUE-470), scope (ISSUE-477) and required checks (ISSUE-478) out of the model's hands for the identical reason — a model-judged verdict is a class of risk the rest of this ADR already closed elsewhere; `test_tampering` was the last one left. A diff-only, config-driven scanner gives a deterministic, auditable backstop without replacing the model's own judgement, which stays as a second, independent layer.

Verified via the full `scripts/*.spec.js` suite (288/288 — 21 new cases in `test-tampering-scan.spec.js` covering AC-1 through AC-15, TR-1/TR-3, and the `/code-review`-found hunk-scoping regression, plus 6 new cases in `acceptance-verdict.spec.js` covering AC-16/AC-17/TR-2/TR-4, the `manual-verified` exclusion, and `parseArgs`, plus the pre-existing CLI end-to-end tests updated to pass `--tampering-scan`), and a self-scan of this PR's own diff (zero findings, confirming the scanner does not flag its own change).

Source: project owner, 2026-09-28, Issue #479 (EPIC-27 · Фаза 5).

**Amendment (2026-09-28, ISSUE-535, EPIC-27 · Фаза 5): moved assertion lines are subtracted before the per-file comparison; a remaining loss is FAIL unless a trusted owner sets `test-removal-approved`.**

1. **Moves are subtracted first.** `scripts/test-tampering-scan.js` no longer compares removed and added `expect(`/`assert.` lines file by file on their own. Step 1: removed assertion lines of `test`-class files, in diff order, are matched against added assertion lines of `test`-class files of the same diff by their text with leading and trailing whitespace trimmed; each added line covers at most one removed line, and source and target may be the same file. Step 2: for each `test`-class file, `lost` = its uncovered removed lines minus its uncovered added lines, kept only when greater than zero. Assertion lines of files outside the `test` class are neither a source nor a target of a move. The scanner still reads only the diff text, and file classes still come only from `.github/verifier/tampering-scan.json`.
2. **Result shape.** The scanner writes `{ "findings": [string], "assertion_losses": [{ "path": string, "lost": number }], "assertion_moved": number }`. `findings` no longer carries assertion messages. `assertion_moved` (removed lines counted as moved) is rendered in the PR comment as `Moved assertion lines: <n>` and never changes the verdict.
3. **Verdict.** `scripts/acceptance-verdict.js` fails with `test tampering (scan): <path>: <lost> assertion line(s) removed without a matching added line` for every entry of `assertion_losses`, unless `--test-removal-approved` is passed; with it, the losses are listed under "Approved assertion losses" and do not fail. The approval excuses only `assertion_losses`: not `findings` (skip markers, suppressions, `continue-on-error`/`if: false`, a lowered threshold), not the model's own `test_tampering`, not `UNVERIFIABLE`. `--manual-verified` does not excuse `assertion_losses`. A scan result missing `assertion_losses` or `assertion_moved`, or with a malformed loss entry (no string `path`, or `lost` not an integer ≥ 1), is FAIL `tampering scan was not run` (fail closed).
4. **Who may approve.** The `report` job authorizes `test-removal-approved` exactly like `manual-verified` (ISSUE-473 amendment above): `scripts/label-authority.js` with the trusted `.github/verifier/owners.json`, both from the default-branch checkout, on the same `timeline.json` snapshot (the timeline is fetched once for both labels). An authorized label passes `--test-removal-approved`; a present but unauthorized one passes `--test-removal-ignored <actor>` or `--test-removal-ignored-unknown`, which renders `test removal approval ignored: set by <actor|unknown>` and leaves the losses failing. A failed timeline fetch means the label is not counted. The label name appears only in the workflow; the scripts take generic CLI flags. The reason for a reduction is not recorded in a PR-body section or commit trailer: the label is the owner's statement that the explanation in the PR comments was read and the reduction is intentional, and the timeline records who set it and when.
5. **Accepted limits.** An assertion edited while being moved counts as lost and needs the label (a false positive on the safe side). A line moved into a test that never runs counts as moved; an explicit skip-style marker is still caught by `findings`, anything subtler is left to the model's `test_tampering`. Matching is by line text only, not by test: a removed assertion identical to an unrelated line added in another test file (a generic `expect(result).toBeDefined();`) counts as moved, so deleting a test whose assertions are all such common lines can pass the scan; this case too is left to the model's `test_tampering` (found by `/code-review` before this landed, kept because the matching rule itself is the decided design).

Alternatives considered:
- Sum assertion lines across the whole PR — rejected: it cannot see an agent deleting an inconvenient test in one file while adding unrelated new ones in another, since the sum stays equal.
- Keep the per-file comparison without subtracting moves — rejected: splitting one spec file into several produces a false FAIL on the source file, because git pairs renames one to one.
- Compare the list of test names between base and head — rejected: it needs the test runner on two trees, which breaks the diff-only rule of the scanner.
- Label only, without subtracting moves — rejected: the owner would have to set it on every test refactoring, which turns it into a rubber stamp.
- Require a reason section in the PR body — rejected: extra parsing for the same audit trail the label timeline already gives.
- Name the label `tests-verified`, or let it excuse all scanner findings — rejected: the name is easy to confuse with `manual-verified`, and excusing all findings would also clear explicit test-weakening markers.

Reason:
The ISSUE-479 scanner compared assertion lines per file. Splitting a large spec file into several new ones shows up in the diff as almost all assertions removed from the old file and only added in the new ones, so the old file produced a FAIL that nothing could clear (scanner findings are not excused by `manual-verified`), and a deliberate removal of duplicate or obsolete tests had no legitimate path to PASS either. Advisory today, this would block ordinary test refactoring once `VERIFIER_ENFORCE` is `true`. Subtracting moved lines (the idea behind `git diff --color-moved`) removes the false FAIL without reopening the swap-tests-between-files gap a PR-wide sum would have, and an owner-only label gives a deliberate reduction an audited path.

Source: project owner, 2026-09-28, Issue #535 (EPIC-27 · Фаза 5).

**Amendment (2026-09-29, ISSUE-536, EPIC-27 · Фаза 5): `scripts/acceptance-verdict.js` split into `scripts/acceptance-verdict/` modules; the entry file stays a facade.**

1. **Module layout.** `scripts/acceptance-verdict.js`'s ~1070 lines of logic (shape predicates, file readers, reference/containment checks, coverage/ID matching, CI parsing, deterministic `ci`/`absence` computation, verdict assembly, comment rendering) move into `scripts/acceptance-verdict/{common,inputs,refs,coverage,ci,computed,verdict,render}.js`, one responsibility per file, each with its own `*.spec.js` next to it (ADR-020: one source file, one same-named spec file). `scripts/acceptance-verdict/test-helpers.js` holds shared test fixtures used by more than one of those specs (`report()`, `criterion()`, `ref()`, `makeCheckout()`, `V2_SPEC`, etc.) — it carries no `test(` calls itself, so `node --test` and the ISSUE-479 tampering scanner both leave it alone.
2. **The entry file becomes a facade, not deleted.** `scripts/acceptance-verdict.js` keeps `parseArgs`, `USAGE`, `runCheckRefs`, `runVerdict`, `main`, the `require.main === module` CLI guard, and re-exports every function the modules define — the exact same name set the file exported before the split, and the same objects (not copies), so every existing caller (`.github/workflows/acceptance-verifier.yml`, `scripts/acceptance-verdict.spec.js`'s remaining CLI/`parseArgs` tests) needs no change beyond the CLI invocation staying at the same path.
3. **Both trusted `sparse-checkout` lists gain `scripts/acceptance-verdict/`.** `.github/workflows/acceptance-verifier.yml`'s `verify` job and `report` job each fetch the verdict script from the default branch into a partial checkout (ADR-041) that lists individual files, not whole directories, by design — so splitting the script into a new directory without adding that directory to both lists would make the trusted checkout miss every new module file, and the workflow would fail closed with `Cannot find module` on the very next PR after merge. `scripts/acceptance-verdict.spec.js` gained a regression test that reads both sparse-checkout lists directly out of the workflow file, builds two temporary directories holding only the files each list actually names, and runs the real CLI from both — so a future module added to the directory but forgotten in either list fails this test before merge, not the live workflow after it.
4. **No behavior change.** Every test that existed in `scripts/acceptance-verdict.spec.js` before this split still exists afterward, under the same name and with the same assertions, in exactly one of the new spec files or the (trimmed) entry spec file — moved, not rewritten. `scripts/test-tampering-scan.js`'s assertion-count scan (ISSUE-479/535) confirms this mechanically: the diff for this change adds at least as many assertion lines as it removes, since tests were relocated, not deleted.

Alternatives considered:
- Keep `scripts/acceptance-verdict.js` as one file and rely on section comments/regions for navigation — rejected: the file already reached ~1070 lines mixing at least eight distinct responsibilities (schema predicates, containment checks, CI parsing, coverage/ID matching, deterministic computation, verdict assembly, rendering, CLI), and each of the last four amendments to this same ADR (ISSUE-472, 477, 478, 479, 535) had to edit unrelated-looking regions of both the source and its ~1880-line spec file, making diffs hard to review in isolation.
- Split into flat sibling files (`scripts/acceptance-verdict-common.js`, `scripts/acceptance-verdict-inputs.js`, etc.) instead of a `scripts/acceptance-verdict/` directory — rejected: each new file would need its own line in both trusted `sparse-checkout` lists, so a forgotten file silently breaks the workflow after merge; a single directory entry (`scripts/acceptance-verdict/`) covers every current and future module file in one line.
- Move the CLI (`parseArgs`/`main`) into the new directory alongside the other modules, leaving `scripts/acceptance-verdict.js` as a thin `require('./acceptance-verdict/cli').main(...)` shim — rejected: it would change the workflow's `node scripts/acceptance-verdict.js ...` invocation lines and the `SCRIPT` path used by the CLI's own `spawnSync` tests, for no benefit over keeping the entry file itself as the executable facade.

Reason:
`scripts/acceptance-verdict.js` (the verdict script referenced throughout this ADR's prior amendments — ISSUE-472, 477, 478, 479, 535) and its spec file had grown large enough that a single-responsibility change (e.g. ISSUE-535's assertion-move detection) required touching regions of both files unrelated to that change, and the two files' logic-to-navigation ratio made it easy for a future amendment to misplace new logic next to the wrong existing function. Splitting by responsibility, with each module's tests next to it (ADR-020) rather than in one growing spec file, is a pure internal reorganization — this amendment does not add, remove, or change any verdict-affecting behavior itself, only where the code that computes it lives. Doing this only after ISSUE-535 landed (not concurrently) avoided the two changes conflicting over the same file regions and let this split use ISSUE-535's finished assertion-move-detection scanner to mechanically confirm no test coverage was lost in the move.

Source: project owner, 2026-09-29, Issue #536 (EPIC-27 · Фаза 5).

**Amendment (2026-09-29, ISSUE-480, EPIC-27 · Фаза 6): every rendered comment carries a Provenance block (PR head, issue body hash, verifier commit, model, Codex CLI version); missing/malformed provenance fails the verdict.**

1. New mandatory input `provenance.json` `{head_sha, issue_body_sha256, verifier_commit, model, codex_version}` is written by a new `verify` job step, `Write provenance`, independent of `Run verifier`'s outcome (guarded only by `steps.collect.outputs.stale != 'true'`) and uploaded in the `verdict` artifact alongside `ci.json`/`tampering-scan-result.json`/etc.
2. `head_sha`/`verifier_commit` come from `github.event.workflow_run.head_sha`/`github.sha` — the same expressions `Collect inputs`/`Compute verdict and comment`/`Set commit status` already use for `HEAD_SHA` — not a second, independently-derived value. `issue_body_sha256` is computed with `node trusted/scripts/spec-hash.js hash .verifier/issue-body.md`, the exact file `Check spec approval` (#474) already reads, never a second hash/normalization implementation. `model`/`codex_version` are the same values passed to `Run verifier`'s `model:`/`codex-version:` inputs; a new job-level `env.CODEX_VERSION` on the `verify` job now backs the `codex-version: 0.156.1` literal (the ADR-041 ISSUE-449 pin, unchanged in value) so both the workflow step and `provenance.json` read the one value instead of two independent literals.
3. `scripts/acceptance-verdict/inputs.js` gained `parseProvenance` — a mandatory, fail-closed reader (same pattern as `parseTamperingScan`: there is no "argument omitted, no effect" case distinct from "could not be read", unlike the optional `--spec`/`--scope`/`--approval` readers). `verdict.js`'s `collectFailures`/`evaluate` add a `provenance missing` failure whenever the parsed value is `null` (absent file, unparsable JSON, or any of the five fields failing shape validation — `head_sha`/`verifier_commit` must be 40-character lowercase hex, `issue_body_sha256` 64-character lowercase hex, `model`/`codex_version` non-empty strings), never excused by `--manual-verified` or `--test-removal-approved`. `render.js` renders a `**Provenance**` block naming all five values whenever a valid object is present — on both PASS and FAIL comments, for both `v2` and legacy issues — placed after the `## Acceptance verifier: <verdict>` heading and the optional `Issue format: legacy`/ignored-label lines and before the Criterion table. The facade (`scripts/acceptance-verdict.js`) gained the `--provenance <file>` CLI argument, wired into `runVerdict`/`USAGE` the same way `--tampering-scan`/`--ci` already are.
4. Scope: this only adds identification to the comment. It does not change what is checked, does not add a new label, and does not touch `spec-approval.yml` (#474's own hash/approval mechanism is reused read-only via `spec-hash.js hash`, not modified).

Alternatives considered:
- Read the model/Codex version from the workflow run's own metadata after the fact (e.g. re-deriving them from the Actions run log) instead of writing a dedicated `provenance.json` from values already known at workflow-authoring time — rejected: it would duplicate a value the workflow file already states once (`Run verifier`'s own `model:`/`codex-version:` inputs) instead of reading it from that single source, and would not give a clean fail-closed hook for a missing/malformed value the way a dedicated verdict-artifact file already does for `ci.json`/`tampering-scan-result.json`.
- Render the Provenance block only on FAIL comments, to keep PASS comments shorter — rejected: the gap this amendment closes is specifically that a stale PASS comment (left over from before a verifier code/prompt/schema change) renders identically to a fresh one; omitting the block from PASS comments would leave that exact case unaddressed.

Reason:
ADR-042 has been amended more than a dozen times (ISSUE-470 through ISSUE-536), each changing the verifier's own workflow/prompt/schema/scripts — all of which `workflow_run` always executes from the default branch (ADR-041), so a PR cannot see or influence which version ran against it. Because every one of those versions renders the same comment shape, a reviewer looking at a PASS or FAIL on an older PR had no way to tell from the comment itself whether it reflected the current issue body (e.g. after a `spec-approved` re-approval changed it, #474) or a superseded verifier version, and nothing to cite when investigating why a specific run produced a given verdict. A labeled Provenance block, backed by a mandatory fail-closed file, closes that gap the same way this ADR's other amendments already closed the equivalent gaps for ID matching (#470), required checks (#478) and test tampering (#479) — moving another previously-implicit fact into an explicit, verifiable field.

Source: project owner, 2026-09-29, Issue #480 (EPIC-27 · Фаза 6).

**Amendment (2026-09-29, ISSUE-481, EPIC-27 · Фаза 6): the verifier's `provenance.model` is checked against a trusted allowlist, `.github/verifier/allowed-models.json`.**

1. `.github/verifier/allowed-models.json` (default branch) is a JSON array of the model names `VERIFIER_MODEL` (the repo variable, ADR-041 §1) is allowed to hold — currently exactly `["gpt-6-luna"]`, the alias observed in the real `Verify` run at the time this amendment was written. A dated-suffix regexp (`-YYYY-MM-DD$`) was considered and rejected: the live alias carries no date suffix and a dated version was never confirmed to exist, so such a pattern would reject the model actually in use.
2. `scripts/acceptance-verdict/inputs.js` gained `parseAllowedModels(raw)`, a mandatory fail-closed reader in the same category as `parseTamperingScan`/`parseProvenance` — `null` in means the file was never read (argument omitted or unreadable), `null` out means missing, unparsable, or not a JSON array of strings; there is no "argument omitted, no effect" case distinct from "could not be read", unlike the optional `readRequiredChecks`/`readScopeResult` readers.
3. `scripts/acceptance-verdict/verdict.js`'s `collectFailures` gained the check: `allowedModels === null` always fails with `allowed models were not checked`; otherwise, when `provenance.model` is known (`provenance !== null`) and is not exactly present in the list, it fails with `VERIFIER_MODEL is not in allowed-models.json: <model>` — a plain string-equality comparison, no case-folding, no glob/regex matching. When `provenance` itself is `null`, this check is skipped (the pre-existing `provenance missing` failure, ADR-042's ISSUE-480 amendment, already covers that case, so nothing here would add information). Placed inside `collectFailures` (not in the always-checked-early `provenanceFailures` path that runs even when the spec is invalid or no report was read) — matching how `tamperingFindings` is already checked only on the full-evaluation path, so a spec-invalid or no-report early return is unaffected by this new check, consistent with the existing behaviour those paths already had.
4. `scripts/acceptance-verdict.js` (facade) gained the `--allowed-models <file>` CLI argument, wired into `parseArgs`/`USAGE`/`runVerdict` the same way `--tampering-scan`/`--provenance` already are, and re-exports `parseAllowedModels`.
5. `.github/workflows/acceptance-verifier.yml`'s `report` job adds `.github/verifier/allowed-models.json` to its trusted `sparse-checkout` list and passes `--allowed-models trusted/.github/verifier/allowed-models.json` in `ARGS`, unconditionally (the same pattern `--ci`/`--tampering-scan`/`--provenance` already use, not the optional `--scope` pattern).
6. The FAIL message names the repo variable `VERIFIER_MODEL`, not the internal `provenance.model` field name — the message is read by a human on the PR comment and must point at the setting to change (repository Settings → Variables), not at an internal JSON field they cannot act on directly.
7. Accepted limit: this check catches only a model name absent from the trusted list. It does not detect a provider silently updating a model release behind the same alias — that class of drift is out of scope for a name-only allowlist and is not claimed to be caught here.

Alternatives considered:
- A regexp requiring a dated suffix (`-YYYY-MM-DD$`) instead of a trusted list — rejected per point 1: the live model name (`gpt-6-luna`) does not carry a date suffix, and no dated variant was confirmed to exist, so the pattern would reject the model actually in production use.
- Reading `VERIFIER_MODEL` itself at verify time and comparing it against a list, instead of trusting `provenance.model` (already read once, in the `verify` job, and carried through the artifact) — rejected: `provenance.json` already carries the exact value the workflow used for that run (ADR-042, ISSUE-480 amendment), so re-reading the repo variable a second time in the `report` job would only duplicate a value already captured, with no additional guarantee — and repo variables are not visible to `workflow_run`'s `report` job without adding new permissions.

Reason:
ADR-042's prior amendments already moved ID matching (#470), `ci`/`absence` items (#472), scope (#477), required checks (#478) and test tampering (#479) out of the verifier model's own hands, each time because a decision able to silently shift a PR's verdict must be deterministic and reviewable through the PR itself, not a setting only the repository owner can see. The model name behind `VERIFIER_MODEL` was the one remaining such lever: it can be changed in repository settings, with no PR and no git trail, and nothing previously checked whether the value in play for a given run was one the project actually vetted. A trusted, git-tracked allowlist closes that gap the same way the earlier amendments closed theirs, while `provenance.json` (ISSUE-480) already gives this check a value to compare against without any new plumbing.

Verified via the full `scripts/*.spec.js` suite (361/361 — new cases in `inputs.spec.js` for `parseAllowedModels`'s accept/missing/invalid-JSON/not-a-string-array paths, in `verdict.spec.js` for AC-2 through AC-5 and the "not checked" fail-closed case, and in `acceptance-verdict.spec.js` for the two dedicated CLI end-to-end cases (TR-1/TR-2) plus updates to every existing PASS-path CLI fixture that already wrote a `provenance.json`, so each now also writes a matching `allowed-models.json`).

Source: project owner, via Issue #481 (EPIC-27 · Фаза 6), 2026-09-29.

**Amendment (2026-09-29, ISSUE-482, EPIC-27 · Фаза 6): a FAIL made only of model judgement gets one second model run in a separate job; runs that disagree give `NEEDS_HUMAN`.**

1. **Reason sources.** `scripts/acceptance-verdict/verdict.js`'s `collectFailures`/`evaluate` return `reasons: [{text, source}]` alongside `failures` (`failures` is `reasons.map(text)`, same strings and order as before). `source` is `model` for: a criterion or invariant `FAIL`/`UNVERIFIABLE` from the model, a PASS without references, a bad reference or unchecked references (`refs-problems.json`, which also carries the ID/coverage problems), `no criteria were checked`, the model's own `test_tampering`, a missing or invalid report, and a legacy report's `out_of_scope_files`. It is `deterministic` for: a computed `ci`/`absence` item, CI and required checks, computed scope, the tampering scan (findings and assertion losses), spec invalid / not checked, approval, provenance and allowed models. `UNVERIFIABLE` is a model reason regardless of `manual-verified`, because the decision is made in `Verify`, which does not read labels. When there is no report at all, `evaluate` now also lists the report-independent deterministic reasons (tampering scan, CI, allowed models); before, that path listed only provenance/spec/approval/scope, so a missing report next to a red check would have looked model-only.
2. **When the second run happens.** `scripts/acceptance-verdict/second-run.js` `needsSecondRun(result)` is true only for a `v2` issue whose verdict is FAIL and whose every reason has `source: model`. `Verify` computes it in a `Decide second run` step (`acceptance-verdict.js <verdict.json> --needs-second-run` plus the same deterministic inputs `Report` uses) and exposes it as the job output `needs_second_run`; any error in that step yields `false`. A legacy issue never gets a second run, because its entries have no IDs to compare.
3. **Separate job.** `Verify second` (`needs: verify`, only when `needs_second_run == 'true'`) is a separate job because `drop-sudo` runs only once per job (ADR-041, ISSUE-449 amendment, point 4). It uses the same `openai/codex-action` v1.11 pin and pin comment, `sandbox: read-only`, `safety-strategy: drop-sudo`, `continue-on-error`, step and job timeouts, the default-branch prompt and schema, `vars.VERIFIER_MODEL` and `CODEX_VERSION` (now a workflow-level `env`, so both Codex steps and `provenance.json` read one value). It does not collect inputs again: `Verify` uploads `.verifier/` in the `verdict` artifact (`include-hidden-files: true`, since upload-artifact skips hidden directories otherwise), and `Verify second` restores only `.verifier/` and `spec-lint.json` from it, so the second model never sees the first run's verdict. The PR head is checked out as data at the same `head_sha`. It writes `verdict2.json` and `refs-problems2.json` (its own `--check-refs`) to the `verdict-second` artifact. `OPENAI_API_KEY` exists only in the two Codex steps; `Report` still has no key.
4. **Reconciliation.** `Report` has `needs: [verify, verify-second]` and passes `--second verdict2.json --second-refs-problems refs-problems2.json` whenever `needs.verify-second.result != 'skipped'`, even if the files are missing. `reconcile(first, second)` evaluates both reports on identical deterministic inputs and decides:
   - second report missing or invalid → FAIL (fail closed);
   - first report missing or invalid, second valid → the second run's verdict;
   - otherwise the model IDs are compared: `criteria` without computed `ci`/`absence` IDs, plus `invariants`, only IDs present in both reports. A different status for any such ID, or `test_tampering` empty in one report and not the other, is a divergence → `NEEDS_HUMAN`, naming the IDs (`test_tampering` for the latter). An ID missing from the first report is not a divergence; the second report's own coverage check fails it if needed. Without divergence the outcome is the second run's full verdict, with its own refs-problems, so PASS is possible.
5. **Output.** The CLI prints `PASS`, `FAIL` or `NEEDS_HUMAN`. `NEEDS_HUMAN` is not PASS: `Set commit status` gives `failure` under `VERIFIER_ENFORCE=true`, otherwise `success` with `Advisory, verdict: NEEDS_HUMAN`. The comment heading is `## Acceptance verifier: NEEDS_HUMAN` with a "Runs disagree on" list. Whenever the second run happened, whatever the final verdict, the comment carries a "Second run" block with the first run's FAIL reasons and its per-ID statuses (or "no report"); it is absent when there was no second run.
6. **Known consequence.** The `Verify second` Codex step and `Report`'s download of `verdict-second` add `continue-on-error: true` to the workflow, which the tampering scanner (ISSUE-479 amendment) reports as a deterministic finding on the PR introducing them; the scanner has no bypass for workflow findings, so that PR's advisory verdict is FAIL on these lines.

Alternatives considered:
- Always run the model twice — rejected: twice the cost on every PR, while a second run can change the outcome only when every FAIL reason is the model's.
- Retry inside `Verify` — rejected: `drop-sudo` cannot run twice in one job in either action version (ADR-041, ISSUE-449 amendment), which is also why the ISSUE-445 retry never ran.
- Let the second run only confirm a FAIL — rejected: the PR #512 case (all items PASS, one quote spoiled by escaping) would stay FAIL.
- `NEEDS_HUMAN` whenever the two verdicts differ, even with identical statuses — rejected: it calls a human without a real disagreement (for example when only the first run's quote was broken).
- `NEEDS_HUMAN` when the first run left no report — rejected: an infrastructure failure should not need a human when the second run produced a complete report.
- Classify reasons by parsing the reason strings — rejected: brittle against wording changes; the source is recorded where the reason is created.
- Match legacy entries by position — rejected: the model reorders and splits entries.

Reason:
A single model run is noisy. On PR #512 all ten items were PASS and CI was green, but the verdict was FAIL because the model spoiled the escaping in one quoted JSON line; on PR #525 one run invented a symlink bypass the code already rejects and reported a `test_tampering` bug already fixed in the same commit. A false FAIL teaches reviewers to distrust every FAIL, and with `VERIFIER_ENFORCE=true` it would block a correct merge. Re-running only when the FAIL is entirely model judgement keeps the cost bounded, and comparing statuses by issue ID turns a genuine disagreement into an explicit human decision instead of a silent PASS or FAIL. Point 1's list of which reasons are `model` and which are `deterministic` is kept in the decision itself rather than moved to an implementation note (an observation from the independent review of this draft): it is the rule that decides whether a second run happens, and a future check added to the verifier has to be placed on one side of it.

Source: project owner, 2026-09-29, Issue #482 (EPIC-27 · Фаза 6).

**Amendment (2026-09-29, ISSUE-483, EPIC-27 · Фаза 7): a golden case set replays known-defect PRs against the current verifier prompt/schema/model pin, on manual demand.**

`.github/verifier/golden/<pr>/` (one subdirectory per case) holds `case.json`
(`{pr, base_sha, head_sha, expected: "PASS" | "FAIL", reason}`), `issue.md`
(the linked GitHub Issue's title+body exactly as `acceptance-verifier.yml`'s
`Collect inputs` step would have written `.verifier/issue.md`) and `ci.json`
(a frozen CI snapshot for `head_sha`, in the same shape `Collect inputs`
writes to `.verifier/ci.json`). `head_sha`/`base_sha` are real commits
reachable from `main`'s history; `ci.json` is a deliberately frozen snapshot
rather than a live re-fetch, because GitHub's check-runs API reports a
commit's *latest* rerun state, which can differ from the state the original
verifier run actually saw (a check that failed then can show green today
after a later rerun).

Three seed cases are added, all `expected: "FAIL"`: PR #434
(CodeQL/`Analyze (javascript-typescript)` had failed before the verifier
collected its inputs, ADR-041's ISSUE-435 amendment), PR #446
(`scripts/git-closure-gate-hook.js` intercepted the literal text
`echo git commit` by substring match at that head — a real code defect, not
a CI failure), and PR #463 (a valid-JSON-but-non-array session marker let
`gh issue create`/`edit` through the `issues`-skill gate at that head — a
real code defect, not a CI failure). No `expected: "PASS"` case is added in
this change.

`scripts/verifier-eval.js` (new) compares each case's `expected` verdict
against an `actual` verdict read from a results directory (one `<case>.json`
file per case, `{ "actual": "PASS" | "FAIL" }`, produced separately by
running `scripts/acceptance-verdict.js` against that case's frozen inputs).
It reports a `<case> | <expected> | <actual>` row per case and three counts:
`false PASS` (expected `FAIL`, actual `PASS` — the main metric, since it
means a wording change silently stopped catching a known regression),
`false FAIL` (expected `PASS`, actual `FAIL` — counted for visibility, not
the main metric), and `run failures` (the actual-result file is missing or
its `actual` value is not `PASS`/`FAIL` — counted separately from both,
since the case was not judged at all rather than judged wrong).

`.github/workflows/acceptance-verifier-eval.yml` (new) runs only on
`workflow_dispatch`, never automatically on a PR — this is a manual tool the
owner runs before merging a prompt/schema/model-pin change, not a standing
merge gate. It discovers case directories, then for each one replays the
real verifier's two-run pipeline (ADR-042, ISSUE-482 amendment) against that
case's frozen `head_sha`/`issue.md`/`ci.json`: a `verify-case` matrix job
checks out `head_sha` as data (never executed) and the trusted verifier
prompt/schema/scripts from the default branch (same
`openai/codex-action@52fe01ec70a42f454c9d2ebd47598f9fd6893d56` (v1.11) pin
`acceptance-verifier.yml` uses), builds that case's `.verifier/diff.patch`/
`files.txt`, tampering-scan result, `provenance.json` and (via
`issue-lint.js`/`affects-scope.js`) its spec-lint/Affects-scope result, and
runs a first Codex pass; a separate `verify-case-second` matrix job (a
separate job because `drop-sudo` can only run once per job) always runs a
second Codex pass on the same restored inputs, for every case — not only
when the first run's FAIL was entirely model judgement, unlike the real
verifier's own skip heuristic, since the case set here is small and run
rarely, so the extra cost buys a stronger check (both runs must agree)
instead of matching the real skip heuristic's cost profile; a `summarize`
job reconciles both runs per case with `scripts/acceptance-verdict.js` (the
same function `Report` uses) against that case's frozen deterministic
inputs, and runs `scripts/verifier-eval.js` over every case's reconciled
result to publish the summary (including the false-PASS count) to the job
summary. `OPENAI_API_KEY` exists only in the two Codex-calling jobs.

Alternatives considered:
- Running this automatically on every PR instead of only via
  `workflow_dispatch` — rejected: it would call the model an extra N times
  (once per golden case) on every PR merely to catch a regression class
  that only changes when the verifier's own prompt/schema/model pin
  changes, not on ordinary application code changes; Issue #483 scoped this
  to a manual, on-demand check run before a prompt/schema change is merged.
- Adding `expected: "PASS"` cases in this same change — rejected: Issue
  #483 explicitly scoped the first case set to three already-investigated
  `FAIL` regressions only, to avoid conflating two different risks (a
  wording change introducing a false PASS vs. introducing a false FAIL) in
  one initial measurement; extending the set with PASS cases is left to a
  follow-up task.
- Live-refetching each case's `ci.json`/check-runs at eval time instead of
  storing a frozen snapshot — rejected: GitHub's check-runs API always
  reports the *current* state of a commit, and every one of the three seed
  defects was later fixed and its check rerun to green on the very same
  SHA, so a live fetch would silently stop reproducing the regression the
  case exists to guard against.
- A single Codex run per case (no reconciliation) — rejected during this
  task's own `/code-review` pass: two of the three seed cases (PR #446,
  #463) depend entirely on the model's own single-shot code reading to
  produce the expected `FAIL`, with CI green for both — exactly the noisy,
  model-judgement-only class of input ADR-042's ISSUE-482 amendment
  documents a single run getting wrong (PR #512, #525). A single-run eval
  could report a false `false PASS`/`false FAIL` on a lucky or unlucky
  roll, undermining the tool's own purpose.
- Replicating the real verifier's conditional "needs second run" heuristic
  (only re-run when the first FAIL is entirely model judgement) instead of
  always running twice — rejected: that heuristic depends on a per-case
  verdict that is only known after the first run, which would require a
  second, dynamically-discovered matrix (a case list computed from which
  first-run results actually need a rerun) — meaningfully more workflow
  complexity than a small, infrequently-run manual tool justifies. Always
  running twice is simpler and strictly more conservative (a case the real
  heuristic would have skipped still gets cross-checked here).
- Skipping the `v2`-issue-format checks (issue-lint spec, Affects scope)
  since all three seed cases are legacy-format issues — rejected during the
  same `/code-review` pass: the README's own "Adding a new case"
  instructions do not restrict future cases to legacy-format issues, and a
  future `v2`-format case replayed without these checks would silently
  diverge from what the real verifier computes for it (ID matching,
  ADR-042's ISSUE-470/471 impl+test pairing, computed scope). Wiring them
  in now, even though inert for the current three cases, keeps the eval
  faithful to production as the case set grows.

Reason:
The verifier's own prompt/schema/model pin (ADR-041/ADR-042) has been amended more than a dozen times, each changing wording that judges every future PR, but with no way to check a new wording change against previously-known cases where the wording mattered — a change could silently fix one false verdict while introducing a new one elsewhere, the exact class of risk each of ADR-041/042's per-mechanism amendments (ID matching #470, `ci`/`absence` items #472, scope #477, required checks #478, test tampering #479) already closed for one failure mode at a time, but never measured wholesale across past cases. A small, manually-run golden set closes that gap without adding cost to every ordinary PR. This is deliberately a diagnostic tool the owner runs by choice, not a required check on the verifier's own PRs — enforcing "the golden set must pass" as a merge gate on prompt/schema changes is a distinct future decision, not made here.

Source: project owner, 2026-09-29, Issue #483 (EPIC-27 · Фаза 7).

**Amendment (2026-09-30, ISSUE-488, EPIC-27 · Фаза 9): a `Factory separation` CI job and `scripts/factory-separation.js` classifier enforce the spec-side/verifier-side split, with the verifier side including `scripts/acceptance-verdict/**`.**

1. New script `scripts/factory-separation.js` classifies a PR's changed paths into `{spec, verifier}` against two named sides, reusing `patternToRegex`/`changedPathsOf` from `scripts/affects-scope.js` (this ADR's ISSUE-477 amendment) rather than a fourth independent glob/rename implementation. The side patterns and the gate label name are project-specific values (INV-7) and are not hardcoded in the script — they are read from a new trusted config file, `.github/verifier/factory-separation.json` (`specPatterns`, `verifierPatterns`, `label`), via a mandatory `--config` CLI argument, the same externalize-into-a-trusted-config pattern this ADR's ISSUE-478/479/481 amendments already use for `required-checks.json`/`tampering-scan.json`/`allowed-models.json`. That config's current content: spec side `.claude/skills/issues/**`, `scripts/issue-lint.js`, `scripts/issue-lint.spec.js`; verifier side `.github/verifier/prompt.md`, `.github/verifier/schema.json`, `scripts/acceptance-verdict.js`, `scripts/acceptance-verdict.spec.js`, `scripts/acceptance-verdict/**` (the facade-plus-modules layout this ADR's ISSUE-536 amendment introduced, where the actual verdict logic now lives), `.github/workflows/acceptance-verifier.yml`; label `factory-cross-change`. Contract files (`.github/verifier/issue-contract.json`/`.md`) match neither list, as a shared interface. The mechanism's own supporting files — `.github/verifier/owners.json`, `scripts/label-authority.js`, `scripts/affects-scope.js` itself — are infrastructure the classifier and its CI job read to do the classifying/authorizing, not content classified by it; they are not added to either side's pattern list.
2. **Gate.** A PR touching both sides needs the `factory-cross-change` label (already created by the owner, not created by this change), authorized the same way as `manual-verified`/`test-removal-approved` (this ADR's ISSUE-473 amendment) — `scripts/label-authority.js` against `.github/verifier/owners.json`, both read from the default branch, on one timeline snapshot. A label present but not set by an authorized owner (or set by a bot login) does not count.
3. **CI wiring.** `.github/workflows/ci.yml` gained a `Factory separation` job, `if: github.event_name == 'pull_request'`, permissions `contents: read`, `pull-requests: read`, `issues: read`, no secrets — it checks out the PR head with `fetch-depth: 0` (which fetches every branch, so `origin/<default-branch>` is already present) and reads the classifier, `affects-scope.js`, `label-authority.js`, `owners.json` and `factory-separation.json` from the default branch with `git show origin/<default-branch>:<path>` (INV-4), builds `files.txt` via `git diff --name-status`, fetches the PR's label timeline, and runs the CLI — a non-zero exit fails the job. `.github/verifier/required-checks.json` gained `"Factory separation"`, so a missing/incomplete/failed run of this job also fails the Acceptance Verifier's own required-checks check (this ADR's ISSUE-478 amendment). A PR whose head does not yet have `scripts/factory-separation.js` on the default branch (the PR introducing or renaming it) has nothing to `git show` and nothing to enforce against; the job checks for the file's existence with `git cat-file -e` first and skips the remaining steps rather than failing — found live on this amendment's own introducing PR, the same bootstrap exemption already documented elsewhere for a mechanism's own introducing PR.
4. **Scope.** This amendment only adds the classifier and CI wiring; it does not change the verifier or spec files themselves.

Alternatives considered:
- Rely only on the verifier's own `checkRefs`/ID-matching mechanisms to eventually notice a cross-side PR indirectly — rejected: none of those mechanisms compare a PR's changed paths against the spec/verifier side lists at all; nothing previously caught a single PR silently weakening both sides at once, which is the specific risk this gate exists to close.
- List `scripts/acceptance-verdict/**`'s current module files individually instead of a directory glob — rejected: a future module added to that directory (as this ADR's ISSUE-536 amendment anticipated) would again fall outside the verifier side, reproducing the exact drift this amendment fixes.
- Implement the classifier's own `*`/`**` matching or rename/delete parsing independently instead of reusing `scripts/affects-scope.js`'s `patternToRegex`/`changedPathFromLine` — rejected: a fourth independent implementation of the same semantics is exactly the kind of drift risk `scripts/test-tampering-scan.js` already avoided by reusing the same helpers (this ADR's ISSUE-479 amendment).

Reason:
`scripts/acceptance-verdict.js` became a thin facade over `scripts/acceptance-verdict/` (eight single-responsibility modules) in this ADR's ISSUE-536 amendment — the majority of real verifier-side edits since then land inside that directory, not the facade file. Until this amendment, no automated check compared a PR's changed files against the spec-side/verifier-side split at all, so a PR editing e.g. `scripts/acceptance-verdict/verdict.js` together with a spec-side file could land without the `factory-cross-change` label ever being required — a silent hole in the mechanism meant to prevent one PR from weakening both sides of the verifiable-spec/independent-verifier design at once.

Source: project owner, via Issue #488 (EPIC-27 · Фаза 9), 2026-09-30.

**Amendment (2026-10-01, ISSUE-489): consolidated summary of ADR-042's EPIC-27 Phase 1–9 mechanisms, by topic.**

The amendments above were landed one mechanism at a time across EPIC-27 Phases 1–9 (#464–#488);
this summary restates the resulting current state by topic, for a reader who does not want to
replay the full amendment history. It describes only behavior already merged to `main`; it changes
nothing on its own, and Phase 8's holdout scenarios (#485/#486/#487, deferred by the owner) are
intentionally not covered here.

- **Issue contract, linter, legacy mode (the base decision, #464).** `.github/verifier/issue-
  contract.json`/`.md` are the one source of the issue body's machine-checkable grammar (required
  sections, `AC`/`DOD`/`TR`/`INV` ID prefixes, item types, `Verify:` syntax). `scripts/issue-lint.js`
  classifies a body as `v2` (has at least one ID-tagged item, fully checked against the contract) or
  `legacy` (accepted without v2 validation, a transition-era fallback). The verifier runs this same
  linter as a preflight (#469): an invalid `v2` body fails closed without spending a model call; a
  `legacy` body is labelled as such in the rendered comment rather than silently judged as if it
  were `v2`.
- **Spec freeze (`spec-approved`).** A trusted owner (`.github/verifier/owners.json`) applying the
  `spec-approved` label gets a `github-actions[bot]` comment recording a sha256 of the issue body
  normalized to ignore checkbox state (`scripts/spec-hash.js`, #474). The verifier recomputes that
  hash at verify time; a mismatch (spec edited after approval) or no approval at all (`v2` only —
  `legacy` issues get a warning line, not a fail) is FAIL, closing the path where an executor could
  loosen its own issue's criteria after the fact.
- **Label authorship.** `scripts/label-authority.js`, against the same `owners.json`, decides who is
  allowed to set a gated label from the PR/issue timeline (most recent `labeled`/`unlabeled` event,
  non-bot actor, listed owner). Introduced for `manual-verified` (#473), the identical mechanism
  is reused for `test-removal-approved` (#535) and `factory-cross-change` (#488) — one
  authorization primitive, three gated labels.
- **Deterministic checks (no longer judged by the model).** `out_of_scope_files` for a `v2` issue is
  computed from the issue's own `## Affects` section by `scripts/affects-scope.js` (#477), not
  reported by the model. `required-checks.json` (#478) names the CI checks that must exist and
  have `conclusion: success` on the PR head; a missing or still-running required check is FAIL, not
  just a failed one. `scripts/test-tampering-scan.js` (#479, extended #535) scans the raw diff
  for skip markers, lint/type suppressions, disabled CI steps, a lowered numeric config threshold,
  and a net loss of assertion lines (after subtracting lines that only moved between test files) —
  all as a second, independent layer alongside the model's own `test_tampering` judgement, with
  `test-removal-approved` as the only owner-authorized escape for a genuine assertion-line loss.
  `ci`/`absence`-type issue items are likewise computed directly from `ci.json`/the checkout rather
  than asked of the model (#472). `scripts/acceptance-verdict.js` was split into
  `scripts/acceptance-verdict/` single-responsibility modules behind a facade (#536) once this
  set of deterministic checks grew past what one file could hold.
- **`NEEDS_HUMAN`.** #482 classifies every verdict-failing reason as `model`-sourced or
  `deterministic`-sourced. A `v2` FAIL made entirely of model-sourced reasons triggers one extra
  Codex run in a separate job (`drop-sudo` cannot run twice per job) on the same frozen inputs; if
  the two runs disagree on any shared item's status, the verdict becomes `NEEDS_HUMAN` instead of a
  silent pick of either run — a third outcome, distinct from `PASS`/`FAIL`, that forces a human
  decision rather than trusting a single noisy model pass.
- **Provenance and allowed models.** Every rendered comment carries a Provenance block
  (`head_sha`, `issue_body_sha256`, `verifier_commit`, `model`, `codex_version` — #480), so a
  reader can tell which verifier version and which issue-body hash a given PASS/FAIL actually
  reflects. `provenance.model` is checked against the trusted `.github/verifier/allowed-models.json`
  allowlist (#481); a `VERIFIER_MODEL` value outside that list is FAIL, closing the one remaining
  lever (a repo variable, no PR, no git trail) that could silently change which model judges a PR.
- **Golden case set.** `.github/verifier/golden/<pr>/` holds frozen inputs (`case.json`, `issue.md`,
  a frozen `ci.json`) for known-defect PRs with an `expected` verdict; `scripts/verifier-eval.js`
  replays the real two-run verifier pipeline against them and reports false-PASS/false-FAIL/run-
  failure counts (#483). It runs only on manual `workflow_dispatch`, as a tool the owner runs
  before merging a prompt/schema/model-pin change — never automatically on an ordinary PR.
- **Factory separation (side separation).** `.github/verifier/factory-separation.json` names the
  spec-authoring side (`.claude/skills/issues/**`, `scripts/issue-lint.js`) and the verifier side
  (`.github/verifier/{prompt.md,schema.json}`, `scripts/acceptance-verdict.js`,
  `scripts/acceptance-verdict/**`, the verifier workflow). `scripts/factory-separation.js` (`#488`),
  wired as a required CI job, fails a PR that touches both sides unless the (label-authority-gated)
  `factory-cross-change` label is set — the standing backstop against one PR silently weakening both
  the verifiable-spec side and the independent-verifier side at once.

Alternatives considered:
- Leave the mechanism documented only as a chronological sequence of amendments — rejected: a
  reader of ADR-042 (or `docs/12_ai_software_factory.md`) has no single place that states what the
  issue contract/linter, spec freeze, label authorship, deterministic checks, `NEEDS_HUMAN`,
  provenance/allowed-models, golden set and factory separation currently are without replaying
  every dated amendment, which is exactly the gap Issue #489 exists to close.
- Rewrite/merge the amendment blocks into one combined decision instead of adding a dated summary
  — rejected: the ADR skill's "Never edit an accepted entry's existing text" rule forbids rewriting
  already-accepted amendment blocks; a new dated block is the only sanctioned way to add this
  without altering the historical record.

Reason:
Each of EPIC-27 Phases 1–9's issues (#464–#488) added one mechanism as its own dated amendment to
ADR-042, so the decision record is complete but requires reading roughly twenty amendments in
sequence to answer "what does the verifier actually check today." This summary is the
documentation-only closing task of EPIC-27 Phase 9 (Issue #489), required by root `CLAUDE.md`'s
rule that architecture documentation must stay current, without changing any of the mechanisms it
describes.

Source: project owner, via Issue #489 (EPIC-27 · Фаза 9), 2026-10-01.

**Amendment (2026-10-01, ISSUE-565): pointer to ADR-044 for Calibration Judge.**

Calibration Judge (EPIC-31) is a separate, advisory workflow recorded in `## ADR-044`, not a mechanism added to this issue-contract ADR. It reads the verifier's own round outputs (`verdict`, `verdict-report` and related artifacts this ADR's amendments already define) to analyse a round's root cause, but it does not add to, change, or enforce anything in the issue contract, the deterministic checks, or the verdict this ADR and ADR-041 govern.

Alternatives considered:
- Record Judge as a further amendment to this ADR instead of a new ADR — rejected: the same reasoning given in this ADR's and ADR-041's own ISSUE-489 pointer amendments applies — Judge is an independently triggered workflow with its own model, taxonomy and storage, auditing the verifier rather than extending it; recording it here would blur which ADR owns which mechanism.

Reason:
Issue #565 (EPIC-31) asked for a single binding ADR-044 covering Calibration Judge, cross-referenced from both ADR-041 and this ADR, so a reader arriving at either already-established verifier ADR can find the separate, advisory Judge mechanism without its decisions being folded into the issue contract or the verifier's own verdict computation.

Source: project owner, via Issue #565 (EPIC-31), 2026-10-01.

## ADR-043 — Changeability and coupling: variation points are named in the PRD and enforced as concrete issue invariants

Status: `Accepted`

Decision:

1. **Principle (root `CLAUDE.md` `### Changeability and coupling`).** New code is optimized for local change: changing one policy (AI provider, naming rule, export format, workflow step rule) must not require edits in unrelated modules; orchestration (services that sequence pipeline steps and call policies) does not hold provider- or feature-specific details that fit behind an existing or small local boundary; a dependency between modules goes through that module's existing public contract, and extending an existing module boundary (ADR-017) is preferred over a new cross-module dependency; shared logic is extracted only when it means the same thing to every consumer.
2. **No speculative abstraction.** A new interface/strategy/registry is introduced only at a real variation point: at least two implementations/policies now, or a second one already planned in the PRD or an issue. An interface "for future flexibility" is not a variation point.
3. **The requirement travels down the spec chain and gets narrower at each step.**
   - `prd` skill: `## Ключевые инварианты` names the feature's variation point and the existing boundary it changes through, or states that the current boundary is enough; `## Технические ограничения` states that replacing the new policy must not require edits in unrelated orchestration/domain modules; the PRD self-check verifies one of the two was written.
   - `plan` skill: work is cut by finished capabilities, not by mechanical steps ("create interface → create implementation → wire it" is not a valid decomposition); the task that introduces a PRD variation point sets the boundary together with its first implementation and tests; no task exists only to prepare an abstraction the current or next task does not need.
   - `issues` skill: before drafting, every task gets an architecture-impact check (which boundary owns the changing behavior, whether a new cross-module dependency appears, whether the abstraction is real or speculative). A material result becomes a concrete `INV-n` about a boundary or dependency direction (for example "the orchestrator depends only on contract X; no provider SDK is imported outside Y"); a vague invariant such as "code is loosely coupled" is not allowed. The independent draft reviewer checks change amplification for every architectural `INV-n`: one natural future change of the variable part, the components it would have to touch, and any unrelated consumer among them reported as a risk.
4. **The verifier is not changed.** It already judges concrete `INV-n` (ADR-042, ISSUE-470 amendment); no generic architecture criterion is added to its prompt or schema.

Alternatives considered:
- A mandatory Acceptance Criterion "code is loosely coupled" in every issue — rejected: the verifier (ADR-041) cannot prove or disprove it from code, so it produces false FAILs or rubber-stamp PASSes; a concrete boundary/dependency `INV-n` can be checked against imports and call sites.
- Putting the rule only into the `issues` skill — rejected: the `plan` skill must not invent scope beyond the PRD and the `issues` skill takes its invariants from the PRD, so a rule that first appears at the issue level has no source to be derived from and cannot shape the decomposition.
- Requiring an interface at every module/service boundary up front — rejected: most boundaries here have exactly one implementation, and an interface per class adds indirection with no second policy to justify it; this is the over-engineering the owner explicitly asked to avoid.
- Separate plan tasks for "create the abstraction" followed by "implement" and "wire" — rejected: each such task leaves an unused boundary or an unwired implementation, and the next PR rewrites the previous one.
- A dedicated architecture section in the verifier prompt — rejected: the verifier would invent its own definition of "well designed"; keeping it to concrete invariants written by the spec side keeps the verifier's judgement narrow and keeps the spec-side/verifier-side split (ADR-042, ISSUE-488 amendment).

Reason:
Before this decision the repository had rules for storage, artifacts and NestJS module wiring (ADR-017), but none for how easy a policy is to change later, and nothing in the PRD → plan → issue chain asked which part of a feature will vary. As a result issues carried no architectural invariants the verifier could check, and plans could split work by technical layer so that each PR reworked the previous one. Stating the principle once in `CLAUDE.md` and turning it into a named variation point (PRD), a capability-based cut (plan) and a concrete, checkable invariant (issue) makes coupling reviewable without adding abstractions where there is no second policy.

Source: project owner, 2026-09-30, Issue #559.

## ADR-044 — Calibration Judge (EPIC-31): advisory root-cause analysis, a separate model, ADR-041 trust boundaries, owner labeling as ground truth

Status: `Accepted`

Decision:

1. **Advisory only.** Calibration Judge (`.github/workflows/calibration-judge.yml`) is a post-hoc root-cause analysis of one Acceptance Verifier round. It never writes a commit status, never changes a PR label, and never edits the verifier's own verdict or PR comment — it publishes its own, separate PR comment. A failed or skipped Judge run does not turn the PR red: the workflow holds no `statuses: write` permission anywhere, and every job downstream of a failure (`stage1`/`stage2`/`assemble`/`publish`) still runs and reports the failure as an analysis error rather than failing the workflow. Judge is never a required check.
2. **A model distinct from the verifier's, enforced by code.** Judge runs on its own repo variable, `CALIBRATION_JUDGE_MODEL`, checked against its own trusted allowlist, `.github/calibration/allowed-models.json` (not `.github/verifier/allowed-models.json`, ADR-042's ISSUE-481 amendment — a separate file for a separate model). The check (`scripts/calibration-judge.js check-model`) runs before either model call and rejects a `CALIBRATION_JUDGE_MODEL` that is empty, absent from the allowlist, or equal to the verifier's own model (read from the round's `provenance.json`, falling back to the `VERIFIER_MODEL` repo variable when absent) — a rejected model produces an analysis error, never a silent reuse of the verifier's model or a skipped check.
3. **Same trust boundaries as the verifier (ADR-041).** Judge's prompts (`prompt-stage1.md`/`prompt-stage2.md`), schema templates (`independent.schema.json`/`analysis.schema.json`), taxonomy, `inputs.json`, the allowlist and `scripts/calibration-judge.js`/`scripts/calibration-judge/` are checked out from the default branch (`github.sha`) into a `trusted/` path, never from the PR head. The PR head commit is checked out only as data for the two model-calling jobs (`stage1`/`stage2`) and nothing from it is executed; those two jobs clear any Judge-named path the PR might have committed (`calibration-input`, the prompt/schema files, the result files) before downloading the real package, so a PR cannot supply its own package, prompt, schema or result. `OPENAI_API_KEY` reaches only the `stage1`/`stage2` jobs' model-calling steps; `collect`, `assemble` and `publish` never receive it. Issue text, diffs, verifier reports and the implementer's self-report are declared data, not instructions, exactly as for the verifier itself. The workflow triggers on `workflow_run` of `Acceptance Verifier` (never `pull_request_target`) plus a manual `workflow_dispatch` by PR number; `scripts/calibration-judge.js check-pr` fail-closes a round to a `task/ISSUE-` branch of this repository, rejecting a fork PR or any other branch.
4. **Two isolated model calls, run as separate jobs.** Stage 1 (`independent.schema.json`) reconstructs the Issue contract and evaluates the implementation from the Issue and repository alone — its input package (`judge-independent` artifact) contains no verifier report, no prior Judge analysis and no implementer self-report. Stage 2 (`analysis.schema.json`) receives Stage 1's own saved, unmodified result plus the full package (verifier reports, CI/scope/tampering results, provenance, the implementer's self-report when present) and assigns the primary cause. Stage 1 and Stage 2 are separate jobs, not separate steps in one job, because the Codex action's `drop-sudo` safety strategy can run only once per job (ADR-041, ISSUE-449 amendment) — the same constraint that already splits the verifier's own two model runs (ADR-042, ISSUE-482 amendment) into separate jobs.
5. **Closed taxonomy.** `primary_cause`, `responsibility`, and the issue-defect/verifier-defect subtype enums are a single trusted config, `.github/calibration/taxonomy.json`, read from the default branch. `scripts/calibration-judge.js schema` generates each stage's actual JSON Schema by merging the stage's schema template with this taxonomy's enum values at workflow run time — the taxonomy is not duplicated as a second, hand-maintained copy of the enum inside either schema template, so a value cannot exist in one and not the other. A finding's `primary_cause`/`responsibility`/subtype value outside the taxonomy is rejected by the generated schema; free text is permitted only in evidence/recommendation fields, never as a stand-in for a taxonomy value.
6. **A round is one verifier workflow attempt; its key is `repository` + `verifier_run_id` + `verifier_run_attempt`.** Both of the verifier's own internal model runs (ADR-042, ISSUE-482 amendment) belong to the same round. An attempt that did not conclude `success` or `failure` — skipped (not a PR run) or cancelled — published nothing and is not a round; Judge's `collect` job gates on exactly that condition and quietly skips a non-round `workflow_run` event (a manual `workflow_dispatch` run that resolves to a non-round instead fails with the reason, since a human explicitly asked for that one). A stale verifier attempt (one whose `Verify` job succeeded but whose `Report` job never ran) is likewise not a round, by the same test. Re-running Judge on an already-analysed round produces a new, hashed revision of that round's analysis, never a new round.
7. **Storage: a hidden block in the PR comment plus a 90-day Actions artifact; no repository history file.** Every round's JSON analysis is embedded in a hidden block of Judge's own PR comment (one comment per PR, updated in place, identified by its own marker distinct from the verifier's comment marker) and is also uploaded as the `calibration-analysis` artifact (`retention-days: 90`). Updating the comment for round N preserves every earlier round's record inside the same comment's hidden blocks — the comment is additive, not replaced. No `.md`/`.jsonl`/similar history file is added to the repository (ADR-030/035's "no growing tracking file in the repository" pattern, applied here too). An analysis requested for a round whose artifact has already expired past the 90-day retention window is explicitly marked incomplete rather than silently reconstructed from current, non-historical API state.
8. **Historical verifier result is read from the verifier's own `verdict-report` artifact, with a fallback.** The Acceptance Verifier workflow's `Report` job uploads a `verdict-report` artifact (`verdict-report.json`, `comment.md`, `timeline.json`) specifically so Judge can read that round's actual recorded verdict and comment even after the verifier's live PR comment has since been overwritten by a later round. When a round predates that artifact's existence, Judge falls back to the verifier's current PR comment (read through the API) and marks it explicitly as not historical (`historical: false` on that input) rather than presenting it as the round's original record.
9. **Ground truth is owner labeling, not Judge's own output.** Confirmed expected verdicts, defect classes and primary causes come only from the PR's outcome label and the `/calibration` command, both accepted only when applied by an owner listed in `.github/verifier/owners.json` and not a bot login — the identical authorization mechanism already governing `manual-verified` and `test-removal-approved` (ADR-042, ISSUE-473/535 amendments). Judge's own `independent_expected_verdict`/`primary_cause`/`confidence` are hypotheses for the owner to confirm or correct, never self-certifying data that feeds the calibration thresholds (PRD §F/G) on their own.
10. **Judge observes; its analysis is not fed to the fixing AI during the calibration period.** The existing manual flow — the owner reads the verifier's report and manually hands it to the AI that fixes the code, which then pushes a new round — is unchanged by this feature. Judge's analysis is not wired into that flow's input anywhere in code; since the hand-off is itself manual (owner-to-AI, in a chat session), this specific rule is enforced by process, not by code — Judge's PR comment begins with an explicit label stating it is a calibration root-cause analysis, not a list of fixes to apply, and the AI-software-factory documentation (`docs/12_ai_software_factory.md`, per the PRD's "Documentation to update" list) states the same rule for a human operator to follow.

Alternatives considered:
- A JSON Schema without an enum for `primary_cause`/`responsibility`/subtypes, relying only on prompt wording to keep values in range — rejected: the verifier's own design (ADR-042) already established that a judgment-shaping constraint must be enforced by the schema the model is forced to answer against, not by prompt wording alone, which a model can still violate.
- Hand-duplicating the taxonomy's enum values into each stage's schema template instead of generating the schema from `taxonomy.json` at run time — rejected: two hand-maintained copies of the same enum drift the first time one is updated and the other is forgotten, exactly the class of risk ADR-042 already named for its own issue-contract/prompt pairing (ISSUE-470 amendment); generating the schema from the one trusted taxonomy file removes the second copy entirely.
- Storing round history as a file in the repository (e.g. `calibration-history.jsonl`) — rejected: this is the exact pattern ADR-030 and ADR-035 already moved away from for task tracking and test evidence (an ever-growing, hand-maintained file nobody rotates or archives) now being reconsidered for a third kind of record; the PR comment's hidden blocks plus a time-bounded Actions artifact give a durable-enough record without reintroducing that pattern.
- Reusing `VERIFIER_MODEL`/`.github/verifier/allowed-models.json` for Judge instead of a separate variable and allowlist — rejected: the PRD's entire premise is that Judge independently audits the verifier's own behavior; a Judge that shares the verifier's model could inherit the exact same blind spot or bias it is meant to catch, and ADR-041's "independent acceptance check" principle (a different model auditing the primary one) applies with equal force to a model auditing the auditor.
- Treating any completed verifier workflow attempt as a round, including cancelled or stale ones — rejected: a cancelled attempt published no verdict/comment to analyse, and a stale attempt (a rerun of only `Report`) does not represent a distinct verifier judgment of the code — counting either as a round would let the calibration metrics (PRD §F/G) count analyses of non-events, inflating or skewing the false-PASS/false-FAIL denominators the whole feature exists to measure accurately.

Reason:
Calibration Judge's decisions were previously recorded only in `project-management/prd/PRD-verifier-calibration-and-root-cause-analysis.md`, which is explicitly a draft, not a binding decision (root `CLAUDE.md`'s PRD→plan→issues chain treats a PRD as input to planning, not as the authoritative record `DECISIONS.md` is). Without a binding ADR, a later task could plausibly give Judge the ability to change a PR's status or labels, wire its analysis into the fixing AI's input, or add a repository history file, and nothing would formally contradict it — each of those would quietly erode the advisory/independent/no-history design the PRD and the already-merged code (#561–#564) establish. Collecting these decisions into one ADR, cross-referenced from ADR-041/042, gives code, future issues and review the single binding place root `CLAUDE.md` already expects every architectural decision to have.

Source: project owner, via Issue #565 (EPIC-31), 2026-10-01.

**Amendment (2026-10-01, ISSUE-565): the judge model is no longer required to differ from the verifier model; this supersedes that one requirement of point 2 above (point 2's own text is kept as the record of the original rule, not rewritten).**

`CALIBRATION_JUDGE_MODEL` is allowed to equal `VERIFIER_MODEL`. The code-enforced check (`scripts/calibration-judge/validate.js`'s `checkModel`) must not reject a judge model solely for being equal to the verifier's model; it still must fail closed on an empty judge model, an unreadable/non-array allowlist, an unknown verifier model, and a judge model absent from `.github/calibration/allowed-models.json` — only the equality rejection (previously `judge model equals verifier model`) is removed. As of this amendment, `CALIBRATION_JUDGE_MODEL` is set to `gpt-6-luna`, the same value as `VERIFIER_MODEL`, and `.github/calibration/allowed-models.json` contains `["gpt-6-luna"]` (it was previously empty, which alone already rejected every judge model regardless of this specific check).

Alternatives considered:
- Keep the restriction and instead find or provision a genuinely distinct second OpenAI model for Judge — this was the project owner's own first-presented option, including a prepared `gpt-6-luna-mini` alternative that the project owner declined once it could not be confirmed as a real, available alias — rejected for now: the project owner explicitly chose to unblock Judge immediately with the same model rather than wait on sourcing a confirmed distinct one.
- Leave the restriction in code but special-case the allowlist/variable to bypass it — rejected: a special case defeats the purpose of having the check be enforced by code at all (ADR-044 point 2's original framing), and is harder to reason about later than removing the one specific comparison it was built on.

Reason:
With `.github/calibration/allowed-models.json` still empty and `CALIBRATION_JUDGE_MODEL` unset, Judge was failing every round with "judge model is empty" — never producing an analysis. The project owner, asked directly whether they wanted this independence requirement genuinely removed (not merely routed around) and in this same task, confirmed yes twice after being told the concrete consequence: Judge auditing a PR with the same model that produced the PR's own verifier verdict can no longer be assumed independent of that model's blind spots, the exact property ADR-044 point 2 and its "Alternatives considered" entry on reusing `VERIFIER_MODEL` were written to prevent. The project owner's own priority — getting Judge producing real analysis now, revisiting a genuinely distinct model later if desired — is recorded here rather than silently decided in code.

Source: project owner, via Issue #565, 2026-10-01 (same-day follow-up after the initial ADR-044 text above).

**Amendment (2026-10-02, ISSUE-593): stage 1 no longer sees the Issue's spec-approval state; a root cause `SPEC_NOT_APPROVED` with responsibility `owner_process` covers a verifier FAIL caused only by a missing or stale spec approval.**

1. **Stage 1 independence from approval state.** `.github/calibration/inputs.json` moves `specApproval` (`spec-approval.json`) from `independentInputs` to `fullOnlyInputs` — the package config itself, not prompt wording, is what keeps stage 1's independent package from ever containing the Issue's approval state (ADR-044 point 4's own "Stage 1 ... input package ... contains no verifier report" already established that the package config, not the prompt, is the enforcement point for what stage 1 can see). `.github/calibration/prompt-stage1.md` no longer lists `specApproval.json` among its inputs and no longer describes the Issue text as "approved for this round"; it now states explicitly that stage 1 must not assume any approval/freeze state and judges the Issue body exactly as written for the round.
2. **New taxonomy values.** `.github/calibration/taxonomy.json` gains `SPEC_NOT_APPROVED` in `primary_cause` and `owner_process` in `responsibility` — read generically by `scripts/calibration-judge/validate.js`/`schema.js`/`render.js` exactly as every other taxonomy value already is (ADR-044 point 5), with no new literal added to any of those three files.
3. **Attribution rule (stage 2 only).** `.github/calibration/prompt-stage2.md`'s Step 4 gains a rule: `SPEC_NOT_APPROVED`/`owner_process` applies when `specApproval.json`'s `approved_hash` is null or differs from `current_hash` and that is the only blocking cause of the verifier's FAIL; when another independently blocking defect also exists, the cause is `MIXED` instead; a fresh re-approval of the current body is the `fix_issue_only` counterfactual. This is carved out of `INFRA_FAILURE`, which previously had no named exception for an approval-state failure and could be read to cover it even though nothing in the infrastructure had failed (the gap found live on PR #590/ISSUE-568's round 2 analysis). Stage 1's own `independent_expected_verdict` is unaffected by and blind to this rule, since stage 1 never receives `specApproval.json` at all (point 1).
4. **Scope.** The acceptance verifier itself (`scripts/acceptance-verdict/`, `.github/verifier/`) and its own fail-closed spec-approval check (ADR-042, ISSUE-474 amendment) are unchanged by this amendment — Judge only classifies the root cause of a verifier FAIL after the fact; it does not change what causes that FAIL. The fingerprint comparison between rounds (`inputs.json`'s `fingerprint.significantInputs`) continues to read `specApproval` from the full package exactly as before.

Alternatives considered:
- A distinct `issue_defect_subtype` such as `SPEC_CHANGED_AFTER_APPROVAL` instead of a new top-level `primary_cause` — rejected: this would misclassify an owner process gap (the Issue body changed, or was never re-approved, after `spec-approved` was set) as a defect of the Issue's own text, and would conflict with stage 2's existing rule that an owner's extension of requirements does not itself prove the previous Issue version was defective.
- Leaving the approval-state failure classified under the existing `INFRA_FAILURE` cause, only adding clarifying prompt wording — rejected: `INFRA_FAILURE` is defined as failures "unrelated to the Issue, the implementation's semantics, or the verifier's judgment," but an approval-state failure is specifically about the Issue's own frozen-spec state (ADR-042, ISSUE-474 amendment) — a process fact about the Issue, not an infrastructure fault — so folding it into `INFRA_FAILURE` would keep conflating two causes with different corrective actions (an owner re-approving the issue vs. an infrastructure fix) and would keep skewing the infrastructure-failure share of the calibration statistics this feature exists to keep accurate.
- Leaving `specApproval.json` inside stage 1's independent package and relying only on prompt wording ("ignore this file") to keep stage 1 blind to approval state — rejected (same reasoning already recorded in ADR-044's own design and restated in Issue #593's INV-6): a model instruction can be violated; only removing the file from the package config is an enforcement a prompt wording change cannot undo by itself.

Reason:
Found live on PR #590 (ISSUE-568)'s round 2 analysis: Calibration Judge assigned `primary_cause: INFRA_FAILURE`/`responsibility: infrastructure` to a verifier FAIL that was actually caused by the Issue body being edited after the `spec-approved` label was set and never re-approved (ADR-042, ISSUE-474 amendment) — a process gap on the owner's side, not an infrastructure fault. Because Judge's cause/responsibility labeling feeds the calibration statistics this feature exists to produce (PRD verifier-calibration §F/G), misclassifying an owner process error as an infrastructure failure skews that distribution. The same PR's stage 1 result also showed every one of 21 items as `INSUFFICIENT_EVIDENCE` despite citing concrete code evidence for each, traced to stage 1 silently receiving the approval-state input and treating the round as unapproved/unusable; removing that input from stage 1's package (not just telling it to ignore the input) closes that failure mode at the config level, consistent with how ADR-044 already separates what each stage receives.

Source: project owner, via Issue #593 (EPIC-31 · Фаза 1), 2026-10-02.
