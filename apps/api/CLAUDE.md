# CLAUDE.md — apps/api

This file governs `apps/api` specifically. Read it together with the repository root
`d:\projects_js\jobflow-cv-pipeline\CLAUDE.md` (module map, artifact rules, prompt pipeline rules,
task/branch/commit protocol, ADR history in `project-management/DECISIONS.md`) — the root file is
authoritative for cross-cutting rules and product scope; this file adds `apps/api`-specific detail
only.

## Назначение проекта

`apps/api` is the NestJS backend of the JobFlow CV Pipeline monorepo — the primary MVP focus
(per root `CLAUDE.md`: "backend-first application"). It runs the full pipeline: vacancy analysis
(Prompt 1) → human review gate → targeted CV generation (Prompt 2) → evidence/anti-overclaiming
guard → optional pre-PDF check (Prompt 3, mandatory-but-skippable gate per ADR-026) → deterministic
PDF export → optional final check (Prompt 5) → cover letter (Phase 2). `apps/web` is a secondary
dashboard client of this API; `apps/api` has no dependency in the other direction.

## Технологический стек

Confirmed from `apps/api/package.json`, `nest-cli.json`, `tsconfig.json`:

- **Framework**: NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **Language**: TypeScript 5, `strictNullChecks`/`noImplicitAny` on, CommonJS output, target ES2021
- **ORM / DB**: Prisma 5 (`@prisma/client`, `prisma`) against PostgreSQL
- **Validation**: `class-validator` + `class-transformer`, plus `joi` for env validation
  (`src/config/env.validation.ts`)
- **API docs**: `@nestjs/swagger` + `swagger-ui-express` (ADR-019: every endpoint/DTO field must be
  documented)
- **Rate limiting**: `@nestjs/throttler`, applied globally via `APP_GUARD` in `app.module.ts`
- **Logging**: `nestjs-pino` + `pino-http`, pretty-printed outside production/test
- **AI provider**: `openai` SDK behind an internal `AiProvider` interface (`src/ai/`) — never
  imported directly by feature services
- **Document rendering**: `handlebars` (HTML) + `puppeteer` (PDF), both deterministic, no AI call
  (ADR-012)
- **Queue**: `bullmq` (`src/queue/`) — Phase 2 per root `CLAUDE.md`'s module map
- **Security**: `helmet`
- **Testing**: `jest` (unit, `rootDir: src`, `*.spec.ts` colocated) + a separate `test/` folder for
  e2e (`jest --config ./test/jest-e2e.json`), `supertest` for HTTP-level e2e
- **Lint/format**: ESLint 8 (`.eslintrc.js`, `@typescript-eslint`) + Prettier, wired into the root
  `lint-staged` config and into `.claude/settings.json`'s PostToolUse hooks (see root `CLAUDE.md`)

## Структура проекта

`src/` is organized by feature/pipeline-stage module (NestJS `arch-feature-modules` — see the
`nestjs-best-practices` skill), matching the root `CLAUDE.md`'s Module Map exactly. Do not treat
that Module Map as stale — re-read it before assuming a module's responsibility; the summary below
is a pointer, not a replacement:

- `app.module.ts` / `main.ts` — root module and bootstrap. `AppModule` currently imports only
  `PrismaModule`, `WorkspacesModule`, `DocumentExportModule`, `ImportModule` plus global
  infrastructure (`ConfigModule`, `LoggerModule`, `ThrottlerModule`) — per ADR-017, do not add a
  module here unless `AppController`/`AppService` actually inject something from it.
- `common/slug/` — `SlugService`, deterministic company/role slug normalization (Unicode Cyrillic
  aware, per ADR-013).
- `common/guards/api-key.guard.ts` — global `APP_GUARD`, API-key auth; `common/decorators/
  skip-auth.decorator.ts` opts a route out.
- `workspaces/`, `company/`, `vacancy/` — core domain CRUD + status machine
  (`workspace-status.service.ts`, ADR-015: gates check `status`, not `reviewState`).
- `artifacts/` — `ArtifactStorageService` (fs read/write/registration, path-safety enforced),
  `HashService`, `artifacts.service.ts`/`artifacts.controller.ts` (`GeneratedArtifact` registry).
- `knowledge-sources/`, `evidence/` — prompt context source registry + anti-overclaiming guard
  (`evidence-guard.service.ts`, `safe-wording.service.ts`).
