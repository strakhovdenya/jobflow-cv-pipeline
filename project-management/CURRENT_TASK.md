# Current Task

## Task ID

`TASK-PH-001` — DONE

> Source: production-readiness audit, 2026-07-05. Unplanned addition, Phase PH — Production Hardening (Quick Wins). Current priority per TASK_BOARD.md Current Focus — runs before Phase 6 resumes.

## Title

Add @nestjs/config with env validation (Joi)

## Context

`process.env` is currently accessed directly across the codebase and no validation runs on startup. A misconfigured environment silently produces runtime failures instead of failing fast at boot. `@nestjs/config` with a Joi schema catches missing or malformed variables at boot time.

This task unblocks `TASK-PH-002`, `TASK-PH-003`, and `TASK-PH-007`, which depend on configurable values (`CORS_ORIGIN`, throttler limits, `LOG_LEVEL`).

## Docs to Read

- `docs/07_task_backlog.md` §17.1 — TASK-PH-001 full definition (this task)
- `src/app.module.ts` — current imports, to add `ConfigModule.forRoot(...)`
- `src/main.ts` — current bootstrap, to confirm where `process.env` is read directly

## Files Likely Affected

```text
package.json
src/app.module.ts
src/config/env.validation.ts    ← NEW
src/main.ts
.env.example
```

Note: the acceptance criteria also require replacing **every** direct `process.env` access with `ConfigService`, wherever it occurs in the codebase — not limited to the files listed above. Before making changes, run a full repository grep for `process.env` and list every file found. Add each discovered file to the actual changed-files list. Do not use this step to refactor, rename, or restructure the services found — only change how the environment variable is read (`process.env.X` → `configService.get('X')`), nothing else about their behavior or logic.

## Key Invariants

- Do not change any business logic in services beyond swapping `process.env.X` reads for `configService.get('X')`.
- Do not touch `HtmlRendererService`, `PipelineModule`, `AppModule` imports beyond adding `ConfigModule`, or any file under `src/document-export/` — unrelated to this task.
- Do not implement PH-002, PH-003, PH-004, or any other Phase PH task in this session — this task is `TASK-PH-001` only, even though it unblocks the others.
- Do not touch Prisma schema.
- Do not add functionality beyond env validation (e.g. do not add new env vars that nothing currently uses).

## Acceptance Criteria

- [ ] `@nestjs/config` and `joi` installed.
- [ ] `ConfigModule.forRoot({ validationSchema: ... })` imported in `AppModule` with a Joi schema covering: `DATABASE_URL` (required), `PORT` (optional, default 3000), `NODE_ENV` (optional), `STORAGE_ROOT` (required), `LOG_LEVEL` (optional, default `info`), `CORS_ORIGIN` (optional), `THROTTLE_TTL` and `THROTTLE_LIMIT` (optional with defaults).
- [ ] App fails to start with a clear error message when a required env var is missing.
- [ ] `ConfigService` injected and used wherever `process.env` was accessed directly (confirm via grep — zero remaining direct `process.env` reads outside `env.validation.ts`/config bootstrap itself).
- [ ] `npm run test` passes.
- [ ] `npx tsc --noEmit` passes.

## Test Requirement

- Unit test for env validation schema: required fields missing → throws; all valid → passes.
- Run `npm run test` before making changes — record baseline count.
- Run `npm run test` again — count must be baseline + new tests, zero failures.
- Run `npx tsc --noEmit` — must pass cleanly.
- Record results in `project-management/TEST_LOG.md`.

## Done Definition

Environment misconfiguration is caught at boot, not at runtime.

## Scope

**Allowed:**

- Install `@nestjs/config` and `joi`.
- Create `src/config/env.validation.ts` with the Joi schema.
- Import `ConfigModule.forRoot(...)` in `AppModule`.
- Replace direct `process.env.X` reads with `ConfigService` injection, wherever found in the codebase, without altering surrounding logic.
- Update `.env.example` to reflect the validated variables.

**Not allowed:**

- Implementing `TASK-PH-002` (helmet/CORS), `TASK-PH-003` (throttler), or any other PH task — even though this task unblocks them, they are separate tasks with their own `CURRENT_TASK.md`.
- Refactoring service logic beyond the `process.env` → `ConfigService` substitution.
- Adding new environment variables not already in use or not listed in the Joi schema above.
- Touching Prisma schema, `HtmlRendererService`, or `src/document-export/`.
- Resuming or touching any Phase 6 task (`TASK-035`, `TASK-036A`, `TASK-036B`, etc.) in this session.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md` and this file fully.
2. Run `grep -rn "process.env" src/` — list every file and line found. This is the authoritative changed-files list for the `ConfigService` substitution, in addition to the files listed above.
3. Run `npm run test` — record baseline count.
4. Make changes strictly within Scope above.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed/created files (including every file found via the `process.env` grep).
3. Show test results (before vs after count).
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-PH-001 can be marked DONE.
6. Stop and wait for user approval before committing.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-PH-001-config-env-validation
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "chore: TASK-PH-001 add @nestjs/config with Joi env validation"
git push -u origin task/TASK-PH-001-config-env-validation
gh pr create --title "chore: TASK-PH-001 env config validation" --body "Unblocks TASK-PH-002, TASK-PH-003, TASK-PH-007. Closes TASK-PH-001" --base main
```

Then stop completely. User handles merge, checkout main and pull.
