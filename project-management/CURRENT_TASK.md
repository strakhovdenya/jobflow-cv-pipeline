# Current Task

## TASK-102 — Bump Node.js runtime 20→22 and puppeteer 24→25 to close GHSA-jmr9-qjv8-65gv (extract-zip)

**Context:** Discovered live while opening TASK-100's PR (#187): the repo's required CI check
"Dependabot Severity Gate" (`apps/api — fail on high/critical vulnerabilities (production deps)`)
started failing on a newly-published high-severity advisory,
[GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) (`extract-zip` unvalidated
symlink path traversal, CVSS 8.1). `extract-zip` is a transitive dependency of
`@puppeteer/browsers@<=2.13.2`, itself a dependency of `puppeteer` (used by
`PdfExportService`/`document-export/` for deterministic CV PDF export — ADR-012). Confirmed
unrelated to TASK-100's diff (`git diff main --stat -- apps/api/package.json
apps/api/package-lock.json` on that branch showed zero changes), and confirmed newly surfaced
(CI on `main` last passed this gate on 2026-08-11).

**Why this isn't a small patch:** `extract-zip` has no patched release at all — every published
version up to and including 2.0.1 is flagged (`"range": "*"` in the advisory). `@puppeteer/browsers`
only dropped `extract-zip` starting at `3.0.2` (switched to `modern-tar`). Every `puppeteer` version
that pulls in `@puppeteer/browsers@3.x` is `25.1.0+`, and every one of those requires
**Node.js ≥22.12.0** (`npm view puppeteer@25.7.0 engines` → `{ node: '>=22.12.0' }`). The project
currently runs Node 20 everywhere: `.github/workflows/ci.yml`'s `NODE_VERSION: "20"`, both
`apps/api/Dockerfile` and `apps/web/Dockerfile`'s `node:20-alpine` base images, and
`apps/api/package.json`'s `engines.node: ">=20"`. Closing this advisory therefore requires a
project-wide Node runtime bump, not a dependency-only change.

**Files Affected:**

```text
.github/workflows/ci.yml                    (NODE_VERSION: "20" -> "22")
.github/workflows/codeql.yml                (same, if it pins a node-version)
apps/api/Dockerfile                         (node:20-alpine -> node:22-alpine, builder+runner stages)
apps/web/Dockerfile                         (node:20-alpine -> node:22-alpine, deps+builder+runner stages)
apps/api/package.json                       (engines.node ">=20" -> ">=22.12.0"; puppeteer "^24.43.1" -> "^25.7.0")
apps/api/package-lock.json                  (regenerated via npm install)
apps/web/package.json / package-lock.json   (only if npm install under Node 22 changes anything — apps/web has no direct puppeteer dependency)
```

**Docs to Read:**

- `.github/workflows/ci.yml` — full file, every `node-version: ${{ env.NODE_VERSION }}` reference
  (10 occurrences, all driven by the single `env.NODE_VERSION` var, so one edit point) and the
  `Dependabot Severity Gate` job's exact `npm audit` invocation.
- `apps/api/Dockerfile` and `apps/web/Dockerfile` — full files, every `FROM node:20-alpine` stage
  (ADR-024: `apps/web`'s 3-stage Dockerfile `deps`/`builder`/`runner`; `apps/api`'s has
  `builder`/`runner`).
- `apps/api/package.json` — `engines` field (currently `{ "node": ">=20" }`) and the `puppeteer`
  dependency line.

**Key Invariants:**

- Security/infra task only — do not alter any pipeline logic, schema, or endpoint.
- `PdfExportService`'s Puppeteer usage (`page.pdf()`, launch options) must keep working identically
  after the puppeteer 24→25 bump — verify via the existing real-Puppeteer integration test
  (TASK-036A's `PdfExportService` test uses a real Puppeteer instance, not a mock) and a manual PDF
  export smoke test.
- Both apps' Dockerfiles must be bumped together — `docker-compose.yml` orchestrates both, and a
  Node-version mismatch between `apps/api`/`apps/web` images is an unnecessary inconsistency.
- Do not bump any other dependency's major version as a side effect — if `npm install` pulls in
  unrelated major bumps, stop and ask before accepting them.

**Acceptance Criteria:**

- [x] `npm audit --omit=dev --audit-level=high` in `apps/api` reports 0 high/critical
      vulnerabilities (confirms GHSA-jmr9-qjv8-65gv is resolved).
- [ ] CI's `Dependabot Severity Gate` job passes on this branch. *(pending — verify after push/PR)*
- [x] `.github/workflows/ci.yml`/`codeql.yml`, both Dockerfiles, and `apps/api/package.json`'s
      `engines.node` all consistently target Node 22. (`codeql.yml` had no node-version pin at all —
      confirmed nothing to change there.)
- [x] `apps/api/package.json`'s `puppeteer` is `^25.7.0` (or later 25.x), and `npm ls
      @puppeteer/browsers` shows `3.x`, no longer depending on `extract-zip`.
- [x] Full local verification passes under Node 22 (not just Node 20): `npx tsc --noEmit`, `npm run
      lint`, `npm run test`, `npm run test:e2e`, `npm run build` (both apps), `docker build` for
      both Dockerfiles, `docker compose config`.
- [x] A manual PDF export smoke test (real workspace through to `export-cv`) still produces a valid
      PDF under the new puppeteer version.

**Test Requirement:** No new unit tests — this is a dependency/infra bump with no new application
logic. Existing test suites (including the real-Puppeteer `PdfExportService` integration test) must
pass unmodified under Node 22 and puppeteer 25. Record the full verification command list and
results in `TEST_LOG.md`, including the `npm audit` before/after output.

**Done Definition:** All Acceptance Criteria met; CI green on the PR (including the previously-
failing `Dependabot Severity Gate`); `TEST_LOG.md` entry with evidence; manual PDF export smoke
test recorded.

**Dependencies:** None — independent of EPIC-23 (TASK-100/101). Not bundled into TASK-100's PR
(#187), which is otherwise complete and unrelated to this dependency.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "chore: TASK-102 ..."`
3. `git push -u origin task/TASK-102-node22-puppeteer-upgrade`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.

