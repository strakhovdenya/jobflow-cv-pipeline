# JobFlow CV Pipeline

Backend-first AI-assisted pipeline for vacancy analysis, targeted CV generation and PDF export.

Built with NestJS, TypeScript, PostgreSQL, Prisma and Docker. Personal portfolio project — not commercial production AI experience.

## Local Start

```bash
# 1. Copy environment file and fill in values
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Install dependencies
npm install

# 4. Start development server (watch mode, port 3000)
npm run start:dev
```

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

### Required env vars

The app validates environment on startup and **will not start** if required vars are missing.

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://jobflow:secret@localhost:5432/jobflow_cv` |
| `STORAGE_ROOT` | ✅ | `/absolute/path/to/storage/applications` |
| `KNOWLEDGE_SOURCES_ROOT` | optional | `./knowledge-sources` (default) |
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
