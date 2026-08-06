# Current Task

## TASK-093 — Triage the remaining open Dependabot PRs (non-security, tooling/deps backlog)

**Status:** DONE (2026-08-06)
**Branch:** `task/TASK-093-dependabot-triage`

**Context:** Discovered 2026-08-04 while scoping TASK-092: `gh pr list --state open` showed ~15
open Dependabot PRs beyond the two TASK-092 covered (#161 undici, #162 postcss). None of these are
tied to an open security alert (unlike TASK-090/TASK-092) — they are routine version-bump PRs that
have simply accumulated unmerged. Re-confirmed live via `gh pr list --state open` on 2026-08-06 —
same 16 PRs, list unchanged since backlog entry was written (two titles show minor further drift:
#97 now 9.39.5→10.8.0, #98 now →8.65.0 — not material to triage grouping):

```text
#164  react-dom + @types/react-dom bump                     (apps/web)
#163  react + @types/react bump                             (apps/web)
#146  lint-staged 16.4.0 -> 17.2.0                           (root)
#106  typescript 5.9.3 -> 7.0.2                              (apps/api, MAJOR)
#105  typescript 5.9.3 -> 7.0.2                              (apps/web, MAJOR)
#104  @types/supertest 6.0.3 -> 7.2.1                        (apps/api)
#103  helmet 8.2.0 -> 8.3.0                                  (apps/api, prod dep)
#102  @types/node 20.19.43 -> 26.1.2                         (apps/web)
#101  jest + @types/jest bump                                (apps/api)
#98   @typescript-eslint/parser 8.62.0 -> 8.65.0              (apps/api)
#97   eslint 9.39.5 -> 10.8.0                                 (apps/web, MAJOR)
#95   actions/setup-node 4 -> 7                               (workflow)
#94   codecov/codecov-action 4 -> 7                           (workflow)
#58   github/codeql-action 3 -> 4.37.4                        (workflow)
#56   actions/checkout 4 -> 7                                 (workflow)
#55   actions/cache 4 -> 6                                    (workflow)
```

**Files likely affected:** `apps/api/package.json`/`package-lock.json`,
`apps/web/package.json`/`package-lock.json`, root `package.json`, `.github/workflows/*.yml` —
scope depends on which PRs are taken on.

**Docs to Read:**

- `gh pr list --state open` (re-run at task start — done, list confirmed above).
- Each PR's own diff/CI status (`gh pr view <n> --json mergeable,statusCheckRollup`) before
  deciding whether to merge as-is, rebase, or defer a given major-version bump.

**Key Invariants:**

- Not a security task — no open Dependabot alert requires any of these. Prioritize accordingly
  relative to product work.
- Major-version bumps (`typescript`, `eslint`, GitHub Actions) may need their own scoped
  investigation rather than a single blanket "merge everything" pass — consider splitting into
  sub-tasks if verification surfaces real breakage.

**Triage plan (risk-ordered groups):**

1. GitHub Actions bumps — workflow files only, lowest risk, CI self-verifies pre-merge: #55, #56,
   #58, #94, #95.
2. Patch/minor dev dependencies — low risk: #103 (prod, minor), #104, #98, #101, #102, #146. Run
   lint/typecheck/test/build of the affected app after merging (can batch same-app bumps into one
   verification pass instead of one per PR).
3. Production dependencies needing real verification: #163, #164 (react/react-dom, apps/web) —
   build + full test suite + manual smoke test.
4. Major bumps — highest risk, may need real code changes or deferral: #105/#106 (typescript
   5.9→7.0, both apps), #97 (eslint 9→10, apps/web). Attempt each, run full verification; if
   breakage is non-trivial, close/defer with a documented reason rather than force-fixing within
   this task's scope.

**Acceptance Criteria:**

- [x] Each PR in the list above explicitly triaged: merged, closed as superseded/unwanted, or
  deferred with a documented reason.
- [x] For every merged PR: affected app's build/lint/typecheck/test suite passes.

**Progress Notes (added at closure, 2026-08-06):**

Actual execution diverged from the plan in three ways surfaced during implementation, all
confirmed with the project owner before proceeding:

1. **#163/#164 (react/react-dom) could not be merged individually.** Each PR alone broke
   `Test (apps/web)` in its own CI — react and react-dom must be on the exact same version
   ("Incompatible React versions" runtime error). Bumped both to 19.2.8 together in one manual
   commit on this branch instead of merging either PR, then closed both as superseded.
2. **#105 (typescript 5→7, apps/web) was merged, found broken, then reverted.** Its own CI was
   green, but that CI never actually lint/typechecks `apps/web` — `Lint`/`Typecheck` jobs only
   ever ran against `apps/api`. Locally, `npm run lint` crashed with `"typescript-eslint does not
   support TS 7.0"`. Reverted via a follow-up commit; #106 (same bump, apps/api) and #97 (eslint
   9→10, apps/web) were found broken by the same underlying cause before merging and deferred
   directly.
3. **CI gap fix added to scope, per explicit project-owner approval.** Discovered `apps/web` had
   zero CI lint/typecheck coverage (only `Test (apps/web)` = `test:cov` existed) — exactly what
   let #105 and #97 show false-green checks. Added `web-lint`/`web-typecheck` jobs to `ci.yml`
   mirroring the existing `apps/api` ones. This is an architecture-adjacent CI change beyond the
   original "triage PRs" scope, explicitly approved in-session rather than deferred to a new task.

Final disposition of all 16 PRs — see the 2026-08-06 `TEST_LOG.md` entry for full detail:
- Merged as-is: #55, #56, #94, #95 (GitHub Actions), #103, #104, #98, #101, #102 (dev deps).
- Merged manually (not via the PR itself): #163, #164 → combined react/react-dom commit.
- Deferred with documented reason (PR comments + this file): #146 (Node engine mismatch), #105
  (merged then reverted), #106, #97 (both never merged — confirmed broken pre-merge).
- Auto-closed by Dependabot itself, incorrectly: #58 (still v3 in `codeql.yml` — left as-is, not
  re-opened, since it doesn't block this task and Dependabot will likely re-surface it).

**Test requirement:**

- Each app's existing test suite passes unchanged after any merged bump.
- Manual smoke test recorded in `project-management/TEST_LOG.md` if any runtime-affecting
  dependency (not just a dev/tooling dep) changed.

**Done definition:**

- No stale open Dependabot PRs remain without an explicit triage decision recorded in this task's
  `CURRENT_TASK.md`/closure notes.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "chore: TASK-093 ..."`
3. `git push -u origin task/TASK-093-dependabot-triage`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.
