# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@project-management/DECISIONS.md

## Project Purpose

JobFlow CV Pipeline is a backend-first application for AI-assisted vacancy analysis, evidence-based targeted CV generation and physical CV PDF export for real job applications.

The project is also a portfolio-quality backend project for Node.js/TypeScript/NestJS/PostgreSQL/Prisma/Docker/AI workflow experience.

## Read First

Before implementation, read:

- The active GitHub Issue for this task (its number is in the branch name, `task/ISSUE-<n>-...` —
  per ADR-030) — `gh issue view <n>`. Its body is the full spec (Context, Affects, Docs to
  Read, Key Invariants, Acceptance Criteria, Test Requirement, Definition of Done, Dependencies),
  format defined in `.claude/skills/issues/SKILL.md`.
- The doc sections or line ranges listed in the issue's `## Docs to Read` section — read those
  targeted sections first, not whole files.

## Finding Epics and Phases

When asked what the next epic/phase is, or to analyze/scope one that isn't already named in the
request, check in this order:

1. `docs/05_epics.md` — why each epic exists (Goal/Business Value/Scope/Acceptance Criteria per
   epic). This is the authoritative epic definition.
2. `docs/06_roadmap.md` — phase order, dependencies between phases, and each phase's Done
   Criteria/Physical Result. Epics and phases are numbered independently but map roughly 1:1
   (e.g. EPIC-24 = Phase 17) — check both files, not just one.
