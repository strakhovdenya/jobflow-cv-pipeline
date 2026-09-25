# CLAUDE.md

This file is the always-on constitution and routing guide for Claude Code in this repository. Keep task-specific procedures in skills and detailed system knowledge in the authoritative docs/app-level CLAUDE files.

@project-management/DECISIONS.md

## Project Purpose

JobFlow CV Pipeline is a backend-first application for AI-assisted vacancy analysis, evidence-based targeted CV generation, and deterministic CV PDF export for real job applications.

It is also a portfolio-quality backend project demonstrating Node.js/TypeScript/NestJS/PostgreSQL/Prisma/Docker and controlled AI workflows.

## Read First

Before implementation:

- Load the mandatory metaskills for the affected area (see **Required Skills** below).
- Read the active GitHub Issue. Task branches use `task/ISSUE-<n>-...` (ADR-030); the Issue body is the execution spec.
- Read the targeted sections listed in the Issue's `## Docs to Read`. Those ranges are a starting point, not a ceiling.
- When an approved plan is about to enter implementation, load `task-lifecycle` before Issue/branch/Project-state changes or the first source edit. Reload it when implementation is complete and the task is about to enter closure/commit.

If the listed context is insufficient to safely satisfy the Acceptance Criteria, read further or stop and ask. Never derive behavior from incomplete context.

## Routing: Where Detailed Rules Live

- **Task state transitions into implementation and closure/commit/PR:** `.claude/skills/task-lifecycle/SKILL.md` (not for research/planning-only work; Ralph coding agents are excluded because the controller owns their Git/GitHub lifecycle)
- **Issue generation / Issue body format:** `.claude/skills/issues/SKILL.md`
- **Epic/phase discovery or current epic status:** `.claude/skills/epic-discovery/SKILL.md`
- **PRD / implementation planning:** corresponding `prd` / `plan` skills
- **Backend structure, commands, app rules:** `apps/api/CLAUDE.md`
- **Frontend structure, commands, app rules:** `apps/web/CLAUDE.md`
- **Cross-cutting architecture:** `docs/04_architecture.md` plus relevant ADRs
- **Historical/binding decisions:** `project-management/DECISIONS.md`
- **Ralph autonomous controller:** `.claude/ralph/README.md`

Do not duplicate an authoritative procedure into this file merely to make it more visible. Hard requirements that must not depend on model memory should be enforced by hooks/scripts where practical.

## Repository Layout

This is a two-app monorepo (ADR-023). Each app is self-contained with its own `package.json`, `node_modules`, lockfile, and `tsconfig.json`; there are no npm workspaces.

```text
apps/
  api/    NestJS backend — primary MVP focus
  web/    Next.js dashboard
docs/, project-management/, .github/, .claude/   shared repository concerns
docker-compose.yml                                shared local infrastructure
```

Claude Code loads each app's own `CLAUDE.md` when working there. Treat those files as authoritative for app-specific module maps, commands, and change rules.

`docker-compose.yml` orchestrates PostgreSQL, Redis, API, and web. Preserve the existing container/network assumptions; consult the compose file and app docs rather than copying those implementation details here.

## Claude Code Configuration

`.claude/settings.json` contains project-wide deterministic hooks:

- PreToolUse `Write|Edit`: required-skill gate.
- PreToolUse `Bash`: task/archive checks and git closure gate for commit/push.
- PostToolUse `Skill`: records loaded skills.
- PostToolUse `Write|Edit`: app-local lint/typecheck feedback.

Hooks are enforcement/backstops; they do not replace the task lifecycle or engineering judgement.

## Commands

Per-app dev/build/lint/typecheck/test commands live in the affected app's `CLAUDE.md`.

Root Docker operations:

```bash
docker compose up -d postgres
docker compose down
# DESTRUCTIVE: deletes PostgreSQL data
docker compose down -v
```

## High-Level Architecture

The backend is a NestJS monolith with module boundaries around pipeline stages; the web app is a secondary dashboard.

The detailed end-to-end data flow is authoritative in `docs/04_architecture.md`. Do not maintain a second endpoint-by-endpoint copy here.

### Key Invariants

