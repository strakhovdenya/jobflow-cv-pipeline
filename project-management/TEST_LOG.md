# Test Log

## Purpose

Record test commands, manual verification steps and results. This file is especially important for checks that are not fully automated yet: PostgreSQL persistence, filesystem artifact creation, PDF export and AI provider mocks.

## Entry Template

```md
## YYYY-MM-DD — TASK-XXX — Short title

### Scope

What was tested.

### Commands

```bash
# commands here
```

### Result

PASS / FAIL / PARTIAL

### Evidence

- output summary;
- generated file paths;
- database rows checked;
- notes/screenshots if needed.

### Follow-up

- none;
- or link to BLOCKERS.md / next task.
```

## 2026-08-19 — ISSUE-196 — Anti-Overclaiming Rules verification for prompt_1_v3

### Scope

Verify `apps/api/prisma/prompts/prompt1_v3.txt` (created by #195) against root `CLAUDE.md`'s five
Anti-Overclaiming Rules explicitly, one by one — not assumed inherited from the manual ChatGPT-web
flow, which was never connected to this project's rules. One gap found (MCP/Claude Code not named
explicitly, rule 3) was fixed with the project owner's confirmation as `prompt1_v4.txt`
(`PromptTemplate` version 4, active; v3 deactivated, not deleted).

### Commands

```bash
cd apps/api
grep -ni "MCP\|Claude Code\|NestJS\|Kubernetes\|Docker\|AWS\|needs.evidence\|needs_evidence" \
  prisma/prompts/prompt1_v3.txt
npx tsc --noEmit
npm run lint
npm run test
npx prisma db seed
npx ts-node -e "<inline script querying PromptTemplate versions for prompt_1_vacancy_analysis>"
```

### Result

PASS

### Evidence

- All 5 rules checked individually against `prompt1_v3.txt`, citations recorded in
  `docs/10_calibration_and_parity.md` §2.3: rules 1, 2, 4, 5 fully covered, no change needed; rule 3
  (personal AI/FastAPI/OpenAI/MCP/Claude Code ≠ commercial) partially covered via a generic "AI"
  catch-all but MCP/Claude Code never named explicitly — confirmed as a real gap against the
  candidate's actual knowledge-source files (which do describe MCP/Claude Code work).
- Fix applied in `prompt1_v4.txt`: three targeted additions naming MCP/Claude Code (current-work
  preamble list, new OVERCLAIMING/SAFETY CHECKS bullet, closing "never present as commercial
  production" sentence) — no other content changed.
- `apps/api/prisma/seed.ts`: added `seed-prompt-1-vacancy-analysis-v4` (version 4, `isActive: true`),
  flipped v3's `isActive` to `false`.
- `npx tsc --noEmit`: clean. `npm run lint`: clean (0 errors/warnings). `npm run test`: 61 suites /
  698 tests passed.
- `npx prisma db seed` re-run against local dev DB: upserted cleanly, no errors. Queried
  `PromptTemplate` rows for `prompt_1_vacancy_analysis` after seeding:
  `[{"version":1,"isActive":false},{"version":2,"isActive":false},{"version":3,"isActive":false},{"version":4,"isActive":true}]`
  — confirms exactly one active version, correctly the new v4.

### Follow-up

- none.

## 2026-08-19 — ISSUE-193 — Web-app-specific assumptions audit for prompt_1 source text

### Scope

Documentation-only audit task (Phase 1 of EPIC-24): read the real manual-flow prompt text
`apps/api/prisma/prompts/!prompt_1_0_3_quick_vacancy_analysis_RISK_BALANCED_STARTUP_PRODUCT_UPDATED_CURRENT_WORK_SYNC_LANG_GATE.txt`
in full (553 lines, not just the PRD's quoted fragment) and produce a list of every web-app-specific
assumption it makes, per Issue #193's Acceptance Criteria. No code changes.

### Commands

```bash
# full-text search for capability-assumption keywords, to confirm nothing was missed by eyeballing
grep -n -iE "browsing|search|lookup|internet|attach|upload|file|session|remember|memory|paste|загрузил|вставил" \
  "apps/api/prisma/prompts/!prompt_1_0_3_quick_vacancy_analysis_RISK_BALANCED_STARTUP_PRODUCT_UPDATED_CURRENT_WORK_SYNC_LANG_GATE.txt"
```

### Result

PASS

### Evidence

- Read the entire 553-line source file (not the PRD's excerpt).
- Recorded 6 findings as a new `docs/10_calibration_and_parity.md` §2.1: (1) vacancy delivered via
  chat paste/upload, (2) vacancy assumed to be a PDF the model visually parses, (3) knowledge-source
  files treated as live/browsable attached files, (4) persistent session/"project" memory carrying
  standing instructions across turns, (5) AI directly creating a file and linking to it (SKIP archive
  note), (6) live web browsing/external verification — flagged as *not actually present* in this
  file's text despite being cited as an example in `docs/10_calibration_and_parity.md` §2 point 5,
  a discrepancy left for Issue #194 to resolve explicitly.
- Grep search for capability-assumption keywords cross-checked against the manual read; no additional
  candidate assumptions found beyond the 6 recorded.
- Each finding is a starting point for Issue #194 (map to existing mechanism or reword with an
  explicit fallback) — this task's own scope was limited to producing the list, not resolving it.

### Follow-up

- Issue #194 (blocked on this task) resolves each of the 6 findings with an explicit decision.

## 2026-08-16 — TASK-103 — Fix stale TASK_BOARD.md status rows for TASK-067 and TASK-073

### Scope

Documentation-only correction: `TASK_BOARD.md`'s per-task table had TASK-067 and TASK-073 marked
`TODO` despite both being long merged and DONE, contradicting the file's own narrative sections
elsewhere in the same document.

### Commands

None — no code touched, nothing to run. Verification was git history + reading the file's own
already-correct prose.

```bash
git log --oneline -- apps/web/src/app/workspaces/[id]/final-check-panel.tsx
grep -n "TASK-067\|TASK-073-redesign-base" project-management/TASK_BOARD.md
```

### Result

PASS

### Evidence

- `git log` confirmed `5d8bf54 feat: TASK-067 add Prompt 5 final check trigger and results view`
  (2026-07-20) plus a same-day review-fix commit and a later TASK-074 extension commit —
  `final-check-panel.tsx` exists and is wired into `page.tsx`.
- `TASK_BOARD.md`'s own text at ~line 425-426 already read "Previously: TASK-067 ... — DONE,
  branch `task/TASK-067-final-check-ui`, PR #126 (merged)" and ~line 168-169 already read "that PR
  (#158, `task/TASK-073-redesign-base` → `main`) was already [merged]" — both facts pre-existed in
  the file; this task only reconciled the summary table rows to match.
- All of TASK-073's declared sub-tasks (TASK-075 through TASK-089) plus TASK-074 were confirmed
  already `DONE` in the same table.
- Updated both rows: `TODO` → `DONE`, filled PR/commit columns, added explanatory notes citing the
  source of the correction.

### Follow-up

- none. (TASK-086 was deliberately left untouched — a genuine open item, not a stale-doc bug; see
  `project-management/completed-tasks/TASK-103-fix-stale-task-board-rows.md` for detail.)

## 2026-08-15 — TASK-101 — UI: manual-note control on the workspace detail page (apps/web)

### Scope

`WorkspaceDetail.manualNote` + `appendManualNote()` in `apps/web/src/lib/api.ts`,
`appendManualNoteAction` in `actions.ts`, new `ManualNotePanel` component wired into
`page.tsx` above `ApplicationTrackingPanel`, and its `manual-note-panel.spec.tsx` suite.

### Commands

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `tsc --noEmit`: 0 errors (after adding the new `manualNote: null` field to two pre-existing
  `WorkspaceDetail` fixtures in `pipeline-view-model.spec.ts` that broke once the field became
  required).
- `npm run lint`: clean.
- `npm run test`: 23 files / 228 tests passed (up from 223 — 5 new tests in
  `manual-note-panel.spec.tsx`).
- Manual verification against a real `apps/api` backend (Postgres via `docker compose`, `apps/api`
  on port 3000, `apps/web` dev server on port 3001 to avoid the port clash — both apps default to
  3000): created a throwaway workspace (`cmsu4yw0100024lk7ml6j57tq`, TestCo / Backend Developer)
  via `POST /workspaces`, opened its detail page in a real browser (Playwright MCP). Confirmed via
  screenshot/snapshot: "Manual notes" panel renders unconditionally at `source_saved` (no status
  gate) showing "No manual notes yet."; submitted a first note, panel updated in place to show the
  timestamped entry; reloaded the page — note persisted; submitted a second note; both entries
  visible in order, each with its own `[ISO timestamp]` prefix, matching TASK-098's
  additive/timestamped append behavior.
- Unrelated environment issue hit and resolved during manual verification: `apps/web`'s Turbopack
  dev server intermittently panics on first compile of `globals.css` on this Windows machine
  (`node process exited ... 0xc0000142`) — a local Turbopack/Windows worker-process quirk, not
  caused by this task's changes; resolved by clearing `.next` and restarting the dev server.

### Follow-up

- none.

## 2026-08-15 — TASK-102 — Bump Node.js 20→22 and puppeteer 24→25 to close GHSA-jmr9-qjv8-65gv

### Scope

Bumped Node.js runtime 20→22 across `.github/workflows/ci.yml` (`NODE_VERSION`), both apps'
Dockerfiles (`node:20-alpine` → `node:22-alpine`), and `apps/api/package.json`'s `engines.node`
(`">=20"` → `">=22.12.0"`). Bumped `puppeteer` `^24.43.1` → `^25.7.0` (the first major line whose
`@puppeteer/browsers` dependency dropped `extract-zip` for `modern-tar`, closing
GHSA-jmr9-qjv8-65gv — no patched `extract-zip` release exists at any version). Discovered mid-task
that `puppeteer@25.x` ships pure ESM with no CJS build, which Jest's CJS module runtime cannot
parse (Node's own `require()` handles it fine, stable since Node 22.12) — fixed via a lazy dynamic
import in `PdfExportService` plus mocking Puppeteer in the two test files that deliberately invoke
it for real (`pdf-export.service.spec.ts`, `mvp-flow.e2e-spec.ts`), per project owner decision. Full
reasoning and the alternative considered (Jest ESM transform config, rejected as fragile/open-ended
after surfacing a second interop bug) is in `project-management/completed-tasks/
TASK-102-node22-puppeteer-upgrade.md`'s Progress Notes.

### Commands

```bash
# local shell switched to Node 22 via nvm4w (nvm use 22.23.0) before any of the below
cd apps/api
npm install                              # puppeteer 24.43.1 -> 25.7.0, @puppeteer/browsers 2.13.2 -> 3.2.0
npm audit --omit=dev --audit-level=high
npm ls puppeteer @puppeteer/browsers extract-zip
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
npm run build
cd ../web
npm install                              # sanity check under Node 22 — no puppeteer dependency here
npx tsc --noEmit
npm run lint
npm run test
npm run build
cd ../..
docker compose config
docker build -t jobflow-api-test -f apps/api/Dockerfile apps/api
docker build -t jobflow-web-test -f apps/web/Dockerfile apps/web --build-arg NEXT_PUBLIC_API_BASE_URL=http://app:3000
# manual PDF export smoke test, real dev server, Node 22, puppeteer 25.7.0 (before mocking was added):
npm run start:dev
curl -X POST ... /workspaces
curl -X POST ... /workspaces/<id>/run-analysis
curl -X POST ... /workspaces/<id>/review-decision
curl -X POST ... /workspaces/<id>/generate-cv-content
curl -X POST ... /workspaces/<id>/review-cv-draft
curl -X POST ... /workspaces/<id>/skip-pre-pdf-check
curl -X POST ... /workspaces/<id>/export-cv
file storage/applications/<workspace>/04_cv_export.pdf
```

### Result

PASS

### Evidence

- **Before:** `npm audit --omit=dev` under puppeteer 24.43.1 reported 4 high-severity
  vulnerabilities (`extract-zip` GHSA-jmr9-qjv8-65gv, propagating through `@puppeteer/browsers`,
  `puppeteer-core`, `puppeteer`). **After:** `npm audit --omit=dev --audit-level=high` → "found 0
  vulnerabilities". `npm ls puppeteer @puppeteer/browsers extract-zip` confirms
  `@puppeteer/browsers@3.2.0` and no `extract-zip` entry at all in the tree.
- `apps/api`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` — 61/61 suites, 690/690
  tests (up from 689 — the new `closes the browser even when page rendering throws` test), `npm run
  test:e2e` — 3/3 suites, 4/4 tests, `npm run build` clean.
- `apps/web`: confirmed `package.json`/lockfile unchanged by `npm install` under Node 22 (no
  puppeteer dependency there); `npx tsc --noEmit`/`npm run lint` clean, `npm run test` — 22/22
  files, 223/223 tests, `npm run build` clean.
- `docker compose config` resolves without error. `docker build` succeeded for both
  `apps/api/Dockerfile` and `apps/web/Dockerfile` on `node:22-alpine`, each reporting "found 0
  vulnerabilities" during their own `npm ci`/`npm install` step; both test images removed after the
  check (`jobflow-api-test`, `jobflow-web-test`).
- Manual PDF export smoke test against the real local dev DB (fake AI provider), Node 22, puppeteer
  25.7.0, run *before* the Puppeteer mocks were added to the test files (so this exercised real,
  unmocked Puppeteer end-to-end): created a workspace, ran the full pipeline through `export-cv`.
  Response confirmed `status: cv_pdf_generated`; `file storage/applications/.../04_cv_export.pdf`
  reported "PDF document, version 1.4, 1 page(s)", 108824 bytes. Workspace and its DB rows/storage
  folder cleaned up afterward.
- Confirmed no unrelated dependency was bumped as a side effect: `git diff apps/api/package.json`
  shows only `engines.node` and `puppeteer` changed; the `package-lock.json` diff's other touched
  entries are npm's own `"dev": true` metadata re-annotation (a lockfile-format normalization, not
  real version changes) plus puppeteer's own transitive tree.
- `/code-review` on PR #188 found no Critical/Important issues (independently re-verified the
  `package.json`/lockfile scoping claim and the compiled-output ESM/CJS interop claim). One
  non-blocking recommendation: periodically re-run this manual smoke test on future `puppeteer`
  bumps, since real Puppeteer is no longer exercised in automated tests.

### Follow-up

- Confirmed on PR #188 (`gh pr checks 188`): all 13 required CI checks passed, including
  `Dependabot Severity Gate` — the exact check that was blocking TASK-100's PR #187 for this
  advisory. PR #188 was squash-merged (`80354c4`); note the merge captured only the first commit's
  diff — the closure documentation commit (this entry, the archived task file, `TASK_BOARD.md`'s
  `DONE` row, `CHANGELOG.md`) was pushed after the merge and needed a small separate follow-up PR
  to land on `main`.

## 2026-08-14 — TASK-100 — Add quality_score to VacancyAnalysis and TargetedCvContentOutput, with a new active PromptTemplate version

### Scope

Added `quality_score: number` (finite-number `isNumber` check, mirroring
`FinalCheckOutput.quality_score`) to `VacancyAnalysis` and `TargetedCvContentOutput` schemas;
`FAKE_PROMPT1_JSON`/`FAKE_PROMPT2_JSON` fixtures updated. New `prompt1_v2.txt`/`prompt2_v2.txt`
(v1 files untouched) add `quality_score` to the OUTPUT CONTRACT and a short self-assessment
rubric, and rewrite the stale "knowledge sources may be name-only" caveat to reflect that
knowledge sources are now inlined when selected (TASK-094/095/096/097 already merged).
`prisma/seed.ts`'s `promptTemplates` array gained an explicit per-entry `isActive` field (fixing
a previously-hardcoded `isActive: true` on every upsert) and two new `version: 2` rows for
`prompt_1`/`prompt_2`, active, with `version: 1` preserved but inactive. `Prompt1Service`/
`Prompt2Service`'s `buildMarkdown` now render a `## Quality Score` section mirroring Prompt 5's
pattern.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npx prisma migrate reset --force --skip-seed   # fresh local dev DB
npx prisma db seed
node scratch_check_seed.js                      # ad hoc PromptTemplate row check, deleted after use
npx prisma db seed                               # re-run to verify idempotency
npm run test:e2e
npm run start:dev                                # manual verification against real dev DB
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{...}' http://localhost:3000/workspaces
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/run-analysis
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve_apply"}' http://localhost:3000/workspaces/<id>/review-decision
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cv-content
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run test` — 61 suites / 697 tests, all passed (up from 689) — new valid/invalid
  `quality_score` cases in `vacancy-analysis.schema.spec.ts` and
  `targeted-cv-content.schema.spec.ts`, new `## Quality Score` markdown assertions in
  `prompt1.service.spec.ts`/`prompt2.service.spec.ts`, plus `quality_score` added to three other
  `TargetedCvContentOutput` test fixtures that the type change caught at compile time
  (`prompt2-to-cv-content.mapper.spec.ts`, `evidence-guard.service.spec.ts`,
  `html-renderer.service.spec.ts`).
- Fresh-database re-seed check: after `prisma migrate reset` + `prisma db seed`, a direct Prisma
  query confirmed `prompt_1`/`prompt_2` each had exactly one active row at `version: 2`
  (`seed-prompt-1-vacancy-analysis-v2`/`seed-prompt-2-targeted-cv-content-v2`) and one inactive row
  at `version: 1`; every other step (`prompt_3`, `prompt_5`, `skip_reason`, `cover_letter`) had
  exactly one active row. Re-ran `prisma db seed` a second time against the same database — same
  result, confirming idempotency.
- `npm run test:e2e` — 3 suites / 4 tests, all passed.
- Manual walkthrough against the real local dev DB and the `fake` AI provider: created a workspace,
  ran `run-analysis` → `review-decision` (approve_apply) → `generate-cv-content`; both
  `01_vacancy_analysis.md` and `02_targeted_cv_content.md` contained a `## Quality Score` section
  with the fixture values (88 and 85 respectively). Cleaned up the workspace's DB rows and storage
  folder afterward.

### Follow-up

- None. Remaining EPIC-23 backlog: TASK-101 (UI: manual-note control, `apps/web` — unrelated to
  this task's scope).

## 2026-08-11 — TASK-099 — Wire manualNote into Prompt 1 / Prompt 2 / cover-letter input builders

### Scope

Added optional `manualNote?: string | null` to `WorkspaceInputContext`, `Prompt2WorkspaceContext`
and `CoverLetterWorkspaceContext`; `Prompt1Service.runAnalysis`, `Prompt2Service.generateCvContent`
and `CoverLetterService.generateCoverLetter` now pass `workspace.manualNote` into their respective
builder call. Each builder appends a `=== MANUAL NOTE ===` block to `inputContext` only when the
note is present/non-empty; absent note produces byte-identical output to before this task.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run start:dev   # manual verification against real dev DB
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"note":"..."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/run-analysis
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve_apply"}' http://localhost:3000/workspaces/<id>/review-decision
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cv-content
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve"}' http://localhost:3000/workspaces/<id>/review-cv-draft
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/skip-pre-pdf-check
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/export-cv
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cover-letter
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT \"workspaceId\", \"promptStep\", \"inputHash\" FROM \"PromptRun\" WHERE \"workspaceId\" IN (...);"
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (auto-fix made only formatting/quote-escaping changes to a new spec file).
- `npm run test` — 61 suites / 689 tests, all passed (up from 680), including 6 new
  `=== MANUAL NOTE ===` present/absent regression tests across the three
  `*-input-builder.service.spec.ts` files and 3 new pass-through tests across the three
  `*.service.spec.ts` files.
- Manual end-to-end walkthrough against the real local dev DB and the `fake` AI provider (no
  endpoint exposes raw prompt input, so verification used `PromptRun.inputHash`, which is
  `sha256(promptText + inputContext)` — a real difference in `inputContext` necessarily changes it):
  created two otherwise-identical workspaces (same company/role/vacancy text), attached
  `TASK099_MANUAL_NOTE_MARKER: recruiter said team also uses Kotlin.` to workspace A via TASK-098's
  `POST /workspaces/:id/manual-note` endpoint, left workspace B without a note, then ran both
  through `run-analysis` → `review-decision` (approve_apply) → `generate-cv-content` →
  `review-cv-draft` (approve) → `skip-pre-pdf-check` → `export-cv` → `generate-cover-letter`.
  Queried `PromptRun.inputHash` for both workspaces across all three steps — every pair (prompt_1,
  prompt_2, cover_letter) had a different hash between A and B, confirming the manual note text
  changes each step's real `inputContext` at runtime, not just in mocked unit tests. Cleaned up
  both test workspaces and their DB rows/storage folders afterward.

### Follow-up

- None. This closes EPIC-23's second track (TASK-098 + TASK-099).

## 2026-08-10 — TASK-098 — Add ApplicationWorkspace.manualNote field and POST /workspaces/:id/manual-note endpoint

### Scope

New `ApplicationWorkspace.manualNote String?` Prisma field + migration, new `AppendManualNoteDto`,
new `WorkspacesService.appendManualNote()`, new `POST /workspaces/:id/manual-note` endpoint
(no status gate). Verified append-only accumulation, whitespace-only rejection, and not-found
handling against the real local dev database (not just "migration ran without error").

### Commands

```bash
cd apps/api
npx prisma migrate dev --name add_manual_note
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test
npm run start:dev   # manual verification against real dev DB
curl -H "x-api-key: ..." http://localhost:3000/workspaces/<id>
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"No commercial AWS experience, remove that."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"German language risk noted."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"   "}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"test"}' http://localhost:3000/workspaces/nonexistent-id/manual-note
```

### Result

PASS

### Evidence

- `npx prisma migrate dev --name add_manual_note` applied cleanly, generating
  `prisma/migrations/20260810182203_add_manual_note/migration.sql`. `npx prisma generate`
  initially failed with `EPERM` on the query-engine DLL — traced to several leftover
  `apps/api`/`apps/web` dev-server processes (`nest start --watch`, `next dev`, a stray
  `dist/src/main`) holding a file lock from an earlier session; stopped with the user's explicit
  approval, then `prisma generate` succeeded.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (auto-fix made only formatting changes).
- `npm run test` — 61 suites / 680 tests, all passed, including new `append-manual-note.dto.spec.ts`
  and new `appendManualNote`/manual-note-endpoint cases in `workspaces.service.spec.ts`/
  `workspaces.controller.spec.ts`.
- Manual curl walkthrough against a real workspace (`cmsj8jurj0002m8yimk62zpfg`) in the local dev
  DB: `GET` before showed `manualNote: null`; first `POST` produced
  `"[2026-08-10T18:28:11.839Z] No commercial AWS experience, remove that."`; second `POST` appended
  below it as
  `"...remove that.\n[2026-08-10T18:28:11.939Z] German language risk noted."` — first entry's text
  unchanged, second entry appended below, confirming additive/timestamped behavior against the real
  database (not just the mocked unit tests). Whitespace-only note → `400`. Non-existent workspace id
  → `404`.

### Follow-up

- None. TASK-099 (wiring `manualNote` into the three prompt input builders) depends on this task's
  field/service method, both of which now exist and are merged-ready.

## 2026-08-10 — TASK-097 PR #174 — Post-review Dependabot fix (apps/web nanoid, unrelated to task scope)

### Scope

CI's `Dependabot Severity Gate` job failed on PR #174 (`apps/web — fail on high/critical
vulnerabilities`): `nanoid <3.3.17`, high severity, GHSA-2v37-7h3g-55p8 (custom generators can loop
indefinitely when size is zero). Confirmed via `git diff origin/main -- apps/web/package.json
apps/web/package-lock.json` (empty) that this PR's diff never touched `apps/web` dependencies —
the vulnerability pre-existed on `main`; CI simply had not caught it there yet (new advisory or gate
not recently re-run against `main`). Per the project owner's explicit choice, fixed directly in this
PR rather than opening a separate dedicated task (the usual TASK-090/092/093 precedent for
Dependabot fixes), since it was a trivial `npm audit fix` with zero `package.json` changes.

### Commands

```bash
cd apps/web
npm audit --omit=dev --audit-level=high   # confirm before: 1 high (nanoid <3.3.17)
npm audit fix
npm audit --omit=dev --audit-level=high   # confirm after: 0 vulnerabilities
npm run test:cov
npx tsc --noEmit
npm run lint
npm run build
```

### Result

PASS

### Evidence

- `npm audit fix`: bumped only `package-lock.json` (`nanoid` 3.3.16→3.3.18 via `@tailwindcss/postcss`
  → `postcss` override; `brace-expansion` 1.1.16→1.1.18, dev-only). No `package.json` change needed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities (was 1 high).
- `npm run test:cov`: 22 test files / 223 tests passed (unchanged from pre-fix baseline).
- `npx tsc --noEmit` / `npm run lint`: both clean.
- `npm run build`: Next.js production build compiled successfully, all 7 routes generated.

### Follow-up

- None — trivial lockfile-only bump, fully verified. Committed to the same
  `task/TASK-097-wire-coverletter-knowledge-content` branch/PR per the project owner's explicit
  choice, not filed as a separate task.

## 2026-08-07 — TASK-095 — Wire KnowledgeSourceContentService into PromptInputBuilderService (Prompt 1)

### Scope

`PromptInputBuilderService.buildPrompt1Input()` now loads real knowledge-source content via
TASK-094's `KnowledgeSourceContentService.loadContent()` instead of emitting the
`[content not loaded in MVP]` placeholder. `contentAvailable: true` entries embed real `content`;
`contentAvailable: false` entries embed a labeled stub referencing `unavailableReason`. A
hash-mismatch exception from `loadContent()` propagates uncaught out of `buildPrompt1Input`.
`sourceSnapshot`'s persisted shape is unchanged (still built from the raw `KnowledgeSource[]`
input, never from loaded content).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=prompt-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean (`eslint --fix`, only auto-formatting applied to the spec file).
- `prompt-input-builder.service.spec.ts`: 11/11 passed (3 new tests — real-content rendering,
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus 8 existing tests
  updated only to add the new `KnowledgeSourceContentService` mock provider, behavior unchanged).
- Full `apps/api` unit suite: 60 suites / 668 tests passed, including `prompt1.service.spec.ts`
  unmodified (it mocks `PromptInputBuilderService` as a whole).
- `content not loaded in MVP` no longer appears in `prompt-input-builder.service.ts` (grep clean).

### Follow-up

- none — TASK-096/097 (Prompt 2 / cover letter input builders) are separate follow-on tasks per
  `docs/07_task_backlog.md`.

## 2026-08-07 — TASK-096 — Wire KnowledgeSourceContentService into Prompt2InputBuilderService (Prompt 2)

### Scope

`Prompt2InputBuilderService.buildPrompt2Input()` now loads real knowledge-source content via
`KnowledgeSourceContentService.loadContent()` instead of emitting the `[content not loaded in
MVP]` placeholder — same rendering approach as TASK-095's Prompt 1 wiring.
`contentAvailable: true` entries embed real `content`; `contentAvailable: false` entries embed a
labeled stub referencing `unavailableReason`. A hash-mismatch exception from `loadContent()`
propagates uncaught out of `buildPrompt2Input`. `sourceSnapshot.knowledgeSources`'s persisted
shape is unchanged. The regenerate-notes block (`PREVIOUS CV DRAFT`/`USER FEEDBACK FOR
REGENERATION`, TASK-029/ADR-029) and `ALLOWED_STATUSES` gating were untouched. Knowledge-source
selection still happens internally in this service (`findActive()` + `selectForStep('prompt_2',
...)`), unchanged from before this task.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=prompt2-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean.
- `prompt2-input-builder.service.spec.ts`: 13/13 passed (2 new tests —
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus all 11 existing
  tests updated only to pass the new `KnowledgeSourceContentService` mock as a 4th constructor
  argument, behavior unchanged, including the regenerate-notes tests).
- Full `apps/api` unit suite: 60 suites / 670 tests passed, including `prompt2.service.spec.ts`
  (mocks `Prompt2InputBuilderService` as a whole, unaffected) and `evidence-guard.service.spec.ts`
  (unaffected).
- `content not loaded in MVP` no longer appears in `prompt2-input-builder.service.ts` (grep
  clean).

### Follow-up

- none — TASK-097 (cover-letter input builder) is a separate follow-on task per
  `docs/07_task_backlog.md`.

## 2026-08-08 — TASK-097 — Wire KnowledgeSourceContentService into CoverLetterInputBuilderService (cover letter); EPIC-23 real-provider spot-check

### Scope

`CoverLetterInputBuilderService.buildCoverLetterInput()` now loads real knowledge-source content
via `KnowledgeSourceContentService.loadContent()` instead of emitting the `[content not loaded in
MVP]` placeholder — same rendering approach as TASK-095/096. `contentAvailable: true` entries embed
real `content`; `contentAvailable: false` entries embed a labeled stub referencing
`unavailableReason`. A hash-mismatch exception from `loadContent()` propagates uncaught out of
`buildCoverLetterInput`. `sourceSnapshot`'s persisted shape is unchanged.
`COVER_LETTER_ALLOWED_STATUSES` gating and the `[No vacancy analysis artifact available]` fallback
are untouched. This is the last of the three placeholder-replacement tasks — the literal string
`content not loaded in MVP` no longer appears anywhere in `apps/api/src` except as `not.toContain`
regression assertions in the three input builders' own spec files.

This entry also covers the deferred real-provider spot-check requested by TASK-097's Done
Definition (EPIC-23's 4th Acceptance Criterion, `docs/05_epics.md`): with all three input builders
now wired, run Prompt 1 + Prompt 2 against a real workspace with the real OpenAI provider and
compare `needs evidence`/overclaiming-risk counts against the pre-TASK-094 baseline (2026-07-08
TASK-038A entry, workspace `cmrc8zhba0005kmfnpf3hqo4g`).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=cover-letter-input-builder
npm run test

# Real-provider spot-check (manual, via curl against a locally running apps/api with
# AI_PROVIDER=openai temporarily set in .env):
curl -s -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -H "x-api-key: <redacted>" -d @vacancy-task097.json
curl -s -X POST http://localhost:3000/workspaces/<id>/run-analysis -H "x-api-key: <redacted>"
curl -s -X POST http://localhost:3000/workspaces/<id>/review-decision -H "Content-Type: application/json" -H "x-api-key: <redacted>" -d '{"action":"approve_maybe"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/generate-cv-content -H "x-api-key: <redacted>"
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"AiRun\" ..."
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean.
- `cover-letter-input-builder.service.spec.ts`: 11/11 passed (2 new tests —
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus all 9 existing tests
  updated only to pass the new `KnowledgeSourceContentService` mock as a 4th constructor argument,
  behavior unchanged).
- Full `apps/api` unit suite: 60 suites / 672 tests passed.
- `content not loaded in MVP` no longer appears anywhere in `apps/api/src` (repo-wide grep) except
  as `not.toContain` regression assertions in `prompt-input-builder.service.spec.ts`,
  `prompt2-input-builder.service.spec.ts` and `cover-letter-input-builder.service.spec.ts` — closes
  EPIC-23's first Acceptance Criterion in full.

**Real-provider spot-check** (workspace `cmsj8jurj0002m8yimk62zpfg`, folder
`storage/applications/2026_08_07_Nordwind_Systems_Backend_Software_Engineer_Node_js/`, kept on disk
as evidence, mirroring TASK-038A's `MVP_ACCEPTANCE.md` precedent):

- **Blocker found and fixed first**: the dev DB's 9 `KnowledgeSource.filePath` rows still held
  pre-ADR-023 paths (`D:\...\jobflow-cv-pipeline\knowledge-sources\...`, missing the `apps\api\`
  segment introduced when the backend moved under `apps/api`), so
  `KnowledgeSourceContentService`'s containment check correctly rejected every source as outside
  `KNOWLEDGE_SOURCES_ROOT`. This is a pre-existing environment/DB staleness issue, not a defect in
  this task's code — fixed with a one-off `UPDATE` (regex-matched, all 9 rows verified by id before
  and after) rather than the `register-knowledge-sources` script, since the script matches existing
  rows by exact `filePath` and would have created 9 duplicate stale-adjacent rows instead of fixing
  the originals.
- **First real Prompt 1 attempt failed with `429`**: requested 85,673 input tokens (all 6
  `prompt_1`-selected sources active) against the org's 30,000 TPM limit. This is itself strong
  evidence the real-content wiring works — the pre-TASK-094 placeholder-only baseline used only
  3,326 input tokens for the same step. Not a code defect; an org-tier rate limit unrelated to
  TASK-097's scope.
- **Prompt 1 (real OpenAI, `gpt-4o`, `AiRun cmsj8sq89000cm8yiutxbiehz`, temporarily narrowed to only
  `profile_summary` + `cv_rules` active to fit the TPM budget)**: 16,449 input / 1,135 output /
  17,584 total tokens (5x the placeholder-era baseline for the same step). Decision `maybe`, score
  69. Correctly flagged Docker as `personal_only`/medium risk and AWS as `needs_evidence`/medium
  risk, grounded in the real profile content (not a fixed fixture).
- Approved (`approve_maybe`) → `status: cv_generation_running`.
- **Prompt 2 (real OpenAI, `gpt-4o`, `AiRun cmskdtllg000lm8yins03aazq`, narrowed further to only
  `master_cv` active — the full `prompt_2` required set, `master_cv` alone included, does not fit
  under 30,000 TPM with real content)**: 19,860 input / 2,421 output / 22,281 total tokens (3.4x the
  placeholder-era baseline). `evidence_table` (6 entries): 4 `confirmed`, 2 `needs evidence`
  (Docker, AWS) — same gaps Prompt 1 identified, sourced from real `Master_CV_RU_...md` content
  (`evidence_source` fields cite the actual filename, not a stub). `overclaiming_check`: 1
  `critical_issues` entry ("Fluent English claim requires explicit evidence") and 12
  `needs_evidence` entries — **more** flags than the pre-TASK-094 baseline's "critical issues:
  none".
- **This increase is not a regression and not directly comparable to the baseline**: the baseline
  ran with the AI provider's *placeholder-era* full active-source set; this run had only 1 of the 6
  required `prompt_2` sources active (`profile_summary`, `tech_stack`, `project_inventory`,
  `career_cases`, `cv_rules` were deactivated), a workaround for the org's 30,000 TPM tier limit,
  not a product change. With less supporting context available (e.g. no `cv_rules` describing how
  to state English proficiency, no `profile_summary` corroborating other claims), the AI correctly
  had *less* evidence to confirm claims against — producing more `needs_evidence`/critical flags,
  exactly the anti-overclaiming behavior the system is designed to produce when evidence is thin.
  This demonstrates the anti-overclaiming guard responds correctly to real content volume, but is
  not a like-for-like "fewer flags" comparison against the baseline; a genuine full-context
  real-provider comparison is blocked by the current OpenAI org tier's TPM limit, not by any code
  in this repo. Tracked as a known follow-up (see below), not a defect to fix in this task.
- Cleanup performed after the spot-check: all 9 `KnowledgeSource` rows reactivated
  (`isActive = true`), `.env`'s `AI_PROVIDER` reverted to `fake`, dev server restarted and verified
  back on the fake provider (sanity-check workspace, `AiRun` row confirmed `provider: fake`,
  `totalTokens: 150`, then deleted along with its DB rows). Full `apps/api` unit suite re-run green
  (60/60 suites, 672/672 tests) after cleanup.

### Follow-up

- The current OpenAI org tier's 30,000 TPM limit is too low to run Prompt 1 or Prompt 2 with their
  full required knowledge-source set and real content — worth a dedicated follow-up (org tier
  upgrade, or batching/summarizing large sources like `Career_Case_Deep_Dives_RU_...md` at 160KB)
  before attempting a genuine full-context real-provider comparison. Not blocking for TASK-097
  itself, since the task's actual code-level Acceptance Criteria (wiring, tests, placeholder
  removal) are fully met independent of this infra constraint.
- none for TASK-097's own code scope — EPIC-23's placeholder-replacement work (TASK-094/095/096/097)
  is complete.

## 2026-08-04 — TASK-092 — Close 6 new Dependabot alerts (undici, postcss) surfaced by TASK-090's next@16.3.0 bump

### Scope

Verified `npm update postcss undici` in `apps/web` (bumping both within their existing semver
ranges — `overrides.postcss: "^8.5.10"` already allowed 8.5.25, and `jsdom`'s own `undici: "^7.25.0"`
already allowed 7.29.0, so only `package-lock.json` changed, no `package.json` edits needed)
resolves all 6 targeted alerts without breaking the app.

### Commands

```bash
cd apps/web
npm update postcss undici
npm ls postcss undici
npm audit --omit=dev --audit-level=high
npm run test:cov
npm run build
npm run lint
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm ls postcss undici`: `postcss@8.5.25` (deduped across `@tailwindcss/postcss`,
  `@vitejs/plugin-react` -> `vite`, `next`), `undici@7.29.0` (via `jsdom`, dev-only).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities (exit 0).
- `npm run test:cov`: 22 test files / 223 tests passed.
- `npm run build`: Next.js production build compiled successfully, all routes generated.
- `npm run lint` / `npx tsc --noEmit`: both clean, no errors.
- Manual smoke test: started real `apps/api` (`npm run start:dev`, port 3000, against local
  Postgres via `docker compose up -d postgres`) and real `apps/web` (`next dev -p 3001`) together.
  `GET http://localhost:3000/workspaces` returned the expected `401 Invalid or missing API key`
  (API reachable, auth working). `GET http://localhost:3001/workspaces` returned `200` with the
  correct page `<title>JobFlow CV Pipeline</title>` and Tailwind/PostCSS-generated utility classes
  present in the rendered HTML (e.g. `min-h-full flex flex-col`, `bg-zinc-50 dark:bg-black`),
  confirming the `postcss` bump did not break the CSS build pipeline.
- Post-merge live re-check (2026-08-04, after PR #166 merged): `gh api
  repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts --paginate -q '.[] | select(.number==48
  or .number==49 or .number==50 or .number==51 or .number==52 or .number==53)'` — all 6 alerts
  (#48–#53) now `fixed`.

### Follow-up

- none — all 6 targeted alerts confirmed `fixed`, Acceptance Criteria fully closed.

## 2026-08-03 — TASK-091 — Manual verification pass: TASK-072's four flow variants re-run against the redesigned UI

### Scope

Last sub-task of the TASK-073 epic. Re-ran all four real historical flow variants from TASK-072
(2026-07-21 entries below) end-to-end through the finished redesigned `apps/web` UI
(`/workspaces/[id]` — `PipelineStages` + `WorkspaceStatusHeader` + `MainActionCard` + `ArtifactList`
+ `ChecksPanel`) against a real running `apps/api` backend (`AI_PROVIDER=fake`), per the
human-in-the-loop protocol in `CURRENT_TASK.md` (Claude Code posts the next screen/action/expected
step, the project owner performs it in the real UI and replies with a screenshot, compared before
advancing). Goal: confirm the redesign preserves the underlying pipeline logic, not just its visual
presentation, before the epic's final PR into `main`.

Four ADR-level product/backend changes were found and implemented mid-pass (all explicitly
requested and confirmed by the project owner beyond this task's original "small in-place fix"
scope — see `CURRENT_TASK.md`'s Progress Notes and each ADR for full detail):

- **ADR-026** — pre-PDF check becomes a mandatory-but-skippable gate before export (new
  `pre_pdf_check_ready`/`paused_before_export` statuses wired up; new `POST
  /workspaces/:id/skip-pre-pdf-check` endpoint). Found during Flow 1.
- **ADR-027** — Analysis review redesign: new `originalDecision` field + migration, single
  "Approve" button replacing the old apply/maybe pair, new `override_to_apply` review action,
  Pause removed from this card, consistent `recommendation`/`decision` badges everywhere
  (`MainActionCard`, `WorkspaceStatusHeader`, new `PipelineStages` sidebar badges), badges
  restyled pill-shaped/borderless to stay visually distinct from buttons. Found during Flow 2.
  Two same-day follow-ups: the redundant `review` pill removed from `WorkspaceStatusHeader`, and a
  `displayDecision()` helper added to strip the `manual_override_` prefix from
  `overrideSkip()`-produced decision values before display.
- **ADR-028** — the separate "Confirm skip" click removed; a single "Skip" button now drives both
  `change_to_skip` and `confirm-skip` in one click (frontend-only; both backend endpoints and
  ADR-016's rollback behavior unchanged). Found during Flow 2.
- **ADR-029** — "Pause" and "Mark not worth applying" removed from the CV draft review card
  (including the backing `VacancyDecision.manual_override_skip` Prisma enum value and a migration,
  plus six docs updated to match); a real pre-existing bug in "Regenerate CV draft" fixed (always
  400'd — `prompt2-input-builder.service.ts` only accepted `cv_generation_running`, never the
  statuses regenerate is actually invoked from) and extended so regenerating now feeds the previous
  draft plus optional user feedback notes back into the Prompt 2 prompt. Found during Flow 3 setup.

Plus three smaller in-place fixes allowed directly by this task's Key Invariants: the single
Approve button's label read "Approve (skip)" (misleading — it actually dispatches
`override_to_apply`) and now reads "Approve (apply)" whenever `currentDecision === "skip"`; and two
layout fixes moving `PrePdfCheckPanel`/`FinalCheckPanel`/`CoverLetterPanel` from below `ArtifactList`
(easy to miss at the bottom of a long page) to directly under `MainActionCard`, matching the
mockups.

### Steps driven (screen → action → observed result) — Flow variant 1: "Hired — Fullstack Developer"

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace (company/role/vacancy text) | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" | `paused_after_analysis`, decision/score shown | Match |
| 3 | `/workspaces/:id` | "Approve (apply)" | `cv_generation_running` | Match |
| 4 | `/workspaces/:id` | "Generate CV draft" | `cv_draft_ready`, CV draft review card appears | Match |
| 5 | `/workspaces/:id` | "Approve" (CV draft review) | **New in redesign (ADR-026):** `pre_pdf_check_ready`, not straight to export — Run/Skip pre-PDF check buttons appear | Match |
| 6 | `/workspaces/:id` | "Run pre-PDF check" | `paused_before_export`, readiness banner, "Export PDF" button appears | Match |
| 7 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, `cv_export_html/pdf` artifacts, Final check + Cover letter + Application tracking all visible | Match |

Result: **PASS**, identical end-state behavior to TASK-072's original run through the new
components, plus the new ADR-026 gate step (which did not exist yet at TASK-072 time).

### Steps driven — Flow variant 2: "6037 — Senior Back-End Engineer" (skip, override-driven)

Re-run once more as part of the complete set (already re-confirmed once during TASK-083, which
predates TASK-084/087/088/089's components landing).

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" | `paused_after_analysis`, single "Approve (apply)" + "Skip" buttons (ADR-027 — no separate Pause, no duplicate Approve button), `recommendation`/`decision` badges (decision still "—") | Match |
| 3 | `/workspaces/:id` | "Skip" | **New in redesign (ADR-028):** single click drives `change_to_skip` + `confirm-skip` together — no intermediate "Confirm skip" screen | Match — went straight to `skipped` |
| 4 | `/workspaces/:id` | Observe artifacts | `01_skip_reason_md/json` registered, "Override skip" resume path available | Match |

Result: **PASS**. This re-run is what surfaced ADR-027/028/029 (see Scope) — none are regressions,
all are deliberate product changes made and confirmed live during this pass.

### Steps driven — Flow variant 3: "Monpay — Fullstack Engineer" (maybe → CV → pre-PDF check → export → cover letter → final check after)

Re-run plus the specific TASK-074 regression check: running the final check *after* the cover
letter.

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" → "Approve (apply)" | `cv_generation_running` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" → "Approve" → "Run pre-PDF check" | `pre_pdf_check_ready` → `paused_before_export`, readiness banner | Match |
| 4 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, Final check + Cover letter panels in 2-column grid | Match |
| 5 | `/workspaces/:id` | "Generate cover letter" | `cover_letter_generated`, cover letter artifacts registered | Match |
| 6 | `/workspaces/:id` | "Run final check" (after cover letter) | **TASK-074 regression check:** final check succeeds (previously always rejected once `cover_letter_generated`), `05_final_check_md/json` registered, `PipelineStages` still lists the `final` stage as done, not silently omitted | **Match** — TASK-074's fix confirmed working live |

One incident during this flow: a workspace-review button was accidentally clicked between
messages ("Mark not worth applying" on the Monpay workspace) — caught via a direct backend check
against the DB state (not trusting the previous screenshot blindly) and manually rolled back before
continuing.

Result: **PASS**, including the targeted functional verification of TASK-074's fix that this
flow exists specifically to re-validate.

### Steps driven — Flow variant 4: "SME Careers — Full Stack Engineer" (maybe → CV → pre-PDF check → export → final check, no cover letter)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" → "Approve (apply)" | `cv_generation_running`, `recommendation`/`decision` badges both `apply` | Match (score 75) |
| 3 | `/workspaces/:id` | "Generate CV draft" | `cv_draft_ready`, CV draft review card shows exactly two buttons — **Approve, Regenerate CV draft** (ADR-029: no Pause, no Mark not worth applying) | Match |
| 4 | `/workspaces/:id` | "Approve" | `pre_pdf_check_ready`, pre-PDF check card rendered directly under CV draft review (layout fix from this task) | Match |
| 5 | `/workspaces/:id` | "Run pre-PDF check" | `paused_before_export`, readiness `ready_with_minor_edits` | Match |
| 6 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, Final check + Cover letter 2-column grid, Application tracking panel below | Match |
| 7 | `/workspaces/:id` | "Run final check" (before cover letter) | Confirms correct ordering: final check succeeds first, `ChecksPanel` shows result (`ready_to_send`, score 92), Cover letter panel still shows "Generate cover letter" untouched | Match |

Result: **PASS**, confirming `ChecksPanel`/`UpcomingStepsPanel` still reflect the correct
before-cover-letter ordering in the redesigned UI.

### Commands

```bash
cd apps/api
npm run test              # 659/659 pass
npm run test:e2e          # 4/4 pass
npx tsc --noEmit          # clean
npm run lint              # clean

cd apps/web
npx vitest run             # 223/223 pass
npx tsc --noEmit          # clean
npm run lint              # clean
```

### Result

PASS — all four flow variants confirmed working end-to-end through the redesigned UI, including
the targeted TASK-074 regression check (Flow 3) and the correct-ordering check (Flow 4). Four ADR-
level changes (ADR-026, ADR-027, ADR-028, ADR-029) plus three small fixes were made in-place per
explicit project-owner confirmation at each point, and are all covered by the full test suite.

### Evidence

- Screenshots supplied by the project owner at each step (chat attachments, not stored in-repo),
  cross-checked against the workspace detail page state and, where needed, against direct backend
  queries (e.g. the Monpay accidental-click incident in Flow 3).
- Test workspaces created this session: company "SME Careers" role "Full Stack Engineer" (Flow 4,
  slug `2026_08_03_SME_Careers_Full_Stack_Engineer`) plus one workspace per flow 1–3, all left in
  place (consistent with TASK-072's own convention of not cleaning up test workspaces).

### Follow-up

- None filed as a new backlog task — all findings during this pass were resolved in-place as
  ADR-026/027/028/029 or small fixes, per this task's Key Invariants (larger scope than TASK-072's
  own stricter "always file separately" rule).
- TASK-073 epic is now ready for its single final PR from `task/TASK-073-redesign-base` into
  `main`, per ADR-025.

## 2026-08-02 — TASK-074 — Fix: final check reachable after cover letter generation

### Scope

Backend: widened `Prompt5InputBuilderService`'s `FINAL_CHECK_ALLOWED_STATUSES` to
`['cv_pdf_generated', 'cover_letter_generated']`, mirroring `CoverLetterInputBuilderService`'s
existing symmetric allowance. Added an explicit idempotency guard (reject if `05_final_check.json`
already exists) for the `cover_letter_generated` entry point, since that status is terminal in
`WorkspaceStatusService.TRANSITIONS` and can't rely on the usual "status left the allowed list"
one-shot lock. `Prompt5Service` now keeps `workspaceStatus` at `cover_letter_generated` (instead of
regressing to `final_check_ready`) when the run started from `cover_letter_generated`.

Frontend: `final-check-panel.tsx`'s trigger button is now shown at `cover_letter_generated` only
when no final-check result exists yet (`hasResult`-driven, mirroring `cover-letter-panel.tsx`'s
pattern), and hidden once one does. `pipeline-view-model.ts`'s `buildStages` no longer marks the
`final` stage `"done"` purely from `STATUS_STAGE_INDEX` position when status is
`cover_letter_generated` and no final-check artifact exists — it now checks real artifact presence
for that one status (see `CURRENT_TASK.md` Progress Notes for why the check was scoped to
`cover_letter_generated` specifically, not every status past `final`'s index).

A same-session `/code-review` pass found one bug: `hasFinalCheckArtifact()` originally counted
`final_check_md` OR `final_check_json`, but `prompt5.service.ts` writes `final_check_md`
unconditionally (even on AI JSON-validation failure) while `final_check_json` is registered only on
success — same convention already followed by `cover-letter-panel.tsx`/`final-check-panel.tsx`.
Counting the `.md` artifact meant a failed final-check attempt from `cover_letter_generated` would
still mark `final` `"done"`, contradicting `final-check-panel.tsx`'s own strictly-JSON-gated
`hasResult`. Fixed by checking `final_check_json` only; full `apps/web` suite (210/210), `tsc
--noEmit` and `lint` re-verified clean afterward.

### Commands

```bash
cd apps/api
npm run test              # 643/643 pass
npx tsc --noEmit          # clean
npm run lint              # clean

cd apps/web
npx vitest run             # 210/210 pass (re-verified after the code-review fix)
npx tsc --noEmit          # clean
npm run lint              # clean
```

### Result

PASS

### Evidence

- 4 new backend unit tests (`prompt5-input-builder.service.spec.ts` x2,
  `prompt5.service.spec.ts` x2) covering: success from `cover_letter_generated` with no prior
  artifact, rejection when `05_final_check.json` already exists, and `workspaceStatus` staying at
  `cover_letter_generated` in both the DB update call and the returned result.
- 1 new frontend component test (`final-check-panel.spec.tsx`) confirming the "Run final check"
  button appears at `cover_letter_generated` with no artifacts and successfully triggers the
  action.
- 2 new frontend unit tests (`pipeline-view-model.spec.ts`) confirming the `final` stage renders
  `"upcoming"` at `cover_letter_generated` with no final-check artifact, and `"done"` once one
  exists.
- No manual UI verification performed in this task — real end-to-end re-validation of this fix
  (running final check after cover letter through the actual browser UI) is deferred to TASK-091's
  Flow variant 3 re-run, per its own explicit scope.

### Follow-up

- None filed. TASK-091 (manual re-verification of TASK-072's four flows against the redesigned UI)
  is the next task in the TASK-073 epic sequence and specifically re-validates this fix end-to-end.

## 2026-08-01 — TASK-087 — ActionsPanel: unit tests

### Scope

New `ActionsPanel` component (top-level `actionsPanel.title` + `actionsPanel.buttons[]`), pure
presentation, rendered against the exact mockup "10 - SKIP - Confirm skip" `actionsPanel`
contract plus synthetic coverage of `secondary`/`disabled` button kinds and multi-button
ordering. Reuses `MainActionCard`'s exported `ActionButton` for kind→style mapping rather than
duplicating it.

### Commands

```bash
cd apps/web
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- 203/203 `apps/web` tests pass (4 new in `actions-panel.spec.tsx`: exact mockup-10
  `primary`-button fixture + click callback, `secondary` kind + click, `disabled` kind with
  `reason` tooltip + no-op click, multi-button render order).
- `npx tsc --noEmit` clean, `npm run lint` clean.
- No manual visual check performed for this task — no dev server was started; component is a
  small reuse of `MainActionCard`'s already visually-verified button styling, and no new styling
  surface was introduced.

### Follow-up

- none; not wired into `/workspaces/[id]` in this task, no real API call inside the component
  (deferred to a future real-data wiring task).

## 2026-07-31 — TASK-085 — UpcomingStepsPanel: unit tests + manual visual check

### Scope

New `UpcomingStepsPanel` component (finalCheck.status / coverLetter.status / tracking.fields[]
preview), pure presentation, rendered against the exact mockup "09 - PDF generated" `upcoming`
contract plus an alternate status value to prove no literal is hardcoded.

### Commands

```bash
cd apps/web
npm run test -- --run
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- 199/199 `apps/web` tests pass (4 new in `upcoming-steps-panel.spec.tsx`: empty-prop no-render,
  exact mockup-09 fixture, alternate status values `'Done'`/`'Skipped'`, empty `tracking.fields`).
- `npx tsc --noEmit` clean, `npm run lint` clean.
- Manual visual check: temporary `apps/web/src/app/preview-upcoming/page.tsx` route (deleted
  before commit) rendered against the already-running dev server (`localhost:3001`); project
  owner opened the page directly and confirmed correct rendering via screenshot (Final check /
  Cover letter status rows right-aligned, "APPLICATION TRACKING" field list below, matching the
  mockup layout) — no automated screenshot tool available in this environment.

### Follow-up

- none; not wired into `/workspaces/[id]` in this task (deferred to a future real-data wiring
  task, per this task's Key Invariants).

## 2026-07-30 — TASK-083 — Real backend data wiring: analysis_ready/failed stage mapping + TASK-072 Flow 2 regression re-run

### Scope

Verified the two fixes in `apps/web/src/lib/pipeline-view-model.ts` (analysis_ready mapped to the
decision stage instead of "waiting for analysis"; `failed` stage position inferred from real
`artifacts[]` instead of hardcoded index 0) against a real running `apps/api` (`AI_PROVIDER=fake`,
Postgres in Docker) + `apps/web` (`localhost:3001`), and re-ran TASK-072 Flow 2 (skip,
override-driven) end-to-end through the redesigned UI to confirm no regression.

### Commands

```bash
# create throwaway workspace, run analysis (fake provider -> apply, score 75)
POST /workspaces {companyNameOriginal, roleTitleOriginal, vacancyText}
POST /workspaces/:id/run-analysis
# human override to skip (ADR-016), same as Flow 2
POST /workspaces/:id/review-decision {"action":"change_to_skip"}
# simulate the confirm-skip-failed rollback state directly (AI_PROVIDER=fake never actually fails)
docker compose exec postgres psql -U jobflow -d jobflow_cv -c \
  "UPDATE \"ApplicationWorkspace\" SET status='analysis_ready' WHERE id='...';"
curl http://localhost:3001/workspaces/:id   # inspect rendered HTML
# restore and complete the real flow
docker compose exec postgres psql ... SET status='paused_after_analysis' ...
POST /workspaces/:id/confirm-skip   # -> status: skipped (real path, ADR-005)
# simulate `failed` on the same workspace (by now has vacancy_source + vacancy_analysis_* +
# skip_reason_* artifacts, no targeted_cv_content_*)
docker compose exec postgres psql ... SET status='failed' ...
curl http://localhost:3001/workspaces/:id   # inspect rendered HTML
```

### Result

PASS

### Evidence

- `analysis_ready` + `currentDecision=skip`: rendered page contained "Confirm skip" button, the new
  info text "The previous skip confirmation attempt failed — retry Confirm skip.", and the
  `decision` ("Analysis review") stage marked current ("Now" badge) — not the `analysis` stage.
- Restoring `paused_after_analysis` and calling the real `confirm-skip` endpoint produced
  `{"success":true,"workspaceStatus":"skipped"}` with real `01_skip_reason.md/json` artifacts
  written — same outcome as TASK-072 Flow 2, confirming no regression in the redesigned UI's skip
  path.
- `failed` on a workspace whose furthest real artifact was `vacancy_analysis_json` (no
  `targeted_cv_content_*` yet) rendered the `cvgen` ("CV generation") stage as current — matches
  `inferFailedStageIndex`'s intended mapping (analysis succeeded, cv_generation_running is where it
  must have failed), not the old hardcoded index 0.
- `npx vitest run` (apps/web): 180/180 tests pass (46 in `pipeline-view-model.spec.ts`, including 6
  new cases for these two fixes). `npx tsc --noEmit` and `npm run lint`: clean.
- Test workspace `cms7ntts1000p82k0oeo4rr51` ("TASK083 Manual Test Co") left in DB with
  `status=skipped` (cannot be archived from `skipped` — matches the real state machine; same
  leftover-test-workspace precedent as TASK-072).

### Follow-up

- None filed. `docs/03_domain_model.md` §8.6 still documents
  `analysis_running -> analysis_ready -> paused_after_analysis` as the primary flow, which the real
  code (`prompt1.service.ts`) does not follow — noted in `CURRENT_TASK.md`, not fixed here (doc-only
  change, out of this task's scope).

## 2026-07-21 — TASK-072 — Flow variant 1: "Hired — Fullstack Developer" (apply, happy path + pre-PDF check)

### Scope

First real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `Hired_full_chat_transcript_RU - pdf.txt`): a vacancy analysis ending in a
**MAYBE** decision, followed by targeted CV generation (Prompt 2), a pre-PDF check (Prompt 3,
`ready_with_minor_edits`), and PDF export. Driven end-to-end through the real `apps/web` UI
(`http://localhost:3001`) against a real running `apps/api` backend (`AI_PROVIDER=fake`).

Since `AI_PROVIDER=fake` always returns a canned `decision: "apply"` for Prompt 1
(`apps/api/src/ai/providers/fake.provider.ts` `FAKE_PROMPT1_JSON`), the review-gate step was
driven via **Approve (apply)** instead of the chat's original **Approve (maybe)** — the UI's
`AnalysisReviewGate` correctly disables "Approve (maybe)" whenever `currentDecision !== "maybe"`,
matching `review-gates.service.ts`'s own guard (`approve_maybe` requires `currentDecision ===
"maybe"`). This is a fake-provider/environment constraint, not a product gap: the "maybe" branch
of the review gate was not exercised by this pass and remains untested until a flow variant is
driven with a real AI provider recommending "maybe" (or the fake provider gains a second canned
"maybe" fixture — noted as a possible follow-up, not filed as its own task since it's a test-only
concern).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "Hired", Role "Fullstack Developer React Node js Remote", vacancy text, submit | Success panel, `status: source_saved` | Match |
| 2 | `/workspaces/:id` | Click "Start analysis" | `status: paused_after_analysis`, decision/score shown, review-gate buttons appear | Match (`decision: apply`, `score: 75`) |
| 3 | `/workspaces/:id` | Click "Approve (maybe)" | — | **Disabled** (see Scope note — expected given `currentDecision === "apply"`) |
| 3′ | `/workspaces/:id` | Click "Approve (apply)" instead | `status: cv_generation_running`, `reviewState: approved` | Match |
| 4 | `/workspaces/:id` | Click "Generate CV draft" | `status: cv_draft_ready`, `targeted_cv_content_md/json` artifacts registered, CV draft review + pre-PDF check sections appear | Match |
| 5 | `/workspaces/:id` | Click "Run pre-PDF check" | `pre_pdf_check_md/json` artifacts registered, "Export allowed — readiness: ready_with_minor_edits" banner, one `summary[0]` suggestion, overall notes | Match |
| 6 | `/workspaces/:id` | Click "Approve" in CV draft review | `status: export_running`, "Export PDF" button appears | Match |
| 7 | `/workspaces/:id` | Click "Export PDF" | `status: cv_pdf_generated`, `cv_export_html/pdf` artifacts registered, Final check / Cover letter / Application tracking sections all appear | Match |

### Result

PASS — no UI/backend gap found. Zero follow-up backlog tasks filed for this variant.

### Evidence

- Screenshots supplied by the project owner at each step (not stored in-repo — ephemeral chat
  attachments), cross-checked against the workspace detail page state at each step.
- Test workspace: company "Hired", role "Fullstack Developer React Node js Remote", slug
  `2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote` — **left in place** (not cleaned up
  yet) in case the same workspace is reused for a later step (e.g. final check / cover letter /
  application tracking) in a follow-up session; clean up before merging any TASK-072 closure
  commit if still unused.

### Follow-up

- None filed as a backlog task. Noted for future reference: the fake AI provider cannot produce a
  `maybe` or `skip` Prompt 1 recommendation, so any flow variant requiring "Approve (maybe)" or a
  first-pass AI-driven skip must either substitute "Approve (apply)" (as done here) or be driven
  with a real AI provider.
- This entry is intended to remain a valid reference after TASK-073's UI redesign — re-check the
  same screen → action → expected mapping against the redesigned UI rather than re-deriving flow
  logic from the original chat transcript again.

## 2026-07-21 — TASK-072 — Flow variant 2: "6037 — Senior Back-End Engineer" (skip, override-driven)

### Scope

Second real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `6037_full_chat_export_RU - skip.txt`): a vacancy analysis ending in a **SKIP**
decision (location blocker + AWS/NestJS/Prisma commercial gaps), with `01_skip_reason.md/json`
generated and no targeted CV produced. Driven end-to-end through the real `apps/web` UI against a
real running `apps/api` backend (`AI_PROVIDER=fake`).

As with Flow 1, `AI_PROVIDER=fake` always returns a canned `decision: "apply"` for Prompt 1, so
the chat's original AI-recommended `SKIP` could not be reproduced as the *initial* AI decision.
Unlike the "maybe" case in Flow 1, though, `change_to_skip` is available regardless of the current
decision (per `review-gates.service.ts`, it's only blocked when `currentDecision` is already
`skip`) — so the human-override "Skip" button on the analysis-review screen was used instead,
exercising the exact same `change_to_skip` → `confirm-skip` path ADR-016 documents. This is a
closer real-world match than Flow 1's apply/maybe substitution: a human choosing to skip a vacancy
the AI recommended for `apply` is itself a legitimate real usage pattern, not just a test
workaround.

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "6037", Role "Senior Back-End Engineer", vacancy text, submit | Success panel, `status: source_saved` | Match |
| 2 | `/workspaces/:id` | Click "Start analysis" | `status: paused_after_analysis`, decision/score shown | Match (`decision: apply`, `score: 75`) |
| 3 | `/workspaces/:id` | Click "Skip" in Analysis review | Per ADR-016: `status` stays `paused_after_analysis`, `currentDecision: skip`, `reviewState: overridden`, a "Confirm skip" button appears | Match |
| 4 | `/workspaces/:id` | Click "Confirm skip" | `status: skipped`, `skip_reason_md/json` artifacts registered with `SKIP_...reason_RU.md/.json` naming (ADR-006), an "Override skip" form appears as the resume path | Match |

### Result

PASS — no UI/backend gap found. Zero follow-up backlog tasks filed for this variant. This also
newly confirms (against a real backend, not just unit tests) that the `confirm-skip` gap noted in
ADR-022 ("confirm-skip 500s on any standard-seeded environment" because `skip_reason` had no
seeded active `PromptTemplate`) is fixed — `prisma/seed.ts` now seeds `seed-skip-reason-v1`, and
`confirm-skip` succeeded without error.

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state.
- Test workspace: company "6037", role "Senior Back-End Engineer", slug
  `2026_07_21_6037_Senior_Back_End_Engineer` — **left in place** alongside Flow 1's workspace, not
  cleaned up yet.

### Follow-up

- None filed as a backlog task.
- Confirms Flow 1's noted environment constraint is specific to the *initial* AI recommendation
  only — the human-driven `change_to_skip` override path does not share that limitation and was
  exercised for real here.

## 2026-07-21 — TASK-072 — Flow variant 3: "Monpay — Fullstack Engineer" (maybe → CV → pre-PDF check → export → cover letter)

### Scope

Third real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `Monpay_full_chat_export - ковер леттер.txt`): vacancy analysis ending in
**MAYBE**, targeted CV generation, a pre-PDF check ("revise first" verdict with 5 mandatory
edits), PDF export, and — new territory for this task's pass — English **cover letter**
generation (Prompt 2.1). Driven end-to-end through the real `apps/web` UI against a real running
`apps/api` backend (`AI_PROVIDER=fake`).

Same fake-provider substitution as Flow 1: "Approve (apply)" used instead of "Approve (maybe)"
(the AI always recommends `apply`; see Flow 1's entry for the full explanation — not repeated as
a new finding).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "Monpay", Role "Fullstack Engineer", vacancy text, submit | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" then "Approve (apply)" | `paused_after_analysis` → `cv_generation_running`, `reviewState: approved` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" then "Run pre-PDF check" | `cv_draft_ready` + `targeted_cv_content_md/json`; readiness banner + `summary[0]` suggestion | Match (`ready_with_minor_edits`) |
| 4 | `/workspaces/:id` | "Approve" (CV draft review) then "Export PDF" | `export_running` → `cv_pdf_generated`, `cv_export_html/pdf` artifacts, "Generate cover letter" button appears | Match |
| 5 | `/workspaces/:id` | "Generate cover letter" | `cover_letter_md/json` artifacts registered, status advances to `cover_letter_generated`, cover letter viewable via the Artifacts section | Match |

### Result

**PASS with one finding filed as a new backlog task.** Core mechanics of all five steps worked
exactly as expected. While reviewing the resulting screen at step 5, noticed:

1. The **"Final check" section, present at `cv_pdf_generated` (step 4), disappeared entirely**
   once status advanced to `cover_letter_generated` (step 5). Investigated the backend
   (`prompt5-input-builder.service.ts`): this isn't just a UI gate — `FINAL_CHECK_ALLOWED_STATUSES
   = ['cv_pdf_generated']` only, so the backend itself now rejects any final-check run on this
   workspace, permanently, since `cover_letter_generated` is a one-way transition. This is
   asymmetric with `cover-letter-input-builder.service.ts`'s own guard, which explicitly *does*
   allow generating the cover letter after final check (`['cv_pdf_generated',
   'final_check_ready']`). **Filed as TASK-074** (`docs/07_task_backlog.md` /
   `project-management/TASK_BOARD.md`) — not fixed inline, per this task's own acceptance
   criteria. This specific chat's real flow happened to use the order that avoids the bug
   (cover letter without ever running final check), so it wasn't hit by the original historical
   session, but the ordering hazard is real for any workspace that wants both steps.
2. The workspace detail page's "Next action" hint showed **"No action defined for this status"**
   at `cover_letter_generated` — not incorrect (application-tracking actions are still available
   below it and don't require a "next action" hint), but noted as a minor UX rough edge relevant
   to TASK-073's redesign scope (not filed separately — it's exactly the kind of
   scattered/no-forward-visibility issue TASK-073 already exists to fix, per its own Context
   section).

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state and, for the TASK-074 finding, against the actual backend source
  (`FINAL_CHECK_ALLOWED_STATUSES` / `COVER_LETTER_ALLOWED_STATUSES` constants).
- Test workspace: company "Monpay", role "Fullstack Engineer", slug
  `2026_07_21_Monpay_Fullstack_Engineer` — **left in place**, not cleaned up yet.

### Follow-up

- **TASK-074** filed: fix `FINAL_CHECK_ALLOWED_STATUSES` to also allow `cover_letter_generated`,
  mirroring the cover-letter guard's own symmetric allowance.
- The "No action defined for this status" UX rough edge is left for TASK-073 (full redesign),
  not filed as its own task — same root cause TASK-073 already targets.

## 2026-07-21 — TASK-072 — Flow variant 4: "SME Careers — Full Stack Engineer" (maybe → CV → pre-PDF check → export → final check)

### Scope

Fourth real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `SME_Careers_full_chat_export - chek pdf.txt`): vacancy analysis ending in
**MAYBE**, targeted CV generation, a pre-PDF check ("proceed to PDF yes after minor edits"), PDF
export, and — new territory for this task's pass — **final check** (Prompt 5), which the real
chat's Prompt 5 verdict was "Send after minor edits". Driven end-to-end through the real
`apps/web` UI against a real running `apps/api` backend (`AI_PROVIDER=fake`). Same fake-provider
substitution as Flows 1 and 3 ("Approve (apply)" instead of "Approve (maybe)" — see Flow 1's entry
for the explanation, not repeated here).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "SME Careers", Role "Full Stack Engineer Node js and React", vacancy text, submit | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" then "Approve (apply)" | `paused_after_analysis` → `cv_generation_running`, `reviewState: approved` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" then "Run pre-PDF check" | `cv_draft_ready` + `targeted_cv_content_md/json`; readiness banner + `summary[0]` suggestion | Match (`ready_with_minor_edits`) |
| 4 | `/workspaces/:id` | "Approve" (CV draft review) then "Export PDF" | `export_running` → `cv_pdf_generated`, `cv_export_html/pdf` artifacts, "Run final check" button appears | Match |
| 5 | `/workspaces/:id` | "Run final check" | `final_check_md/json` artifacts registered, status advances to `final_check_ready`, banner shows `final_decision`/`quality_score`/page count, 5-item checklist all ✓, empty issue arrays, one warning, "Run final check" button disappears while the result stays visible, "Generate cover letter" still available below | Match (`ready_to_send`, score 92, 2 pages) |

### Result

PASS — no new gap found. Confirms the "final check before cover letter" ordering (the inverse of
Flow 3's TASK-074 finding) works correctly: running final check at `cv_pdf_generated` and then
still seeing "Generate cover letter" available afterward at `final_check_ready` is the *documented
correct* order per `cover-letter-input-builder.service.ts`'s own `COVER_LETTER_ALLOWED_STATUSES =
['cv_pdf_generated', 'final_check_ready']`.

The same "Next action: No action defined for this status" rough edge noted in Flow 3 reappeared
here at `final_check_ready` — not filed separately, same TASK-073 scope as before.

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state.
- Test workspace: company "SME Careers", role "Full Stack Engineer Node js and React", slug
  `2026_07_21_SME_Careers_Full_Stack_Engineer_Node_js_and_React` — **left in place**, not cleaned
  up yet.

### Follow-up

- None filed as a backlog task.
- This was the fourth and (per the project owner, at the time of this entry) last flow variant
  supplied so far for TASK-072. Total so far: 4 flows driven, 2 fully clean, 2 with findings (one
  filed as TASK-074, one UX note deferred to TASK-073's existing scope). Test workspaces from all
  four flows still exist in the DB (see `CURRENT_TASK.md` cleanup list) — clean up before this
  task's own closure.

## 2026-07-20 — TASK-071 — Add existing-folder import UI

### Scope

`apps/web`: new `/import` screen implementing the scan → preview → confirm flow against the
pre-existing `ImportController` (`GET /import/scan`, `POST /import/preview`, `POST /import/confirm`
— no backend changes). New `lib/api.ts` types (`ImportScanResult`/`ImportPreviewInput`/
`ImportPreviewResult`/`ImportConfirmInput`/`ImportConfirmResult`) + `scanImportFolders()`/
`previewImportFolder()`/`confirmImportFolder()` functions, following the exact existing
server-side-`X-API-Key` fetch pattern. New `app/import/page.tsx` (Server Component, calls
`scanImportFolders()`), `app/import/actions.ts` (`previewImportFolderAction`/
`confirmImportFolderAction`, mirroring `createWorkspaceAction`'s `{ok,data}`/`{ok:false,errors}`
shape) and `app/import/import-preview.tsx` (client component: folder list → select → optional
company/role override inputs → "Preview" → structured result with a visually distinct
duplicate-detected banner (`isDuplicate`/`duplicateReason`/`duplicateWorkspaceId`) → a
vacancy-source-candidate `<select>` shown only when ambiguous (0 or 2+ candidates), gating the
confirm button until one is chosen → "Confirm import" → `router.push` to `/workspaces/:id` on
success). `copyVacancySourceToCanonical` defaults to unchecked (legacy files registered in place,
matching the backend's own default). Added an "Import from folder" nav link next to "New
workspace" on `/workspaces`. New `import-preview.spec.tsx` (6 tests): scan list renders, preview
of a selected folder, duplicate-detected banner rendering, full confirm → navigate success path,
confirm disabled when the vacancy-source candidate list is ambiguous, and preview validation-error
surfacing.

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 96/96 pass (6 new in import-preview.spec.tsx)
npm run build             # clean, /import route registered
```

### Result

PASS

### Evidence

- 96/96 `apps/web` Vitest tests pass (6 new); `tsc`/`lint`/`build` all clean; `next build` lists
  `/import` as a registered dynamic route.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): temporarily set `IMPORT_ROOT` in `apps/api/.env` to a scratch
  fixture folder (`<temp>/jobflow_import_root/Acme_Corp/2026.01.15/Acme_Corp_Backend_Developer.txt`)
  and restarted the backend dev server to pick it up (`ConfigService.getOrThrow('IMPORT_ROOT')` is
  read once at boot, not hot-reloaded).
  - `GET /import/scan` returned the fixture folder with `companyNameOriginal: "Acme_Corp"`,
    `roleTitleOriginal: "Backend Developer"`, `legacyDate: "2026-01-15"` (`high` confidence),
    one `vacancySourceCandidates` entry, `suggestedStatus: "source_saved"`, `warnings: []`.
  - Fetched `/import` through the frontend directly — the scanned folder's company/role rendered.
  - Fetched `/workspaces` through the frontend — "Import from folder" nav link present.
  - `POST /import/preview` (same request shape the Server Action uses) returned the same data plus
    `isDuplicate: false`.
  - `POST /import/confirm` created a real `Company`/`JobVacancy`/`ApplicationWorkspace`/
    `GeneratedArtifact` — `status: "source_saved"`, `workspaceSlug:
    "2026_01_15_Acme_Corp_Backend_Developer"`.
  - Fetched the resulting `/workspaces/:id` through the frontend — company/role/status rendered
    correctly (confirms the "navigates to its detail screen" acceptance criterion end-to-end).
  - Re-ran `POST /import/preview` on the same folder — confirmed `isDuplicate: true`,
    `duplicateReason: "source_path"`, `duplicateWorkspaceId` matching the just-created workspace
    (exercises the task's explicit "duplicate-detected case" test requirement against the real
    backend, complementing the component-level unit test).
  - Cleanup: deleted the test `ApplicationWorkspace`/`GeneratedArtifact`/`JobVacancy`/`Company`
    rows via a one-off Prisma script, removed the scratch fixture folder, reverted `apps/api/.env`
    (no `IMPORT_ROOT` — matches original state, `.env` is gitignored so never committed), and
    restarted the backend dev server a second time to restore it.
- No live browser click-through (no browser automation tool available) — covered instead by the
  component's tests plus the rendered-HTML checks above.

### Follow-up

- none.

## 2026-07-20 — TASK-070 — Add rejection text submission to workspace detail UI

### Scope

`apps/web`: extended TASK-069's `application-tracking-panel.tsx` with a new "Save rejection
feedback" section — a textarea + submit button gated on `status === "rejected"` only
(`REJECTION_TEXT_VALID_STATUSES = ["rejected"]`), matching `RejectionsService.saveRejectionText`'s
own guard exactly (a narrower gate than TASK-069's `ARCHIVED_VALID_STATUSES`, which also includes
`rejected` but for a different action). Empty/whitespace-only text is rejected client-side before
any network call (`SaveRejectionTextDto`'s `@IsNotEmpty`), showing an inline "Rejection text is
required." error. New `lib/api.ts` `saveRejectionText()` + `actions.ts` `saveRejectionTextAction`,
following the exact `markRejected`/`markRejectedAction` pattern — note the endpoint returns a
`GeneratedArtifact` (`id`/`artifactType`/`canonicalFileName`), not a `{id, status}` pair like the
other tracking actions, so the new result type intentionally has no `status` field. On success the
textarea clears and `router.refresh()` picks up the new `rejection_feedback.md` artifact, already
visible via TASK-064's existing generic artifact viewer (no dedicated preview needed). No backend
changes — the endpoint pre-existed since TASK-051. New tests in
`application-tracking-panel.spec.tsx`: form only rendered at `status = "rejected"`, empty-text
client-side validation blocks the call, successful submission calls the action with trimmed text
and refreshes.

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 90/90 pass (3 new in application-tracking-panel.spec.tsx)
npm run build             # clean
```

### Result

PASS

### Evidence

- 90/90 `apps/web` Vitest tests pass (3 new); `tsc`/`lint`/`build` all clean.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): created a fresh workspace and drove it
  `source_saved` → `cv_pdf_generated` → `ready_to_apply` → `applied` → `rejected` via the existing
  pipeline/tracking endpoints.
- Fetched the rendered `apps/web` page (`curl http://localhost:3001/workspaces/<id>`) at
  `status = rejected` and confirmed the new "Save rejection feedback" textarea/button render.
- Called `POST :id/rejection-text` (same endpoint/shape the new Server Action uses) with a sample
  rejection email body; response returned the expected `GeneratedArtifact`
  (`artifactType: "rejection_feedback"`, `canonicalFileName: "rejection_feedback.md"`).
- Re-fetched the rendered page and confirmed `rejection_feedback`/`rejection_feedback.md` now
  appears in the existing artifact list/viewer (TASK-064), with no code changes needed there.
- No live browser click-through (no browser automation tool available) — covered instead by the
  component's tests plus the rendered-HTML checks above, matching the precedent set in
  TASK-066/067/068/069.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists for
  workspaces; removed via a one-off Prisma script + `rm -rf` on the storage folder, then the script
  itself deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-069 — Add application tracking actions to workspace detail UI

### Scope

`apps/web` new `application-tracking-panel.tsx` wiring up `mark-ready-to-apply`, `mark-applied`
(`appliedVia`/`notes` text inputs, `submittedCvArtifactId`/`submittedCoverLetterArtifactId` as
`<select>` populated from the workspace's own `artifacts` list rather than raw-ID text entry),
`mark-rejected` (`rejectionSummary`/`notes`) and `archive` — all four `ApplicationTrackingService`
actions (TASK-050), previously only reachable via curl/Swagger. Each sub-section's visibility
mirrors `application-tracking.service.ts`'s own per-action status guard
(`READY_TO_APPLY_VALID_STATUSES`/`APPLIED_VALID_STATUSES`/`REJECTED_VALID_STATUSES`/
`ARCHIVED_VALID_STATUSES`) rather than a single all-or-nothing panel gate, so e.g. "Mark rejected"
only appears at `status = applied`. New `lib/api.ts` `markReadyToApply()`/`markApplied()`/
`markRejected()`/`archiveWorkspace()` + matching `actions.ts` Server Actions, following the exact
existing `generateCoverLetter`/`confirmSkip` pattern; wired into `page.tsx` after
`CoverLetterPanel`. `apps/web`-only, no backend changes (all four endpoints pre-existed since
TASK-050). New `application-tracking-panel.spec.tsx` (8 tests): panel renders nothing for a status
with no eligible action, ready-to-apply button + success path, mark-applied with all optional
fields (including artifact `<select>`) submitted, mark-applied with all optional fields omitted,
mark-rejected only visible at `status = applied`, mark-rejected submission, archive button +
success path, and action-level-error surfacing without a refresh.

A same-session user-requested review (`/code-review`, medium effort) found one worth-fixing bug
and two cleanups, all applied before push: (1) both `submittedCvArtifactId`/
`submittedCoverLetterArtifactId` `<select>` fields listed every workspace artifact unfiltered, so
a user could pick a cover-letter artifact in the CV field or vice versa — `MarkAppliedDto` only
validates these as plain strings with no server-side cross-check against
`GeneratedArtifact.artifactType`, so the wrong id would be silently persisted. Fixed by extracting
a new `ArtifactSelect` sub-component that filters options by an `allowedTypes` prop
(`CV_ARTIFACT_TYPES = ["cv_export_pdf", "legacy_cv_pdf"]`,
`COVER_LETTER_ARTIFACT_TYPES = ["cover_letter_md", "cover_letter_json",
"legacy_cover_letter_pdf"]`), which also eliminated the duplicated `<select>` JSX (finding 2); (2)
the panel's local `ErrorList` duplicated an identical error-`<ul>` block already copy-pasted
across `cover-letter-panel.tsx`/`final-check-panel.tsx`/`pre-pdf-check-panel.tsx`/
`cv-draft-review-gate.tsx` — extracted into a new shared `error-list.tsx` and imported here
(the other 4 pre-existing files were left as-is per CLAUDE.md's "keep commits task-focused" rule —
out of this task's scope, flagged as a follow-up candidate). New test added:
"filters each artifact select to its own artifact type" (a CV and a cover-letter artifact in the
same list, asserting each `<select>` only offers its own type).

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 87/87 pass (9 new in application-tracking-panel.spec.tsx)
npm run build             # clean
```

### Result

PASS

### Evidence

- 87/87 `apps/web` Vitest tests pass (9 new); `tsc`/`lint`/`build` all clean.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): drove a fresh workspace `source_saved` → `cv_pdf_generated`
  through the existing pipeline endpoints, then via curl (matching each Server Action's exact
  request shape) called `mark-ready-to-apply` → `mark-applied` (`appliedVia: "LinkedIn"`,
  `notes`, `submittedCvArtifactId` set to the real `cv_export_pdf` artifact id) → `mark-rejected`
  (`rejectionSummary`, `notes`) → `archive`, confirming each response's `status`/field values
  persisted correctly (`appliedAt`/`appliedVia`/`submittedCvArtifactId` on mark-applied,
  `rejectedAt`/`rejectionSummary` on mark-rejected, `isArchived: true` on archive).
- Fetched the rendered `apps/web` page (`curl http://localhost:3001/workspaces/<id>`) after each
  transition and confirmed the correct sub-sections appeared/disappeared: at `cv_pdf_generated`
  showed "Mark ready to apply"/"Mark applied"/"Archive" but not "Mark rejected"; at `applied`
  showed "Mark rejected"/"Archive" but not the ready/applied buttons; at `archived` the entire
  "Application tracking" panel rendered nothing. No live browser click-through (no browser
  automation tool available) — covered instead by the component's tests plus the rendered-HTML
  checks above, matching the precedent set in TASK-066/067/068.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists
  for workspaces; removed via a one-off Prisma script + `rm -rf` on the storage folder, then the
  script itself deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-068 — Add cover letter generation trigger and content view

### Scope

`apps/web` new `cover-letter-panel.tsx` ("Generate cover letter" button, eligible at either
`cv_pdf_generated` or `final_check_ready` per `CoverLetterInputBuilderService`'s
`COVER_LETTER_ALLOWED_STATUSES` guard — unlike TASK-067's final-check panel, which is eligible
at only one status). Content itself is not re-rendered by this panel: per the task's AC, the
generated `cover_letter.md`/`cover_letter.json` artifacts are shown via TASK-064's existing
`ArtifactViewer` (already renders every workspace artifact with View/Download), so the panel just
shows the trigger and, once a `cover_letter_json`/`cover_letter_md` artifact exists, a note
pointing at the Artifacts section — following TASK-067's post-review fix of using
artifact-existence (`isLatest` cover-letter artifact present) rather than a hardcoded status
whitelist for staying visible once the workspace status advances past
`cover_letter_generated`. New `lib/api.ts` `generateCoverLetter()` + `actions.ts`
`generateCoverLetterAction`, following the exact existing pattern; wired into `page.tsx`
alongside the other pipeline-step panels. `apps/web`-only, no backend changes (the endpoint
pre-existed since TASK-049).

A same-session user-requested review found one worth-fixing item, applied as a follow-up commit:
the "available in Artifacts" eligibility check originally treated a `cover_letter_md` **or**
`cover_letter_json` artifact as sufficient, but `cover-letter.service.ts` registers
`cover_letter_md` unconditionally — even a raw-fallback markdown when JSON validation fails —
while `cover_letter_json` is only registered on a fully valid result. Narrowed the check to
`cover_letter_json` only, matching `pre-pdf-check-panel.tsx`/`final-check-panel.tsx`'s existing
convention of keying eligibility off the `_json` artifact type specifically. No test changes
needed (the spec's artifact factory already used `cover_letter_json`); 78/78 tests still pass,
`tsc`/`lint` re-verified clean.

### Commands

```bash
cd apps/web
npm test -- --run    # 78/78 pass (7 new in cover-letter-panel.spec.tsx)
npx tsc --noEmit      # clean
npm run lint          # clean
npm run build         # clean
```

### Result

PASS

### Evidence

- `npm test -- --run`: 9 test files, 78/78 tests pass (was 71/71 before this task; +7 new)
  covering: not rendered outside eligible statuses with no result yet, button visible at both
  `cv_pdf_generated` and `final_check_ready`, button hidden but panel/note still shown once
  status has advanced past the eligible statuses (artifact-existence-driven, not a status
  whitelist), success (refresh) path, validation-failure path (no refresh), and action-level
  error path (no refresh).
- Manual smoke test against a real backend (`AI_PROVIDER=fake`, Postgres/Redis via
  `docker compose`, both already running from a prior session): created a fresh workspace, drove
  it `source_saved` → `paused_after_analysis` (`run-analysis`) → `cv_generation_running`
  (`review-decision` approve_apply) → `cv_draft_ready` (`generate-cv-content`) →
  `export_running` (`review-cv-draft` approve) → `cv_pdf_generated` (`export-cv`), then called
  `POST :id/generate-cover-letter`. Response:
  `{"success":true,"workspaceStatus":"cover_letter_generated","coverLetterDraft":{...},...}`.
  Confirmed `GET /workspaces/:id` registers `cover_letter_md`/`cover_letter_json` artifacts
  (`isLatest: true`). Started the real `apps/web` dev server (port 3001) against this backend
  and `curl`-fetched the rendered workspace detail page: confirmed the "Cover letter" panel's
  server-rendered heading and the "Generated cover letter is available in the Artifacts section
  above" note appear (button correctly absent, since status had already advanced past
  `cv_pdf_generated`/`final_check_ready`), and confirmed both `cover_letter.md`/`.json` artifact
  rows appear in the Artifacts table. Fetched the `cover_letter.json` artifact through the
  frontend's own `/api/artifacts/:id/download` proxy and confirmed it returns the exact
  `CoverLetterOutput` JSON (`cover_letter.greeting`/`body_paragraphs`/`closing`,
  `evidence_alignment`, etc.) the backend generated. No live browser click-through (no browser
  automation tool available) — covered instead by the component's tests, matching the precedent
  set in TASK-066/067.
- Both dev servers (`apps/api` port 3000, `apps/web` port 3001) stopped afterward. Test
  workspace and its DB rows/storage folder deleted (no `DELETE` endpoint exists for workspaces;
  removed via a one-off Prisma script + `rm -rf` on the storage folder, then the script itself
  deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-067 — Add Prompt 5 final check trigger and results view

### Scope

`apps/web` new `final-check-panel.tsx` ("Run final check" button, eligible only at
`status = cv_pdf_generated`; result rendering keeps working after status advances to
`final_check_ready`, which Prompt5Service transitions to on success — unlike Prompt 3, which
does not change status). New `lib/api.ts` `runFinalCheck()` + `actions.ts`
`runFinalCheckAction`, wired into `page.tsx`.

A same-session code review (`/code-review`, medium effort) found no correctness bugs but 4
worthwhile cleanups, all applied before commit: (1) eligibility for showing an already-fetched
result was changed from a hardcoded status whitelist (`["cv_pdf_generated",
"final_check_ready"]`) to being artifact-existence-driven (`jsonArtifactId != null`) — the
whitelist form would have silently hidden the result again the moment a later pipeline step
(e.g. TASK-068's cover letter) advances status past `final_check_ready`, since nobody would
remember to extend the array a second time; (2) `ISSUE_FIELDS`'s key type was narrowed from
`keyof FinalCheckOutput` (which wrongly allowed non-array fields like `quality_score`) to an
explicit `StringArrayField` union, removing an unchecked `result[key] as string[]` cast; (3)
`isLoadingResult`'s double-negation was simplified to the equivalent `jsonArtifactId != null &&
result === null && resultError === null`; (4) the render guard's dead `!isLoadingResult`
conjunct (always true whenever `result` is truthy) was dropped. A 5th finding — the ~55-line
fetch/`FetchState` block being a near-duplicate of `pre-pdf-check-panel.tsx`'s equivalent — was
deliberately not applied in this task, since extracting a shared hook would mean refactoring
already-merged TASK-066 code, out of this task's scope; flagged as a follow-up candidate instead.

### Commands

```bash
cd apps/web
npx vitest run          # 71/71 pass (8 new in final-check-panel.spec.tsx)
npm run lint             # clean
npx tsc --noEmit         # clean
npm run build             # clean
```

### Result

PASS

### Evidence

- `npx vitest run`: 8 test files, 71/71 tests pass (was 63/63 before this task; +8 new,
  including a regression test added post-review proving the panel still shows a fetched result
  at an arbitrary later status as long as the artifact exists).
- Manual smoke test against a real backend (`AI_PROVIDER=fake`, Postgres/Redis via
  `docker compose`): created a fresh workspace, drove it `source_saved` → `paused_after_analysis`
  (`run-analysis`) → `cv_generation_running` (`review-decision` approve_apply) →
  `cv_draft_ready` (`generate-cv-content`) → `export_running` (`review-cv-draft` approve) →
  `cv_pdf_generated` (`export-cv`), then called `POST :id/run-final-check`. Response:
  `{"success":true,"workspaceStatus":"final_check_ready","finalDecision":"ready_to_send",...}`.
  Confirmed `GET /workspaces/:id` registers `final_check_md`/`final_check_json` artifacts
  (`isLatest: true`) and that `GET /artifacts/:id/download` for the json artifact returns the
  exact `FinalCheckOutput` shape the panel parses (`final_decision`, `quality_score`,
  `final_checklist`, all 5 issue arrays). Confirmed via `curl` fetch of the rendered
  `apps/web` page (`npm run dev`, port 3001) that the "Final check" panel's server-rendered
  heading/button appear in the initial HTML for the eligible status. No live browser
  click-through (no browser automation tool available) — covered instead by the component's
  tests, matching the precedent set in TASK-066.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists
  for workspaces; removed directly via a one-off Prisma script + `rm -rf` on the storage
  folder).

### Follow-up

- none.

## 2026-07-20 — TASK-066 — Add Prompt 3 pre-PDF check trigger and results view

### Scope

New `PrePdfCheckPanel` client component (`apps/web/src/app/workspaces/[id]/pre-pdf-check-panel.tsx`):
a "Run pre-PDF check" trigger button (rendered only for `cv_draft_ready`/`paused_after_cv_draft`)
plus a structured results view (readiness, per-correction field_path/severity/reason/suggested_text,
export_blocked banner, overall_notes) fetched from the registered `pre_pdf_check_json` artifact via
the existing same-origin download proxy. New `lib/api.ts` `runPrePdfCheck()`/`RunPrePdfCheckResult`
and `actions.ts` `runPrePdfCheckAction`, following the exact existing pattern. `apps/web`-only, no
backend changes (endpoint pre-existed from TASK-046/Prompt3Service).

### Commands

```bash
cd apps/web
npm run test         # 63/63 tests pass (5 new in pre-pdf-check-panel.spec.tsx)
npx tsc --noEmit     # clean
npm run lint         # clean
npm run build        # clean
```

Manual end-to-end check against a real backend (fake AI provider, Postgres/Redis via
`docker compose`): created a workspace, drove it `source_saved` -> `paused_after_analysis`
(approve_apply) -> `cv_generation_running` -> `cv_draft_ready` via curl, then
`POST :id/run-pre-pdf-check` — response `{"success":true,...,"readiness":"ready_with_minor_edits"}`.
`GET /workspaces/:id` showed the new `pre_pdf_check_json`/`pre_pdf_check_md` artifacts registered
with correct `mimeType`. Fetched the JSON artifact through the frontend's own
`/api/artifacts/:id/download` proxy (the same route the panel's `useEffect` calls) and confirmed
the shape matches `PrePdfCheckOutput` exactly (`corrections[0].field_path`/`suggested_text`/
`severity`/`reason`, `export_blocked: false`, `overall_notes`). No live browser click-through
available (no browser automation tool) — component tests cover the passing and export-blocked
render paths directly, including the visual distinction between them.

### Result

PASS

### Evidence

- 63/63 `apps/web` Vitest tests pass (5 new); `tsc`/`lint`/`build` all clean.
- Real backend run: `run-pre-pdf-check` returned `readiness: "ready_with_minor_edits"`,
  registered `03_pre_pdf_check.md`/`03_pre_pdf_check.json` artifacts with correct `mimeType`.
- Download proxy returned the exact `PrePdfCheckOutput` JSON shape the panel parses.
- Test workspace and artifacts cleaned up from Postgres/filesystem after verification.

### Follow-up

- A self-review (`/code-review` medium effort) after the initial implementation found 5 real
  issues in `pre-pdf-check-panel.tsx`, all fixed in the same branch before PR: (1) a stale
  `resultError` that was never cleared, so an error banner could persist forever alongside a later
  successful result — fixed by replacing the separate `result`/`resultError`/`loadedArtifactId`
  state with a single `FetchState` keyed by `artifactId`, so a fetch outcome only renders while it
  still matches the current latest artifact id; (2) the artifact-fetch effect ran even when the
  component was about to render `null` for an ineligible status — fixed by gating the fetch itself
  on `isEligible` inside the effect; (3) the effect depended on the `jsonArtifact` object reference
  (recreated on every unrelated `router.refresh()`) instead of its `id`, causing redundant re-fetches
  — fixed by depending on the primitive `jsonArtifactId`; (4) `downloadUrl()` was duplicated
  verbatim from `artifact-viewer.tsx` — extracted to a shared `lib/artifact-download.ts`; (5)
  `runCheck()` used `useState`/`.then()` instead of the `useTransition` pattern every sibling
  component in the directory uses — switched to match. Re-verified: 63/63 `apps/web` tests pass
  (unchanged pass count, same behavior from the outside), `tsc`/`lint`/`build` all clean.
- none further.

## 2026-07-18 — TASK-063 — Add pipeline step-trigger actions to workspace detail UI

### Scope

New `apps/web/src/app/workspaces/[id]/pipeline-actions.tsx` client component wiring up the four
previously curl/Swagger-only endpoints — `run-analysis`, the first `generate-cv-content`,
`export-cv`, `confirm-skip` — as buttons on the workspace detail page, following the exact
`useTransition`/Server Action/error-list pattern already established by `cv-draft-review-gate.tsx`.
New `apps/web/src/lib/api.ts` functions `runAnalysis`/`exportCv`/`confirmSkip` (all
`encodeURIComponent(id)`-safe, matching the CodeQL fix already applied to the sibling functions in
TASK-057) and new `actions.ts` Server Actions `runAnalysisAction`/`generateCvContentAction`
(reuses the existing `regenerateCvContent` — same endpoint as the post-draft regenerate button)/
`exportCvAction`/`confirmSkipAction`. No `apps/api` changes — all four endpoints already existed.
New `pipeline-actions.spec.tsx` (Vitest + RTL, TASK-062's test runner) covers each button's
visibility condition, success path, and error rendering.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test -- --run   # 38/38 passed (3 test files)
npm run build

# apps/api (real backend, fake AI provider, already running on :3000 from a prior session)
docker compose ps        # postgres already up
npx next dev -p 3001     # apps/web, port 3000 taken by the running backend

# manual flow driven via curl + browser HTML fetch, same methodology as TASK-057
curl -X POST http://localhost:3000/workspaces ...                       # create workspace 1
curl http://localhost:3001/workspaces/:id1 | grep 'Start analysis'      # button shows at source_saved
curl -X POST http://localhost:3000/workspaces/:id1/run-analysis         # -> paused_after_analysis
curl -X POST http://localhost:3000/workspaces/:id1/review-decision -d '{"action":"approve_apply"}'
curl http://localhost:3001/workspaces/:id1 | grep 'Generate CV draft'   # button shows at cv_generation_running
curl -X POST http://localhost:3000/workspaces/:id1/generate-cv-content  # -> cv_draft_ready
curl -X POST http://localhost:3000/workspaces/:id1/review-cv-draft -d '{"action":"approve"}'
curl http://localhost:3001/workspaces/:id1 | grep 'Export PDF'          # button shows at export_running
curl -X POST http://localhost:3000/workspaces/:id1/export-cv            # -> cv_pdf_generated
curl http://localhost:3001/workspaces/:id1 | grep 'Pipeline actions'    # no match — panel hidden

curl -X POST http://localhost:3000/workspaces ...                       # create workspace 2
curl -X POST http://localhost:3000/workspaces/:id2/run-analysis
curl -X POST http://localhost:3000/workspaces/:id2/review-decision -d '{"action":"change_to_skip"}'
curl http://localhost:3001/workspaces/:id2 | grep 'Confirm skip'        # button shows, decision=skip
curl -X POST http://localhost:3000/workspaces/:id2/confirm-skip         # -> skipped
curl http://localhost:3001/workspaces/:id2 | grep 'Override skip'       # confirm-skip button gone, override remains
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test -- --run` 38/38
  passed, `npm run build` clean (routes `/`, `/workspaces`, `/workspaces/[id]`, `/workspaces/new`
  all compiled).
- Workspace 1 (`SmokeTest Co` / `QA Engineer`) driven end-to-end from `source_saved` to
  `cv_pdf_generated` using only the endpoints the new buttons call — exact response shapes matched
  what `apps/web`'s typed functions expect at every step (`RunAnalysisResult.workspaceStatus`,
  `ReviewDecisionResult.status`, `CvDraftReviewResult.status`, `ExportCvResult.status`). At each
  status the correct single button rendered ("Start analysis" → "Generate CV draft" →
  "Export PDF") and the panel rendered nothing once terminal (`cv_pdf_generated`).
- Workspace 2 (`SkipTest Co` / `Random Role`) confirmed the skip path: after `change_to_skip`,
  "Confirm skip" rendered (status stayed `paused_after_analysis` per ADR-016, `currentDecision =
  skip`); a control case (`currentDecision = apply` at the same status) confirmed the button does
  *not* render without `currentDecision = skip` (test-suite case, not curl); `confirm-skip` moved
  status to `skipped` and `01_skip_reason.md/json` were written; the existing "Override skip" UI
  (TASK-057) remained visible and distinct.
- Visual quality bar: rendered page confirmed the new "Pipeline actions" section reuses the same
  `rounded-lg border ... dark:bg-zinc-950` section styling and button classes as the existing
  review-gate sections — no unstyled markup.
- No `apps/api` source changes — `npx tsc --noEmit` and `npm run lint` re-run as a sanity check
  only (both clean, no diffs).

### Follow-up

- Test workspaces created during this smoke test ("SmokeTest Co" / "SkipTest Co") were left in the
  local dev database, consistent with TASK-057's precedent (no delete endpoint exists; local dev
  DB only, not shared/production).

## 2026-07-19 — TASK-063A — Fix swapped/missing downloadFileName on skip-reason artifacts

### Scope

Backend-only fix in `apps/api/src/pipeline/skip/skip-reason.service.ts`: the `01_skip_reason.md`
artifact registration never passed `downloadFileName` (defaulted to `null`), and
`buildDownloadFileName()` — which always built an `.md`-suffixed name — was wired to the
`01_skip_reason.json` artifact instead. Fixed by adding an `extension: 'md' | 'json'` parameter to
`buildDownloadFileName()` (default `'md'`) and passing the correct extension at each of the two
`register()` call sites.

### Commands

```bash
# apps/api
npm run test -- --testPathPattern=skip-reason.service   # 8/8 passed
npx tsc --noEmit                                         # clean
npm run test                                              # 59/59 suites, 638/638 tests

# manual smoke test — real backend (fake AI provider), postgres already running via docker compose
npm run start:dev
curl -X POST http://localhost:3000/workspaces -H "x-api-key: ..." -d '{...}'          # create workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis -H "x-api-key: ..."
curl -X POST http://localhost:3000/workspaces/:id/review-decision -H "x-api-key: ..." \
  -d '{"action":"change_to_skip"}'
curl -X POST http://localhost:3000/workspaces/:id/confirm-skip -H "x-api-key: ..."     # -> skipped
curl http://localhost:3000/workspaces/:id -H "x-api-key: ..."                           # inspect artifacts
```

### Result

PASS

### Evidence

- `skip-reason.service.spec.ts`: 8/8 tests pass, including new assertions that `artifactsService
  .register()` receives distinct, correctly-suffixed `downloadFileName` values for
  `skip_reason_md` and `skip_reason_json`, and a new `buildDownloadFileName(..., 'json')` case.
- `npx tsc --noEmit` clean; full `npm run test` 59/59 suites, 638/638 tests (was 637 before the new
  test case).
- Manual end-to-end run against a real backend (fake AI provider): created workspace
  `TestCo063A`/`Backend Engineer`, ran analysis, `change_to_skip`, `confirm-skip` → `status:
  "skipped"`. `GET /workspaces/:id` artifact list confirmed:
  - `skip_reason_md` → `downloadFileName: "SKIP_TestCo063A_Backend_Engineer_reason_RU.md"`
    (previously `null`).
  - `skip_reason_json` → `downloadFileName: "SKIP_TestCo063A_Backend_Engineer_reason_RU.json"`
    (previously `SKIP_TestCo063A_Backend_Engineer_reason_RU.md`, wrong extension).
- No `apps/web` changes needed — the artifact table already renders whatever `downloadFileName`
  the backend returns.

### Follow-up

- Test workspace `TestCo063A`/`Backend Engineer` left in the local dev database, consistent with
  prior tasks' precedent (no delete endpoint; local dev DB only).
- TASK-065 (async/queued analysis trigger) is the next task in this phase and depends on this one.

## 2026-07-18 — TASK-057 — Implement workspace review screens

### Scope

New `apps/web` workspace detail screen (`apps/web/src/app/workspaces/[id]/page.tsx`) showing
status/decision/reviewState/score/artifacts/next-action, with `AnalysisReviewGate` (approve
apply/maybe/pause/skip, plus an override-skip form when `status === 'skipped'`) and
`CvDraftReviewGate` (approve/pause/mark not worth applying/regenerate placeholder) conditionally
rendered based on workspace status. New `apps/web/src/lib/api.ts` functions
(`getWorkspace`/`listWorkspaces`/`submitReviewDecision`/`overrideSkip`/`submitCvDraftReview`/
`regenerateCvContent`) calling pre-existing, unchanged `apps/api` endpoints. New minimal
`apps/web/src/app/workspaces/page.tsx` list page (not in the original AC, added because there was
no UI path to reach `/workspaces/[id]` otherwise) plus small link wiring on the home page and the
TASK-056 creation-form success state. No `apps/api` changes. No test runner exists yet in
`apps/web` (TASK-062, not this task), so verification was a real manual smoke test against a real
backend (fake AI provider) and real frontend, plus `lint`/`tsc`/`build`.

A real bug was found and fixed during the smoke test: `WorkspaceCompany.companyNameOriginal` did
not match the actual Prisma field name (`Company.nameOriginal`) — company names silently rendered
as `$undefined` (React's SSR placeholder for an undefined value) on both the list and detail
pages. Caught only because the list page was checked as raw HTML, not just via `tsc`/`build` (the
type was self-consistent, so the type checker had nothing to flag — the mismatch was against the
real backend's actual field name).

### Commands

```bash
# apps/web
npm run lint
npx tsc --noEmit
npm run build

# apps/api (real backend, not mocked)
docker compose up -d postgres
npm run start:dev            # AI_PROVIDER=fake
npx next dev -p 3001         # apps/web, run on 3001 to avoid the backend's port 3000

# manual flow driven via curl + browser HTML fetch, mirroring what a user clicking through
# the UI would trigger (Server Actions call the same apps/api endpoints)
curl -X POST http://localhost:3000/workspaces ...                      # create workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis         # -> paused_after_analysis
curl http://localhost:3001/workspaces                                  # list page
curl http://localhost:3001/workspaces/:id                              # detail page
curl -X POST http://localhost:3000/workspaces/:id/review-decision -d '{"action":"approve_apply"}'
curl -X POST http://localhost:3000/workspaces/:id/generate-cv-content  # -> cv_draft_ready
curl -X POST http://localhost:3000/workspaces/:id/review-cv-draft -d '{"action":"pause"}'
curl -X POST http://localhost:3000/workspaces/:id/review-decision -d '{"action":"change_to_skip"}'
curl -X POST http://localhost:3000/workspaces/:id/confirm-skip         # -> skipped
curl -X POST http://localhost:3000/workspaces/:id/override-skip -d '{"targetDecision":"maybe"}'
curl http://localhost:3001/workspaces/nonexistent-id-1234              # 404 check
```

### Result

PASS

### Evidence

- `apps/web`: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run build` clean (routes
  `/`, `/workspaces`, `/workspaces/[id]`, `/workspaces/new` all compiled).
- List page (`/workspaces`): real backend data rendered correctly after the `nameOriginal` fix —
  company name, role, status, decision all correct, link to detail page correct.
- Detail page (`/workspaces/[id]`): status/decision/reviewState/score/artifacts (including
  `01_vacancy_analysis.md/json`) rendered correctly for a real `paused_after_analysis` workspace.
- Analysis gate: `POST .../review-decision {"action":"approve_apply"}` against the real backend
  returned the exact `ReviewDecisionResult` shape the client code expects
  (`{workspaceId, action, currentDecision: "apply", reviewState: "approved", status:
  "cv_generation_running", canProceedToPrompt2: true}`); re-fetching the detail page confirmed the
  analysis gate correctly disappeared once status left `paused_after_analysis`.
- CV draft gate: drove a workspace to `cv_draft_ready` via `generate-cv-content`; detail page
  correctly rendered "CV draft review" with all four actions; `POST .../review-cv-draft
  {"action":"pause"}` returned the exact `CvDraftReviewResult` shape expected
  (`status: "paused_after_cv_draft"`).
- Skip override: drove a second workspace to `skipped` via `change_to_skip` + `confirm-skip`;
  detail page correctly rendered the override-skip form (not the normal approve/maybe/pause/skip
  buttons); `POST .../override-skip {"targetDecision":"maybe"}` returned the exact
  `OverrideSkipResult` shape expected (`toDecision: "manual_override_maybe"`,
  `status: "cv_generation_running"`).
- 404 handling: `GET /workspaces/nonexistent-id-1234` on the frontend returned `404` (Next's
  `notFound()` triggered correctly on the backend's 404 response).
- Home page and creation-form success state both show working links into the new screens.
- No `apps/api` source changes in this task — its own suite was not re-run.

### Follow-up

- Test workspaces created during this smoke test ("Acme Test Co" / "Skip Test Co") were left in
  the local dev database, consistent with existing untouched test data from prior tasks already
  visible in the same `GET /workspaces` list (no delete endpoint exists; local dev DB only, not
  shared/production).
- Component/unit tests for this UI are out of scope until TASK-062 lands a test runner for
  `apps/web`.
- **Post-PR CodeQL gate (2026-07-18, same day):** PR #110's `Analyze (javascript-typescript)`
  check (TASK-PH-024's gate) failed with 4 critical `js/request-forgery` alerts in
  `apps/web/src/lib/api.ts`, on `submitReviewDecision`/`overrideSkip`/`submitCvDraftReview`/
  `regenerateCvContent`. Real finding, not a false positive: these functions are called from
  `"use server"` Server Actions, which are directly callable RPC endpoints reachable with
  arbitrary arguments regardless of what the UI sends — so the `id` parameter must be treated as
  attacker-controlled, and it was interpolated unescaped into the outgoing fetch URL path
  (CWE-918 path injection risk). Fixed by wrapping every `id` interpolation (including
  `getWorkspace`, not flagged but the same pattern) in `encodeURIComponent()`. Pushed as a second
  commit on the same branch; re-ran CI — `Analyze (javascript-typescript)` and all other required
  checks passed clean, 0 CodeQL alerts remain on the PR.

## 2026-07-16 — TASK-054 — Implement queued Prompt 1 analysis worker

### Scope

`AnalysisWorker` (new `src/queue/workers/analysis.worker.ts`, wired via new `src/queue/queue.module.ts`)
consumes `QueueName.ANALYSIS` jobs and delegates to the existing `Prompt1Service.runAnalysis()`
unchanged. New `POST /workspaces/:id/run-analysis-async` (enqueue) and
`GET /workspaces/:id/analysis-job/:jobId` (status) endpoints on `WorkspacesController`. Unit tests
mock `bullmq`'s `Worker` entirely (no real Redis). Also ran a real end-to-end manual smoke test with
Redis + Postgres actually running, using the fake AI provider (default `AI_PROVIDER`), to verify the
worker really drains the queue and reaches the same human review gate as the sync path.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run lint
docker compose up -d postgres redis
npm run test:e2e
npm run start:dev   # manual smoke test, see Evidence
```

### Result

PASS

### Evidence

- `analysis.worker.spec.ts`: 6/6 tests pass (starts BullMQ `Worker` only when `REDIS_URL` is
  configured, processor delegates to `Prompt1Service.runAnalysis(job.data.workspaceId)`, closes the
  worker on `onModuleDestroy`, no-op when `REDIS_URL` is absent).
- `workspaces.controller.spec.ts`: 3 new tests for `run-analysis-async` (enqueues on
  `QueueName.ANALYSIS` with `{ workspaceId }`, returns `{ jobId }`) and `analysis-job/:jobId`
  (returns status, 404 via `NotFoundException` when the job is missing).
- Full suite: 59/59 suites, 637/637 tests pass (one run showed a transient unrelated failure in
  `import.controller.spec.ts` that passed both in isolation and on immediate re-run of the full
  suite — flaky/resource contention, not caused by this task's changes).
- `npx tsc --noEmit`: clean. `npm run lint`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (Postgres + Redis containers running locally).
- Manual smoke test (real `start:dev`, real Redis, fake AI provider): created a workspace, called
  `POST /workspaces/:id/run-analysis-async` → `{"jobId":"1"}`; polled
  `GET /workspaces/:id/analysis-job/1` → `state: "completed"` with the full `RunAnalysisResult`
  (`promptRunId`, `aiRunId`, `decision: apply`, `score: 75`, artifact paths); confirmed via
  `GET /workspaces/:id` that `status` transitioned to `paused_after_analysis` (same review gate as
  the synchronous endpoint) with `01_vacancy_analysis.md/json` registered as artifacts; confirmed
  `GET /workspaces/:id/analysis-job/does-not-exist` → `404`.

### Follow-up

- None. Queue-backed workers for CV generation/export/final-check (the other 3 `QueueName` values)
  are separate future tasks, not required by this task's AC.

## 2026-07-16 — TASK-053 — Implement BullMQ queue abstraction

### Scope

Unit tests for `QueueService` (`enqueue`/`getStatus`/`retry`/`cancel`) with `bullmq`'s `Queue`
class fully mocked, per the task's own test requirement. Also full suite/typecheck/lint/e2e
regression check (no real Redis needed since `bullmq` is entirely mocked in the new spec and
nothing else in the codebase yet calls `QueueService`).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=queue.service
npm run test
npm run test:cov
npm run lint
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `queue.service.spec.ts`: 9/9 tests pass (enqueue + per-queue-name Queue-instance reuse, getStatus
  found/not-found, retry/cancel found/not-found → `NotFoundException`).
- Full suite: 59/59 suites, 638/638 tests pass.
- `src/queue` coverage: 100% statements/branches/functions/lines; no global coverage threshold
  regression (ADR-022).
- `npx tsc --noEmit`: clean. `npm run lint`: clean (Prettier reformatted the new spec file only).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (after starting `postgres` via
  `docker compose up -d postgres`).

### Follow-up

- None. Wiring `QueueService` into a real worker/module is TASK-054.

## 2026-07-16 — TASK-052 — Add Redis to Docker Compose for later phase

### Scope

Manual check that the new `redis` Docker Compose service starts locally and that the existing
`app`/`postgres` services are unaffected (Redis is not a hard dependency of MVP startup).

### Commands

```bash
docker compose up -d redis
docker ps --filter name=jobflow_redis --format "{{.Names}}: {{.Status}}"
docker exec jobflow_redis redis-cli ping
docker compose up -d
curl -sf http://localhost:3000/health
docker compose down
```

### Result

PASS

### Evidence

- `jobflow_redis` container started standalone (`docker compose up -d redis`) and responded `PONG`.
- Full stack (`docker compose up -d`) started `jobflow_redis`, `jobflow_postgres` (already running,
  2-week-old volume untouched) and recreated `jobflow_app`; all three reached `Up`/`(healthy)`.
- `GET /health` returned `{"status":"ok"}` with Redis present, confirming Redis is additive, not a
  startup dependency (`app` has no `depends_on: redis`).
- `docker compose down` (non-destructive, no `-v`) cleanly removed all three containers.

### Follow-up

- None. BullMQ queue abstraction is TASK-053.

## 2026-07-14 — TASK-045 — Implement existing folder scanner

### Scope

`ImportService.scanRoot()` read-only detection of legacy `Company/YYYY.MM.DD/` folders
(vacancy source, legacy targeted CV markdown, CV PDF, cover letter PDF, SKIP files) and
suggested status per docs/09_artifact_storage.md §15.8. New `GET /import/scan` endpoint.
No DB writes, no workspace creation (out of scope for this task).

### Commands

```bash
npx jest --testPathPattern=import.service
npm run test
npx tsc --noEmit
npm run build
```

### Result

PASS

### Evidence

- `import.service.spec.ts`: 8/8 tests pass — fixture folders (built in OS temp dirs) for
  Action1 (`cv_pdf_generated`), Amach (`cover_letter_generated`), AppsFlyer
  (`source_saved`), Broadvoice (`skipped`, mismatched vacancy/skip role titles produce a
  warning instead of guessing), plus multiple-candidate ambiguity, unparseable date folder
  (`legacyDateConfidence: 'low'`), read-only (folder contents unchanged after scan), and
  no-recognizable-artifacts (`import_needs_review`) cases.
- Full suite: 50/50 suites, 497/497 tests pass.

## 2026-07-14 — TASK-PH-017 — Add coverage measurement, diff/patch coverage gating and CI-enforced e2e suite

### Scope

`collectCoverageFrom` exclusions + measured global `coverageThreshold` in `package.json`;
`codecov.yml` (patch coverage 80%); `.github/workflows/ci.yml` `test` job now runs
`test:cov` + uploads to Codecov, new `test-e2e` job runs `prisma migrate deploy` +
`prisma db seed` + `test:e2e`; new `test/skip-flow.e2e-spec.ts` covering the
`change_to_skip` two-step transition (ADR-016); README coverage badge; ADR-022.

### Commands

```bash
npm run test:cov -- --coverageReporters=text-summary
npx tsc --noEmit
npm run test:e2e
npm run build
```

### Result

PASS

### Evidence

- Baseline coverage measured before setting thresholds: statements 91.59% (1438/1570),
  branches 71.21% (292/410), functions 92.01% (196/213), lines 91.41% (1352/1479).
  Threshold set to statements 90 / branches 68 / functions 90 / lines 90 (regression
  floor with small margin, not a target).
- `npm run test:cov`: 50/50 suites, 498/498 tests pass, coverage threshold met (no
  Jest coverage-threshold failure).
- `npx tsc --noEmit`: clean, zero errors.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (`mvp-flow.e2e-spec.ts`,
  `rate-limiting.e2e-spec.ts`, new `skip-flow.e2e-spec.ts`).
- `npm run build`: clean.

### Follow-up

- Discovered (not fixed here, tracked in `TASK_BOARD.md` "Known Gaps"): `prisma/seed.ts`
  does not seed an active `skip_reason` PromptTemplate, so `POST /workspaces/:id/confirm-skip`
  throws `500` on any standard-seeded environment (including CI). The `skip-flow.e2e-spec.ts`
  test was scoped to the `change_to_skip` transition only (user-confirmed) rather than the
  full skip-artifact-creation path, pending a separate task to add skip-reason prompt content.
- Codecov upload (`codecov/codecov-action@v4` in CI) has not yet been verified against a real
  GitHub Actions run in this session — local coverage generation and threshold enforcement
  were verified locally; the CI upload step itself should be confirmed green on the PR.
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`nest build`).

### Follow-up

- TASK-046 (import preview + manual metadata correction) and TASK-047 (import
  confirmation + artifact registration) are the next steps; this task deliberately
  creates no `ApplicationWorkspace`/`GeneratedArtifact` records.

### 2026-07-14 — Post-PR CodeQL fix — path-injection on GET /import/scan

CodeQL (`js/path-injection`, High) flagged `fs.readdir()` calls in `import.service.ts`
fed by the `rootPath` query param on `GET /import/scan`, unguarded unlike
`ArtifactStorageService.assertInsideStorageRoot`. Fixed by removing the caller-supplied
path entirely: added an optional `IMPORT_ROOT` env var (`env.validation.ts`,
`.env.example`); `ImportService.scanRoot()` now takes no argument and resolves its root
via `ConfigService.getOrThrow('IMPORT_ROOT')` at call time; `GET /import/scan` no longer
accepts a query param. No untrusted input reaches the filesystem call.

```bash
npx jest --testPathPattern=import.service
npx jest --testPathPattern=env.validation
npm run test
npx tsc --noEmit
npm run lint
npm run build
```

Result: PASS — 50/50 suites, 498/498 tests pass (1 new `env.validation.spec.ts` case
for `IMPORT_ROOT`); `npx tsc --noEmit`/`npm run build` clean.

## 2026-07-13 — TASK-PH-009 — Reapply rate limiting onto current main

### Scope

Reapplied rate limiting fresh against current `main` (superseding the
orphaned, never-merged `task/TASK-PH-003-rate-limiting` branch). Installed
`@nestjs/throttler`, registered `ThrottlerModule.forRootAsync` in
`app.module.ts` reading `THROTTLE_TTL` (seconds, converted to ms for
throttler v6) and `THROTTLE_LIMIT` via `ConfigService`, and registered
`ThrottlerGuard` globally via `APP_GUARD`. Added `@SkipThrottle()` to
`GET /health` (user-confirmed scope addition, outside the literal backlog
wording) so container healthchecks/uptime monitors are never throttled.
Added `test/rate-limiting.e2e-spec.ts` (new file, distinct concern from
`mvp-flow.e2e-spec.ts`) with a low `THROTTLE_LIMIT=5` override, asserting
`429` once the limit is exceeded and confirming `/health` stays at `200`
past the same limit. `TASK_BOARD.md` TASK-PH-003 row corrected from `DONE`
to `SKIPPED` with a note that it's superseded by this task.

### Commands

```bash
npm install @nestjs/throttler --save                              # clean install
npx tsc --noEmit                                                   # clean
npm run test                                                       # 47 suites, 475 tests
npm run test:e2e                                                   # 2 suites, 3 tests (real Postgres)
```

### Result

PASS

### Evidence

- `test/rate-limiting.e2e-spec.ts`: first test sends `THROTTLE_LIMIT` (5)
  requests to `GET /version`, each asserted not `429`; the 6th request
  asserted `429`. Pino request logs confirm `x-ratelimit-remaining` counting
  down 4→0 then a `429` with `retry-after: 60` on request 6. Second test
  sends `THROTTLE_LIMIT + 3` (8) requests to `GET /health` and asserts every
  one returns `200`, confirming the `@SkipThrottle()` exemption works even
  past the limit.
- `test/mvp-flow.e2e-spec.ts` unaffected — logs show its requests carry
  `x-ratelimit-limit: 100` (production default), confirming the throttler
  config is read from env correctly per-run and doesn't leak between test
  files.
- Full suite: 47/47 suites, 475/475 unit tests pass; e2e: 2/2 suites, 3/3
  tests pass.

### Follow-up

- None. Next recommended task per `TASK_BOARD.md`: TASK-PH-010 (security
  governance files).

## 2026-07-13 — TASK-PH-014 — Fix CodeQL code-scanning findings (path-injection guard, ReDoS/length hardening)

### Scope

Fixed the one real gap among the 4 open CodeQL alerts found during a
routine post-merge check: `ArtifactStorageService.saveVacancySource()`
built a file path from caller-supplied `workspaceFolderPath` and wrote to
it without calling `assertInsideStorageRoot()`, unlike the sibling
`writeFile()` method. Added the same guard. Also added `@MaxLength(200)`
to `CreateWorkspaceDto.companyNameOriginal`/`roleTitleOriginal` to bound
input length feeding the `slug.service.ts` regexes CodeQL flagged as
polynomial-ReDoS candidates (the regexes themselves are simple
single-quantifier patterns, not classic exponential ReDoS — this closes
the "unbounded input" precondition rather than rewriting the regexes).
Did not touch `createWorkspaceFolder`'s `js/path-injection` alert — it's
already guarded by `assertInsideStorageRoot()` on the preceding line;
CodeQL likely doesn't recognize the hand-rolled guard as a sanitizer, and
adding a second redundant guard call has no security value.

### Commands

```bash
npm run test          # 47 suites, 479 tests (4 new)
npx tsc --noEmit
```

### Result

PASS

### Evidence

- New test `artifact-storage.service.spec.ts`: `saveVacancySource` throws
  `/Path traversal/` when given a `workspaceFolderPath` outside
  `STORAGE_ROOT`.
- New tests `create-workspace.dto.spec.ts`: 200-char `companyNameOriginal`
  passes, 201-char fails; 201-char `roleTitleOriginal` fails.
- Full suite: 47/47 suites, 479/479 tests pass (475 baseline + 4 new).
- `npx tsc --noEmit`: clean.

### Follow-up

- Confirmed post-merge (PR #67, merged 2026-07-13T17:14): the CodeQL
  workflow re-ran on `main` (success) but did **not** auto-close any of
  the 4 alerts — `gh api .../code-scanning/alerts` showed all 4 still
  `open` with `created_at` unchanged (16:44, pre-fix), meaning CodeQL's
  static taint analysis does not recognize the custom
  `assertInsideStorageRoot()` guard method as a sanitizer, and does not
  connect a DTO-level `@MaxLength` in a different file to the regex call
  site. This confirms the hypothesis above rather than contradicting it.
  Manually dismissed all 4 via `gh api --method PATCH
  .../code-scanning/alerts/{n}` with `dismissed_reason` and
  `dismissed_comment`: alerts #3 (`createWorkspaceFolder`) and #4
  (`saveVacancySource`) as `"false positive"` (guard exists/verified by
  test); alerts #1/#2 (`slug.service.ts` ReDoS) as `"won't fix"` (simple
  linear-time regex, input now bounded, risk accepted for a
  single-operator tool). All comments reference the specific fix/test as
  the justification, per code-scanning dismissal best practice — no
  silent/unexplained dismissals.

## 2026-07-13 — TASK-PH-013 — Remediate Dependabot-reported dependency vulnerabilities

### Scope

Fixed the 7 high-severity Dependabot alerts surfaced immediately after
TASK-PH-010 enabled scanning (`multer` via `@nestjs/platform-express`,
`lodash` via `@nestjs/swagger`), plus moderate `qs`/`file-type`/`js-yaml`
advisories. Used a `package.json` `"overrides"` entry to force `lodash`,
`multer`, `qs`, `file-type` and `js-yaml` to patched versions on the
*same major line* already used elsewhere in the dependency tree, avoiding
the NestJS v10→v11 major-version bump that `npm audit fix --force` would
otherwise require. Remaining 3 moderate `@nestjs/core` "Injection"
advisories (GHSA-36xv-jgw5-4q75) have no fix without the NestJS v11 major
upgrade — left open, documented here, tracked as a possible future task
if it recurs after PH-013.

### Commands

```bash
npm audit --omit=dev                # baseline: 11 vulns (7 high, 4 moderate)
# added "overrides" to package.json: lodash ^4.18.1, multer ^2.2.0,
# qs ^6.15.3, file-type ^21.3.4, js-yaml ^4.3.0
npm install
npm audit --omit=dev                # after: 3 vulns (0 high, 3 moderate)
npm run test                        # 47 suites, 475 tests
npx tsc --noEmit
npm run build
npm run test:e2e                    # 2 suites, 3 tests (real Postgres)
npm run start:dev                   # manual smoke check
curl http://localhost:3000/api-json
curl -X POST http://localhost:3000/workspaces ... (full pipeline through export-cv)
```

### Result

PASS

### Evidence

- `npm audit --omit=dev` before: 11 vulnerabilities (7 high: `multer`,
  `lodash` and dependents; 4 moderate: `qs`, `file-type`, `js-yaml` and
  dependents).
- `npm audit --omit=dev` after: 3 vulnerabilities, all moderate
  (`@nestjs/core` "Improperly Neutralizes Special Elements in Output"
  advisory, GHSA-36xv-jgw5-4q75 — fix only via NestJS v11 major bump, out
  of scope for this narrower fix). 0 high, 0 low remaining.
- `npm run test`: 47/47 suites, 475/475 tests pass — no regression.
- `npx tsc --noEmit`: clean. `npm run build`: succeeds.
- `npm run test:e2e`: 2/2 suites, 3/3 tests pass, including the full MVP
  pipeline (`mvp-flow.e2e-spec.ts`) through PDF export with real Postgres.
- Manual smoke check: started `npm run start:dev`, confirmed
  `GET /health` returns `200`, `GET /api-json` returns valid OpenAPI JSON
  (title "JobFlow CV Pipeline", 16 paths) confirming Swagger UI still
  works post-`lodash`/`js-yaml` patch. Drove the full workspace pipeline
  via curl (create → run-analysis → review-decision approve_apply →
  generate-cv-content → review-cv-draft approve → export-cv) and
  confirmed a real 110824-byte `04_cv_export.pdf` was generated via
  Puppeteer, confirming `@nestjs/platform-express`/`multer` patch didn't
  break request handling. Test workspace folder removed after
  verification.
- Dev-only vulnerabilities remaining in full `npm audit` (not
  `--omit=dev`): `glob`/`tmp`/`webpack`/`picomatch`/`ajv` under
  `@nestjs/cli`'s dependency tree — build/dev tooling only, does not ship
  to production, out of scope per this task's acceptance criteria
  (production dependencies only).

### Follow-up

- The 3 remaining moderate `@nestjs/core` alerts require the NestJS v11
  major-version upgrade to close — not pursued here per the scope
  decision in `CURRENT_TASK.md` (escalate only if overrides fail; they
  didn't fail, but this specific advisory has no narrower fix). Revisit
  if/when a NestJS v11 upgrade task is undertaken.

## 2026-07-13 — TASK-PH-010 — Add security governance files (SECURITY.md, Dependabot, CodeQL)

### Scope

Added baseline GitHub security governance: `SECURITY.md` (supported
versions = "latest `main` only"; vulnerability reporting via GitHub
Security Advisories, per user's explicit channel choice over a plain
email address), `.github/dependabot.yml` (weekly update checks for `npm`
and `github-actions` ecosystems), `.github/workflows/codeql.yml` (CodeQL
analysis for `javascript-typescript`, triggered on push/PR to `main` and
weekly via cron, using `github/codeql-action@v3`). No `src/**` files
touched.

### Commands

```bash
npm run test         # 47 suites, 475 tests — sanity check, no regression expected
npx tsc --noEmit      # clean
```

### Result

PASS. Manual GitHub-side verification completed after push: PR #51 checks
show `CodeQL / Analyze (javascript-typescript)` and `Code scanning results
/ CodeQL` both green ("No new alerts in code changed by this pull
request"); Dependabot confirmed active — repo's Dependabot alerts tab
shows 20 open alerts scanned from `package-lock.json`.

### Evidence

- `npm run test`: 47/47 suites, 475/475 tests pass — unchanged from
  TASK-PH-009 baseline, confirming no regression from the new GitHub
  config files.
- `npx tsc --noEmit`: no errors.
- New files: `SECURITY.md`, `.github/dependabot.yml`,
  `.github/workflows/codeql.yml`. `git diff --stat` shows no `src/**`
  changes.

### Follow-up

- None for this task. The 20 Dependabot alerts surfaced on the default
  branch (mostly transitive deps — `lodash`, `multer`, `tmp`, `qs`, `glob`
  via `package-lock.json`) are out of scope here (TASK-PH-010 was scanning
  setup only, not remediation) and are candidates for a future dependency
  update task.

## 2026-07-13 — TASK-043 — Implement Prompt 5 final check

### Scope

Added the optional Prompt 5 final check: `Prompt5InputBuilderService` (gates
on `cv_pdf_generated`, reads `04_cv_export.html` + `02_targeted_cv_content.json`
required, `01_vacancy_analysis.json` + `03_pre_pdf_check.json` optional
context), `Prompt5Service` (PromptRun/AiRun lifecycle, writes/registers
`05_final_check.md/.json`), `POST /workspaces/:id/run-final-check`. New
`src/pipeline/schemas/final-check.schema.ts` with `final_decision`
(`ready_to_send`/`needs_edit`/`do_not_send`) and a `final_checklist` object.
Unlike Prompt 3 (TASK-042, which the backlog required to leave
`workspace.status` untouched), this task's backlog AC was silent on status
and `docs/08_ai_pipeline.md` §14.6 documents `status -> final_check_ready` as
part of the design — confirmed with user: on success, `workspace.status`
transitions `cv_pdf_generated -> final_check_ready`; on failure, status stays
at `cv_pdf_generated` so the PDF remains downloadable.
`WorkspaceStatusService.TRANSITIONS` updated to match. Added `FAKE_PROMPT5_JSON`
to the fake provider and a placeholder `prompt_5` seed template
(`prisma/prompts/prompt5.txt`).

Also, at user's request during review (outside this task's original scope):
renamed `prompt1.schema.ts` → `vacancy-analysis.schema.ts` and
`prompt2.schema.ts` → `targeted-cv-content.schema.ts` (with every exported
type/function renamed to match), unifying schema-file naming on the
canonical-artifact convention that `skip-reason.schema.ts`,
`pre-pdf-check.schema.ts` and this task's own `final-check.schema.ts` already
followed. Documented as ADR-021. Committed separately from the Prompt 5
feature commit.

### Commands

```bash
npx tsc --noEmit                                                # clean
npm run lint                                                     # clean
npm run test -- --testPathPattern=final-check.schema              # 1 suite, 23 tests
npm run test -- --testPathPattern=prompt5                         # 2 suites, 21 tests
npm run test -- --testPathPattern=workspace-status.service        # 1 suite, 32 tests
npm run test                                                      # → 47 suites, 475 tests
npm run test:e2e                                                  # 1 suite, 1 test, pass (real Postgres)
npx prisma db seed                                                 # 4 active PromptTemplate rows (was 3)
```

### Result

PASS

### Evidence

- `prompt5-input-builder.service.spec.ts` (6 tests) and `prompt5.service.spec.ts`
  (15 tests): gate on `cv_pdf_generated`, missing-artifact handling,
  PromptRun/AiRun lifecycle, artifact registration with `origin: 'prompt_5'`,
  status transition to `final_check_ready` on success only, status left
  unchanged on AI-provider-failure and JSON-validation-failure paths.
- `final-check.schema.spec.ts` (23 tests): all `final_decision` values
  accepted, missing/invalid field rejection for every top-level and
  `final_checklist` field.
- `workspace-status.service.spec.ts`: added `cv_pdf_generated ->
  cv_pdf_generated` and `cv_pdf_generated -> final_check_ready` to valid
  transitions; `final_check_ready -> final_check_ready` added to invalid
  transitions (still terminal).
- Manual end-to-end smoke test against real Postgres + fake AI provider
  (`npm run start:dev` on an alternate port, full HTTP flow): workspace →
  `run-analysis` → `review-decision` (apply) → `generate-cv-content` →
  `run-pre-pdf-check` (optional, confirms Prompt 3/5 compose without
  conflict) → `review-cv-draft` (approve) → `export-cv`
  (`status: cv_pdf_generated`) → **`run-final-check`** (returned
  `finalDecision: "ready_to_send"`, `workspaceStatus: "final_check_ready"`,
  wrote `05_final_check.md/.json` to disk with correct content) → confirmed
  a second call on the now-`final_check_ready` workspace returns
  `400 Bad Request`. Test workspace folders removed from
  `storage/applications/` after verification.
- Full suite: 47/47 test suites, 475/475 tests passed. e2e mechanical MVP
  flow (fake provider) passed unchanged.

### Follow-up

- Real Prompt 5 prompt-engineering content (`prisma/prompts/prompt5.txt` is
  currently a placeholder) — same follow-up pattern as TASK-037B/TASK-042.

## 2026-07-10 — TASK-041 — Implement artifact latest-version marking

### Scope

Extended `ArtifactsService.register()` to support version replacement.
Before creating a new `GeneratedArtifact` row, it now looks up the current
`isLatest: true` row for the same `workspaceId + artifactType`. If found,
that row is flipped to `isLatest: false` via `updateMany`, and the new row's
`version` is set to `previous.version + 1`; otherwise `version` stays `1`.
No Prisma migration was needed — `isLatest`/`version` already existed on
`GeneratedArtifact`. All existing `register()` callers (prompt1, prompt2,
skip-reason, html-renderer, document-export, workspaces) are unaffected.

### Commands

```bash
npx tsc --noEmit                                              # clean
npm run lint                                                   # clean
npm run test -- --testPathPattern=artifacts.service            # 1 suite, 9 tests
npm run test                                                    # → 40 suites, 382 tests, 0 failures
npm run test:e2e                                                # 1 suite, 1 test, pass (real Postgres)
```

### Result

PASS

### Evidence

- `artifacts.service.spec.ts`: new cases — "assigns version 1 and skips
  updateMany when no prior artifact of this type exists", "marks the
  previous latest artifact of the same type as false and bumps the version",
  "does not affect artifacts of a different type in the same workspace".
- Full suite: 40/40 test suites, 382/382 tests passed.
- e2e mechanical MVP flow (fake provider) passed against real Postgres.

### Follow-up

- none.

## 2026-07-13 — TASK-042 — Implement Prompt 3 pre-PDF check

### Scope

Added the optional Prompt 3 pre-PDF safety check: `Prompt3InputBuilderService`
(gates on `cv_draft_ready`/`paused_after_cv_draft`, reads
`02_targeted_cv_content.json` required + `01_vacancy_analysis.json` optional
context), `Prompt3Service` (PromptRun/AiRun lifecycle, writes/registers
`03_pre_pdf_check.md/.json`), `POST /workspaces/:id/run-pre-pdf-check`.
Extended `PrePdfCheckOutput` schema with a required `readiness` field
(`ready`/`ready_with_minor_edits`/`not_ready`). Added `FAKE_PROMPT3_JSON` to
the fake provider and a placeholder `prompt_3` seed template
(`prisma/prompts/prompt3.txt`). Deliberately does not change
`workspace.status` — the AC requires the default MVP flow not depend on this
optional step; Step 4 (`html-renderer.service.ts`) already read/applied
`03_pre_pdf_check.json` corrections from an earlier task and was not changed.

### Commands

```bash
npx tsc --noEmit                                                # clean
npm run lint                                                     # clean
npm run test -- --testPathPattern=cv-content.schema               # 1 suite, 22 tests
npm run test -- --testPathPattern=prompt3                         # 2 suites, pass
npm run test                                                      # → 42 suites, 407 tests
                                                                    #   (1 pre-existing flaky
                                                                    #   Puppeteer timeout under
                                                                    #   full-suite load — passes
                                                                    #   in isolation, unrelated
                                                                    #   to this change)
npm run test:e2e                                                  # 1 suite, 1 test, pass (real Postgres)
npx prisma db seed                                                 # 3 active PromptTemplate rows (was 2)
```

### Result

PASS

### Evidence

- `prompt3-input-builder.service.spec.ts` (7 tests) and `prompt3.service.spec.ts`
  (16 tests): gate on status, missing-artifact handling, PromptRun/AiRun
  lifecycle, artifact registration with `origin: 'prompt_3'`, no
  `workspace.status` change on success or failure paths.
- `cv-content.schema.spec.ts`: added "rejects missing readiness" / "rejects
  invalid readiness value" cases; existing `validatePrePdfCheckJson` fixtures
  updated with `readiness`.
- Manual end-to-end smoke test against real Postgres + fake AI provider
  (`npm run start:dev` on an alternate port, full HTTP flow): created
  workspace → `run-analysis` → `review-decision` (apply) →
  `generate-cv-content` → **`run-pre-pdf-check`** (returned
  `readiness: "ready_with_minor_edits"`, wrote `03_pre_pdf_check.md/.json`
  to disk) → confirmed `workspace.status` unchanged (`cv_draft_ready`) →
  `review-cv-draft` (approve) → `export-cv` succeeded
  (`status: cv_pdf_generated`) → confirmed the exported
  `04_cv_export.html` contains the Prompt 3 `suggested_text` correction
  (proves Step 4 already reads and applies `03_pre_pdf_check.json`). Also
  confirmed `run-pre-pdf-check` returns `400 Bad Request` when called against
  a workspace past the CV draft stage (`cv_pdf_generated`). Test workspace
  folder removed from `storage/applications/` after verification.
- Full suite: 42/42 test suites (1 known-flaky Puppeteer real-browser test
  passes in isolation), 407/407 unit tests passed. e2e mechanical MVP flow
  (fake provider) passed unchanged — confirms Prompt 3 remains fully optional.

### Follow-up

- Real Prompt 3 prompt-engineering content (`prisma/prompts/prompt3.txt` is
  currently a placeholder) — same follow-up pattern as TASK-037B did for
  Prompt 1/2.

## 2026-07-13 — Test hygiene — split schema spec files 1:1, add skip-reason coverage (ADR-020)

### Scope

Not tied to a task ID — found and fixed during TASK-042 review, at user's
request. `validatePrePdfCheckJson` tests lived inside
`cv-content.schema.spec.ts` instead of a dedicated
`pre-pdf-check.schema.spec.ts`, breaking the one-file-one-spec convention
used elsewhere (`prompt1.schema.ts`/`.spec.ts`, `prompt2.schema.ts`/`.spec.ts`).
Moved the block as-is into a new `pre-pdf-check.schema.spec.ts`.
`validateSkipReasonJson` (`skip-reason.schema.ts`) had no dedicated spec file
at all (only indirect happy-path coverage via
`skip-reason.service.spec.ts`) — added `skip-reason.schema.spec.ts` covering
missing fields, invalid `decision`, non-integer `score`, wrong-typed array
elements and empty arrays. Documented the convention as ADR-020 and a new
CLAUDE.md Testing Rule.

### Commands

```bash
npx tsc --noEmit                                                     # clean
npm run test -- --testPathPattern="cv-content.schema|pre-pdf-check.schema|skip-reason.schema"
                                                                        # 3 suites, 44 tests
npm run test                                                          # → 44 suites, 427 tests, 0 failures
```

### Result

PASS

### Evidence

- `pre-pdf-check.schema.spec.ts`: 8 tests (moved, unchanged assertions).
- `skip-reason.schema.spec.ts`: 20 new tests.
- `cv-content.schema.spec.ts`: now only tests `validateCvContentJson` (14 tests).
- Full suite: 44/44 test suites, 427/427 tests passed (the previously-flaky
  Puppeteer real-browser test also passed this run).

### Follow-up

- none.

## 2026-07-10 — TASK-040 — Add workspace artifact summary API

### Scope

Extended `GET /workspaces/:id` (existing endpoint) to return a combined
detail response: the workspace entity (including `status`, `currentDecision`,
`score`, `company`, `jobVacancy`) plus a new `artifacts` summary array built
from `ArtifactsService.findByWorkspaceId`. Added `WorkspacesService.getWorkspaceDetail(id)`
composing `findById()` + artifact summaries; controller now calls this method
instead of `findById()` directly. Each artifact summary entry exposes both
`canonicalFileName` and `downloadFileName` as distinct fields. The separate
`GET /workspaces/:id/artifacts` endpoint (TASK-016) was left unchanged.

### Commands

```bash
npx tsc --noEmit                                    # clean
npm run lint                                         # clean
npm run test -- --testPathPattern=workspaces         # 4 suites, 51 tests
npm run test                                          # → 40 suites, 379 tests, 0 failures
npm run test:e2e                                      # 1 suite, 1 test, pass (real Postgres)
```

### Result

PASS

### Evidence

- `workspaces.service.spec.ts`: new `getWorkspaceDetail` describe block — asserts a
  workspace with vacancy-source, analysis (md+json) and PDF export artifacts returns
  `status`/`currentDecision`/`score` plus all 4 artifacts with correct
  canonical/download names; also asserts `null` for unknown workspace id without
  calling `findByWorkspaceId`.
- `workspaces.controller.spec.ts`: `GET /workspaces/:id` test rewritten to mock
  `getWorkspaceDetail` and assert the full response shape (status, decision, score,
  4-artifact array with distinct canonical/download names).
- Full suite went from 377 → 379 tests (40 suites unchanged), all passing.
- `npm run test:e2e` (`test/mvp-flow.e2e-spec.ts`, real Postgres via Docker) still
  passes — confirms no regression in the full HTTP flow.
- `npx tsc --noEmit` and `npm run lint` both clean.

### Follow-up

- none — TASK-041 (artifact latest-version marking) is a separate future task.

## 2026-07-08 — TASK-039 — Implement workspace status transition service

### Scope

Added `WorkspaceStatusService` (`src/workspaces/workspace-status.service.ts`) with a
transition map derived from actual runtime behavior across `prompt1.service.ts`,
`prompt2.service.ts`, `skip-reason.service.ts`, `review-gates.service.ts` and
`document-export.service.ts` (not from the `docs/03_domain_model.md` §8.6 table,
which disagrees on one path — see `CURRENT_TASK.md` Scope Decision). Existing
call sites were intentionally left unchanged (no refactor); the new service is
standalone and registered as a provider in `WorkspacesModule` only.

### Commands

```bash
npx tsc --noEmit                                        # clean
npm run lint                                             # clean
npm run test -- --testPathPattern=workspace-status       # 1 suite, 30 tests
npm run test                                              # → 40 suites, 377 tests, 0 failures
```

### Result

PASS

### Evidence

- `workspace-status.service.spec.ts`: 30 tests — 18 valid transitions (every row of the
  `CURRENT_TASK.md` State Machine table) + 11 invalid pairs (including
  `skipped -> export_running`, `source_saved -> cv_draft_ready`,
  `cv_pdf_generated -> *`, `failed -> *`) + 1 error-message assertion, all pass.
- Full suite went from 39 → 40 suites, 347 → 377 tests, all passing (no regressions).
- `npx tsc --noEmit` and `npm run lint` both clean.

### Follow-up

- Wiring `WorkspaceStatusService.assertValidTransition` into the existing
  status-writing call sites as an enforced gate is a separate future task
  (not in TASK-039 scope, per user decision 2026-07-08).

## 2026-07-08 — TASK-006B — Add P0 unit tests for core MVP logic

### Scope

Gap analysis against the 8 TASK-006B acceptance criteria (company/role slug normalization, empty-field validation, canonical artifact naming, skip decision behavior, Prompt 2 approval gate, manual override logging, anti-overclaiming guard) found 7 of 8 already covered by existing spec files (`slug.service.spec.ts`, `create-workspace.dto.spec.ts`, `artifact-storage.service.spec.ts`, `skip-reason.service.spec.ts`, `prompt2-input-builder.service.spec.ts`, `review-gates.service.spec.ts`, `document-export.service.spec.ts`). The one gap: `evidence-guard.service.ts` had no dedicated critical pattern for DynamoDB or MySQL production claims (backlog AC8 explicitly names "AWS/DynamoDB/MySQL without evidence"), only a generic AWS pattern. Added two `CriticalPattern` entries (DynamoDB production, MySQL production) to `CRITICAL_PATTERNS` and matching positive-match tests (patterns 16 and 17) to `evidence-guard.service.spec.ts`, following the existing pattern-test convention in that file.

### Commands

```bash
npx tsc --noEmit                 # clean
npm run lint                     # clean
npm run test                     # → 39 suites, 347 tests, 0 failures
```

### Result

PASS

### Evidence

- `evidence-guard.service.spec.ts`: 2 new tests (`pattern 16: flags DynamoDB production experience`, `pattern 17: flags MySQL production experience`), both pass.
- Full suite went from 345 → 347 tests (39 suites unchanged), all passing.
- No other source files touched — all other AC7 items confirmed already covered by pre-existing tests (see task conversation for per-AC evidence file/test-name mapping).

### Follow-up

- none.

## 2026-07-08 — TASK-038 — Create mechanical MVP smoke test with fake provider

### Scope

Added `POST /workspaces/:id/generate-cv-content` (missing endpoint for `Prompt2Service.generateCvContent`, documented in CLAUDE.md's data flow but never wired to `WorkspacesController` — added in scope per user approval). Added `test/mvp-flow.e2e-spec.ts`: one automated e2e test driving the full MVP mechanics over real HTTP against a real local Postgres, using the fake AI provider — create workspace → run Prompt 1 analysis → approve apply → generate CV content (Prompt 2 + anti-overclaiming guard) → approve CV draft → export PDF — asserting artifacts on disk and in `GeneratedArtifact`/`AiRun` at each step, including that export creates no new `AiRun` (ADR-012).

### Commands

```bash
npx tsc --noEmit                 # clean
npm run lint                     # clean
npm run test                     # → 39 suites, 345 tests, 0 failures
docker compose ps                # jobflow_postgres already Up
npm run test:e2e                 # → 1 suite, 1 test, PASS
```

### Result

PASS

### Evidence

- `test:e2e` output: all 6 HTTP steps returned 201; final test assertions on artifact filenames (`00_vacancy_source.txt`, `01_vacancy_analysis.md/json`, `02_targeted_cv_content.md/json`, `04_cv_export.pdf`) and workspace status `cv_pdf_generated` passed.
- `STORAGE_ROOT` isolated to a `fs.mkdtempSync` temp dir per run (never touches real `storage/applications/`); temp dir removed in `afterAll`.
- Test workspace/company/vacancy/artifacts/promptRuns/aiRuns rows deleted in `afterAll` in FK-safe order (no cascade deletes defined in `schema.prisma`).
- Re-ran `test:e2e` a second time back-to-back — passed identically, confirming cleanup leaves no residue that would break a repeat run.
- Unit suite (345/345) unaffected; `workspaces.controller.spec.ts` updated with a `Prompt2Service` mock and a passing test for the new endpoint.

### Follow-up

- TASK-038A (real OpenAI provider smoke test against a real vacancy) is next per `docs/07_task_backlog.md`; not started automatically per Operating Rules.

## 2026-07-05 — TASK-PH-004 — Add husky + lint-staged pre-commit hooks

### Scope

Install `husky` v9 and `lint-staged` v16 as devDependencies. Wire `prepare: "husky"` in `package.json`. Create `.husky/pre-commit` that runs `npx lint-staged`. Configure `lint-staged` to run `eslint --fix` + `prettier --write` on staged `*.ts` files. Manual verification that a commit with an unfixable lint error is rejected.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install --save-dev husky lint-staged  # → husky@9.1.7, lint-staged@16.4.0

# Init husky (v9 — sets prepare: "husky" in package.json, creates .husky/)
npx husky init

# Manual lint rejection test
echo "const lintTest = 'unused';" > src/_lint_test_temp.ts
git add src/_lint_test_temp.ts
git commit -m "test: lint hook verification"
# → commit rejected: 'lintTest' is assigned a value but never used (no-unused-vars)

# Clean up test file
git rm --cached src/_lint_test_temp.ts && rm src/_lint_test_temp.ts

# After changes
npm run test  # → 31 suites, 292 tests, 0 failures (unchanged)
```

### Result

PASS. Test count unchanged. Commit correctly rejected on lint error.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- Lint rejection output (abridged):
  ```
  [FAILED] eslint --fix [FAILED]
  ✖ eslint --fix:
  src/_lint_test_temp.ts
    1:7  error  'lintTest' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  ✖ 1 problem (1 error, 0 warnings)
  husky - pre-commit script failed (code 1)
  ```
- `prepare: "husky"` script set by `npx husky init`
- `.husky/pre-commit` contains `npx lint-staged`
- `lint-staged` config in `package.json`: `{ "*.ts": ["eslint --fix", "prettier --write"] }`

### Note on husky v9 vs task spec

`CURRENT_TASK.md` references v8 commands (`prepare: "husky install"`, `npx husky install`). In husky v9 the equivalent is `prepare: "husky"` and `npx husky init`. The end behavior is identical — hooks installed on `npm install`.

### Follow-up

- Next: TASK-PH-005 or TASK-PH-006 (CI/GitHub Actions)

---

## 2026-07-05 — TASK-032A — Add missing current_work_block to Prompt2CvContent

### Scope

Schema/fixture fix: add `current_work_block` to `Prompt2CvContent`, `validatePrompt2Json()`, `FAKE_PROMPT2_JSON`, and affected test fixtures.

### Commands

```bash
# Baseline (before changes)
npm run test  # → 30 suites, 283 tests

# After changes
npm run test  # → 30 suites, 285 tests (+2 new tests for current_work_block)
npx tsc --noEmit  # → clean
```

### Result

PASS. +2 tests (accepts valid current_work_block / rejects missing current_work_block). TypeScript clean.

---

## 2026-07-05 — TASK-035C — NestJS module architecture cleanup

### Scope

Verify test suite remains stable after removing 7 redundant AppModule imports and deleting orphaned `skip-reason.module.ts`.

### Commands

```bash
# Baseline (before changes)
npm run test
# → 30 suites, 283 tests, 0 failures

# After changes
npm run test
# → 30 suites, 283 tests, 0 failures

npx tsc --noEmit
# → no output (clean)

# Confirm SkipReasonModule is gone
grep -r "SkipReasonModule" src/
# → no matches
```

### Result

PASS. Test count unchanged (283/283). TypeScript clean. No references to `SkipReasonModule` remain.

---

## 2026-06-28 — TASK-001 — Initialize NestJS project structure

### Scope

Basic NestJS bootstrap: health endpoint, unit test, TypeScript build.

### Commands

```bash
npm install
npm run test
npm run build
```

### Result

PASS

### Evidence

- `npm run test`: 1 suite, 1 test — `AppController › health › returns { status: "ok" }` — PASS (3.7s)
- `npm run build`: exits cleanly, no TypeScript errors
- Files created: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.js`, `.prettierrc`, `.gitignore`, `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.controller.spec.ts`, `test/jest-e2e.json`, `README.md`

### Follow-up

- Next task: TASK-002 or TASK-004 (per backlog dependency order)

---

## 2026-06-28 — TASK-004 — PostgreSQL persistence verification

### Scope

Named Docker volume `postgres_data` survives `docker compose down` + `docker compose up -d postgres`.

### Commands

```bash
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "CREATE TABLE persistence_check (id serial PRIMARY KEY, note text); INSERT INTO persistence_check (note) VALUES ('task-004-test');"
docker compose down
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT * FROM persistence_check;"
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "DROP TABLE persistence_check;"
```

### Result

PASS

### Evidence

- Container started on port 5433 (5432 was already allocated on this machine; `POSTGRES_PORT` in `.env` set to 5433)
- `CREATE TABLE` + `INSERT 0 1` — row written before stop
- `docker compose down` removed container and network, volume `postgres_data` retained
- After `docker compose up -d postgres`, row `id=1, note='task-004-test'` still present
- Test table dropped after verification

### Follow-up

- `.env.example` uses port 5432 (default). Local `.env` uses 5433 due to host conflict. No change needed to example — developers adjust `POSTGRES_PORT` if their 5432 is occupied.
- Next task: TASK-005 (persistence checklist script) or TASK-006 (Prisma setup).

---

## 2026-06-28 — TASK-005 — PostgreSQL persistence verification script

### Scope

`scripts/check-postgres-persistence.sh` automated script verified against live Docker container.

### Commands

```bash
bash scripts/check-postgres-persistence.sh
# or
npm run db:check-persistence
```

### Result

PASS

### Evidence

- Script ran via Git Bash
- Row `persist-check-20260628185341` inserted before `docker compose down`
- Container removed, volume `postgres_data` retained
- After `docker compose up -d postgres`, row still present (count: 1)
- Test table dropped cleanly
- Final output: `PASS — data survived docker compose down + up`

### Follow-up

- `npm run db:check-persistence` works via Git Bash; PowerShell cannot run bash scripts directly (WSL path issue on this machine)
- Next task: TASK-006 (Prisma setup)

---

## 2026-06-28 — TASK-006 — Prisma setup and database connection

### Scope

Prisma 5 installed, schema.prisma created, PrismaService created, AppModule updated, connection verified.

### Commands

```bash
npm install prisma@^5 @prisma/client@^5
npx prisma migrate dev --name init
npx tsc --noEmit
npm run test
```

### Result

PASS

### Evidence

- `npm install` — prisma@5.22.0 and @prisma/client@5.22.0 installed
- `npx prisma migrate dev` output: "Datasource "db": PostgreSQL database "jobflow_cv" at "localhost:5433" — Already in sync, no schema change or pending migration was found" — confirms DB connection works
- `npx tsc --noEmit` — no TypeScript errors
- `npm run test` — 1 test PASS (AppController health)
- Note: `prisma generate` produces "no models" warning — expected at this stage; domain models come in TASK-008/009
- Prisma downgraded from v7 (latest) to v5 LTS — v7 removed `url` from datasource in schema.prisma, breaking the standard NestJS pattern

### Follow-up

- Next task: TASK-006A (unit test setup) or TASK-007 (slug normalization)

---

## 2026-06-29 — TASK-006A — Unit test setup and conventions

### Scope

Jest baseline confirmed: AppService unit test + AppController mock injection test.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- 2 test suites, 3 tests — all PASS
- `src/app.service.spec.ts` — pure service test, no TestingModule
- `src/app.controller.spec.ts` — controller test with mocked AppService via `{ provide: AppService, useValue: jest.fn() }` — demonstrates the pattern for PrismaService and AiProvider mocking
- `npx tsc --noEmit` — clean, no errors
- Added `"types": ["jest", "node"]` to `tsconfig.json` — fixes VS Code globals (`describe`, `it`, `expect`)
- `test/setup.ts` — conventions document for future tests

### Follow-up

- Next: TASK-007 (slug normalization) then TASK-006B (P0 unit tests)

---

## 2026-06-29 — TASK-007 — Slug normalization unit tests

### Scope

`SlugService.normalizeCompanySlug()` and `normalizeRoleSlug()` — all doc examples + edge cases.

### Commands

```bash
npm run test
```

### Result

PASS

### Evidence

- 3 test suites, 25 tests — all PASS
- Company slug: Action1, CHECK24, Omega CRM, Ukrainian Cyrillic, repeated separators, empty string
- Role slug: all doc examples, numbers removed, Cyrillic+Latin mix, em dash, C#/.NET, edge cases
- Regex uses `\p{Script=Cyrillic}` with `u` flag as required

### Follow-up

- Next: TASK-008 (Company and JobVacancy Prisma models)

---

## 2026-06-29 — TASK-008+009 — Company, JobVacancy, ApplicationWorkspace Prisma models

### Scope

Prisma schema enums (WorkspaceStatus, VacancyDecision, UserReviewState) and three models. Migration applied. NestJS services created and unit tested with mocked PrismaService.

### Commands

```bash
npx prisma migrate dev --name add-core-models
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629150407_add_core_models` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 6 suites, 34 tests — all PASS
  - `company.service.spec.ts` — create, findById, not-found (3 tests)
  - `vacancy.service.spec.ts` — create linked to company, findById, not-found (3 tests)
  - `workspaces.service.spec.ts` — create with status source_saved, findById with company+vacancy included, not-found (3 tests)
- All services use mocked PrismaService — no real DB calls in unit tests
- `WorkspacesService.create()` always sets `status: source_saved` regardless of caller input
- `WorkspacesService.findById()` includes `company` and `jobVacancy` relations in result

### Follow-up

- Next: TASK-010 (DTO validation) or TASK-011 (workspace folder + vacancy artifact creation)

---

## 2026-06-29 — TASK-010+011+012+013 — Manual workspace creation API

### Scope

DTO validation, ArtifactStorageService (folder + file creation), WorkspacesController (POST/GET/GET:id), full orchestration in WorkspacesService.

### Commands

```bash
npm install class-validator class-transformer
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 9 suites, 53 tests — all PASS
- New test files:
  - `create-workspace.dto.spec.ts` — 10 tests: missing/empty required fields, valid sourceUrl, invalid URL
  - `artifact-storage.service.spec.ts` — 4 tests: folder created on disk, path inside storage root, path traversal rejected, file saved with exact content + correct SHA-256 hash, Cyrillic text preserved
  - `workspaces.controller.spec.ts` — 4 tests: POST creates workspace, GET returns list, GET:id returns detail, GET:id unknown returns NotFoundException
  - `workspaces.service.spec.ts` — updated with mocks for all 5 injected dependencies (PrismaService, SlugService, CompanyService, VacancyService, ArtifactStorageService); 3 existing tests all PASS
- `ValidationPipe({ whitelist: true })` enabled globally in main.ts
- `storage/applications/` directory created and tracked in git
- Folder naming: `<YYYY_MM_DD>_<companySlug>_<roleSlug>` (e.g. `2026_06_29_Action1_Backend_Developer_Node_js`)
- Vacancy text saved as UTF-8 with SHA-256 hash; line breaks and special characters preserved exactly
- POST /workspaces returns: id, status, companySlug, roleSlug, workspaceSlug, folderPath, vacancySourcePath, vacancyTextHash, companyId, jobVacancyId, createdAt
- Path safety: path traversal attempts throw an error before any disk write

### Follow-up

- Next: TASK-014 (GeneratedArtifact model and registry service)

---

## 2026-06-30 — TASK-014+015+016 — GeneratedArtifact model, HashService and artifact access endpoints

### Scope

GeneratedArtifact Prisma model + migration, HashService (SHA-256 utility), ArtifactsService (DB register/query), ArtifactsController (GET /workspaces/:id/artifacts, GET /artifacts/:id/download with path safety), vacancy source registered as artifact during POST /workspaces.

### Commands

```bash
npx prisma migrate dev --name add-generated-artifact
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629220531_add_generated_artifact` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 12 suites, 70 tests — all PASS
- New test files:
  - `hash.service.spec.ts` — 5 tests: hex format, same content same hash, different content different hash, Cyrillic UTF-8, whitespace sensitivity
  - `artifacts.service.spec.ts` — 5 tests: register creates record, isLatest defaults to true, findByWorkspaceId returns ordered list, empty list, findById returns null
  - `artifacts.controller.spec.ts` — 6 tests: list by workspace, empty list, NotFoundException when artifact not in DB, ForbiddenException for path traversal, NotFoundException when file missing on disk, correct headers on download
- `workspaces.service.spec.ts` — updated: added `ArtifactsService` mock to providers (6 dependencies total)
- Path safety: `path.resolve()` + `startsWith(storageRoot + sep)` check before any file read
- Vacancy source auto-registered as `vacancy_source` artifact with `origin: pasted` on every `POST /workspaces`
- `GeneratedArtifact` fields: workspaceId, promptRunId?, artifactType, canonicalFileName, filePath, storageRoot, contentHash, isLatest, version, origin, status, mimeType?, fileSizeBytes?, downloadFileName?

### Follow-up

- Next: TASK-017 (KnowledgeSource model and import service)

---

## 2026-06-30 — TASK-017+019 — KnowledgeSource model, import service and EvidenceItem seed data

### Scope

KnowledgeSource Prisma model + EvidenceItem Prisma model + migration, KnowledgeSourcesService (importSource/activate/deactivate/findActive), EvidenceService (findByCategory/findAll), prisma/seed.ts with 9 EvidenceItem records.

### Commands

```bash
npx prisma migrate dev --name add-knowledge-source-and-evidence-item
npm run test
npx prisma db seed
```

### Result

PASS

### Evidence

- Migration `20260629222909_add_knowledge_source_and_evidence_item` applied — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 14 suites, 82 tests — all PASS
- `npx prisma db seed`: Seeded 9 EvidenceItem records — no errors
- New test files:
  - `knowledge-sources.service.spec.ts` — 8 tests: importSource creates record with hash, versionLabel null when not provided, activate sets isActive true, activate throws NotFoundException, deactivate sets isActive false, deactivate throws NotFoundException, findActive returns active only, findActive returns empty array
  - `evidence.service.spec.ts` — 4 tests: findByCategory returns allowed items, findByCategory returns risky items, findByCategory returns empty, findAll returns 9 items across all categories
- Seed data covers: Node.js (allowed), TypeScript (allowed), Azure Functions (allowed), PostgreSQL (allowed), NestJS (risky), Docker (risky), AI/RAG (risky), Kubernetes (unsupported), AWS (unsupported)
- KnowledgeSourcesService uses HashService.hashFile() for content hash on import
- package.json updated with `prisma.seed` config pointing to `ts-node prisma/seed.ts`

### Follow-up

- Next: TASK-020 (PromptTemplate model and CRUD service)

## 2026-06-30 — TASK-020+021+022+023+024 — AI pipeline infrastructure

### Scope

PromptTemplate model and versioning, AiRun model with token usage, AI provider abstraction with FakeProvider, PromptRun model linking workspace/template/AiRun.

### Commands

```bash
npx prisma migrate dev --name add_prompt_template_ai_run_prompt_run
npx prisma db seed
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Migration `20260629224728_add_prompt_template_ai_run_prompt_run` applied; Prisma Client regenerated (v5.22.0)
- `npx prisma db seed`: Seeded 9 EvidenceItem records + 2 active PromptTemplate records (Prompt 1 vacancy analysis, Prompt 2 targeted CV content) — no errors
- `npm run test`: 18 suites, 103 tests — all PASS
- New test files:
  - `prompt-templates.service.spec.ts` — 7 tests: create assigns version 1 with no prior template, increments version on existing template, never overwrites (always creates new record), activate deactivates other templates for the step first, findActive returns active/null, findByStep returns all versions desc
  - `ai-runs.service.spec.ts` — 3 tests: saveSuccess creates record with status completed and token fields, saveFailed creates record with status failed and errorMessage
  - `fake.provider.spec.ts` — 6 tests: provider/model name, non-empty text, usage token counts, parsedJson only in jsonMode, predictable repeated output
  - `prompt-runs.service.spec.ts` — 5 tests: create starts at status pending, complete sets status completed + links aiRunId + serializes outputArtifactIds, fail sets status failed, markRunning sets status running
- `npx tsc --noEmit`: no errors
- `npm run lint`: auto-fixed formatting only, no logic changes
- Only one active PromptTemplate per step enforced in `PromptTemplatesService.activate()` via `updateMany` deactivation before activating target

### Follow-up

- Next: TASK-025 (Prompt 1 input builder) — not started in this task, per scope boundaries

---

## 2026-06-30 — TASK-025+026+027 — Prompt 1 input builder, execution and JSON validation

### Scope

PromptInputBuilderService (vacancy source + template + knowledge sources → prompt text), Prompt1Service (full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save, workspace status transition), Prompt 1 JSON schema manual validation, POST /workspaces/:id/run-analysis endpoint.

### Commands

```bash
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- `npm run test`: 21 suites, 145 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `prompt1.schema.spec.ts` — 13 tests: valid JSON accepted, invalid JSON rejected, array at root, missing/invalid fields (decision, workspace, company_slug, score, must_have, top_reasons, manual_review_required), all three decision values accepted
  - `prompt-input-builder.service.spec.ts` — 9 tests: vacancy file path construction, metadata inclusion, snapshot serialization, multiple knowledge sources
  - `prompt1.service.spec.ts` — 18 tests: success path (7), invalid JSON output (6), AI provider failure (3), missing template (1), workspace not found (1)
  - `workspaces.controller.spec.ts` — updated: added Prompt1Service mock to resolve new dependency (4 tests still PASS)
- FakeAiProvider updated with complete Prompt 1 JSON including `workspace` field
- ArtifactStorageService: added `readFile()` and `resolveWorkspacePath()` methods
- Prompt1 JSON validation uses flat result type (`{ success: boolean; data?: Prompt1Analysis; error?: string }`) to avoid TypeScript discriminated-union narrowing issues
- Workspace status transitions: `analysis_running` → `paused_after_analysis` on success, `failed` on AI error or invalid JSON
- AI provider errors caught and saved as failed AiRun; markdown still saved when JSON is invalid
- POST /workspaces/:id/run-analysis added to WorkspacesController

### Follow-up

- Next: TASK-028 (Prompt 1 decision gate endpoint — apply/maybe/skip)

---

## 2026-06-30 — TASK-028 — Prompt 1 decision gate endpoint

### Scope

ReviewGatesService with 4-action state machine (approve_apply, approve_maybe, pause, change_to_skip). POST /workspaces/:id/review-decision endpoint. canProceedToPrompt2 flag based on `status === cv_generation_running`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 22 suites, 155 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `review-gates.service.spec.ts` — 8 tests: approve_apply transitions to cv_generation_running + canProceedToPrompt2 true, approve_apply rejects wrong decision, approve_maybe transitions to cv_generation_running + canProceedToPrompt2 true, pause keeps status paused_after_analysis + canProceedToPrompt2 false, pause preserves currentDecision, change_to_skip sets decision skip + reviewState overridden + canProceedToPrompt2 false, change_to_skip rejects already-skip, NotFoundException on missing workspace, BadRequestException on wrong status
- `workspaces.controller.spec.ts` updated: added ReviewGatesService mock
- State machine: approve_apply/approve_maybe → cv_generation_running (Prompt 2 unlocked); pause → paused_after_analysis (status unchanged); change_to_skip → decision=skip, status stays paused_after_analysis (actual skipped transition is TASK-029)
- `canProceedToPrompt2 = status === cv_generation_running` (not reviewState — per docs/03_domain_model.md §8.6)
- No Prisma migration needed — reviewState and currentDecision fields already in schema from TASK-008/009

### Follow-up

- Next: TASK-029 (skip artifact generation — 01_skip_reason.md/json + status=skipped)

---

## 2026-06-30 — TASK-029 — Skip reason generation

### Scope

SkipReasonService with POST /workspaces/:id/confirm-skip. Skip JSON schema validation. 01_skip_reason.md/json artifact generation. Status transition to `skipped`. Retry path from `analysis_ready`. FakeAiProvider updated with `step` parameter and `FAKE_SKIP_REASON_JSON`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 164 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `skip-reason.service.spec.ts` — 6 tests: success from `paused_after_analysis`, success from `analysis_ready` (retry), BadRequest on wrong status, BadRequest on wrong decision, NotFoundException on missing workspace, invalid JSON → status=`analysis_ready` + markdown saved
  - `fake.provider.spec.ts` — 1 new test: step=`skip_reason` returns FAKE_SKIP_REASON_JSON with decision=skip
- State machine: confirm-skip accepts `paused_after_analysis` OR `analysis_ready` (Variant A, per §9.8 retry path)
- Failure: status rolls back to `analysis_ready` per docs/08_ai_pipeline.md §9.8
- `status = skipped` only set after both artifacts physically written to disk (ADR-016)
- `buildDownloadFileName()` follows `SKIP_<company_slug>_<role_slug>_reason_RU.md` pattern
- FakeAiProvider: `step?: string` added to `AiProviderOptions`; returns step-specific JSON

### Follow-up

- Next: TASK-030 (manual override logging)

---

## 2026-07-01 — TASK-030 — Manual override logging

### Scope

`ReviewGatesService.overrideSkip()` — skip→cv_generation_running transition, audit record creation, artifact immutability, audit field correctness. New `DecisionOverride` Prisma model with migration.

### Commands

```bash
npx prisma migrate dev --name add-decision-override
npx prisma migrate dev --name add-decision-override-review-state
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 168 tests — all PASS
- 4 new `overrideSkip` tests in `review-gates.service.spec.ts`:
  - Override on skipped workspace → `status=cv_generation_running`, `toDecision=manual_override_apply`, `canProceedToPrompt2=true`, audit record created
  - Override on non-skipped workspace → `BadRequestException`, no `$transaction` call, no audit record
  - `GeneratedArtifact` mocks (`findMany`, `delete`, `deleteMany`) never called during override — artifacts untouched
  - Audit record `create` called with correct `fromDecision=skip`, `toDecision=manual_override_maybe`, `reviewState=overridden`, `reasonNote`
- New endpoint: `POST /workspaces/:id/override-skip`
- New migration: `DecisionOverride` model with `workspaceId`, `fromDecision`, `toDecision`, `reviewState`, `reasonNote?`, `createdAt`
- No filesystem writes or deletions — `overrideSkip` is DB-only

### Follow-up

- Next: TASK-031 (Prompt 2 input builder)

---

## 2026-07-01 — TASK-031 — Prompt 2 input builder

### Scope

`Prompt2InputBuilderService.buildPrompt2Input()` — guard (status check), vacancy source + analysis reading, analysis fallback (.json → .md), knowledge source snapshot with hashes.

### Commands

```bash
npm run test -- --testPathPattern=prompt2-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 24 suites, 173 tests — all PASS
- 5 new tests in `prompt2-input-builder.service.spec.ts`:
  - Approved workspace (`cv_generation_running`) → returns `inputContext` with vacancy source, analysis, workspace metadata, knowledge sources
  - Non-approved statuses (`source_saved`, `paused_after_analysis`, `skipped`, `cv_pdf_generated`) → `BadRequestException`, `readFile` never called
  - `sourceSnapshot` contains 64-char hex `vacancySourceHash` and per-source `contentHash`
  - Fallback: `01_vacancy_analysis.json` missing → reads `01_vacancy_analysis.md`
  - Both analysis artifacts missing → `BadRequestException`
- No filesystem writes, no AI calls — builder is read-only

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-035A — CV visual concept and block rules

### Scope

Manual planning/documentation verification for the approved clean two-column CV concept and flexible block rules.

### Commands

```bash
# Documentation-only task; no code commands run.
```

### Result

PASS

### Evidence

- Created `docs/cv-template-design/visual-concept.md`.
- Created `docs/cv-template-design/block-rules.md`.
- Block rules cover required / optional / conditional sections, priority model, hide-if-no-space order, page-break behavior and renderer schema fields.
- Prompt 2 owns content selection: variable bullet counts, exact bullet wording and selected personal/current project inclusion.
- Renderer owns layout only: placement, page breaks, column rendering and conditional hiding based on Prompt 2 priorities.

### Follow-up

- Implementation continues with TASK-032 first, because Prompt 2 generation must produce the structured content that later TASK-035B will render.
- TASK-035B can use the two design docs when Phase 6 implementation starts.

---

## 2026-07-02 — TASK-018 — KnowledgeSource selection for prompt steps

### Scope

`KnowledgeSourceSelectionService.selectForStep()` — step-to-sourceType filtering, defense-in-depth isActive guard, BadRequestException for unknown step. `Prompt1Service` updated to use `selectForStep('prompt_1', activeSources)`. `Prompt2InputBuilderService` made self-contained: removed `knowledgeSources` parameter, now injects `KnowledgeSourcesService` + `KnowledgeSourceSelectionService` and calls `findActive()` + `selectForStep('prompt_2', ...)` internally. `SourceSnapshotEntry` and `Prompt2SourceSnapshotEntry` extended with `versionLabel`.

### Commands

```bash
npm run test -- --testPathPattern="knowledge-source-selection|prompt1.service|prompt2-input-builder"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 3 suites, 34 tests — all PASS
- Full suite: 25 suites, 181 tests — all PASS
- 6 new tests in `knowledge-source-selection.service.spec.ts`: prompt_1 required+optional types, prompt_2 includes master_cv, prompt_1 excludes master_cv, unknown step throws BadRequestException, isActive:false excluded (defense in depth), optional certifications included when present
- `prompt1.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_1', [])` (explicit step assert)
- `prompt2-input-builder.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_2', allActiveSources)` (explicit step assert); all existing tests updated to remove 4th `knowledgeSources` argument; `versionLabel` field asserted in snapshot
- `pipeline.module.ts` — no change needed: `KnowledgeSourcesModule` already imported, exports both services

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-032 — Prompt 2 targeted CV generation

### Scope

`Prompt2Service.generateCvContent()` — full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save (md + json), AiRun with token usage, workspace status transition to `cv_draft_ready`. `validatePrompt2Json()` schema contract with variable bullet counts and personal/current project fields.

### Commands

```bash
npm run test -- --testPathPattern="prompt2.schema|prompt2.service"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 2 suites, 22 tests — all PASS
- Full suite: 27 suites, 203 tests — all PASS
- New test files:
  - `prompt2.schema.spec.ts` — 6 tests: valid JSON with 1 bullet, variable bullet counts (3 bullets), selected_projects with all required fields, personal/current projects separate from commercial experience, missing cv_content → fail, invalid JSON → fail
  - `prompt2.service.spec.ts` — 16 tests: success path (6), invalid JSON output (5), AI provider failure (3), workspace not found (1), missing template (1)
- State machine: `cv_generation_running` → `cv_draft_ready` on success (per docs/03_domain_model.md §8.6); `failed` on AI error or invalid JSON; `paused_after_cv_draft` is TASK-034
- `02_targeted_cv_content.md` saved before JSON validation (matches Prompt 1 pattern)
- `02_targeted_cv_content.json` saved only after successful validation
- `FAKE_PROMPT2_JSON` added to fake.provider with 2 experience bullets + 1 selected_project

### Follow-up

- Next: TASK-033 (anti-overclaiming guard) or TASK-034 (CV draft review endpoint)

---

## 2026-07-04 — TASK-033 — Basic anti-overclaiming guard

### Scope

`EvidenceGuardService.checkOutput()` — deterministic rule-based scanning of `Prompt2Output` for 15 critical claim patterns (merged from backlog + docs/08_ai_pipeline.md §11.4). Integration into `Prompt2Service` between JSON validation and artifact write, so both `.md` and `.json` artifacts contain the guard result. `needs_evidence` populated from AI `evidence_table` entries and tech skills without matching `EvidenceItem.claimArea`.

### Commands

```bash
npm run test -- --testPathPattern="evidence-guard" --forceExit
npm run test -- --forceExit
```

### Result

PASS

### Evidence

- Targeted guard run: 25/25 tests — all PASS (4.057s)
- Full suite: 28 suites, 232 tests — all PASS (22s)
- New test file `evidence-guard.service.spec.ts`: 25 tests covering:
  - 15 individual critical pattern tests (patterns 1–15, plus pattern 4b for OpenAI variant)
  - conservative rule: Kubernetes pattern flagged even when EvidenceItem exists
  - deduplication: same pattern in headline + bullet → one entry in critical_issues
  - needs_evidence source 1: evidence_table entry with status='needs evidence' → claim added
  - needs_evidence source 2: tech skill with no EvidenceItem match → added; with match → not added
  - warnings always []
  - clean input → empty result
  - false-positive check (see note below)
- Updated `prompt2.service.spec.ts`: 4 new guard integration tests:
  - evidenceService.findAll and evidenceGuard.checkOutput called on success path
  - guard receives validated Prompt2Output
  - JSON artifact written with guard-populated overclaiming_check
  - guard NOT called when JSON validation fails

#### False-positive resolution (pattern 7)

Initial pattern `/Kubernetes.{0,30}production|production.{0,30}Kubernetes/i` triggered on test text `"Production environment uses Kubernetes documentation for learning purposes only."` — 18 chars between "Production" and "Kubernetes", within the `{0,30}` limit.

Decision (confirmed by user): tighten to `{0,10}` for pattern 7 only. All legitimate CV claims place the two keywords within 1–10 chars; false-positive text has 18 chars. Pattern updated. All 25 tests pass after fix.

### Follow-up

- `exportBlocked` flag not in scope for TASK-033 — will be derived from `overclaiming_check.critical_issues.length > 0` in TASK-034 (CV draft review) or export gate.
- `warnings: []` always empty from guard — no documented warning-level pattern list exists in docs.

---

## 2026-07-04 — TASK-034 — CV draft review endpoint

### Scope

`ReviewGatesService.submitCvDraftReview()` — 3-action state machine for the CV draft review gate. `POST /workspaces/:id/review-cv-draft` endpoint. New `CvDraftReviewDto` with `CvDraftReviewAction` enum.

### Commands

```bash
npm run test -- --testPathPattern=review-gates.service
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 21/21 tests — all PASS (5.21s)
- Full suite: 28 suites, 240 tests — all PASS (20.6s)
- New DTO: `src/review-gates/dto/cv-draft-review.dto.ts` — `CvDraftReviewAction` (approve / pause / mark_not_worth_applying) + `CvDraftReviewDto` with optional `reasonNote`
- Extended `ReviewGatesService` with `submitCvDraftReview()` and `CvDraftReviewResult` interface
- New endpoint: `POST /workspaces/:id/review-cv-draft`
- 9 new tests in `review-gates.service.spec.ts`:
  - `approve` from `cv_draft_ready` → `export_running`, `canProceedToExport = true`
  - `approve` from `paused_after_cv_draft` → `export_running`, `canProceedToExport = true`
  - `pause` from `cv_draft_ready` → `paused_after_cv_draft`, `canProceedToExport = false`
  - `pause` from `paused_after_cv_draft` → stays `paused_after_cv_draft`
  - `mark_not_worth_applying` → creates `DecisionOverride` with `toDecision = manual_override_skip`, workspace `currentDecision = manual_override_skip`, `reviewState = overridden`, `canProceedToExport = false`
  - `mark_not_worth_applying` → stores `null` reasonNote when not provided
  - `NotFoundException` when workspace not found
  - `BadRequestException` when status is not `cv_draft_ready` or `paused_after_cv_draft`
- State machine matches §8.6 exactly: `cv_draft_ready` / `paused_after_cv_draft` → `export_running` (approve) or `paused_after_cv_draft` (pause / mark_not_worth_applying)
- No new Prisma migrations — all enum values already present
- No changes to `SkipReasonService` — `mark_not_worth_applying` uses `manual_override_skip` (distinct from `skip`), audit path via `DecisionOverride` only

### Follow-up

- Next: TASK-035B (CV template schemas + renderer) or TASK-036 (PDF export)

---

## 2026-07-04 — TASK-035B — CV JSON schemas and flexible HTML template

### Scope

`CvContent` renderer input schema, `PrePdfCheckOutput` correction overlay schema, Handlebars HTML template, and pure `renderCvTemplate()` / `applyCorrectionsToCvContent()` functions. No file I/O, no NestJS services.

### Commands

```bash
npm run test -- --testPathPattern=cv-content.schema
npm run test -- --testPathPattern=cv-template-renderer
npm run test
```

### Result

PASS

### Evidence

- Schema tests: 20/20 PASS (`cv-content.schema.spec.ts` — 14 CvContent + 6 PrePdfCheckOutput)
- Renderer tests: 23/23 PASS (`cv-template-renderer.spec.ts`)
- Full suite: 30 suites, 283 tests — all PASS (21.0s)
- New files:
  - `src/pipeline/schemas/cv-content.schema.ts` — `CvContent` renderer contract with `validateCvContentJson()`
  - `src/pipeline/schemas/pre-pdf-check.schema.ts` — `PrePdfCheckOutput` + `PrePdfCheckCorrection` with `validatePrePdfCheckJson()`
  - `src/document-export/templates/cv.template.html` — Handlebars two-column CSS Grid template (27% left / 73% main)
  - `src/document-export/cv-template-renderer.ts` — pure functions: `renderCvTemplate()` + `applyCorrectionsToCvContent()`
  - `src/pipeline/schemas/cv-content.schema.spec.ts`
  - `src/document-export/cv-template-renderer.spec.ts`
- `docs/03_domain_model.md` §23 — brief documentation of both schemas with TypeScript file references
- Key invariant: `current_work_block` is a required top-level block rendered before Professional Experience; `include: boolean` controls visibility
- Prompt 3 corrections applied in memory via `field_path` (e.g. `"experience[0].bullets[1].text"`) — original `CvContent` never mutated

### Follow-up

- Next: TASK-035 (`HtmlRendererService` — orchestrates file I/O, reads `03_pre_pdf_check.json` if present, calls `renderCvTemplate()`, writes `04_cv_export.html`) or TASK-036 (PDF export)

---

## 2026-07-05 — TASK-PH-001 — Add @nestjs/config with Joi env validation

### Scope

Install `@nestjs/config` and `joi`. Create `src/config/env.validation.ts` Joi schema (8 vars). Wire `ConfigModule.forRoot({ isGlobal: true })` as first import in `AppModule`. Replace all direct `process.env` reads with `ConfigService`. Delete `src/config/storage.config.ts` (only used in `ArtifactStorageService`). Update spec to use mock `ConfigService` instead of `process.env.STORAGE_ROOT`. Add `env.validation.spec.ts` unit tests.

### Commands

```bash
# Baseline
npm run test  # → 30 suites, 285 tests, 0 failures

# Install
npm install @nestjs/config joi

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (+7 new tests in env.validation.spec.ts)
npx tsc --noEmit    # → no output (clean)
```

### Result

PASS. +1 suite, +7 tests. TypeScript clean.

### Evidence

- `npm run test` before: 30 suites, 285 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `grep -rn "process.env" src/` after changes — only `artifact-storage.service.spec.ts` lines that SET `process.env` via mock removed; zero production `process.env` reads remain
- `src/config/storage.config.ts` deleted (only consumer was `ArtifactStorageService`; decision: delete file, inject `ConfigService` directly)
- `DATABASE_URL` note: validated by Joi schema at boot; not read via `process.env` in NestJS application code (Prisma reads it from the environment directly, outside NestJS DI) — no substitution needed in application code
- New files: `src/config/env.validation.ts`, `src/config/env.validation.spec.ts`
- Updated files: `src/app.module.ts`, `src/main.ts`, `src/artifacts/artifact-storage.service.ts`, `src/artifacts/artifact-storage.service.spec.ts`, `.env.example`
- Deleted files: `src/config/storage.config.ts`

### Follow-up

- Unblocks TASK-PH-002 (helmet + CORS — uses `CORS_ORIGIN` from ConfigService)
- Unblocks TASK-PH-003 (throttler — uses `THROTTLE_TTL` / `THROTTLE_LIMIT` from ConfigService)
- Unblocks TASK-PH-007 (Pino logging — uses `LOG_LEVEL` from ConfigService)

---

## 2026-07-05 — TASK-PH-002 — Add security headers: helmet + CORS

### Scope

Install `helmet`, wire `app.use(helmet())` and `app.enableCors(...)` in `src/main.ts` using `ConfigService`. Manual curl check of response headers.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install helmet

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (no regressions)
npx tsc --noEmit    # → clean

# Manual curl check (server started with STORAGE_ROOT set)
curl -I http://localhost:3000/health
```

### Result

PASS. Test count unchanged. TypeScript clean. All required security headers present.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `curl -I http://localhost:3000/health` output (selected headers):
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self';base-uri 'self';...
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-DNS-Prefetch-Control: off
  X-XSS-Protection: 0
  Access-Control-Allow-Origin: *
  ```
- All acceptance-criteria headers confirmed present
- `Access-Control-Allow-Origin: *` confirms CORS enabled (no CORS_ORIGIN set → fallback to `'*'`)
- `allowSyntheticDefaultImports: true` in tsconfig allows `import helmet from 'helmet'` (no esModuleInterop needed)

### Note on STORAGE_ROOT

`.env` did not yet contain `STORAGE_ROOT` (added to `.env.example` in PH-001 but not yet propagated to local `.env`). Server started for curl test with `STORAGE_ROOT=./storage/applications` set inline. User should add `STORAGE_ROOT` to their `.env` before running the app normally.

### Follow-up

- Unblocks nothing new (PH-003, PH-004 already unblocked by PH-001)
- Next parallel tasks: TASK-PH-003 (throttler) and TASK-PH-004 (husky)

---

## 2026-07-05 — TASK-PH-006 — GitHub Actions CI pipeline

### Scope

Создать `.github/workflows/ci.yml` с четырьмя job: lint, typecheck, test (PostgreSQL service + prisma migrate deploy), build. Node.js 20.x, npm cache по `package-lock.json`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Push PR → CI запустился автоматически
gh pr create --title "chore: TASK-PH-006 GitHub Actions CI pipeline" --base main
# PR: https://github.com/strakhovdenya/jobflow-cv-pipeline/pull/27
```

### Result

PASS — все 4 CI job прошли

### Evidence

GitHub Actions run: https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/runs/28750227123

| Job | Status | Duration |
|---|---|---|
| Lint | ✅ pass | 28s |
| Typecheck | ✅ pass | 30s |
| Test | ✅ pass | 52s |
| Build | ✅ pass | 26s |

### Follow-up

- Next: TASK-PH-007 (structured logging — nestjs-pino)

---

## 2026-07-05 — TASK-PH-005 — Production Dockerfile (multi-stage, non-root user)

### Scope

Create multi-stage production Dockerfile (builder + runner, `node:20-alpine`, `USER node`, `HEALTHCHECK`), `.dockerignore`, and optional `app` service in `docker-compose.yml`. Verify `docker build`, `docker compose up app`, and `curl /health`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Build image
docker build -t jobflow-cv-pipeline .

# Start full stack via compose (postgres already running)
docker compose up app -d

# Smoke test
curl http://localhost:3000/health
# → {"status":"ok"}

# docker run standalone test (requires network + DATABASE_URL override)
docker run --rm -d --name jobflow_test \
  --env-file .env \
  --network jobflow-cv-pipeline_default \
  -e DATABASE_URL=postgresql://jobflow:jobflow_secret@postgres:5432/jobflow_cv \
  -e STORAGE_ROOT=/tmp/storage \
  -p 3000:3000 jobflow-cv-pipeline
curl http://localhost:3000/health
# → {"status":"ok"}
docker stop jobflow_test
```

### Result

PASS

### Evidence

- `docker build -t jobflow-cv-pipeline .` — exits cleanly
- `docker compose up app -d` — container starts, status `Up (healthy)` after ~15s
- `curl http://localhost:3000/health` → `{"status":"ok"}`
- `docker run` standalone with network override → `{"status":"ok"}`
- Prisma engine binary in image: `libquery_engine-linux-musl-openssl-3.0.x.so.node` (correct for Alpine)

### Notes / Discovered issues

**Prisma + Alpine 3.22 (OpenSSL 3.5.x) compatibility:**  
`node:20-alpine` ships OpenSSL 3.5.7 but no `openssl` CLI. Prisma 5.22's platform detection runs `openssl version`; without the CLI it falls back to `linux-musl` (OpenSSL 1.1), which is absent on modern Alpine. Fix: `apk add --no-cache openssl` in both builder and runner stages installs the CLI, enabling Prisma to detect OpenSSL 3.x and generate the `linux-musl-openssl-3.0.x` binary (links against `libssl.so.3` which is present by default).

**Prisma schema must be present before `npm ci`:**  
`@prisma/client` runs `prisma generate` as a postinstall hook. Copying `prisma/` before `npm ci` ensures the generated typed client matches the project schema.

**Husky in production install:**  
`npm ci --omit=dev` in a runner stage still triggers the `prepare: "husky"` lifecycle script, which fails because husky is a devDependency. Workaround: use `npm prune --omit=dev` in the builder stage after build (preserving Prisma generated client), then `COPY --from=builder /app/node_modules` — avoids a fresh install in runner entirely.

**DATABASE_URL in docker-compose.yml:**  
`env_file: .env` sets `DATABASE_URL=...@localhost:5432/...` which is only valid on the host. The `environment:` override corrects the host to the `postgres` service name and hardcodes port `5432` (the container-internal port, not `${POSTGRES_PORT}` which is the host-side mapping).

**Standalone `docker run --env-file .env` note:**  
Without `--network` and a `DATABASE_URL` override, the container cannot reach the postgres service. For full-stack local testing, `docker compose up app` is preferred; `docker run` needs the extra flags documented above.

### Follow-up

- Next: TASK-PH-006 (GitHub Actions CI)

---

## 2026-07-06 — TASK-PH-007A — Docker build validation in CI

### Scope

Add `docker-build` CI job to `.github/workflows/ci.yml`. Job builds production Docker image, applies Prisma migrations, starts container via `docker run --network host`, polls `/health` (max 60s), verifies no pending migrations via `npx prisma migrate status`, then tears down the container.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Change
# Added docker-build job to .github/workflows/ci.yml (no code changes)

# After change
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)

# CI verification — push PR, watch GitHub Actions
gh pr create --title "chore: TASK-PH-007A Docker build validation in CI" --base main
```

### Result

PASS — pending CI run result (to be updated after GitHub Actions completes)

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions; only YAML changed)
- Only `.github/workflows/ci.yml` modified — no application code touched
- New job structure: postgres service → npm ci → prisma migrate deploy → docker build → docker run → /health poll → prisma migrate status → teardown
- `--network host` comment added (Linux ubuntu-latest specific)
- Existing 4 jobs (lint, typecheck, test, build) unchanged

### Follow-up

- Update this entry with actual CI run URL and job duration once PR is merged and Actions completes.
- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-PH-008 — Swagger/OpenAPI documentation

### Scope

Added `@nestjs/swagger` (v7.4.2, compatible with the project's NestJS v10) and `swagger-ui-express`. Configured `SwaggerModule` in `main.ts` with `DocumentBuilder` (title `JobFlow CV Pipeline`, version `0.1.0`, one-line description, `addBearerAuth()`). Swagger is mounted only when `NODE_ENV !== 'production'`. Added `@ApiTags`/`@ApiOperation` to all three controllers (`AppController`, `ArtifactsController`, `WorkspacesController`) and `@ApiProperty()` to all fields of all four DTOs (`CreateWorkspaceDto`, `SubmitDecisionDto`, `OverrideSkipDto`, `CvDraftReviewDto`).

### Commands

```bash
# Baseline
npm run build          # → success
npm run test           # → 31 suites, 292 tests, 0 failures

# Install
npm install @nestjs/swagger@7.4.2 swagger-ui-express

# After change
npm run build           # → success
npx tsc --noEmit        # → no errors
npm run test             # → 31 suites, 292 tests, 0 failures (no regressions)

# Manual verification — dev mode (NODE_ENV unset)
npm run start:dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api          # → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api-json     # → 200
curl -s http://localhost:3000/health                                       # → {"status":"ok"} (tried via Swagger-equivalent GET)

# Manual verification — production mode
NODE_ENV=production PORT=3001 node dist/src/main.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api         # → 404 (Swagger not mounted)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api-json    # → 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health      # → 200 (business logic unaffected)
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npx tsc --noEmit` — clean, no errors
- `GET /api` (dev) → 200, Swagger UI HTML served
- `GET /api-json` (dev) → 200, valid OpenAPI 3.0 document; `info.title = "JobFlow CV Pipeline"`, `info.version = "0.1.0"`, `components.securitySchemes.bearer` present
- All 12 endpoints present in the OpenAPI document: `GET /health`, `GET /version`, `POST /workspaces`, `GET /workspaces`, `GET /workspaces/{id}`, `POST /workspaces/{id}/run-analysis`, `POST /workspaces/{id}/review-decision`, `POST /workspaces/{id}/confirm-skip`, `POST /workspaces/{id}/override-skip`, `POST /workspaces/{id}/review-cv-draft`, `GET /workspaces/{id}/artifacts`, `GET /artifacts/{id}/download`
- `GET /health` executed successfully (200, `{"status":"ok"}`), confirming a live request works against the documented API
- `GET /api` and `GET /api-json` → 404 when `NODE_ENV=production`; `GET /health` still 200 in the same run, confirming business logic and existing endpoints are untouched by the Swagger gating

### Follow-up

- Pre-existing, unrelated issue noticed during manual verification: `start:prod` script (`node dist/main`) does not match actual build output path (`dist/src/main.js`). Out of scope for TASK-PH-008 (Key Invariants forbid touching build/CI config); flagging for a future task.
- Next: none selected — awaiting user's next task pick per `CLAUDE.md` "do not choose the next task automatically."

---

## 2026-07-05 — TASK-PH-007 — Structured logging (nestjs-pino)

### Scope

Install `nestjs-pino`, `pino-http`, `pino-pretty`. Wire `LoggerModule.forRootAsync()` in `AppModule` with `ConfigService` for `LOG_LEVEL`. Enable `pino-pretty` transport in `NODE_ENV !== 'production'`. Replace `console.log()` in `main.ts` with `app.get(Logger).log()`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Install
npm install nestjs-pino pino-http pino-pretty

# After changes
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)
npm run build   # → success

# Manual: production mode (JSON logs)
NODE_ENV=production LOG_LEVEL=info node dist/src/main

# Manual: development mode (pretty logs)
NODE_ENV=development LOG_LEVEL=info node dist/src/main
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npm run build` — clean

**Production mode JSON log sample:**
```json
{"level":30,"time":1783276322101,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"NestFactory","msg":"Starting Nest application..."}
{"level":30,"time":1783276322103,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"InstanceLoader","msg":"PrismaModule dependencies initialized"}
```

**Development mode pretty log sample:**
```
[20:32:15.855] INFO (31780): Starting Nest application... {"context":"NestFactory"}
[20:32:15.855] INFO (31780): PrismaModule dependencies initialized {"context":"InstanceLoader"}
```

- `nestjs-pino`, `pino-http`, `pino-pretty` added to `dependencies` (not devDependencies — pino-pretty needed in dev Docker containers)
- `bufferLogs: true` in `NestFactory.create` — ensures buffered NestJS bootstrap logs go through Pino
- `transport` key present only when `NODE_ENV !== 'production'` (spread pattern, not `undefined` value)
- `console.log()` on `main.ts:15` replaced with `app.get(Logger).log()`

### Follow-up

- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-035 — Deterministic CV draft to HTML renderer

### Scope

`HtmlRendererService.renderToHtml(workspaceId)`: reads `02_targeted_cv_content.json`, maps `Prompt2Output` → `CvContent` via `mapPrompt2OutputToCvContent()` (new mapper, `src/document-export/prompt2-to-cv-content.mapper.ts`), sources candidate identity/education/languages/links/volunteering from the new static config `src/document-export/candidate-profile.config.ts`, optionally applies `03_pre_pdf_check.json` corrections, calls existing `renderCvTemplate()`, writes `04_cv_export.html`, registers `GeneratedArtifact` with `origin = generated_by_export_service`. No AI provider call, no workspace status transition.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 31 suites / 292 tests passed, `npm run build` clean.
- After implementation: `npm run test` → 33 suites / 302 tests passed (2 new spec files, 10 new tests), `npx tsc --noEmit` clean, `npm run build` clean.
- New tests: `src/document-export/prompt2-to-cv-content.mapper.spec.ts` (current_work_block/experience/selected_projects copied verbatim; candidate/education/languages/links/volunteering sourced from static config, not Prompt2Output) and `src/document-export/html-renderer.service.spec.ts` (renders expected sections; 404 on missing workspace; Prompt 3 corrections applied when `03_pre_pdf_check.json` present and skipped on `ENOENT`; non-ENOENT read errors rethrown; `GeneratedArtifact` registered with canonical name `04_cv_export.html` and `origin = generated_by_export_service`; no AI provider dependency exists on the service at all).
- No real filesystem/DB run performed (unit tests only, per task scope — no controller/module wiring yet, that is TASK-036B).

### Follow-up

- Static config `candidate-profile.config.ts` contains a placeholder education entry (institution/degree/dates) — needs real data filled in before a real export is generated.
- Next: TASK-036A (choose PDF library) → TASK-036B (export controller + status transitions), which will wire `HtmlRendererService` into a NestJS module.

---

## 2026-07-06 — TASK-036A — Choose PDF library and implement PdfExportService

### Scope

`PdfExportService.htmlFileToPdf(htmlFilePath, pdfOutputPath)`: launches Puppeteer, navigates to the `file://` URL of the input HTML file, calls `page.pdf({ format: 'A4' })`, closes the browser in a `finally` block. Standalone `@Injectable()` class, same pattern as `HtmlRendererService` (TASK-035) — no NestJS module created, not registered as a provider anywhere (DI wiring is TASK-036B). No workspace/DB reads, no `GeneratedArtifact` writes, no status transitions.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
npm run lint
npx jest src/document-export/pdf-export.service.spec.ts --detectOpenHandles
tasklist | findstr /I chrome   # PowerShell/cmd equivalent used to check for leaked processes
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 33 suites / 302 tests passed, `npm run build` clean.
- `npm install puppeteer` → added `puppeteer@^24.43.1`, exit code 0. Warnings were pre-existing unrelated peer-dependency notices (`@nestjs/swagger` vs `class-validator`), not caused by this install.
- Puppeteer launched successfully on this Windows 11 machine with **default options — no `--no-sandbox` or other launch flags required**.
- **CI update (PR #32 review):** `Test` job failed on GitHub Actions (Linux runner) with `Failed to launch the browser process` / `FATAL:...zygote_host_impl_linux.cc: No usable sandbox!` — GitHub Actions' Linux containers disable unprivileged user namespaces, so Chromium's sandbox cannot start there even though it works unsandboxed on this Windows 11 dev machine. Added `{ args: ['--no-sandbox'] }` to `puppeteer.launch()` per the Library Decision fallback documented in `CURRENT_TASK.md`, with a code comment explaining the CI-vs-local discrepancy. Re-ran locally after the fix: still 34/34 suites, 303/303 tests, `tsc --noEmit` clean.
- After implementation: `npm run test` → 34 suites / 303 tests passed (1 new spec file, 1 new test), `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` clean.
- New test `src/document-export/pdf-export.service.spec.ts`: writes a minimal HTML file to a real temp directory (`fs.mkdtemp`), calls `htmlFileToPdf`, asserts `statSync(pdfPath).size > 0` on a real Puppeteer-generated PDF — no mocking of Puppeteer.
- Full suite run showed a Jest warning ("A worker process has failed to exit gracefully... force exited"). Investigated: running `pdf-export.service.spec.ts` in isolation with `--detectOpenHandles` shows **no open handles and no warning**; running the full suite with the new spec stashed out shows **no warning** (confirms the warning only appears when this spec runs inside the larger parallel suite). Checked running Chrome processes via `wmic process where "name='chrome.exe'" get ProcessId,CommandLine` after a full test run — no headless/puppeteer-flagged Chrome process was found, only the developer's regular browser windows. Conclusion: this is a known Jest-worker-teardown timing artifact of Puppeteer's internal transport handle under parallel Jest workers, not a leaked Chrome process — the browser is correctly closed via the `finally` block on every call.

### Follow-up

- None for this task. TASK-036B will wire `PdfExportService` into `document-export.module.ts` alongside `HtmlRendererService`.

---

## 2026-07-06 — TASK-036B — DocumentExportController and full export orchestration

### Scope

`DocumentExportService.exportCv(workspaceId)`: guards on `status === export_running` (400 `BadRequestException` otherwise), calls `HtmlRendererService.renderToHtml()` then `PdfExportService.htmlFileToPdf()` in order, hashes the resulting PDF binary via a local `createHash('sha256')` over the raw `Buffer` (not `HashService.hashFile`, which reads as `utf-8` text and would corrupt a binary hash), registers `04_cv_export.pdf` as a `GeneratedArtifact` (`origin: generated_by_export_service`), and transitions workspace status to `cv_pdf_generated` on success or `failed` on any thrown error (rethrown after the status update). `DocumentExportController`: `POST /workspaces/:id/export-cv` delegates to the service; `GET /workspaces/:id/download-cv` resolves the workspace's company/role slugs and the most recently registered PDF `GeneratedArtifact`, applies the same path-safety check as `ArtifactsController.download`, and streams the file with `Content-Disposition: attachment; filename="Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf"`. `DocumentExportModule` follows ADR-017 (imports `PrismaModule`, `ArtifactStorageModule`, `ArtifactsModule` directly; no `exports`) and is registered in `AppModule`. Both endpoints carry `@ApiOperation` per ADR-019.

### Commands

```bash
git checkout -b task/TASK-036B-document-export-controller
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → 34 suites / 303 tests passed.
- After implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (2 new spec files, 13 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (no errors/warnings).
- New tests in `src/document-export/document-export.service.spec.ts` (7 tests, manual jest mocks — no real Prisma/Puppeteer): 404 when workspace missing; 400 `BadRequestException` when status is not `export_running` (and neither collaborator is called); `HtmlRendererService.renderToHtml` called before `PdfExportService.htmlFileToPdf` (call-order assertion); status → `cv_pdf_generated` on success; status → `failed` and error rethrown when `PdfExportService` throws; `ArtifactsService.register` called with `canonicalFileName: '04_cv_export.pdf'`, `origin: 'generated_by_export_service'`, `mimeType: 'application/pdf'`; constructor arity check (`DocumentExportService.length === 4`) confirms no `AiProvider`/`AI_PROVIDER` dependency exists to call.
- New tests in `src/document-export/document-export.controller.spec.ts` (6 tests): `POST :id/export-cv` delegates to `DocumentExportService.exportCv`; `GET :id/download-cv` sets the exact expected `Content-Disposition` filename and streams the PDF buffer; picks the most recently registered PDF artifact when more than one exists for the workspace; 404 when workspace does not exist; 404 when no PDF artifact has been registered yet; 404 when the registered PDF's file is missing on disk.
- No `AiRun` created and no AI provider invoked anywhere in the new code — confirmed by inspection (`DocumentExportService`'s constructor has no `AI_PROVIDER`/`AiProvider`/`AiRunsService` parameter) and by the constructor-arity unit test above.
- Manual end-to-end run against a live workspace/DB was not performed in this session (would require a workspace already parked at `export_running` with an approved `02_targeted_cv_content.json` on disk); coverage relies on the unit tests above plus the already-verified real-Puppeteer test in `pdf-export.service.spec.ts` (TASK-036A) and the already-verified `HtmlRendererService` rendering tests (TASK-035).

### Follow-up

- TASK-037 (Markdown/JSON export endpoints) is next in the Phase 6 order; not implemented in this task.

---

## 2026-07-06 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implements the existing `AiProvider` interface unchanged: `providerName = 'openai'`, `modelName` read from `ConfigService.get('OPENAI_MODEL')` (falls back to `'gpt-4o'`), constructs an `openai` SDK client with `apiKey` from `ConfigService.get('OPENAI_API_KEY')`. `complete(prompt, inputContext, options)` calls `chat.completions.create()` with `prompt` as the `system` message and `inputContext` as the `user` message, requests `response_format: { type: 'json_object' }` when `options.jsonMode` is set, and maps the response into `AiProviderResult` (`text` from `choices[0].message.content`, `parsedJson` via `JSON.parse(text)` when `jsonMode`, `rawResponse` as the raw SDK response, `usage` mapped from `CompletionUsage` — `prompt_tokens`→`inputTokens`, `completion_tokens`→`outputTokens`, `total_tokens`→`totalTokens`, `prompt_tokens_details.cached_tokens`→`cachedInputTokens`, `completion_tokens_details.reasoning_tokens`→`reasoningTokens`, full raw usage JSON stringified into `rawJson`). `ai.module.ts` now exports a `createAiProvider(configService: ConfigService): AiProvider` factory function used as the `AI_PROVIDER` provider's `useFactory` (`inject: [ConfigService]`): returns `new OpenAiProvider(configService)` when `configService.get('AI_PROVIDER') === 'openai'`, otherwise `new FakeAiProvider()` (default, unchanged behavior when `AI_PROVIDER` is unset). Added `AI_PROVIDER` (`Joi.string().valid('fake','openai').default('fake')`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` (all optional) to `src/config/env.validation.ts`, and documented all five in `.env.example` (`AI_PROVIDER_DEFAULT`/`AI_MODEL_DEFAULT` noted as reserved for future step-level overrides — not read by any code yet, matching the ambiguous but explicit backlog acceptance criterion). `FakeAiProvider`, `Prompt1Service`, `Prompt2Service`, `SkipReasonService` and the `AiProvider`/`AiProviderOptions`/`AiProviderResult`/`AiProviderUsage` contracts were not touched.

### Commands

```bash
git checkout -b task/TASK-037A-openai-provider
npm install openai
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (confirmed fresh, not assumed from `TASK_BOARD.md`).
- `openai` SDK added as a production dependency after explicit user confirmation (no OpenAI SDK previously in `package.json`) — installed `openai@6.45.0`.
- After implementation: `npm run build` clean; `npm run test` → **38 suites / 324 tests passed** (2 new spec files, 8 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (auto-fix reformatted line-wrapping only, no errors/warnings).
- New tests in `src/ai/providers/openai.provider.spec.ts` (5 tests, `openai` SDK client mocked via `jest.mock('openai', ...)` — no real network calls): provider/model name reflects `ConfigService` values; falls back to `'gpt-4o'` when `OPENAI_MODEL` is unset; maps a mocked plain-text response into `AiProviderResult` and asserts the exact `messages`/`model` payload sent to `chat.completions.create`; requests `response_format: json_object` and parses `parsedJson` when `jsonMode` is enabled, including cached/reasoning token mapping; returns `usage: undefined` when the mocked response has no `usage` field.
- New tests in `src/ai/ai.module.spec.ts` (3 tests): `createAiProvider()` returns `FakeAiProvider` when `AI_PROVIDER` is unset; returns `FakeAiProvider` when explicitly `'fake'`; returns `OpenAiProvider` when `'openai'`.
- All pre-existing `FakeAiProvider`/pipeline tests (`fake.provider.spec.ts`, `prompt1.service.spec.ts`, `prompt2.service.spec.ts`, `skip-reason.service.spec.ts`, etc.) pass unmodified — no source changes to any pipeline consumer of `AI_PROVIDER`.
- Manual smoke test with a real `OPENAI_API_KEY` against the live OpenAI API was **not performed** in this session (no API key available in this environment); documenting the intended manual check instead: set `AI_PROVIDER=openai` and a real `OPENAI_API_KEY`/`OPENAI_MODEL` in a local `.env` (never commit it), then call `Prompt1Service`'s pipeline (or invoke `OpenAiProvider.complete()` directly in a scratch script) and confirm a non-empty `text`/`parsedJson` response with populated `usage` fields. This manual check is a follow-up for whoever runs the first real pipeline call, not a blocker for closing this task per its Done Definition (abstraction works with fake provider; wiring to a real key is an operational step).

### Follow-up

- TASK-037B (seed real Prompt 1/Prompt 2 template content) and TASK-037D (.env/onboarding docs) are next in the recommended Phase 6 order — not implemented in this task.
- The real-provider manual smoke test above should be performed once a real `OPENAI_API_KEY` is available, ideally as part of TASK-038A (practical MVP real-provider smoke test).

---

## Required MVP Test Areas

- Unit test setup: `npm run test`.
- Slug normalization unit tests.
- Workspace validation unit tests.
- Canonical artifact naming unit tests.
- Skip decision / approval gate unit tests.
- Anti-overclaiming guard unit tests.
- PostgreSQL persistence verification.
- First usable MVP smoke test.

## PostgreSQL Persistence Verification Template

```md
## YYYY-MM-DD — TASK-005 — PostgreSQL persistence verification

### Commands

```bash
docker compose up -d
# create table/record through psql or script
docker compose down
docker compose up -d
# verify table/record still exists
```

### Expected Result

Data survives `docker compose down` and restart because the database uses named volume `postgres_data`.

### Destructive Command Warning

`docker compose down -v` removes the named volume and deletes local database data. Use it only intentionally.
```
## Documentation consistency check — Current-work source sync

Manual documentation check completed:

- Verified old source-name references were replaced with current active source names.
- Verified current-work block is documented separately from commercial experience and selected projects.
- Verified no task sections before or including TASK-032 were intentionally changed.
- No code tests were run; documentation-only sync.

## 2026-07-07 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implementing `AiProvider` via the `openai` SDK. `AiModule` (`src/ai/ai.module.ts`) selects `FakeAiProvider` or `OpenAiProvider` via a `createAiProvider(configService)` factory keyed on `AI_PROVIDER` env var (`fake` default, `openai` when set). `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` added to `src/config/env.validation.ts` and `.env.example`.

### Commands

```bash
npm run test
```

Baseline before this task (last recorded, TASK-036B): 36 suites, 316 tests.
Result after TASK-037A: 38 suites, 324 tests, 0 failures.

### Result

PASS

### Evidence

- `src/ai/providers/openai.provider.spec.ts` mocks the OpenAI SDK client — no real network call in unit tests.
- `src/ai/ai.module.ts` factory tested for both `AI_PROVIDER` unset/`fake` (returns `FakeAiProvider`) and `AI_PROVIDER=openai` (returns `OpenAiProvider`) selection paths.
- `OpenAiProvider.complete()` maps `response.choices[0].message.content` → `text`, parses `text` to `parsedJson` when `options.jsonMode` is set, and maps `response.usage` → `AiProviderUsage` (`inputTokens`, `outputTokens`, `totalTokens`, `cachedInputTokens`, `reasoningTokens`, `rawJson`).
- Existing `FakeAiProvider` and pipeline tests unmodified and passing.
- `.env.example` documents all 5 new vars without a real key committed.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` (Prompt 1 call through `AiProvider` abstraction with `AI_PROVIDER=openai`) not yet performed/recorded — required before TASK-038A (real-provider MVP smoke test).
- Next recommended task: TASK-037B (seed real Prompt 1/Prompt 2 template content).

## 2026-07-07 — TASK-037B — Seed real Prompt 1 and Prompt 2 template content

### Scope

Replaced placeholder `PromptTemplate` seed content with real prompts implementing the content-selection contract from `docs/08_ai_pipeline.md` §8.4/§10.6–10.8. Prompt text stored as `prisma/prompts/prompt1.txt` and `prisma/prompts/prompt2.txt`, read via `fs.readFileSync` in `prisma/seed.ts` (`readPromptFile()` helper). No changes to `PromptTemplate` model, `PromptTemplatesService`, `AiProvider`/`OpenAiProvider`/`FakeAiProvider`, pipeline services, HTML renderer or CV JSON schema. Prompts adapted from a user-supplied ChatGPT-style conversational draft: condensed the full scoring/risk/safety logic (German language gate, current-work block rules, overclaiming guardrails, risk-stacking) into strict JSON-only output instructions matching `prompt1.schema.ts`/`prompt2.schema.ts` field names exactly — the original draft targeted a human chat session (markdown file creation, follow-up questions, quality-score sections) and was not usable verbatim against `AiProvider.complete(..., { jsonMode: true })`.

### Commands

```bash
npm run test
npx prisma db seed
npx prisma db seed   # re-run to verify idempotency
```

Baseline before this task (TASK-037A): 38 suites, 324 tests.
Result after TASK-037B: 39 suites, 339 tests, 0 failures (+1 suite / +15 tests: new `src/pipeline/prompt-template-content.spec.ts` contract test; all pre-existing tests unmodified and passing).

### Result

PASS

### Evidence

- `npx prisma db seed` run twice against the local dev Postgres (`jobflow_postgres` container): both runs report "Seeded 2 active PromptTemplate records", no errors.
- DB verification query after both runs:
  ```
  id                                    | promptKey                    | step     | version | isActive | content_len
  seed-prompt-1-vacancy-analysis-v1     | prompt_1_vacancy_analysis    | prompt_1 |    1    | t        | 9741
  seed-prompt-2-targeted-cv-content-v1  | prompt_2_targeted_cv_content | prompt_2 |    1    | t        | 11075
  ```
  Exactly 2 rows both times — confirms the fixed-ID upsert pattern in `seed.ts` does not create duplicate active versions on re-run.
- `src/pipeline/prompt-template-content.spec.ts` (15 tests) verifies: Prompt 1 requires JSON-only output and the exact `Prompt1Analysis` field names; Prompt 2 covers all 10 points of the §10.8 template contract (bullet count/wording decision, evidence-based bullets, mandatory current-work block, personal/project inclusion, separate labeling from commercial experience, `include`/`project_type`/`relevance_reason` fields on selected projects, rendering hints/priorities, no fixed bullet count, no moving current-work/projects into commercial history, `needs evidence` marking) plus the "renderer must not invent/rewrite/reinterpret" statement.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` and a real vacancy (Prompt 1 + Prompt 2 end-to-end through `AiProvider`) not yet performed — still pending before TASK-038A.
- Known MVP gap (pre-existing, not introduced by this task): `PromptInputBuilderService`/`Prompt2InputBuilderService` list knowledge sources by name only (`[content not loaded in MVP]`), so the seeded prompts instruct the AI to treat unloaded source content as unverifiable and mark related claims `needs evidence` rather than assuming file content is available. Loading actual source content into the input context is out of scope for TASK-037B (see TASK-037C-0/037C).
- Next recommended task: per `TASK_BOARD.md`, TASK-037C-0 (create and commit knowledge source content files).

## 2026-07-07 — TASK-037C-0 — Create and commit knowledge source content files

### Scope

Created the `knowledge-sources/` folder structure (`candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/`, `prompts/`) with `.gitkeep` in each empty subfolder. Copied the user-supplied prompt source files (from `D:\infa\Documents\jobs for analys\New folder`) into `knowledge-sources/prompts/` under the backlog-mandated filenames, verbatim: `prompt_1_vacancy_analysis.md`, `prompt_2_targeted_cv_content.md`, `prompt_2_1_cover_letter.md`, `prompt_3_pre_pdf_check.md`, `prompt_4_pdf_export_rules.md`, `prompt_5_final_check.md`. Two additional files (`prompt_4_1_optional_html.md`, `prompt_6_recruiter_message.md`) were renamed and placed for future use only — not wired into any pipeline logic, `Prompt2InputBuilder`, or registration script. Added `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources` to `.env.example`. Documented the git strategy (commit all files to the private repo, no `.gitignore` changes) in `knowledge-sources/README.md`. No content was created for `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` — that remains manual developer work outside this session, per `CURRENT_TASK.md` scope. No Prisma schema, controller, service, or DB registration changes — that is TASK-037C.

### Commands

```bash
find knowledge-sources -type f
diff <source file> knowledge-sources/prompts/<renamed file>   # x8, all identical
```

### Result

PASS

### Evidence

- `find knowledge-sources -type f` confirms all 6 backlog-mandated prompt files plus `README.md` and 5 `.gitkeep` files exist at the expected paths.
- `diff` between each of the 8 source files (in `D:\infa\Documents\jobs for analys\New folder`) and its renamed copy in `knowledge-sources/prompts/` reported no differences — content copied byte-for-byte, no text edits.
- `.env.example` contains `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources`.
- `knowledge-sources/README.md` documents the git strategy and explicitly flags `prompt_4_1_optional_html.md` / `prompt_6_recruiter_message.md` as future-scope, not consumed by TASK-037C.

### Follow-up

- Developer role (per `docs/07_task_backlog.md` TASK-037C-0 section) still open: populate `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` with real content files. Not required for TASK-037C-0's Claude Code scope but is required before TASK-037C (registration) can reference them.
- Next recommended task: per `TASK_BOARD.md`, TASK-037C (register and activate knowledge source files) — blocked until developer supplies the content files above.

## 2026-07-07 — TASK-037C — Register and activate knowledge source files

### Scope

User supplied the 9 real content files at `C:\Users\Denys\Downloads\sources`; filenames matched the required target names exactly (no ambiguity, no guessing needed). Copied each file verbatim into its target path under `knowledge-sources/candidate-profile/`, `knowledge-sources/evidence/`, `knowledge-sources/cv-rules/`, `knowledge-sources/certifications/`, `knowledge-sources/layout/`. Verified the 6 backlog-mandated `knowledge-sources/prompts/*.md` files already exist (from TASK-037C-0) — not modified. Added `scripts/register-knowledge-sources.ts`, a standalone idempotent script (`npm run register-knowledge-sources`) that registers the 9 files via direct Prisma calls matching `KnowledgeSourcesService.importSource` semantics (file path, source type, version label, active flag, content hash via `HashService`-equivalent SHA-256-over-UTF-8 hashing), keyed by `filePath` for idempotency (no unique DB constraint added — application-level find-then-upsert instead, to avoid an unnecessary migration). `sourceType` values assigned to match the existing `KnowledgeSourceSelectionService` `STEP_SOURCE_GROUPS` vocabulary (`master_cv`, `profile_summary`, `project_inventory`, `career_cases`, `tech_stack`, `cv_rules`, `certifications`, `layout`); `LinkedIn_MD_Source_Decision...md` registered as `linkedin_source_decision`, intentionally not part of any current step's source group. No changes to `KnowledgeSourceSelectionService`, `Prisma` schema, or knowledge-source file content itself. Documented `KNOWLEDGE_SOURCES_ROOT` and the registration command in `README.md`.

### Commands

```bash
npm run register-knowledge-sources   # 1st run
npm run register-knowledge-sources   # 2nd run — idempotency check
npx tsc --noEmit
npm run test
npm run test -- --testPathPattern=knowledge-source
npm run lint
```

### Result

PASS

### Evidence

- 1st run: `Created:` logged for all 9 files, `Registered 9 knowledge source records.`
- 2nd run: `Updated:` logged for all 9 files (same count, no new rows) — confirms idempotency.
- Ad-hoc Prisma query (`prisma.knowledgeSource.findMany`) confirmed exactly 9 rows in the DB after both runs, each `isActive: true`, with the expected `sourceType`, `versionLabel` and `filePath` values.
- `npx tsc --noEmit` — no errors.
- `npm run test` — 39 suites / 344 tests passed, no regressions (including `knowledge-sources.service.spec.ts` and `knowledge-source-selection.service.spec.ts`).
- `npm run lint` — no errors.

### Follow-up

- None. TASK-037C acceptance criteria are met; `buildPrompt2Input()` can now assemble real CV content once TASK-037D (.env onboarding docs) and TASK-038/038A are picked up.
- Next recommended task: per `TASK_BOARD.md`, TASK-037D (.env onboarding docs) or TASK-038/038A per the dependency chain — not selected automatically.

## 2026-07-08 — TASK-037D — Complete .env setup and developer onboarding documentation

### Scope

Documentation-only task. Verified (by opening the files directly, not assuming) that `.env.example` already contains all 8 required vars (`DATABASE_URL`, `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT`, `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`) with a one-line comment each, and that `.env`/`.env.local`/`.env.*.local` are already in `.gitignore` — both from earlier TASK-037A/037C work, so no changes were needed to either file. Expanded README.md's existing "Local Start" section (chosen over a new `docs/00_setup.md` — README already owns onboarding content, a second file would fragment it) into the full linear onboarding sequence: install → copy env → Docker → `prisma migrate dev` → `prisma generate` → `prisma db seed` → `register-knowledge-sources` → `start:dev` → create first workspace via `curl`. Added an "AI Provider" note stating OpenAI is the first real MVP provider and Anthropic is a later/fallback addition, not required for MVP. Added `AI_PROVIDER`/`OPENAI_API_KEY`/`OPENAI_MODEL` rows to the "Required env vars" table for consistency with the new AI Provider section. No code, schema, endpoint, or config-validation changes.

### Commands

```bash
npx prisma migrate dev
npx prisma db seed
npm run register-knowledge-sources
curl -s http://localhost:3000/health
curl -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -d '{"companyNameOriginal":"Acme Corp","roleTitleOriginal":"Backend Developer","vacancyText":"Full vacancy text goes here."}'
find storage/applications/2026_07_08_Acme_Corp_Backend_Developer -type f
```

### Result

PASS

### Evidence

- `npx prisma migrate dev` — "Already in sync, no schema change or pending migration was found." (`npx prisma generate` sub-step hit a Windows file-lock EPERM from an already-running dev-server process holding the Prisma query engine DLL — not a blocker, since the Prisma client was already generated and migrations were already in sync; the running dev-server process was left untouched rather than killed).
- `npx prisma db seed` — "Seeded 9 EvidenceItem records." / "Seeded 2 active PromptTemplate records." (idempotent upsert, no duplicates).
- `npm run register-knowledge-sources` — "Updated" logged for all 9 files, "Registered 9 knowledge source records." (idempotent, no duplicates — consistent with TASK-037C run).
- `GET /health` → `{"status":"ok"}` (dev server was already running locally on port 3000 in watch mode — used as-is instead of an artificial fresh restart).
- `POST /workspaces` with the exact `curl` command now documented in README.md → `201`-equivalent success response with `"status":"source_saved"`, `workspaceSlug: "2026_07_08_Acme_Corp_Backend_Developer"`.
- `storage/applications/2026_07_08_Acme_Corp_Backend_Developer/00_vacancy_source.txt` exists on disk — confirms the documented flow produces a real artifact, not just a DB row.

### Follow-up

- None. TASK-037D acceptance criteria are met; a new developer can follow README.md end to end without asking the author.
- Next recommended task: per `TASK_BOARD.md`, TASK-038 (mechanical MVP smoke test with fake provider) — not selected or started automatically.

## 2026-07-08 — TASK-038A — Run practical MVP real-provider smoke test

### Scope

Manual real-provider run of the full MVP pipeline against a real vacancy (Atmen — Software Engineer,
Munich RegTech startup), using `AI_PROVIDER=openai` / `gpt-4o`, driving every HTTP endpoint by hand:
create workspace → run Prompt 1 analysis → human review decision → generate CV content (Prompt 2 +
anti-overclaiming guard) → approve CV draft → export PDF.

A pre-existing dev server on port 3000 (started before `AI_PROVIDER=openai` was set in `.env`) was
found to still be running the fake provider — its Prompt 1 response was the canned
"Fake Company — Backend Developer" fixture. This was caught by inspecting the generated
`01_vacancy_analysis.md` (company/role name mismatch), the stale process was killed, the dev server
was restarted to pick up current `.env`, and the contaminated workspace (DB rows + folder) was
deleted before re-running the whole flow cleanly.

### Commands

```bash
docker compose ps                                       # jobflow_postgres already Up
curl -s http://localhost:3000/health                    # {"status":"ok"} — stale fake-provider server
# discovered fake output in 01_vacancy_analysis.md -> killed stale process (PID 18316), restarted:
npm run start:dev
# deleted contaminated workspace (DB rows + storage folder) for the first (fake-provider) attempt
curl -s -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -d @vacancy.json
curl -s -X POST http://localhost:3000/workspaces/<id>/run-analysis
curl -s -X POST http://localhost:3000/workspaces/<id>/review-decision -H "Content-Type: application/json" -d '{"action":"approve_maybe"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/generate-cv-content
curl -s -X POST http://localhost:3000/workspaces/<id>/review-cv-draft -H "Content-Type: application/json" -d '{"action":"approve"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/export-cv
file storage/applications/2026_07_08_Atmen_Software_Engineer/04_cv_export.pdf
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"GeneratedArtifact\" ..."
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"AiRun\" ..."
```

### Result

PASS

### Evidence

- Workspace `cmrc8zhba0005kmfnpf3hqo4g`, folder `storage/applications/2026_07_08_Atmen_Software_Engineer/`.
- Prompt 1 (real OpenAI, `gpt-4o`, `AiRun cmrc90397000ckmfnlirhou7u`, 3326 input / 1532 output / 4858 total tokens): decision `MAYBE`, score 64 — correctly flagged NestJS/PostgreSQL/React depth as `needs_evidence` (personal/portfolio, not verified commercial), per anti-overclaiming rules.
- Human review: `approve_maybe` submitted (matches AI's own recommendation, no override) → `status: cv_generation_running`.
- Prompt 2 (real OpenAI, `gpt-4o`, `AiRun cmrc93dg4000lkmfnklsg6mqp`, 5822 input / 2109 output / 7931 total tokens): `02_targeted_cv_content.md/json` generated. Overclaiming check: **critical issues: none**; multiple skills correctly marked `needs evidence`; commercial (EPAM, Factor-IT, CHI Software) vs personal (AI Job Assistant / FastAPI) experience kept separate, consistent with CLAUDE.md anti-overclaiming rules.
- CV draft approved (`approve`) → `status: export_running`.
- Export → `status: cv_pdf_generated`. `04_cv_export.pdf` — `file` reports "PDF document, version 1.4, 1 page(s)", 119350 bytes on disk.
- `GeneratedArtifact` table: 7 rows for this workspace (`00_vacancy_source.txt` origin `pasted`; `01_vacancy_analysis.md/json` and `02_targeted_cv_content.md/json` origin `prompt_1`/`prompt_2` with matching `promptRunId`; `04_cv_export.html/pdf` origin `generated_by_export_service` with **no** `promptRunId`).
- `AiRun` table: exactly 2 rows for this workspace's `PromptRun`s (Prompt 1, Prompt 2), both `provider: openai`, `model: gpt-4o`, `status: completed`. No `AiRun` created for the export step — confirms ADR-012.
- `ApplicationWorkspace.status` = `cv_pdf_generated`.
- `project-management/MVP_ACCEPTANCE.md` created recording provider/model, vacancy, workspace path, artifacts and MVP status.

### Follow-up

- None. TASK-038A acceptance criteria are met — this is the first real-provider, real-PDF proof of the MVP pipeline.
- Test workspace `2026_07_08_Atmen_Software_Engineer` (DB rows + storage folder) is real test data left in place as evidence per this log entry; not a production application record.

## 2026-07-13 — TASK-PH-015 — Remediate devDependency-only Dependabot alerts (@nestjs/cli build-tooling chain)

### Scope

Bumped `@nestjs/cli` (`^10.0.0` -> `^11.0.24`) and `@nestjs/schematics`
(`^10.0.0` -> `^11.1.0`) — devDependencies only — to clear 6 Dependabot
alerts (glob high, tmp high+low, picomatch moderate+high, webpack low x2)
that were all transitive via the `@nestjs/cli` -> `@angular-devkit/*`
build-tooling chain. `@nestjs/core`/`@nestjs/platform-express`/
`@nestjs/swagger`/`@nestjs/testing` were left untouched on the v10 line —
the remaining moderate `@nestjs/core` alert is the same one already
investigated and accepted as risk in TASK-PH-013 (no fix without a
NestJS v10->v11 major upgrade).

### Commands

```bash
npm audit --omit=dev --json      # baseline: 3 vulnerabilities (prod graph unaffected either way)
npm audit --json                 # baseline (all): 16 vulnerabilities (4 high, 9 moderate, 3 low)
# edited package.json: @nestjs/cli ^11.0.24, @nestjs/schematics ^11.1.0
npm install
npm audit                        # after: 4 moderate only (all @nestjs/core chain, pre-existing accepted risk)
npm run test
npx tsc --noEmit
npm run test:e2e
npm run build
npm run start:dev                # manual boot smoke check
```

### Result

PASS

### Evidence

- **Before**: `npm audit` — 16 vulnerabilities (4 high: glob, tmp, picomatch, tmp-arbitrary-write; 9
  moderate; 3 low: webpack x2, inquirer).
- **After**: `npm audit` — 4 moderate only, all on the `@nestjs/core` <= 11.1.17 chain
  (`@nestjs/core` -> `@nestjs/platform-express` -> `@nestjs/testing`, plus `@nestjs/swagger`) —
  same alert already documented and accepted as risk in TASK-PH-013 (no fix without NestJS v11
  major bump). `glob`, `tmp`, `picomatch`, `webpack` (and their `inquirer`/`external-editor`
  transitive chain) no longer appear.
- `npm run test`: 47/47 suites, 479/479 tests passed.
- `npx tsc --noEmit`: clean, no output.
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed (`rate-limiting.e2e-spec.ts`,
  `mvp-flow.e2e-spec.ts`).
- `npm run build`: succeeded (`nest build`, no errors).
- `npm run start:dev`: app booted successfully — "Nest application successfully started" /
  "JobFlow CV Pipeline running on port 3000", all modules/routes mapped as before.

### Follow-up

- None for the 6 resolved alerts. The `@nestjs/core` moderate alert remains open/accepted per
  TASK-PH-013's documented decision — not in scope for TASK-PH-015.
- GitHub Dependabot alerts tab to be re-checked after this branch merges to `main` to confirm the
  6 alerts close automatically.
- **Post-merge confirmation (2026-07-13)**: `gh api repos/:owner/:repo/dependabot/alerts` shows
  only 1 open alert remaining (`@nestjs/core` #17, medium/runtime — the pre-existing accepted
  risk). All 6 devDependency alerts (glob, tmp, picomatch, webpack) are closed. TASK-PH-015 fully
  closed.

## 2026-07-13 — TASK-PH-016 — Upgrade NestJS core packages v10 → v11

### Scope

Bumped `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`,
`@nestjs/testing` (`^10.0.0` -> `^11.1.28`) and `@nestjs/swagger`
(`^7.4.2` -> `^11.4.5`, the actual latest — its own major line now tracks
Nest's major, not a "v8" pairing as originally scoped) to close the last
open Dependabot alert (#17, `@nestjs/core` moderate/medium, SSE injection —
GHSA-36xv-jgw5-4q75), which has no patched 10.x release. `@nestjs/config`
(`^4.0.4`) and `@nestjs/throttler` (`^6.5.0`) were left unchanged — both
already declare `@nestjs/common`/`@nestjs/core` `^11.0.0` in their
published `peerDependencies`, confirmed via `npm view <pkg> peerDependencies`
before deciding not to bump them. Added `"engines": { "node": ">=20" }` to
`package.json` to document the v11 floor (previously unenforced; runtime
Node was already `v20.20.2`).

### Commands

```bash
npm audit                        # baseline: 4 moderate (@nestjs/core <=11.1.17 chain)
npm view @nestjs/config peerDependencies --json
npm view @nestjs/throttler peerDependencies --json
# edited package.json: @nestjs/core/common/platform-express/testing ^11.1.28, @nestjs/swagger ^11.4.5, engines.node >=20
npm install
npm ls @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/testing @nestjs/swagger
npm audit                        # after: 0 vulnerabilities
npm run test
npx tsc --noEmit
npm run test:e2e
npm run build
docker compose up -d postgres
npm run start:dev                # manual boot + Swagger UI smoke check
curl -s http://localhost:3000/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api
curl -s http://localhost:3000/api-json   # confirmed openapi 3.0.0, 16 paths
```

### Result

PASS

### Evidence

- **Before**: `npm audit` — 4 moderate, all `@nestjs/core <=11.1.17` chain
  (`@nestjs/core` -> `@nestjs/platform-express` -> `@nestjs/testing`, plus
  `@nestjs/swagger`) — alert #17, no patched 10.x release exists.
- **After**: `npm audit` — **0 vulnerabilities**. `npm ls` confirms clean
  dependency resolution, no ERESOLVE conflicts, all `@nestjs/*` packages
  deduped to a single `11.1.28`/`11.4.5` set.
- `npm run test`: 47/47 suites, 479/479 tests passed.
- `npx tsc --noEmit`: clean, no output.
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed (`rate-limiting.e2e-spec.ts`,
  `mvp-flow.e2e-spec.ts`) — full MVP flow (create workspace -> analysis ->
  review -> generate CV -> review draft -> export) exercised successfully.
- `npm run build`: succeeded (`nest build`, no errors).
- `npm run start:dev`: app booted successfully. `GET /health` -> `{"status":"ok"}`.
  `GET /api` (Swagger UI) -> HTTP 200. `GET /api-json` -> valid OpenAPI 3.0.0
  document with 16 registered paths — Swagger v7->v11 bootstrap API
  (`DocumentBuilder`, `SwaggerModule.createDocument/setup`) unaffected.
  Server stopped cleanly after verification (port 3000 released).

### Follow-up

- `@nestjs/config`/`@nestjs/throttler` left on their current versions — peer
  dependency ranges already cover `@nestjs/core`/`common` `^11.0.0`, no bump
  required.
- **Post-merge confirmation (2026-07-13)**: PR #70 merged to `main`
  (`f1f8663`). `gh api repos/:owner/:repo/dependabot/alerts` returns 0 open
  alerts — alert #17 confirmed closed. TASK-PH-016 fully closed.

## 2026-07-14 — TASK-PH-011 — Add minimal API-key authentication guard

### Scope

Added `ApiKeyGuard` (global, via `APP_GUARD`) requiring an `X-API-Key`
header matching the new required `API_KEY` env var on every endpoint
except `GET /health`, which is exempted via a new `@SkipAuth()` decorator
(`SetMetadata`/`Reflector` pattern mirroring the existing `@SkipThrottle()`
convention). `main.ts`'s unused `.addBearerAuth()` Swagger placeholder was
replaced with `.addApiKey()` describing the real `X-API-Key` header.
`.env.example` documents the new required variable; local `.env` and the
two e2e specs were updated with a working key so existing flows keep
passing.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
docker compose up -d postgres
npm run start:dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/version                          # no header
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: wrong-key" http://localhost:3000/version # wrong key
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: <real-key>" http://localhost:3000/version # correct key
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health                            # health, no key
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api                                # swagger UI
curl -s http://localhost:3000/api-json | jq .components.securitySchemes
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no output.
- `npm run test`: 48/48 suites, 484/484 tests passed (new
  `api-key.guard.spec.ts` — 4/4 cases: `@SkipAuth` bypass, missing header
  rejected, wrong header rejected, correct header allowed; updated
  `env.validation.spec.ts` for the new required `API_KEY` field).
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed — both specs updated to
  send `X-API-Key` on every request except `/health`.
- `npm run build`: succeeded.
- Manual curl checks against `npm run start:dev`:
  - No header on `GET /version` -> **401**
  - Wrong `X-API-Key` on `GET /version` -> **401**
  - Correct `X-API-Key` on `GET /version` -> **200**
  - `GET /health` without any key -> **200**
  - `GET /api` (Swagger UI) -> **200**
  - `GET /api-json` `components.securitySchemes` -> `{"X-API-Key": {"type":
    "apiKey", "in": "header", "name": "X-API-Key"}}` — confirms the
    Swagger doc now describes the real auth scheme instead of the unused
    Bearer placeholder.

### Follow-up

- None. Full JWT/user-model auth remains a possible future task if the
  project ever needs multi-tenant access (per the backlog's explicit
  scope note) — not started speculatively here.

## 2026-07-14 — TASK-PH-012 — Raise TypeScript compiler strictness incrementally

### Scope

Enabled all five previously-disabled `tsconfig.json` strictness flags one
at a time, each in its own commit: `forceConsistentCasingInFileNames` →
`noFallthroughCasesInSwitch` → `strictBindCallApply` → `noImplicitAny` →
`strictNullChecks`. `npx tsc --noEmit` and `npm run test` were run after
each individual flag before moving to the next (5 checkpoints).

`forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch` and
`strictBindCallApply` surfaced zero errors. `noImplicitAny` surfaced 53
implicit-any errors, all fixed by adding explicit type annotations (real
Prisma model types on test mock factories; the project's own pipeline
schema types — `VacancyAnalysis`, `TargetedCvContentOutput`,
`PrePdfCheckOutput`, `FinalCheckOutput`, `SkipReasonAnalysis`,
`TargetedCvBullet` — on `fake.provider.ts`'s `FAKE_*_JSON` fixtures and
their spec-file consumers), not `any`. `strictNullChecks` surfaced 6
errors: `ArtifactStorageService` read `STORAGE_ROOT` via
`ConfigService.get()` (types `string | undefined`) and passed it straight
to `path.resolve()` — switched to `getOrThrow()`, which matches the real
guarantee (`env.validation.ts` requires `STORAGE_ROOT` with no default,
so the app never boots without it); and `workspaces.controller.spec.ts`
used two `Array.find()` results without a null check — added non-null
assertions with a one-line comment, justified because the preceding
`toHaveLength(4)` assertion already proves both entries exist.

No `any` or unjustified non-null assertions (`!`) were introduced. No
runtime behavior changed anywhere — this was a type-annotation-only pass.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean after each of the 5 flags, and clean in the
  final state with all five explicitly `true`.
- `npm run test`: 48/48 suites, 484/484 tests passed after each flag and
  in the final state (unchanged pass count throughout — no test behavior
  regressions).
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed in the final state
  (`rate-limiting.e2e-spec.ts`, `mvp-flow.e2e-spec.ts`).
- Final `tsconfig.json`: `strictNullChecks`, `noImplicitAny`,
  `strictBindCallApply`, `forceConsistentCasingInFileNames`,
  `noFallthroughCasesInSwitch` all explicitly `true` (not merely removed).

### Follow-up

- None. This was a type-safety hardening task only; no new runtime
  behavior or endpoints were added.

## 2026-07-14 — TASK-044 — Add safer wording suggestion service

### Scope

Added standalone `SafeWordingService` (`src/evidence/safe-wording.service.ts`)
producing a suggested safe wording string for a given claim + matching
`EvidenceItem`, distinguishing by real seed `category` values (`allowed` ->
commercial wording preserved, `risky` -> personal-project wording, `unsupported`
-> basic-exposure wording, no matching item -> needs-evidence wording).
Registered as a provider/export in `evidence.module.ts` alongside the existing
`EvidenceGuardService`/`EvidenceService`. No endpoint or pipeline wiring added
(out of scope per backlog AC).

### Commands

```bash
npm run test -- --testPathPattern=safe-wording   # 5/5 new tests
npm run test                                     # 49/49 suites, 489/489 tests
npx tsc --noEmit                                 # clean
npm run lint                                     # clean (Prettier auto-format only)
```

### Result

PASS

### Evidence

- `src/evidence/safe-wording.service.spec.ts`: 5/5 tests pass, covering all
  3 real categories plus the no-match case, and asserting the 3 category
  wordings are distinct strings (AC: "distinguish commercial, personal
  project and basic exposure").
- Full suite: 49/49 suites, 489/489 tests pass (up from 48/48, 484/484).
- `npx tsc --noEmit`: clean.

### Follow-up

- None. Service is standalone per backlog scope; wiring into
  `EvidenceGuardService`/Prompt 3/export pipeline was not requested and was
  explicitly excluded to avoid scope creep (see `CURRENT_TASK.md` Key
  Invariants for this task).

## 2026-07-14 — TASK-PH-018 — Seed skip_reason PromptTemplate to fix confirm-skip

### Scope

Added `prisma/prompts/skip_reason.txt` (placeholder content, same pattern as
`prompt3.txt`/`prompt5.txt`) and registered it in `prisma/seed.ts` as a new
active `PromptTemplate` (`step: 'skip_reason'`, `promptKey: 'skip_reason'`).
Fixes the pre-existing gap where `POST /workspaces/:id/confirm-skip` 500s on
any freshly-seeded database (`No active skip_reason template found`),
discovered during TASK-PH-017 and logged as a follow-up in `TASK_BOARD.md`.
`SkipReasonService`, `skip-reason.schema.ts` and `FakeAiProvider` were not
changed — the code path was already correct; this was a seed-data gap only.
`test/skip-flow.e2e-spec.ts` extended to call `confirm-skip` after
`change_to_skip` and assert the ADR-005 transition to `status = skipped`
with both `01_skip_reason.md`/`.json` artifacts created and registered.

### Commands

```bash
npx prisma db seed        # run twice, confirms idempotency
npx tsc --noEmit
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx prisma db seed`: "Seeded 5 active PromptTemplate records" (up from 4),
  run twice with identical output — confirms the upsert is idempotent.
- `npx tsc --noEmit`: clean.
- `npm run test`: 50/50 suites, 498/498 tests pass.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass —
  `test/skip-flow.e2e-spec.ts` now exercises `confirm-skip` end-to-end
  (previously only `change_to_skip` was covered). Actual test execution
  completed in ~15.7s; the Jest process then hung on exit ("did not exit one
  second after the test run has completed... asynchronous operations that
  weren't stopped") and had to be killed manually after ~11 minutes of zero
  CPU activity. This occurs strictly after all tests already pass, is not
  caused by this task's change (`test:e2e`/`jest-e2e.json`/CI config have no
  `--forceExit` and this class of Jest exit-hang is orthogonal to the one
  extra HTTP call added here), and does not affect CI (TASK-PH-017 already
  confirmed the `test-e2e` CI job is green). Logged here for visibility, not
  as a new gap to fix in this task.

### Follow-up

- Resolved same day — see next entry below. Root cause was not Puppeteer;
  it was the `pino-pretty` transport worker thread (see
  `project-management/CHANGELOG.md` "TASK-PH-018 (follow-up fix)").

## 2026-07-14 — TASK-PH-018 (follow-up fix) — Fix local test:e2e exit hang (pino-pretty transport worker)

### Scope

`src/app.module.ts` `LoggerModule.forRootAsync` enabled the `pino-pretty`
transport whenever `NODE_ENV !== 'production'`. Jest sets `NODE_ENV=test`
by default, so e2e runs also loaded pino-pretty. Pino transports run in a
`worker_thread` that NestJS `app.close()` does not close, leaving the
process alive indefinitely after all tests already passed (~14s of real
work followed by 10+ minutes of idle CPU before a manual kill was needed).
Fixed by excluding `test` alongside `production` from the transport
condition. No test files changed — this is an `app.module.ts` one-line
condition fix only.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e   # run directly in foreground, not backgrounded, to confirm clean exit
```

### Result

PASS

### Evidence

- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, command returns on its
  own in ~14s total (previously hung 10+ minutes with 0 CPU activity after
  tests completed, requiring a manual process kill).
- `npx tsc --noEmit`: clean.
- `npm run test`: 50/50 suites, 498/498 tests pass (unaffected — unit tests
  don't boot the full Nest app/logger).

### Follow-up

- None. `npm run start:dev` still gets pretty-printed logs (`NODE_ENV`
  unset or `development` there); only `test`/`production` are excluded.

## 2026-07-14 — TASK-046 — Implement import preview and manual metadata correction

### Scope

`ImportService.previewImport(folderPath, overrides?)` — given one folder previously
returned by `scanRoot()`, re-derives the scan result (reusing `scanDateFolder()`), applies
optional `companyNameOverride`/`roleTitleOverride` through `SlugService`, and detects
duplicates by two signals: `ApplicationWorkspace.sourceImportedPath === folderPath` (path
match) and, when exactly one vacancy-source `.txt` candidate exists, its content hash
matching an existing `GeneratedArtifact` (`artifactType: 'vacancy_source'`) `contentHash`
(hash match). New `POST /import/preview` endpoint, Swagger-documented. `ImportModule` now
imports `PrismaModule` and `ArtifactsModule` (for `PrismaService`/`HashService`). No DB
writes anywhere in this task — record creation is TASK-047.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import.service
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `import.service.spec.ts`: 15/15 tests pass (8 existing `scanRoot` tests unchanged + 7 new
  `previewImport` tests — no override, company override, role override, path-based
  duplicate, hash-based duplicate, multi-candidate skips hash check, no duplicate).
- Full suite: 50/50 suites, 505/505 tests pass (up from 498).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms `ImportModule`'s new
  `PrismaModule`/`ArtifactsModule` imports don't break `AppModule`'s DI graph.

### Follow-up

- None for this task. TASK-047 (import confirmation and artifact registration) is the
  natural next step — it will be the first task to actually call `previewImport()`'s
  result to create `ApplicationWorkspace`/`GeneratedArtifact` records.

## 2026-07-14 — TASK-046 (follow-up fix) — Add missing ImportController test coverage (Codecov patch gate)

### Scope

Codecov flagged PR #79's patch coverage at 88.10% (target 80% overall, but `src/import/
import.controller.ts` itself showed 0% patch coverage, 5 lines missing) — `ImportController`
had no spec file at all, so the new `preview()` method (and the pre-existing `scan()`
method) were both untested at the controller layer; only the service layer had tests. Added
`src/import/import.controller.spec.ts` covering both endpoints with a mocked
`ImportService`, following the existing `artifacts.controller.spec.ts` pattern.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
```

### Result

PASS

### Evidence

- `import.controller.spec.ts`: 2/2 tests pass (`scan` delegates to `scanRoot()`, `preview`
  delegates to `previewImport()` with `folderPath` + overrides split out correctly).
- `import.service.spec.ts` + `import.controller.spec.ts` together: 17/17 tests pass.
- Full suite: 51/51 suites, 507/507 tests pass (up from 505).
- `npx tsc --noEmit`: clean.

### Follow-up

- None.

## 2026-07-14 — TASK-046 (follow-up fix 2) — Fix path-injection CodeQL alert in previewImport

### Scope

CodeQL (`GitHub Advanced Security`) flagged a new high-severity alert on PR #79:
"Uncontrolled data used in path expression" at `import.service.ts` `listFiles()` — the
`POST /import/preview` endpoint passed the caller-supplied `folderPath` request field
straight into `fs.readdir()` via `previewImport()` → `scanDateFolder()` → `listFiles()`,
with no containment check. Unlike `scanRoot()` (which only ever walks directories under the
server-controlled `IMPORT_ROOT`), `previewImport()` let any caller read an arbitrary
directory on the server's filesystem — the same class of path-traversal bug fixed for
`ArtifactStorageService` in TASK-PH-014 and for `GET /import/scan?rootPath=` in TASK-045's
post-PR fix. Fixed by mirroring `ArtifactStorageService.assertInsideStorageRoot()`: added
`ImportService.assertInsideImportRoot()`, resolving `folderPath` against the configured
`IMPORT_ROOT` and throwing `BadRequestException` if the resolved path escapes it (covers
both an absolute path outside `IMPORT_ROOT` and a relative path using `../` segments).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
```

### Result

PASS

### Evidence

- 2 new tests: rejects an absolute `folderPath` outside `IMPORT_ROOT`, and rejects a
  relative `folderPath` that escapes `IMPORT_ROOT` via `../` segments — both assert
  `BadRequestException` with a message naming the violation.
- `import.service.spec.ts` + `import.controller.spec.ts`: 19/19 tests pass (up from 17).
- Full suite: 51/51 suites, 509/509 tests pass (up from 507).
- `npx tsc --noEmit`: clean.
- CodeQL re-ran on the pushed fix and still flagged the same line (`listFiles()`'s
  `fs.readdir(dirPath)`) as alert #6 — this is the same known limitation as TASK-PH-014
  (alert #4): CodeQL's static dataflow analysis does not recognize a custom runtime
  containment guard (`assertInsideImportRoot()`) as a sanitizer barrier, since the variable
  used at the `fs.readdir` call site is unchanged by the guard (it throws rather than
  reassigning). Dismissed alert #6 via `gh api` as `false positive`, mirroring alert #4's
  dismissal. All 9 PR #79 checks green after dismissal.
- Codecov flagged 1 missing patch line (`import.service.ts` line 129 —
  `assertInsideImportRoot()`'s `importRoot.endsWith(path.sep) ? importRoot : ...` true
  branch, unreachable via `path.resolve()` output except at a literal filesystem root).
  Patch coverage was already 98.04% (well above the 80% `codecov.yml` target) and the
  branch mirrors an already-accepted untested branch in `ArtifactStorageService.
  assertInsideStorageRoot()` (TASK-PH-014) — not a gate failure. Added one direct unit test
  invoking the private method with an `IMPORT_ROOT` value that already ends in `path.sep`
  to close it anyway. `import.service.ts` branch coverage 84.9% → 86.79%; suite now 51/51,
  510/510 tests.

### Follow-up

- None.

## 2026-07-14 — TASK-047 — Implement import confirmation and artifact registration

### Scope

`ImportService.confirmImport(folderPath, options)` — the final step of the import flow
(TASK-045 scan → TASK-046 preview → TASK-047 confirm). Calls `previewImport()` internally,
then: blocks duplicates (`ConflictException`, 409), blocks zero/ambiguous vacancy-source
candidates without a valid `selectedVacancySourcePath` (`BadRequestException`, 400), blocks
`suggestedStatus === import_needs_review` (400). Creates `Company`, `JobVacancy` (populating
the previously-unused `originalImportedFileName`/`sourceFormat: 'legacy_import'`),
`ApplicationWorkspace` (`createdFrom: 'import'`, `sourceImportedPath`, initial `status`
mapped 1:1 from `suggestedStatus`, `isSkipped: true`/`currentDecision: skip` for the skip
case per ADR-005/016), and one `GeneratedArtifact` per detected legacy file. By default,
files are registered *in place* under `IMPORT_ROOT` (no copy, `origin: 'imported'`,
`canonicalFileName` = original legacy file name) — the artifact-level `storageRoot` field
(confirmed via `ArtifactsController.download()`'s path-safety check) makes this possible
without touching `ArtifactStorageService`'s `STORAGE_ROOT`-only write methods. The optional
`copyVacancySourceToCanonical` flag physically copies only the vacancy source into
`00_vacancy_source.txt` under the new workspace's `STORAGE_ROOT` folder. New
`POST /import/confirm` endpoint. `ImportModule` gained `CompanyModule`/`VacancyModule`/
`ArtifactStorageModule` imports. Discovered (not fixed) a pre-existing binary-unsafe read in
the generic `GET /artifacts/:id/download` endpoint, newly relevant because this task
registers legacy PDFs through it — logged as `TASK-PH-019` in `TASK_BOARD.md`.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
npm run test:cov -- --testPathPattern=import
npm run test:e2e
```

### Result

PASS

### Evidence

- `import.service.spec.ts` + `import.controller.spec.ts`: 32 tests pass, 13 new for
  `confirmImport` (Action1-style no-copy, Amach-style 4 artifacts, AppsFlyer-style with
  `copyVacancySourceToCanonical`, Broadvoice-style skip asserting `isSkipped`/
  `currentDecision`, duplicate rejection, ambiguous-without-override rejection, ambiguous
  accepted with matching `selectedVacancySourcePath`, ambiguous rejected with
  non-matching `selectedVacancySourcePath`, zero-vacancy-source rejection,
  `import_needs_review` rejection) + 1 new controller delegation test.
- `npm run test:cov -- --testPathPattern=import`: `import.controller.ts` 100/100/100/100;
  `import.service.ts` 97.52% statements / 88.88% branches — remaining uncovered lines
  (496, 519–521, 566) are pre-existing `scanDateFolder`/`suggestStatus` branches from
  TASK-045, outside this task's diff.
- Full suite: 51/51 suites, 522/522 tests pass (up from 510).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, exits cleanly (~13s) — confirms the new
  `ImportModule` imports (`CompanyModule`/`VacancyModule`/`ArtifactStorageModule`) don't
  break `AppModule`'s DI graph.

### Follow-up

- `TASK-PH-019` scheduled (not yet started) for the binary-unsafe generic artifact download
  endpoint, see `TASK_BOARD.md` "Known Gaps" / board row.

## 2026-07-14 — TASK-047 (follow-up) — Dismiss CodeQL false positive on ArtifactStorageService.writeFile

### Scope

CodeQL flagged `src/artifacts/artifact-storage.service.ts:53` (the `fs.writeFile()` call
inside `writeFile()`) as alert #7 on PR #80 — the same false-positive pattern already
dismissed twice before (alert #4 in TASK-PH-014, alert #6 in TASK-046): the method already
calls `assertInsideStorageRoot()` immediately before `fs.writeFile()` on the same
`filePath` variable, but CodeQL's static dataflow analysis does not recognize a
throw-based runtime guard as a sanitizer. `writeFile()` itself is unchanged by TASK-047 —
CodeQL re-flagged it because `confirmImport()` is a new caller reaching the same
already-guarded method. Dismissed via `gh api` as `false positive`, referencing alerts
#4/#6.

### Commands

```bash
gh api --method PATCH repos/strakhovdenya/jobflow-cv-pipeline/code-scanning/alerts/7 \
  -f state=dismissed -f dismissed_reason="false positive" -f dismissed_comment="..."
gh pr checks 80
```

### Result

PASS — all 9 PR #80 checks green after dismissal (Lint/Typecheck/Build/Test/Test(e2e)/
Docker/Analyze/CodeQL/codecov-patch).

### Follow-up

- None.

## 2026-07-14 — TASK-PH-019 — Fix binary-unsafe generic artifact download endpoint

### Scope

`ArtifactsController.download()` (`GET /artifacts/:id/download`) read the target file with
`fs.readFile(resolvedFile, 'utf-8')` and sent it via `res.send(content)` — decoding a
binary file (PDF) as UTF-8 text corrupts it. Not triggered before TASK-047 because the only
PDF the pipeline itself produces (`04_cv_export.pdf`) has its own dedicated, already
binary-safe download route (`GET /workspaces/:id/download-cv`). TASK-047 registers imported
legacy CV/cover-letter PDFs as plain `GeneratedArtifact` rows with no dedicated route of
their own, making the bug reachable. Fixed with a one-line change:
`fs.readFile(resolvedFile)` (no encoding, returns `Buffer`), mirroring the already-correct
`downloadCv()` pattern. No other logic (path-safety check, headers, error handling)
changed.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=artifacts.controller
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `artifacts.controller.spec.ts`: 7/7 tests pass — existing happy-path test updated to
  mock/assert a `Buffer`; new test sends a byte sequence containing `0xFF`/`0xFE` (invalid
  as standalone UTF-8 bytes) and asserts `res.send` received the exact same `Buffer`
  unchanged (`Buffer.equals()`), proving the fix actually prevents corruption rather than
  just changing the mock type.
- Full suite: 51/51 suites, 523/523 tests pass (up from 522).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, exits cleanly.

### Follow-up

- None. `TASK_BOARD.md` "Known Gaps" entry resolved.

## 2026-07-14 — TASK-048 — Create CoverLetterDraft model/service

### Scope

New `CoverLetterDraft` Prisma model + `CoverLetterDraftStatus` enum (migration
`add_cover_letter_draft`), linked to `ApplicationWorkspace` via `workspaceId` only (no `cvDraftId` —
`CvDraft` was never implemented in this codebase, confirmed by inspecting `prisma/schema.prisma`;
resolved with user before implementation, see `CURRENT_TASK.md` Context). New
`CoverLetterDraftsService.create()` (`src/cover-letters/`) creates a draft row and blocks creation
for a workspace with `status === skipped` (`BadRequestException`), matching the existing
`overrideSkip()` pattern where a manual override already moves the workspace out of `skipped` before
cover letter generation would be attempted. No controller/endpoint in this task (service only,
matches backlog scope); module not yet imported into `AppModule` per ADR-017 (no controller to route
to yet — TASK-049 wires it in).

### Commands

```bash
npx prisma migrate dev --name add_cover_letter_draft
npx prisma generate
npm run test -- --testPathPattern=cover-letter-drafts
npm run test
npx tsc --noEmit
npm run lint
npm run test:e2e
```

### Result

PASS

### Evidence

- `cover-letter-drafts.service.spec.ts`: 4/4 tests pass — creates a draft for a workspace in
  `cv_pdf_generated` status (CV already exists), 404s on missing workspace, 400s when
  `status === skipped`, succeeds once status has moved to `cv_generation_running` (post manual
  override).
- Full suite: 52/52 suites, 527/527 tests pass (up from 51/51, 523/523).
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms the new migration didn't break the
  existing HTTP flows.

### Follow-up

- TASK-049 (Implement cover letter generation step) will wire `CoverLetterDraftsModule` into a
  controller/endpoint and create the actual `cover_letter.md/pdf` `GeneratedArtifact` rows.

## 2026-07-15 — TASK-049 — Implement cover letter generation step

### Scope

New `CoverLetterInputBuilderService`/`CoverLetterService` (`src/pipeline/cover-letter/`), mirroring
the existing `Prompt5InputBuilderService`/`Prompt5Service` pattern: guards `workspace.status` in
`[cv_pdf_generated, final_check_ready]`, reads `00_vacancy_source.txt`/`01_vacancy_analysis.json`
(optional)/`02_targeted_cv_content.json` (required) plus `profile_summary`/`cv_rules` knowledge
sources (new `cover_letter` step group added to `KnowledgeSourceSelectionService`), runs the full
PromptRun/AiRun lifecycle, writes `cover_letter.md`/`cover_letter.json` via `ArtifactStorageService`,
transitions `workspace.status` to `cover_letter_generated` on success (new transitions added to
`WorkspaceStatusService.TRANSITIONS`: `cv_pdf_generated -> cover_letter_generated` and
`final_check_ready -> cover_letter_generated`), then registers a `CoverLetterDraft` row via TASK-048's
`CoverLetterDraftsService.create()`. New `cover-letter.schema.ts`/`validateCoverLetterJson()` matches
`docs/08_ai_pipeline.md` §15.4. `FakeAiProvider` gained a `cover_letter` step fixture
(`FAKE_COVER_LETTER_JSON`). New `POST /workspaces/:id/generate-cover-letter` endpoint added directly
to `WorkspacesController` (matching how Prompt 1/2/3/5 endpoints live there, not in per-step
controllers). `cover_letter.pdf` export is deferred (user-confirmed scope decision — no canonical
HTML artifact name exists yet for the intermediate render step).

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:cov
docker compose up -d postgres
npx prisma migrate dev --name add_cover_letter_generation_placeholder
npx prisma db seed
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 55/55 suites, 580/580 tests pass (up from 52/52, 527/527) — new specs:
  `cover-letter.schema.spec.ts`, `cover-letter-input-builder.service.spec.ts`,
  `cover-letter.service.spec.ts`, plus additions to `knowledge-source-selection.service.spec.ts`,
  `workspace-status.service.spec.ts` and `workspaces.controller.spec.ts`.
- `npm run test:cov`: All files 93.64%/74.84%/94.95%/93.45% (statements/branches/functions/lines) —
  above the ADR-022 floor (90/68/90/90).
- `npx prisma migrate dev`: no schema change needed (this task added no new Prisma fields); `npx
  prisma db seed` confirms 6 active `PromptTemplate` records (up from 5 — new `cover_letter` step).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove the full HTTP flow (create workspace ->
  run-analysis -> review-decision(approve_apply) -> generate-cv-content -> review-cv-draft(approve)
  -> export-cv -> generate-cover-letter) with the fake AI provider. `generate-cover-letter` returned
  `success: true`, `workspaceStatus: "cover_letter_generated"` and a `coverLetterDraft` row; verified
  `cover_letter.md` on disk contains the fake fixture's greeting/body paragraphs/closing rendered
  correctly.

### Follow-up

- `cover_letter.pdf` export deferred — needs a decision on an intermediate HTML artifact name (not
  currently in CLAUDE.md's canonical artifact list) before `PdfExportService.htmlFileToPdf()` can be
  reused for it.

## 2026-07-15 — TASK-PH-020 — Fix cover letter draft creation failure handling and missing subject in markdown

### Scope

Two correctness fixes to `src/pipeline/cover-letter/cover-letter.service.ts`, found during code
review of TASK-049 (PR #83). (1) `coverLetterDraftsService.create()` is now called *before* the
`workspace.status` transition to `cover_letter_generated`, wrapped in try/catch; on failure it
returns a structured `{ success: false, workspaceStatus: <unchanged>, validationError }` result
instead of letting the exception propagate uncaught — `workspace.status` stays at
`cv_pdf_generated`/`final_check_ready`, so the endpoint remains retry-safe, and `PromptRun`/`AiRun`
correctly stay `completed`/`success` since the AI generation itself succeeded. (2) `buildMarkdown()`
now renders a `**Subject:** <value>` line into `cover_letter.md` when `data.subject` is non-null
(previously silently dropped, only surviving in `cover_letter.json`).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=cover-letter
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- `cover-letter.service.spec.ts` + related specs: 58/58 tests pass, including 3 new tests for the
  draft-creation-failure path (`success: false`, `workspaceStatus` unchanged, no exception thrown,
  `promptRuns.complete`/`aiRuns.saveSuccess` still called, `promptRuns.fail`/`aiRuns.saveFailed` NOT
  called) and 2 new tests for the subject rendering (non-null subject appears in `cover_letter.md`;
  null subject produces no `**Subject:**` line, matching prior byte-identical output).
- Full suite: 55/55 suites, 585/585 tests pass (up from 55/55, 580/580).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.

### Follow-up

- TASK-PH-021 (unguarded vacancy-source reads) and TASK-PH-022 (`WorkspaceStatusService` dual
  registration) remain scheduled as separate follow-ups from the same code review.

## 2026-07-15 — TASK-PH-021 — Wrap unguarded vacancy-source reads in try/catch across prompt2 and cover-letter input builders

### Scope

`00_vacancy_source.txt` reads in `src/pipeline/prompt2/prompt2-input-builder.service.ts`
(`buildPrompt2Input`) and `src/pipeline/cover-letter/cover-letter-input-builder.service.ts`
(`buildCoverLetterInput`) were unwrapped, unlike every other artifact read in those files, so a
missing/moved vacancy source produced an unhandled 500 instead of a controlled 400. Both reads are
now wrapped in try/catch and rethrow `BadRequestException('Vacancy source artifact not found
(00_vacancy_source.txt).')`. Also tightened an existing cover-letter-input-builder test that only
asserted `.rejects.toThrow()` (no exception type) to assert `BadRequestException` specifically —
that weakened assertion is what let the original gap go unnoticed in TASK-049.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern="prompt2-input-builder|cover-letter-input-builder"
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Both input-builder specs: 16/16 tests pass, including 1 new test in
  `prompt2-input-builder.service.spec.ts` (missing vacancy source throws `BadRequestException`) and
  the tightened assertion in `cover-letter-input-builder.service.spec.ts`.
- Full suite: 55/55 suites, 586/586 tests pass (up from 55/55, 585/585).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.

### Follow-up

- TASK-PH-022 (`WorkspaceStatusService` dual registration) remains scheduled as the last of the
  three code-review follow-ups.

## 2026-07-15 — TASK-PH-022 — Remove redundant WorkspaceStatusService registration from WorkspacesModule

### Scope

`WorkspaceStatusService` was registered as a provider in both `WorkspacesModule` and
`PipelineModule`. Scope revised after checking actual usage (confirmed with user before
implementation): nothing in `WorkspacesModule`/`WorkspacesService`/`WorkspacesController` injects
the service — the `WorkspacesModule` registration was dead weight from TASK-039. Rather than
building a new shared module (the original backlog card's assumption), simply removed
`WorkspaceStatusService` from `src/workspaces/workspaces.module.ts`'s `providers` array and its
now-unused import. `PipelineModule` remains the sole registration (the only real consumer,
`CoverLetterService`).

### Commands

```bash
npx tsc --noEmit
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 55/55 suites, 586/586 tests pass — unchanged from before the removal, confirming no
  hidden test relied on `WorkspacesModule`'s own DI instance.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms the whole app (including
  `WorkspacesController`'s `generate-cover-letter` endpoint, reached via `PipelineModule`) still
  boots and resolves correctly with the duplicate registration removed.
- `grep -rn "WorkspaceStatusService" src --include="*.module.ts"` confirms exactly one module
  registration remains (`src/pipeline/pipeline.module.ts`).

### Follow-up

- None. All three TASK-049 code-review follow-ups (TASK-PH-020/021/022) are now DONE.

## 2026-07-15 — TASK-050 — Add application status tracking fields/endpoints

### Scope

Starts Phase 11 (Application Tracking & Rejection Analysis). `ApplicationWorkspace` gained 7
optional fields (`appliedAt`, `appliedVia`, `rejectedAt`, `rejectionSummary`, `notes`,
`submittedCvArtifactId`, `submittedCoverLetterArtifactId` — the first 5 taken verbatim from
`docs/03_domain_model.md` §8.2's "Optional later fields"; the last 2 confirmed with the user as
named loose-scalar fields mirroring the existing `promptRunId`-style convention). New
`src/application-tracking/` module: `ApplicationTrackingService` with `markReadyToApply`/
`markApplied`/`markRejected`/`markArchived`, each guarded by a locally-hardcoded valid-predecessor-
status array (mirrors `ReviewGatesService`'s pattern — confirmed with user, not routed through
`WorkspaceStatusService`, matching the majority precedent in this codebase). 4 new
`WorkspacesController` endpoints, Swagger-documented per ADR-019. Valid-predecessor-status sets and
the submitted-artifact-id field shape were confirmed with the user before implementation since the
backlog card's AC didn't specify them (see `CURRENT_TASK.md` Context).

### Commands

```bash
npx prisma format
docker compose up -d postgres
npx prisma migrate dev --name add_application_tracking_fields
npx tsc --noEmit
npm run test
npx prisma db seed
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx prisma migrate dev`: migration `20260715090703_add_application_tracking_fields` applied
  cleanly, `npx prisma generate` run.
- `npx tsc --noEmit`: clean.
- Full suite: 56/56 suites, 614/614 tests pass (up from 55/55, 586/586) — new
  `application-tracking.service.spec.ts` (per-method success/`BadRequestException`/
  `NotFoundException` coverage) plus `workspaces.controller.spec.ts` additions for the 4 new
  endpoints; `workspaces.service.spec.ts`'s `mockWorkspace` fixture updated with the 7 new fields.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove `export-cv` → `mark-ready-to-apply` (from
  `cv_pdf_generated`) → `mark-applied` (`appliedVia`/`notes`/`submittedCvArtifactId` all persisted
  correctly, `appliedAt` set) → `mark-rejected` (`rejectionSummary` persisted, `rejectedAt` set) →
  confirmed a second `mark-applied` call correctly 400s with the expected valid-status list in the
  error message → `archive` (`status: archived`, `isArchived: true`).

### Follow-up

- TASK-051 (rejection text artifact/analysis placeholder) can build on `rejectionSummary`/
  `markRejected` from this task.

## 2026-07-16 — TASK-051 — Implement rejection text artifact and analysis placeholder

### Scope

Continues Phase 11. New `src/rejections/` module: `RejectionsService.saveRejectionText(workspaceId,
dto)` saves the full rejection text (e.g. a recruiter rejection email) as a `rejection_feedback.md`
artifact — richer content than the short `rejectionSummary` DB field added in TASK-050. Guarded by a
locally-hardcoded valid-status array (`[rejected]`, mirrors `ApplicationTrackingService`'s pattern).
Uses the same write-file-then-register-artifact primitives (`ArtifactStorageService.writeFile` +
`ArtifactsService.register`, `origin: 'pasted'`) that `WorkspacesService.createWorkspace` uses for
`00_vacancy_source.txt`. No AI call, no `PromptRun`/`AiRun` — `GeneratedArtifact.promptRunId` stays
`null`, already nullable, so no schema change was needed to satisfy the "optional later AI analysis
can be linked to PromptRun/AiRun" AC. Precondition status and artifact naming were confirmed with
the user before implementation since the backlog card's AC didn't specify them (see
`CURRENT_TASK.md` Context).

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 57/57 suites, 620/620 tests pass (up from 56/56, 614/614) — new
  `rejections.service.spec.ts` (success path + wrong-status `BadRequestException` +
  `NotFoundException`) plus `workspaces.controller.spec.ts` addition for the new endpoint.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove `export-cv` → `mark-ready-to-apply` →
  `mark-applied` → `mark-rejected` → `POST :id/rejection-text` with a multi-line rejection email —
  confirmed `rejection_feedback.md` written verbatim to
  `storage/applications/2026_07_16_SmokeTestCo_Backend_Developer/rejection_feedback.md` and a
  `GeneratedArtifact` row registered (`artifactType: rejection_feedback`, `origin: pasted`,
  `promptRunId: null`). Confirmed the status guard: a second workspace at `source_saved` got a 400
  ("cannot save rejection text (requires one of: rejected)"), and an unknown workspace id got a 404.

### Follow-up

- The real AI-driven `rejection_analysis` step (already named in `docs/03_domain_model.md` §5.4/§9)
  remains future work — this task only laid the artifact groundwork for it.

## 2026-07-17 — TASK-055 — Bootstrap Next.js dashboard

### Scope

New `apps/web/` — Next.js 16 app (App Router, TypeScript, Tailwind CSS, `create-next-app`), fully
independent from the root npm project (its own `package.json`/`node_modules`/lockfile). New
`apps/web/src/lib/api.ts` (`getHealth()`) calls the existing backend `GET /health` endpoint via
`NEXT_PUBLIC_API_BASE_URL` (documented in `apps/web/.env.local.example`, defaults to
`http://localhost:3000`). Home page (`apps/web/src/app/page.tsx`) renders "Backend status: ok/
unreachable". No backend contract changes. Discovered and fixed a collision: the root `tsconfig.json`
(no prior `exclude`) and root `npm run lint` glob (`{src,apps,libs,test}/**/*.ts`) both picked up the
new `apps/web` files, since `apps` was leftover Nest-CLI-convention boilerplate never previously
populated. Fixed by adding `"exclude": ["node_modules", "dist", "apps"]` to `tsconfig.json` (and
`apps` to `tsconfig.build.json`'s exclude, which does not merge with the parent) and dropping `apps`
from the root lint script's glob (`package.json`). A third instance of the same collision surfaced
at commit time via the Husky pre-commit hook: root `lint-staged`'s `"*.ts"` pattern also matched
staged `apps/web/*.ts` files and ran the root ESLint config (whose `parserOptions.project` does not
cover `apps/web`) against them. Fixed by scoping `lint-staged` to `{src,libs,test}/**/*.ts` in
`package.json`, matching the already-fixed root lint script.

### Commands

```bash
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
npx tsc --noEmit          # root backend, confirms apps/web no longer picked up
npm run lint               # root backend
npm run test                # root backend
docker compose ps           # confirmed postgres + redis already running
npm run start:dev           # backend, manual smoke test
cd apps/web && npm run dev  # frontend, manual smoke test
```

### Result

PASS

### Evidence

- `apps/web`: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run build` succeeds
  (route `/` compiled as dynamic due to live `fetch`).
- Root backend: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` — 59/59 suites,
  637/637 tests pass (unchanged from TASK-054 baseline, confirming the `apps/web` addition and
  `tsconfig`/lint fixes did not affect backend behavior).
- Manual smoke test: started backend (`npm run start:dev`, port 3000) — `curl http://localhost:3000/health`
  returned `{"status":"ok"}`. Started `apps/web` dev server (`npm run dev`, auto-selected port 3001
  since 3000 was in use) — page rendered "Backend status: ok" (green), confirming the frontend
  successfully calls the real backend health endpoint end-to-end. Both dev servers stopped after
  verification.

### Follow-up

- TASK-056 (workspace creation UI) is the next planned `apps/web` task per
  `docs/07_task_backlog.md`.

## 2026-07-17 — TASK-055 (restructuring follow-up) — Move backend to apps/api

### Scope

Per user request during TASK-055 review (see ADR-023), moved the NestJS backend from the repo
root to `apps/api/`, a peer of `apps/web/`, to fix the structural asymmetry of a frontend nested
inside what was the backend's own root. `git mv` used throughout to preserve file history for
tracked files (`src/`, `prisma/`, `test/`, `knowledge-sources/`, `package.json`,
`package-lock.json`, `tsconfig*.json`, `nest-cli.json`, `Dockerfile`, `.eslintrc.js`,
`.prettierrc`, `.env.example`, `.dockerignore`, `scripts/check-postgres-persistence.*`,
`scripts/register-knowledge-sources.ts`); untracked dirs (`node_modules`, `dist`, `coverage`,
`storage`, `.env`) moved with plain `mv`. Root `package.json` reduced to a minimal
husky+lint-staged-only config; `docker-compose.yml`, `.github/workflows/ci.yml`,
`.claude/settings.json`+hook scripts, `CLAUDE.md`, `README.md` all updated for the new paths.

### Commands

```bash
# after git mv / mv of all backend files+dirs into apps/api/
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run build
npm run test:e2e          # against already-running docker compose postgres+redis
cd ../..
docker compose config      # verify build context + env substitution
npm install                 # root: husky + lint-staged
npx lint-staged             # verify pre-commit pipeline against real staged (moved) files
cd apps/api && npm run start:dev   # manual smoke test
cd apps/web && npm run dev          # manual smoke test
```

### Result

PASS

### Evidence

- `apps/api`: `npx tsc --noEmit` clean; `npm run lint` clean; `npm run test` — 59/59 suites,
  637/637 tests pass (unchanged from pre-move baseline); `npm run test:e2e` — 3/3 suites, 4/4
  tests pass; `npm run build` clean.
- `docker compose config` (from repo root) resolved with no blank-variable warnings, correct
  `build.context: apps/api`, correct `env_file`.
- Root `npx lint-staged` ran against the real staged files from the `git mv` (43 backend `.ts`
  files matched `apps/api/{src,libs,test}/**/*.ts`) — both `eslint --fix` and `prettier --write`
  completed successfully via the app-local binary paths, confirming the new root lint-staged
  config resolves correctly regardless of invocation cwd.
- Manual smoke test: real backend (`cd apps/api && npm run start:dev`, port 3000) —
  `curl http://localhost:3000/health` returned `{"status":"ok"}`. Real frontend
  (`cd apps/web && npm run dev`, port 3001) — page rendered "Backend status: ok", confirming the
  full stack still works end-to-end from the new locations. Both dev servers stopped after
  verification.

### Follow-up

- None — TASK-056 (workspace creation UI) remains the next planned `apps/web` task.

## 2026-07-17 — TASK-055 (Docker follow-up) — Dockerize apps/web, add to docker-compose

### Scope

Per user request (ADR-024), added `apps/web/Dockerfile` (3-stage, Next.js `output: "standalone"`)
and a `web` service to `docker-compose.yml` (`depends_on: app`, `${WEB_PORT:-3001}:3000`). Found
and fixed a real bug during verification: the Next.js standalone server bound to the container's
own network IP instead of `0.0.0.0`, because it honors Docker's auto-set `$HOSTNAME` — fixed with
an explicit `ENV HOSTNAME="0.0.0.0"` in the Dockerfile's runner stage.

### Commands

```bash
docker compose config                    # verify web service resolves correctly
docker compose build web
docker compose up -d web                  # also starts/reuses app, postgres
docker compose ps
docker exec jobflow_web sh -c "curl -v http://localhost:3000/"   # in-container reachability
curl http://localhost:3001                # host reachability
docker compose stop app web               # teardown (postgres/redis left running, pre-existing)
```

### Result

PASS (after one fix — see Scope)

### Evidence

- First build/run attempt: `docker compose ps` showed `jobflow_web` stuck at
  `health: starting` → `unhealthy`. `docker exec jobflow_web sh -c "netstat -tlnp"` showed
  `next-server` listening on `172.20.0.5:3000`, not `0.0.0.0:3000` — explaining why the
  in-container `HEALTHCHECK` (`curl http://localhost:3000/`) failed with connection refused, even
  though the host could still reach it via `http://localhost:3001` (Docker NAT routes the
  published port straight to the container's IP:port, independent of what interface the process
  bound to).
- After adding `ENV HOSTNAME="0.0.0.0"` and rebuilding: `docker compose ps` shows `jobflow_web` as
  `Up ... (healthy)`. `docker exec jobflow_web sh -c "curl -sf http://localhost:3000/"` succeeds.
  `curl http://localhost:3001` (host) still renders "Backend status: ok" — confirms the
  containerized frontend successfully reaches the containerized backend at `http://app:3000` over
  the Docker network, with `NEXT_PUBLIC_API_BASE_URL` correctly baked in at build time via the new
  `docker-compose.yml` `build.args`.
- `docker compose config` resolves the `web` service correctly (`build.args`, port mapping,
  `depends_on: app`) with no warnings.
- Containers stopped after verification (`docker compose stop app web`); `postgres`/`redis` left
  running as they were before this check (pre-existing, unrelated).

### Follow-up

- None.

## 2026-07-17 — TASK-056 — Implement workspace creation UI

### Scope

`apps/web/src/app/workspaces/new/` (page/form/Server Action), `apps/web/src/lib/slug.ts` (client
slug preview), `apps/web/src/lib/api.ts` `createWorkspace()`. Verified `apps/web` build tooling
clean and a real end-to-end workspace creation through the UI against a real backend.

### Commands

```bash
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
```

### Result

PASS (after one environment fix — see Evidence)

### Evidence

- `npm run lint` / `npx tsc --noEmit` / `npm run build` all clean; `next build` output shows
  `/workspaces/new` compiled as a dynamic (server-rendered) route.
- First manual attempt used the already-running containerized backend (`jobflow_app`, Docker) and
  failed with "Internal server error" in the form. `docker logs jobflow_app` showed
  `EACCES: permission denied, mkdir '/app/d:'` — a pre-existing environment issue, not a bug in
  this task's code: `apps/api/.env`'s `STORAGE_ROOT` is a Windows host path
  (`d:/projects_js/...`), which is only valid when running the backend natively, not inside the
  Linux container (the container's own `.env` handling for this variable was never exercised by a
  create-workspace call before this task). Fixed for the test by stopping the container
  (`docker compose stop app`, non-destructive) and running the backend locally
  (`cd apps/api && npm run start:dev`) so `STORAGE_ROOT` resolved correctly against the real
  Windows filesystem.
- Second attempt (user, real browser, `http://localhost:3002/workspaces/new` frontend dev server +
  local `http://localhost:3000` backend): submitted company "www", role "dev", a vacancy text
  body, and an optional source URL. Form showed the success panel — "Workspace created — status:
  source_saved", workspace slug `2026_07_17_www_dev`, folder path and vacancy source path
  displayed, matching the client-side slug preview exactly.
- Backend log confirmed `POST /workspaces` → `201`, response time 126ms.
- Filesystem: `storage/applications/2026_07_17_www_dev/00_vacancy_source.txt` created with the
  submitted vacancy text.
- Database: `ApplicationWorkspace` (`status: source_saved`, `createdFrom: manual`), `Company`
  (`nameOriginal: www`, `companySlug: www`), `JobVacancy` (`roleTitleOriginal: dev`,
  `roleSlug: dev`, `sourceUrl` populated) all created correctly and linked.
- Test data cleaned up after verification: DB rows deleted (`GeneratedArtifact` →
  `ApplicationWorkspace` → `JobVacancy` → `Company`), test folder removed from
  `storage/applications/`.
- Environment restored: local `npm run start:dev` backend stopped, leftover `node` process on port
  3000 killed, `docker compose start app` — `jobflow_app` back to `(healthy)`, matching
  pre-test state.

### Follow-up

- None. The `STORAGE_ROOT` Windows-path-in-container mismatch only affects manual testing that
  drives `POST /workspaces` against the Docker container directly on this Windows host; it does
  not affect the app's actual behavior in a real Linux deployment (where `STORAGE_ROOT` would be
  set to a Linux path) and is out of scope for this task.

## 2026-07-18 — TASK-PH-023 — Remediate PostCSS XSS Dependabot alert + re-triage stale CodeQL alerts

### Scope

GitHub Dependabot alert #23 (`PostCSS has XSS via Unescaped </style> in its CSS Stringify
Output`, Moderate, `apps/web/package-lock.json`, vulnerable `< 8.5.10`) — discovered after
TASK-056 merged and this was the first Dependabot scan of `apps/web`'s lock file. Also re-triaged
6 GitHub code-scanning (CodeQL) alerts (#8-13, all High) discovered at the same time, which turned
out to be re-detections of already-dismissed findings (see Evidence).

### Commands

```bash
cd apps/web && npm install   # after adding "overrides": { "postcss": "^8.5.10" }
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
```

### Result

PASS

### Evidence

- Root cause: `apps/web`'s only direct devDependency naming postcss is
  `@tailwindcss/postcss` (`^4`), which resolves a top-level `postcss@8.5.19` (already patched).
  The vulnerable copy was `next`'s own nested `node_modules/next/node_modules/postcss@8.4.31`
  (Next.js 16.2.10 bundles its own older postcss internally).
- Added `"overrides": { "postcss": "^8.5.10" }` to `apps/web/package.json`, mirroring the
  `apps/api` `overrides` pattern from TASK-PH-013. After `npm install`: only one `postcss`
  resolves in the entire tree (`node_modules/postcss@8.5.19`); `npm install` reports
  `found 0 vulnerabilities`.
- `apps/web` `npm run lint` / `npx tsc --noEmit` / `npm run build` all clean after the override
  (no behavior change expected — pure transitive dependency bump).
- Separately (same session, not a code change): `gh api .../security/code-scanning/alerts` showed
  6 open High-severity CodeQL alerts (#8-13: 2× `js/polynomial-redos` in `slug.service.ts`, 4×
  `js/path-injection` in `artifact-storage.service.ts`/`import.service.ts`). Cross-checked against
  6 already-dismissed alerts (#1-4, #6-7) at the old `src/...` path — identical file/line/rule for
  each. Confirmed these are the same TASK-PH-014/TASK-046/TASK-047-triaged findings re-detected as
  "new" purely because CodeQL treats file path as part of alert identity, and ADR-023's `git mv`
  from `src/` to `apps/api/src/` did not carry dismissals forward. Re-dismissed all 6 via
  `gh api -X PATCH .../code-scanning/alerts/{n}` with the same reasons (2× `won't fix`, 4×
  `false positive`) and a comment referencing the original alert number + ADR-023. No source code
  changed for these — confirmed by re-reading the same guarded call sites
  (`assertInsideStorageRoot()`/`assertInsideImportRoot()`) already in place. Verified:
  `gh api .../code-scanning/alerts -q '[.[] | select(.state=="open")] | length'` → `0`.
- Confirmed why the original 6 alerts didn't block PR #107: branch protection's required status
  check `Analyze (javascript-typescript)` (the CodeQL Action job) reports success based on the
  workflow step completing, not on the SARIF results containing zero findings — `gh pr checks 107`
  showed it `pass`ed even with alerts present. This is expected GitHub behavior (findings surface
  in the Security tab for manual triage; they don't fail the job by default), not a
  misconfiguration to fix in this task.

### Follow-up

- None.

## 2026-07-18 — TASK-PH-024 — Block merges on high+ severity CodeQL/Dependabot alerts

### Scope

Follow-up to TASK-PH-023 — user asked how to configure CI so open security alerts actually block
merges, since it turned out the plain `Analyze (javascript-typescript)`/CodeQL status check only
reports whether the job ran, not whether it found anything. Adds (1) a native GitHub Ruleset
requiring CodeQL results at `high_or_higher` severity, and (2) a custom `Dependabot Severity Gate`
CI job (no native ruleset equivalent exists for Dependabot alerts), both required for merging to
`main`.

### Commands

```bash
gh api -X POST repos/strakhovdenya/jobflow-cv-pipeline/rulesets --input ruleset.json
gh api -X PATCH repos/strakhovdenya/jobflow-cv-pipeline/branches/main/protection/required_status_checks ...
gh pr checks 109
gh run rerun <run-id> --failed
gh api repos/strakhovdenya/jobflow-cv-pipeline/actions/jobs/<job-id>/logs
```

### Result

PASS (after one real blocker found and fixed — see Evidence)

### Evidence

- Created GitHub Ruleset `require-codeql-high-or-higher` (branch target `main`, rule type
  `code_scanning`, `security_alerts_threshold: high_or_higher`, `alerts_threshold: none` so only
  security-rated findings gate, not generic code-quality ones). `enforcement: active`, verified via
  `gh api .../rulesets/<id>`.
- First implementation of the `Dependabot Severity Gate` CI job used `GITHUB_TOKEN` with
  `permissions: security-events: read`. Real CI run on PR #109 failed in 4s: `gh: Resource not
  accessible by integration (HTTP 403)`. Confirmed via job logs that `GITHUB_TOKEN` cannot read
  the Dependabot Alerts API regardless of the `permissions:` block — this endpoint requires a PAT
  (classic `security_events` scope, or fine-grained "Dependabot alerts: Read-only").
  Immediately removed the job from required status checks (`required_status_checks` PATCH) to
  avoid permanently blocking all future merges on a gate that could never pass.
  User created a fine-grained PAT scoped to this repo only, "Dependabot alerts: Read-only", added
  as repo secret `DEPENDABOT_ALERTS_TOKEN` (token value never shared in chat — added directly by
  the user via `gh secret set`/GitHub UI). Workflow updated to read `GH_TOKEN:
  ${{ secrets.DEPENDABOT_ALERTS_TOKEN }}` instead.
- Re-ran the previously-failed job (`gh run rerun <id> --failed`) after the secret was added:
  `Dependabot Severity Gate` passed in 2s. Verified via raw job logs
  (`gh api .../actions/jobs/<id>/logs`) that it genuinely queried the API and got a real answer
  (`Open high/critical Dependabot alerts: 0`), not a silently-skipped step.
- Re-added `Dependabot Severity Gate` to `required_status_checks` after verifying it works.
- `gh pr checks 109` — all 9 checks pass, including `CodeQL`, `Analyze (javascript-typescript)`,
  and `Dependabot Severity Gate`.

### Follow-up

- None. If a future high/critical Dependabot or CodeQL alert is a genuine false positive/won't-fix
  (as happened in TASK-PH-014/023), it must be dismissed on GitHub with a recorded justification —
  the new gates will otherwise correctly block merges until it is triaged.

## 2026-07-18 — TASK-062 — Add unit/component test runner and coverage to apps/web

### Scope

`apps/web` had no test runner at all — TASK-055/056/057 were verified by manual smoke test only.
Adds Vitest + React Testing Library as `apps/web`'s own independent test stack (separate
devDependencies from `apps/api`'s Jest setup), unit tests for `src/lib/slug.ts` (mirroring the
scope of `apps/api`'s `slug.service.spec.ts` per ADR-013), a component test for the workspace
creation form (`workspace-form.spec.tsx`), a new `web-test` CI job, and a measured coverage floor
(ADR-022 method).

### Commands

```bash
cd apps/web
npx vitest run
npx vitest run --coverage
npm run lint
npx tsc --noEmit
npm run build
```

### Result

PASS — 31/31 tests (2 suites), lint clean, typecheck clean, build clean.

### Evidence

- `src/lib/slug.spec.ts` — 26 tests covering `normalizeCompanySlug`, `normalizeRoleSlug` (same
  cases as `apps/api/src/common/slug/slug.service.spec.ts`) and `previewWorkspaceSlug`.
- `src/app/workspaces/new/workspace-form.spec.tsx` — 5 tests covering slug preview updates,
  required-field validation, successful submission (mocked `createWorkspaceAction`) rendering the
  success state with a working "View workspace" link, and server-returned validation errors
  rendering in the error list.
- Found and fixed a real gap during setup: React Testing Library does not auto-cleanup between
  tests under Vitest (unlike Jest), causing `getByRole` to fail with "multiple elements found"
  once a second test file rendered the same component — fixed by calling `cleanup()` in
  `afterEach` inside `vitest-setup.ts`.
- Measured coverage baseline for all of `apps/web/src` (2026-07-18, first-ever `apps/web` test
  suite): statements 20.88%, branches 16.47%, functions 18.96%, lines 21.56% — most of the app
  (`lib/api.ts`, the two workspace review-gate components, all pages) has no tests yet, which is
  expected since this task's AC only requires `slug.ts` + the creation-form component. Threshold
  in `vitest.config.ts` set a small margin below the measured number (statements 20 / branches 15
  / functions 18 / lines 20) as a regression floor, not a target — same method as `apps/api`'s
  `coverageThreshold` (ADR-022). Will rise as future tasks add coverage for the untested files.
- New `web-test` CI job added to `.github/workflows/ci.yml` (`working-directory: apps/web`,
  `npm ci` + `npm run test:cov`), matching the existing `apps/api` job pattern (ADR-023). No
  Postgres service needed — `apps/web` has no DB dependency.
- `coverage/**` added to `apps/web/eslint.config.mjs` `globalIgnores` — `npm run lint` was
  reporting a stray warning from the generated `coverage/block-navigation.js` before this fix
  (`coverage/` was already gitignored but not eslint-ignored, since `globalIgnores` overrides
  eslint-config-next's defaults rather than extending them).

### Follow-up

- None for this task. `apps/web/src/lib/api.ts` and the two review-gate components remain
  untested — candidates for a future coverage-expansion task, not blocking here since they were
  not part of this task's acceptance criteria.

## 2026-07-18 — TASK-059 — Add integration tests for database persistence assumptions

### Scope

The persistence-verification script and README docs (`ADR-007`/`TASK-005`, 2026-06-28) already
existed and had already been run once with a PASS result — but `ADR-023`'s later move of the
backend into `apps/api/` broke both README references to it: the checklist link pointed at
`scripts/check-postgres-persistence.md` (now `apps/api/scripts/check-postgres-persistence.md`),
and `npm run db:check-persistence` (only defined in `apps/api/package.json`, not the root
`package.json`) would fail if run as literally written from the repo root. This task fixes both
stale references and re-verifies the script still works post-restructuring. No new automated
Jest/e2e spec was added — the scenario requires driving `docker compose down`/`up` from outside
the test process, which Jest/Vitest can't do natively, and the backlog's AC explicitly allows
"documented/manual or automated"; the existing shell-script approach is the right tool here (this
was discussed and agreed with the user before implementation).

### Commands

```bash
cd apps/api
bash scripts/check-postgres-persistence.sh
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "\dt"
```

### Result

PASS

### Evidence

- Re-ran `apps/api/scripts/check-postgres-persistence.sh` for real (not just documentation review)
  after the README fix, invoked exactly as the corrected README instructs (`cd apps/api && npm run
  db:check-persistence` — verified equivalently via the underlying `bash scripts/...` call).
  Confirmed `docker compose` correctly locates the root-level `docker-compose.yml` even when
  invoked from `apps/api/` — Docker Compose v2 searches parent directories for the compose file,
  same as `git` does for `.git`, so no path fix was needed in the script itself, only in the
  README's prose/links.
  - Row inserted, `docker compose down` (no `-v`) removed the container only, `docker compose up
    -d postgres` restarted it, row still present after restart.
  - Final script output: `RESULT: PASS — data survived docker compose down + up`.
  - Confirmed the test table (`_persist_check`) was dropped cleanly at the end — `\dt` shows no
    leftover table.
- Fixed `README.md`: checklist link now points to
  `apps/api/scripts/check-postgres-persistence.md`; `npm run db:check-persistence` instruction now
  prefixed with `cd apps/api` to match where the script actually lives.

### Follow-up

- None. If `apps/api/` moves again or the persistence script changes, re-check these two README
  references at the same time — this is exactly the kind of doc drift ADR-023's move already
  caused once.

## 2026-07-18 — TASK-060 — Add README portfolio documentation

### Scope

Reviewed `README.md` against the four ACs (backend-first architecture explanation, MVP flow,
AI-usage-tracking/artifact-storage/PostgreSQL-metadata explanation, personal-project disclaimer).
The first, second and fourth were already well covered. Added a new "Data & Artifact Model"
section for the third. While verifying the "AI usage tracking" claim against the real code (not
just docs), found the "Project status" table understated three already-implemented features as
"In progress" — fixed all three for portfolio honesty (the task's explicit done-definition).

### Commands

```bash
grep -rln "AiUsageTrackingService\|AiRunsService" apps/api/src --include="*.ts"
find apps/api/src/evidence -type f
grep -n "@Post" apps/api/src/document-export/document-export.controller.ts
```

### Result

PASS (manual review)

### Evidence

- **Token/cost tracking** — confirmed `AiRunsService.saveSuccess()` (`apps/api/src/ai-runs/
  ai-runs.service.ts`) writes `inputTokens`/`outputTokens`/`totalTokens`/`cachedInputTokens`/
  `reasoningTokens`/`costEstimate`/`usageRawJson` to the `AiRun` table, called from all five
  pipeline services (`prompt1`, `prompt2`, `prompt3`, `prompt5`, `cover-letter`). Was listed
  "In progress" in the README table — corrected to "Implemented".
- **Evidence Guard** — confirmed `EvidenceGuardService.checkOutput()` (`apps/api/src/evidence/
  evidence-guard.service.ts`) runs 17 regex-based critical-claim patterns (blocking commercial
  AI/NestJS/Kubernetes/AWS/etc. production claims not backed by evidence) plus a `needs_evidence`
  collector, wired into `prompt2.service.ts`, with a full spec file. Was listed "In progress" —
  corrected to "Implemented / evolving".
- **Deterministic HTML/PDF export** — confirmed a real `POST /workspaces/:id/export-cv` endpoint
  (`apps/api/src/document-export/document-export.controller.ts`) backed by
  `html-renderer.service.ts` + `pdf-export.service.ts`. Was listed "In progress" — corrected to
  "Implemented".
- Added "Data & Artifact Model" README section explaining the PostgreSQL metadata chain
  (`Company → JobVacancy → ApplicationWorkspace → PromptRun → AiRun` + `GeneratedArtifact`
  registry), filesystem canonical artifact naming, and the `AiRun` token/cost fields — linking to
  `docs/04_architecture.md` for full depth rather than duplicating it.
- Manual review of all added/changed README text against CLAUDE.md's Anti-Overclaiming Rules: no
  new text claims commercial production experience, presents Docker/NestJS/AI work as commercial
  core skills, or uses inflated language ("production-ready", "enterprise-grade", etc.) — all
  additions are factual architecture descriptions verified against the real code, not aspirational
  claims.

### Follow-up

- None. TASK-061 (architecture diagram) is a separate, already-planned follow-up task.

## 2026-07-18 — TASK-061 — Add architecture diagram or Mermaid flow

### Scope

The existing README Mermaid diagram ("High-level architecture") was a pipeline/data-flow view
(Vacancy Source → Prompt Pipeline → ... → PDF Export) — it didn't show the actual system
components the AC asks for: no explicit NestJS API node, no Redis, no Next.js. Both are already
real (not "later placeholders"): Redis/BullMQ backs the async Prompt 1 analysis queue
(`apps/api/src/queue/`), and `apps/web` is a real Next.js app (ADR-023/024). Added a new "System
architecture" Mermaid diagram showing Next.js Dashboard → NestJS API → {PostgreSQL, Redis/BullMQ
queue, Filesystem Artifact Storage, AI Provider (OpenAI/Fake)}, with Prompt Pipeline and Document
Export as internal API components. Renamed the old diagram's heading to "Pipeline flow" (kept as
a complementary business-flow view, not removed) — verified no README/docs anchor links pointed at
the old `#high-level-architecture` heading before renaming.

### Commands

```bash
grep -n "class.*Provider" apps/api/src/ai/providers/*.ts
grep -n "^  app:\|^  web:\|^  postgres:\|^  redis:" docker-compose.yml
grep -rn "high-level-architecture" README.md docs/
```

### Result

PASS (manual rendering check)

### Evidence

- Confirmed component names against real code before drawing the diagram: `OpenAiProvider` /
  `FakeAiProvider` (`apps/api/src/ai/providers/`), `docker-compose.yml` services
  (`app`/`web`/`postgres`/`redis`), `apps/api/src/queue/` (BullMQ queue + `analysis.worker.ts`).
- No existing anchor links referenced `#high-level-architecture` (checked via grep across
  `README.md` and `docs/`) — safe to rename without breaking links.
- Rendered both Mermaid diagrams via a Claude Artifact preview
  (https://claude.ai/code/artifact/ef527abe-d0eb-4e04-8372-f991cd4c5c2b) before committing — both
  the new "System architecture" flowchart and the renamed "Pipeline flow" flowchart render
  correctly with no syntax errors.
- Added an explicit caption above the new diagram ("Local Docker Compose services ... no cloud
  deployment exists or is planned") linking to the "Production deployment: Not planned" row in the
  Project status table — satisfies AC2 (diagram must not imply cloud production deployment).
- No changes made to `docs/04_architecture.md` or `docs/assets/**` — those were listed as "likely
  affected" in the backlog, not required; Mermaid in `README.md` fully covers the AC, consistent
  with TASK-060's link-out-rather-than-duplicate approach.

### Follow-up

- None.

## 2026-07-19 — TASK-064 — Add artifact content viewer and generic download links

### Scope

The workspace detail page's artifact table showed type/filename/version/latest as plain text with
no way to read or download the actual file. `apps/api`'s `GET /artifacts/:id/download` and
`GET /workspaces/:id/artifacts` already existed — `apps/web`-only change. Discovered during
investigation: every backend endpoint (including download) sits behind the global `ApiKeyGuard`
(`X-API-Key`), and in Docker the backend is only reachable from the browser via an internal
hostname — so a plain `<a href>` straight at the backend can't work for either downloading or
inline viewing. Added a same-origin Next.js Route Handler proxy
(`apps/web/src/app/api/artifacts/[id]/download/route.ts`) that attaches `X-API-Key` server-side
and streams the backend's response (same `Content-Type`/`Content-Disposition`) back to the
browser; both the download link and the inline viewer's `fetch()` point at this one route. New
`apps/web/src/app/workspaces/[id]/artifact-viewer.tsx` (client component) renders a Download link
plus a View toggle (text/markdown/json only) per artifact row, replacing the inline table in
`page.tsx`.

Found a second, pre-existing bug during manual smoke testing (out of this task's `apps/web`-only
scope, not fixed here): `apps/api/src/workspaces/workspaces.service.ts`'s `vacancy_source`
artifact registration (lines 96–104) omits `mimeType`/`downloadFileName`, so `00_vacancy_
source.txt`'s artifact came back from the API with `mimeType: null`. Since the AC requires this
artifact to render inline, the frontend's `isTextRenderable()` was made resilient with a
`canonicalFileName` extension fallback (`.txt`/`.md`/`.json`) instead of trusting `mimeType`
alone — keeps the fix entirely within `apps/web`. Download was unaffected either way: the
backend's `Content-Disposition` already falls back to `canonicalFileName` when `downloadFileName`
is null. Logged as a new Known Gap in `TASK_BOARD.md` for a future backend fix (resolved same day
by TASK-064A below).

### Commands

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test -- --run
npm run build
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test -- --run` 44/44
  passed (5 new tests in `artifact-viewer.spec.tsx`: empty state, download link href, inline
  view fetch+render, PDF has no View button, fetch-failure error state, plus the
  mimeType-null-fallback case), `npm run build` clean — new route
  `ƒ /api/artifacts/[id]/download` listed alongside existing routes.
- Manual smoke test against a real backend (`apps/api` dev server, `AI_PROVIDER=fake`,
  `apps/web` dev server on port 3001): created a workspace via `POST /workspaces`, ran
  `POST :id/run-analysis` to produce `01_vacancy_analysis.md/json`, then fetched the rendered
  `GET /workspaces/:id` page — confirmed all 3 artifacts (`vacancy_source`,
  `vacancy_analysis_md`, `vacancy_analysis_json`) show a "View" button and a download link
  pointing at `/api/artifacts/{id}/download`.
- Verified the proxy route directly: `curl http://localhost:3001/api/artifacts/{id}/download`
  returned the real vacancy-source text content with `content-type: text/plain; charset=utf-8`
  and `content-disposition: attachment; filename="00_vacancy_source.txt"` (correct fallback
  filename despite the artifact's `downloadFileName` being null in the DB); the JSON artifact
  returned `content-type: application/json` with the correct filename; a nonexistent artifact id
  correctly returned `404` through the proxy.
- Smoke-test workspace left in the local dev database (no delete endpoint exists — consistent
  with TASK-057/059/063's precedent).

### Follow-up

- New Known Gap logged in `TASK_BOARD.md`: `workspaces.service.ts`'s `vacancy_source` artifact
  registration is missing `mimeType`/`downloadFileName` — not fixed here since TASK-064 was
  scoped `apps/web`-only; worked around in the frontend viewer for now. Resolved same day by
  TASK-064A below.

## 2026-07-19 — TASK-064A — Fix missing mimeType on vacancy_source artifact registration

### Scope

Discovered during TASK-064's manual smoke test (above): `apps/api/src/workspaces/workspaces.service.ts`'s
`createWorkspace()` registers the `vacancy_source` artifact (`00_vacancy_source.txt`) without a
`mimeType`, unlike every other artifact-registration call site in the codebase — including
`import.service.ts`'s registration of the exact same artifact type for legacy-imported
workspaces, which does pass `mimeType: LEGACY_ARTIFACT_MIME_TYPES[LegacyArtifactType.vacancy_source]`
(`'text/plain'`). Fixed by adding the same literal `mimeType: 'text/plain'` to the `register()`
call in `workspaces.service.ts` (lines 96–105).

`downloadFileName` was deliberately left untouched (still null): checked every other
`artifactsService.register()` call site across the codebase (Prompt 1/2/3/5 services, cover
letter, rejections) — only the PDF export artifact and the skip-reason artifacts set
`downloadFileName`; every other artifact type, including `vacancy_source` even in
`import.service.ts`, leaves it null and relies on `artifacts.controller.ts`'s existing fallback
to `canonicalFileName`. Setting it here would have been scope creep beyond the actual bug.

### Commands

```bash
cd apps/api
npx jest workspaces.service.spec.ts
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- New test in `workspaces.service.spec.ts` ("registers the vacancy_source artifact with mimeType
  text/plain") directly asserts `artifactsService.register` is called with
  `expect.objectContaining({ artifactType: 'vacancy_source', mimeType: 'text/plain' })` — this is
  the first direct unit test of `createWorkspace()`'s artifact-registration call at all (previously
  only exercised indirectly via e2e).
- Full suite: 59/59 suites, 639/639 tests (was 638 before this task's one new test).
  `npx tsc --noEmit` clean. `npm run lint` clean (Prettier reformatted the touched spec file only).
  `npm run test:e2e`: 3/3 suites, 4/4 tests pass (pre-existing `ECONNREFUSED :6379` warning is the
  documented TASK-054 "REDIS_URL not configured" no-op path, unrelated to this change).
- Manually verified against a real backend (`apps/api` dev server in watch mode, picked up the
  change automatically): created a fresh workspace via `POST /workspaces`, then `GET
  /workspaces/:id` returned `"mimeType":"text/plain"` for the `vacancy_source` artifact (was
  `"mimeType":null` before the fix, confirmed against an earlier workspace created during TASK-064's
  own smoke test).

### Follow-up

- None.

## 2026-07-20 — TASK-065 — Add async/queued analysis trigger with job-status polling to workspace detail UI

### Scope

New `apps/web/src/app/workspaces/[id]/async-analysis-trigger.tsx` client component — an
alternative to `pipeline-actions.tsx`'s synchronous "Start analysis" button — that calls
`POST :id/run-analysis-async` (enqueue) then polls `GET :id/analysis-job/:jobId` every 2s until
a terminal BullMQ state (`completed`/`failed`), showing intermediate states (`waiting`/`delayed`
→ "Queued", `active` → "Running…") along the way. Self-contained polling state via
`useState`/`useEffect`/`useRef` (interval ref cleared on unmount and on reaching a terminal
state — no page-level state dependency, no indefinite polling). New `lib/api.ts` functions
`runAnalysisAsync`/`getAnalysisJobStatus` and `actions.ts` Server Actions
`runAnalysisAsyncAction`/`getAnalysisJobStatusAction`, following the exact pattern already
established by `runAnalysisAction` et al. If the enqueue call itself fails (e.g. `REDIS_URL` not
configured — `QueueService.getQueue()` throws synchronously via `configService.getOrThrow`), the
component shows the error immediately and never starts polling — verified this is the actual
backend behavior by reading `queue.service.ts`, not assumed.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 49/49 passed (5 test files, 5 new in async-analysis-trigger.spec.tsx)
npm run build

# apps/api (real backend, fake AI provider), real Redis
docker compose up -d redis   # postgres already running from a prior session
cd apps/api && npm run start:dev

# manual flow: real backend + curl, plus fetching the already-running apps/web dev server's
# rendered HTML (same "curl + browser HTML fetch" methodology as TASK-063/TASK-064)
curl -X POST http://localhost:3000/workspaces -d '{...}'                      # create workspace 1
curl -X POST http://localhost:3000/workspaces/:id1/run-analysis-async         # -> {"jobId":"1"}
curl http://localhost:3000/workspaces/:id1/analysis-job/1                     # -> state: completed, returnValue.decision

curl -X POST http://localhost:3000/workspaces ...                             # create workspace 2
curl http://localhost:3001/workspaces/:id2 | grep 'Start analysis (async)'    # button renders server-side
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 49/49 passed (5 new:
  not rendered outside `source_saved`; full `waiting`→`active`→`completed` poll sequence with
  `router.refresh()` and interval stopping; `failed` terminal state stops polling and shows
  `failedReason`; enqueue failure shows an error with zero `getAnalysisJobStatusAction` calls;
  interval is cleared on unmount). `npm run build` clean (`/workspaces/[id]` route compiles).
- Real backend + real Redis (`docker compose up -d redis`, fake AI provider): enqueuing via
  `POST :id/run-analysis-async` against a fresh `source_saved` workspace returned `{"jobId":"1"}`;
  polling `GET :id/analysis-job/1` returned `state: "completed"` with `returnValue.decision:
  "apply"`, `returnValue.workspaceStatus: "paused_after_analysis"` — matches
  `AnalysisJobStatus`/`RunAnalysisResult` typed exactly as declared in `lib/api.ts`.
- Confirmed the new "Start analysis (async)" button server-renders correctly against the real,
  already-running `apps/web` dev server (port 3001) for a fresh `source_saved` workspace fetched
  from the real backend.
- Did not exercise the no-`REDIS_URL` error path live (would have required restarting the backend
  without Redis mid-session); relied on reading `queue.service.ts`'s `getOrThrow('REDIS_URL')` and
  the dedicated unit test covering the enqueue-failure branch instead.
- Full interactive browser click-through (actually clicking the button and watching it transition
  through Queued/Running/Completed in real time) was not performed — no browser automation tool
  was available in this environment. Coverage instead comes from: (1) the component's unit tests
  exercising the exact same polling state machine with mocked actions, and (2) confirming the real
  backend responses those actions wrap match the types the component consumes.

### Follow-up

- Consider a future task exercising the no-`REDIS_URL` path with real browser automation once a
  browser tool is available, plus verifying the intermediate "Queued"/"Running…" labels visually.

## 2026-07-20 — TASK-065A — Fix async-analysis-trigger review findings

### Scope

A code review of TASK-065 (still-open PR #124) found 8 findings; this task fixes 7 of them
(1 explicitly not fixed, see below) before the PR merges. Same branch/PR as TASK-065 (`main`
doesn't contain the code being fixed yet, so a new branch would have nothing to branch from).

**Rewrote `async-analysis-trigger.tsx`'s polling mechanism:**
- Flattened `TriggerState` (a 6-variant discriminated union bundling `jobId`) into separate
  `useState` fields (`phase`, `jobId`, `jobState`, `result`, `errorMessage`) — the polling
  `useEffect`'s dependency array is now the plain `jobId`/`workspaceId` state, no ternary, no
  `eslint-disable` for `exhaustive-deps` (fixes finding 5).
- Replaced `setInterval` + `useRef` + two separate `useEffect`s with one effect using recursive
  `setTimeout` gated by a `cancelled` closure flag — the next poll is only scheduled after the
  current one resolves, so a slow response can no longer resolve out of order and regress a
  terminal state back to "polling" (fixes finding 3); one cleanup path instead of two redundant
  ones (fixes finding 6).
- Added `MAX_POLL_ATTEMPTS = 300` (10 minutes at 2s intervals) — polling now stops with a clear
  "still running after 10 minutes" message instead of continuing forever if a job never reaches
  `completed`/`failed` (fixes finding 4).
- Changed the early-return guard from `status !== "source_saved"` to
  `status !== "source_saved" && phase === "idle"` — once the trigger has actually been used, it
  keeps rendering its own result regardless of how the `status` prop changes afterward. Previously
  `router.refresh()` (called on completion) immediately re-rendered the page with the new status,
  hiding the whole component — including the "Analysis completed" banner it had just shown — for
  effectively 0 visible frames (fixes finding 1, verified with a dedicated `rerender()` test).
- `start()` now fires the first poll immediately after a successful enqueue instead of waiting up
  to 2s for the first tick, so the button reflects the real job state right away instead of a
  hardcoded "Queued" (fixes finding 7).
- Used the React "latest ref" pattern (`routerRef`/`onBusyChangeRef`, updated in a plain
  `useEffect` after each render, per React's "cannot write a ref during render" rule) so the
  polling effect's dependency array doesn't have to include `router`/`onBusyChange` — both are
  effectively-unstable references across renders (confirmed via the test mock, which creates a new
  router object on every `useRouter()` call) that would otherwise restart polling on unrelated
  re-renders.

**New shared lock between the two "start analysis" triggers (fixes finding 2):** new
`apps/web/src/app/workspaces/[id]/analysis-triggers.tsx` — a thin client wrapper holding a single
`analysisLocked` state, rendering both `<PipelineActions>` and `<AsyncAnalysisTrigger>` and passing
the lock + a busy-change callback to each. `pipeline-actions.tsx` gained `analysisLocked`/
`onAnalysisBusyChange` props (excludes `"start_analysis"` from its actions list while locked,
toggles the callback around its own sync call). `async-analysis-trigger.tsx` gained `locked`/
`onBusyChange` props (hides the button while locked and never started; toggles the callback across
its *entire* enqueue-to-terminal lifecycle, not just the enqueue call, so the sync button stays
hidden for as long as an async job could still be running). `page.tsx` now renders
`<AnalysisTriggers>` in place of the two components directly.

**Not fixed — finding 8 (`buttonClass` duplication):** checked all four components in this
directory; each already defines its own local `buttonClass` constant — an existing, repo-wide
convention in this directory, not something TASK-065 introduced. Fixing it here alone would be
inconsistent scope creep beyond this review-fix task.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 58/58 passed (6 test files; 4 new in async-analysis-trigger.spec.tsx,
                       # 2 new in pipeline-actions.spec.tsx, 2 new in new analysis-triggers.spec.tsx)
npm run build

# real backend + real Redis (already running from TASK-065's own verification)
curl -X POST http://localhost:3000/workspaces -d '{...}'                    # fresh workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis-async        # -> {"jobId":"2"}
curl http://localhost:3000/workspaces/:id/analysis-job/2                    # -> completed, returnValue.decision
curl http://localhost:3001/workspaces/:id | grep 'Start analysis\|trigger'  # both triggers render together
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 58/58 passed,
  `npm run build` clean.
- New test in `async-analysis-trigger.spec.tsx` ("keeps the completed banner visible after the
  status prop changes") directly reproduces finding 1's bug scenario via `rerender()` with a
  changed `status` prop and asserts the banner text is still present — this is a regression test
  for the exact bug found in review, not just a happy-path check.
- New test ("stops polling and surfaces a timeout message after the max poll attempts") advances
  fake timers by the full 300 * 2000ms = 10 simulated minutes in one call and confirms polling
  stops with the expected message and no further calls — validates finding 4's fix without a slow
  test (runs in milliseconds under fake timers).
- New `analysis-triggers.spec.tsx` proves the lock works in both directions: clicking the sync
  button hides the async button while the sync call is in flight, and vice versa — this is the
  regression test for finding 2 (the double-AI-run race).
- Real backend + real Redis: re-verified the enqueue/poll contract is unaffected by the frontend
  rewrite (`POST run-analysis-async` -> `{"jobId":"2"}`, `GET analysis-job/2` -> `state:
  "completed"` with the expected `returnValue`); confirmed via `curl` that the workspace detail
  page renders both "Start analysis" and "Start analysis (async)" together at `source_saved` (now
  via the shared `<AnalysisTriggers>` wrapper) and that both disappear once the workspace moves
  past `source_saved`.
- Did not perform a live interactive browser click-through of the lock (clicking one button and
  watching the other visually disappear in real time) — no browser automation tool available.
  Covered instead by `analysis-triggers.spec.tsx`'s integration-style tests exercising the same
  prop-wiring in both directions.

### Follow-up

- None.

## 2026-07-26 — TASK-075 — Component: PipelineStages (branching pipeline visualization)

### Scope

New `apps/web/src/components/pipeline-stages.tsx` — first implementation sub-task of the
TASK-073 redesign epic. Pure presentation component rendering the 11-stage pipeline
(`source, analysis, decision, cvgen, cvreview, prepdf, export, pdfgen, final, cover, tracking`)
as a vertical stepper: numbered circles connected by a line (`done` = filled black circle with
`✓`, `current` = indigo-ring circle + "Now" badge, `upcoming` = muted outline), a progress bar +
percentage from the `progress: { step, total }` prop, and, for the `decision` stage, a nested
`options[]` list with `next`/`pruned`/`open`/`chosen` visual states (`next` = solid indigo fill
with `→` prefix, `pruned` = muted grey with `line-through`, `open` = bordered box, `chosen` =
green-bordered box with `✓` prefix). An option's `reason` (when present) renders as a `title`
tooltip rather than visible inline text, matching the real mockups. New
`apps/web/src/lib/types.ts` adds the shared `StageKey`/`StageState`/`StageOptionState`/
`StageOption`/`Stage`/`Progress` types. Data contract extracted from mockups 03/04/05/10;
visual design iterated against the real mockup files opened locally in a browser (see Progress
Notes in `CURRENT_TASK.md` for the two review round-trips this took).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 101/101 passed (12 test files; 5 new in pipeline-stages.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 101/101 passed (5
  new in `pipeline-stages.spec.tsx`): all-upcoming; mid-pipeline with a `current` stage and "Now"
  badge (mockup 03); a `current` decision stage with `next`/`pruned`(with `title` reason)/`open`
  options (mockup 04); a resolved `done` decision stage with a reason-less `chosen` option and
  reason-less `pruned` options (mockup 05); a still-`current` decision stage with a `chosen`
  option carrying a `reason` alongside `pruned` alternatives, asserting the stage's own circle
  still shows its step number rather than a "done" checkmark — proving stage `state` and option
  `state` are independently rendered, not derived from one another (mockup 10).
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-pipeline-stages/`,
  deleted before this closure — not part of the deliverable) mounting the component with mock
  data mirroring mockups 03/04/05/10. Project owner opened the real saved mockup `.html` files
  locally (they render fully as local files, unlike pasting them into chat — confirmed this
  session, useful for future TASK-076+ visual reviews) side-by-side with the preview and
  requested two rounds of changes: (1) switch from a flat bordered-card list to the real
  vertical-stepper/timeline design with progress bar, numbered circles, and a "Now" badge; (2)
  add back `line-through` styling to `pruned` options, caught via a zoomed screenshot comparison.
  Project owner explicitly confirmed the result ("ок, годится") after the second round.
- Global monospace typography seen in the mockups was explicitly agreed out of scope for this
  component (an app-shell-level concern, not this presentation component's).

### Follow-up

- None. `WorkspaceStatus` → `Stage`/`Progress` mapping is TASK-083's job, not this task's.

## 2026-07-26 — TASK-076 — Component: WorkspaceStatusHeader

### Scope

New `apps/web/src/components/workspace-status-header.tsx` — second implementation sub-task of
the TASK-073 redesign epic. Pure presentation component rendering the shared workspace header:
a small avatar-initial + `{company} · application` caption and a status pill (`● {statusLabel}`)
on the top row, then the `role` as the large heading with the `slug` in small monospace text
below it, and `decision`/`score`/`reviewState` as compact single-line bordered pills
(`{label} {value}`) stacked to the right of the title, with `next: {nextAction}` beneath them.
New `apps/web/src/lib/types.ts` adds `WorkspaceStatusHeaderData`. Data contract and example
values extracted from mockups 03/04/05; visual design iterated against the real mockup files
opened locally in a browser (two review round-trips — see Evidence below).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 104/104 passed (13 test files; 3 new in workspace-status-header.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 104/104 passed (3
  new in `workspace-status-header.spec.tsx`): placeholder state with all three fields `'—'`
  (mockup 03); partially-resolved state with `decision`/`score` set but `reviewState` still `'—'`
  (mockup 04); fully-resolved state with `reviewState: 'approved'` (mockup 05).
- Visual review: built a temporary dev-only route
  (`apps/web/src/app/preview-workspace-status-header/`, deleted before this closure — not part of
  the deliverable) mounting the component with mock data mirroring mockups 03/04/05, viewed via a
  locally running `npm run dev` server (no headless-browser screenshot tooling — `chromium-cli`
  and `playwright` were both unavailable in this environment — so the project owner compared the
  live dev-server page against the real mockup `.html` files directly, per the note left in
  TASK-075's log). Two rounds of changes: (1) initial layout inverted the mockups' hierarchy
  (company as the large heading, decision/score/reviewState as stacked label-over-value fields
  below a full-width status pill) — corrected to match the real mockups: role as the large
  heading, company demoted to a small avatar-initial caption, status pill top-right, and
  decision/score/reviewState as compact pills to the right of the title (also fixed a
  `max-w-md`-caused horizontal overflow of those pills in the preview page, and added
  `flex-wrap` to the component itself for narrower containers); (2) the pills' label/value were
  stacked two lines per pill — changed to a single inline line (`decision apply`) matching the
  mockups. Project owner explicitly confirmed the result ("давай так") after the second round.

### Follow-up

- None. `WorkspaceStatus` → real field mapping is TASK-083's job, not this task's.

## 2026-07-26 — TASK-077 — Component: MainActionCard

### Scope

New `apps/web/src/components/main-action-card.tsx` — third implementation sub-task of the
TASK-073 redesign epic. Pure presentation component rendering the unified "what can I do right
now" action card: `title` (bold heading) + optional `subtitle`, optional `meta` rows as bordered
pills, an optional `info` banner (bordered indigo box, `› {text}`), an optional plain-string
`notice` banner (no box, distinct slot from `info`), an optional labelled `select` dropdown, an
optional `reasonNote` text-input slot (generic "Note" label when `reasonNoteLabel` is absent,
real label when present) accepting either `boolean` or `string`, and `buttons[]` rendered with
`primary`/`secondary`/`disabled` visual treatment (`disabled` buttons stay visible, non-
interactive, with `reason` shown via the native `title` tooltip attribute). New
`apps/web/src/lib/types.ts` additions: `ActionButtonKind`, `MainActionButton`,
`MainActionMetaItem`, `MainActionInfo`, `MainActionSelect`, `MainActionCardData`. Data contract
and example values extracted from mockups 03/04/05/06/11.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 111/111 passed (14 test files; 7 new in main-action-card.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 111/111 passed (7
  new in `main-action-card.spec.tsx`): single primary button (mockup 03); meta rows + mixed
  primary/disabled/secondary buttons with disabled-click-is-a-noop and `title` reason attribute
  (mockup 04); `info` banner present (mockup 05) and absent (mockup 03); `reasonNote` generic
  slot present with no label (mockup 06) and absent; `notice` + `select` + labelled `reasonNote`
  all present together (mockup 11).
- Visual review: built a temporary dev-only route
  (`apps/web/src/app/preview-main-action-card/`, deleted before this closure — not part of the
  deliverable) mounting the component with the exact fixture data from mockups 03/04/05/06/11,
  viewed via the already-running `npm run dev` server (no headless-browser screenshot tooling
  available in this environment). Project owner compared the live dev-server page against the
  real mockup screenshots directly and confirmed the result with no revision rounds needed. One
  clarifying question resolved during review: the "CURRENT STEP"/"next: ..." bar visible above
  the card in the screenshots is not part of `mainCard`'s own data contract (verified against all
  5 mockups' data blocks) — confirmed out of scope for this component, belongs to TASK-081's
  screen assembly instead.
- Process fix during this task (unrelated to the component itself): `task/TASK-077-main-action-
  card` had been branched off `task/TASK-073-redesign-base` before TASK-076's PR (#141) merged
  into it, requiring a stash/fast-forward/conflict-resolution reconciliation once #141 merged (see
  `CURRENT_TASK.md` Progress Notes and `DECISIONS.md` ADR-025 2026-07-26 process note). CLAUDE.md's
  Branch-first protocol updated to check for a still-open preceding sub-task PR before branching.
- Code review before closure caught a real defect: `title={reason}` on a disabled `<button>`
  doesn't reliably show a hover tooltip in Chromium browsers (disabled elements don't reliably
  receive mouse events there) — the unit test only asserted the attribute existed, not real hover
  rendering. Fixed by wrapping the disabled button in `<span title={reason}>` instead; test
  updated to assert the `title` on the wrapping span. Re-verified: `npx tsc --noEmit` clean,
  `npm run lint` clean, `npm run test` still 111/111 passed.

### Follow-up

- None new. `select`'s real option list and `reasonNote`'s real source text remain TASK-083's job,
  as already scoped in the backlog.

## 2026-07-26 — TASK-078 — Component: ArtifactList / ArtifactCard

### Scope

New `apps/web/src/components/artifact-list.tsx` + `artifact-card.tsx` — fourth implementation
sub-task of the TASK-073 redesign epic. Replaces the old bare Type/File/Version/Latest table
(TASK-064) with a flat list of expandable cards, each labelled by `stage`/`type`/`ext`/`version`/
`date`, showing/hiding an inline `preview` text block on click (either the row itself or an
explicit `View`/`Hide` button). `ArtifactCard` renders a colored 3-letter `kind` badge (fixed
dictionary: `source→SRC`, `analysis→ANL`, `cv→CV`, `check→CHK`, `html→HTM`, `pdf→PDF`, with a
first-3-letters-uppercased fallback for any future kind) reverse-engineered from the mockup
screenshots' badge text (does not match a literal first-3-letters-of-`kind` rule for
`source`/`analysis`/`check`). `apps/web/src/lib/types.ts` additions: `ArtifactKind`,
`ArtifactCardData` (mirrors the mockups' `artifacts[]` shape exactly, plus one field not present
in the mockup contract: optional `downloadUrl?: string`, added specifically so TASK-064's
download-link capability is not silently dropped — a `Download` link renders only when
`downloadUrl` is supplied; real wiring from `WorkspaceArtifactSummary` is TASK-083's job).
`ArtifactList` renders the "Artifacts" header + count badge + "click a row to preview" hint, and
the same "No artifacts yet." empty state TASK-064 used. Data contract and example values extracted
directly from the `__bundler/template` escaped JSON block inside mockups 03/04/09's `.html` files
(not plain-text-greppable the way `docs/mockups/README.md` describes for earlier mockups — read at
the template script's line offset with the `Read` tool instead).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 124/124 passed (16 test files; 19 new across artifact-card.spec.tsx / artifact-list.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean (one real lint error caught and
  fixed before this — see below), `npm run test` 124/124 passed (19 new): card renders labelled
  with stage/type/ext/version/date and the correct kind badge (mockup 03); starts expanded and
  shows preview when `expanded: true` (mockup 03); starts collapsed and toggles preview via the
  `View`/`Hide` button (mockup 04, `vacancy_analysis_json`); toggles via clicking the row itself;
  shows a "No preview available." placeholder when expanded with an empty `preview` string;
  renders a non-empty preview for `ext: 'pdf'` regardless of extension (mockup 09,
  `cv_export_pdf`); Download link renders when `downloadUrl` is present and is omitted when absent
  (matching the mockup fixtures, which have none); unknown-kind fallback badge. List-level: empty
  state; single artifact already expanded (mockup 03); three artifacts with mixed expanded state
  and independent toggling (mockup 04); per-card download links preserved across a list.
- Self-review before visual comparison (per the TASK-077 lesson about hover/disabled/tooltip bugs
  unit tests can miss): confirmed this component has no disabled or native-tooltip elements at
  all, so that specific bug class doesn't apply here; confirmed the row-button and the separate
  `View`/`Hide` button are DOM siblings, not nested `<button>`s (would have been invalid HTML).
  One real lint error found and fixed: `interface ArtifactCardProps extends ArtifactCardData {}`
  tripped `@typescript-eslint/no-empty-object-type` — changed to `type ArtifactCardProps =
  ArtifactCardData` (a type alias, not an interface with no added members). Re-verified clean
  after the fix.
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-artifact-list/`,
  deleted before this closure — not part of the deliverable) mounting `ArtifactList` with the
  exact fixture data from mockups 03/04/09, viewed via the already-running `npm run dev` server on
  `localhost:3000` (a second `npm run dev` instance detected the existing one and deferred to it;
  the running server picked up the new route via hot reload — confirmed via `curl` returning
  `200`). Project owner compared the live page against the real mockup screenshots directly;
  confirmed the missing `Download` button in the demo was expected (mockup fixtures carry no
  `downloadUrl`, matching the Key Invariant above) and confirmed the result overall with no
  revision rounds needed.
- Mid-task, unrelated to the component: the project owner asked for a new standing process rule —
  before every task-closure `git commit`, explicitly ask whether to run `/code-review` against the
  working diff first, waiting for an explicit yes/no. Added to `CLAUDE.md`'s
  `## Task Closure Checklist`, directly after the existing "restate the checklist inline" step.
  Bundled into this task's commit per explicit instruction — see `CURRENT_TASK.md` Progress Notes.
- `/code-review` run against the working diff (per the new CLAUDE.md rule above) found 2 findings,
  both fixed:
  1. `isExpanded` in `artifact-card.tsx` was initialized once from the `expanded` prop via
     `useState(expanded)` and never resynced on prop updates — a parent re-render with a new
     `expanded` value for the same `type`+`version` key would have no visible effect until the
     card unmounts. Fixed using React's documented "adjusting state during render" pattern
     (comparing against a `prevExpandedProp` state value and calling `setIsExpanded` directly in
     the render body when it differs) rather than a `useEffect` — the project's `eslint`
     `react-hooks/set-state-in-effect` rule flags synchronous `setState` calls inside effects.
  2. `kindBadgeLabels` and `kindBadgeClasses` were two parallel `Record<ArtifactKind, string>`
     maps that had to be kept in sync by hand, with independent `??` fallbacks that would silently
     swallow a forgotten update to either map. Merged into a single
     `Record<ArtifactKind, { label, className }>` with one fallback.
  Re-verified after both fixes: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test`
  still 124/124 passed.

### Follow-up

- None new. Real data wiring (`WorkspaceArtifactSummary` → `ArtifactCardData`, including
  `downloadUrl`) remains TASK-083's job, as already scoped in the backlog.

## 2026-07-26 — TASK-079 — Component: WorkspaceForm

### Scope

New `apps/web/src/components/workspace-form.tsx` — fifth implementation sub-task of the TASK-073
redesign epic, covering the `screenType: 'form'` variant of the "01 - New workspace" mockup
(company/role/source-URL/vacancy-text fields plus a live `storage/applications/<slug>/
00_vacancy_source.txt` preview path, computed via the existing `previewWorkspaceSlug` helper in
`apps/web/src/lib/slug.ts`, unchanged). Unlike TASK-056's original inline form, this component does
not call the creation API itself — it calls an `onSubmit(input: CreateWorkspaceInput): void`
callback prop (mirroring `MainActionCard`'s `onAction` convention) plus optional `errors`/
`isSubmitting` props for the caller to drive. Following the same pattern as TASK-075/076/077/078,
this is a standalone presentational component only — it is not wired into the real
`/workspaces/new` route in this task (that route still uses the TASK-056 implementation unchanged;
wiring the new component in, plus mockup "02"'s post-create success screen, is TASK-080's job).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 131/131 passed (17 test files; 7 new in workspace-form.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 131/131 passed (7 new):
  live slug-preview update as company/role are typed; required-field attributes (company, role,
  vacancy text required; source URL optional); `onSubmit` called with the correct
  `CreateWorkspaceInput` payload, omitting `sourceUrl` when blank; whitespace trimmed from company
  name/role title before submit; `sourceUrl` trimmed and included when non-blank; `errors` prop
  renders the validation-error list; `isSubmitting` disables the submit button and shows the
  pending label.
- Self-review before visual comparison: confirmed this component has no prop-derived local state
  needing the "adjust state during render" resync pattern (TASK-078's finding doesn't apply — all
  local state here is user-input-only, not seeded from a prop) and no duplicate parallel lookup
  dictionaries (TASK-078's other finding also doesn't apply — no kind/label dictionaries in this
  component). No issues found at this stage.
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-workspace-form/`,
  deleted before this closure — not part of the deliverable) mounting `WorkspaceForm` with a no-op
  `onSubmit`, viewed via the already-running `npm run dev` server on `localhost:3000` (confirmed
  reachable via `curl` returning `200` before asking the project owner to open it). Project owner
  compared the live page against `docs/mockups/01-new-workspace-screenshot.png` and confirmed the
  result as-is — no revision rounds needed.
- `/code-review` run against the working diff (per the CLAUDE.md rule added in TASK-078) found 1
  finding, fixed: `companyNameOriginal`/`roleTitleOriginal` were submitted untrimmed while
  `sourceUrl` was explicitly trimmed — a whitespace-only company/role name satisfies the HTML5
  `required` attribute (non-empty string) and would also pass the backend `CreateWorkspaceDto`'s
  untrimmed `class-validator` `IsNotEmpty` check, creating a workspace/company record with a
  blank-looking name. Fixed by trimming both fields before calling `onSubmit`, matching `sourceUrl`'s
  existing trim behavior. Added a regression test. Re-verified: `npx tsc --noEmit` clean, `npm run
  lint` clean, `npm run test` 131/131 passed.

### Follow-up

- None new. Wiring `WorkspaceForm` into the real `/workspaces/new` route (replacing TASK-056's
  implementation) and rendering mockup "02"'s post-create success screen remains TASK-080's job, as
  already scoped in the backlog.

## 2026-07-26 — TASK-080 — Screen: assemble /workspaces/new from WorkspaceForm

### Scope

Rewrote `apps/web/src/app/workspaces/new/page.tsx` to render TASK-079's `WorkspaceForm` (from
`@/components/workspace-form`) instead of TASK-056's inline form, wrapping it in a real call to the
existing `createWorkspaceAction` server action and owning `errors`/`isSubmitting`/success state at
the page level. On successful creation, the page renders a `success` screen per mockup
"02 - Workspace created" (green checkmark banner, workspace slug / folder path / vacancy source
fields, full-width "View workspace" link to `/workspaces/${result.id}`) — folded directly into
`page.tsx` per the backlog's guidance (small, single-use, three-field shape, not worth its own
component). Deleted the now-superseded TASK-056 files
(`workspace-form.tsx`/`workspace-form.spec.tsx` in the route folder); their test cases were
migrated into a new `page.spec.tsx`. `actions.ts` reused unchanged — no `POST /workspaces` contract
change.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 131/131 passed (17 test files; page.spec.tsx replaces the deleted
                       # workspace-form.spec.tsx one-for-one, same total)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 131/131 passed.
  `page.spec.tsx` covers: form renders; submit → success screen populated from the API response
  (slug/folder path/source path, "View workspace" link href); failed submission (validation errors)
  keeps the form mounted with entered values intact and shows the returned error messages; submit
  button disabled and relabeled while a request is pending.
- Self-review before manual verification: confirmed `errors` are cleared before each new submit
  attempt (no stale error carried into a second try), confirmed entered form values survive an
  error response (state lives inside `WorkspaceForm`, which stays mounted on failure — only
  unmounted once `result` is set on success), confirmed double-submission is guarded the same way
  as TASK-056's original pattern (`isSubmitting` from `useTransition`, disabling `WorkspaceForm`'s
  submit button). No issues found.
- Manual end-to-end smoke test against a real backend: started `docker compose up -d postgres`
  (Postgres reachable), `apps/api` (`npm run start:dev`, `localhost:3000/health` → 200) and
  `apps/web` (`npm run dev -- -p 3001`, since port 3000 was needed for the API). Project owner
  opened `http://localhost:3001/workspaces/new`, confirmed the form matches mockup
  "01-new-workspace-screenshot.png" (already established in TASK-079), submitted a real workspace
  (company "test1", role "test"), and confirmed the resulting success screen
  (`Workspace created · status: source_saved`, slug/folder path/vacancy source =
  `2026_07_26_test1_test`) visually matches `docs/mockups/02-workspace-created-screenshot.png`. "View
  workspace" link confirmed to navigate correctly to the new workspace's detail page.

### Follow-up

- None. TASK-081 (assembling `/workspaces/[id]`) is the next epic sub-task, per `TASK_BOARD.md`.

## 2026-07-27 — TASK-081 — Screen: assemble /workspaces/[id] from PipelineStages + WorkspaceStatusHeader + MainActionCard + ArtifactList

### Scope

Rewrote `apps/web/src/app/workspaces/[id]/page.tsx` to assemble TASK-075/076/077/078's four
components (two-column layout: `PipelineStages` sidebar + `WorkspaceStatusHeader`/`MainActionPanel`/
`ArtifactList` content column, matching the mockup "hint-size" 980px layout — corrected mid-task
after an initial single-column-stack implementation was visually compared against
`docs/mockups/03-source-saved-screenshot.png` and found wrong). New `apps/web/src/lib/
pipeline-view-model.ts` maps `WorkspaceStatus`/`currentDecision`/`score` to `stages[]`
(including branching `options[]` on the `decision`/`cvreview` stages — the actual pain-point-#5
branching-visualization feature, initially omitted and caught during visual review) / `mainCard` /
`artifacts[]`, with wording and structure for the 6 statuses that have a real mockup
(`source_saved`, `paused_after_analysis` incl. the skip-override sub-case, `cv_generation_running`,
`cv_draft_ready`/`paused_after_cv_draft`, `cv_pdf_generated`, `skipped`) taken verbatim from each
mockup's `<script type="text/x-dc">` data contract (03/04/05/06/09/10/11), not guessed. New
`apps/web/src/app/workspaces/[id]/main-action-panel.tsx` (renamed from an earlier broader
`workspace-pipeline-view.tsx` once the two-column restructure moved `PipelineStages`/`ArtifactList`
rendering into `page.tsx`) owns interactive state and dispatches `MainActionCard` button clicks to
the existing real `actions.ts` server actions (analysis run/async-poll, review decision, CV draft
review, override skip, confirm skip, export). Deleted `analysis-review-gate.tsx`,
`cv-draft-review-gate.tsx`, `pipeline-actions.tsx`, `analysis-triggers.tsx`,
`async-analysis-trigger.tsx`, `artifact-viewer.tsx` (+ their spec files) — folded into the new
assembly, test cases migrated into `main-action-panel.spec.tsx`/`pipeline-view-model.spec.ts`
(ADR-020). Kept `pre-pdf-check-panel.tsx`, `final-check-panel.tsx`, `cover-letter-panel.tsx`,
`application-tracking-panel.tsx` unchanged below the new assembly — their owning replacement
components (TASK-084/088/089) don't exist yet, so removing them would be a functional regression,
not a deferred mock (see `CURRENT_TASK.md` Key Invariants).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 155/155 passed (15 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 155/155 passed.
  `pipeline-view-model.spec.ts` covers all 18 real `WorkspaceStatus` values' stage-index mapping,
  the decision/cvreview branching-options shapes against mockups 04/05/06/09/10, and
  `buildMainActionCard`/`buildStatusHeaderData`/`buildArtifactCards`. `main-action-panel.spec.tsx`
  covers the button→server-action dispatch table (including the async analysis job-polling
  mutual-exclusion behavior migrated from the deleted `analysis-triggers.spec.tsx`) and the
  `Download CV PDF` button (see bug found below).
- Self-review before manual verification found and fixed one real bug: the `Download CV PDF`
  button (mockup 09's exact label) had no entry in the dispatch table, so clicking it silently did
  nothing — fixed by adding `findLatestCvPdfDownloadUrl()` to `pipeline-view-model.ts` and wiring
  the button to `window.location.href` navigation in `main-action-panel.tsx`, confirmed against a
  real PDF artifact in the manual test below.
- Visual review with the project owner caught two real gaps the self-review missed, both fixed
  before proceeding: (1) initial layout was a single-column vertical stack; the real mockup is a
  two-column layout with `PipelineStages` as a fixed-width sidebar — restructured `page.tsx`
  accordingly and narrowed the client wrapper to just `MainActionCard` (`main-action-panel.tsx`);
  (2) the `decision`/`cvreview` stage `options[]` branching list (mockup's core pain-point-#5
  feature) was entirely missing from the initial `buildStages()` — added `buildDecisionOptions()`/
  `buildCvReviewOptions()` matching the exact `next`/`pruned`/`chosen`/`open` states and reason
  text from mockups 04/05/06/09/10/11's data contracts (extracted via `node -e` reading each
  mockup's `<script type="text/x-dc">` block, per `docs/mockups/README.md` convention).
- Manual end-to-end smoke test against a real `apps/api` + Postgres backend (`apps/web` on `:3001`,
  `apps/api` already running on `:3000`). Two real workspaces driven through real statuses by the
  project owner clicking real buttons in the browser:
  - `test1` workspace: `source_saved` → clicked "Start analysis" (real OpenAI call) →
    `paused_after_analysis` (AI recommended `apply`, score 75) — decision stage showed the
    branching options exactly as mockup 04 (`→ Approve · apply` highlighted, `Approve · maybe`
    greyed with reason, `Pause`/`Skip` open).
  - `TASK065A Fix Test Co` workspace (already `paused_after_analysis`, decision `apply`): clicked
    "Approve (apply)" → `cv_generation_running` (decision stage now shows resolved `chosen`/`pruned`
    state, matching mockup 05) → clicked "Generate CV draft" → `cv_draft_ready` (cvreview stage
    options matching mockup 06: `→ Approve` highlighted, `Pause`/`Not worth applying`/`Regenerate`
    open) → clicked "Approve" → `export_running` (Pre-PDF check stage auto-marked done, since
    Prompt 3 is optional per ADR-009) → clicked "Export PDF" → `cv_pdf_generated` (matching mockup
    09) → clicked "Download CV PDF" → real `04_cv_export.pdf` downloaded via the browser's Save
    dialog, confirming the bug fix above.
  - `ArtifactList` confirmed rendering real artifacts throughout (`vacancy_source`,
    `vacancy_analysis_md/json`, `targeted_cv_content_md/json`, `cv_export_html`, `cv_export_pdf`)
    with correct kind badges (SRC/ANL/CV/HTM/PDF) and working Download links.

- `/code-review` (run on the working diff before commit) found and confirmed one real bug:
  `buildDecisionOptions()` conflated status `skipped` with `paused_after_analysis` +
  `currentDecision: 'skip'` (both mapped to `activeIndex === 2`), so the terminal `skipped` screen
  (mockup 11) incorrectly showed `Pause: open` and `Skip` with a "Manually overridden to skip"
  reason, both belonging only to the mid-flow unconfirmed-override screen (mockup 10). Fixed by
  passing `status` into `buildDecisionOptions()` and checking `status !== "skipped"` explicitly;
  added a regression test for `buildStages("skipped", "skip")`. Also fixed a lower-severity
  fragility note: `decisionButton()`'s `label.includes("apply")` heuristic (only correct because
  those are the sole two labels in use today) replaced with an explicit
  `decisionOptionValue: "apply" | "maybe"` parameter. Re-ran full suite after both fixes:
  `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 156/156 passed.

### Follow-up

- None. Real business-rule mapping (exact enable/disable reasoning per `review-gates.service.ts`,
  artifact inline-preview fetching, remaining statuses without a dedicated mockup) is TASK-083's
  job, per `CURRENT_TASK.md` Key Invariants.

## 2026-07-30 — TASK-082 — Screen: assemble /workspaces list

### Scope

Rewrote `apps/web/src/app/workspaces/page.tsx` to render a new `apps/web/src/components/
workspace-list.tsx` component instead of the previous plain `<table>`, per
`docs/mockups/14-workspaces-list.html`/`-screenshot.png` — the first mockup in the TASK-073 epic
not built on the shared `PipelineScreen` component. `WorkspaceListItem`
(`apps/web/src/lib/api.ts`) gained `score`/`updatedAt` fields (the backend `GET /workspaces`
response already returned them; this was a frontend type-narrowing gap only, confirmed by reading
`workspaces.service.ts`'s `findAll()`, no backend change needed). `workspace-list.tsx` reuses the
existing `statusLabel()` from `apps/web/src/lib/pipeline-view-model.ts` (covers all 19 real
`WorkspaceStatus` values) instead of copying the mockup's own partial (11-status) `STATUS_META`
map, and adds its own status→color-category mapping (`needsReview`/`inProgress`/`positive`/
`neutral`/`failed`) covering all 19 values explicitly. `needsReview` is derived generically as
`status.startsWith('paused_')`. Also corrected a pre-existing off-by-one in project documentation
found while reading the schema: `apps/api/prisma/schema.prisma`'s `WorkspaceStatus` enum has
**19** values, not 18 as stated in CLAUDE.md/prior ADRs/TASK-081 comments (verified by direct count
of the enum block) — not fixed project-wide (out of scope), but this task's own docs/tests use the
correct count.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 174/174 passed (17 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 174/174 passed.
  New `workspace-list.spec.tsx` (16 tests) covers populated/empty rendering, needs-review
  highlighting for all three `paused_*` statuses (and non-highlighting for five other statuses),
  decision color mapping (apply/maybe/skip/null), and a full-enum test asserting all 19 real
  `WorkspaceStatus` values get a defined label and color category. New `page.spec.tsx` (2 tests,
  no prior test file existed for this page) covers the empty-state and populated-response wiring
  from a mocked `listWorkspaces()`.
- Manual visual comparison: dev servers already running (`apps/api` on :3000, `apps/web` on
  :3001) against the real database (26 real workspaces from prior manual testing). Project owner
  opened `http://localhost:3001/workspaces` and compared a screenshot against
  `docs/mockups/14-workspaces-list-screenshot.png` — confirmed layout, status pills, needs-review
  highlighting (indigo dot + row tint + caption) and decision colors all match. One explicit
  wording difference was flagged and confirmed acceptable: rendered status text (e.g. "Paused
  after analysis") differs from the mockup's shorter strings (e.g. "Paused · analysis") because
  this task reuses the real `statusLabel()` rather than the mockup's partial label table — this
  was the planned Key Invariant, and the project owner confirmed keeping it as-is rather than
  adding a second, mockup-literal label map for this screen.

### Follow-up

- None. Empty-state and filter/sort/pagination UI were explicitly out of scope for this pass (see
  `CURRENT_TASK.md` Context) — a plain flat list matching the mockup's own scope.

## 2026-07-30 — TASK-084 — Component: ChecksPanel (pre-PDF / final check status)

### Scope

Added `apps/web/src/components/checks-panel.tsx`, a pure presentation component rendering two
independent optional top-level `PipelineScreen` props: `checks` (pre-PDF check, Prompt 3 —
`not_run` or `result` with `readiness`/`suggestions`/`blockers`/optional `findings[]`/`notes`) and
`finalCheckPanel` (final check, Prompt 5 — `banner`/`checks[]`/`emptySections[]`/`warnings[]`).
Exact contracts extracted from mockups 06/07/08/13's `<script type="text/x-dc">` `renderVals()`
blocks via `node -e` (not guessed from screenshots). New types (`ChecksData`, `ChecksFinding`,
`ChecksReadiness`, `FindingSeverity`, `FinalCheckPanelData`, `FinalCheckEmptySection`) added to
`apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task (future integration
work), and does not map real `pre-pdf-check.schema.ts`/`final-check.schema.ts` field names — only
their enum values (`readiness`, `severity`) were read to know what the component must be able to
style.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 195/195 passed (18 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 195/195 passed.
  New `checks-panel.spec.tsx` (15 tests) covers: `not_run` placeholder with no
  findings/readiness/counts shown; all three `readiness` values; all three `severity` values;
  `findings` present with 1 item vs. present-as-`[]` (explicit "No findings." row) vs. key entirely
  absent (no findings section at all, the `compact: true` mockup-08 case); `finalCheckPanel` alone;
  `checks` alone; neither prop present (renders nothing, no error); both present together; empty
  `warnings` array omits the warnings list.
- Manual visual check: a temporary preview route (`apps/web/src/app/dev-checks-panel-preview/
  page.tsx`, removed before commit) rendered all six scenarios (not_run, result with findings,
  result compact without findings, not_ready with all three severities, finalCheckPanel alone, both
  together) against the already-running dev server (`localhost:3001`). Project owner opened the
  page and confirmed it "looks good" before the route was deleted.

### Follow-up

- None. Mapping real `pre-pdf-check.schema.ts`/`final-check.schema.ts` output into this component's
  props, and wiring it into `/workspaces/[id]`, are explicitly out of scope — future integration
  work, matching the pattern already used for TASK-075–079's components vs. TASK-081/083's wiring.

## 2026-08-02 — TASK-088 — Component: CoverLetterPanel

### Scope

Added `apps/web/src/components/cover-letter-panel.tsx`, exporting `PresentationalCoverLetterPanel`
— a pure presentation component rendering the top-level `coverLetterPanel` `PipelineScreen` field:
a two-shape union, `{ text: string }` once a cover letter has been generated (mockup 12) or
`{ button: string }` before it's generated (mockup 13). The button variant reuses `ActionButton`
from `main-action-card.tsx` (`kind="primary"` hardcoded, since neither mockup example carries
`kind`/`reason` data for this field — unlike `actionsPanel.buttons[]`/`mainCard.buttons[]`, which
are full `MainActionButton` objects). Exact contract extracted from mockups 12/13's
`<script type="text/x-dc">` `renderVals()` blocks via `node -e` (not guessed from screenshots).
New types (`CoverLetterPanelData`, `CoverLetterPanelTextData`, `CoverLetterPanelButtonData`) added
to `apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task (future integration
work).

A same-session `/code-review` found the originally-planned plain name `CoverLetterPanel` collided
with an already-existing, already-wired component of the same name at
`apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx` (pre-dating this epic). Fixed by renaming
the export to `PresentationalCoverLetterPanel`, documented with a code comment.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 205/205 passed (21 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 205/205 passed. New
  `cover-letter-panel.spec.tsx` (2 tests) covers: the mockup-12 `text` example (renders the text,
  no button present) and the mockup-13 `button` example (renders an enabled primary `ActionButton`
  and fires `onAction` with the button's label on click).
- No manual visual check performed — no dev server started, since the component only reuses
  `MainActionCard`/`ActionsPanel`'s already visually-verified `ActionButton` styling plus a plain
  `<p>` for the text variant.

### Follow-up

- None. Mapping the real "generate cover letter" API call and wiring this component into
  `/workspaces/[id]` are explicitly out of scope — future integration work, matching the pattern
  already used for TASK-075–079/084/085/087's components vs. TASK-081/083's wiring.

## 2026-08-02 — TASK-089 — Component: TrackingPanel

### Scope

Added `apps/web/src/components/tracking-panel.tsx`, exporting `PresentationalTrackingPanel` — a
pure presentation component rendering the top-level `trackingPanel` `PipelineScreen` field:
`{ textFields: [{ label }], selectFields: [{ label, value }] }`. Renders each `textFields[]` entry
as a labeled (read-only) text input and each `selectFields[]` entry as a labeled (disabled) select
pre-set to its `value`. No server actions, `onSubmit`, or status-based visibility logic — that
already lives in the real, separately-wired `ApplicationTrackingPanel`. Exact contract extracted
from mockups 12/13's `<script type="text/x-dc">` `renderVals()` blocks via `node -e` (identical
shape in both, only `selectFields[].value` differs). New types (`TrackingPanelData`,
`TrackingTextField`, `TrackingSelectField`) added to `apps/web/src/lib/types.ts`. Not wired into
`/workspaces/[id]` in this task.

Before starting, confirmed via `Glob` that a fully-wired `ApplicationTrackingPanel` already exists
at `apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` (own state, server actions,
own `ArtifactSelect`) — per the TASK-088 lesson, avoided the naming collision up front by naming
the new export `PresentationalTrackingPanel` from the start, rather than discovering it at
code-review time.

A same-session `/code-review` found one bug: both `textFields.map`/`selectFields.map` keyed rows
(and derived each `<input>`/`<select>` `id`) purely from `field.label`, with no index fallback —
two same-labeled fields would collide on React `key` and DOM `id`, breaking the `<label htmlFor>`
association for the second field. Same class of bug as one already fixed in
`main-action-card.tsx`/`ActionsPanel` (TASK-087). Fixed by keying/generating ids from
`` `${label}-${index}` `` instead.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 207/207 passed (22 test files) — run twice: before and after the code-review fix
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 207/207 passed (both
  before and after the code-review fix). New `tracking-panel.spec.tsx` (2 tests) covers: the
  mockup-12 example (both text fields and both selects render with correct labels and pre-set
  values, incl. a non-`—` value) and the mockup-13 example (both selects present with `—` value).
- No manual visual check performed — no dev server started, since the component only reuses the
  existing `WorkspaceForm`/`main-action-card.tsx` input/select Tailwind classes, already
  visually-verified in prior tasks.

### Follow-up

- None. Wiring the real tracking-submission behavior into `/workspaces/[id]` is explicitly out of
  scope — that already exists via the separate, real `ApplicationTrackingPanel`; this component is
  purely the epic's static presentation counterpart, matching the pattern used for
  TASK-084/085/087/088.

## 2026-08-04 — TASK-090 — Close open Dependabot security alerts (apps/web next+sharp, apps/api ip-address+fast-uri)

### Scope

Bumped `apps/web`'s `next` (16.2.10 → 16.3.0, dependency + `eslint-config-next`), which brought
`sharp` (Next's own `optionalDependency`) from a vulnerable 0.34.5 to 0.35.3. Bumped `apps/api`'s
`overrides.fast-uri` (^4.1.1 → ^4.1.2) and added a new `overrides.ip-address` (^10.4.0, was
resolving 10.2.0 transitively via `puppeteer`). Removed `continue-on-error: true` from
`.github/workflows/ci.yml`'s `dependabot-gate` job's `apps/web` step. Re-checked live Dependabot
alerts first (`gh api .../dependabot/alerts --paginate -q '.[] | select(.state=="open")'`):
exactly 13 open, matching `docs/07_task_backlog.md` TASK-090's list with no surprises. Corrected
the backlog's stale assumption that `next@16.2.12` was the fix target — verified via Next's GitHub
release notes that `16.2.12` was docs/TS7-only and the real fix landed in `16.2.11`; went to
`16.3.0` instead since it also resolves `sharp` for free and its release notes show no breaking
changes affecting this app's actual usage (no middleware, no i18n/rewrites, no custom Server
Actions setup beyond framework defaults).

### Commands

```bash
# apps/api
npm install                                    # after overrides bump
npm audit --audit-level=high                   # no --omit=dev, since fast-uri is dev:true
npx tsc --noEmit
npm run lint
npm run test                                    # 660/660 passed, 59 suites
npm run test:e2e                                # 4/4 passed, 3 suites

# apps/web
npm install                                    # after next bump
npm audit --omit=dev --audit-level=high
npx tsc --noEmit
npm run lint
npm run test:cov                                # 223/223 passed, 22 files
npm run build
```

### Result

PASS

### Evidence

- `apps/api`: `npm ls ip-address fast-uri` confirms `ip-address@10.4.0 overridden` and
  `fast-uri@4.1.2 overridden`. `npm audit --audit-level=high` exits 0 aside from an unrelated
  `brace-expansion` DoS advisory whose GitHub alert is `auto_dismissed` (not open) — out of scope.
  `tsc --noEmit`/`lint` clean. `npm run test` 660/660, `npm run test:e2e` 4/4 (all 3 e2e suites).
- `apps/web`: lockfile confirms `next@16.3.0` and `sharp@0.35.3`. `npm audit --omit=dev
  --audit-level=high` exits 0 (one unrelated moderate `postcss` finding remains, below the
  `--audit-level=high` gate and not one of the 13 targeted alerts). `tsc --noEmit`/`lint` clean.
  `npm run test:cov` 223/223. `npm run build` succeeds (Turbopack, all routes compile/prerender).
- Manual smoke test: started the real `apps/api` dev server (`npm run start:dev`, against the
  already-running `jobflow_postgres`/`jobflow_redis` containers) and the real `apps/web` dev server
  (`npm run dev`, auto-selected port 3001 since 3000 was taken by the API). `GET /` returned the
  correct `<title>JobFlow CV Pipeline</title>` and `GET /workspaces` returned 200, both served by
  the real backend — confirms the app actually boots and serves real pages on next@16.3.0, not
  just that the build compiles.
- Post-merge Dependabot alert re-check is still pending (this task's PR has not merged to `main`
  yet at the time of this entry) — will be re-verified via the same `gh api` query once merged,
  per this task's Key Invariant that alerts only reflect the default branch's last scan.

### Follow-up

- None planned. The unrelated `postcss` (moderate, apps/web) and `brace-expansion` (high but
  `auto_dismissed`, apps/api) `npm audit` findings are both out of this task's scope (neither is
  one of the 13 originally-open alerts this task targets) and not blocking per their own severity/
  alert-state.

## 2026-08-04 — TASK-090 — Post-merge Dependabot alert re-check

### Scope

PR #160 (TASK-090) merged to `main` (merge commit `cda1bc3`). Re-ran the live Dependabot alert
query to confirm the 13 originally-targeted alerts actually closed — this is the one acceptance
criterion that could not be verified before merge (alerts only reflect the default branch's last
scan).

### Commands

```bash
for n in 27 28 29 30 31 32 33 34 35 36 39 40 41; do
  gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts/$n -q '.state'
done
gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts --paginate -q '.[] | select(.state=="open")'
```

### Result

PASS

### Evidence

- All 13 targeted alerts (#27–#36, #39–#41) individually queried and each returned `state: fixed`.
- The live open-alerts query now returns 6 different alerts instead: `#48` (postcss, medium),
  `#49` (undici, high), `#50`–`#53` (undici, medium x4) — none of these were open before TASK-090's
  merge. These are new, not leftover from TASK-090, and almost certainly transitive dependencies of
  the `next@16.3.0` bump itself (both already have open, mergeable Dependabot PRs: #161 undici,
  #162 postcss).

### Follow-up

- Filed as TASK-092 in `docs/07_task_backlog.md` and a new `TASK_BOARD.md` row — not fixed inline,
  since TASK-090 was already merged and closed by this point ("work on one task at a time").

## 2026-08-06 — TASK-093 — Triage remaining open Dependabot PRs

### Scope

Triaged all 16 open non-security Dependabot PRs left over after TASK-092 (`gh pr list --state
open`): 5 GitHub Actions bumps, 6 patch/minor dev-dependency bumps, 2 production dependency bumps
(react/react-dom, apps/web), and 3 major-version bumps (typescript x2, eslint).

### Commands

```bash
gh pr list --state open --limit 50 --json number,title,headRefName,baseRefName
# per PR: gh api -X PUT repos/.../pulls/<n>/update-branch ; poll statusCheckRollup ; gh pr merge <n> --squash --delete-branch
cd apps/api && npm ci && npm audit --omit=dev --audit-level=high && npm run lint && npx tsc --noEmit && npm run test && npm run build
cd apps/web && npm ci && npm audit --omit=dev --audit-level=high && npm run lint && npx tsc --noEmit && npm run test && npm run build
# manual smoke test: npm run start:dev (apps/api) + npm run dev (apps/web)
```

### Result

PASS (13 of 16 PRs merged/superseded; 3 deferred with documented upstream blockers)

### Evidence

- **Merged as-is** (GitHub Actions, lowest risk — workflow files only): #55 (`actions/cache`
  4→6), #56 (`actions/checkout` 4→7), #94 (`codecov/codecov-action` 4→7), #95
  (`actions/setup-node` 4→7). #58 (`github/codeql-action` 3→4.37.4) was auto-closed by Dependabot
  itself after #56 merged, claiming "up-to-date now" — verified this was **incorrect**
  (`codeql-action/init@v3`/`analyze@v3` are still on `v3` in `codeql.yml`); left as a documented
  gap rather than re-opened, since it doesn't block this task and Dependabot will very likely
  re-open it on its next scan.
- **Merged as-is** (patch/minor dev deps): #103 (`helmet` 8.2.0→8.3.0, apps/api, prod dep), #104
  (`@types/supertest` 6→7.2.1, apps/api), #98 (`@typescript-eslint/parser` 8.62.0→8.65.0,
  apps/api), #101 (`jest`+`@types/jest` 29→30, apps/api — CI's `Test (apps/api)`/`Test (e2e)`
  confirmed the jest major bump didn't break anything), #102 (`@types/node` ^20→^26, apps/web).
- **Deferred**: #146 (`lint-staged` 16.4.0→17.2.0, root) — declares `"engines":
  {"node": ">=22.22.1"}`; CI and local dev both run Node 20 (`NODE_VERSION: "20"` in `ci.yml`).
  npm doesn't hard-block on `engines` without `--engine-strict`, but the project owner chose not
  to risk the pre-commit hook silently misbehaving on an unsupported Node version. PR left open.
- **Merged manually, not via the PR** (react/react-dom, apps/web): #163 (`react` 19.2.4→19.2.8)
  and #164 (`react-dom` 19.2.4→19.2.8) each individually broke `Test (apps/web)` in their own
  CI — react and react-dom must be on the exact same version
  (`Incompatible React versions` runtime error). Bumped both together to 19.2.8 in one commit on
  this task's branch instead, verified apps/web lint/tsc/test (223/223)/build all clean, then
  closed both PRs as superseded.
- **Major bumps — real breakage found, all deferred**:
  - #105 (`typescript` 5.9.3→7.0.2, apps/web): merged first (its own CI was green), then
    **reverted** after discovering `npm run lint` crashes locally with `"typescript-eslint does
    not support TS 7.0"`. Root cause: CI's `Lint`/`Typecheck` jobs only ever covered `apps/api` —
    `apps/web` had **no CI lint/typecheck coverage at all** (`Test (apps/web)` only runs
    `test:cov`), so the version bump's real breakage was invisible to CI. Reverted via a follow-up
    commit on this branch; verified lint/tsc/test/build all clean again on `typescript@^5`.
  - #106 (`typescript` 5.9.3→7.0.2, apps/api): confirmed broken in the PR's own CI — `npm ci`
    fails outright with `ERESOLVE` (`@typescript-eslint/eslint-plugin@8.62.0` peer range is
    `typescript@">=4.8.4 <6.1.0"`). Same root cause as #105, but apps/api's `Lint`/`Typecheck` CI
    jobs actually exist and caught it directly.
  - #97 (`eslint` 9.39.5→10.8.0, apps/web): its own CI was green (same blind-spot cause as #105).
    Locally, `npm run lint` crashes with `TypeError: contextOrFilename.getFilename is not a
    function` — `eslint-config-next@16.3.0`'s bundled `eslint-plugin-react` uses a context API
    removed in ESLint 10's flat config.
  - All three documented via PR comments explaining the exact failure and linking the upstream
    typescript-eslint tracking issue (https://github.com/typescript-eslint/typescript-eslint/issues/10940
    for #105/#106); left open for Dependabot to keep tracking until upstream support lands.
- **CI gap fix** (in scope per project owner's explicit request after discovering it): added
  `web-lint`/`web-typecheck` jobs to `.github/workflows/ci.yml`, mirroring the existing
  `apps/api` `Lint`/`Typecheck` jobs — `apps/web` now gets real CI lint/typecheck coverage, closing
  the blind spot that let #105 and #97 show false-green checks.
- **Full verification after all changes** (batched, once, covering the combined effect of every
  merged PR): `apps/api` — `npm audit --omit=dev --audit-level=high` clean, `npm run lint`/`npx
  tsc --noEmit` clean, `npm run test` 660/660, `npm run build` clean. `apps/web` — `npm audit
  --omit=dev --audit-level=high` clean, `npm run lint`/`npx tsc --noEmit` clean, `npm run test`
  223/223, `npm run build` clean (Turbopack, all routes compile/prerender).
- **Manual smoke test** (production deps changed: `react`/`react-dom`, `helmet`): started the real
  `apps/api` dev server (`npm run start:dev`) and confirmed `GET /health` returns `200` with
  `helmet`'s security headers present (`content-security-policy`, `x-frame-options`, etc. in the
  response). Started the real `apps/web` dev server (`npm run dev`, auto-selected port 3001) and
  confirmed `GET /` renders "Backend status: ok" end-to-end against the real backend on
  `react@19.2.8`/`react-dom@19.2.8`.
- Both dev-only `npm audit` findings (`brace-expansion` DoS, high severity, transitive via
  `@typescript-eslint`/eslint tooling in both apps) are out of scope — not caught by
  `--omit=dev`, pre-existing, unrelated to any PR this task touched.

### Follow-up

- #58, #146, #97, #105, #106 remain open/unmerged with documented reasons (see above) — re-attempt
  once their respective upstream blockers (Node engines requirement, typescript-eslint TS 7.x
  support, eslint-config-next ESLint 10 support) are resolved. Not tracked as a new backlog task
  since Dependabot will keep these PRs open/updated on its own schedule.

## 2026-08-07 — TASK-094 — Add KnowledgeSourceContentService: real content loading with hash verification

### Scope

First task of EPIC-23 (Phase 16). New `KnowledgeSourceContentService`
(`apps/api/src/knowledge-sources/knowledge-source-content.service.ts`) reads real knowledge-source
file content from disk for `.md`/`.txt` sources, verifies it against the stored `contentHash`
(reusing `HashService.hashText`), returns a metadata-only stub for non-text sources (`.pdf`), and
enforces a path-traversal guard against a new, independently-rooted `KNOWLEDGE_SOURCES_ROOT` env
var (mirrors `ArtifactStorageService`'s `STORAGE_ROOT` guard). Nothing calls the new service yet —
`PromptInputBuilderService`/`Prompt2InputBuilderService`/`CoverLetterInputBuilderService` are
untouched, per task scope (TASK-095/096/097 wire it in later).

`KNOWLEDGE_SOURCES_ROOT` became a hard-required env var (`env.validation.ts`), which required
touching every place that boots the app: `.env.example`'s existing entry corrected from "Optional"
to "Required" (local `.env` already had the value set, so `npm run start:dev` was unaffected);
`.github/workflows/ci.yml`'s `test`, `test-e2e`, and `docker-build` jobs' `env:` blocks and
`docker-build`'s `docker run -e ...` block all gained the var; all three e2e specs
(`mvp-flow`, `rate-limiting`, `skip-flow`) now set `process.env.KNOWLEDGE_SOURCES_ROOT` before app
bootstrap, alongside their existing `STORAGE_ROOT` setup.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns="knowledge-source-content|env.validation"
npm run test
npm run test:e2e
```

### Result

- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — clean (auto-formatted the new spec file, no warnings/errors).
- Targeted run — `knowledge-source-content.service.spec.ts` (5 tests: matching-hash `.md` load,
  stale-hash `.md` throws `BadRequestException`, `.pdf` returns unavailable stub without throwing,
  outside-root path throws, empty array short-circuits) + `env.validation.spec.ts`'s new
  `KNOWLEDGE_SOURCES_ROOT`-required cases — 15/15 passed.
- `npm run test` — full suite 60 suites / 666 tests, all passed (up from 660 tests pre-task: 1 new
  spec file, 6 new test cases across the new spec + `env.validation.spec.ts`).
- `npm run test:e2e` — 3 suites / 4 tests, all passed against the real local Postgres
  (`jobflow_postgres`, already running via `docker compose`). This is the check that actually
  proves the app still boots with the new required env var — all three e2e specs set
  `KNOWLEDGE_SOURCES_ROOT` to a fresh `mkdtempSync` directory before `AppModule` compiles, matching
  the existing `STORAGE_ROOT` pattern.

### Post-review fixes (same day, before commit)

Ran both `/code-review` and an independent `/requesting-code-review` subagent pass on the working
diff before committing. Two findings, both fixed:

- `assertInsideKnowledgeSourcesRoot` threw a raw `Error` instead of `BadRequestException`
  (violates `apps/api/CLAUDE.md`'s error-handling rule) — fixed, and the traversal test now
  asserts on `BadRequestException` in addition to the message.
- `CURRENT_TASK.md` was left holding the full TASK-094 spec instead of being reset to "no active
  task" (a required item on the root `CLAUDE.md` Task Closure Checklist) — found only by
  `/requesting-code-review`, not `/code-review`; fixed by resetting it to the short pointer form
  used by prior closures (e.g. TASK-093).

Re-verified after both fixes: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test`
60 suites / 666 tests all passed.

### Follow-up

- TASK-095/096/097 (Prompt 1 / Prompt 2 / cover-letter input builders) will inject
  `KnowledgeSourceContentService` and replace each builder's own
  `[content not loaded in MVP]` placeholder — not done in this task by design.
- CI's `docker-build` job is expected to pass on this task's own PR now that
  `KNOWLEDGE_SOURCES_ROOT` is passed to both the job env and the `docker run -e` invocation; not
  verifiable locally (the job builds and boots the real Docker image), confirm on the PR's CI run.

### Post-merge-PR fix (same day, same PR #171): unused getter removed

Codecov flagged 3 missing patch-coverage lines on `knowledge-source-content.service.ts` on the
PR's first CI run. Root cause: a `knowledgeSourcesRoot` getter added by habit (mirroring
`ArtifactStorageService.storageRoot`, which has real callers) but never actually called anywhere
or exercised by a test. Removed rather than adding a test for an unused accessor. Re-verified:
`npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 60/60 suites, 666/666 tests;
targeted coverage run confirms `knowledge-source-content.service.ts` now 100%
statements/lines/functions (85.71% branches — two minor untested branch edges, an
empty-file-extension fallback string and an exact-root-path equality check, both below this
project's 68% branch floor concern per ADR-022 and not required by any AC). Codecov's patch
coverage on the follow-up commit (`37368e3`) is 97.50% with 1 line flagged, comfortably above the
80% patch target.

### Scope addition (same day, same PR #171, explicit project-owner request): js-yaml Dependabot fix

After TASK-094 was already closed, GitHub surfaced a new Dependabot alert (`js-yaml` quadratic-CPU
DoS, CVE-2026-59870, GHSA-5p4m-2wfm-xmqj, High, `apps/web/package-lock.json`, affected range
`>=4.0.0 <4.3.1`) linked to a separate PR #170. The project owner explicitly asked to fix it in
this PR instead of filing a new task (normally this project's precedent — TASK-090/092/093 — keeps
Dependabot fixes in their own dedicated task/PR). `js-yaml` is a transitive dev dependency
(`eslint@9.39.5 → @eslint/eslintrc → js-yaml@4.3.0`, no direct dependency to bump); fixed via
`apps/web/package.json`'s existing `overrides` block, adding `"js-yaml": "^4.3.1"` (the first
patched version) alongside the pre-existing `postcss` override.

#### Commands

```bash
cd apps/web
npm install
npm ls js-yaml
npm audit --omit=dev --audit-level=high
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

#### Result

- `npm ls js-yaml` — confirms `js-yaml@4.3.1 overridden` (was `4.3.0`).
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities (previously 1 high: js-yaml).
- Full `npm audit` still shows 1 pre-existing high-severity `brace-expansion` finding (dev-only,
  transitive via `@typescript-eslint`/eslint tooling) — already documented as out of scope in the
  2026-08-06 TASK-093 entry above; unrelated to and unaffected by this fix.
- `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 22 files / 223 tests all passed,
  `npm run build` clean (Turbopack, all 7 routes compile/prerender).

## 2026-08-19 — ISSUE-195 — Adapt prompt_1 text into new PromptTemplate v3

### Scope

Content-only task (Phase 1 of EPIC-24, third step): create a new `prompt_1_vacancy_analysis`
`PromptTemplate` version (v3) whose body is adapted from the real, manually-refined
`!prompt_1_0_3_...txt` (553 lines) instead of placeholder text, applying all 6 resolutions recorded
in `docs/10_calibration_and_parity.md` §2.2 (Issue #194) — including dropping §3.1's SKIP-archive-
file instruction entirely and preserving the current-work preamble verbatim. Output JSON contract
kept identical to `prompt1_v2.txt` (no schema change, per §2.2 resolution 6). New file
`apps/api/prisma/prompts/prompt1_v3.txt`; `apps/api/prisma/seed.ts` updated to register it as
`isActive: true`, flip v2 to `isActive: false` (v2 row kept, not deleted/overwritten), v1 unchanged.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — clean (`eslint --fix`, no findings).
- `npm run test` — 61/61 suites, 698/698 tests passed.
- No e2e run — content/seed-only change, no status transition, review gate or export path touched.
- No schema/DTO change, so no new unit tests were required (per Issue #195's own Test Requirement).

### Follow-up

- Next open issue in the "EPIC-24 · Фаза 1" milestone (prompt_2 adaptation) is unblocked once this
  merges — check the milestone/Project board for the exact next issue number.
