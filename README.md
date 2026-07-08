# JobFlow CV Pipeline

Backend-first AI-assisted pipeline for vacancy analysis, targeted CV generation and PDF export.

Built with NestJS, TypeScript, PostgreSQL, Prisma and Docker. Personal portfolio project — not commercial production AI experience.

## Recruiter / hiring manager overview

JobFlow CV Pipeline is a personal backend portfolio project built to demonstrate production-style NestJS/TypeScript backend design, AI-assisted workflow orchestration, evidence-based claim validation and deterministic document export.

The project is intentionally backend-first. It focuses on workflow state, modular service boundaries, source traceability, artifact management, human review gates and safe AI integration patterns rather than UI-first prototyping.

It is **not** a commercial product and **not** commercial production AI experience. My commercial production experience is primarily Node.js/TypeScript/Azure backend work in large-scale e-commerce systems. This repository is used as current portfolio evidence for backend architecture, NestJS practice and AI-friendly engineering workflows.

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
| Evidence Guard / claim validation | In progress | Designed to flag unsupported CV claims using structured source evidence. |
| Token/cost tracking | In progress | Intended to track AI usage by run, prompt type, token count and estimated cost. |
| Deterministic HTML/PDF export | In progress | Export is separated from AI generation and should not consume AI tokens. |
| Frontend UI | Not the focus | Backend-first portfolio project; UI may be added later. |
| Production deployment | Not planned | Personal local portfolio project, not a commercial SaaS product. |

## High-level architecture

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

## Local Start

Full onboarding sequence for a fresh checkout:

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in values (see "Required env vars" below)
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Apply database migrations
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

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

Create the first workspace to confirm the setup works end to end:

```bash
curl -X POST http://localhost:3000/workspaces \
  -H "Content-Type: application/json" \
  -d '{"companyNameOriginal":"Acme Corp","roleTitleOriginal":"Backend Developer","vacancyText":"Full vacancy text goes here."}'
```

A successful response returns the created workspace with `status: "source_saved"`.

### AI Provider

`AI_PROVIDER` selects which `AiProvider` implementation runs the pipeline: `fake` (default, deterministic canned responses, used in all automated tests) or `openai`. **OpenAI is the first real AI provider for the MVP** (`OPENAI_API_KEY` + `OPENAI_MODEL`, default `gpt-4o`). Anthropic/Claude support is planned as a later addition or fallback provider — it is **not** required for the MVP and is not currently implemented.

### Required env vars

The app validates environment on startup and **will not start** if required vars are missing.

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://jobflow:secret@localhost:5432/jobflow_cv` |
| `STORAGE_ROOT` | ✅ | `/absolute/path/to/storage/applications` |
| `KNOWLEDGE_SOURCES_ROOT` | optional | `./knowledge-sources` (default) |
| `AI_PROVIDER` | optional | `fake` (default) or `openai` |
| `OPENAI_API_KEY` | required when `AI_PROVIDER=openai` | `sk-...` |
| `OPENAI_MODEL` | optional | `gpt-4o` (default) |
| `PORT` | optional | `3000` (default) |
| `CORS_ORIGIN` | optional | `https://your-frontend.example.com` (default: `*`) |
| `LOG_LEVEL` | optional | `info` (default) |

See [.env.example](.env.example) for the full list with comments.

## Docker Commands

```bash
# Start PostgreSQL only
docker compose up -d postgres

# Check running containers
docker compose ps

# Stop containers — DATA IS PRESERVED
docker compose down

# View PostgreSQL logs
docker compose logs postgres
```

> **Warning:** `docker compose down -v` deletes the `postgres_data` named volume and **permanently removes all local database data**. Never use `-v` unless you intend to reset the database. Normal development uses `docker compose down` without `-v`.

## PostgreSQL Persistence

PostgreSQL data is stored in the named Docker volume `postgres_data`. This volume survives:

- `docker compose down` and `docker compose up`
- Docker Desktop restart
- Container recreation (as long as `-v` is not passed to `down`)

The volume is only deleted by `docker compose down -v` or manual `docker volume rm`.

To verify persistence manually, follow [scripts/check-postgres-persistence.md](scripts/check-postgres-persistence.md) or run:

```bash
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
`knowledge-sources/` at the path configured by `KNOWLEDGE_SOURCES_ROOT` (default: `./knowledge-sources`,
relative to the repo root). See [knowledge-sources/README.md](knowledge-sources/README.md) for the
folder structure and git strategy.

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
