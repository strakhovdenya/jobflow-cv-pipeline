# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@project-management/CURRENT_TASK.md
@project-management/DECISIONS.md

## Project Purpose

JobFlow CV Pipeline is a backend-first application for AI-assisted vacancy analysis, evidence-based targeted CV generation and physical CV PDF export for real job applications.

The project is also a portfolio-quality backend project for Node.js/TypeScript/NestJS/PostgreSQL/Prisma/Docker/AI workflow experience.

## Read First

Before implementation, read:

- `project-management/CURRENT_TASK.md`
- The doc sections or line ranges listed in `## Docs to Read` inside `CURRENT_TASK.md` — read those targeted sections first, not whole files.

## Finding Epics and Phases

When asked what the next epic/phase is, or to analyze/scope one that isn't already named in the
request, check in this order:

1. `docs/05_epics.md` — why each epic exists (Goal/Business Value/Scope/Acceptance Criteria per
   epic). This is the authoritative epic definition.
2. `docs/06_roadmap.md` — phase order, dependencies between phases, and each phase's Done
   Criteria/Physical Result. Epics and phases are numbered independently but map roughly 1:1
   (e.g. EPIC-24 = Phase 17) — check both files, not just one.
3. `docs/07_task_backlog.md` — only once an epic/phase is identified, for its already-broken-down
   `TASK-XXX` entries (a new epic may not have any yet).
4. A dedicated methodology doc may exist for a specific epic (e.g. `docs/10_calibration_and_parity.md`
   for EPIC-24) — check `docs/` for a same-topic file before assuming `05_epics.md`'s summary is
   the full picture.

**Do not treat `project-management/EPIC_PROGRESS.md` as authoritative for current status** — its
own `## Progress Rules` require updating it whenever `TASK_BOARD.md` changes, but this has not been
kept up in practice; it has been observed showing phases as `TODO`/`IN_PROGRESS` that are actually
`DONE` per `TASK_BOARD.md` and git history. Cross-check any status claim from it against
`project-management/TASK_BOARD.md`'s `## Current Focus` section (which is kept current) before
relying on it.

## Repository Layout

This is a two-app monorepo (ADR-023). Each app is fully self-contained (own `package.json`,
`node_modules`, lockfile, `tsconfig.json`) — no npm workspaces.

Each app also has its own `CLAUDE.md` (`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`) with
app-specific stack, structure, commands, and change rules. Claude Code loads these automatically
alongside this root file when working on files inside that app — no explicit reference is needed
for that to happen; this pointer exists purely so a reader who only opened this root file knows
the app-level files exist.

```
apps/
  api/    NestJS backend (see Module Map below) — the primary MVP focus
  web/    Next.js dashboard (Phase 13, secondary to the backend)
docs/, project-management/, README.md, CLAUDE.md, .github/   shared, repo root
docker-compose.yml                                             orchestrates both apps' infra
```

`docker-compose.yml` defines 4 services: `postgres`, `redis`, `app` (`apps/api`, `Dockerfile`
already existed) and `web` (`apps/web`, `Dockerfile` uses Next.js `output: "standalone"`). `web`
depends on `app` and reaches it at `http://app:3000` over the Docker network — baked into the
client bundle at build time via a `NEXT_PUBLIC_API_BASE_URL` build arg (Next.js inlines
`NEXT_PUBLIC_*` vars at build time, not runtime, so this cannot be overridden with a plain
container env var at `docker run` time). `web`'s `Dockerfile` explicitly sets
`ENV HOSTNAME="0.0.0.0"` in the runner stage — Next.js's standalone `server.js` binds to
`$HOSTNAME` if set, and Docker auto-sets `HOSTNAME` to the container's own hostname/IP by
default, which is unreachable via `localhost` from inside the container (breaks `HEALTHCHECK`
and anything else running in-container).

All backend commands below run from `apps/api/`. All frontend commands run from `apps/web/`.

## Claude Code Configuration

`.claude/settings.json` is committed to the repo and contains project-wide hooks:

