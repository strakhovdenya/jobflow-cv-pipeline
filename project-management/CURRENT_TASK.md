# Current Task

## TASK-053 — Implement BullMQ queue abstraction

User-selected 2026-07-16 (Phase 12 — Redis/BullMQ Async Processing).

## Status

DONE (closed 2026-07-16).

## Context

TASK-052 added a Redis service to Docker Compose. This task adds the actual queue abstraction on
top of it via `bullmq`, per `docs/07_task_backlog.md` TASK-053 (verbatim AC: "Queue abstraction
supports enqueue, status, retry and cancel", "Supports analysis, CV generation, export and final
check queues", "Existing synchronous services remain reusable by workers").

**Scope decision confirmed with user before implementation:** `docs/06_roadmap.md` Phase 12 lists
7 queue names (`analysis-queue`, `cv-generation-queue`, `pre-pdf-check-queue`,
`document-export-queue`, `final-check-queue`, `cover-letter-queue`, `import-queue`), but the
backlog AC for this task only names 4: analysis, CV generation, export, final check. Implemented
exactly those 4 (`QueueName` enum) — matching the AC verbatim rather than the broader roadmap list.
The enum is trivially extensible when a later task needs the remaining queue names.

**Scope boundary:** no changes to any existing pipeline service (`Prompt1Service`, `Prompt2Service`,
etc.) — the AC's "existing synchronous services remain reusable by workers" requirement is
satisfied by not touching them, not by writing new code. No worker process, no NestJS module, no
`AppModule` wiring, no controller/HTTP endpoint in this task — `QueueService` is a standalone
`@Injectable()` (mirrors the TASK-048 pattern: service-only, wiring deferred to the task that
actually consumes it). TASK-054 (queued Prompt 1 worker) is the first real consumer and will decide
whether a `QueueModule` is warranted then (per ADR-017 rule 6 — split only when it reduces real
complexity).

## Docs to Read

- `docs/07_task_backlog.md` lines 1993-2016 (TASK-053 entry, verbatim AC).
- `docs/06_roadmap.md` Phase 12 section — full 7-queue list (roadmap-level scope, broader than this
  task's AC).
- `src/ai/ai-provider.interface.ts` + `src/ai/ai.module.ts` — existing abstraction-over-external-
  dependency pattern (interface/token + factory), used as a style reference (though `QueueService`
  itself needed no module, being a plain injectable with only `ConfigService` as a dependency).
- `src/document-export/pdf-export.service.ts` — standalone `@Injectable()` with no module,
  mirrored for `QueueService`.
- `src/config/env.validation.ts` — Joi schema to extend with optional `REDIS_URL`.

## Key Invariants

- No changes to any existing pipeline service in `src/pipeline/**`.
- Redis/`REDIS_URL` stays optional at app startup (`QueueService` only reads it lazily, on first
  actual `enqueue`/`getStatus`/`retry`/`cancel` call for a given queue) — consistent with TASK-052's
  "Redis is not required for the MVP synchronous flow."
- Unit tests must mock `bullmq`'s `Queue` class entirely — no real Redis connection in tests.

## State Machine

N/A — no workspace/enum status transitions in this task. (BullMQ's own internal job states
(`pending`/`running`/`completed`/`failed`/etc., per `docs/06_roadmap.md` Phase 12) are exposed via
`getStatus()` as opaque strings, not modeled as a local enum in this task.)

## Acceptance Criteria

- [x] `package.json` gains `bullmq` dependency.
- [x] `src/queue/queue.constants.ts` — `QueueName` enum (`ANALYSIS`, `CV_GENERATION`,
      `DOCUMENT_EXPORT`, `FINAL_CHECK`).
- [x] `src/queue/queue.service.ts` — standalone `QueueService` (`enqueue`, `getStatus`, `retry`,
      `cancel`), lazily creating one BullMQ `Queue` per `QueueName`, connected via `REDIS_URL`.
- [x] `src/config/env.validation.ts` — `REDIS_URL` added as `Joi.string().optional()`.
- [x] `src/queue/queue.service.spec.ts` — unit tests with `bullmq`'s `Queue` fully mocked
      (`jest.mock('bullmq')`); covers enqueue, per-queue-name instance reuse, getStatus (found/not
      found), retry/cancel (found/not found → `NotFoundException`).
- [x] No changes to `src/pipeline/**`, no new module/controller/`AppModule` wiring.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run lint` clean;
      `npm run test:e2e` green.
- [x] `project-management/TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus`
      updated (recommend next task).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-053 ..."`
3. `git push -u origin task/TASK-053-bullmq-queue-abstraction`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
