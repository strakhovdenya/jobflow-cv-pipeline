# Current Task

## Status

No active task. TASK-PH-016 is complete (DONE, PR #70 merged;
`project-management/TASK_BOARD.md` recommends TASK-PH-011 next, but per
Operating Rules the next task is not started until the user explicitly
selects it).

---

## Completed: TASK-PH-016 — Upgrade NestJS core packages v10 → v11 (close remaining
`@nestjs/core` Dependabot alert #17).

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-016 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `package.json` — current `@nestjs/*` version pins
- `src/main.ts` — Swagger bootstrap (`DocumentBuilder`, `SwaggerModule`)
- `src/app.module.ts` — global enhancers (`APP_GUARD`/`APP_FILTER`/etc.)
- `src/prisma/prisma.service.ts` — lifecycle hooks

## Investigation (done before implementation)

- `gh api repos/:owner/:repo/dependabot/alerts` confirms only 1 open alert:
  `@nestjs/core` #17 (medium/runtime), "Improperly Neutralizes Special
  Elements in Output Used by a Downstream Component (Injection)" — SSE
  `message.type`/`message.id` interpolated into SSE protocol output without
  sanitizing `\r`/`\n`. Affected versions `<=11.1.17`; patched only in
  `11.1.18`. **No patched 10.x release exists** — unlike the TASK-PH-013
  finding, this cannot be resolved by pinning/overrides; it requires the
  major `v10 -> v11` bump.
- Scoping assessment (2026-07-13, recorded in `TEST_LOG.md`):
  - Node runtime (`v20.20.2`), `reflect-metadata` (`^0.2.0`), `rxjs`
    (`^7.8.1`) already satisfy v11 minimums.
  - App is Express-based (`@nestjs/platform-express`) — no Fastify-specific
    v11 breakage applies.
  - No deprecated global-enhancer or lifecycle-hook patterns found in
    `app.module.ts` / `prisma.service.ts`.
  - `main.ts` `app.listen()` (single-arg) and Swagger bootstrap
    (`DocumentBuilder`, `SwaggerModule.createDocument/setup`) use stable
    APIs; `@nestjs/swagger` v7→v8 pairing is required alongside core v11
    but is documented as low-risk (mainstream decorator/API usage only).
  - Estimated risk/size: **medium** — coordinated major bump across
    `@nestjs/core`/`common`/`platform-express`/`testing`/`swagger`
    simultaneously, but minimal expected source-code changes.
- User-confirmed 2026-07-13: proceed with implementation now.

## Key Invariants

- This is a dependency-version task only — no unrelated refactors or new
  features.
- No behavior change to application code; all existing endpoints/DTOs keep
  their current contracts (Swagger-documented per ADR-019).
- Step 4 export must remain non-AI/deterministic (ADR-012) — unaffected by
  this bump, but must not regress during verification.

## Acceptance Criteria

- [x] `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`,
      `@nestjs/testing` upgraded to latest `^11.1.28`; `@nestjs/swagger`
      upgraded to `^11.4.5` (its actual latest — own major line tracks
      Nest's major, not a "v8" pairing as originally scoped).
- [x] `@nestjs/config`/`@nestjs/throttler` checked — not bumped, both
      already declare `@nestjs/common`/`@nestjs/core` `^11.0.0` peer support.
- [x] `"engines": { "node": ">=20" }` added to `package.json`.
- [x] `npm audit` shows zero open `@nestjs/core` findings (0 vulnerabilities
      total).
- [x] `npm run test` (47/47 suites, 479/479 tests), `npx tsc --noEmit`,
      `npm run test:e2e` (2/2 suites, 3/3 tests), `npm run build` all pass.
- [x] Manual check: `npm run start:dev` boots successfully; Swagger UI
      (`GET /api`) renders correctly post-upgrade (`GET /api-json` — valid
      OpenAPI 3.0.0, 16 paths).
- [x] `project-management/TEST_LOG.md` updated with before/after
      `npm audit` output and the manual Swagger UI check.
- [x] GitHub Dependabot alerts tab confirms zero open alerts post-merge.
      (Confirmed 2026-07-13: `gh api repos/:owner/:repo/dependabot/alerts`
      returns 0 open alerts after PR #70 merged.)

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-016 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