- **PostToolUse `Write|Edit`** — `scripts/lint-hook.js` and `scripts/typecheck-hook.js` detect
  which app (`apps/api` or `apps/web`) the edited file belongs to and run that app's own local
  `eslint --fix` / `tsc --noEmit` against it, so formatting/type feedback is applied without a
  manual step and without cross-contaminating the other app's config.

## Commands

Per-app dev/build/lint/typecheck/test commands (NestJS, Prisma, Vitest, etc.) are documented in
each app's own `CLAUDE.md` (`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`) — that is the authoritative
list; do not re-derive or duplicate it here, since a copy in two places drifts.

Only repo-root-level Docker orchestration lives here, since `docker-compose.yml` is a root file
covering both apps' infra:

```bash
# Docker (run from repo root — docker-compose.yml lives there):
# start PostgreSQL only
docker compose up -d postgres

# Docker: stop containers WITHOUT deleting data
docker compose down

# DESTRUCTIVE — deletes all PostgreSQL data:
# docker compose down -v
```

## High-Level Architecture

The backend (`apps/api/`) is a NestJS monolith with a clear module boundary per pipeline stage.
It does all the pipeline work; `apps/web/` (Phase 13) is a secondary dashboard, not required for
the backend MVP.

### Module Map

The per-module breakdown of `apps/api/src/` (what each folder/service is responsible for) lives in
`apps/api/CLAUDE.md`'s "Структура проекта" section — that is the authoritative, kept-current
version; do not duplicate it here.

### Data Flow (MVP)

```
POST /workspaces
  -> SlugService (slugs)
  -> WorkspaceService (DB: Company, JobVacancy, ApplicationWorkspace)
  -> ArtifactStorageService (fs: storage/applications/<date>_<co>_<role>/00_vacancy_source.txt)
  -> GeneratedArtifact record
  <- status: source_saved

POST /workspaces/:id/run-analysis
  -> PromptPipelineService: builds input, calls AiProvider
  -> ArtifactStorageService: 01_vacancy_analysis.md/json
  -> PromptRun + AiRun records (with token usage)
  <- status: paused_after_analysis  [human must review]

POST /workspaces/:id/decision  (apply | maybe | skip)
  skip -> SkipReasonService: 01_skip_reason.md/json, status: skipped, pipeline stops
  apply/maybe -> ReviewGateService records approval, status allows Prompt 2

POST /workspaces/:id/generate-cv-content
  -> Prompt2Service (only after approval)
  -> EvidenceGuardService (anti-overclaiming check)
  -> 02_targeted_cv_content.md/json
  <- status: paused_after_cv_draft  [human must review]

POST /workspaces/:id/review-cv-draft  (approve)
  -> ReviewGatesService.submitCvDraftReview
  <- status: pre_pdf_check_ready  [gate: run the pre-PDF check, or explicitly skip it]

POST /workspaces/:id/run-pre-pdf-check         (optional, AI-assisted)
  -> Prompt3Service: 03_pre_pdf_check.md/json
  <- status: paused_before_export (on success — readiness verdict does not block, only running clears the gate)
POST /workspaces/:id/skip-pre-pdf-check        (alternative to running it)
  -> ReviewGatesService.skipPrePdfCheck
  <- status: paused_before_export

POST /workspaces/:id/export-cv
  -> DocumentExportService reads 02_targeted_cv_content.json
  -> reads 03_pre_pdf_check.json if it exists (Prompt 3 recommendations become mandatory context
     when present; export never requires them to exist, only the gate above to have been cleared)
  -> HtmlRenderer -> 04_cv_export.html
  -> PdfExportService -> 04_cv_export.pdf
  -> NO AiRun created, NO tokens consumed
  <- status: cv_pdf_generated
```

### Key Invariants

