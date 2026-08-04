# Current Task

## TASK-092 — Close 6 new Dependabot alerts surfaced by TASK-090's next@16.3.0 bump (undici, postcss)

### Context

TASK-090 (merged via PR #160, 2026-08-04) bumped `apps/web`'s `next` to 16.3.0 to close 13 open
Dependabot security alerts. A post-merge re-check confirmed all 13 fixed, but surfaced 6 new
alerts not open before the merge — all in `apps/web/package-lock.json`, almost certainly
transitive dependencies pulled in by `next@16.3.0` itself:

```text
high:   #49  undici: cross-user information disclosure and parse-time crash via degenerate
             private cache directives (vulnerable >=7.0.0 <7.29.0, first patched 7.29.0)
medium: #50  undici: downstream response desynchronization via retry interceptor
medium: #51  undici: cookie attribute injection via unsanitized domain and unparsed setCookie
medium: #52  undici: cross-user information disclosure via whitespace around equals in
             Cache-Control directives
medium: #53  undici: CRLF Injection via blob-like body 'type' property
medium: #48  postcss: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled
             sourceMappingURL reads arbitrary .map files when `from` is unset
             (vulnerable <=8.5.22, first patched 8.5.23)
```

Live re-check at task start (2026-08-04) confirmed all 6 still open, and two open/mergeable
Dependabot PRs already exist for them: **PR #161** (`undici` 7.28.0 -> 7.29.0) and **PR #162**
(`postcss` 8.5.19 -> 8.5.25).

`npm ls undici postcss` in `apps/web` shows:
- `postcss` is already deduped to a single resolved version (8.5.19), pulled in via
  `@tailwindcss/postcss` (which has an `overridden` marker), `@vitejs/plugin-react` -> `vite`, and
  `next` itself.
- `undici` comes from `jsdom` (a dev dependency, used by `vitest`/testing only) at 7.28.0.

This suggests the fix may be simpler than TASK-090's (which needed manual `overrides` entries for
`apps/api`'s `ip-address`/`fast-uri`) — likely a version bump via `overrides` or accepting the
Dependabot PRs' own lockfile diff, but confirm before assuming.

**Related, out of scope:** TASK-093 (new backlog entry, `docs/07_task_backlog.md`) files the
~15 other open Dependabot PRs (react/react-dom bumps #163/#164, plus older tooling/CI-action PRs
#55–#146) discovered while scoping this task. None of them are tied to an open security alert, so
they are deliberately not touched here.

### Files Affected

```text
apps/web/package-lock.json   (undici, postcss transitive resolutions)
apps/web/package.json        (only if an override entry turns out to be needed, mirroring
                              TASK-090's apps/api overrides.ip-address pattern)
```

### Docs to Read

- `apps/web/CLAUDE.md` — dependency/build/test/lint commands for this app.
- PR #161 and #162 themselves (`gh pr view 161`, `gh pr view 162`) — check whether merging/
  rebasing them is sufficient, or whether an existing pinned version elsewhere needs a manual
  bump too (same pattern TASK-090 hit with `apps/api`'s `fast-uri`).
- `apps/web/package-lock.json` — confirm resolution paths with `npm ls undici postcss` before
  assuming a simple top-level bump covers all 6 alerts (5 separate `undici` alert instances
  suggests multiple resolution paths worth double-checking after the fix).

### Key Invariants

- This is a production-dependency security fix (the `postcss`/`undici` alerts), not a feature
  change — `undici` itself is a dev-only transitive dependency (via `jsdom`/`vitest`), but the
  alert still needs closing since Dependabot flags it regardless of dev/prod split.
- Same post-merge verification caveat as TASK-090: Dependabot alerts only reflect the default
  branch's last scan, so final closure can only be confirmed after this task's own PR merges.
- TASK-093 (other open Dependabot PRs) is explicitly out of scope for this task.

### Acceptance Criteria

- [ ] All 6 alerts (#48–#53) resolve to `fixed` via a live post-merge `gh api` re-check. **Pending
      until this task's PR merges** — same post-merge-only caveat as TASK-090; to be confirmed and
      checked off in a follow-up doc commit after merge.
- [x] `apps/web`: `npm audit --omit=dev --audit-level=high` exits 0.
- [x] `apps/web` builds and its full test suite passes unchanged.
- [x] Manual smoke test recorded in `TEST_LOG.md`.

### Test Requirement

- Existing `apps/web` test suite (`npm run test:cov`) passes unchanged.
- Manual smoke test recorded in `project-management/TEST_LOG.md`.

### Done Definition

- All 6 originally-open alerts confirmed `fixed` via a post-merge live API re-query, `apps/web`
  `npm audit --omit=dev --audit-level=high` clean, build/tests/manual smoke test all pass.

### Progress Notes

Confirmed simpler than TASK-090's fix: neither an `overrides` entry nor merging PR #161/#162
directly was needed. `npm update postcss undici` in `apps/web` resolved both within their
*already-existing* semver ranges — `overrides.postcss: "^8.5.10"` already permitted 8.5.25, and
`jsdom`'s own declared `undici: "^7.25.0"` already permitted 7.29.0. Only `package-lock.json`
changed; `package.json` was untouched.

### Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-092 ..."`
3. `git push -u origin task/TASK-092-dependabot-postcss-undici`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Does not do anything else — TASK-093 stays a backlog entry, not something to
   start automatically.
