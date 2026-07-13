# Current Task

## Status

Active: TASK-PH-011 — Add minimal API-key authentication guard.

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-011 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `src/main.ts` — current Swagger bootstrap (`.addBearerAuth()` placeholder
  to be replaced) and global pipe/middleware registration order
- `src/app.module.ts` — existing `APP_GUARD` registration pattern
  (`ThrottlerGuard`) to follow for the new `ApiKeyGuard`
- `src/app.controller.ts` — `@SkipThrottle()` decorator usage on
  `GET /health`, as the reference pattern for excluding a route from a
  global guard via `Reflector` metadata
- `src/config/env.validation.ts` — existing Joi schema shape (`required()`
  pattern used by `DATABASE_URL`/`STORAGE_ROOT`)

## Investigation (done before implementation)

- `main.ts` calls `.addBearerAuth()` on the Swagger `DocumentBuilder` but no
  `Guard` anywhere enforces it — every endpoint is currently open.
- `app.module.ts` already registers one global guard (`ThrottlerGuard` via
  `APP_GUARD`) — the new `ApiKeyGuard` follows the same registration
  pattern, added as a second `APP_GUARD` provider (Nest runs multiple
  `APP_GUARD` providers in the order they're registered).
- `GET /health` already has a working precedent for guard exclusion:
  `@SkipThrottle()` (from `@nestjs/throttler`) on `app.controller.ts:12`.
  The new guard will use the same `Reflector`/`SetMetadata` pattern (a
  `@SkipAuth()` decorator) rather than hardcoding a path check, so it stays
  consistent with the existing throttler-skip convention and isn't
  bypassed by future route renames.
- `env.validation.ts` already has the exact required-string-no-default
  pattern needed for `API_KEY` (see `DATABASE_URL`, `STORAGE_ROOT`).

## Scope Decision

- Single shared-secret API key via a custom request header (`X-API-Key`),
  checked by one global `ApiKeyGuard`. No user table, no login flow, no
  JWT/session issuance — this is a single-operator tool (see `CLAUDE.md`
  Project Purpose), not a multi-tenant service.
- `GET /health` stays unauthenticated (container healthchecks/uptime
  monitors cannot supply a key) via a `@SkipAuth()` decorator, not a
  hardcoded path exclusion inside the guard.
- Swagger `DocumentBuilder`'s unused `.addBearerAuth()` is replaced with
  `.addApiKey()` describing the real header.

## Key Invariants

- Every new/changed DTO field and the guard's own behavior does not
  require new endpoints, but if any Swagger annotation changes, ADR-019
  (`@ApiOperation`/`@ApiProperty` on all endpoints) must stay satisfied.
- Guard must throw `UnauthorizedException` (401), not silently pass
  through, on missing or mismatched header.
- `APP_GUARD` registration order must not disable or bypass the existing
  `ThrottlerGuard`.

## Acceptance Criteria

- [ ] `API_KEY` added to `env.validation.ts` as a required string with no
      default (app fails to start if unset — same pattern as
      `DATABASE_URL`/`STORAGE_ROOT`).
- [ ] `ApiKeyGuard` reads `X-API-Key` header and compares it to the
      configured `API_KEY`; throws `UnauthorizedException` on missing or
      mismatched header.
- [ ] Guard applied globally via `APP_GUARD` so all endpoints are
      protected **except** `GET /health` (via `@SkipAuth()`), which stays
      unauthenticated.
- [ ] Swagger `DocumentBuilder` updated to describe the API-key header
      instead of the unused Bearer placeholder.
- [ ] `.env.example` updated with the new required `API_KEY` variable.
- [ ] `npm run test` passes, including new `api-key.guard.spec.ts`;
      `npx tsc --noEmit` passes.
- [ ] Manual curl checks recorded in `TEST_LOG.md`: no header → 401; wrong
      key → 401; correct key → 200; `GET /health` without any key → 200.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-PH-011 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