- `PromptRun` links to `PromptTemplate` version and `AiRun`. `GeneratedArtifact` links to `PromptRun` or has `origin = generated_by_export_service`.
- Step 4 (export) is **not** an AI prompt. Never create an `AiRun` for it.
- Prompt 2 is **blocked** until apply/maybe is explicitly approved or a skip override is logged.
- Manual overrides must be written to the database (audit trail).
- Filesystem root is configurable via `STORAGE_ROOT` env var; code must never write outside it.
- Slug regex must use `\p{Script=Cyrillic}` (Unicode flag), not a character list.

### PostgreSQL Models (MVP)

`Company` → `JobVacancy` → `ApplicationWorkspace` → `PromptRun` → `AiRun`  
`ApplicationWorkspace` → `GeneratedArtifact` (many)  
`KnowledgeSource` → `EvidenceItem` (many)  
`PromptTemplate` → `PromptRun` (one active version per type at a time)

### Workspace Status Sequence (MVP required)

```
source_saved -> analysis_running -> paused_after_analysis
  -> skipped  (skip path, pipeline stops)
  -> cv_generation_running -> paused_after_cv_draft
  -> pre_pdf_check_ready -> paused_before_export -> cv_pdf_generated
  -> failed  (any step)
```

`pre_pdf_check_ready` is entered by approving CV draft review (ADR-026); it is a mandatory-but-
skippable gate — `paused_before_export` is reached either by running the pre-PDF check (any
verdict) or by explicitly skipping it, and export requires that gate to be cleared. `export_running`
remains a valid (legacy) precondition for `POST /workspaces/:id/export-cv` for backward
compatibility but nothing in the current flow transitions into it.

## Insufficient Context Rule

The line ranges in `## Docs to Read` are a starting point, not a ceiling.

If the listed sections are not enough to safely implement `## State Machine` or satisfy
`## Acceptance Criteria` — Claude Code must either:
- read more lines from the same document, or
- stop and explicitly ask what is missing.

Never guess or derive logic from incomplete context. This rule overrides any "read only X" instruction.

## CURRENT_TASK.md Authoring Rules

When writing a new CURRENT_TASK.md, always include:

- `## Docs to Read` — list only the specific sections needed. Use exact line ranges when they are stable and available; otherwise use precise section names.
  Example: `docs/03_domain_model.md lines 698–709 (section 8.6 — state transitions)` or `docs/08_ai_pipeline.md section 6.8 — Prompt-Step Source Selection`.
  Do not list a whole file unless the whole file is genuinely needed.
  For tasks that write a new service, also list every service the new service will call,
  with the specific method signatures to read:
  Example:
  - `src/prompt-runs/prompt-runs.service.ts` — `create()` DTO shape
  - `src/ai-runs/ai-runs.service.ts` — `saveFailed()` / `saveSuccess()` parameter shape

- `## State Machine` — required for any task with status or enum transitions. Use a table:

  | Action | Precondition | Field A after | Field B after | Status after |
  |---|---|---|---|---|

  When this table is present, Claude Code must not derive transitions from docs — use the table directly.
  If anything in the table seems inconsistent with a referenced doc, stop and ask — do not silently correct it.

- `## Key Invariants` — list any non-obvious rules that affect this task's implementation.
  Example: `canProceedToPrompt2 checks status, not reviewState — see ADR-015`

- `## Git Instructions` — always use this commit/PR order:
  1. `git add <files>`
  2. `git commit -m "feat: TASK-XXX ..."`
  3. `git push -u origin <branch-name>`
  4. `gh pr create --title "..." --body "..." --base main`
  5. Stops completely. Does not do anything else.
  Never call `gh pr create` before `git push` — it will always fail.

## Operating Rules