- `prompt-templates/`, `prompt-runs/` — versioned prompt template storage; never silently overwrite
  a template version.
- `ai/` — `AiProvider` interface + implementations; `ai-runs/` tracks token usage per `AiRun`.
- `pipeline/` — `PromptInputBuilderService` (combines vacancy source + template + knowledge
  sources); the `promptN` sub-orchestrators referenced in the root Module Map (prompt1/2/3/skip)
  live under this tree — check current subfolder contents before assuming which prompt step a file
  belongs to.
- `review-gates/` — `ReviewGatesService`: apply/maybe/skip/override decision logic, the
  ADR-026/027/028/029 gate behavior.
- `document-export/` — `HtmlRendererService` + `PdfExportService` + `DocumentExportService`
  (deterministic, ADR-012: never creates an `AiRun`), `cv-template-renderer.ts`,
  `prompt2-to-cv-content.mapper.ts`.
- `cover-letters/`, `application-tracking/`, `rejections/` — Phase 2 / tracking features layered on
  top of the core pipeline.
- `import/` — existing-folder scanner (P1 optional per ADR-011).
- `prisma/` — `PrismaModule`, `PrismaService`; `apps/api/prisma/migrations` and
  `apps/api/prisma/prompts` hold schema migrations and seeded prompt content.
- `config/env.validation.ts` — the actual required/optional env vars (`DATABASE_URL`, `API_KEY`,
  `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT` required; `AI_PROVIDER` defaults to `fake`; `REDIS_URL`
  optional — queue is not yet load-bearing).
- `test/` — e2e specs (`mvp-flow.e2e-spec.ts`, `skip-flow.e2e-spec.ts`, `rate-limiting.e2e-spec.ts`
  per ADR-022), run via `test:e2e`, separate Jest config from unit tests.
- `storage/` — the default `STORAGE_ROOT` target for filesystem artifacts in local dev; never write
  outside this root from application code (root `CLAUDE.md` Key Invariants).

## Команды

All commands below run from `apps/api/` (confirmed in root `CLAUDE.md` and `package.json` scripts).
There is no root-level orchestrator (no turbo/nx/npm workspaces) — every command must `cd apps/api`
first, or be prefixed accordingly from the repo root.

```bash
cd apps/api

npm install                                        # install deps
npm run start:dev                                  # NestJS watch mode
npm run build                                       # nest build
npm run lint                                        # eslint --fix over src/libs/test
npx tsc --noEmit                                    # type check (no dedicated script; run directly)
npm run test                                        # unit tests (jest, rootDir: src)
npm run test -- --testPathPattern=slug.service      # single test file
npm run test:watch                                  # unit tests, watch mode
npm run test:cov                                    # unit tests + coverage (threshold enforced, ADR-022)
npm run test:e2e                                    # e2e (separate jest-e2e.json config, runInBand)
npx prisma migrate dev                              # apply migrations (never `migrate reset` in normal use)
npx prisma generate                                 # regenerate Prisma client after schema changes
npx prisma db seed                                  # seed database (ts-node prisma/seed.ts)
npm run register-knowledge-sources                  # ts-node scripts/register-knowledge-sources.ts
npm run db:check-persistence                        # bash scripts/check-postgres-persistence.sh
```

From the repo root, PostgreSQL/Redis infra is orchestrated via `docker compose` (see root
`CLAUDE.md` — `docker compose up -d postgres`, `docker compose down` without `-v`).

## Архитектурные правила

These are enforced project rules, not suggestions — see `project-management/DECISIONS.md` ADR-017
for full text:

- **Root module imports only top-level feature modules** it directly needs (nothing indirected
  through a sibling). Matches `nestjs-best-practices`' `arch-feature-modules`/`arch-module-sharing`.
- **Each module imports its own dependencies directly.** NestJS module exports are not transitive —
  never rely on a parent/sibling module to supply something indirectly (`arch-avoid-circular-deps`,
  `di-*` category).
- **Exports must be intentional** — only export a provider when another module actually injects it.
- **No orphaned `*.module.ts` files** — a module nothing imports (other than `AppModule`) is dead
  code and a double-registration risk; wire it up or delete it.
- **`@Global()` modules need only one import site**; do not add/remove redundant imports of them as
  part of unrelated work.
- **Split a module only when it reduces real complexity** (ADR-017 point 6) — shared-import overlap
  is a reason *not* to split.
