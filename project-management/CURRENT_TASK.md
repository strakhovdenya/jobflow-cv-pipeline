# Current Task

## Status

Active: TASK-PH-015 — Remediate devDependency-only Dependabot alerts
(@nestjs/cli build-tooling chain).

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-015 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `package.json` — current `@nestjs/cli`/`@nestjs/schematics` devDependency
  pins

## Investigation (done before implementation)

- GitHub Dependabot alerts tab shows 7 open alerts. `npm audit --json`
  confirms: 1 is `@nestjs/core` (moderate, direct prod dependency) — the
  same alert already investigated and accepted as risk in TASK-PH-013
  (no fix without NestJS v10->v11 major bump; already documented in
  `TEST_LOG.md`). The other 6 (`glob` high, `tmp` high+low, `picomatch`
  moderate+high, `webpack` low x2) are all transitive devDependencies
  pulled in via `@nestjs/cli` -> `@angular-devkit/*` build tooling —
  confirmed not in the production graph (`npm audit --omit=dev` is
  unaffected). `@nestjs/cli` latest is `11.0.24` (with
  `@nestjs/schematics` `11.1.0`), which pulls patched versions of all 6.

## Scope Decision

- Bump only `@nestjs/cli` (`^10.0.0` -> `^11.0.24`) and
  `@nestjs/schematics` (`^10.0.0` -> `^11.1.0`) — devDependencies only.
- Do not touch `@nestjs/core`/`@nestjs/platform-express`/`@nestjs/swagger`/
  `@nestjs/testing` — stay on the v10 line per the risk-acceptance
  decision already recorded in TASK-PH-013. The `@nestjs/core` alert
  remains open/accepted; not in scope here.
- User-confirmed 2026-07-13: proceed with implementation now.

## Key Invariants

- No production runtime dependency changes — CLI/schematics are dev-only
  build tooling, never shipped or executed in production.
- No behavior change to application code.

## Acceptance Criteria

- [x] `@nestjs/cli` upgraded to `^11.0.24`, `@nestjs/schematics` to
      `^11.1.0` in `package.json`/`package-lock.json`.
- [x] `npm audit` shows the 6 devDependency alerts (glob, tmp, picomatch,
      webpack) resolved; `@nestjs/core` moderate alert remains,
      documented as pre-existing accepted risk.
- [x] `npm run test` (47/47 suites, 479/479 tests), `npx tsc --noEmit`,
      `npm run test:e2e` (2/2 suites, 3/3 tests), `npm run build` all
      pass.
- [x] Manual check: `npm run start:dev` boots the app successfully.
- [x] `project-management/TEST_LOG.md` updated with before/after
      `npm audit` output.
- [ ] GitHub Dependabot alerts tab confirms the 6 alerts closed
      post-merge. (Pending — verified after PR merges to `main`.)

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-015 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
