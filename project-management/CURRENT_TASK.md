# Current Task

## Status

No active task. TASK-040 (Add workspace artifact summary API) completed
2026-07-10 — see `TASK_BOARD.md` and `TEST_LOG.md` for closure evidence.

Per Operating Rules (CLAUDE.md), the next task is not selected automatically.
Recommended next task (per `TASK_BOARD.md` Current Focus): TASK-041
(Implement artifact latest-version marking, Phase 7).

## Docs to Read

- `docs/07_task_backlog.md` lines 1652–1675 (TASK-040 acceptance/test/done definition)
- `prisma/schema.prisma` lines 86–112 (`ApplicationWorkspace` — `status`, `currentDecision`, `score` fields)
- `prisma/schema.prisma` lines 211–231 (`GeneratedArtifact` — `canonicalFileName` vs `downloadFileName`, `isLatest`, `version`)
- `src/workspaces/workspaces.service.ts` lines 105–117 (`findById()` — current detail query, includes `company`/`jobVacancy`)
- `src/workspaces/workspaces.controller.ts` lines 43–51 (`GET /workspaces/:id` — current handler, to be extended)
- `src/artifacts/artifacts.service.ts` lines 43–48 (`findByWorkspaceId()` — already exists, reused as-is)
- `src/artifacts/artifacts.controller.ts` lines 20–24 (existing separate `GET /workspaces/:id/artifacts` endpoint — stays as is, not replaced)

## Scope Decision

- `GET /workspaces/:id` (existing endpoint) is extended to embed an `artifacts`
  summary array in its response, rather than adding a new endpoint. The
  acceptance criterion says "detail response shows ... artifact list", and a
  separate `GET /workspaces/:id/artifacts` endpoint already exists (TASK-016)
  but requires a second round-trip — TASK-040 is explicitly about giving
  "enough information to resume work" from one call.
- The separate `GET /workspaces/:id/artifacts` endpoint is untouched — it
  still returns the full raw `GeneratedArtifact[]`. The new `artifacts` field
  on the detail response is a lighter summary shape (id, type, both file
  names, isLatest, version, mimeType, size, createdAt) — good enough to show
  "what exists" without duplicating the full artifact endpoint.
- New composition logic lives in `WorkspacesService` as a new method
  (`getWorkspaceDetail`), not in the controller — matches the existing
  pattern where `WorkspacesService` already composes multiple sub-services
  (`createWorkspace` composes company + vacancy + artifact registration).
  `WorkspacesService` already has `ArtifactsService` injected — no new DI
  wiring needed.
- `WorkspacesService.findById()` stays unchanged and is reused internally by
  `getWorkspaceDetail()` — no breaking change to its existing contract.

## Key Invariants

- `status`, `currentDecision`, `score` already exist as direct fields on
  `ApplicationWorkspace` — no new Prisma fields/migration needed, this task
  is response-shaping only.
- `GeneratedArtifact.canonicalFileName` (stable internal name, e.g.
  `04_cv_export.pdf`) and `GeneratedArtifact.downloadFileName` (nullable,
  human-readable name for real downloads) already exist as separate columns
  — "distinguishes canonical vs download names" means surfacing both fields
  in the response, not renaming/deriving anything new.
- Do not touch `GeneratedArtifact.isLatest`/`version` semantics — those are
  TASK-041 scope (artifact latest-version marking), out of scope here.

## Acceptance Criteria

- [x] `GET /workspaces/:id` response includes `status`, `currentDecision`, `score` (already present on the entity — verified they survive the response shape) and a new `artifacts` array.
- [x] Each entry in `artifacts` exposes both `canonicalFileName` and `downloadFileName` (nullable) as distinct fields.
- [x] `WorkspacesService.getWorkspaceDetail(id)` returns `null` for an unknown workspace id; controller keeps throwing `NotFoundException`.
- [x] Controller test: workspace with a vacancy-source artifact, a vacancy-analysis artifact (md+json), and a PDF export artifact — asserts the response contains status/decision/score and all 4 artifacts with correct canonical/download names.
- [x] Existing `GET /workspaces/:id/artifacts` endpoint behavior is unchanged (no regression).
- [x] `npm run test` passes for the full suite (no regressions) — 40/40 suites, 379/379 tests; `npm run test:e2e` also verified.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-040 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
