# Current Task

## Status

Active: TASK-PH-016 — Upgrade NestJS core packages v10 → v11 (close remaining
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

- [ ] `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`,
      `@nestjs/testing` upgraded to latest `^11.x`; `@nestjs/swagger`
      upgraded to paired `^8.x`.
- [ ] `@nestjs/config`/`@nestjs/throttler` bumped only if required by peer
      dependency constraints (checked, not assumed).
- [ ] `"engines": { "node": ">=20" }` added to `package.json`.
- [ ] `npm audit` shows zero open `@nestjs/core` findings (alert #17
      resolved).
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run test:e2e`,
      `npm run build` all pass.
- [ ] Manual check: `npm run start:dev` boots successfully; Swagger UI
      (`GET /api`) renders correctly post-upgrade.
- [ ] `project-management/TEST_LOG.md` updated with before/after
      `npm audit` output and the manual Swagger UI check.
- [ ] GitHub Dependabot alerts tab confirms zero open alerts post-merge.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-016 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