- `PromptRun` links to the `PromptTemplate` version and `AiRun`; generated artifacts link to their producing prompt run where applicable.
- Deterministic document export is **not** an AI prompt. Never create an `AiRun` for export.
- Prompt 2 is blocked until apply/maybe is explicitly approved or the allowed override is logged.
- Manual overrides must be persisted for auditability.
- Filesystem storage is rooted by `STORAGE_ROOT`; code must never access artifacts outside the allowed root.
- Slug handling must preserve the project's Unicode/Cyrillic rules; do not replace `\p{Script=Cyrillic}` with a hand-written character list.
- Every write to `ApplicationWorkspace.status` goes through `WorkspaceStatusService.transition()` (ADR-038). Do not write status directly.
- At most one pending/running `PromptRun` may exist per workspace + step; preserve the database-backed concurrency invariant.
- Prompt 3 is a mandatory-but-skippable gate before export. Its readiness verdict does not itself block export; the gate is cleared by run-or-skip.
- Regenerating the CV after Prompt 3 invalidates stale Prompt 3 artifacts and re-enters review/gating.

For state-machine work, read the current transition table/source and the relevant ADRs. If the active Issue contains an explicit transition table, treat that table as the task contract; if it conflicts with referenced docs, stop and ask rather than silently reconciling it.

## Architecture Rules

- Backend-first MVP. App-specific technology and module rules live in app-level `CLAUDE.md`.
- PostgreSQL stores metadata and workflow state.
- Filesystem stores physical artifacts.
- Do not store generated PDFs or large text artifacts only in PostgreSQL.
- Use stable canonical internal artifact names and separate human-readable download names.

## Security Rules

Security is always-on and intentionally remains in this root file.

- Treat all externally originated values as untrusted until validated: body/query/params, cookies, URL params, file/folder names, uploaded/imported content, and AI output.
- Untrusted data must never reach a sink unchecked. Reads count as much as writes:
  - filesystem: resolve paths and verify containment before stat/read/write/delete/stream;
  - URLs/redirects/`fetch`/`href`: allowlist scheme and host; prevent SSRF/open redirects/`javascript:`;
  - shell/`child_process`: argument arrays, never interpolated command strings;
  - SQL: Prisma or parameterized tagged templates, never concatenated SQL;
  - HTML/`dangerouslySetInnerHTML`/PDF templates: escape or sanitize;
  - dynamic object keys / input-derived regexes: safe maps/objects and escaped patterns.
- Prefer one reusable guard per sink type. Do not bypass a guard with a direct sink call.
- Keep containment/validation visible in the sink function when static analysis requires local evidence.
- Before adding a sink, answer: **where does this value come from?**

## PostgreSQL / Docker Rules

- PostgreSQL uses the named volume `postgres_data`.
- Data must survive container restart, Docker Desktop restart, and normal `docker compose down`.
- `docker compose down -v` is destructive and must be documented as such.
- Update persistence verification when changing PostgreSQL/Docker persistence behavior.

## Artifact Rules

Canonical internal artifacts:

- `00_vacancy_source.txt`
- `01_vacancy_analysis.md/json`
- `01_skip_reason.md/json`
- `02_targeted_cv_content.md/json`
- `03_pre_pdf_check.md/json` (optional/P1 output; gate semantics below)
- `04_cv_export.html/pdf/json/md`
- `04_cv_export_ats.html/pdf`
- `05_final_check.md/json` (optional/P1)
- `cover_letter.md/pdf` (Phase 2)

New workspaces use underscore-based slugs. Role slugs allow English letters, Unicode Cyrillic letters, and underscores; company slugs may also preserve numbers.

## Prompt Pipeline Rules

- Prompt 1 produces vacancy analysis and an `apply` / `maybe` / `skip` recommendation, then always pauses for human review.
- `apply` and `maybe` continue only after approval; `skip` records the skip reason and stops by default.
- Prompt 2 runs only after approval or the allowed audited override.
- Prompt 3 is a mandatory-but-skippable pre-export gate (ADR-026). Running it with any verdict or explicitly skipping it clears the gate.
- If Prompt 3 artifacts exist, export must apply their recommendations; if the gate was skipped, export must not require those artifacts.
- PDF export is deterministic and the default physical CV output.
- Prompt 5 is optional/P1; cover-letter generation is Phase 2.

## AI Provider Rules