- **Step 4 (document export) is never an AI prompt** — no `PromptTemplate`, no `AiRun` (ADR-012).
- **Prompt 2 is blocked until apply/maybe approval or a logged manual override** — gate checks
  `status`, not `reviewState` (ADR-015).
- **Prompt 3 (pre-PDF check) is a mandatory-but-skippable gate before export** (ADR-026, overrides
  ADR-009 for Prompt 3 only) — `pre_pdf_check_ready → paused_before_export` via either running the
  check (any verdict) or the dedicated skip endpoint; `export-cv` accepts `paused_before_export` or
  legacy `export_running`.
- **Filesystem root (`STORAGE_ROOT`) must never be escaped** — `ArtifactStorageService` enforces
  path safety; do not bypass it with raw `fs` calls elsewhere.
- **Slug regex must use `\p{Script=Cyrillic}`** (Unicode property escape), never a hardcoded
  character list (ADR-013).
- **AI-output schema files are named after their canonical artifact**, not the internal prompt-step
  number (`vacancy-analysis.schema.ts`, `targeted-cv-content.schema.ts`, not `prompt1.schema.ts` /
  `prompt2.schema.ts` — ADR-021). `PromptNService`/`PromptNInputBuilderService` orchestrator classes
  keep step-number naming; this only governs schema files.

## Правила внесения изменений

- **New code location**: place new logic in the feature module it belongs to under `src/`,
  following the existing per-stage module boundary above — do not add pipeline logic to
  `app.module.ts`/`app.controller.ts`, which are intentionally minimal.
- **DI pattern**: use constructor injection (`di-prefer-constructor-injection`); if abstracting an
  external dependency (e.g. a second AI provider), define an interface + injection token rather
  than importing a concrete SDK into a feature service directly (mirrors the existing `AiProvider`
  pattern in `src/ai/`).
- **Validation**: use `class-validator`/`class-transformer` decorators on DTOs (existing pattern);
  env-level config validation goes in `src/config/env.validation.ts` (`joi`), not scattered
  `process.env` reads.
- **Error handling**: throw NestJS's built-in HTTP exceptions (`BadRequestException`,
  `NotFoundException`, etc.) from services/controllers rather than raw `Error` — matches
  `error-throw-http-exceptions` and the existing codebase convention (see `review-gates.service.ts`
  for a representative example of guarded state-transition errors).
- **Swagger docs are mandatory for every new endpoint** (`@ApiOperation({ summary: '...' })`) and
  every new/changed DTO field (`@ApiProperty()`/`@ApiPropertyOptional()`) — ADR-019, applies to all
  future endpoints without exception.
- **Do not silently change the workspace status machine** — any new transition must be reflected in
  `workspace-status.service.ts`'s `TRANSITIONS` table and cross-checked against
  `project-management/CURRENT_TASK.md`'s `## State Machine` table when working an active task; if
  the two disagree, stop and ask rather than resolving the conflict yourself (root `CLAUDE.md`).
- **Never create an `AiRun` for document export** (Step 4) — this is a hard invariant, not a style
  preference.
- **Files not to touch without necessity**: `prisma/migrations/*` (never hand-edit an already-
  applied migration; generate a new one), `.eslintrc.js`/`tsconfig.json` (project-wide config, only
  change with explicit task scope), anything under `storage/` (physical artifacts, not source).
- **Mandatory checks after any change**: `npx tsc --noEmit`, `npm run lint`, `npm run test` (and
  `npm run test:e2e` if the change touches a status transition, review gate, or export path) —
  matches the PostToolUse hooks already wired in `.claude/settings.json` plus the root `CLAUDE.md`
  Testing Rules.

## Тестирование

- **Location & convention**: one `x.spec.ts` per `x.ts` that exports testable logic, colocated in
  the same folder (ADR-020) — never inside another file's spec file. If splitting logic out of an
  existing file, its tests move with it in the same commit.
- **Tooling**: Jest + `ts-jest` for unit tests (`rootDir: src`, pattern `*.spec.ts`); a separate
  `test/jest-e2e.json` config + Supertest for e2e, run with `--runInBand`.
- **Mocking**: AI provider calls must always be mocked/faked in unit tests — never call a real AI
  provider from a test (root `CLAUDE.md` AI Provider Rules). Use temp dirs or mocks for filesystem
  tests (never touch the real `storage/` tree from a test).
