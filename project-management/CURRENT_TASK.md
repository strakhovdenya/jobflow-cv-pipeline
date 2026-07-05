# Current Task

## Task ID

`TASK-PH-002` — DONE

> Source: docs/07_task_backlog.md §PH. Phase PH — Production Hardening (Quick Wins). Runs after TASK-PH-001 (DONE), in parallel track with PH-003/PH-004 per TASK_BOARD.md Current Focus.

## Title

Add security headers: helmet + CORS

## Context

The app currently sends no security headers. Without `helmet`, browsers receive no Content-Security-Policy, no X-Frame-Options and no X-Content-Type-Options, leaving the API vulnerable to XSS and clickjacking. CORS is unconfigured, blocking any future frontend. Both are two-line fixes in `main.ts`. Depends on PH-001 (done) for `CORS_ORIGIN` config via `ConfigService`.

## Docs to Read

- `docs/07_task_backlog.md` §PH — TASK-PH-002 full definition (this task)
- `src/main.ts` — current bootstrap

## Files Likely Affected

```text
package.json
src/main.ts
```

## Key Invariants

- Do not implement PH-003, PH-004, or any other Phase PH task in this session — this task is TASK-PH-002 only.
- Do not touch `HtmlRendererService`, `PipelineModule`, or any file under `src/document-export/`.
- Do not touch Prisma schema.
- Do not resume Phase 6 or later tasks in this session.
- Do not add functionality beyond helmet + CORS wiring.

## Acceptance Criteria

- [ ] `helmet` installed and applied: `app.use(helmet())` in `main.ts`.
- [ ] `app.enableCors({ origin: configService.get('CORS_ORIGIN') ?? '*' })` enabled.
- [ ] Response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`.
- [ ] No existing tests broken; `npx tsc --noEmit` passes.

## Test Requirement

- Manual curl check: `curl -I http://localhost:3000/health` shows security headers.
- Record result in `project-management/TEST_LOG.md`.

## Done Definition

API responses include baseline OWASP security headers.

## Scope

**Allowed:**

- Install `helmet`.
- Wire `app.use(helmet())` and `app.enableCors(...)` in `src/main.ts` using `ConfigService`.

**Not allowed:**

- Implementing TASK-PH-003, TASK-PH-004, or any other PH task.
- Refactoring unrelated bootstrap logic.
- Touching Prisma schema, `HtmlRendererService`, or `src/document-export/`.
- Resuming or touching any Phase 6 task in this session.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md` and this file fully.
2. Run `npm run test` — record baseline count.
3. Make changes strictly within Scope above.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed/created files.
3. Show test results (before vs after count) and curl header check.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-PH-002 can be marked DONE.
6. Stop and wait for user approval before committing.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-PH-002-helmet-cors
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "chore: TASK-PH-002 add helmet and CORS"
git push -u origin task/TASK-PH-002-helmet-cors
gh pr create --title "chore: TASK-PH-002 security headers" --body "Adds helmet + CORS. Closes TASK-PH-002" --base main
```

Then stop completely. User handles merge, checkout main and pull.