- Work on one task at a time.
- Do not choose the next task automatically.
- **Plan-first protocol**: before any code changes, present a written plan (files to change, approach, risks) and pause. Start implementation only after explicit user confirmation ("go" / "approved" / similar keyword).
- **Branch-first protocol**: immediately after the user confirms the plan ("go" / "approved") and before the first `Write`/`Edit` call, run `git status`/`git branch --show-current` and confirm the current branch matches the new task (per ADR-014: `task/TASK-XXX-short-description`, branched from an up-to-date `main`). If the working branch is a leftover from a previous task, switch to `main`, `git pull --ff-only`, then create the new task branch — before touching any files. Do not discover this gap after edits have already piled up on the wrong branch. When the branch being created is an **epic base branch** (per ADR-025, `task/TASK-XXX-<epic-short-name>-base`), also configure a GitHub branch protection rule on it with the same required-status-checks as `main` (`gh api repos/:owner/:repo/branches/:branch/protection -X PUT ...` with `required_status_checks`, or the GitHub UI equivalent) before any sub-task PR is opened into it — without this, the PR "Merge" button is not actually blocked on CI passing (see ADR-025's 2026-07-26 process note).
  When the branch being created is a **sub-task of a multi-task epic** (branching off an epic base branch per ADR-025), first check `gh pr list --base task/TASK-XXX-<epic-short-name>-base` (or `git log`) for the immediately-preceding sub-task's PR. If it exists and is still open/unmerged, stop and ask the user whether to wait for it to merge first or to proceed in parallel anyway — do not silently branch off the base while a prior sub-task PR is still pending (see ADR-025's 2026-07-26 process note on TASK-077).
- **Task-file-first protocol**: immediately after the Branch-first protocol lands on the new task branch, and before the first implementation `Write`/`Edit` call, (re)write `project-management/CURRENT_TASK.md` with this task's full spec per `## CURRENT_TASK.md Authoring Rules` (Context, Mockup reference if any, Files Affected, Docs to Read, State Machine if applicable, Key Invariants, Acceptance Criteria, Test Requirement, Done Definition, Git Instructions) — sourced from the backlog entry (`docs/07_task_backlog.md`) plus anything the user specified in this session. `CURRENT_TASK.md` is the file `## Read First` and the Task Closure Checklist both treat as authoritative for the active task; it must describe the task actually being worked on from the first implementation commit onward, not only once the task closes. Do not work from the backlog entry directly while leaving `CURRENT_TASK.md` describing a previous task.
- Do not silently change product scope.
- If a task cannot be completed safely, mark/suggest `BLOCKED` instead of inventing a workaround.
- Update project-management files only when the current task requires it.
- Keep changes reviewable and small.

## Architecture Rules

- Backend-first MVP. The concrete tech stack per app (TypeScript, NestJS, Prisma for `apps/api`;
  Next.js/React for `apps/web`) is documented in each app's own `CLAUDE.md` — this section covers
  cross-cutting product/architecture decisions only, not a per-app stack list.
- PostgreSQL stores metadata and workflow state.
- Filesystem stores physical artifacts.
- Do not store generated PDFs or large text artifacts only in PostgreSQL.
- Use stable canonical internal artifact names.
- Use human-readable download names separately when needed.

## PostgreSQL / Docker Rules

- PostgreSQL must use a named Docker volume: `postgres_data`.
- Data must survive container restart, Docker Desktop restart and `docker compose down`.
- `docker compose down -v` is destructive and must be documented as deleting local data.
- Add or update persistence checks when changing Docker/PostgreSQL setup.

## Artifact Rules

Canonical internal files:

- `00_vacancy_source.txt`
- `01_vacancy_analysis.md/json`
- `01_skip_reason.md/json`
- `02_targeted_cv_content.md/json`
- `03_pre_pdf_check.md/json` optional/P1
- `04_cv_export.html/pdf/json/md`
- `05_final_check.md/json` optional/P1
- `cover_letter.md/pdf` Phase 2

New workspaces use underscore-based slugs. Role slugs allow English letters, Unicode Cyrillic letters and underscores. Company slugs may also preserve numbers.

## Prompt Pipeline Rules

