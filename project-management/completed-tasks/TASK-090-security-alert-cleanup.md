# Current Task

**TASK-090 — Close open Dependabot security alerts (apps/web next+sharp, apps/api ip-address+fast-uri)**

Branch: `task/TASK-090-security-alert-cleanup` (off `main`, per ADR-014 — unrelated to the
TASK-073 epic, which still has its own final PR from `task/TASK-073-redesign-base` into `main`
pending separately, awaiting explicit user go-ahead).

## Context

Originally scoped in `docs/07_task_backlog.md` (~line 5151) as an `apps/web`-only task (next +
sharp). Re-checked live via `gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts
--paginate -q '.[] | select(.state=="open")'` on 2026-08-04 and found exactly 13 open alerts,
matching the backlog's list with no new surprises (a `brace-expansion` DoS `npm audit` also
surfaces is `auto_dismissed`, not an open alert — out of scope). Scope expanded same-day to also
cover `apps/api`'s 3 open alerts, since they are the same class of problem (open Dependabot
security alert with an available fix) and were sitting unaddressed:

- `apps/web/package-lock.json`:
  - `next@16.2.10` — alerts #28–#36 (5 high, 4 medium): SSRF (Server Actions on custom servers,
    rewrites via attacker-controlled hostname), middleware/proxy bypass (Turbopack + single
    locale), DoS (Server Actions in App Router, Image Optimization API using SVGs), unauthenticated
    Server Function endpoint disclosure, cache confusion (2 variants), unbounded Server Action
    payload in Edge runtime.
  - `sharp` (transitive, Next's own `optionalDependency`, not in `apps/web/package.json`) — alert
    #27 (high): inherited libvips CVEs (CVE-2026-33327/28, CVE-2026-35590/91).
- `apps/api/package-lock.json`:
  - `ip-address@10.2.0` (transitive via `puppeteer` → `proxy-agent` → `socks-proxy-agent` →
    `socks`) — alerts #40/#41 (medium): CIDR-suffix special-use-classification bypass, IPv4-mapped/
    NAT64 misclassification — both SSRF/trust-boundary bypasses. Dependabot PR #159 (bump to
    10.4.0) already open and mergeable.
  - `fast-uri@4.1.1` (transitive via `@nestjs/cli` → `@angular-devkit/core` → `ajv`, currently
    dev-only) — alert #39 (high): host confusion via backslash authority introducer. **Not a
    missing bump** — `apps/api/package.json`'s own `overrides` block already pins
    `"fast-uri": "^4.1.1"`, which is exactly the vulnerable range (`>= 4.0.0, < 4.1.2`); first
    patched version is `4.1.2`.