3. `docs/07_task_backlog.md` — frozen historical record (ADR-030), only useful for epics/phases
   broken down *before* 2026-08-19. For anything broken down after that date, its tasks live as
   GitHub Issues on the `JobFlow CV Pipeline` Project
   (https://github.com/users/strakhovdenya/projects/1), grouped by milestone per epic phase — check
   there, not this file, for already-broken-down tasks of a recent epic.
4. A dedicated methodology doc may exist for a specific epic (e.g. `docs/10_calibration_and_parity.md`
   for EPIC-24) — check `docs/` for a same-topic file before assuming `05_epics.md`'s summary is
   the full picture.
5. A `docs/research-*.md` file may exist for a specific epic (e.g. `docs/research-ai-output-calibration.md`
   for EPIC-24) — an implementation-technique research note (external best-practice comparison,
   concrete format/tooling recommendations) that supplements the methodology doc without
   overriding any decision already made in the epic's PRD/plan. Read it alongside the methodology
   doc, not instead of it.

**Do not treat `project-management/EPIC_PROGRESS.md` as authoritative for current status** — its
own `## Progress Rules` require updating it whenever `TASK_BOARD.md` changes, but `TASK_BOARD.md`
itself is frozen as of 2026-08-19 (ADR-030) and this has not been kept up in practice even before
that; it has been observed showing phases as `TODO`/`IN_PROGRESS` that are actually `DONE`. For
status of any work from 2026-08-19 onward, cross-check against the open/closed state of issues and
milestones on the `JobFlow CV Pipeline` GitHub Project
(https://github.com/users/strakhovdenya/projects/1); for anything before that date, cross-check
against `project-management/TASK_BOARD.md` and git history.

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
  -> HtmlRendererService -> 04_cv_export.html  (registers with downloadFileName, variant=design)
  -> PdfExportService -> 04_cv_export.pdf      (registers with downloadFileName, variant=design)
  -> AtsHtmlRendererService -> 04_cv_export_ats.html  (registers with downloadFileName, variant=ats)
  -> PdfExportService -> 04_cv_export_ats.pdf         (registers with downloadFileName, variant=ats)
  -> NO AiRun created, NO tokens consumed (both variants — ADR-012)
  <- status: cv_pdf_generated

GET /artifacts/:id/download  (generic, used for all four export artifacts — ADR-036)
  <- streams artifact file; Content-Disposition uses GeneratedArtifact.downloadFileName
     (set at registration time above), falling back to canonicalFileName when null
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
`ApplicationWorkspace` → `ManualNote` (many) → `ManualNoteApplication` (many) ← `PromptRun`
(each `ManualNoteApplication` links one `ManualNote` to the `PromptRun` whose input actually
included that note's text — ISSUE-286 step-attribution; replaces the old single accumulating
`manualNote` string field)  
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

The line ranges in the active GitHub Issue's `## Docs to Read` section are a starting point, not a
ceiling.

If the listed sections are not enough to safely implement whatever state-machine changes the issue
requires or satisfy its `## Acceptance Criteria` — Claude Code must either:
- read more lines from the same document, or
- stop and explicitly ask what is missing.

Never guess or derive logic from incomplete context. This rule overrides any "read only X" instruction.

## GitHub Issue Authoring Rules

(Supersedes the old "CURRENT_TASK.md Authoring Rules" — ADR-030.) `.claude/skills/issues/SKILL.md`'s
"Формат Issue" is the **single, authoritative** template (Context, Affects, Docs to Read, Key
Invariants, Acceptance Criteria, Test Requirement, Definition of Done, Dependencies) — read it
there, not here. Do not restate or copy its field-by-field content into this file; a second copy
of the same template is exactly the multi-file-drift problem ADR-030 removed elsewhere, and it
would only reintroduce it at the template level. This section only holds the two rules that are
genuinely about workflow, not template content, and so don't belong in the issues skill itself:

- **State machine changes** (status or enum transitions): if the issue's `## Key Invariants` or a
  dedicated subsection includes a transition table, Claude Code must not derive transitions from
  docs instead — use the table directly. If anything in the table seems inconsistent with a
  referenced doc, stop and ask — do not silently correct it.
- **Git/PR order** (applies once implementation starts, per Operating Rules below):
  1. `git add <files>`
  2. `git commit -m "<type>: ISSUE-<n> ..."` — `<type>` is a real conventional-commit type matching
     the change (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`; see recent `git log` for this
     repo's actual usage), not always `feat`.
  3. `git push -u origin <branch-name>`
  4. `gh pr create --title "..." --body "Closes #<n> ..." --base main` (`Closes #<n>` auto-closes
     the issue on merge — always include it, do not close the issue manually as a separate step)
  5. Stops completely. Does not do anything else.
  Never call `gh pr create` before `git push` — it will always fail.

## Operating Rules

- Work on one task at a time.
- Do not choose the next task automatically.
- **Plan-first protocol**: before any code changes, present a written plan (files to change,
  approach, risks) and pause. Start implementation only after explicit user confirmation ("go" /
  "approved" / similar keyword).
- **Issue-first protocol** (ADR-030, replaces the old "Task-file-first protocol"): before the
  first implementation `Write`/`Edit` call, make sure a fully-specced GitHub Issue exists for this
  task — either already created (e.g. via `.claude/skills/issues` from an epic plan) or created now
  for standalone/ad-hoc work, following `## GitHub Issue Authoring Rules` above. For an ad-hoc
  issue, check `gh issue list --search "in:title <keywords>" --state all` first — do not create a
  duplicate of an issue that already covers this task. The issue is the
  file `## Read First` and the Task Closure Checklist both treat as authoritative for the active
  task — there is no local spec file to keep in sync with it. Do not start implementing against an
  issue that only has a title and no body — fill in the full body first. **Every** issue used to
  track a task — plan-derived or ad-hoc, no exception — must be on the `JobFlow CV Pipeline` GitHub
  Project (`gh project item-add 1 --owner strakhovdenya --url <issue-url>`) before work starts; a
  `milestone` is only set when the issue is part of a multi-phase epic (the `issues` skill already
  does this for plan-derived issues) — a standalone issue has no milestone, but still goes on the
  Project. An issue not on the Project is invisible to the "what's already in flight" check every
  other skill (`prd`, `issues`) relies on.
- **Branch-first protocol**: immediately after the user confirms the plan ("go" / "approved") —
  and after the Issue-first protocol above has confirmed which issue number this work is against —
  run `git status`/`git branch --show-current` and confirm the current branch matches the new task
  (per ADR-030: `task/ISSUE-<n>-short-description`, where `<n>` is the GitHub issue number,
  branched from an up-to-date `main`). If the working branch is a leftover from a previous task,
  check `git status` for uncommitted changes first — commit/push them on that branch (or ask the
  user what to do with them) before switching; never switch branches carrying unrelated dirty state
  onto the new task's branch. Once clean, switch to `main`, `git pull --ff-only`, then create the
  new task branch — before touching any files. Do not discover this gap after edits have already
  piled up on the wrong branch. As soon as the branch is created, set the issue's GitHub Project
  Status to "In Progress" (`gh project item-edit --id <item-id> --field-id
  PVTSSF_lAHOAfTJXM4Bg0i5zhfypqs --project-id PVT_kwHOAfTJXM4Bg0i5 --single-select-option-id
  47fc9ee4`; find `<item-id>` via `gh project item-list 1 --owner strakhovdenya --format json -q
  '.items[] | select(.content.number==<n>) | .id'`) — issues default to "Todo" and only
  auto-flip to "Done" on close, so without this step the Project board never shows work actually in
  flight, only "not started" vs "finished". When the
  branch being created is an **epic base branch** (per ADR-025, now
  `task/ISSUE-<tracking-issue-n>-<epic-short-name>-base`, where `<tracking-issue-n>` is the
  lowest-numbered GitHub issue `.claude/skills/issues` created for that epic — typically the first
  task of the epic's first phase; resolve this number here, at branch-creation time, since the
  plan/PRD are written before any issue exists and so can only use a placeholder), also configure
  a GitHub branch protection rule on it with the same required-status-checks as `main` (`gh api
  repos/:owner/:repo/branches/:branch/protection -X PUT ...` with `required_status_checks`, or the
  GitHub UI equivalent) before any sub-task PR is opened into it — without this, the PR "Merge"
  button is not actually blocked on CI passing (see ADR-025's 2026-07-26 process note).
  When the branch being created is a **sub-task of a multi-task epic** (branching off an epic base
  branch per ADR-025), first check `gh pr list --base task/ISSUE-<tracking-issue-n>-<epic-short-name>-base`
  (or `git log`) for the immediately-preceding sub-task's PR. If it exists and is still
  open/unmerged, stop and ask the user whether to wait for it to merge first or to proceed in
  parallel anyway — do not silently branch off the base while a prior sub-task PR is still pending
  (see ADR-025's 2026-07-26 process note on TASK-077, from before the ADR-030 renaming).
- Do not silently change product scope.
- If a task cannot be completed safely, comment `BLOCKED: <reason>` on the GitHub Issue and stop —
  do not close it and do not invent a workaround.
- Update project-management files only when the current task requires it.
- Keep changes reviewable and small.
- **Work surfaces mid-task that isn't part of the active issue's Acceptance Criteria** (a bug,
  missing edge case, or improvement noticed while implementing something else): decide which
  bucket it's in before touching it —
  - **Actually required for the active issue's own AC to be true** (e.g. a bug that makes the
    feature you're building not work) — fix it in the current branch/PR, no new issue needed; note
    it in the PR description so the reviewer knows it wasn't in the original issue body.
  - **Unrelated to the active issue** (Git/Review Rules: "do not mix unrelated tasks in one
    change") — do not fix it now. Create a new GitHub Issue for it (ad-hoc, full body per
    `## GitHub Issue Authoring Rules`, added to the Project per the Issue-first protocol above),
    tell the user it was found and filed, and continue the active issue. Only fold it into the
    current branch if the user explicitly says to bundle it in.
- **Hotfix** (urgent, production-affecting, no pre-existing issue): still goes through Issue-first
  and Branch-first — no exception, even retroactively (create the issue immediately if there was no
  time to create it before starting, same turn as the first `Write`/`Edit`) — a hotfix with no
  issue leaves no record of what shipped or why. What's allowed to compress: Plan-first can be a
  one- or two-line plan instead of a full writeup (urgency + the user's own report substitute for
  a detailed proposal), no PRD/plan/milestone is needed (single ad-hoc issue, not an epic), and the
  branch comes directly off `main`. What does not compress: the issue still needs real Acceptance
  Criteria and Test Requirement (even if short), and the full Task Closure Checklist still applies
  before commit — a hotfix is exactly the case where skipping verification is most tempting and
  least acceptable.

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
- `04_cv_export_ats.html/pdf`
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
- **The one standing exception**: a workspace's manual note is a forced-priority human instruction
  and bypasses this gate across every step that reads it (Prompt 1, Prompt 2, skip-reason,
  cover-letter) — ADR-034. It must always be marked distinguishable from AI-verified content
  (`manual_note_forced_claims`, forced `TargetedCvBullet.user_forced`, and the
  `"user-forced, unverified"` status literal) and surfaced to a human before export/send. No other
  content gets this exception.

## Testing Rules

- Unit tests are required for deterministic MVP logic.
- Run `npm run test` after code changes when tests exist.
- Core P0 tests must cover slug normalization, workspace validation, canonical artifact naming, skip handling, approval gates and anti-overclaiming guard.
- Do not make unit tests depend on real AI providers.
- Use temporary directories or mocks for filesystem tests.
- Record test evidence (commands, result, evidence) as a comment on the active GitHub Issue before closing it — see Task Closure Checklist. (`project-management/TEST_LOG.md` is frozen — ADR-035 — do not add new entries there.)
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
- `project-management/completed-tasks/` (see its own README) is frozen (ADR-030) — it holds one
  archived `CURRENT_TASK.md` snapshot per task closed before 2026-08-19; only open a specific file
  there when `TASK_BOARD.md`, `TEST_LOG.md`, `docs/07_task_backlog.md` and git log/PR history are
  genuinely insufficient and the task at hand needs fine-grained detail of what happened during one
  particular past task from before that date. Do not read this folder as routine background
  context — it is not summarized, so opening files there is comparatively token-expensive. For
  tasks closed on or after 2026-08-19, the closed GitHub Issue itself is that record — no separate
  file to open.

## Task Closure Checklist

This checklist is a **hard gate**, not a suggestion (rewritten per ADR-030 — GitHub Issues replace
`CURRENT_TASK.md`/`TASK_BOARD.md`/`completed-tasks/` as the closure record). `git add` / `git
commit` for a task must never happen until every item below is verified — and the verification
must be shown to the user as explicit ✅/❌ lines in the response, in the same turn as (immediately
before) the commit. If any item is ❌, fix it first; do not commit with open items and "clean up
later" — a later unrelated commit is not an acceptable place to retroactively close a task.

**Current task is definitively closed:**
- All Acceptance Criteria in the GitHub Issue's body marked `[x]` (edit the issue body's checklist
  directly, `gh issue edit <n> --body "..."`, or check the boxes via the GitHub UI/API — the
  checklist must actually reflect done state, not just exist)
- If the actual implementation ended up diverging from what the issue described when work started
  (e.g. review feedback changed the approach, an assumption made during planning turned out wrong
  once compared against real mockups/docs/code), add a comment on the issue capturing what changed
  and why, before closing. Acceptance Criteria still being met is not sufficient on its own — the
  issue must reflect what was actually built, not only what was originally planned.
- A comment on the GitHub Issue with test evidence (commands run, result, evidence — same content
  `TEST_LOG.md` used to hold, per ADR-035) is posted before closing, dated and referencing the
  issue number
- The PR's description includes `Closes #<n>` so the issue auto-closes on merge (do not close it
  manually as a separate step, and do not merge without this — an unclosed issue after merge is a
  bug in the PR, not something to fix after the fact)

**Next task is unambiguous:**
- State in the response which issue(s) are now unblocked/open next on the milestone or Project
  board — GitHub itself tracks "what's left" (open issues, milestone progress); there is no
  separate file to update for this.

**Before running `git commit`, restate the checklist inline** (e.g. "Closure check: [x] AC all
checked in issue #NNN, [x] test evidence comment posted, [x] PR body has 'Closes #NNN' → committing now").
Do not silently commit code changes while the issue's checklist still shows unchecked boxes that
are actually done — re-verify the issue body matches the code actually being committed, not a
stale checklist state from earlier in the task.

**Immediately after that checklist restatement, and still before running `git commit`, ask the user whether to run `/code-review` against the working diff first.** Wait for an explicit yes/no — do not run `/code-review` unprompted, and do not skip asking just because an inline self-review was already done manually earlier in the task. This is a separate question from the checklist restatement above, not implied by it.

**In the same pre-commit turn, also ask the user whether root `README.md` needs updating for this task** — a plain yes/no question, not implied by anything else. Only invoke the `documentation-writer` skill (or otherwise edit `README.md`) if the user answers yes. Never invoke it unprompted — the user explicitly wants the cheap yes/no question, not an unsolicited README pass, to keep this check low-cost by default.

Then commit, push, create PR — and stop completely. Do not select the next task automatically.

## Git / Review Rules

- Keep commits task-focused.
- Do not mix unrelated tasks in one change.
- Summarize changed files and verification steps after implementation.
- Never commit secrets, API keys, `.env`, generated local databases, or private local paths that should remain machine-specific.