- Prompt 1 produces vacancy analysis and `apply` / `maybe` / `skip` recommendation.
- After Prompt 1, always pause for human review.
- `apply` and `maybe` continue only after user approval.
- `skip` creates `01_skip_reason.md/json` and stops the pipeline by default.
- Prompt 2 runs only after approval or manual override.
- PDF export is the default physical CV output.
- Prompt 5 (final check) is optional/P1, not a first MVP blocker.
- Prompt 3 (pre-PDF check) is a mandatory-but-skippable gate before export (ADR-026, supersedes
  ADR-009 for Prompt 3 only): CV draft approval moves the workspace to `pre_pdf_check_ready`, and
  export is blocked until that gate clears — either by running the check (any readiness verdict) or
  by an explicit "skip pre-PDF check" action. The AI's readiness verdict itself never blocks export;
  only having run-or-skipped does.
- If Prompt 3 artifacts exist, Step 4 document export must read and apply their recommendations; if they do not exist (gate cleared via skip), export must not require them.
- Cover letter generation is Phase 2.

## AI Provider Rules

- Use an AI provider abstraction.
- Do not couple application logic directly to provider SDKs.
- Store AI run metadata and token usage when provider returns it.
- Unit tests must use mocks/fakes, not real AI calls.
- AI output must be validated before being trusted.

## Anti-Overclaiming Rules

The generated CV must not invent experience.

Always preserve these safety rules:

- Mark unsupported claims as `needs evidence`.
- Separate commercial experience from personal/project experience.
- Do not present personal AI/FastAPI/OpenAI/MCP/Claude Code work as commercial production experience.
- Do not present Docker/NestJS/Kubernetes/AWS as commercial core skills unless evidence is added later.
- Keep German language risk and English communication risk explicit when relevant.

## Testing Rules

- Unit tests are required for deterministic MVP logic.
- Run `npm run test` after code changes when tests exist.
- Core P0 tests must cover slug normalization, workspace validation, canonical artifact naming, skip handling, approval gates and anti-overclaiming guard.
- Do not make unit tests depend on real AI providers.
- Use temporary directories or mocks for filesystem tests.
- Record important manual checks in `project-management/TEST_LOG.md`.
- **One source file, one spec file, same name.** Every `x.ts` that exports
  testable logic gets tests in `x.spec.ts` — never inside another file's
  spec file, even a related one. When a schema/service/util is split out of
  an existing file into its own file, its tests move with it into their own
  matching spec file in the same commit or PR. Before adding tests for
  `foo.ts`, check whether `foo.spec.ts` already exists; if tests for it are
  found living inside a differently-named spec file, that is a bug — move
  them, don't add a second copy. This makes coverage discoverable by
  filename instead of by memory or grep (see ADR-020: `pre-pdf-check.schema.ts`
  tests were found inside `cv-content.schema.spec.ts` during TASK-042 review).

## Documentation Rules

- Keep docs consistent with product scope.
- Do not move P1/P2 features into MVP unless explicitly requested.
- If existing docs need changes beyond the current task, propose them first and wait for approval.
- Update `project-management/CHANGELOG.md` after meaningful completed work.
- **Any change to project architecture must be reflected in documentation in the same change**,
  not deferred. "Architecture" here means: a new/removed/renamed module or service, a changed
  module dependency direction, a new or changed HTTP endpoint or data flow step, a changed status/
  state-machine transition, or a new binding decision (candidate for a new ADR in
  `project-management/DECISIONS.md`). Concretely, check and update whichever of these actually
  went stale:
  - This root `CLAUDE.md`'s `## High-Level Architecture` (Data Flow, Key Invariants, PostgreSQL
    Models, Workspace Status Sequence) if the cross-app product/state-machine picture changed.
  - The affected app's own `CLAUDE.md` (`apps/api/CLAUDE.md` / `apps/web/CLAUDE.md`) — "Структура
    проекта" and "Архитектурные правила" sections — if that app's internal module layout or
    boundary rules changed. These are the authoritative, current source for per-app structure (see
    `## Repository Layout`); letting them go stale defeats their purpose.
  - `project-management/DECISIONS.md`, if the change overrides or supersedes an existing Accepted
    ADR, or establishes a new one worth not re-debating later.
  - The relevant `docs/*.md` requirement/architecture doc, per the existing rule above (propose
    first if the change is beyond current task scope).
