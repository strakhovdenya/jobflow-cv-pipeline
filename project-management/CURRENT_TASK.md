# Current Task

## TASK-PH-024 — Block merges on high+ severity CodeQL/Dependabot alerts

User-selected 2026-07-18, direct follow-up to TASK-PH-023 — after that task's review, user asked
"how do I configure CI so it actually doesn't let [PRs with alerts] through", since it turned out
the plain `Analyze (javascript-typescript)` CodeQL status check only reports whether the job ran,
not whether it found anything, and no equivalent gate existed for Dependabot.

## Status

DONE (closed 2026-07-18).

## Context

Two gates added, one native, one custom, both required for merging to `main`:

1. **CodeQL** — GitHub Ruleset `require-codeql-high-or-higher` (`target: branch`, `main`, rule
   type `code_scanning`, `security_alerts_threshold: high_or_higher`, `alerts_threshold: none` so
   only security-rated findings gate, not generic code-quality ones). Native GitHub feature, no
   custom code. `enforcement: active`.
2. **Dependabot** — no native ruleset equivalent exists for Dependabot alerts, so a new
   `Dependabot Severity Gate` CI job was added to `.github/workflows/ci.yml`, querying the
   Dependabot Alerts API for open `high`/`critical` severity alerts and failing if any exist.

**Real blocker found and fixed:** the first implementation used `GITHUB_TOKEN` with
`permissions: security-events: read`. A real CI run on PR #109 failed in 4s: `gh: Resource not
accessible by integration (HTTP 403)`. Confirmed via job logs that `GITHUB_TOKEN` cannot read the
Dependabot Alerts API regardless of the `permissions:` block declared — this endpoint requires a
PAT (classic `security_events` scope, or fine-grained "Dependabot alerts: Read-only"). The job was
immediately removed from required status checks to avoid permanently blocking all future merges on
a gate that could never pass. The user created a fine-grained PAT scoped to this repo only
("Dependabot alerts: Read-only"), added directly as repo secret `DEPENDABOT_ALERTS_TOKEN` (token
value never shared in chat). The job was updated to read `GH_TOKEN:
${{ secrets.DEPENDABOT_ALERTS_TOKEN }}`, re-verified passing for real (`gh run rerun --failed` +
raw job logs confirmed it queried the API and got `Open high/critical Dependabot alerts: 0`, not a
silently-skipped step), and only then re-added to required status checks.

## Docs to Read

- `.github/workflows/ci.yml` — existing job structure/`working-directory: apps/api` pattern
  (ADR-023) the new job follows for naming consistency.
- GitHub branch protection settings (`/settings/branches`) and Rulesets (`/settings/rules`) for
  `main` — live required-checks state.

## Key Invariants

- No application source code changes — this task is CI/branch-protection configuration only.
- `DEPENDABOT_ALERTS_TOKEN` must stay a repo secret, scoped to this repo only, "Dependabot alerts:
  Read-only" — never broaden its scope as part of an unrelated task.
- A newly-added required status check must be verified passing via a real run before being added
  to `required_status_checks` — a required check that can never pass permanently blocks all future
  merges (this is exactly what happened once during this task and was caught/reverted quickly).

## State Machine

N/A — no workspace status or backend state changes.

## Acceptance Criteria

- [x] GitHub Ruleset requires CodeQL results at `high_or_higher` severity for merges to `main`.
- [x] New `Dependabot Severity Gate` CI job fails the build on open High/Critical Dependabot
      alerts; registered as a required status check.
- [x] Both gates verified working via a real PR run (`gh pr checks 109` all green) before being
      relied upon.
- [x] `project-management/TASK_BOARD.md` row added, `DONE`, PR/commit filled, `Current Focus`
      updated.
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "ci: TASK-PH-024 ..."`
3. `git push -u origin task/TASK-PH-024-block-security-alerts-in-ci`
4. `gh pr create --title "..." --body "..." --base main` (already done — PR #109)
5. Stops completely. Does not do anything else.

## Context

Backlog entry (`docs/07_task_backlog.md` TASK-055) required: "Next.js app starts locally", "It can
call backend health endpoint", "No complex auth required", with test requirement "Basic render test
or manual smoke test" and done definition "Dashboard foundation exists without changing backend
contracts."

Implementation choices confirmed with user before starting: Tailwind CSS (via `create-next-app`
default), manual smoke test only (no new test runner added — Next.js ships none by default), and
`apps/web` as a fully independent npm project (own `package.json`/`node_modules`/lockfile, not an
npm workspace) to keep zero risk to the existing backend's scripts/CI.

`apps/web/src/lib/api.ts` (`getHealth()`) calls the existing, unchanged backend `GET /health`
endpoint via `NEXT_PUBLIC_API_BASE_URL` (`apps/web/.env.local.example`, defaults to
`http://localhost:3000`). The home page renders live backend status ("Backend status: ok" /
"unreachable").

**Unplanned but necessary fix discovered during implementation:** the root `tsconfig.json` had no
`exclude`, and the root `npm run lint` script's glob (`{src,apps,libs,test}/**/*.ts`) contained an
`apps` pattern that was leftover Nest-CLI multi-app boilerplate, never previously populated. Once
`apps/web/**` existed, both the backend's `tsc --noEmit`/watch mode and root `npm run lint` started
picking up the new Next.js/JSX files and erroring. Fixed by adding `apps` to
`tsconfig.json`/`tsconfig.build.json`'s `exclude` (the two `exclude` arrays don't merge across
`extends`, so both needed the entry) and dropping `apps` from the root lint glob in `package.json`.
Verified backend `npm run test` (59/59 suites, 637/637 tests), `npx tsc --noEmit` and `npm run lint`
all remained clean/unaffected after the fix.

