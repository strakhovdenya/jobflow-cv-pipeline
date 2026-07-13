# Current Task

## Status

No active task. TASK-PH-010 (Add security governance files) is complete —
see `TASK_BOARD.md` for closure details and the recommended next task.

## Docs to Read

- `docs/07_task_backlog.md` lines 2568–2596 (§17.2 — TASK-PH-010 context, files affected, acceptance criteria, test requirement, done definition)
- `.github/workflows/ci.yml` — full file; existing workflow conventions (checkout/setup-node versions, branch triggers) to mirror in `codeql.yml`

## Scope Decision

- Vulnerability reporting channel (user-confirmed): GitHub Security
  Advisories (repo Security tab → "Report a vulnerability"), not a direct
  email address in `SECURITY.md`. This requires "Private vulnerability
  reporting" to be enabled in the repo's Settings → Security — a repo
  setting outside this task's file changes; user to confirm/enable after
  push.

## Key Invariants

- No `src/**` files touched — this task is GitHub config/docs only.
- Existing `npm run test` suite must remain green (no regression expected,
  but verified as a sanity check since this is a no-source-change task).

## Acceptance Criteria

- [x] `SECURITY.md` documents supported versions ("latest `main` only") and
      how to report a vulnerability (GitHub Security Advisories).
- [x] `.github/dependabot.yml` configures weekly update checks for `npm`
      and `github-actions` ecosystems.
- [x] `.github/workflows/codeql.yml` runs CodeQL analysis for
      `javascript-typescript` on push/PR to `main` and on a weekly
      schedule, using `github/codeql-action@v3`.
- [x] No source code changes; existing test suite unaffected (`npm run
      test` still green).
- [x] Manual: pushed the branch; CodeQL workflow run (`CodeQL / Analyze
      (javascript-typescript)` + `Code scanning results / CodeQL`) appears
      and completes successfully in the GitHub Actions/PR checks tab ("No
      new alerts in code changed by this pull request"); Dependabot config
      accepted — confirmed via the repo's Dependabot alerts tab actively
      showing 20 open alerts scanned from `package-lock.json`. Confirmed by
      user 2026-07-13.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-PH-010 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
