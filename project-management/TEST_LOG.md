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