**Backlog assumption corrected:** the backlog guessed the `apps/web` fix target was `next@16.2.12`
(from an earlier `npm audit fix --force` run). Re-verified 2026-08-04: `16.2.12` is a docs/TS7-
compat patch release with no security content; the actual fix for all 9 open Next.js advisories
landed in `16.2.11`. Target bumped further to `16.3.0` (current stable, released 2026-08-03)
because it also carries `sharp: ^0.35.3` as its own `optionalDependency` requirement — resolving
the `sharp` alert (#27) for free without a separate manual override, since `apps/web` never
declares `sharp` directly. Checked `16.3.0`'s own release notes: no breaking changes affecting App
Router, Server Actions, Turbopack, or Image Optimization; this app has no `middleware.ts`, no
i18n/locale config, and no custom `rewrites()` in `next.config.ts` — the exact features named in
the highest-severity advisories — which lowers upgrade risk further.

## Files Affected

```text
apps/web/package.json            (next: "16.2.10" -> "16.3.0")
apps/web/package-lock.json
apps/api/package.json            (overrides.fast-uri: "^4.1.1" -> "^4.1.2")
apps/api/package-lock.json       (also picks up ip-address 10.2.0 -> 10.4.0 via PR #159 merge/rebase)
.github/workflows/ci.yml         (remove continue-on-error: true from apps/web dependabot-gate step)
project-management/TEST_LOG.md
project-management/TASK_BOARD.md
project-management/completed-tasks/TASK-090-security-alert-cleanup.md (created at closure)
```

## Docs to Read

- `docs/07_task_backlog.md` TASK-090 entry (~line 5151–5235) — original scope, Files Affected,
  Acceptance Criteria, Done Definition.
- `apps/web/next.config.ts` — confirmed no middleware/i18n/rewrites interaction with the upgrade.
- `apps/api/package.json` lines 53–60 — existing `overrides` block, where `fast-uri` is already
  pinned (just needs its version bumped).
- Next.js release notes for `16.2.11`/`16.2.12`/`16.3.0` (already fetched this session — summary
  above; re-fetch only if verifying an unexpected build/test failure after the bump).
- `.github/workflows/ci.yml` — locate the `dependabot-gate` job's `apps/web` step and its
  `continue-on-error: true` line.

## Key Invariants

- This is a production-dependency security fix, not a feature change — no unrelated Next.js
  upgrade "nice to haves".
- Do NOT bundle the other open, non-security Dependabot PRs (lint-staged #146, next 16.2.11 #137
  — superseded by this task's direct 16.3.0 bump, typescript 7.0.2 #106/#105, @types/supertest
  #104, helmet #103, @types/node #102, jest #101, react/react-dom #100/#99,
  @typescript-eslint/parser #98, eslint 10 #97, GitHub Actions bumps #95/#94/#58/#56/#55) into this
  task.
- `fast-uri` is `dev: true` in `apps/api/package-lock.json` (pulled in only via `@nestjs/cli`'s
  toolchain) — `npm audit --omit=dev --audit-level=high` will NOT surface it even when vulnerable.
  Verifying its fix requires either a plain `npm audit --audit-level=high` (no `--omit=dev`) or the
  live GitHub Dependabot alert #39 closing post-merge.
- Dependabot alerts only reflect the **default branch's** last scan — closure of #27–#41 can only
  be confirmed by re-querying the API *after* this task's PR merges to `main`, not before. This is
  documented as a known limitation, not a pre-merge gate.

## Acceptance Criteria

- [x] `apps/web/package.json`'s `next` bumped to `16.3.0`; `apps/web` lockfile shows `sharp`
      resolving to `>=0.35.3`.
- [x] `apps/api/package.json`'s `overrides.fast-uri` bumped to `^4.1.2` (or higher, still `<5`).
- [x] `apps/api`'s `ip-address` resolves to `>=10.4.0` (via merging/rebasing PR #159, or an
      equivalent manual bump if that's simpler).
- [x] `apps/web`: `npm audit --omit=dev --audit-level=high` exits 0.
- [x] `apps/api`: `npm audit --audit-level=high` (no `--omit=dev`, per the fast-uri invariant
      above) exits 0.
- [x] `apps/web` builds (`npm run build`) and its full test suite (`npm run test:cov`) passes
      unchanged.
- [x] `apps/api`'s full test suite (`npm run test`) and e2e suite (`npm run test:e2e`) pass
      unchanged.
- [x] Both apps: `tsc --noEmit` and `lint` clean.
- [x] Manual smoke test: real `apps/web` dev server serves at least one real page correctly
      post-bump.
- [x] `.github/workflows/ci.yml`'s `dependabot-gate` job's `apps/web` step no longer has
      `continue-on-error: true`.
- [x] Post-merge: `gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts --paginate -q
      '.[] | select(.state=="open")'` no longer lists alerts #27–#36 or #39–#41. **Confirmed
      2026-08-04** after PR #160 merged (merge commit `cda1bc3`) — all 13 alerts individually
      queried via `gh api .../dependabot/alerts/<n>` and each returned `state: fixed`. This box was
      left `[ ]` at merge time as an explicit, signed-off exception to CLAUDE.md's Task Closure
      Checklist "hard gate" wording (structurally unverifiable pre-merge — the exact chicken-and-egg
      problem this task exists to fix), raised by a same-session `/code-review` pass; now closed
      out for real. Same post-merge check also surfaced 6 *new* alerts (#48 postcss, #49–#53
      undici) not present before this merge — almost certainly transitive dependencies of the
      `next@16.3.0` bump itself. Not fixed inline (task was already merged); filed as **TASK-092**
      in `docs/07_task_backlog.md` instead, per "work on one task at a time" — both already have
      open Dependabot PRs (#161, #162).

## Progress Notes

A same-session `/code-review` (run against the uncommitted working diff, before any commit) found
all dependency/CI/doc changes technically correct and verified them independently (audits clean,
`tsc --noEmit` clean, no scope creep into excluded Dependabot PRs, `next@16.3.0` confirmed a real
published stable release). It flagged one procedural issue: closing this task `DONE` while the
post-merge alert-recheck AC above is left `[ ]` conflicts with CLAUDE.md's Task Closure Checklist
"hard gate" wording. Resolved by explicit project-owner sign-off (2026-08-04) treating this as an
accepted, documented, one-time exception rather than restructuring the AC out of this task — see
that AC's own note above.

## Test Requirement

- `apps/web`: `npm run test:cov` full suite passes unchanged; manual dev-server smoke test recorded
  in `TEST_LOG.md`.
- `apps/api`: `npm run test` (unit) and `npm run test:e2e` pass unchanged.
- No new tests are required — this is a dependency-version bump, not new logic.

## Done Definition

- `apps/web` runs `next@16.3.0` with `sharp>=0.35.3`, zero open high/critical `npm audit` findings
  in production dependencies, verified by `npm audit` and a real manual smoke test.
- `apps/api` has `fast-uri>=4.1.2` and `ip-address>=10.4.0`, zero open high findings via
  `npm audit --audit-level=high`.
- CI's `dependabot-gate` gate for `apps/web` is blocking again (no `continue-on-error`).
- All originally-open alerts #27–#36 and #39–#41 confirmed closed via a post-merge live API
  re-query.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-090 ..."`
3. `git push -u origin task/TASK-090-security-alert-cleanup`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Does not do anything else.
