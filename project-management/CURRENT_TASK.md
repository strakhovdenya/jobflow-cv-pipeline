# Current Task

## Task ID

`TASK-035C` — DONE

> Source: architectural audit findings from TASK-035B post-review.

## Title

NestJS module architecture cleanup — remove redundant imports and orphaned module

## Context

An architectural audit of all `*.module.ts` files revealed two concrete problems that add noise without providing any value:

1. **AppModule imports 7 modules it never uses.** `AppController`/`AppService` inject nothing from these modules. Each module is already imported by the sub-module that actually needs it (`WorkspacesModule`, `PipelineModule`). NestJS registers providers globally in the DI container, so the behaviour is identical with or without these imports — but having them implies AppModule depends on them, which is misleading.

2. **`SkipReasonModule` exists as a file but is imported by nobody.** `SkipReasonService` is already registered inside `PipelineModule`. If someone were to import `SkipReasonModule` in the future, the service would be double-registered. The file is a latent inconsistency.

A third finding (PrismaModule `@Global()` + repeated imports in 12 modules) is **left as-is** — the explicit imports serve as self-documentation and removing them is a style choice that carries non-zero risk of confusion. This task does not touch PrismaModule imports.

## Docs to Read

No external docs needed. All inputs come from the audit:

- `src/app.module.ts` — lines 1–30 (imports array to clean)
- `src/pipeline/skip/skip-reason.module.ts` — full file (to delete)
- `project-management/DECISIONS.md` — to add new ADR

## Files Likely Affected

```text
src/app.module.ts
src/pipeline/skip/skip-reason.module.ts   ← DELETE
CLAUDE.md                                  ← add module rules section
project-management/DECISIONS.md           ← add ADR-017
project-management/TASK_BOARD.md          ← mark TASK-035C
project-management/CHANGELOG.md           ← entry after tests pass
```

## State Machine

No status transitions involved. This task is purely structural — no Prisma schema changes, no WorkspaceStatus changes.

## Key Invariants

- `SkipReasonService` must remain available after this task — it is registered in `PipelineModule` and exported from it. Deleting `skip-reason.module.ts` does not remove the service from the DI container.
- Do NOT remove `PrismaModule` from any module's imports — that is explicitly out of scope.
- Do NOT split `PipelineModule` into sub-modules — out of scope (see audit finding #3).
- After the change, `npm run test` must pass with the same test count as before.

## Acceptance Criteria

- [ ] `app.module.ts`: imports array contains only `PrismaModule` and `WorkspacesModule` (plus any controller/service that AppModule directly owns).
- [ ] `src/pipeline/skip/skip-reason.module.ts` deleted from the repository.
- [ ] No references to `SkipReasonModule` remain anywhere in the codebase (grep check).
- [ ] `npm run test` passes with the same count as before the change.
- [ ] `CLAUDE.md` contains a new **Module Rules** section (see scope below).
- [ ] `DECISIONS.md` contains `ADR-017` documenting the module boundary rules.
- [ ] `CHANGELOG.md` updated with a brief entry.
- [ ] `TASK_BOARD.md` updated: TASK-035C marked DONE.

## Module Rules to Document

Add to `CLAUDE.md` under a new `## Module Rules` section, and mirror as `ADR-017` in `DECISIONS.md`:

1. **AppModule imports only modules it directly orchestrates.** AppModule should import only `PrismaModule` (global registration) and `WorkspacesModule` (the HTTP entry point). If AppModule does not inject a provider from a module in its own controller or service, that import does not belong in AppModule.

2. **Each module imports what it needs, not what its callers need.** NestJS DI is not transitive through module imports — only through explicit `exports`. A module should import its own dependencies directly, regardless of what the parent module imports.

3. **Orphaned module files must not exist.** A `*.module.ts` file that is not imported by any other module (and is not AppModule itself) is dead code and a risk of double-registration. Delete it.

4. **PrismaModule is `@Global()` — imports are optional but acceptable as self-documentation.** Do not add or remove PrismaModule imports as part of unrelated tasks. If a dedicated cleanup is warranted, do it in a separate focused task.

5. **PipelineModule stays monolithic until a concrete splitting reason exists.** Splitting Prompt1/Prompt2/SkipReason into sub-modules is not worth the duplication given shared dependencies. Revisit if a new prompt step has zero shared deps or if testing isolation becomes a problem.

## Scope

**Allowed:**
- Remove the 7 redundant imports from `app.module.ts`
- Delete `src/pipeline/skip/skip-reason.module.ts`
- Add Module Rules to `CLAUDE.md`
- Add ADR-017 to `DECISIONS.md`
- Update `CHANGELOG.md` and `TASK_BOARD.md`

**Not allowed:**
- Removing `PrismaModule` from any module's imports array
- Splitting PipelineModule
- Touching any service, controller, Prisma schema, or business logic
- Adding new `WorkspaceStatus` values
- Any change to exports arrays in existing modules

## Test Requirement

- Run `npm run test` before making changes — record baseline test count.
- Make changes.
- Run `npm run test` again — count must match baseline, zero failures.
- Run `npx tsc --noEmit` — must pass cleanly.
- Grep for `SkipReasonModule` — must return zero results.
- Record results in `project-management/TEST_LOG.md`.

## Documentation Update (after tests pass)

Only after `npm run test` and `npx tsc --noEmit` both pass:

1. Update `CLAUDE.md` — add `## Module Rules` section.
2. Update `DECISIONS.md` — add `ADR-017`.
3. Update `CHANGELOG.md` — one-line entry: "TASK-035C: removed 7 redundant AppModule imports, deleted orphaned SkipReasonModule, documented NestJS module rules."
4. Update `TASK_BOARD.md` — set TASK-035C status to DONE.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md` and this file fully.
2. Read `src/app.module.ts` — confirm the 7 imports to remove.
3. Read `src/pipeline/skip/skip-reason.module.ts` — confirm it is not imported anywhere (`grep -r "SkipReasonModule"`).
4. Run `npm run test` — record baseline count.
5. Make changes (no approval needed — changes are strictly subtractive).

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed/deleted files.
3. Show test results (before vs after count).
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-035C can be marked DONE.
6. Stop and wait for user approval before committing.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-035C-module-cleanup
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "chore: TASK-035C remove redundant AppModule imports and orphaned SkipReasonModule"
git push -u origin task/TASK-035C-module-cleanup
gh pr create --title "chore: TASK-035C NestJS module architecture cleanup" --body "Closes TASK-035C" --base main
```

Then stop completely. User handles merge, checkout main and pull.
