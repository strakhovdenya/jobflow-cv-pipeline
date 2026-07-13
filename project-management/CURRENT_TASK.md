# Current Task

## Status

No active task. TASK-PH-009 (Reapply rate limiting onto current main) is
complete — see `TASK_BOARD.md` for closure details and the recommended next
task.

## Docs to Read

- `docs/07_task_backlog.md` lines 2531–2566 (§17.2 — TASK-PH-009 context, files affected, acceptance criteria, test requirement, done definition)
- `src/config/env.validation.ts` lines 1–15 — confirms `THROTTLE_TTL` (default 60) and `THROTTLE_LIMIT` (default 100) already validated since TASK-PH-001
- `src/app.module.ts` — full file; current module list, pattern used for `LoggerModule.forRootAsync` (mirror for `ThrottlerModule.forRootAsync`)
- `src/app.controller.ts` — full file; `GET /health` endpoint to exempt via `@SkipThrottle()`
- `src/main.ts` — full file; bootstrap sequence, confirms no rate-limit-related setup exists yet
- `package.json` — dependency list; confirms `@nestjs/throttler` is not currently installed
- `test/mvp-flow.e2e-spec.ts` — existing e2e pattern (app bootstrap via `Test.createTestingModule`, supertest usage) to mirror for the new throttling e2e test

## Scope Decision

- Health endpoint exemption (user-confirmed, outside literal backlog wording): `GET /health`
  gets `@SkipThrottle()` so Docker healthchecks / uptime monitors are never rate-limited.
  This mirrors the same reasoning TASK-PH-011 will later use to exempt `/health` from the
  API-key guard.
- `ThrottlerModule.forRootAsync` is registered in `AppModule`, reading `THROTTLE_TTL`
  (seconds) and `THROTTLE_LIMIT` (max requests per TTL window) via `ConfigService`.
- `ThrottlerGuard` is registered globally via `APP_GUARD` in `AppModule.providers`.
- New e2e spec (new file under `test/`, not appended to `mvp-flow.e2e-spec.ts` — different
  concern) sends `THROTTLE_LIMIT + 1` requests to a non-exempt endpoint within `THROTTLE_TTL`
  and asserts the final response is `429`.
- `TASK_BOARD.md` TASK-PH-003 row corrected: status stays `BLOCKED` with a note that
  TASK-PH-009 supersedes it with a fresh implementation on current `main` (already
  partially annotated during the 2026-07-13 audit; finalize wording once PH-009 lands).

## Key Invariants

- `THROTTLE_TTL`/`THROTTLE_LIMIT` are already Joi-validated with defaults (60s / 100 req) —
  do not re-add validation, just consume via `ConfigService`.
- Do not touch Swagger, Pino logging, OpenAI provider, Puppeteer or husky/lint-staged config
  — those are why the old TASK-PH-003 branch could not be merged; this task must apply
  cleanly against current `main` as it stands today.
- `/health` must remain reachable for container healthchecks even under heavy polling
  (confirmed scope decision above).

## Acceptance Criteria

- [x] `@nestjs/throttler` installed.
- [x] `ThrottlerModule.forRootAsync(...)` configured using `THROTTLE_TTL`/`THROTTLE_LIMIT`
      from `ConfigService`.
- [x] `ThrottlerGuard` registered globally via `APP_GUARD`.
- [x] Exceeding the configured limit within the TTL window returns `429 Too Many Requests`
      — verified in `test/rate-limiting.e2e-spec.ts`.
- [x] `GET /health` exempted from throttling via `@SkipThrottle()` (scope decision above) —
      verified in the same e2e spec.
- [x] `TASK_BOARD.md` TASK-PH-003 row/notes finalized to record supersession by TASK-PH-009
      (status corrected from `DONE` to `SKIPPED`).
- [x] New e2e test sending `THROTTLE_LIMIT + 1` requests and asserting `429` on the last one.
- [x] `npm run test` passes (47/47 suites, 475/475 tests); `npx tsc --noEmit` passes;
      `npm run test:e2e` passes (2/2 suites, 3/3 tests).

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-PH-009 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