**Follow-up restructuring (same task, second commit, 2026-07-17):** after the first commit, the
user raised a valid concern — `apps/web` was bootstrapped as a subdirectory of what was, at the
time, the backend's own repository root, making the two apps structurally asymmetric (frontend
nested inside backend) despite being conceptually peers. User confirmed: do the restructuring now,
as a second commit on this same branch/task, rather than deferring to a new task. See **ADR-023**
for the full decision record. Summary: the backend moved from the repo root to `apps/api/`, a peer
of `apps/web/`, fully self-contained (own `package.json`/`node_modules`/lockfile/`tsconfig`/
`Dockerfile`). The repo root now holds only shared concerns (`docs/`, `project-management/`,
`README.md`, `CLAUDE.md`, `.github/`, `docker-compose.yml`) plus a minimal root `package.json`
solely for `husky`+`lint-staged` (the Git pre-commit hook now routes staged files to each app's
own local `eslint`/`prettier` binaries by path). `docker-compose.yml` stayed at root and was
updated to build `./apps/api` and use `./apps/api/.env`; it also gained its own small root-level
`.env`/`.env.example` (Postgres/Redis/port vars only) for Compose's own variable substitution,
separate from `apps/api/.env`'s full app runtime config. `.github/workflows/ci.yml` gained
`working-directory: apps/api` on every backend job and corrected `hashFiles`/coverage/docker-build
paths. `.claude/settings.json`'s PostToolUse hooks (`scripts/lint-hook.js`, new
`scripts/typecheck-hook.js`) were rewritten to detect which app an edited file belongs to and run
that app's own local `eslint`/`tsc`. `CLAUDE.md` and `README.md` were updated for the new layout
and commands.

## Docs to Read

- `docs/07_task_backlog.md` TASK-055 entry (verbatim AC, files-affected, done definition).
- `src/app.controller.ts` — existing `GET /health` endpoint (`{ status: 'ok' }`), unchanged.
- `src/main.ts` — confirms CORS already enabled (`app.enableCors`), no backend change needed for
  cross-origin frontend calls.

## Key Invariants

- No backend contract changes — `GET /health` is read-only and unchanged.
- `apps/web` is a fully independent npm project; root `npm install`/`npm run *` scripts must remain
  unaffected (verified: root test/lint/tsc all green after the `tsconfig`/lint glob fix).

## State Machine

N/A — no workspace status or backend state changes.

## Acceptance Criteria

- [x] `apps/web/` — Next.js 16 app (App Router, TypeScript, Tailwind CSS), starts locally
      (`npm run dev`).
- [x] `apps/web/src/lib/api.ts` — `getHealth()` calls backend `GET /health`; home page renders the
      live result.
- [x] No complex auth — no auth added.
- [x] No backend contract changes (`src/app.controller.ts` untouched).
- [x] Manual smoke test: real backend (`npm run start:dev`) + real frontend (`npm run dev` in
      `apps/web`) — page showed "Backend status: ok" end-to-end.