- **Coverage floor**: `package.json`'s `coverageThreshold` (statements 90 / branches 68 / functions
  90 / lines 90, measured baseline per ADR-022) is a regression floor, not a target — do not chase
  it upward without cause, and do not let a change drop below it.
- **Minimum bar for a change to be considered tested**: `npm run test` full suite green; if the
  change affects a review-gate/status-transition/export path, `npm run test:e2e` green too.

## Интеграции и зависимости

- **PostgreSQL**: via Prisma (`DATABASE_URL` env var, required). Schema + migrations live in
  `apps/api/prisma/`.
- **Filesystem**: `STORAGE_ROOT` env var (required) is the artifact root; `ArtifactStorageService`
  is the only sanctioned write path.
- **Knowledge sources**: `KNOWLEDGE_SOURCES_ROOT` env var (required) is the second, independent
  filesystem root for `KnowledgeSource.filePath` (candidate profile/evidence files, distinct from
  `STORAGE_ROOT`); `KnowledgeSourceContentService` enforces containment inside this root the same
  way `ArtifactStorageService` enforces `STORAGE_ROOT`.
- **AI provider**: `AI_PROVIDER` env var (`fake` default, or `openai`) selects the implementation
  behind the `AiProvider` interface; `OPENAI_API_KEY`/`OPENAI_MODEL` configure the real provider.
  Anthropic is a documented future/fallback option (root `CLAUDE.md`), not yet implemented.
- **Redis / BullMQ**: `REDIS_URL` optional — queueing (`src/queue/`) is present but the root
  `CLAUDE.md` Module Map marks it Phase 2; do not assume it is load-bearing for the current MVP
  pipeline unless you confirm a call site actually depends on it.
- **`apps/web`**: consumes this API over HTTP only (`NEXT_PUBLIC_API_BASE_URL`, baked in at web's
  build time — see root `CLAUDE.md`'s Repository Layout section and ADR-024). `apps/api` has no
  code dependency on `apps/web`.
- **`API_KEY`**: required env var, enforced globally by `ApiKeyGuard` (`APP_GUARD`); routes opt out
  via the `@SkipAuth()` decorator in `common/decorators/skip-auth.decorator.ts`.

## Инструкции для Claude

- Read this file **and** the repository-root `CLAUDE.md` (plus `project-management/CURRENT_TASK.md`
  and `project-management/DECISIONS.md`) before making any change here — the root file is
  authoritative for task/branch/commit protocol and product scope; this file only adds `apps/api`-
  specific detail.
- Before editing, find and read the module(s) actually involved and their existing `*.spec.ts` —
  do not guess a service's contract from its name.
- Reuse existing services (`ArtifactStorageService`, `SlugService`, `AiProvider`, etc.) rather than
  re-implementing filesystem, slug, or AI-call logic locally.
- Do not introduce a new module-splitting abstraction unless ADR-017 point 6's bar is met (zero
  dependency overlap, or a real test-isolation blocker).
- Do not change a public HTTP contract (route shape, DTO field, status transition) without explicit
  task scope calling for it — Swagger-documented, per ADR-019.
- After any change: run `npx tsc --noEmit`, `npm run lint`, `npm run test` (and `test:e2e` if a
  status/gate/export path was touched) before considering the change complete.
- If information needed to implement something safely is missing from this file, the root
  `CLAUDE.md`, or `CURRENT_TASK.md`'s `## Docs to Read`, stop and ask — do not invent architecture,
  commands, or state-machine transitions (root `CLAUDE.md`'s Insufficient Context Rule).
- Apply the `nestjs-best-practices` skill's rules (constructor injection, feature-module boundaries,
  HTTP exceptions, DTO validation, guarded async lifecycle) when writing or reviewing code here.
- Flag any unverified assumption explicitly rather than presenting it as confirmed fact.
- **When a change alters this app's architecture** (new/removed/renamed module, changed module
  dependency direction, a new/changed endpoint or data flow step, a changed status transition),
  update this file's "Структура проекта"/"Архитектурные правила" sections in the same change — do
  not leave them describing a superseded structure. Also check whether the root `CLAUDE.md`'s
  `## High-Level Architecture` (Data Flow, Key Invariants, Workspace Status Sequence) or
  `project-management/DECISIONS.md` need updating too (root `CLAUDE.md`'s Documentation Rules).
