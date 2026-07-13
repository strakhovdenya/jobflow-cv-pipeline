# Current Task

## Status

Active task: TASK-PH-013 — Remediate Dependabot-reported dependency
vulnerabilities (7 high-severity: `multer`, `lodash`, transitive via
`@nestjs/platform-express`/`@nestjs/swagger`).

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-013 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `package.json` — current `@nestjs/*` dependency versions (all `^10.0.0`,
  `@nestjs/swagger@^7.4.2`)

## Investigation (done before implementation)

- `npm audit --omit=dev` (baseline): 11 production-path vulnerabilities,
  all transitive — `multer` (high, via `@nestjs/platform-express@10.4.22`,
  which pins exact `multer: 2.0.2`), `lodash` (high, via
  `@nestjs/swagger@7.4.2`, which pins exact `lodash: 4.17.21`), plus
  `qs`/`file-type`/`js-yaml` (moderate).
- `npm audit fix` (no `--force`) offers nothing; `npm audit fix --force`
  only offers the NestJS v10→v11 major-version path
  (`@nestjs/swagger@11.4.5`, `@nestjs/platform-express@11.1.28`) — a
  breaking-change upgrade.
- Patched versions exist on the *same major line* already in the tree:
  `lodash@4.18.1` (already used elsewhere in the dependency tree, e.g.
  `@nestjs/config`) and `multer@2.2.0`. This suggests a narrower fix via
  `package.json` `"overrides"` forcing these versions across the tree,
  without bumping the NestJS major version.

## Scope Decision

- Try the narrower `"overrides"` fix first (pin `lodash` → `^4.18.1`,
  `multer` → `^2.2.0`). Only escalate to the NestJS v10→v11 major upgrade
  if overrides cause install conflicts or test failures — and if that
  happens, stop and re-confirm scope with the user before proceeding,
  since that path is materially bigger (breaking Swagger API surface).
- User-confirmed 2026-07-13: proceed with this plan.

## Key Invariants

- Do not touch unrelated code — this is a dependency-version fix, not a
  refactor.
- `npm run test`, `npx tsc --noEmit`, `npm run test:e2e`, `npm run build`
  must all pass after the change.
- Manually re-verify Swagger UI (`/api`, `/api-json`) and the CV PDF
  export flow after the fix — both touch the packages being patched
  (`@nestjs/swagger` serves Swagger UI; `@nestjs/platform-express`
  underlies all HTTP request handling including file-adjacent middleware).

## Acceptance Criteria

- [x] `package.json` has an `"overrides"` entry pinning `lodash` (`^4.18.1`),
      `multer` (`^2.2.0`), `qs` (`^6.15.3`), `file-type` (`^21.3.4`) and
      `js-yaml` (`^4.3.0`) to patched versions on the same major line as
      currently used by `@nestjs/swagger`/`@nestjs/platform-express`.
- [x] `npm audit --omit=dev` shows 0 high-severity vulnerabilities after
      the fix (3 moderate `@nestjs/core` alerts remain open, documented —
      no fix without the NestJS v11 major bump).
- [x] `npm run test` (47/47 suites, 475/475 tests), `npx tsc --noEmit`,
      `npm run test:e2e` (2/2 suites, 3/3 tests), `npm run build` all pass.
- [x] Manual Swagger UI (`/api`, `/api-json`) smoke check passes — 16
      paths returned, title correct.
- [x] Manual CV PDF export flow smoke check passes — full pipeline driven
      via curl, real 110824-byte PDF generated via Puppeteer.
- [x] `npm audit --omit=dev` output before/after recorded in
      `project-management/TEST_LOG.md`.
- [ ] GitHub Dependabot alerts tab shows the high-severity alerts closed
      after merge to `main` (user to confirm post-merge, per TASK-PH-010
      pattern).

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-013 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
