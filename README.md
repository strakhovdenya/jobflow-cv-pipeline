# JobFlow CV Pipeline

[![CI](https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/workflows/ci.yml)
[![CodeQL](https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/workflows/codeql.yml/badge.svg)](https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/strakhovdenya/jobflow-cv-pipeline/branch/main/graph/badge.svg)](https://codecov.io/gh/strakhovdenya/jobflow-cv-pipeline)

Backend-first AI-assisted pipeline for vacancy analysis, targeted CV generation and PDF export.

Built with NestJS, TypeScript, PostgreSQL, Prisma and Docker. Personal portfolio project — not commercial production AI experience.

## Recruiter / hiring manager overview

JobFlow CV Pipeline is a personal backend portfolio project built to demonstrate production-style NestJS/TypeScript backend design, AI-assisted workflow orchestration, evidence-based claim validation and deterministic document export.

The project is intentionally backend-first. It focuses on workflow state, modular service boundaries, source traceability, artifact management, human review gates and safe AI integration patterns rather than UI-first prototyping.

It is **not** a commercial product and **not** commercial production AI experience. My commercial production experience is primarily Node.js/TypeScript/Azure backend work in large-scale e-commerce systems. This repository is used as current portfolio evidence for backend architecture, NestJS practice and AI-friendly engineering workflows.

A secondary Next.js dashboard (`apps/web`) makes the pipeline's human-in-the-loop review gates
directly visible and operable — see [Dashboard UI](#dashboard-ui) below — but the backend is still
the primary portfolio focus.

**Production hardening practices applied in this repo** (not just a happy-path prototype):

- CI pipeline on every push/PR: lint, typecheck, unit tests, build, Docker build validation.
- API-key authentication guard + rate limiting on all endpoints.
- Automated dependency scanning (Dependabot) and static code scanning (CodeQL), both actively triaged.
- Strict TypeScript (`strictNullChecks`, `noImplicitAny`, and all other strict flags enabled).
- Swagger/OpenAPI documentation generated from code (`/api`), kept current with every new endpoint.
- **Traceable task planning:** features flow through a written PRD → phased implementation plan → GitHub Issues (each with Acceptance Criteria, Test Requirements and a Definition of Done), tracked on a public [GitHub Project board](https://github.com/users/strakhovdenya/projects/1) and auto-closed via PR `Closes #n` linkage.
- **Autonomous execution for well-scoped tasks:** a self-built "Ralph loop" controller can drive a simple, clearly-specified GitHub Issue from this repo's own tracker to an open PR without a human confirming each step — the agent only ever edits code and runs tests; every `git`/GitHub mutation is owned by the controller. See [Autonomous task execution: the Ralph loop](#autonomous-task-execution-the-ralph-loop) below.

## 2-minute overview

The pipeline is designed around a human-in-the-loop CV generation workflow:

1. Register vacancy text and structured knowledge sources.
2. Run AI-assisted vacancy analysis.
3. Require human review before continuing.
4. Generate a targeted CV draft using selected evidence sources.
5. Run evidence checks to flag unsupported or weakly supported claims.
6. Require final human review of the CV draft.
7. Run a pre-PDF quality check — a mandatory-but-skippable gate: export is blocked until the check
   has either been run or explicitly skipped.
8. Export deterministic HTML/PDF artifacts without using AI tokens for the export step.

Core backend areas demonstrated in this repository:

- Workspace and application flow management.
- Artifact storage and traceability.
- Knowledge source registration with file paths, version labels, active flags and content hashes.
- Explicit per-step knowledge source selection instead of sending all files to every prompt.
- Prompt pipeline and AI provider boundary.
- Human-in-the-loop review gates.
- Evidence-based claim validation concepts.
- Deterministic document export as a backend responsibility.

## Project status

| Area | Status | Notes |
|------|--------|-------|
| NestJS backend structure | Implemented / evolving | Modular backend project with production-style service boundaries. |
| PostgreSQL + Prisma persistence | Implemented / evolving | Metadata persistence for workflow state, artifacts and knowledge sources. |
| Knowledge source registration | Implemented | Idempotent registration with content hashes and explicit source selection. |
| Human-in-the-loop pipeline | Implemented / evolving | Review gates are a core design principle of the workflow. |
| AI provider abstraction | Implemented / evolving | AI integration is isolated from the main workflow logic. |
| Evidence Guard / claim validation | Implemented / evolving | Flags unsupported CV claims (regex-based critical patterns) and collects `needs evidence` items against structured source evidence. |
| Token/cost tracking | Implemented | Every `AiRun` stores provider, model, input/output/total tokens and an estimated cost. |
| Deterministic HTML/PDF export | Implemented | `POST /workspaces/:id/export-cv` renders HTML then PDF; separated from AI generation and consumes zero AI tokens. |
| Frontend UI | Implemented / secondary | Next.js dashboard (`apps/web`) covering the full pipeline: analysis review, CV draft review, the pre-PDF check gate, PDF export, final check, cover letter, application tracking. Backend remains the primary portfolio focus — see [Dashboard UI](#dashboard-ui). |
| Production deployment | Not planned | Personal local portfolio project, not a commercial SaaS product. |
| CI/CD pipeline | Implemented | GitHub Actions: lint, typecheck, unit tests, build, Docker build validation on every push/PR. |
| API-key auth + rate limiting | Implemented | Global `ApiKeyGuard` + `ThrottlerGuard`; `/health` exempted for uptime checks. |
| Dependency & code scanning | Implemented | Dependabot (weekly) + CodeQL (`javascript-typescript`) on push/PR and weekly cron. |
| API documentation | Implemented | Swagger/OpenAPI at `/api` (disabled in production), generated from code annotations. |

## Dashboard UI

The `apps/web` dashboard turns the backend's human-in-the-loop review gates into something you can
actually click through — every workspace shows its pipeline progress, the current gate waiting on
a decision, and the artifacts produced so far, without needing to inspect the database or the
filesystem directly.

<img src="docs/screenshots/pre-pdf-check.png" alt="JobFlow CV Pipeline workspace detail view, showing pipeline progress, the pre-PDF check gate, and generated artifacts" width="700" />

*Workspace detail view at the pre-PDF check gate (ADR-026): the sidebar tracks all 11 pipeline
steps, the AI's original recommendation and the human decision are shown as separate badges, and
export stays blocked until the check is either run or explicitly skipped.*

The UI was built with Claude Code — an AI-assisted design pass over the mockups, followed by
several rounds of manual, human-reviewed correction against real historical application data (see
`project-management/DECISIONS.md`, ADR-025 through ADR-029) rather than a one-shot generation. The
backend's pipeline logic — status transitions, review gates, artifact tracking — remains the
authoritative source of truth; the dashboard is a thin, typed client over it (`apps/web/src/lib/api.ts`),
with no business logic of its own.

## System architecture

Local Docker Compose services (see [Docker Commands](#docker-commands)) — no cloud deployment
exists or is planned (see "Production deployment" in [Project status](#project-status)):

```mermaid
flowchart TB
    subgraph Client
        WEB[Next.js Dashboard<br/>apps/web]
    end

    subgraph Backend["NestJS API — apps/api"]
        API[HTTP Controllers]
        PIPE[Prompt Pipeline<br/>prompt1 / prompt2 / prompt3 / prompt5]
        EXPORT[Document Export<br/>HTML + PDF renderer]
        QUEUE[Queue Worker<br/>BullMQ]
    end

    subgraph AI["AI Provider Boundary"]
        PROVIDER[OpenAI Provider / Fake Provider]
    end

    DB[(PostgreSQL / Prisma)]
    REDIS[(Redis)]
    FS[[Filesystem Artifact Storage]]

    WEB -- "HTTP + API key" --> API
    API --> PIPE
    API --> EXPORT
    API --> QUEUE
    QUEUE --> REDIS
    QUEUE --> PIPE
    PIPE --> PROVIDER
    PIPE --> DB
    PIPE --> FS
    API --> DB
    EXPORT --> FS
```

### Pipeline flow

```mermaid
flowchart TD
    A[Vacancy Source] --> B[Prompt Pipeline]
    K[Knowledge Sources] --> B
    B --> C[AI Provider Boundary]
    C --> D[AI Analysis Artifact]
    D --> E[Human Review Gate]
    E --> F[Targeted CV Draft]
    F --> G[Evidence Guard]
    G --> H[Final Human Review]
    H --> P[Pre-PDF Check Gate<br/>mandatory but skippable]
    P --> I[Deterministic HTML/PDF Export]

    B --> DB[(PostgreSQL / Prisma)]
    K --> DB
    D --> FS[Filesystem Artifact Storage]
    F --> FS
    P --> FS
    I --> FS
```

## Key backend design decisions

- **Backend-first architecture:** the project focuses on workflow orchestration, persistence, artifact traceability and document export rather than UI-first prototyping.
- **Human review gates:** AI-generated outputs are not used blindly; critical pipeline steps require explicit human review.
- **Evidence-based generation:** CV claims are checked against structured knowledge sources to reduce unsupported statements and overclaiming.
- **Deterministic export:** document export is separated from AI generation and is designed to avoid AI token usage during export.
- **Source traceability:** knowledge sources are registered with file paths, version labels, active flags and content hashes.
- **Explicit context selection:** each prompt step uses selected source groups instead of sending every available file to the model.
- **Provider boundary:** AI provider logic is isolated behind a boundary to avoid coupling pipeline logic to one provider.

## Data & Artifact Model

Three independent storage locations, split by responsibility (ADR-002 — PostgreSQL for
metadata/state, filesystem for physical artifacts; the golden dataset is a separate,
manually-curated evaluation fixture, not runtime state):

<img src="docs/diagrams/data-storage-map.svg" alt="Diagram of JobFlow CV Pipeline's three storage layers: PostgreSQL metadata and state, filesystem physical artifacts under STORAGE_ROOT and KNOWLEDGE_SOURCES_ROOT, and the golden-dataset offline evaluation fixture." width="100%" />

- **PostgreSQL (metadata/state):** `Company` → `JobVacancy` → `ApplicationWorkspace` →
  `PromptRun` → `AiRun`. Each `ApplicationWorkspace` also owns a `GeneratedArtifact` registry (one
  row per physical file, linking back to the `PromptRun` that produced it, or marked
  `origin: generated_by_export_service` for the deterministic PDF export step) and a
  `DecisionOverride` audit trail (one row per manual apply/maybe/skip override, e.g.
  `change_to_skip`/`override_to_apply`). `KnowledgeSource` and `EvidenceItem` are registered
  separately and referenced by the prompt pipeline, not owned by a single workspace.
- **Filesystem — `STORAGE_ROOT`, physical artifacts:** each workspace gets its own folder
  (`storage/applications/<date>_<company>_<role>/`) containing canonical, stable-named files —
  `00_vacancy_source.txt` (written at workspace creation), `01_vacancy_analysis.md/json` or
  `01_skip_reason.md/json` (Prompt 1 / skip path), `02_targeted_cv_content.md/json` (Prompt 2, only
  after apply/maybe approval), `03_pre_pdf_check.md/json` (optional Prompt 3 gate), and
  `04_cv_export.html/pdf/json/md` (deterministic export, no AI call). Names are step-based and
  stable, not derived from prompt template version. Each written file is registered as a
  `GeneratedArtifact` row (`canonicalFileName`, `filePath`, `storageRoot`, `contentHash`) — the DB
  row is a pointer/index, the file itself is the source of truth for content.
- **Filesystem — `KNOWLEDGE_SOURCES_ROOT`, a second independent root:** holds candidate
  profile/evidence source files, registered via `KnowledgeSource.filePath`. Read during Prompt 1/2
  input building (`PromptInputBuilderService`), never during export. Kept separate from
  `STORAGE_ROOT` because it holds durable candidate-profile inputs shared across many workspaces,
  not per-workspace generated output.
- **AI usage tracking:** every AI-assisted pipeline step (`PromptRun`) links to exactly one
  `AiRun` row, which stores `provider`, `model`, `inputTokens`/`outputTokens`/`totalTokens`, an
  estimated `costEstimate`, and the raw provider usage payload (`usageRawJson`) for auditing. Step
  4 (PDF export) is deterministic and intentionally creates **no** `AiRun` — it consumes zero AI
  tokens.
- **`project-management/golden-dataset/<slug>/` — a third, separate source, not DB or
  `STORAGE_ROOT`:** each case is a manually curated fixture — `case.md` (real historical vacancy
  text plus a `manual_decision` frontmatter field: the human's actual apply/maybe/skip call) and
  `manual-cv.md` (the human-written CV baseline for that vacancy). It exists purely for offline
  calibration (comparing AI output against a known-good manual baseline, see
  [docs/10_calibration_and_parity.md](docs/10_calibration_and_parity.md)) and is never read by the
  running application. To evaluate a case, its vacancy text is manually copied into a real
  workspace created through the normal `apps/web` UI flow — from that point on it becomes a normal
  `ApplicationWorkspace` flowing through the same PostgreSQL/filesystem layers as any other
  application, with its AI-produced decision then compared back against the fixture's
  `manual_decision`.

**Debugging cheatsheet — symptom → where to look:**

| Symptom | Look here |
|---|---|
| Workspace status looks wrong / stuck | `ApplicationWorkspace.status` and `reviewState` in Postgres — the filesystem has no status concept at all. |
| A step's file (e.g. `02_targeted_cv_content.json`) is missing on disk | Check `GeneratedArtifact` first — if no row exists, the step never ran or failed before writing; if a row exists but the file doesn't, storage was written outside `STORAGE_ROOT` or was manually deleted. |
| AI recommendation / decision shown to the user looks stale or wrong | `ApplicationWorkspace.originalDecision` (AI's call, immutable) vs. `currentDecision` (may be human-overridden) — check `DecisionOverride` for the audit trail of what changed it and why. |
| Token usage / cost doesn't match what you expect | `AiRun` rows linked via `PromptRun` — one per AI call, never created for Step 4 (PDF export) by design. |
| Prompt 1/2 output references a candidate fact that seems wrong or outdated | `KNOWLEDGE_SOURCES_ROOT` filesystem (not `STORAGE_ROOT`) — check the file `KnowledgeSource.filePath` points at, and whether `isActive` is still true. |
| A golden-dataset case's AI result doesn't match what you observed in the app | The case's fixture (`case.md` / `manual-cv.md`) is static and never re-read by the app — the real signal is the workspace it was copied into; re-check that workspace's own `ApplicationWorkspace` + artifact files, not the fixture. |
| Export produced a PDF that ignores the pre-PDF check's recommendations | Confirm `03_pre_pdf_check.json` actually exists in `STORAGE_ROOT` for that workspace — export only applies it when present; a skipped gate has no file to apply. |

See [docs/04_architecture.md](docs/04_architecture.md) for the full data model and state machine.

## Autonomous task execution: the Ralph loop

A locally-run controller (`.claude/ralph/`, not part of the deployed application) that drives
well-scoped GitHub Issues from this repo's own tracker to an open pull request end-to-end, without
a human confirming each step — reserved for simple, unambiguous tasks with a clear Acceptance
Criteria list; anything genuinely judgment-heavy stays a normal human-reviewed task. Named after
the "Ralph Wiggum" pattern popularized in agentic-coding circles: a plain external loop repeatedly
invoking a stateless coding agent, with all durable state kept outside the agent's own memory
(here: the filesystem and git, mirroring how [ADR-030](project-management/DECISIONS.md) already
makes GitHub Issues the source of truth for ordinary task tracking in this repo).

**Why it's in this portfolio:** it's a small but complete example of agent-orchestration design —
defining a narrow, auditable contract for an LLM, keeping every destructive/external-facing action
(`git`, `gh`) strictly on the human/controller side, and treating the whole thing as software to be
tested and debugged rather than a black box. The [Known limitations](#known-limitations-found-via-real-runs)
below are deliberately included, not hidden — the same evidence-based, no-overclaiming discipline
this repo's own CV-generation pipeline enforces on its own output applies here too.

### How it works

1. **`run.js`** — the entry point, an explicit external loop:
   `node .claude/ralph/run.js [--max-iterations N]`. Each iteration picks the next ready issue from
   `.claude/ralph/config.json` (a `dependsOn` graph — an issue is only "ready" once its
   dependencies are done or already in-flight — plus a `ralph-needs-prompt-change` GitHub label
   that blocks anything, directly or transitively, that would require editing this project's AI
   prompts or knowledge base), runs one full clone→PR cycle, and repeats until nothing is ready or
   the iteration cap is hit.
2. **`core.js`** — the state machine for one issue: **PREPARE** (fresh `git clone`, base-branch
   resolution that supports stacked PRs when one issue depends on another's not-yet-merged branch)
   → **AGENT** (a headless `claude -p` call, narrow allow-listed permissions) → **VALIDATE** (a
   real diff exists — an agent claiming success with no changes is a failure, not a success) →
   **COMMIT** → **PUSH** → **CREATE PR**. Every stage returns its own distinct failure status, not
   just "it crashed" — so a controller failure and an agent failure are always distinguishable.
3. **The agent's contract is deliberately narrow.** It edits code and runs tests/lint/typecheck in
   its clone, then replies with exactly one of `DONE`, `BLOCKED: <reason>` or
   `BLOCKED-PROMPT-CHANGE: <reason>` (used specifically when the task would require editing AI
   prompts or the knowledge base — a product decision reserved for a human). It has **no** `git` or
   `gh` access at all, enforced both by the granted permission allow-list and by explicit `deny`
   rules on the sensitive paths (`.claude/**`, the prompts and knowledge-base directories) — every
   mutation (clone, commit, push, PR creation, issue comments/labels) is owned by the controller.
4. **A post-DONE self-review, gated to code changes.** Before anything is committed, a *second*,
   independent `claude -p` invocation — no shared memory with the implementer, no `Edit`/`Write`
   permission at all — re-reads the issue body against the actual diff and checks specifically
   whether the diff satisfies the issue's own stated invariants and acceptance criteria, not merely
   whether the tests pass. Skipped entirely for doc-only diffs (no code-level invariant to violate
   there). A failing review triggers a bounded point-fix-then-re-review cycle before escalating to
   the same `BLOCKED` handling as the implementer's own — no silent compromise between "tests pass"
   and "the issue's own rules were followed."

### Key technical decisions

- **`git clone` per issue, not `git worktree`.** An earlier design used one shared worktree per
  iteration; three separate live runs against a real issue all failed the same way — the worktree
  directory intermittently appeared empty or detached to the headless agent process. A plain clone
  gives each iteration a fully self-contained `.git` directory instead of a worktree's `.git` file
  pointing back into a shared repo, which removed the failure mode entirely across every run since.
- **An explicit external loop, not a Claude Code `Stop` hook.** The first working version drove
  iterations from a `hooks.Stop` callback — implicit recursion that's harder to reason about,
  harder to bound (`--max-iterations`), and harder to debug mid-run. `run.js`'s `while` loop is a
  process a human can read top to bottom.
- **The agent never runs `git`/`gh`, full stop.** Every mutating action a human would normally
  confirm (`git push`, opening a PR) is something this project's own operating rules already treat
  as requiring explicit confirmation — automating it safely means moving that boundary to the
  controller, not asking the LLM to police its own git usage.
- **A dedicated block label for anything AI-prompt-related.** Prompt and knowledge-base wording is
  a product decision with real consequences (this repo's own anti-overclaiming safety rules live
  there) — the loop treats any task that would require touching them as automatically out of its
  own scope, not something to attempt and hope goes well.
- **Model and effort pinned explicitly, never inherited from the ambient CLI default.** Every
  `claude -p` invocation (implementer, reviewer, point-fixer) is called with an explicit
  `--model`/`--effort` rather than whatever the environment happens to default to — an unattended
  run with no human to catch a shortcut-y answer shouldn't be at the mercy of an unpinned,
  unknown-strength model.
- **Passing checks are never treated as proof of correctness.** `tsc`/`lint`/`test` all green
  doesn't establish that a diff actually satisfies an issue's own stated invariants — a real run
  demonstrated exactly this gap (see Known limitations below). The self-review pass exists because
  the loop no longer trusts an implementer's own self-reported `DONE` as sufficient evidence,
  the same way a human PR still gets reviewed even after CI is green.

### Known limitations (found via real runs)

Each of these was found by actually running the loop against real issues, not by inspection —
consistent with how this repo prefers "verified live" evidence over assumed-correct code
throughout (see the relevant GitHub Issue's own comments for that run's record — test evidence
moved from `project-management/TEST_LOG.md`, now frozen, to GitHub Issue comments per ADR-035):

- A fresh clone has no `node_modules` (gitignored, like any checkout) — the controller now runs
  `npm install` itself before the agent starts, rather than leaving the agent to discover and work
  around this with no permission to fix it.
- `Edit` and `Write` are separate Claude Code permissions; granting only one silently blocks
  creating new files.
- The agent occasionally wrapped its `DONE` sentinel in markdown emphasis (`**DONE**`) despite the
  prompt asking for a literal line — the parser was hardened to tolerate this rather than trusting
  the model to always follow formatting instructions exactly.
- A manual quality pass over two agent-completed tasks found real gaps a green test suite didn't
  catch: a regression test whose `toContain` assertion searched an entire file instead of the
  specific field it meant to guard (passed even after the safety rule it was supposed to protect
  was removed), and a data-extraction routine validated only against hand-written fixtures, never
  against the real files it was meant to process. Both are now explicit rules in the agent's
  prompt, not just fixed in place.
- A later run satisfied every automated check — `tsc`, `lint`, the full test suite, and the issue's
  own required end-to-end test — while silently violating an explicit instruction not to mutate
  certain production data: it found a technically-valid way to make the tests pass that the issue
  had asked it not to take, rather than stopping and flagging the conflict. Found by a manual
  review, not by the loop itself, which is exactly why the loop no longer relies on manual review
  as its only safety net — the post-DONE self-review pass above, plus a standing prompt rule that
  an issue's Acceptance Criteria and its own stated invariants conflicting is `BLOCKED`, not a
  choice to make silently, both exist because of this run.

Full architecture rationale and the complete list of findings live in
[`.claude/ralph/README.md`](.claude/ralph/README.md).

## Repository Layout

This is a two-app repo — the backend and frontend are fully independent projects, each with
their own `package.json`/`node_modules`/lockfile (no npm workspaces):

```
apps/api/    NestJS backend — the primary MVP (see below)
apps/web/    Next.js dashboard (Phase 13, secondary — see apps/web/README.md)
```

`docker-compose.yml` lives at the repo root and orchestrates both apps' infra (Postgres, Redis)
plus builds the `apps/api` image; it has its own small root-level `.env` (Postgres/Redis/port
vars only, for Compose's own variable substitution) separate from `apps/api/.env` (the backend's
full runtime config).

## Local Start

Full onboarding sequence for a fresh checkout (backend):

```bash
# 1. Install dependencies
cd apps/api && npm install

# 2. Copy the backend's environment file and fill in values (see "Required env vars" below)
cp .env.example .env

# 2b. Also copy the root env file, used by docker-compose.yml itself (Postgres/Redis/port vars)
cd ../.. && cp .env.example .env

# 3. Start PostgreSQL (from repo root)
docker compose up -d postgres

# 4. Apply database migrations (from apps/api)
cd apps/api
npx prisma migrate dev

# 5. Generate the Prisma client (also runs automatically after install/migrate in most setups)
npx prisma generate

# 6. Seed reference data (EvidenceItem rules + active PromptTemplate versions)
npx prisma db seed

# 7. Place knowledge-source content files, then register them in the database
#    (see "Knowledge Sources" section below for file layout)
npm run register-knowledge-sources

# 8. Start the development server (watch mode, port 3000)
npm run start:dev
```

To also run the frontend dashboard: `cd apps/web && npm install && npm run dev` (see
`apps/web/README.md`).

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

Create the first workspace to confirm the setup works end to end:

```bash
curl -X POST http://localhost:3000/workspaces \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"companyNameOriginal":"Acme Corp","roleTitleOriginal":"Backend Developer","vacancyText":"Full vacancy text goes here."}'
```

A successful response returns the created workspace with `status: "source_saved"`.

### API Documentation

Interactive Swagger UI is available at `GET /api` once the server is running (disabled when `NODE_ENV=production`). Raw OpenAPI JSON at `GET /api-json`.

### AI Provider

`AI_PROVIDER` selects which `AiProvider` implementation runs the pipeline: `fake` (default, deterministic canned responses, used in all automated tests) or `openai`. **OpenAI is the first real AI provider for the MVP** (`OPENAI_API_KEY` + `OPENAI_MODEL`, default `gpt-4o`). Anthropic/Claude support is planned as a later addition or fallback provider — it is **not** required for the MVP and is not currently implemented.

### Required env vars

The app validates environment on startup and **will not start** if required vars are missing.

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://jobflow:secret@localhost:5432/jobflow_cv` |
| `STORAGE_ROOT` | ✅ | `/absolute/path/to/storage/applications` |
| `API_KEY` | ✅ | shared secret required in `X-API-Key` header on every endpoint except `/health` |
| `KNOWLEDGE_SOURCES_ROOT` | optional | `./knowledge-sources` (default) |
| `AI_PROVIDER` | optional | `fake` (default) or `openai` |
| `OPENAI_API_KEY` | required when `AI_PROVIDER=openai` | `sk-...` |
| `OPENAI_MODEL` | optional | `gpt-4o` (default) |
| `PORT` | optional | `3000` (default) |
| `CORS_ORIGIN` | optional | `https://your-frontend.example.com` (default: `*`) |
| `LOG_LEVEL` | optional | `info` (default) |

See [.env.example](.env.example) for the full list with comments.

## Docker Commands

`docker-compose.yml` defines four services: `postgres`, `redis`, `app` (the `apps/api` backend)
and `web` (the `apps/web` dashboard, built from `apps/web/Dockerfile` with `output: "standalone"`).
`web` depends on `app` and reaches it over the Docker network at `http://app:3000` (baked into its
client bundle at build time via `NEXT_PUBLIC_API_BASE_URL` — see `docker-compose.yml`).

```bash
# Start PostgreSQL only
docker compose up -d postgres

# Start the full stack (Postgres, Redis, backend, frontend)
docker compose up -d

# Frontend only available at:
#   http://localhost:${WEB_PORT:-3001}

# Check running containers
docker compose ps

# Stop containers — DATA IS PRESERVED
docker compose down

# View PostgreSQL logs
docker compose logs postgres

# View frontend logs
docker compose logs web
```

> **Warning:** `docker compose down -v` deletes the `postgres_data` named volume and **permanently removes all local database data**. Never use `-v` unless you intend to reset the database. Normal development uses `docker compose down` without `-v`.

## PostgreSQL Persistence

PostgreSQL data is stored in the named Docker volume `postgres_data`. This volume survives:

- `docker compose down` and `docker compose up`
- Docker Desktop restart
- Container recreation (as long as `-v` is not passed to `down`)

The volume is only deleted by `docker compose down -v` or manual `docker volume rm`.

To verify persistence manually, follow [apps/api/scripts/check-postgres-persistence.md](apps/api/scripts/check-postgres-persistence.md) or run (from `apps/api/`):

```bash
cd apps/api
npm run db:check-persistence
```

## Application Commands

```bash
npm run build          # compile TypeScript
npm run test           # run unit tests
npm run test:watch     # run tests in watch mode
npm run test:e2e       # run end-to-end tests
npm run lint           # lint and auto-fix
```

## Knowledge Sources

Prompt context content files (master CV, project inventory, tech stack matrix, etc.) live under
`apps/api/knowledge-sources/` at the path configured by `KNOWLEDGE_SOURCES_ROOT` (default:
`./knowledge-sources`, relative to `apps/api`). See
[apps/api/knowledge-sources/README.md](apps/api/knowledge-sources/README.md) for the folder
structure and git strategy.

After placing content files at their expected paths, register them in the database:

```bash
npm run register-knowledge-sources
```

The script is idempotent — re-running it updates existing records (matched by file path) instead of
creating duplicates. Each registered source stores its file path, source type, version label, active
flag and a content hash (via `HashService`). Which sources are actually used for a given prompt step is
controlled by `KnowledgeSourceSelectionService` (explicit per-step source groups, not "everything on disk"
— see [docs/08_ai_pipeline.md](docs/08_ai_pipeline.md) §6.8).

## Architecture

NestJS monolith with PostgreSQL metadata + filesystem artifact storage.

Pipeline stages: vacancy source → AI analysis → human review → targeted CV draft → review → PDF export.

See [docs/04_architecture.md](docs/04_architecture.md) for the full architecture overview.
