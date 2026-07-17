# Current Task

## TASK-055 — Bootstrap Next.js dashboard

User-selected 2026-07-16 (Phase 13 — Frontend Dashboard).

## Status

DONE (closed 2026-07-17).

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

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-055 ..."`
3. `git push -u origin task/TASK-055-bootstrap-nextjs-dashboard`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
