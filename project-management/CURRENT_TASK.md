# Current Task

## TASK-054 — Implement queued Prompt 1 analysis worker

User-selected 2026-07-16 (Phase 12 — Redis/BullMQ Async Processing).

## Status

DONE (closed 2026-07-16).

## Context

TASK-053 added `QueueService` (`enqueue`/`getStatus`/`retry`/`cancel`) as a standalone injectable
with no real consumer yet, deliberately deferring "wiring it into a real worker/module" to this
task. TASK-054 is that first real consumer, per `docs/07_task_backlog.md` TASK-054 (verbatim AC:
"User starts background analysis job", "Job creates/updates PromptRun, AiRun and artifacts",
"Completion opens the same human review gate").

**Design decision confirmed with user before implementation:** the worker (`AnalysisWorker`) is a
thin BullMQ consumer that delegates entirely to the existing, unchanged `Prompt1Service.runAnalysis()`
— no duplicated pipeline logic, satisfying the backlog's "Done definition": "Queues automate
execution, not decision-making." A new `QueueModule` was introduced (anticipated by TASK-053's own
notes) since a worker needs NestJS module wiring/lifecycle hooks (`OnModuleInit`/`OnModuleDestroy`)
that a standalone service alone doesn't provide. Two new endpoints were added on
`WorkspacesController`: `POST :id/run-analysis-async` (enqueue) and `GET :id/analysis-job/:jobId`
(status) — the status endpoint was added beyond the AC's literal wording because an enqueue-only
endpoint with no way to check job completion would not be usable in practice, and `QueueService.getStatus`
already existed for exactly this purpose.

**Scope boundary:** no changes to `Prompt1Service` or the existing synchronous `POST
:id/run-analysis` endpoint. No workers added for the other 3 `QueueName` values (CV generation,
document export, final check) — not required by this task's AC, and not yet scheduled as separate
tasks.

## Docs to Read

- `docs/07_task_backlog.md` lines 2018-2042 (TASK-054 entry, verbatim AC).
- `src/queue/queue.service.ts` + `src/queue/queue.constants.ts` — existing `QueueService`
  (`enqueue`/`getStatus`/`retry`/`cancel`) and `QueueName` enum from TASK-053, used unchanged.
- `src/pipeline/prompt1/prompt1.service.ts` — `runAnalysis(workspaceId): Promise<RunAnalysisResult>`,
  the exact method the worker delegates to.
- `src/pipeline/pipeline.module.ts` — confirms `Prompt1Service` is already exported, so the new
  `QueueModule` can import `PipelineModule` directly.
- `src/workspaces/workspaces.controller.ts` + `workspaces.module.ts` — existing sync
  `run-analysis` endpoint and module wiring pattern, mirrored for the two new async endpoints.
- `src/queue/queue.service.spec.ts` — `jest.mock('bullmq')` pattern for `Queue`, mirrored for
  `Worker` in the new `analysis.worker.spec.ts`.

## Key Invariants

- No changes to `src/pipeline/prompt1/prompt1.service.ts` or its existing synchronous endpoint.
- Redis stays optional at app startup: `AnalysisWorker.onModuleInit()` only creates a BullMQ
  `Worker` if `REDIS_URL` is configured; otherwise it logs a warning and returns (no throw),
  consistent with TASK-052/053's "Redis is not required for the MVP synchronous flow."
- Unit tests must mock `bullmq`'s `Worker` class entirely — no real Redis connection in tests.

## State Machine

N/A — no new workspace status values or transitions. The worker triggers the existing
`Prompt1Service.runAnalysis()` state transitions unchanged (`analysis_running` →
`paused_after_analysis` / `failed`, per the state machine already documented for TASK-026/TASK-028).

## Acceptance Criteria

- [x] `src/queue/workers/analysis.worker.ts` — `AnalysisWorker`, standalone `@Injectable()`
      implementing `OnModuleInit`/`OnModuleDestroy`, consumes `QueueName.ANALYSIS` jobs, delegates
      to `Prompt1Service.runAnalysis(job.data.workspaceId)`.
- [x] `src/queue/queue.module.ts` — new module, imports `PipelineModule`, provides
      `QueueService`+`AnalysisWorker`, exports `QueueService`.
- [x] `src/workspaces/workspaces.controller.ts` — `POST :id/run-analysis-async` (enqueue, returns
      `{ jobId }`) and `GET :id/analysis-job/:jobId` (status, 404 via `NotFoundException` when
      missing), both `@ApiOperation`-documented (ADR-019).
- [x] `src/workspaces/workspaces.module.ts` — imports `QueueModule`.
- [x] `src/queue/workers/analysis.worker.spec.ts` — unit tests with `bullmq`'s `Worker` fully
      mocked; covers worker start (only when `REDIS_URL` set), job processing delegating to
      `Prompt1Service.runAnalysis`, close on destroy, no-op when Redis not configured.
- [x] `src/workspaces/workspaces.controller.spec.ts` — tests for both new endpoints.
- [x] No changes to `Prompt1Service` or its existing sync endpoint.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run lint` clean;
      `npm run test:e2e` green.
- [x] Manual end-to-end smoke test with real Redis + Postgres running, confirming the queued flow
      reaches `status: paused_after_analysis` (same review gate as the sync path).
- [x] `project-management/TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus`
      updated (recommend next task).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-054 ..."`
3. `git push -u origin task/TASK-054-queued-prompt1-analysis-worker`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
