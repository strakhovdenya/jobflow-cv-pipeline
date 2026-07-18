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

**Production hardening practices applied in this repo** (not just a happy-path prototype):

- CI pipeline on every push/PR: lint, typecheck, unit tests, build, Docker build validation.
- API-key authentication guard + rate limiting on all endpoints.
- Automated dependency scanning (Dependabot) and static code scanning (CodeQL), both actively triaged.
- Strict TypeScript (`strictNullChecks`, `noImplicitAny`, and all other strict flags enabled).
- Swagger/OpenAPI documentation generated from code (`/api`), kept current with every new endpoint.

## 2-minute overview

The pipeline is designed around a human-in-the-loop CV generation workflow:

1. Register vacancy text and structured knowledge sources.
2. Run AI-assisted vacancy analysis.
3. Require human review before continuing.
4. Generate a targeted CV draft using selected evidence sources.
5. Run evidence checks to flag unsupported or weakly supported claims.
6. Require final human review.
7. Export deterministic HTML/PDF artifacts without using AI tokens for the export step.

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
| Frontend UI | Not the focus | Backend-first portfolio project; UI may be added later. |
| Production deployment | Not planned | Personal local portfolio project, not a commercial SaaS product. |
| CI/CD pipeline | Implemented | GitHub Actions: lint, typecheck, unit tests, build, Docker build validation on every push/PR. |
| API-key auth + rate limiting | Implemented | Global `ApiKeyGuard` + `ThrottlerGuard`; `/health` exempted for uptime checks. |
| Dependency & code scanning | Implemented | Dependabot (weekly) + CodeQL (`javascript-typescript`) on push/PR and weekly cron. |
| API documentation | Implemented | Swagger/OpenAPI at `/api` (disabled in production), generated from code annotations. |

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
    H --> I[Deterministic HTML/PDF Export]

    B --> DB[(PostgreSQL / Prisma)]
    K --> DB
    D --> FS[Filesystem Artifact Storage]
    F --> FS
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

Two storage layers, split by responsibility (ADR-002 — PostgreSQL for metadata/state, filesystem
for physical artifacts):

- **PostgreSQL (metadata/state):** `Company` → `JobVacancy` → `ApplicationWorkspace` →
  `PromptRun` → `AiRun`. Each `ApplicationWorkspace` also owns a `GeneratedArtifact` registry (one
  row per physical file, linking back to the `PromptRun` that produced it, or marked
  `origin: generated_by_export_service` for the deterministic PDF export step). `KnowledgeSource`
  and `EvidenceItem` are registered separately and referenced by the prompt pipeline.
- **Filesystem (physical artifacts):** each workspace gets its own folder
  (`storage/applications/<date>_<company>_<role>/`) containing canonical, stable-named files —
  `00_vacancy_source.txt`, `01_vacancy_analysis.md/json`, `02_targeted_cv_content.md/json`,
  `04_cv_export.html/pdf`, etc. Names are step-based and stable, not derived from prompt template
  version, so downstream tooling can rely on them.
- **AI usage tracking:** every AI-assisted pipeline step (`PromptRun`) links to exactly one
  `AiRun` row, which stores `provider`, `model`, `inputTokens`/`outputTokens`/`totalTokens`, an
  estimated `costEstimate`, and the raw provider usage payload (`usageRawJson`) for auditing. Step
  4 (PDF export) is deterministic and intentionally creates **no** `AiRun` — it consumes zero AI
  tokens.

See [docs/04_architecture.md](docs/04_architecture.md) for the full data model and state machine.

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
