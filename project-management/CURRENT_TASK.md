# Current Task

## TASK-PH-022 — Remove redundant WorkspaceStatusService registration from WorkspacesModule

User-selected 2026-07-15 (Phase PH-2 — Production Hardening Follow-ups).

## Status

DONE (closed 2026-07-15).

## Context

Discovered during code review of TASK-049 (PR #83). `WorkspaceStatusService`
(`src/workspaces/workspace-status.service.ts`) was registered as a provider in both
`WorkspacesModule` and `PipelineModule`, giving the running app two separate DI instances of the
same class. `PipelineModule`'s registration was added by TASK-049 so `CoverLetterService` could
inject it.

**Scope revised from the original backlog card after checking actual usage (confirmed with user
before implementation):** the backlog card assumed a new shared module would be needed for both
modules to inject the service. Checking real consumers found that **nothing in `WorkspacesModule`,
`WorkspacesService`, or `WorkspacesController` actually injects `WorkspaceStatusService`** — the
`WorkspacesModule` registration is dead weight left over from TASK-039 ("standalone, registered in
WorkspacesModule, no existing call sites refactored"). The only real consumer is `CoverLetterService`
inside `PipelineModule`. Per CLAUDE.md Module Rules ("Only add a provider to `exports: []` if
another module is expected to inject it" / "Split a module only when the split reduces real
complexity"), extracting a new shared module for a single consumer is premature. User confirmed:
simply remove the redundant registration from `WorkspacesModule` instead of creating a new module.
If a future task needs `WorkspacesController`/`WorkspacesService` to use it directly,
`WorkspaceStatusService` can be added to `PipelineModule`'s `exports` at that point — `WorkspacesModule`
already imports `PipelineModule`.

## Docs to Read

- `src/workspaces/workspaces.module.ts` — confirm `WorkspaceStatusService` is listed in `providers`
  but never referenced by anything else in the module.
- `src/workspaces/workspaces.service.ts`, `src/workspaces/workspaces.controller.ts` — confirm neither
  injects `WorkspaceStatusService` (grep confirms no matches).
- `src/pipeline/pipeline.module.ts` — confirms the sole real registration/consumer
  (`CoverLetterService`).

## Key Invariants

- `workspace-status.service.spec.ts` constructs `new WorkspaceStatusService()` directly (not via
  Nest DI), so it is unaffected by this change.
- No import path changes — the file stays at `src/workspaces/workspace-status.service.ts`.

## Acceptance Criteria

- [x] `WorkspaceStatusService` removed from `WorkspacesModule`'s `providers` array (and its now-unused
      import).
- [x] `WorkspaceStatusService` remains the sole DI registration, in `PipelineModule`.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green (confirms no
      hidden consumer resolved it via `WorkspacesModule`'s container).
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated.
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-022 ..."`
3. `git push -u origin task/TASK-PH-022-workspace-status-service-dedup`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