- [x] `apps/web` `npm run lint` / `npx tsc --noEmit` / `npm run build` all clean.
- [x] Root backend `npm run test` / `npx tsc --noEmit` / `npm run lint` all clean and unaffected
      (59/59 suites, 637/637 tests).
- [x] `project-management/TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus`
      updated (recommend next task).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

### Restructuring follow-up (second commit)

- [x] Backend moved from repo root to `apps/api/` via `git mv` (history preserved); `apps/web/`
      unchanged in place.
- [x] `apps/api/tsconfig.json`/`tsconfig.build.json` no longer need the `apps` exclude entry
      (removed — no longer relevant now that the backend isn't repo root).
- [x] `apps/api/package.json` — `husky`/`lint-staged` devDependencies and config removed (moved to
      root); package renamed `api`.
- [x] Root `package.json` — minimal, holds only `husky`+`lint-staged`; `lint-staged` routes
      `apps/api/**/*.ts` and `apps/web/src/**/*.{ts,tsx}` to each app's own local eslint/prettier.
- [x] `docker-compose.yml` — `build: ./apps/api`, `env_file: ./apps/api/.env`; `docker compose
      config` resolves cleanly with no blank-variable warnings.
- [x] Root `.env`/`.env.example` added (Postgres/Redis/port vars only, for Compose substitution).
- [x] `.github/workflows/ci.yml` — `working-directory: apps/api` added to all backend jobs;
      `hashFiles`, Codecov `files:`, and docker build context paths corrected.
- [x] `scripts/lint-hook.js` + new `scripts/typecheck-hook.js` — detect app by file path, run that
      app's own local eslint/tsc; `.claude/settings.json` updated to call the new typecheck hook.
- [x] `CLAUDE.md`, `README.md` updated for the new repository layout and commands.
- [x] `ADR-023` added to `project-management/DECISIONS.md`.
- [x] Post-move verification: `apps/api` `npx tsc --noEmit`/`npm run lint`/`npm run test` (59/59
      suites, 637/637 tests)/`npm run test:e2e` (3/3 suites, 4/4 tests)/`npm run build` all clean;
      root `npx lint-staged` verified against real staged files from the move; manual smoke test
      (real backend + real frontend from their new locations) confirmed "Backend status: ok".

### Docker follow-up (third commit, ADR-024)

User asked whether `apps/web` should be added to Docker; initial recommendation was to defer it
(no existing `Dockerfile`, backend-first priority, frontend still minimal). User then explicitly
requested it be done immediately ("добавляй сейчас").

- [x] `apps/web/Dockerfile` — 3-stage (`deps`/`builder`/`runner`), `node:20-alpine`, uses Next.js
      `output: "standalone"` (`apps/web/next.config.ts`) for a minimal runtime image.
- [x] `docker-compose.yml` — new `web` service, `depends_on: app`, `${WEB_PORT:-3001}:3000`;
      `NEXT_PUBLIC_API_BASE_URL` passed as a build arg (`http://app:3000` default) since Next.js
      inlines `NEXT_PUBLIC_*` vars at build time, not runtime.
- [x] Root `.env`/`.env.example` — `WEB_PORT` added.
- [x] Found + fixed real bug: standalone `server.js` bound to the container's own network IP
      (not `0.0.0.0`) because it honors Docker's auto-set `$HOSTNAME`; host access worked by luck
      (NAT), but in-container `HEALTHCHECK`/`curl localhost` failed. Fixed with
      `ENV HOSTNAME="0.0.0.0"` in the runner stage.
- [x] Verified: `docker compose config` resolves the `web` service correctly; `docker compose
      build web` succeeds; `docker compose up -d web` (with `app`) → `docker compose ps` shows
      `jobflow_web` `(healthy)`; `docker exec jobflow_web curl localhost:3000/` succeeds; host
      `curl http://localhost:3001` still renders "Backend status: ok" against the real
      containerized backend. Containers stopped after verification (`docker compose stop app web`).
- [x] `README.md`/`CLAUDE.md` updated with the new Docker topology/commands.
- [x] `ADR-024` added to `project-management/DECISIONS.md`.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-055 ..."`
3. `git push -u origin task/TASK-055-bootstrap-nextjs-dashboard`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
