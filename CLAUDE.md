# CLAUDE.md

This file is the always-on constitution and routing guide for Claude Code in this repository. Keep task-specific procedures in skills and detailed system knowledge in the authoritative docs/app-level CLAUDE files.

Binding decisions live in `project-management/DECISIONS.md` (ADR-001…). The file is large and is deliberately not auto-imported into context: read the ADRs named in the active Issue's `## Docs to Read` and any ADR cited by the code you touch (`Grep` for `## ADR-0NN` and read only that section).

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
- **Creating or amending an ADR entry:** `.claude/skills/adr/SKILL.md`
- **Installed factory (Ralph, Acceptance Verifier, Calibration Judge, hooks, process skills/agents):** the `dark-factory` release pinned in the root `package.json`; its docs ship in `node_modules/dark-factory/` (`README.md`, `ralph/README.md`, `hooks/README.md`, `verifier/issue-contract.md`). Project values live in `.factory/profile.json`; the Jobflow-specific connection, trusted configs and recovery are in `docs/12_ai_software_factory.md`.

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

`.claude/settings.json` wires the hooks of the installed `dark-factory` package (`node_modules/dark-factory/hooks/`, pinned in the root `package.json`); the entries and their behaviour are authoritative in `node_modules/dark-factory/hooks/README.md`. The hooks read `.factory/profile.json`.

- PreToolUse `Write|Edit`: required-skill gate (`skill-gate.js`, profile `skillRules` plus the package base table).
- PreToolUse `Bash`: closure gate (`closure-gate.js`) for commit/push (blocks unless `task-lifecycle` was loaded in the session, then asks the human to confirm closure) and for `gh issue create|edit` (blocks unless `issues` was loaded, and blocks a body that fails the package issue linter's `v2` check; the body goes through `--body-file`).
- PreToolUse `mcp__github__issue_write`: the same `issues`-skill and body gate, applied to the GitHub MCP tool.
- PostToolUse `Skill`: records loaded skills (`skill-marker.js`).
- PostToolUse `Write|Edit`: app-local lint/typecheck feedback from the profile `hooks` commands.

Hooks are enforcement/backstops; they do not replace the task lifecycle or engineering judgement.

The gates fail closed: if `node_modules/dark-factory` is missing or broken (fresh clone, deleted `node_modules`, bad release), the `Bash` gate blocks every Bash call in Claude Code, `npm install` included. Repair it from an ordinary terminal outside Claude Code (`npm ci` at the repository root, or roll the pin back as `upgrading.md` of the pinned release describes), then return to the session.

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
- At most one pending/running `PromptRun` may exist per workspace + step (partial unique index; stale runs >15 min are failed automatically); preserve the database-backed concurrency invariant.
- Prompt 1 runs only from `source_saved`, or from a dead `analysis_running`, or from a legacy `failed` (ADR-038). Export claims `export_running` atomically before rendering.
- A failed step does not enter `failed`: it rolls the workspace back to the status the step started from (Prompt 1 → `source_saved`, export → `paused_before_export`, Prompt 2 first generation stays `cv_generation_running`) and records a readable reason in `lastStepError*` through `StepFailureService` (ADR-038 amendment, ISSUE-307).
- Every AI step endpoint answers `202` + `jobId` and runs in the BullMQ `ai-step` worker; the client polls `GET /workspaces/:id/jobs/:jobId` (ADR-040). Export is synchronous.
- A failed CV-draft *regenerate* leaves the workspace at its current status instead of moving it to `failed`.
- Prompt 3 is a mandatory-but-skippable gate before export. Its readiness verdict does not itself block export; the gate is cleared by run-or-skip.
- Regenerating the CV after Prompt 3 invalidates stale Prompt 3 artifacts and re-enters review/gating.

For state-machine work, read the current transition table/source and the relevant ADRs. If the active Issue contains an explicit transition table, treat that table as the task contract; if it conflicts with referenced docs, stop and ask rather than silently reconciling it.

## Architecture Rules

- Backend-first MVP. App-specific technology and module rules live in app-level `CLAUDE.md`.
- PostgreSQL stores metadata and workflow state.
- Filesystem stores physical artifacts.
- Do not store generated PDFs or large text artifacts only in PostgreSQL.
- Use stable canonical internal artifact names and separate human-readable download names.

### Changeability and coupling

Optimize new code for local change, without speculative design (ADR-043):

- Changing one policy (AI provider, naming rule, export format, step rule) must not require edits in unrelated modules.
- Orchestration (services that sequence steps and call policies) does not hold provider- or feature-specific details that fit behind an existing or small local boundary.
- Introduce a new interface/strategy/registry only at a real variation point: two implementations now, or a second one already planned in the PRD/issue. No abstraction "for future flexibility".
- Prefer extending an existing module boundary and its public contract (ADR-017) over a new cross-module dependency.
- Extract shared logic only when it means the same thing to every consumer.

Architectural requirements reach an Issue only as concrete `INV-n` about a boundary or dependency direction, never as a generic "loosely coupled" criterion; the `prd` → `plan` → `issues` skills carry this down.

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
- When one test is split into several, every original assert must appear in one of the new tests unless its removal is explicitly justified as redundant.
- Test fixtures and data must follow the same anti-literal/generic rules as the code they exercise; do not use real CI check names or project-specific literals from the implementation under test.
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

Load mandatory metaskills **before implementation**, not as a post-hoc review.

- The single path → skills table is the base table of the installed package (`profile/skill-rules.js`: the JS metaskills for every JS/TS file) plus `skillRules` in `.factory/profile.json` (the `apps/api` and `apps/web` additions, CSS included). The skill gate and Ralph both read it; do not keep a copy of the list here or in `scripts/`.
- Skills explicitly named in an Issue's `Docs to Read` are mandatory.

The package `skill-gate.js` enforces the supported source-edit cases from the profile and the package base table, and `skill-marker.js` records Skill loads. The gate does not observe edits performed indirectly through Bash, so the rule still applies there.

The base set (process skills `prd`, `plan`, `issues`, `task-lifecycle`, `epic-discovery`, `adr`, the JS metaskills and the agents `research`, `codebase-scan`, `verify`, `pr-writer`) is provisioned by the setup of the installed `dark-factory` package: its postinstall lays the copies out on a plain root `npm ci`/`npm install`, and `node node_modules/dark-factory/bin/setup.js --consumer-root .` repeats it explicitly (needed after any `npm install --ignore-scripts`, which skips that postinstall). Those copies are gitignored by name and must not be edited or committed; project skills (`nestjs-best-practices`, `vercel-react-best-practices`, `ui-ux-pro-max`, `tailwind-4-docs`, `documentation-writer`, `git-commit`, `requesting-code-review`) stay tracked. The skill versions change only by moving the pinned release (`upgrading.md` of the pinned release). The former local copies of Ralph, the verifier, the Judge and the hooks were removed in #657; the factory code runs only from the installed package.

## Context Management

For unfamiliar/broad codebase exploration, use the read-only agents in `.claude/agents/` (`research`, `codebase-scan`, `verify`, `pr-writer`) for fact gathering. Keep implementation, judgement, and prioritization in the main context.

Do not delegate active implementation work or files currently being edited. Re-read cited evidence before acting on it.

Use these haiku agents, not `general-purpose` (which inherits the more expensive main model); set `model` explicitly only if a task genuinely needs another one. When briefing them, phrase questions with unambiguous polarity ("list every place that does X", not "is X checked?"), require `file:line` plus a quoted line per claim, and do not accept counts or "none found" without a cross-check.

Agent-specific evidence/search rules live in each agent definition (`.claude/agents/`).