- Every new HTTP endpoint must be documented with `@ApiOperation({ summary: '...' })` on the controller method, and every new/changed DTO field must have `@ApiProperty()` (or `@ApiPropertyOptional()`). This applies to all new endpoints going forward, not just the ones covered by TASK-PH-008 — see ADR-019.
- `project-management/completed-tasks/` (see its own README) holds one archived `CURRENT_TASK.md` snapshot per closed task — only open a specific file there when `TASK_BOARD.md`, `TEST_LOG.md`, `docs/07_task_backlog.md` and git log/PR history are genuinely insufficient and the task at hand needs fine-grained detail of what happened during one particular past task. Do not read this folder as routine background context — it is not summarized, so opening files there is comparatively token-expensive.

## Task Closure Checklist

This checklist is a **hard gate**, not a suggestion. `git add` / `git commit` for a task must never happen until every item below is verified — and the verification must be shown to the user as explicit ✅/❌ lines in the response, in the same turn as (immediately before) the commit. If any item is ❌, fix it first; do not commit with open items and "clean up later" — a later unrelated commit is not an acceptable place to retroactively close a task.

**Current task is definitively closed:**
- All Acceptance Criteria in `CURRENT_TASK.md` marked `[x]`
- If the actual implementation ended up diverging from what `CURRENT_TASK.md` described at task-file-first time (e.g. review feedback changed the approach, an assumption made during planning turned out wrong once compared against real mockups/docs/code), add a short "Progress Notes" section to `CURRENT_TASK.md` capturing what changed and why, before archiving. Acceptance Criteria still being met is not sufficient on its own — `CURRENT_TASK.md` must describe what was actually built, not only what was originally planned.
- `project-management/TEST_LOG.md` has an entry with commands, result and evidence, dated and referencing the task ID
- `project-management/TASK_BOARD.md` row: status → `DONE`, PR/commit column filled (not left as `TODO`/`IN_PROGRESS`)
- `CURRENT_TASK.md`'s final content copied verbatim to `project-management/completed-tasks/TASK-XXX-short-name.md` (same task ID/short name as the branch), in the same commit as the rest of the closure — never a separate PR for this copy. Do this before `CURRENT_TASK.md` is overwritten by the next task's content.
- `project-management/CURRENT_TASK.md` no longer describes this task as active/in-progress (either replaced by the next task after user selection, or explicitly marked "no active task")

**Next task is unambiguous:**
- `TASK_BOARD.md` — `Current Focus` section updated (active task cleared, last-completed task named, recommended next task named)

**Before running `git commit`, restate the checklist inline** (e.g. "Closure check: [x] AC all checked, [x] TEST_LOG entry added, [x] TASK_BOARD row DONE, [x] archived to completed-tasks/, [x] CURRENT_TASK updated → committing now"). Do not silently commit code changes bundled with doc updates that were prepared for a *different* step (e.g. carrying over "next task" bookkeeping from the previous task's closure while leaving the current task's own row at `TODO`) — re-verify the doc state matches the code actually being committed, not stale text left over from an earlier commit on the same branch.

**Immediately after that checklist restatement, and still before running `git commit`, ask the user whether to run `/code-review` against the working diff first.** Wait for an explicit yes/no — do not run `/code-review` unprompted, and do not skip asking just because an inline self-review was already done manually earlier in the task. This is a separate question from the checklist restatement above, not implied by it.

**In the same pre-commit turn, also ask the user whether root `README.md` needs updating for this task** — a plain yes/no question, not implied by anything else. Only invoke the `documentation-writer` skill (or otherwise edit `README.md`) if the user answers yes. Never invoke it unprompted — the user explicitly wants the cheap yes/no question, not an unsolicited README pass, to keep this check low-cost by default.

Then commit, push, create PR — and stop completely. Do not select the next task automatically.

## Git / Review Rules

- Keep commits task-focused.
- Do not mix unrelated tasks in one change.
- Summarize changed files and verification steps after implementation.
- Never commit secrets, API keys, `.env`, generated local databases, or private local paths that should remain machine-specific.