**Progress Notes (added during implementation, 2026-08-15):**

The plan's Key Invariant "verify via the existing real-Puppeteer integration test... uses a real
Puppeteer instance, not a mock" (TASK-036A's original decision) turned out to be impossible to keep
as-is: `puppeteer@25.x` (the only version line that fixes GHSA-jmr9-qjv8-65gv) ships pure ESM with
no CJS build at all (`"type": "module"`, both `import`/`require` conditions in `package.json`
`exports` point to the same ESM file). Node 22.12+ can `require()` this natively (confirmed:
`node -e "require('puppeteer')"` succeeds, and the compiled app boots and generates real PDFs fine
— see manual smoke test below), but Jest's own CJS module runtime (a separate implementation from
Node's, used only for tests) cannot parse `export * from ...` syntax and fails immediately —
breaking not just the one real-Puppeteer unit test but *every* e2e suite, since `AppModule`
transitively, eagerly imports `PdfExportService` regardless of whether a given e2e spec calls
`export-cv`.

Two changes beyond the original file list were needed to resolve this safely:

1. `apps/api/src/document-export/pdf-export.service.ts`: changed the module-level
   `import puppeteer from 'puppeteer'` to a lazy `await import('puppeteer')` inside
   `htmlFileToPdf()`. This alone fixed 4 of the 6 broken suites (2 unit suites that only
   type-import `PdfExportService` while mocking it, and 2 e2e suites that never call `export-cv`)
   by confining the ESM boundary to only the code path that actually invokes Puppeteer — no Jest
   config changes involved.
2. For the 2 remaining suites that *do* deliberately invoke real Puppeteer
   (`pdf-export.service.spec.ts`, `mvp-flow.e2e-spec.ts`'s `export-cv` step): tried making Jest
   transform puppeteer's ESM tree via `transformIgnorePatterns` + `allowJs` — this cleared the
   parse error but surfaced a second, unrelated interop bug several layers down
   (`@puppeteer/browsers/lib/detectPlatform.js`: `Cannot read properties of undefined (reading
   'platform')`), confirming this path is a known-fragile, open-ended rabbit hole (ts-jest is a
   TypeScript compiler, not a general-purpose third-party-ESM-to-CJS bundler) rather than a
   config tweak. Presented this finding to the project owner with two options — invest further in
   fragile Jest ESM transform config, or mock Puppeteer in just these 2 tests, since production
   correctness is independently verified by Node's native `require(esm)` support plus a manual
   smoke test. Project owner chose to mock. Both specs now use `jest.mock('puppeteer', ...)` with a
   fake `launch()`/`newPage()`/`pdf()`/`close()` chain that still exercises `PdfExportService`'s own
   logic (launch args, navigation URL, `pdf()` options, that `browser.close()` always runs) — real,
   unmocked PDF generation is verified once, end-to-end, via the manual smoke test below.
   `pdf-export.service.spec.ts` gained a second test (`closes the browser even when page rendering
   throws`) as a natural pair to the mock-enabled assertions, made possible for the first time by
   the mock (forcing a real Puppeteer error deterministically wasn't practical before).

Net effect: this is a *broader* Test Requirement divergence than "no new unit tests" originally
stated (2 test files changed, 1 new test added) — but the underlying invariant (PdfExportService's
Puppeteer usage keeps working identically) was verified more strongly than originally planned:
locally via a real, unmocked, end-to-end pipeline run producing a real PDF (see manual smoke test),
not only via the pre-existing "real Puppeteer, temp files" unit test's narrower scope.