- Depend on an AI-provider abstraction, not provider SDKs in application logic.
- Store provider/model/run metadata and token usage when available.
- Unit tests use mocks/fakes, never real AI calls.
- Validate AI output before trusting it.

## Anti-Overclaiming Rules

Generated CV content must not invent experience.

- Mark unsupported claims as needing evidence.
- Keep commercial experience distinct from personal/project experience.
- Do not present personal AI/FastAPI/OpenAI/MCP/Claude Code work as commercial production experience.
- Do not present Docker/NestJS/Kubernetes/AWS as commercial core skills without evidence.
- Keep language/communication risks explicit when relevant.
- The sole standing exception is the audited manual-note mechanism (ADR-034). Forced manual-note claims remain visibly `user-forced, unverified` and must be surfaced to a human before export/send. No other content receives this bypass.

## Testing Rules

- Deterministic MVP logic requires unit tests; run the affected app's tests after code changes when tests exist.
- Core P0 coverage includes slug normalization, workspace validation, canonical artifact naming, skip handling, approval gates, and anti-overclaiming.
- Never use real AI providers in unit tests.
- Use temporary directories or mocks for filesystem tests.
- One source file, one same-named spec file: testable `x.ts` logic belongs in `x.spec.ts`; when logic moves, its tests move with it.
- Tests verify requirements; passing tests do not redefine the Issue's Acceptance Criteria.
- Record task test evidence on the active GitHub Issue as part of `task-lifecycle`; `project-management/TEST_LOG.md` is frozen (ADR-035).
- CI independently runs technical/security checks and the Acceptance Verifier for `task/ISSUE-*` PRs. Do not treat an agent's self-report as a substitute.

## Documentation Rules

- Keep docs consistent with product scope; do not promote P1/P2 features into MVP without explicit approval.
- Any architecture change must update the affected authoritative documentation in the same change.
- Architecture includes module/service boundaries, dependency direction, HTTP endpoints/data flow, state transitions, and binding decisions.
- Update app-level `CLAUDE.md` for app-internal structure/boundary changes, relevant `docs/*.md` for system requirements/architecture, and `project-management/DECISIONS.md` for new/superseded binding decisions.
- Every new HTTP endpoint needs `@ApiOperation`; every new/changed DTO field needs `@ApiProperty()` or `@ApiPropertyOptional()` (ADR-019).
- `project-management/completed-tasks/` is frozen history (ADR-030). For work closed on/after 2026-08-19, the closed GitHub Issue is the task record.
- Procedural closure/documentation checks live in `task-lifecycle`.

## Git / Review Rules

- Keep commits task-focused.
- Do not mix unrelated tasks in one change.
- Summarize changed files and verification after implementation.
- Never commit secrets, API keys, `.env`, generated local databases, or machine-specific private paths.
- Git/PR ordering and closure gates are defined in `task-lifecycle`.

## Required Skills

Load mandatory metaskills **before implementation**, not as a post-hoc review:

- **Backend (`apps/api`, TS/JS):** `js-conventions`, `js-gof`, `js-data-structures`, `error-handling`, `nestjs-best-practices`.
- **Frontend (`apps/web`, TS/TSX/JS/JSX/CSS):** `vercel-react-best-practices`, `ui-ux-pro-max`, `js-conventions`, `js-gof`, `js-data-structures`, `error-handling`.
- **Ralph/scripts JS:** `js-conventions`, `js-gof`.
- Skills explicitly named in an Issue's `Docs to Read` are mandatory.

`scripts/skill-gate-hook.js` enforces the supported source-edit cases and `skill-marker-hook.js` records Skill loads. The gate does not observe edits performed indirectly through Bash, so the rule still applies there.

Metaskills are provisioned by the root install flow. For maintenance/update mechanics use `npm run skills:update` and inspect `scripts/setup-metaskills.js`; do not duplicate those implementation details into every session.

## Context Management

For unfamiliar/broad codebase exploration, use the read-only agents in `.claude/agents/` (`research`, `codebase-scan`, `verify`, `pr-writer`) for fact gathering. Keep implementation, judgement, and prioritization in the main context.

Do not delegate active implementation work or files currently being edited. Re-read cited evidence before acting on it.

Agent-specific evidence/search rules live in each agent definition; do not duplicate them here.
