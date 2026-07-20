# JobFlow CV Pipeline — Task Board

## Purpose

This file is the lightweight Jira replacement for the project.

`docs/07_task_backlog.md` is the source of truth for task content. This file tracks execution state only: status, current focus, dependencies, notes and commits.

## Status Legend

- `TODO` — not started.
- `IN_PROGRESS` — currently being implemented.
- `REVIEW` — implementation done, needs manual review.
- `DONE` — accepted and tested.
- `BLOCKED` — cannot continue until blocker is resolved.
- `SKIPPED` — intentionally not implemented in the current scope.

## Operating Rules

- Work on one task at a time.
- The active task must be copied to `project-management/CURRENT_TASK.md` before Claude Code starts implementation.
- Claude Code must not select a new task automatically.
- Do not mark a task as `DONE` until acceptance criteria and test requirements from `docs/07_task_backlog.md` are satisfied.
- Update `project-management/TEST_LOG.md` for commands, manual checks and persistence verification.
- Update `project-management/CHANGELOG.md` after meaningful completed work.
- Use `BLOCKED` instead of expanding scope when a task cannot be completed safely.

## Current Focus


Active task: none.
Phase 15 (Full Pipeline Control UI) is broken out into TASK-063 through TASK-072 in
`docs/07_task_backlog.md` — covers not just the core `source_saved → cv_pdf_generated` path but
every other pipeline/lifecycle action already implemented on the backend with no UI (Prompt 3/5
checks, cover letter, application tracking/rejection, existing-folder import), plus a final manual
verification pass (TASK-072) against real historical ChatGPT-flow variants the project owner will
supply. No other Phase 16–19 task has been broken down yet (deliberately — written just-in-time
per phase, per CLAUDE.md's task-authoring philosophy).

Recommended next: **TASK-066** (Add Prompt 3 pre-PDF check trigger and results view) — next task
of Phase 15, `apps/web`-only.

Last completed: TASK-065 (Add async/queued analysis trigger with job-status polling to workspace
detail UI) — DONE, branch `task/TASK-065-async-analysis-trigger`. New
`apps/web/src/app/workspaces/[id]/async-analysis-trigger.tsx` — an alternative to
`pipeline-actions.tsx`'s synchronous "Start analysis" button — enqueues via
`POST :id/run-analysis-async` then polls `GET :id/analysis-job/:jobId` every 2s until a terminal
BullMQ state (`completed`/`failed`), showing intermediate states along the way. Self-contained
polling state (`useState`/`useEffect`/`useRef`, interval cleared on unmount and on terminal
state) — no page-level state dependency, matching TASK-063/064's component style. If the enqueue
call itself fails (e.g. `REDIS_URL` not configured — confirmed via reading `queue.service.ts` that
`getQueue()` throws synchronously via `configService.getOrThrow`), the error surfaces immediately
with no polling ever starting. New `lib/api.ts` functions `runAnalysisAsync`/
`getAnalysisJobStatus` and `actions.ts` Server Actions `runAnalysisAsyncAction`/
`getAnalysisJobStatusAction`, following the exact existing pattern. `apps/web`-only, no backend
changes (both endpoints pre-existed from TASK-054). New `async-analysis-trigger.spec.tsx` (5
tests, fake timers) covers not-rendered-outside-`source_saved`, the full
waiting→active→completed sequence with `router.refresh()` and polling stopping, the `failed`
terminal case, the enqueue-failure case (zero status polls), and interval cleanup on unmount;
49/49 `apps/web` tests pass (5 new). `npx tsc --noEmit`/`npm run lint`/`npm run build` all clean.
Manually verified against a real backend with real Redis (fake AI provider): enqueue → poll
returned `state: "completed"` with `returnValue.decision`/`workspaceStatus` matching the typed
contract; the new button confirmed server-rendering correctly for a fresh `source_saved`
workspace. Did not exercise the no-`REDIS_URL` path or a live browser click-through (no browser
automation tool available) — covered instead by the component's mocked-action unit tests. See
`project-management/TEST_LOG.md` 2026-07-20 entry for full detail.

Previously: TASK-064A (Fix missing mimeType on vacancy_source artifact registration) — DONE,
branch `task/TASK-064A-fix-vacancy-source-artifact-metadata`. Bug found during TASK-064's manual
smoke test: `workspaces.service.ts`'s `createWorkspace()` registered the `vacancy_source` artifact
without `mimeType`, unlike every other artifact-registration call site (including
`import.service.ts`'s registration of the very same artifact type, which does set it). Fixed by
adding `mimeType: 'text/plain'` to the `register()` call, matching the existing
`LEGACY_ARTIFACT_MIME_TYPES` convention. `downloadFileName` was left null on purpose — that
matches every other non-PDF/non-skip-reason artifact type in the codebase (download already falls
back to `canonicalFileName`). `apps/api`-only. New unit test in `workspaces.service.spec.ts`
asserts `register()` is called with `mimeType: 'text/plain'`; full suite 59/59 suites, 639/639
tests (was 638 before TASK-063A/this task); `npx tsc --noEmit`/`npm run lint` clean; `test:e2e`
3/3 suites, 4/4 tests. Manually verified against a real backend: a freshly created workspace's
`vacancy_source` artifact now returns `"mimeType":"text/plain"` from `GET /workspaces/:id` (was
`null` before the fix). See `project-management/TEST_LOG.md` 2026-07-19 entry for full detail.

Previously: TASK-064 (Add artifact content viewer and generic download links) — DONE, branch
`task/TASK-064-artifact-content-viewer`. New Next.js Route Handler proxy
(`apps/web/src/app/api/artifacts/[id]/download/route.ts`) forwards to the backend's
`GET /artifacts/:id/download` with the server-side `X-API-Key` header, since every backend
endpoint sits behind the global `ApiKeyGuard` and (in Docker) is only reachable from the browser
via an internal hostname — a plain `<a href>` to the backend could not have worked. New
`apps/web/src/app/workspaces/[id]/artifact-viewer.tsx` client component renders a Download link
plus an inline View toggle (text/markdown/json artifacts only) per artifact row, replacing the
old plain table in `page.tsx`. Found and worked around a pre-existing backend data gap during
manual smoke testing (fixed separately by TASK-064A above) rather than fixing it out-of-scope.
44/44 `apps/web` tests pass (5 new); lint/tsc/build all clean; manually verified end-to-end
against a real backend (fake AI provider) — all 3 artifacts of a fresh workspace showed working
View/Download. See `project-management/TEST_LOG.md` 2026-07-19 entry for full command/evidence
detail.

Previously: TASK-063A (Fix swapped/missing downloadFileName on skip-reason artifacts) — DONE,
branch `task/TASK-063A-fix-skip-reason-download-filenames`. Bug found during TASK-063's manual
smoke test: `skip-reason.service.ts`'s `01_skip_reason.md` artifact registration never passed
`downloadFileName` (defaulted to `null`), while `buildDownloadFileName()` — which always built an
`.md`-suffixed name — was wired to the `01_skip_reason.json` registration instead. Fixed by adding
an `extension: 'md' | 'json'` parameter to `buildDownloadFileName()` (default `'md'`, so the
existing call signature/test still works) and passing the correct extension at each registration
site. `apps/api`-only, no frontend change needed. 8/8 unit tests pass (2 new assertions in the
success-path test, 1 new `buildDownloadFileName('json')` case); full suite 59/59 suites, 638/638
tests; `npx tsc --noEmit` clean. Manually verified end-to-end against a real backend (fake AI
provider): `confirm-skip` on a fresh workspace now shows correct, distinct `downloadFileName`
values (`SKIP_<slug>_<slug>_reason_RU.md` / `...json`) in `GET /workspaces/:id`'s artifact list.
See `project-management/TEST_LOG.md` 2026-07-19 entry for full command/evidence detail.

Previously: TASK-063 (Add pipeline step-trigger actions to workspace detail UI) — DONE, branch
`task/TASK-063-pipeline-step-trigger-actions`. New `apps/web/src/app/workspaces/[id]/
pipeline-actions.tsx` wires up `run-analysis`, the first `generate-cv-content`, `export-cv`, and
`confirm-skip` as buttons (previously curl/Swagger-only), following the exact pattern established
by `cv-draft-review-gate.tsx`. New `apps/web/src/lib/api.ts` functions `runAnalysis`/`exportCv`/
`confirmSkip` (all `encodeURIComponent`-safe from the start, matching TASK-057's CodeQL fix). No
`apps/api` changes — all four endpoints pre-existed. New `pipeline-actions.spec.tsx` (Vitest+RTL)
covers each button's visibility, success and error paths. Manually smoke-tested end-to-end against
a real running backend (fake AI provider): one workspace driven `source_saved` →
`cv_pdf_generated` using only the new buttons plus existing review-gate approvals; a second
workspace confirmed the `confirm-skip` path distinct from the existing `override-skip` action. See
`project-management/TEST_LOG.md` 2026-07-18 entry for full command/evidence detail.

Previously: TASK-061 (Add architecture diagram or Mermaid flow) — DONE, branch
`task/TASK-061-architecture-diagram`. Added a new "System architecture" README Mermaid diagram
(Next.js Dashboard → NestJS API → PostgreSQL/Redis-BullMQ/Filesystem/AI Provider, Prompt Pipeline +
Document Export as internal components) — the existing diagram only showed the pipeline data-flow,
not system components (no NestJS API/Redis/Next.js nodes), even though Redis/BullMQ and Next.js are
already real, not future placeholders. Old diagram kept, renamed to "Pipeline flow" (complementary
view). Caption clarifies these are local Docker Compose services, no cloud deployment. Both
diagrams rendered via a Claude Artifact preview before committing.

Recommended next: Phase 14 is now fully closed (TASK-059/060/061 all DONE; TASK-058 was
SKIPPED/superseded). Consider `apps/web` coverage expansion (`lib/api.ts` and the two review-gate
components remain untested from TASK-062) or picking up the next unstarted Phase from
`docs/07_task_backlog.md`.

Previously: TASK-060 (Add README portfolio documentation) — DONE, branch
`task/TASK-060-readme-portfolio-docs`. Backend-first architecture, MVP flow and personal-project
disclaimer were already well covered; added a new "Data & Artifact Model" section explaining the
PostgreSQL metadata chain, filesystem canonical artifacts and `AiRun` token/cost tracking together.
While verifying against real code, found the "Project status" table understated 3 already-
implemented features as "In progress" (Token/cost tracking, Evidence Guard, Deterministic
HTML/PDF export) — corrected all three for portfolio honesty. Manual review against CLAUDE.md's
Anti-Overclaiming Rules found no issues.

Previously: TASK-059 (Add integration tests for database persistence assumptions) — DONE, branch
`task/TASK-059-postgres-persistence-check`. The persistence-verification script/docs already
existed from TASK-005 (2026-06-28, PASS) but `ADR-023`'s later `apps/api/` restructuring broke two
README references to it (stale checklist link, `npm run db:check-persistence` instruction missing
the `cd apps/api` it now needs). Fixed both and re-ran the script for real to reconfirm it still
works — PASS, cleaned up. No new automated Jest/e2e spec added (agreed with user): the scenario
needs to drive `docker compose down`/`up` from outside the test process, which Jest/Vitest can't do
natively, and the backlog's AC explicitly allows "documented/manual or automated".

Previously: TASK-062 (Add unit/component test runner and coverage to apps/web) — DONE, branch
`task/TASK-062-web-test-runner`, PR #112 (merged). Added Vitest + React Testing Library as
`apps/web`'s own independent test stack. `src/lib/slug.spec.ts` (26 tests, mirrors `apps/api`'s
`slug.service.spec.ts` scope) + `workspace-form.spec.tsx` (5 tests). New `web-test` CI job. Coverage
threshold measured (not guessed) at the current baseline (~21% — most of `apps/web` has no tests
yet outside this task's scope) and set as a regression floor per ADR-022's method. Follow-up in the
same PR/branch: renamed the `apps/api` `Test` CI job to `Test (apps/api)` for symmetry with the new
`Test (apps/web)` job, and updated `main`'s branch-protection `required_status_checks` to require
the new name (it was a required check under the old name — renaming without this would have
permanently blocked merges). See `project-management/TEST_LOG.md` 2026-07-18 entry for full
details.

Previously: TASK-057 (Implement workspace review screens) — DONE, branch
`task/TASK-057-workspace-review-screens`. New `apps/web/src/app/workspaces/[id]/page.tsx`
(status/decision/artifacts/next-action) with `AnalysisReviewGate` (approve apply/maybe/pause/skip
+ override-skip form) and `CvDraftReviewGate` (approve/pause/mark-not-worth-applying/regenerate
placeholder) conditionally rendered by workspace status; new `apps/web/src/lib/api.ts` functions
call the pre-existing `apps/api` review-gates endpoints (no backend changes). Added a minimal
`/workspaces` list page (not in the original AC — needed so the detail screens are reachable at
all) plus link wiring from the home page and TASK-056's creation-form success state. Found+fixed a
real bug during the manual smoke test: the new `WorkspaceCompany` type used
`companyNameOriginal`, which doesn't exist on the actual Prisma `Company` model
(`nameOriginal`) — company names silently rendered as `$undefined`. No `apps/web` test runner
exists yet (TASK-062), so verification was a real manual smoke test driving all 3 review-gate
flows plus 404 handling against a real backend, plus lint/tsc/build clean.

Previously: TASK-PH-024 (Block merges on high+ severity CodeQL/Dependabot alerts) — DONE,
PR #109. GitHub Ruleset `require-codeql-high-or-higher` (branch `main`, `code_scanning` rule,
`security_alerts_threshold: high_or_higher`) now actually blocks merges on open High/Critical
CodeQL alerts — the plain `Analyze (javascript-typescript)` status check only reported whether the
job ran, not whether it found anything. New `Dependabot Severity Gate` CI job (required status
check) fails the build on open High/Critical Dependabot alerts; requires a repo secret
`DEPENDABOT_ALERTS_TOKEN` (fine-grained PAT, "Dependabot alerts: Read-only") since `GITHUB_TOKEN`
cannot read that API. Both verified working via a real PR run before being required.

Previously: TASK-PH-023 (Remediate PostCSS XSS Dependabot alert + re-triage stale CodeQL
alerts) — DONE, branch `task/TASK-PH-023-postcss-xss-fix`. `apps/web/package.json` npm
`overrides` pins `postcss` to `^8.5.10` (Next.js 16.2.10 bundled a vulnerable nested copy); 0
Dependabot vulnerabilities remain. Also re-dismissed 6 CodeQL alerts that were re-detections of
already-triaged TASK-PH-014/TASK-046/TASK-047 findings (re-opened by ADR-023's `git mv`, not new
bugs) — 0 open code-scanning alerts remain.

Previously: TASK-056 (Implement workspace creation UI) — DONE, branch
`task/TASK-056-workspace-creation-ui`. New `apps/web/src/app/workspaces/new/` (form + Server
Action calling `POST /workspaces`), `apps/web/src/lib/slug.ts` (client-side slug/file preview
mirroring `apps/api`'s `SlugService`), `apps/web/src/lib/api.ts` `createWorkspace()`. Verified
end-to-end with a real backend and real browser: workspace created (`status: source_saved`),
artifact written to disk, DB rows correct; test data cleaned up afterward. `apps/web` lint/tsc/
build all clean.

Previously: TASK-055 (Bootstrap Next.js dashboard, + restructuring + Docker follow-ups) — DONE,
branch `task/TASK-055-bootstrap-nextjs-dashboard`, three commits.

**Commit 1:** New `apps/web/` — Next.js 16 app (App Router, TypeScript, Tailwind CSS), fully
independent npm project. `apps/web/src/lib/api.ts` (`getHealth()`) calls the backend
`GET /health` via `NEXT_PUBLIC_API_BASE_URL`; home page renders live backend status. No backend
contract changes.

**Commit 2 (same task, user-requested restructuring, see ADR-023):** the backend moved from the
repo root to `apps/api/` — a peer of `apps/web/`, fully self-contained (own
`package.json`/`node_modules`/lockfile/`tsconfig`/`Dockerfile`), fixing the structural asymmetry
of `apps/web` having been nested inside what was, at the time, the backend's own root. The repo
root now holds only shared concerns (`docs/`, `project-management/`, `README.md`, `CLAUDE.md`,
`.github/`, `docker-compose.yml`) plus a minimal `package.json` for `husky`+`lint-staged` (the
pre-commit hook now routes staged files to each app's own local eslint/prettier by path).
`docker-compose.yml` updated to build `./apps/api`; gained its own small root `.env` (Postgres/
Redis/port vars, for Compose's own substitution) separate from `apps/api/.env`'s full app config.
`.github/workflows/ci.yml` gained `working-directory: apps/api` on all backend jobs plus corrected
`hashFiles`/coverage/docker-build paths. `.claude/settings.json` hooks
(`scripts/lint-hook.js`/new `scripts/typecheck-hook.js`) now detect which app an edited file
belongs to. `CLAUDE.md`/`README.md` updated for the new layout. Re-verified after the move: 59/59
suites, 637/637 tests pass; `npm run test:e2e` 3/3 suites, 4/4 tests; `npm run build`/
`npx tsc --noEmit`/`npm run lint` all clean; `docker compose config` resolves cleanly; manual
smoke test (real backend + real frontend from their new locations) confirmed "Backend status: ok"
end-to-end.

**Commit 3 (user-requested, "добавляй сейчас", see ADR-024):** added `apps/web/Dockerfile`
(Next.js `output: "standalone"`, 3-stage `deps`/`builder`/`runner`) and a new `web` service in
`docker-compose.yml` (`depends_on: app`, `${WEB_PORT:-3001}:3000`, `NEXT_PUBLIC_API_BASE_URL`
build arg defaulting to `http://app:3000`). Found and fixed a real bug during verification: the
Next.js standalone server bound to the container's own network IP instead of `0.0.0.0` (it honors
Docker's auto-set `$HOSTNAME` env var) — the host could still reach it by luck (Docker NAT routes
straight to the container's IP:port) but anything inside the container (the `HEALTHCHECK`) could
not. Fixed with an explicit `ENV HOSTNAME="0.0.0.0"`. Re-verified: `docker compose ps` shows `web`
`(healthy)`, `docker exec jobflow_web curl localhost:3000/` succeeds, host page
(`http://localhost:3001`) still renders "Backend status: ok" against the real containerized
backend. `README.md`/`CLAUDE.md` updated with the new Docker commands/topology.

Current phase: `Phase 12 — Redis/BullMQ Async Processing` — DONE (TASK-052/053/054); Phase 13 —
in progress (TASK-055, TASK-056 DONE).

> Per Operating Rules ("Claude Code must not select a new task automatically"), no other task starts until the user explicitly says so.

## Known Gaps (discovered, not yet scheduled)

- None currently open — all findings below were scheduled and resolved the same day they were
  discovered. Generic artifact download endpoint was binary-unsafe — discovered 2026-07-14 during
  TASK-047, resolved 2026-07-14 by TASK-PH-019. Skip-reason artifact `downloadFileName`
  swap/missing bug — discovered 2026-07-19 during TASK-063's manual smoke test, resolved same day
  by TASK-063A. `vacancy_source` artifact missing `mimeType` — discovered 2026-07-19 during
  TASK-064's manual smoke test, resolved same day by TASK-064A.


## Board

| ID | Phase | Title | Status | Priority | Depends on | PR/Commit | Notes |
|---|---|---|---|---|---|---|---|
| TASK-001 | Phase 0 — Project Foundation | Initialize NestJS project structure | DONE | P0 | — | — | Health endpoint test passes, build clean |
| TASK-002 | Phase 0 — Project Foundation | Add project documentation skeleton | DONE | P0 | TASK-001 | — | docs/ present in repo from project start |
| TASK-003 | Phase 0 — Project Foundation | Add CLAUDE.md project rules | DONE | P0 | TASK-002 | — | CLAUDE.md fully written before implementation started |
| TASK-004 | Phase 0 — Project Foundation | Configure Docker Compose with persistent PostgreSQL volume | DONE | P0 | TASK-001 | — | Persistence verified: data survives down+up |
| TASK-005 | Phase 0 — Project Foundation | Add PostgreSQL persistence verification script or checklist | DONE | P0 | TASK-004 | — | Script + checklist verified PASS |
| TASK-006 | Phase 0 — Project Foundation | Add Prisma setup | DONE | P0 | TASK-004 | — | Prisma 5 LTS, DB connection verified |
| TASK-006A | Phase 0 — Project Foundation | Add unit test setup and conventions | DONE | P0 | TASK-002 | — | 3/3 tests pass, mock pattern demonstrated |
| TASK-006B | Phase 0 — Project Foundation | Add P0 unit tests for core MVP logic | DONE | P0 | TASK-006A,TASK-007,TASK-011,TASK-028,TASK-029,TASK-033 | branch task/TASK-006B-p0-unit-tests | 7/8 AC already covered by existing specs; added DynamoDB/MySQL critical patterns + tests to evidence-guard for AC8; 39/39 suites, 347/347 tests pass |
| TASK-007 | Phase 1 — Manual Workspace Creation | Implement company and role slug normalization utility | DONE | P0 | see docs/07_task_backlog.md | — | 25/25 tests pass, Unicode Cyrillic via \p{Script=Cyrillic} |
| TASK-008 | Phase 1 — Manual Workspace Creation | Create Company and JobVacancy Prisma models | DONE | P0 | see docs/07_task_backlog.md | PR #5 | 34/34 tests pass, migration applied |
| TASK-009 | Phase 1 — Manual Workspace Creation | Create ApplicationWorkspace Prisma model | DONE | P0 | see docs/07_task_backlog.md | PR #5 | WorkspaceStatus default source_saved enforced |
| TASK-010 | Phase 1 — Manual Workspace Creation | Implement manual workspace creation DTO validation | DONE | P0 | see docs/07_task_backlog.md | PR #6 | class-validator, empty string rejected |
| TASK-011 | Phase 1 — Manual Workspace Creation | Create workspace folder and canonical vacancy artifact | DONE | P0 | see docs/07_task_backlog.md | PR #6 | ArtifactStorageService, path safety, SHA-256 |
| TASK-012 | Phase 1 — Manual Workspace Creation | Add workspace creation endpoint | DONE | P0 | see docs/07_task_backlog.md | PR #6 | POST /workspaces, 53/53 tests pass |
| TASK-013 | Phase 1 — Manual Workspace Creation | Add workspace list and detail endpoints | DONE | P0 | see docs/07_task_backlog.md | PR #6 | GET /workspaces, GET /workspaces/:id with 404 |
| TASK-014 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create GeneratedArtifact model and registry service | DONE | P0 | see docs/07_task_backlog.md | PR #7 | Migration applied, ArtifactsService + 70/70 tests pass |
| TASK-015 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Implement artifact hashing utility | DONE | P0 | see docs/07_task_backlog.md | PR #7 | HashService SHA-256, Cyrillic, 5 tests |
| TASK-016 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add artifact access endpoints | DONE | P0 | see docs/07_task_backlog.md | PR #7 | GET /workspaces/:id/artifacts, GET /artifacts/:id/download, path safety |
| TASK-017 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create KnowledgeSource model and import service | DONE | P0 | see docs/07_task_backlog.md | PR #8 | Migration applied, importSource+activate/deactivate+findActive, 82/82 tests |
| TASK-018 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add KnowledgeSource selection for prompt steps | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-018-knowledge-source-selection | KnowledgeSourceSelectionService with step→sourceType map, Prompt1Service + Prompt2InputBuilderService use selectForStep, versionLabel in snapshots, 181/181 tests |
| TASK-019 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create EvidenceItem model and basic seed data | DONE | P0 | see docs/07_task_backlog.md | PR #8 | 9 seed records (allowed/risky/unsupported), npx prisma db seed works |
| TASK-020 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create PromptTemplate model and CRUD service | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | Migration applied, version never overwritten, one active per step enforced in service, 7/7 tests |
| TASK-021 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Seed MVP prompt templates | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | prisma/seed.ts seeds active Prompt 1 + Prompt 2 templates |
| TASK-022 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create AiRun model with token usage fields | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | AiRunsService.saveSuccess/saveFailed, token + cost fields, 3/3 tests |
| TASK-023 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement AI provider abstraction interface | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | AiProvider interface + AI_PROVIDER token + FakeAiProvider, 6/6 tests |
| TASK-024 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement PromptRun model and service | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | create/markRunning/complete/fail, links AiRun, 5/5 tests, 103/103 total suite |
| TASK-025 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 input builder | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | PromptInputBuilderService, vacancy source + template + knowledge sources, 9/9 tests |
| TASK-026 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 vacancy analysis execution | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | Prompt1Service, POST /workspaces/:id/run-analysis, full PromptRun/AiRun lifecycle, 18/18 tests, 145/145 total |
| TASK-027 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Add Prompt 1 JSON validation | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | validatePrompt1Json, flat result type, 13/13 tests |
| TASK-028 | Phase 4 — Skip Handling & Manual Override | Implement Prompt 1 decision gate endpoint | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-028-decision-gate | ReviewGatesService, POST /workspaces/:id/review-decision, 4-action state machine, 155/155 tests |
| TASK-029 | Phase 4 — Skip Handling & Manual Override | Implement skip reason generation | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-029-skip-reason-generation | SkipReasonService, POST /workspaces/:id/confirm-skip, skip schema, 164/164 tests |
| TASK-030 | Phase 4 — Skip Handling & Manual Override | Implement manual override logging | DONE | P0 | see docs/07_task_backlog.md | PR #13 | DecisionOverride audit model, POST /workspaces/:id/override-skip, skip artifacts preserved |
| TASK-031 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 input builder | DONE | P0 | see docs/07_task_backlog.md | PR #14 | Prompt2InputBuilderService, guard on cv_generation_running, sourceSnapshot with hashes, 173/173 tests |
| TASK-032 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 targeted CV generation | DONE | P0 | TASK-018 | branch task/TASK-032-prompt2-targeted-cv-generation | Prompt2Service, prompt2.schema.ts, FAKE_PROMPT2_JSON, cv_draft_ready status (§8.6), 203/203 tests pass |
| TASK-032A | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Add missing current_work_block field to Prompt2CvContent schema and fake fixture | DONE | P0 | TASK-032 | — | Schema gap found during TASK-035; adds Prompt2CurrentWorkBlock type + validation + fixture; unblocks TASK-035 |
| TASK-033 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement basic anti-overclaiming guard | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-033-anti-overclaiming-guard | EvidenceGuardService, 15 critical patterns, needs_evidence from AI evidence_table + EvidenceItem, guard integrated into Prompt2Service, 232/232 tests pass |
| TASK-034 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Add CV draft review endpoint | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-034-cv-draft-review-endpoint | CvDraftReviewService (submitCvDraftReview), 3-action gate (approve/pause/mark_not_worth_applying), DecisionOverride audit for mark_not_worth_applying, POST /workspaces/:id/review-cv-draft, 240/240 tests pass |
| TASK-035A | Phase 6 — PDF Export by Default: First Usable MVP | Write approved CV visual concept and flexible block rules | DONE | P0 | planning-only | planning docs | Created docs/cv-template-design/visual-concept.md and block-rules.md; clean two-column MVP layout; Prompt 2 owns content, renderer owns layout |
| TASK-035B | Phase 6 — PDF Export by Default: First Usable MVP | Define CV JSON schemas and implement flexible HTML template | DONE | P0 | TASK-034,TASK-035A | — | Use docs/cv-template-design/visual-concept.md and block-rules.md; schema must support variable bullet counts and selected personal/current projects |
| TASK-035C | Phase 6 — PDF Export by Default: First Usable MVP | NestJS module architecture cleanup — redundant imports and orphaned module | DONE | P0 | TASK-035B | — | Remove 7 redundant AppModule imports, delete orphaned SkipReasonModule, document module rules (ADR-017) |
| TASK-035 | Phase 6 — PDF Export by Default: First Usable MVP | Implement deterministic CV draft to HTML renderer | DONE | P0 | TASK-035B,TASK-035C,TASK-032A | branch task/TASK-035-cv-draft-html-renderer | HtmlRendererService + Prompt2Output→CvContent mapper + static candidate-profile config; 302/302 tests pass |
| TASK-036A | Phase 6 — PDF Export by Default: First Usable MVP | Choose PDF library and implement PdfExportService | DONE | P0 | TASK-035B | branch task/TASK-036A-pdf-export-service | Puppeteer, no --no-sandbox needed on this Windows 11 machine; PdfExportService.htmlFileToPdf() standalone @Injectable (no module, matches HtmlRendererService pattern); 34/34 suites, 303/303 tests pass |
| TASK-036B | Phase 6 — PDF Export by Default: First Usable MVP | DocumentExportController and full export orchestration | DONE | P0 | TASK-035,TASK-036A | branch task/TASK-036B-document-export-controller | POST /export-cv; guard export_running; status → cv_pdf_generated/failed; PDF artifact registration; GET /download-cv; 36/36 suites, 316/316 tests pass |
| TASK-037 | Phase 6 — PDF Export by Default: First Usable MVP | Add optional Markdown and JSON export endpoints | SKIPPED | P0 | see docs/07_task_backlog.md | — | Optional per backlog (Markdown/JSON export endpoints); PDF remains the default CV export. Skipped by product decision in favor of proceeding to TASK-037A (real OpenAI provider) toward practical MVP (TASK-038A). |
| TASK-037A | Phase 6 — PDF Export by Default: First Usable MVP | Implement real OpenAI provider | DONE | P0 | TASK-023 | PR #34 | OpenAiProvider implements AiProvider via `openai` SDK; AiModule.createAiProvider() selects fake/openai via AI_PROVIDER env var (fake default); usage mapped to AiProviderUsage; 38/38 suites, 324/324 tests pass |
| TASK-037B | Phase 6 — PDF Export by Default: First Usable MVP | Seed real Prompt 1 and Prompt 2 template content | DONE | P0 | TASK-021,TASK-032,TASK-035A | branch task/TASK-037B-seed-real-prompts | Real prompt text in prisma/prompts/prompt1.txt + prompt2.txt (read via fs.readFileSync in seed.ts), adapted from user's ChatGPT draft into strict JSON-only instructions matching prompt1.schema.ts/prompt2.schema.ts; content-selection contract (§10.8, 10/10 points) covered by src/pipeline/prompt-template-content.spec.ts (20 tests); 39/39 suites, 344/344 tests pass; seed verified idempotent against local Postgres |
| TASK-037C-0 | Phase 6 — PDF Export by Default: First Usable MVP | Create and commit knowledge source content files | DONE | P0 | TASK-037B | branch task/TASK-037C-0-knowledge-source-content-files | Claude Code scope only: knowledge-sources/ folder structure + .gitkeep, 6 backlog prompt files + 2 future-scope files copied verbatim into knowledge-sources/prompts/, KNOWLEDGE_SOURCES_ROOT added to .env.example, git strategy documented in knowledge-sources/README.md; candidate-profile/evidence/cv-rules/certifications/layout content remains developer's role, not yet done |
| TASK-037C | Phase 6 — PDF Export by Default: First Usable MVP | Register and activate knowledge source files | DONE | P0 | TASK-017,TASK-018,TASK-037C-0 | branch task/TASK-037C-register-knowledge-sources | 9 real content files copied from developer-supplied path into knowledge-sources/; scripts/register-knowledge-sources.ts registers them idempotently via KnowledgeSourcesService-equivalent Prisma calls with sourceType matching KnowledgeSourceSelectionService groups; KNOWLEDGE_SOURCES_ROOT + registration command documented in README.md |
| TASK-037D | Phase 6 — PDF Export by Default: First Usable MVP | Complete .env setup and developer onboarding docs | DONE | P0 | TASK-037A | branch task/TASK-037D-env-onboarding-docs | .env.example (all 8 vars, already complete) and .gitignore (.env, already correct) verified by opening files directly; README.md "Local Start" expanded into full onboarding sequence (install → env → Docker → migrate → generate → seed → register-knowledge-sources → start:dev → create first workspace) with an AI Provider note (OpenAI first real MVP provider, Anthropic later/fallback); verified end-to-end manually |
| TASK-038 | Phase 6 — PDF Export by Default: First Usable MVP | Create mechanical MVP smoke test with fake provider | DONE | P0 | TASK-032,TASK-033,TASK-034,TASK-035B,TASK-035,TASK-036A,TASK-036B,TASK-037 | branch task/TASK-038-mvp-smoke-test | Added missing `POST /workspaces/:id/generate-cv-content` endpoint (Prompt2Service existed but had no route); test/mvp-flow.e2e-spec.ts drives full HTTP flow with fake provider, asserts artifacts on disk + DB, confirms export creates no AiRun (ADR-012); 39/39 suites, 345/345 unit tests pass, e2e 1/1 pass |
| TASK-038A | Phase 6 — PDF Export by Default: First Usable MVP | Run practical MVP real-provider smoke test | DONE | P0 | TASK-038,TASK-037A,TASK-037B,TASK-037C,TASK-037D | branch task/TASK-038A-real-provider-smoke-test | Real OpenAI (gpt-4o) run on real Atmen/Software Engineer vacancy; Prompt 1 MAYBE(64), Prompt 2 CV content with 0 critical overclaiming issues, real 04_cv_export.pdf (119350 bytes, 1 page); 7 GeneratedArtifact rows + 2 AiRun rows verified in Postgres, no AiRun for export (ADR-012); see MVP_ACCEPTANCE.md |
| TASK-PH-001 | Phase PH — Production Hardening (Quick Wins) | Add @nestjs/config with env validation (Joi) | DONE | P0 | — | — | Unblocks PH-002, PH-003, PH-007 |
| TASK-PH-002 | Phase PH — Production Hardening (Quick Wins) | Add security headers: helmet + CORS | DONE | P0 | TASK-PH-001 | — | — |
| TASK-PH-003 | Phase PH — Production Hardening (Quick Wins) | Add rate limiting (@nestjs/throttler) | SKIPPED | P0 | TASK-PH-001 | branch task/TASK-PH-003-rate-limiting (unmerged, stale, superseded) | Was marked DONE in error — implementation existed only on an orphaned branch forked before Swagger/Pino/OpenAI/Puppeteer/husky were added, never merged into main. Superseded by TASK-PH-009 (DONE), which reimplements rate limiting fresh against current main. |
| TASK-PH-004 | Phase PH — Production Hardening (Quick Wins) | Add husky + lint-staged pre-commit hooks | DONE | P0 | — | — | — |
| TASK-PH-005 | Phase PH — Production Hardening (Quick Wins) | Create production Dockerfile (multi-stage, non-root user) | DONE | P0 | — | branch task/TASK-PH-005-production-dockerfile | node:20-alpine multi-stage, USER node, HEALTHCHECK, app service in compose, /health ✅ |
| TASK-PH-006 | Phase PH — Production Hardening (Quick Wins) | Add GitHub Actions CI pipeline (test + lint + build + typecheck) | DONE | P0 | TASK-PH-005 | PR #27 | lint + typecheck + test (postgres service) + build — all 4 jobs ✅ |
| TASK-PH-007 | Phase PH — Production Hardening (Quick Wins) | Add structured logging (nestjs-pino) | DONE | P1 | TASK-PH-001 | — | nestjs-pino JSON in prod, pino-pretty in dev, LOG_LEVEL via ConfigService ✅ |
| TASK-PH-007A | Phase PH — Production Hardening (Quick Wins) | Add Docker build validation to CI | DONE | P1 | TASK-PH-005,TASK-PH-006 | — | docker-build job: build → migrate → run → /health → migrate status → teardown ✅ |
| TASK-PH-008 | Phase PH — Production Hardening (Quick Wins) | Add Swagger/OpenAPI documentation (@nestjs/swagger) | DONE | P1 | — | branch task/TASK-PH-008-swagger-openapi-docs | @nestjs/swagger 7.4.2 (Nest v10-compatible); SwaggerModule at /api + /api-json; all endpoints/DTOs documented; disabled when NODE_ENV=production ✅ |
| TASK-PH-009 | Phase PH-2 — Production Hardening Follow-ups | Reapply rate limiting (@nestjs/throttler) onto current main | DONE | P0 | TASK-PH-001 | branch task/TASK-PH-009-rate-limiting | `ThrottlerModule.forRootAsync` + global `ThrottlerGuard` (APP_GUARD) in app.module.ts, using THROTTLE_TTL (seconds, converted to ms)/THROTTLE_LIMIT via ConfigService; `GET /health` exempted via `@SkipThrottle()` (user-confirmed scope addition) so container healthchecks are never throttled; new `test/rate-limiting.e2e-spec.ts` confirms 429 past the limit and health staying at 200; supersedes orphaned TASK-PH-003 branch, TASK_BOARD.md corrected |
| TASK-PH-010 | Phase PH-2 — Production Hardening Follow-ups | Add security governance files (SECURITY.md, Dependabot, CodeQL) | DONE | P1 | — | PR #51 | `SECURITY.md` (GitHub Security Advisories reporting channel, user-confirmed), `.github/dependabot.yml` (weekly npm + github-actions, confirmed active with 20 alerts scanned), `.github/workflows/codeql.yml` (javascript-typescript, verified green in PR checks — no new alerts); no `src/**` changes, `npm run test` 47/47 suites/475/475 tests green, `npx tsc --noEmit` clean |
| TASK-PH-013 | Phase PH-2 — Production Hardening Follow-ups | Remediate Dependabot-reported dependency vulnerabilities | DONE | P1 | TASK-PH-010 | PR #65 | `package.json` `overrides` pinned `lodash`/`multer`/`qs`/`file-type`/`js-yaml` to patched same-major versions, avoiding the NestJS v11 major bump; `npm audit --omit=dev` 7 high → 0 high; confirmed via GitHub Dependabot API: 15 alerts `fixed`, remaining 7 open are documented out-of-scope dev-tooling (`@nestjs/cli` tree) + 1 moderate (`@nestjs/core`, needs v11) |
| TASK-PH-014 | Phase PH-2 — Production Hardening Follow-ups | Fix CodeQL code-scanning findings (path-injection guard, ReDoS/length hardening) | DONE | P1 | TASK-PH-010 | PR #67 | `saveVacancySource` gained `assertInsideStorageRoot` guard (real gap fixed, tested); `CreateWorkspaceDto` gained `@MaxLength(200)`; all 4 CodeQL alerts dismissed on GitHub with recorded justification (2 false positive, 2 won't-fix) |
| TASK-PH-015 | Phase PH-2 — Production Hardening Follow-ups | Remediate devDependency-only Dependabot alerts (@nestjs/cli build-tooling chain) | DONE | P1 | TASK-PH-013 | PR #69 | `@nestjs/cli`/`@nestjs/schematics` devDependency-only bump; all 6 alerts (glob, tmp, picomatch, webpack) closed post-merge; `@nestjs/core` moderate alert (#17) stays open (already accepted risk from TASK-PH-013) |
| TASK-PH-016 | Phase PH-2 — Production Hardening Follow-ups | Upgrade NestJS core packages v10 → v11 (close remaining @nestjs/core Dependabot alert #17) | DONE | P1 | TASK-PH-013,TASK-PH-015 | PR #70 | @nestjs/core/common/platform-express/testing ^10→^11.1.28, @nestjs/swagger ^7.4.2→^11.4.5 (own major tracks Nest's, not "v8"); `npm audit` 4 moderate → 0; all Dependabot alerts closed post-merge |
| TASK-PH-011 | Phase PH-2 — Production Hardening Follow-ups | Add minimal API-key authentication guard | DONE | P1 | TASK-PH-001 | PR #71 | Deliberately minimal (single shared-secret header) — full JWT/user auth out of scope for a single-operator tool; global `ApiKeyGuard` (`APP_GUARD`) checks `X-API-Key` against required `API_KEY` env var, `GET /health` exempted via `@SkipAuth()`; Swagger `.addApiKey()` replaces unused Bearer placeholder; 48/48 suites, 484/484 tests pass |
| TASK-PH-012 | Phase PH-2 — Production Hardening Follow-ups | Raise TypeScript compiler strictness incrementally | DONE | P2 | — | branch task/TASK-PH-012-typescript-strictness | All 5 flags enabled one at a time (forceConsistentCasingInFileNames, noFallthroughCasesInSwitch, strictBindCallApply, noImplicitAny, strictNullChecks), 5 commits; 53 noImplicitAny errors fixed with real Prisma/schema type annotations, 6 strictNullChecks errors fixed (ConfigService.getOrThrow for required STORAGE_ROOT + 2 justified non-null assertions); 48/48 suites, 484/484 tests + e2e 2/2 pass |
| TASK-PH-017 | Phase PH-2 — Production Hardening Follow-ups | Add coverage measurement, diff/patch coverage gating and CI-enforced e2e suite | DONE | P1 | — | branch task/TASK-PH-017-coverage-and-e2e-ci (PR pending) | Measured baseline (statements 91.59%/branches 71.21%/functions 92.01%/lines 91.41%) → coverageThreshold 90/68/90/90; codecov.yml patch target 80%; ci.yml test job uploads coverage, new test-e2e job runs prisma migrate deploy + db seed + test:e2e; new skip-flow.e2e-spec.ts (ADR-016 change_to_skip transition only — confirm-skip descoped, see Known Gaps); README badge; ADR-022; 50/50 suites 498/498 tests, tsc clean, e2e 3/3 suites 4/4 tests, build clean |
| TASK-PH-018 | Phase PH-2 — Production Hardening Follow-ups | Seed skip_reason PromptTemplate to fix confirm-skip | DONE | P1 | TASK-PH-017 | branch task/TASK-PH-018-seed-skip-reason-template | Added `prisma/prompts/skip_reason.txt` placeholder (prompt3.txt/prompt5.txt pattern) + registered active `skip_reason` PromptTemplate in seed.ts; fixes `confirm-skip` 500 on freshly-seeded DB; extended skip-flow.e2e-spec.ts to exercise confirm-skip end-to-end (ADR-005: status → skipped, artifacts on disk + registered); no SkipReasonService/schema/provider code changes needed — code path was already correct; 50/50 suites 498/498 tests, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-039 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Implement workspace status transition service | DONE | P1 | see docs/07_task_backlog.md | branch task/TASK-039-workspace-status-transition-service | WorkspaceStatusService with transition map derived from real code (not docs §8.6, which disagrees on one path); standalone, registered in WorkspacesModule, no existing call sites refactored; 40/40 suites, 377/377 tests pass |
| TASK-040 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Add workspace artifact summary API | DONE | P1 | see docs/07_task_backlog.md | branch task/TASK-040-workspace-artifact-summary-api | `WorkspacesService.getWorkspaceDetail()` composes status/decision/score + artifact summary (canonical vs download names); GET /workspaces/:id extended; 40/40 suites, 379/379 tests + e2e pass |
| TASK-041 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Implement artifact latest-version marking | DONE | P1 | see docs/07_task_backlog.md | task/TASK-041-artifact-latest-version-marking | `register()` marks previous latest false, bumps version per workspaceId+artifactType |
| TASK-042 | Phase 8 — P1 Safety & Quality Layer | Implement Prompt 3 pre-PDF check | DONE | P1 | see docs/07_task_backlog.md | task/TASK-042-prompt3-pre-pdf-check | `Prompt3Service`/`Prompt3InputBuilderService` write/register 03_pre_pdf_check.md/json; readiness field added to schema; no workspace status change (optional step) |
| TASK-043 | Phase 8 — P1 Safety & Quality Layer | Implement Prompt 5 final check | DONE | P1 | see docs/07_task_backlog.md | task/TASK-043-prompt5-final-check | `Prompt5Service`/`Prompt5InputBuilderService` write/register 05_final_check.md/json; final_decision field; workspace.status -> final_check_ready on success (unlike Prompt 3); also renamed prompt1/prompt2 schema files to canonical-artifact naming (ADR-021) |
| TASK-044 | Phase 8 — P1 Safety & Quality Layer | Add safer wording suggestion service | DONE | P1 | see docs/07_task_backlog.md | task/TASK-044-safe-wording-service | `SafeWordingService` (`src/evidence/safe-wording.service.ts`) maps `EvidenceItem.category` (`allowed`/`risky`/`unsupported`) + no-match to distinct suggested wording strings; registered in `EvidenceModule`; standalone, no endpoint/pipeline wiring per AC scope; 49/49 suites, 489/489 tests pass |
| TASK-045 | Phase 9 — Basic Existing Folder Import | Implement existing folder scanner | DONE | P1 | see docs/07_task_backlog.md | task/TASK-045-existing-folder-scanner | `ImportService.scanRoot()` (`src/import/`), read-only detection of legacy `Company/YYYY.MM.DD/` folders (vacancy source/legacy CV md/CV PDF/cover letter PDF/SKIP files), status suggestion per docs §15.8; `GET /import/scan`; no DB writes; 50/50 suites, 497/497 tests pass |
| TASK-046 | Phase 9 — Basic Existing Folder Import | Implement import preview and manual metadata correction | DONE | P1 | TASK-045 | branch task/TASK-046-import-preview-metadata-correction | `ImportService.previewImport(folderPath, overrides?)` reuses `scanDateFolder()` for a single folder, applies `companyNameOverride`/`roleTitleOverride` via `SlugService`; duplicate detection by `ApplicationWorkspace.sourceImportedPath` (path) and `GeneratedArtifact.contentHash` for `artifactType: 'vacancy_source'` (hash, only when exactly one vacancy-source candidate); new `POST /import/preview` (Swagger-documented); no DB writes — preview/correction only, record creation is TASK-047; 50/50 suites 505/505 tests, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-047 | Phase 9 — Basic Existing Folder Import | Implement import confirmation and artifact registration | DONE | P1 | TASK-046 | branch task/TASK-047-import-confirmation-artifact-registration | `ImportService.confirmImport(folderPath, options)` calls `previewImport()`, blocks duplicates (409)/ambiguous or missing vacancy source without `selectedVacancySourcePath` (400)/`import_needs_review` (400); creates Company/JobVacancy (`originalImportedFileName`/`sourceFormat: 'legacy_import'`)/ApplicationWorkspace (`createdFrom: 'import'`, `sourceImportedPath`, status mapped 1:1 from `suggestedStatus`, `isSkipped`+`currentDecision: skip` for the skip case)/GeneratedArtifact rows (legacy names preserved, registered in place under IMPORT_ROOT by default, `origin: 'imported'`); `copyVacancySourceToCanonical` option copies only the vacancy source into `00_vacancy_source.txt` under STORAGE_ROOT; new `POST /import/confirm`; discovered+logged (not fixed) binary-unsafe generic artifact download gap as TASK-PH-019; 51/51 suites 522/522 tests, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-PH-019 | Phase PH-2 — Production Hardening Follow-ups | Fix binary-unsafe generic artifact download endpoint (`GET /artifacts/:id/download` reads files as utf-8 text) | DONE | P1 | — | branch task/TASK-PH-019-fix-binary-unsafe-artifact-download | `ArtifactsController.download()` `fs.readFile(resolvedFile, 'utf-8')` → `fs.readFile(resolvedFile)` (Buffer), mirroring the already-correct `document-export.controller.ts` `downloadCv()` pattern; `res.send()` unchanged (handles Buffer natively); existing happy-path test updated to Buffer, new test proves a non-UTF-8 byte sequence survives unchanged; 51/51 suites 523/523 tests, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-048 | Phase 10 — Cover Letter & Recruiter Message | Create CoverLetterDraft model/service | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-048-cover-letter-draft-model-service | `CoverLetterDraft` model + `CoverLetterDraftStatus` enum (migration `add_cover_letter_draft`); links to `workspaceId`/`promptRunId` only, not `cvDraftId` as docs describe — `CvDraft` was never implemented as a Prisma model (confirmed, resolved with user); `CoverLetterDraftsService.create()` blocks `skipped` workspaces unless manually overridden; service-only, no controller yet; 52/52 suites, 527/527 tests pass |
| TASK-049 | Phase 10 — Cover Letter & Recruiter Message | Implement cover letter generation step | DONE | P2 | TASK-048 | branch task/TASK-049-cover-letter-generation-step | `CoverLetterInputBuilderService`/`CoverLetterService` (`src/pipeline/cover-letter/`), mirrors `Prompt5Service`; writes `cover_letter.md/json` (PDF export deferred); guards `status` in `[cv_pdf_generated, final_check_ready]`, transitions to `cover_letter_generated` via `WorkspaceStatusService`; new `cover_letter` step in `KnowledgeSourceSelectionService` + seeded `PromptTemplate`; `POST /workspaces/:id/generate-cover-letter`; 55/55 suites 580/580 tests, tsc clean, e2e 3/3 suites 4/4 tests, manual smoke test verified |
| TASK-PH-020 | Phase PH-2 — Production Hardening Follow-ups | Fix cover letter draft creation failure handling and missing subject in markdown | DONE | P1 | TASK-049 | branch task/TASK-PH-020-cover-letter-draft-failure-handling | Found during TASK-049 code review (PR #83); fixed by moving `coverLetterDraftsService.create()` before the `workspace.status` transition + wrapping in try/catch (structured `success: false`, status unchanged, retry-safe) instead of letting it throw uncaught; `buildMarkdown()` now renders `**Subject:**` when non-null; 55/55 suites 585/585 tests pass, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-PH-021 | Phase PH-2 — Production Hardening Follow-ups | Wrap unguarded vacancy-source reads in try/catch across prompt2 and cover-letter input builders | DONE | P2 | TASK-049 | branch task/TASK-PH-021-vacancy-source-read-error-handling | Found during TASK-049 code review; fixed by wrapping the `00_vacancy_source.txt` read in both `prompt2-input-builder.service.ts` and `cover-letter-input-builder.service.ts`, rethrowing `BadRequestException`; 55/55 suites 586/586 tests pass, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-PH-022 | Phase PH-2 — Production Hardening Follow-ups | Remove redundant WorkspaceStatusService registration from WorkspacesModule | DONE | P2 | TASK-049 | branch task/TASK-PH-022-workspace-status-service-dedup | Found during TASK-049 code review; scope revised after confirming nothing in `WorkspacesModule` actually injects the service (dead TASK-039 registration) — removed rather than building a new shared module (user-confirmed, YAGNI per CLAUDE.md Module Rules); `WorkspaceStatusService` now has exactly one DI instance (`PipelineModule`); 55/55 suites 586/586 tests pass, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-PH-023 | Phase PH-2 — Production Hardening Follow-ups | Remediate PostCSS XSS Dependabot alert + re-triage stale CodeQL alerts on apps/web | DONE | P1 | TASK-056 | branch task/TASK-PH-023-postcss-xss-fix | User spotted 6 open High CodeQL alerts + 1 Dependabot alert on GitHub post-merge and asked why PR #107 wasn't blocked. `apps/web/package.json` gained `overrides: { postcss: "^8.5.10" }` (Next.js 16.2.10 bundles a vulnerable nested `postcss@8.4.31`; `@tailwindcss/postcss`'s own top-level resolution was already patched) — `npm install` → 0 vulnerabilities, lint/tsc/build clean. Separately (no code change): the 6 CodeQL alerts were re-detections of already-dismissed TASK-PH-014/TASK-046/TASK-047 findings, re-opened only because ADR-023's `git mv` (`src/` → `apps/api/src/`) changed the file path CodeQL keys alerts on — re-dismissed via `gh api` with the same justifications; confirmed 0 open alerts remain. Confirmed why they didn't block the PR: the required `Analyze (javascript-typescript)` check passes when the CodeQL job completes, not when 0 alerts are found — expected GitHub behavior, not a gap to fix |
| TASK-PH-024 | Phase PH-2 — Production Hardening Follow-ups | Block merges on high+ severity CodeQL/Dependabot alerts | DONE | P1 | TASK-PH-023 | PR #109 | User asked how to make CI actually block merges on security findings (follow-up to TASK-PH-023). Added GitHub Ruleset `require-codeql-high-or-higher` (branch `main`, `code_scanning` rule, `security_alerts_threshold: high_or_higher`) — native, blocks merge on open High/Critical CodeQL alerts. Added new `Dependabot Severity Gate` CI job (no native ruleset exists for Dependabot), required status check. Real blocker found+fixed: `GITHUB_TOKEN` cannot read the Dependabot Alerts API (403) even with `security-events: read`; needs a PAT. User created a fine-grained PAT ("Dependabot alerts: Read-only", repo-scoped) as secret `DEPENDABOT_ALERTS_TOKEN`; job re-verified passing for real via `gh run rerun`/raw job logs before being re-added to required checks. `gh pr checks 109` all green |
| TASK-050 | Phase 11 — Application Tracking & Rejection Analysis | Add application status tracking fields/endpoints | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-050-application-status-tracking | 7 new optional `ApplicationWorkspace` fields; new `src/application-tracking/` module (`ApplicationTrackingService`, mirrors `ReviewGatesService` pattern); 4 new `POST /workspaces/:id/mark-ready-to-apply`\|`mark-applied`\|`mark-rejected`\|`archive` endpoints; 56/56 suites 614/614 tests pass, tsc clean, e2e 3/3 suites 4/4 tests, manual smoke test verified |
| TASK-051 | Phase 11 — Application Tracking & Rejection Analysis | Implement rejection text artifact and analysis placeholder | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-051-rejection-text-artifact | New `src/rejections/` module (`RejectionsService.saveRejectionText`, mirrors `ApplicationTrackingService` pattern); guards `status === rejected`; writes/registers `rejection_feedback.md` (`origin: 'pasted'`, `promptRunId: null` as AI-analysis-linkage placeholder); new `POST /workspaces/:id/rejection-text` endpoint; 57/57 suites 620/620 tests pass, tsc clean, e2e 3/3 suites 4/4 tests, manual smoke test verified |
| TASK-052 | Phase 12 — Redis/BullMQ Async Processing | Add Redis to Docker Compose for later phase | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-052-redis-docker-compose | `redis:7-alpine` service in docker-compose.yml (no volume, not in app's depends_on), `REDIS_PORT`/`REDIS_URL` in .env.example; manual check confirmed Redis starts standalone and full stack/`/health` unaffected; no source code changes (BullMQ abstraction is TASK-053) |
| TASK-053 | Phase 12 — Redis/BullMQ Async Processing | Implement BullMQ queue abstraction | DONE | P2 | TASK-052 | branch task/TASK-053-bullmq-queue-abstraction | Standalone `QueueService` (`src/queue/`) — enqueue/getStatus/retry/cancel over 4 named queues (analysis/cv-generation/export/final-check, per AC not the roadmap's 7); lazy Redis connection via `REDIS_URL` (optional at startup); no module/controller wiring yet (TASK-054 is the first consumer); unit tests mock `bullmq` entirely |
| TASK-054 | Phase 12 — Redis/BullMQ Async Processing | Implement queued Prompt 1 analysis worker | DONE | P2 | TASK-053 | branch task/TASK-054-queued-prompt1-analysis-worker | `AnalysisWorker` (`src/queue/workers/`) consumes `QueueName.ANALYSIS`, delegates to unchanged `Prompt1Service.runAnalysis()`; new `QueueModule` (first `QueueService` consumer) wired into `WorkspacesModule`; `POST .../run-analysis-async` + `GET .../analysis-job/:jobId` endpoints; worker only starts when `REDIS_URL` set; unit tests mock `bullmq` Worker entirely, plus real manual smoke test through to `paused_after_analysis`; 59/59 suites 637/637 tests, tsc clean, e2e 3/3 suites 4/4 tests |
| TASK-055 | Phase 13 — Frontend Dashboard | Bootstrap Next.js dashboard | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-055-bootstrap-nextjs-dashboard | New `apps/web/` — Next.js 16 (App Router, TS, Tailwind), fully independent npm project; `lib/api.ts` calls backend `GET /health` via `NEXT_PUBLIC_API_BASE_URL`; home page shows live backend status. Fixed root `tsconfig.json`/`npm run lint` glob collision with new `apps/` dir. Manual smoke test confirmed real backend call end-to-end; 59/59 backend suites, 637/637 tests unaffected. **Follow-up commit 2 (ADR-023):** backend moved from repo root to `apps/api/` (peer of `apps/web/`, `git mv`, fully self-contained), fixing the structural asymmetry of frontend-nested-inside-backend; root reduced to shared docs/CI/docker-compose + minimal husky/lint-staged `package.json`; `docker-compose.yml`/CI workflow/Claude Code hooks/`CLAUDE.md`/`README.md` all updated for the new layout; re-verified 59/59 suites 637/637 tests, e2e 3/3 suites 4/4 tests, build clean, manual smoke test from new locations. **Follow-up commit 3 (ADR-024):** added `apps/web/Dockerfile` (Next.js `output: "standalone"`, 3-stage) + `web` service in `docker-compose.yml` (`depends_on: app`, `NEXT_PUBLIC_API_BASE_URL` build arg = `http://app:3000`); found+fixed a real bug where the standalone server bound to the container's own IP instead of `0.0.0.0` (Next.js honors Docker's auto-set `$HOSTNAME`) — fixed with explicit `ENV HOSTNAME="0.0.0.0"`; verified `docker compose ps` shows `web` `(healthy)`, in-container curl succeeds, host page still shows "Backend status: ok" against the real containerized backend |
| TASK-056 | Phase 13 — Frontend Dashboard | Implement workspace creation UI | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-056-workspace-creation-ui | `apps/web/src/app/workspaces/new/` (page/form/Server Action) + `apps/web/src/lib/slug.ts` (client-side slug preview mirroring `SlugService`) + `apps/web/src/lib/api.ts` `createWorkspace()`; verified end-to-end against a real backend (`POST /workspaces` → 201, artifact on disk, DB rows correct); lint/tsc/build clean |
| TASK-057 | Phase 13 — Frontend Dashboard | Implement workspace review screens | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-057-workspace-review-screens | New `apps/web/src/app/workspaces/[id]/page.tsx` (status/decision/artifacts/next-action) + `analysis-review-gate.tsx` (approve apply/maybe/pause/skip, override-skip form) + `cv-draft-review-gate.tsx` (approve/pause/mark-not-worth-applying/regenerate placeholder); new `apps/web/src/lib/api.ts` functions calling pre-existing `apps/api` review-gates endpoints; added minimal `/workspaces` list page + home/creation-form link wiring (not in original AC, needed to make the screens reachable). Found+fixed a real bug during manual smoke test: `WorkspaceCompany` type used `companyNameOriginal` instead of the actual Prisma field `nameOriginal`, silently rendering `$undefined`. No `apps/api` changes; `apps/web` still has no test runner (TASK-062) so verification was a real manual smoke test against a real backend (all 3 gate flows + 404 handling exercised via curl/browser-fetch) plus lint/tsc/build clean. PR #110's CodeQL gate (TASK-PH-024) caught a real `js/request-forgery` finding (4 critical alerts): workspace `id` reached outgoing fetch URLs unescaped inside Server Actions, which are directly callable regardless of UI — fixed with `encodeURIComponent(id)` at every call site, re-verified 0 alerts remain |
| TASK-058 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add GitHub Actions CI | SKIPPED | P2 | see docs/07_task_backlog.md | — | Superseded by TASK-PH-006 which delivers same outcome at P0 priority |
| TASK-059 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add integration tests for database persistence assumptions | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-059-postgres-persistence-check | Persistence verification script/docs already existed from TASK-005 (2026-06-28) but `ADR-023`'s later `apps/api/` restructuring broke two README references: the checklist link and the `npm run db:check-persistence` instruction (script only lives in `apps/api/package.json`). Fixed both stale references and re-ran `apps/api/scripts/check-postgres-persistence.sh` for real to reconfirm it still works post-restructuring — PASS, table cleaned up. No new automated Jest/e2e spec added; agreed with the user that the existing shell-script approach is the right tool since the scenario needs to drive `docker compose down`/`up` from outside the test process |
| TASK-060 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add README portfolio documentation | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-060-readme-portfolio-docs | Backend-first architecture, MVP flow and personal-project disclaimer were already well covered; added a new "Data & Artifact Model" section explaining the PostgreSQL metadata chain, filesystem canonical artifacts and `AiRun` token/cost tracking together. While verifying against real code, found the "Project status" table understated 3 already-implemented features as "In progress" (Token/cost tracking, Evidence Guard, Deterministic HTML/PDF export — all confirmed wired and tested) — corrected for portfolio honesty. Manual review against CLAUDE.md's Anti-Overclaiming Rules found no issues |
| TASK-061 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add architecture diagram or Mermaid flow | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-061-architecture-diagram | Existing README Mermaid diagram was a pipeline/data-flow view only (no NestJS API/Redis/Next.js nodes). Added a new "System architecture" diagram (Next.js Dashboard → NestJS API → PostgreSQL/Redis-BullMQ/Filesystem/AI Provider, with Prompt Pipeline + Document Export as internal components) verified against real code (provider class names, docker-compose service names, queue module); renamed the old diagram's heading to "Pipeline flow" (kept, complementary view). Added a caption noting these are local Docker Compose services with no cloud deployment. Both diagrams rendered via a Claude Artifact preview before committing |
| TASK-062 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add unit/component test runner and coverage to apps/web | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-062-web-test-runner | Added Vitest + React Testing Library as `apps/web`'s own independent test stack (separate devDeps from `apps/api`'s Jest). `src/lib/slug.spec.ts` (26 tests, mirrors `apps/api`'s `slug.service.spec.ts` scope per ADR-013) + `workspace-form.spec.tsx` (5 tests: slug preview, validation, success/error states). New `web-test` CI job in `.github/workflows/ci.yml`. Measured (not guessed) coverage baseline for all of `apps/web/src` — 20.88%/16.47%/18.96%/21.56% (stmts/branch/funcs/lines) since most of the app (`api.ts`, review-gate components, pages) has no tests yet — threshold set a small margin below that as a regression floor (ADR-022 method), to rise as future tasks add coverage. Found+fixed: RTL doesn't auto-cleanup under Vitest (added `cleanup()` in `afterEach`); `coverage/**` wasn't eslint-ignored (only gitignored), causing a lint warning on generated files. Lint/tsc/build all clean, 31/31 tests pass |
| TASK-063 | Phase 15 — Full Pipeline Control UI | Add pipeline step-trigger actions to workspace detail UI | DONE | P2 | see docs/07_task_backlog.md | branch task/TASK-063-pipeline-step-trigger-actions | `pipeline-actions.tsx` wires run-analysis/generate-cv-content/export-cv/confirm-skip; no apps/api changes; 38/38 tests pass |
| TASK-063A | Phase 15 — Full Pipeline Control UI | Fix swapped/missing downloadFileName on skip-reason artifacts | DONE | P2 | TASK-063 | branch task/TASK-063A-fix-skip-reason-download-filenames | `buildDownloadFileName()` gained an `extension: 'md' \| 'json'` param; md registration now passes `downloadFileName`, json registration uses the json-suffixed name instead of the md one. 8/8 unit tests, verified live via confirm-skip smoke test |
| TASK-064 | Phase 15 — Full Pipeline Control UI | Add artifact content viewer and generic download links | DONE | P2 | see docs/07_task_backlog.md | PR #121 | New Next.js Route Handler proxy for authenticated download/view; ArtifactViewer component |
| TASK-064A | Phase 15 — Full Pipeline Control UI | Fix missing mimeType on vacancy_source artifact registration | DONE | P2 | TASK-064 | PR #122 | `workspaces.service.ts`'s `createWorkspace()` now passes `mimeType: 'text/plain'` to `artifactsService.register()`, matching `import.service.ts`'s existing pattern for the same artifact type. `downloadFileName` intentionally left null (consistent with every other non-PDF/non-skip-reason artifact type — download falls back to `canonicalFileName`). New unit test asserts the `register()` call args; 639/639 tests pass |
| TASK-065 | Phase 15 — Full Pipeline Control UI | Add async/queued analysis trigger with job-status polling to workspace detail UI | DONE | P2 | TASK-063 | branch task/TASK-065-async-analysis-trigger | New `async-analysis-trigger.tsx` self-contained client component polls `analysis-job/:jobId` every 2s until a terminal BullMQ state; enqueue failure (e.g. no REDIS_URL) surfaces immediately without polling. 5 new component tests (fake timers), 49/49 apps/web tests pass |
| TASK-066 | Phase 15 — Full Pipeline Control UI | Add Prompt 3 (pre-PDF check) trigger and results view | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-067 | Phase 15 — Full Pipeline Control UI | Add Prompt 5 (final check) trigger and results view | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-068 | Phase 15 — Full Pipeline Control UI | Add cover letter generation trigger and content view | TODO | P2 | TASK-064 | — | — |
| TASK-069 | Phase 15 — Full Pipeline Control UI | Add application tracking actions to workspace detail UI | TODO | P2 | TASK-064 | — | — |
| TASK-070 | Phase 15 — Full Pipeline Control UI | Add rejection text submission to workspace detail UI | TODO | P2 | TASK-069 | — | — |
| TASK-071 | Phase 15 — Full Pipeline Control UI | Add existing-folder import UI | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-072 | Phase 15 — Full Pipeline Control UI | Manual verification pass: real historical flow variants against the new UI | TODO | P2 | TASK-063,TASK-064,TASK-065,TASK-066,TASK-067,TASK-068,TASK-069,TASK-070,TASK-071 | — | — |
| TASK-073 | Phase 15 — Full Pipeline Control UI | Full apps/web UI/UX redesign pass (branching pipeline visualization) | TODO | P2 | TASK-072 | — | Raised by user during TASK-063 review, 2026-07-19: scattered sections, no overall-progress visibility, actions appear/disappear without forward context, artifacts as a bare table. Requires a design-exploration step (2-3 Artifact-preview concepts, sign-off before implementation) before code — reference style not yet decided. Scope: all apps/web screens, not just workspace detail |
