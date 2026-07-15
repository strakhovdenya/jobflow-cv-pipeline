# Current Task

## TASK-052 — Add Redis to Docker Compose for later phase

User-selected 2026-07-16 (Phase 12 — Redis/BullMQ Async Processing).

## Status

DONE (closed 2026-07-16).

## Context

Per `docs/07_task_backlog.md` TASK-052 (verbatim AC: "Redis service can be started locally", "Redis
is not required for MVP synchronous flow", "Config uses `REDIS_URL`"), this task only adds a Redis
container to `docker-compose.yml` and documents `REDIS_URL`/`REDIS_PORT` in `.env.example`.

**Scope boundary confirmed with user before implementation:** `src/queue/**` (BullMQ queue
abstraction) is TASK-053, not this task — no NestJS module, no app-side Redis client, no code
changes at all in this task. This is Docker/config only.

**Design decisions:**

- Redis service has no named volume (unlike `postgres_data` per ADR-007). Redis here will back a
  future BullMQ job queue, not durable application data — nothing in the AC requires persistence
  across restarts, and adding one now would be speculative for a queue that doesn't exist yet.
- Redis is NOT added to `app`'s `depends_on` — AC explicitly says Redis is not required for the MVP
  synchronous flow, so the app must keep starting normally with `redis` absent or down.
- Port mapping follows the existing `POSTGRES_PORT` pattern: `"${REDIS_PORT:-6379}:6379"`.

## Docs to Read

- `docs/07_task_backlog.md` lines 1965-1991 (TASK-052 entry, verbatim AC).
- `docker-compose.yml` — existing `postgres` service, to mirror the port-mapping/env-var pattern.
- `.env.example` — existing `POSTGRES_*` block, to mirror comment style and placement.

## Key Invariants

- No source code changes (`src/queue/**` is out of scope — that's TASK-053).
- Existing `app`/`postgres` services and `postgres_data` volume must be untouched.
- Redis must not become a hard dependency of app startup in this task.

## State Machine

N/A — this task has no status/enum transitions; it is Docker Compose + `.env.example` only.

## Acceptance Criteria

- [x] `docker-compose.yml` gains a `redis` service (`redis:7-alpine`, `jobflow_redis`, port
      `${REDIS_PORT:-6379}:6379`, `restart: unless-stopped`, no volume, not in `app`'s `depends_on`).
- [x] `.env.example` gains `REDIS_PORT` and `REDIS_URL`.
- [x] Manual check: `docker compose up -d redis` starts and stays running; full stack
      (`docker compose up -d`) still starts with app reaching `/health` unchanged.
- [x] `project-management/TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus`
      updated (recommend next task).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-052 ..."`
3. `git push -u origin task/TASK-052-redis-docker-compose`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
