# Current Task

## Status

TASK-041 (Implement artifact latest-version marking) — implementation and
tests complete, pending closure checklist.

## Docs to Read

- `docs/07_task_backlog.md` lines 1676–1699 (TASK-041 acceptance/test/done definition)
- `prisma/schema.prisma` lines 211–231 (`GeneratedArtifact` — `isLatest`, `version` fields already exist, default `true`/`1`)
- `src/artifacts/artifacts.service.ts` — `register()` — the method being extended
- `src/prompt-templates/prompt-templates.service.ts` — `create()`/`activate()` — analogous version-bump / flag-flip pattern already in the codebase

## Scope Decision

- No Prisma migration needed: `isLatest` and `version` already exist on
  `GeneratedArtifact` with defaults (`true` / `1`). The backlog entry lists
  `prisma/schema.prisma` as "likely affected" but this task is service-logic
  only.
- Versioning is grouped by `workspaceId + artifactType` (not `promptRunId`),
  matching how canonical artifact types are already modeled 1:1 with distinct
  `artifactType` strings (e.g. `vacancy_analysis_md` vs `vacancy_analysis_json`
  are separate types, each versioned independently). This matches ADR-006
  (canonical artifact names).
- `register()` now looks up the current latest artifact of the same
  `workspaceId + artifactType`, flips it to `isLatest: false` via
  `updateMany`, and assigns the new row `version = previous.version + 1`
  (or `1` if none exists). No `$transaction` wrapper — matches the existing
  sequential-calls pattern used in `PromptTemplatesService.activate()`.
- Callers of `register()` are unaffected: none currently pass `isLatest`
  explicitly, and the DTO's optional `isLatest` override is preserved.

## Key Invariants

- `GeneratedArtifact.isLatest` transitions from `true` → `false` only when a
  *new* artifact of the same `workspaceId + artifactType` is registered.
  Existing rows are never deleted — full version history is preserved on disk
  and in the DB.
- `version` is per `workspaceId + artifactType`, starting at `1`.

| Action | Precondition | `isLatest` (old row) after | `version` (new row) | `isLatest` (new row) |
|---|---|---|---|---|
| First `register()` for a workspace+type | no prior row for that workspace+type | n/a | `1` | `true` (default) |
| Subsequent `register()` for same workspace+type | a row with `isLatest: true` exists | `false` | `previous.version + 1` | `true` (default) |

## Acceptance Criteria

- [x] `GeneratedArtifact` has an `isLatest` flag (pre-existing, verified).
- [x] Registering a new artifact of the same `workspaceId + artifactType` marks the previous latest as `isLatest: false`.
- [x] Existing artifact history is preserved (old rows untouched except the flag).
- [x] Service test for version replacement behavior (`artifacts.service.spec.ts`): first registration → `version: 1`, no `updateMany`; second registration same type → previous flipped, new `version: 2`; different type in same workspace → no interference.
- [x] `npm run test` passes for the full suite (no regressions) — 40/40 suites, 382/382 tests; `npm run test:e2e` also verified.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-041 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
