# Career Case Deep Dives RU — v0.9 portfolio refresh

## v0.9 — portfolio refresh (2026-11-23)

Это активная версия evidence bank. Она заменяет v0.8 целиком, а не дополняет её: устаревшие рекомендации удалены из тела файла, история осталась в файлах v0.8 и старше.

- **Источник проектных фактов:** аудит пяти репозиториев от 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`, разделы 2 и 6). У каждого факта ниже — файл или commit, на котором он проверен. Факт из одного README без кода проверенным не считается.
- **Допуск проекта в CV определяет только блок `portfolio-registry` в активном `project_inventory`.** Основные проекты — пять: Dark Factory, JobFlow CV Pipeline, Cards, B1 Kompass, Home Budget. Проект вне registry или с `cvEligible: false` в CV не используется.
- Портфолио-кейсы пронумерованы P1–P5 (как в аудите), чтобы не путаться с кейсами 1–14. Кейс 10 прежних версий удалён: проект архивирован (`status: archived` в registry), его история — в v0.8 и старше.
- Dark Factory — **отдельный репозиторий и пакет** `dark-factory`, а не раздел репозитория JobFlow. JobFlow — один из трёх consumer-репозиториев пакета.
- Коммерческие кейсы (EPAM, Factor–IT, CHI) перенесены без изменений фактов, дат и ролей.
- Всё о личных проектах — personal / portfolio evidence, не commercial production experience. Cards и B1 Kompass публично развёрнуты и работают, но это личные деплои одного владельца: без подтверждённых пользователей, SLA и коммерческой ответственности. В CV их не выдавать за коммерческую эксплуатацию.

### Три AI-категории (классифицируются независимо)

| Категория | Доказательства в этом файле |
|---|---|
| A — AI-assisted Software Engineering | P1 Dark Factory (Claude Code hooks/skills/agents, Ralph, Codex verifier); P2 JobFlow (построен с Claude Code и Dark Factory); P3 Cards и P4 B1 Kompass (consumer-репозитории Dark Factory); P5 Home Budget (Codex-native workflow, не Dark Factory) |
| B — AI Integration & Agent Workflow Engineering | P2 JobFlow (`AiProvider` + OpenAI API, structured output validation, LLM call policy, BullMQ/Redis AI jobs, human review gates, Evidence Guard); P1 Dark Factory (оркестрация агента в Docker sandbox, детерминированный вердикт, protected paths, test-tampering scan) |
| C — Agent Development Training | сертификаты и обучение — в активном `certifications`, не в этом файле |

Ни одна категория не означает коммерческий AI- или production-опыт. Общей формулировки «AI expertise» нет; обучение (C) не подменяет реализацию (A, B).

---

## Current Independent Work & Portfolio Projects — timeline framing

**2026-07-02 clarification:** The current-work block is mandatory in external CV/PDF/HTML outputs. Volunteering is a market-dependent separate bullet, not part of the mandatory software-engineering evidence.

- Use **Current Independent Work & Portfolio Projects, May 2025 – Present** for every external CV/PDF/HTML generation to close the post-EPAM gap.
- Use **Freelance Software Developer | Backend Portfolio Projects & Relocation** as LinkedIn Experience title if using a normal LinkedIn Experience entry.
- Do not use LinkedIn Career Break if the goal is to show freelance/portfolio activity, because LinkedIn displays it as a career break.
- This current block should close the gap but not replace EPAM as the main commercial evidence.

### Current block safe CV wording

```text
CURRENT INDEPENDENT WORK & PORTFOLIO PROJECTS
Freelance Software Development, Backend Portfolio Projects & Relocation
May 2025 – Present · Cologne, Germany · Remote

Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.

- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- [JobFlow CV Pipeline bullet — see Case P2]
- [one concrete fact chosen for the vacancy — see below]
- Volunteered as IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

Третий bullet — один конкретный проверенный факт, выбранный по вакансии; он не повторяет содержимое Selected Projects. Окончательное правило выбора — в активном `cv_rules`. Проверенные варианты:

- AI: `Completed Google Cloud hands-on labs on agent development with ADK, covering tool-enabled agents, multi-agent systems and deployment to Agent Runtime, alongside ongoing development with Claude Code and OpenAI Codex.`
- Node.js/backend: `Deepened Node.js engineering through LinkedIn Learning courses on scaling, testing, security and design patterns.`
- Full-stack (если проекты не в Selected Projects): `Built and published Next.js/React applications on Supabase PostgreSQL with SQL migrations and Playwright end-to-end tests.`
- Python: `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".`

### Current Independent Work — freelance part (timeline case)

**Type:** timeline / light professional activity / gap-closing narrative.  
**Period:** May 2025 – Present.  
**Context:** relocation to Germany, small freelance/independent Node.js/React improvements, portfolio projects and structured upskilling. Volunteering is a separate market-dependent supporting signal.

**Safe wording:**

```text
Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
```

**Risk:**

Freelance scope has limited evidence. If asked, be ready to explain it as small independent tasks rather than full-time client ownership. Do not name clients or quantify business impact without evidence.

---

# Case P1 — Dark Factory

**Type:** personal / portfolio project — a standalone, versioned Node.js package in its own repository that installs an AI-assisted delivery workflow into other repositories.  
**Period:** 2026 – Present. The workflow was first built inside the JobFlow repository and extracted into the separate `dark-factory` package in Oct 2026 (JobFlow ISSUE-656 connected the package at `v0.1.1`, ISSUE-657 removed the local copies).  
**Repository:** https://github.com/strakhovdenya/dark-factory — verified at commit `054feb3` (2026-11-15); GitHub releases `v0.1.0`, `v0.1.1`, `v0.1.2`, `v0.1.3`.  
**Stack:** Node.js, JavaScript, Claude Code (headless CLI, hooks, skills, agents), OpenAI Codex (`openai/codex-action`), GitHub Actions, Docker, JSON Schema, `node:test`.  
**Registry:** `dark-factory` — `primary`, `cvEligible: true`, `placement: selected_projects`, `deployment.kind: package`.  
**Evidence quality:** `personal_verified`, confidence high. Personal portfolio work, not commercial production experience; the package runs in the CI and agent workflows of the owner's own repositories.

## Short summary

Dark Factory is a reusable package for AI-assisted software delivery. The core principle: AI performs bounded implementation and review; deterministic code owns permissions, repository state, Git operations, CI gates and the final acceptance verdict. Planning, architecture choices, spec approval and merge stay with a human.

Flow in a consumer repository: GitHub Issue as executable specification (v2 contract) → Ralph runs Claude Code in a sandbox on that issue → self-review, code review and final gate → controller commits, pushes and opens the PR → CI → Codex-based Acceptance Verifier → human merge.

## Verified facts (file / commit)

| Факт | Где проверено (`054feb3`) |
|---|---|
| Ralph runs the Claude Code CLI headless | `ralph/agent.js` |
| Fresh clone + branch per issue | `ralph/workspace.js:77` |
| Git rights of the agent: only `git status`, `git diff`, `git log` (plus `git show` on review passes); `git commit`, `git push` and `gh` are always denied | `ralph/workspace.js:431-437` |
| Pipeline `implement → self-review → code-review → final-gate` | `ralph/steps/registry.js` |
| The controller, not the agent, creates the PR | `ralph/github.js:323` |
| Issues come from a list in the consumer profile with `dependsOn`, not from a GitHub query | `ralph/config.js:95` |
| Docker sandbox with an egress proxy; separate CI job | `ralph/sandbox/Dockerfile`, `ralph/sandbox.js`, `ralph/sandbox/proxy.js`, `.github/workflows/ralph-sandbox-integration.yml` |
| Acceptance Verifier: reusable workflow on `openai/codex-action` with an allowlist of models; verdict computed by code, `NEEDS_HUMAN` when two runs disagree | `verifier/verdict.js` |
| Test-tampering and protected-path checks | `ralph/boundary.js` |
| Calibration Judge; issue linter | `judge/calibration-judge.js`, `judge/taxonomy.js`, `verifier/issue-lint.js` |
| Fail-closed Claude Code hooks (skill gate, skill marker, closure gate, lint, typecheck); setup/postinstall into the consumer repository | `hooks/skill-gate.js`, `hooks/skill-marker.js`, `hooks/closure-gate.js`, `hooks/lint.js`, `hooks/typecheck.js`, `bin/setup.js` |
| 84 test files (`node --test`); CI on Linux and Windows: lint, typecheck, test | `*.test.js`, `.github/workflows/ci.yml` |
| Installed (`dark-factory#v0.1.3`) in JobFlow CV Pipeline, Cards (`package.json:58`, `.claude/settings.json`, `.factory/`) and B1 Kompass (`package.json:40`) | consumer repositories |
| B1 Kompass uses the verifier and spec approval; Ralph was not found there | B1 Kompass `2766a0b` |
| Not installed in Home Budget: that repository uses its own Codex-native workflow (Case P5) | Home Budget `docs/AGENT_FACTORY.md` |

## Ralph — agent loop

- Node.js controller run locally, not part of any deployed application. One cycle per issue: fresh clone and branch → headless Claude Code with a narrow allow-list → self-review → code-review → final gate → commit, push and PR by the controller.
- Trust boundary: the agent edits code, runs tests and may **read** repository state (`git status`, `git diff`, `git log`, `git show` on review passes). It cannot commit, push or call the GitHub CLI; everything a human would confirm was moved to the controller instead of asking the model to police itself.
- Runs in a Docker sandbox with an egress proxy.
- Built from real failures (JobFlow history before the extraction; sources: JobFlow `README.md` — "This architecture came from real failures", "4. Failures become system rules", the `git clone` per issue rationale — and `docs/12_ai_software_factory.md`): an early design based on `git worktree` failed in three live runs and was rebuilt around isolated clones; real runs also found a regression test that stayed green after the protected rule was removed, logic validated only on invented fixtures, and a run that passed every check while violating an explicit instruction. Each failure became a prompt rule, a test or a deterministic gate.

## Acceptance Verifier — independent acceptance check

- GitHub Actions workflow that asks whether the PR actually satisfies the GitHub Issue that requested it. A different model (OpenAI Codex) reads the issue, the diff, the PR sources and CI results in a read-only sandbox and returns strict JSON.
- The model never decides pass/fail: the verdict is computed by code (`verifier/verdict.js`), cited `path + line + quote` evidence is re-checked, CI and absence items are computed deterministically, test tampering and protected paths are checked (`ralph/boundary.js`), and missing or malformed evidence fails closed.
- Two runs that disagree give `NEEDS_HUMAN` instead of a silent pick.

## Calibration Judge, issue contract, hooks

- Calibration Judge (`judge/`): root-cause analysis of verifier rounds with a closed taxonomy; designed as advisory (not independently verified that it only observes).
- Issue contract with a linter (`verifier/issue-lint.js`): typed, ID-tagged items (`AC`, `TR`, `DOD`, `INV`) and a `Verify:` grammar; ambiguous decisions are resolved before execution and recorded as invariants.
- Fail-closed Claude Code hooks: skill gate before edits, lint/typecheck after edits, closure gate for commit/push and issue-body checks (`hooks/`).

## What an employer can take from it

- **Scoped AI-assisted delivery.** Tasks are defined as GitHub Issues with explicit acceptance criteria, test requirements and a definition of done, and implemented with Claude Code — interactively, or by Ralph. Planning, architecture choices and merges stay with the candidate.
- **Checking generated code against the requirement, not only against the tests.** Pull requests for GitHub Issue tasks (`task/ISSUE-*` branches) run CI and then the Acceptance Verifier, an independent OpenAI Codex-based review that compares the change with the issue's requirements, the code changes and the test evidence. In JobFlow its verdict is advisory (`VERIFIER_ENFORCE` is a project setting; `.github/workflows/acceptance-verifier.yml`); the merge decision stays with a human.
- **Catching AI mistakes that tests missed.** Manual review of real agent runs in JobFlow found AI-generated changes that passed the automated checks while violating the requirement (JobFlow `README.md`, section "4. Failures become system rules" and the Ralph section; `docs/12_ai_software_factory.md`); each finding became a prompt rule, a targeted check or an acceptance gate.
- **Reusable tooling.** The workflow was extracted from one project into a versioned package and installed in two further personal repositories.

## Safe CV bullets — compact (default when space is tight, e.g. a two-page CV)

```text
- Built Dark Factory, a reusable Node.js toolkit for sandboxed Claude Code development workflows, with independent OpenAI Codex-based pull request verification and deterministic acceptance checks.
- Extracted the workflow from JobFlow into a versioned package and integrated it into Cards and B1 Kompass, retaining human-controlled merges.
```

## Safe CV bullets — recruiter-facing, detailed (vacancies where AI-assisted engineering is central)

```text
- Built Dark Factory, a versioned Node.js package (releases v0.1.0–v0.1.3) that installs an AI-assisted delivery workflow into a repository: Claude Code hooks, skills and agents; Ralph, a loop that runs Claude Code in a Docker sandbox on a scoped GitHub Issue, where the agent can read Git history but cannot commit, push or call the GitHub CLI, and the controller opens the pull request; and an OpenAI Codex-based acceptance verifier in GitHub Actions whose verdict is computed and re-checked by code.
- Extracted the workflow from JobFlow into this standalone package and installed it in two further personal projects; the package test suite runs in CI on Linux and Windows.
- Used Claude Code to implement scoped features from GitHub Issues with explicit acceptance criteria; added independent OpenAI Codex verification against requirements, code changes and test evidence before human merge.
- Identified AI-generated changes that passed tests but violated requirements, then added targeted checks and acceptance gates to catch similar failures.
```

## Safe CV bullets — mechanism detail (only for vacancies about AI tooling, coding agents or developer platforms, and for interviews)

```text
- Designed the controller so the coding agent only edits code, runs tests and reads repository state, while commits, pushes, verification gates and PR creation stay in deterministic code.
- Implemented an acceptance verifier whose verdict is computed by code, not by the model: cited file/line/quote evidence is re-checked, CI checks, scope and test tampering are checked deterministically, and missing or malformed evidence fails closed.
- Added fail-closed Claude Code hooks, skills and a JSON issue contract with a linter so engineering rules are enforced by tooling rather than prompt wording; merges stay with a human.
```

## Interview depth

- Short pitch: "The interesting part is not that an LLM writes code but the system around the agent: specifications as executable contracts, a least-privilege agent, deterministic orchestration, independent verification against the original requirement and fail-closed gates — packaged so another repository can install it."
- Why the agent cannot commit, push or call `gh`: anything a human would confirm (commit, push, PR) was moved to the controller. Read-only Git commands stay allowed because the agent needs to see its own diff.
- Why clones instead of worktrees: three live runs failed with an empty or detached worktree seen by the headless agent; a plain clone removed the failure.
- Why the model does not decide the verdict: a model-written verdict cannot be audited; the script checks evidence and computes the outcome.
- Why a second run and `NEEDS_HUMAN`: a single model run is noisy; disagreement goes to a human instead of a silent pick.
- Why a package: the same workflow was needed in several repositories; a pinned release lets each consumer upgrade deliberately.
- What remains human: intent, ambiguous decisions, architecture, spec approval and merge. Auto-merge is intentionally not enabled.

## Do not claim

- commercial or production AI experience
- the job title AI Engineer or LLM Platform Engineer
- ML engineering or MLOps or model training
- autonomous production deployment
- enabled auto-merge
- fully autonomous development without human review and merge
- external users, teams or enterprise adoption of the package
- "AI platform ownership"
- that the agent cannot use Git at all (reading Git history is allowed; only committing and pushing and the GitHub CLI are denied)
- that Ralph runs in three repositories — the package is installed in three; B1 Kompass uses the verifier and spec approval
- a GitHub Projects integration (not in the code)
- verifier accuracy metrics, false-PASS rates or productivity figures
- an installation in Home Budget

---

# Case P2 — JobFlow CV Pipeline

**Type:** personal / portfolio backend-first AI tooling project.  
**Period:** June 2026 – Present.  
**Repository:** https://github.com/strakhovdenya/jobflow-cv-pipeline — verified at commit `5f97499`.  
**Stack:** NestJS 11, TypeScript, PostgreSQL, Prisma, BullMQ, Redis, OpenAI API behind an AI provider abstraction, Swagger/OpenAPI, Handlebars/Puppeteer, Jest, Docker Compose, GitHub Actions, Next.js (dashboard).  
**Registry:** `jobflow-cv-pipeline` — `primary`, `cvEligible: true`, `placement: current_work_block` (bullet in Current Independent Work; never repeated in Selected Projects).  
**Scale (2026-11-23):** 782 commits since 2026-06-28, 354 merged PRs, 45 ADRs.  
**Evidence quality:** `personal_verified`, confidence high. Facts about JobFlow come only from its code and ADRs; generated CVs (`storage/`, `golden-dataset/`) are not a source of facts. Public deployment and users other than the owner are not confirmed; access is protected only by an API key, there is no user authentication.

## Short summary

JobFlow CV Pipeline is a backend-first AI pipeline for vacancy analysis, targeted CV generation and deterministic PDF export. It is built as a portfolio project to develop production-style NestJS/TypeScript backend skills and explore structured LLM integration with human review in a realistic engineering context.

## Verified facts (file / ADR)

| Факт | Где проверено |
|---|---|
| Explicit workspace status machine with compare-and-set transitions | `apps/api/src/workspaces/workspace-status.service.ts`, ADR-038 |
| REST API documented with Swagger | ADR-019 |
| AI steps as BullMQ/Redis jobs, `202` + `jobId` | `apps/api/src/queue/`, ADR-040 |
| `AiProvider` abstraction + OpenAI provider, LLM call policy | `apps/api/src/ai/`, ADR-040 amendment |
| Evidence Guard | `apps/api/src/evidence/evidence-guard.service.ts` |
| Deterministic HTML/PDF + ATS export without an AI run | `apps/api/src/document-export/`, ADR-012 |
| 79 unit spec files, 3 e2e suites, coverage floor 90/68/90/90 | `apps/api/src`, `apps/api/test/`, `apps/api/package.json` (ADR-022) |
| ~35 web test files | `apps/web` |
| Workflows: CI, CodeQL, acceptance verifier, calibration judge, spec approval | `.github/workflows/` |
| Dark Factory consumer (`dark-factory#v0.1.3`) | root `package.json`, `.factory/profile.json` |

## Strongest engineering signals

- Modular NestJS architecture with Workspace, Artifact Storage, Prompt Pipeline, AI Provider Abstraction, Evidence Guard and Document Export modules.
- Human-in-the-loop pipeline: AI generates, human decides, with mandatory review gates after each AI step.
- Evidence Guard module flags unsupported CV claims before export using a structured source knowledge base with evidence levels.
- Deterministic backend HTML-to-PDF export with predictable output and no AI tokens used for export.
- AI usage tracking: input/output tokens and estimated cost per AI run, prompt type and workspace.
- Prompt versioning and reproducibility: versioned prompt templates, input hashes, source snapshots, artifact traceability and explicit KnowledgeSource selection.
- Documentation-driven planning: PRD → phased implementation plan → GitHub Issues with Acceptance Criteria, Test Requirements and Definition of Done; 45 Architecture Decision Records.
- Background AI steps: every AI step runs as a BullMQ job on Redis in one `ai-step` worker instead of inside the HTTP request. The endpoint answers `202` + `jobId`, the client polls the job status, and a page reload picks up the still-running job. Introduced because CV draft generation takes about 6 minutes and the HTTP request timed out while the backend kept working.
- Queue safety rules: one deterministic job id per workspace + step, so a second click while a job is open gets `409`; no automatic job retries and no re-run of stalled jobs, because a retry would repeat a paid AI call; an unavailable Redis gives `503` instead of a silent fallback.
- Explicit LLM call policy in the OpenAI provider: SDK retries are switched off; the provider itself retries only HTTP 429/5xx with exponential backoff that respects `retry-after`; a timeout is never retried, because the request may already have been billed; per-attempt timeout; a per-step output-token limit chosen inside the provider from the step identifier.
- Typed provider errors instead of a "successful" bad answer: a truncated answer, a refusal and an empty answer each raise their own error type. In production the application refuses to start without an explicit AI provider setting.
- Explicit workspace status machine covering the pipeline stages, with guarded transitions between them, and human decision overrides stored with their previous and new decision as an audit trail.
- Unit tests and three end-to-end suites covering the main pipeline flow, the skip flow and rate limiting, with a coverage threshold enforced on every run (statements, lines and functions at 90%, branches at 68%).
- CI on every pull request and push to `main`: lint, type-check, unit tests, end-to-end tests against a real PostgreSQL service, build, and a Docker image build with a smoke test; CodeQL; acceptance verification of task PRs.
- Local infrastructure through Docker Compose: PostgreSQL and Redis running as services next to the API and web containers.
- Next.js dashboard (`apps/web`): every workspace shows its pipeline progress, the review gate waiting for a decision and the artifacts produced so far; it is where AI-generated vacancy analyses and CV drafts are reviewed and approved, and where PDFs are exported. It is a thin typed client over the backend, with no business logic of its own. Built with Claude Code, then refined over several rounds of manual, human-reviewed correction against real historical application data. It is a workflow review interface, not a data-visualisation product.

Две разные вещи, которые не смешиваются:

- **AI integration в приложении** (категория B): OpenAI API, provider abstraction, structured output validation, LLM call policy, BullMQ/Redis AI jobs, human review gates, Evidence Guard.
- **AI-assisted процесс разработки** (категория A): JobFlow разрабатывается с Claude Code; с 2026-10 Ralph, Acceptance Verifier и hooks приходят из отдельного пакета Dark Factory (Case P1).

## Safe CV bullets

Compact (default when space is tight):

```text
- Built JobFlow CV Pipeline, a NestJS/TypeScript and PostgreSQL application with OpenAI integration, BullMQ/Redis background jobs, human review gates, checks that flag unsupported CV claims and deterministic PDF export.
```

Detailed variants:

```text
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export, with human-in-the-loop review gates, an AI provider abstraction, BullMQ/Redis background jobs for LLM steps, an explicit LLM call policy, prompt versioning, token/cost tracking and HTML-to-PDF export without AI token usage.
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation and deterministic PDF export, with human-in-the-loop review gates, OpenAI integration behind a provider abstraction and BullMQ/Redis background jobs for LLM steps.
- Built JobFlow CV Pipeline, a personal NestJS/TypeScript and PostgreSQL application with OpenAI integration and a Next.js dashboard for reviewing AI-generated drafts, tracking workflow progress and exporting PDFs.
```

Facets for the current-work bullet (choose by vacancy): NestJS/PostgreSQL backend; LLM integration (provider abstraction, call policy, background jobs); Next.js review dashboard; deterministic document export.

## Interview positioning

Use this case to show current engineering activity and structured backend thinking, especially for roles that value NestJS/TypeScript, LLM API integration, background job processing, document generation, prompt workflow governance or backend architecture. All of it is personal portfolio work.

## Interview depth — LLM integration and queue

- Why a queue: the longest step (CV draft) took about 6 minutes, the browser request timed out while the backend kept working, and a second click hit "already running". Moving the work out of the request removed that class of failure.
- Why BullMQ and not RabbitMQ: Redis was already in the project; a second broker would add a service and a rewrite for one worker.
- Why no retries in the queue: a retry repeats a paid LLM call; a failed step is shown to the user, who re-runs it.
- Why no retry after a timeout: the request may already have been generated and billed.
- Why per-step output limits: one shared limit is either too small for CV generation or lets small steps run away on cost.
- Why typed errors: a truncated or refused answer used to be returned as a success and flowed into the CV.

## Do not claim

- commercial production users or a public deployment
- users other than the owner, enterprise/client adoption
- user authentication (access is protected by an API key)
- ML/MLOps/model training
- queue throughput or load metrics; the queue serves one local user
- commercial or production AI experience
- the job title AI Engineer or LLM Platform Engineer
- enabled auto-merge
- fully autonomous CV generation; human review is a key safety feature
- financial dashboards, charts or large data tables; the dashboard is a workflow review interface

---

# Case P3 — Cards

**Type:** personal full-stack project — German vocabulary trainer.  
**Period:** Jul 2025 – Present (repository created 2025-07).  
**Repository:** https://github.com/strakhovdenya/cards — verified at commit `b90b9e5` (2026-10-30).  
**Public demo:** `https://cards-indol-eight.vercel.app/demo` (URL from README; publicly available per the candidate, 2026-11-23).  
**Stack (used in code):** Next.js 16 App Router, React 19, TypeScript, Supabase (email/password auth, 7 tables), Upstash rate limiting with in-memory fallback, Vitest, Playwright.  
**Registry:** `cards` — `primary`, `cvEligible: true`, `placement: selected_projects`, `deployment.kind: public`.  
**Evidence quality:** `personal_verified`; maturity medium (working app since 2025-07).

## Verified facts (file / commit)

| Факт | Где проверено (`b90b9e5`) |
|---|---|
| Trainers: flashcards, articles, verb conjugation, time | `src/components/ArticlesTrainer.tsx`, `src/components/VerbTraining.tsx`, `src/components/TimeTraining.tsx` |
| Card editor and bulk import (Strategy pattern for card types) | `src/strategies/*CardEditorStrategy.ts`, `src/strategies/*BulkImportStrategy.ts` |
| Invite-only email/password sign-up through a Supabase RPC | `src/lib/supabase.ts`, `docs/invite-registration-guard.sql` |
| Read-only demo user; writes blocked on the server | `src/lib/auth-server.ts:74-76` |
| Rate limiting: Upstash with in-memory fallback | `src/lib/rate-limit.ts` |
| ~18 route handlers; guest progress kept in localStorage | `src/app/api/` |
| 47 Vitest files + 1 Playwright spec; CI: check, test, build, CodeQL, factory-separation | `*.test.ts(x)`, `e2e/demo.spec.ts`, `.github/workflows/ci.yml` |
| Dark Factory consumer | `package.json:58`, `.claude/settings.json`, `.factory/` |

## Safe CV wording

```text
- Built a German vocabulary trainer on Next.js and Supabase with invite-only email/password sign-up, a publicly accessible read-only demo enforced on the server, and rate limiting with an Upstash Redis limiter and in-memory fallback.
```

Use for React/Next.js full-stack vacancies when a requirement stays uncovered after EPAM React/Next.js work and B1 Kompass. Not a backend case.

## Do not claim

- interface localization or UI language switching — the UI is in Russian only, there is no i18n library
- AI features inside the app (it only copies a prompt to the clipboard)
- spaced repetition, PWA or offline mode
- row-level security as a delivered feature (policies exist only as manual SQL in `docs/`, live state not verified)
- data-fetching or state libraries that are not in the code
- user numbers or usage metrics
- presenting this project as commercial experience

---

# Case P4 — B1 Kompass

**Type:** personal full-stack project — online practice app for the German DTZ exam (A2–B1): listening (Hören) and reading (Lesen), guest mode without registration; interface in English and Russian (`next-intl`).  
**Period:** Oct 2026 – Present.  
**Repository:** https://github.com/strakhovdenya/b1-kompass — verified at commit `2766a0b` (2026-11-19).  
**Public site:** `https://b1-kompass.vercel.app` (URL from README; publicly available per the candidate, 2026-11-23).  
**Stack:** npm-workspaces monorepo (`packages/domain` — pure TypeScript + zod, `apps/web`), Next.js 16, React 19, MUI 7, TypeScript `strict` + `noUncheckedIndexedAccess`, Supabase (PostgreSQL, RLS, Storage), Vitest, Playwright, Vercel CLI.  
**Registry:** `b1-kompass` — `primary`, `cvEligible: true`, `placement: selected_projects`, `deployment.kind: public`.  
**Evidence quality:** `personal_verified`; the most engineering-mature full-stack project of the five (E2E in CI, migrations, release process).

## Verified facts (file / commit)

| Факт | Где проверено (`2766a0b`) |
|---|---|
| 15 SQL migrations, 15 tables, RLS, signed URLs in Storage | `supabase/migrations/*.sql` |
| Server-side exam timing with timing-profile revisions | `supabase/migrations/20261110000000_m2_timing_profiles.sql`, `apps/web/src/app/api/attempts/` |
| Immutable exam versions; trigger keeps answer keys unchanged; publish guard in SQL | `supabase/migrations/20261114000000_m3_publish_guard.sql`, `scripts/lib/publish-exam-version.ts` |
| httpOnly guest cookie, origin check; 10 route handlers | `apps/web/src/server/guest-session/cookie.ts`, `apps/web/src/server/next/origin.ts`, `apps/web/src/app/api/` |
| Scoring by DTZ rules | `packages/domain/src/scoring/dtz.ts` |
| MyMemory/OpenThesaurus integrations with cache and budget | `apps/web/src/server/dictionary/mymemory.ts`, `apps/web/src/server/dictionary/openthesaurus.ts` |
| 29 unit test files (Vitest) + 49 Playwright specs on an isolated local Supabase | `*.test.ts`, `apps/web/tests/*.spec.ts` |
| CI: typecheck, lint, unit, build, `supabase start`, E2E; manual release (Vercel CLI) | `.github/workflows/ci.yml`, `.github/workflows/release-production.yml` |
| Dark Factory consumer: verifier and spec approval (Ralph not found) | `package.json:40` |

## Safe CV wording

```text
- Built B1 Kompass, a publicly available Next.js/TypeScript practice app for the German DTZ exam (listening and reading) with guest sessions, server-enforced exam timing and a Supabase PostgreSQL schema with 15 SQL migrations, row-level security and immutable answer keys, covered by Vitest and Playwright end-to-end tests in CI.
```

Use first among personal projects for React/Next.js full-stack vacancies (after EPAM React/Next.js/BFF evidence). For AI-assisted SE vacancies it can be mentioned only as a Dark Factory consumer, not as an AI product.

## Interview depth

- Why server-side timing: a client timer can be paused or edited; the server owns the exam clock and timing-profile revisions keep old attempts consistent.
- Why immutable exam versions and a trigger on answer keys: a published exam must not change under existing attempts; the database enforces it, not only the application.
- Why a separate `packages/domain`: scoring and exam rules are pure TypeScript with zod, testable without the web app.
- Why E2E on a local Supabase in CI: migrations, RLS and route handlers are tested together, isolated from the production project.

## Do not claim

- the number of users or exams taken (README: owner-reported, not independently verified)
- AI features inside the app
- an official affiliation with the DTZ exam or its publishers
- that the answer key never leaves the server (traced only partly)
- presenting this project as commercial experience

---

# Case P5 — Home Budget

**Type:** personal full-stack / business-logic project — private budgeting app for one owner (EUR, one card).  
**Period:** Nov 2026 – Present (44 commits in 18 days at the audit).  
**Repository:** https://github.com/strakhovdenya/home-budget — verified at commit `1561218` (2026-11-18).  
**Deployment:** private single-owner app, no public app link and no demo (the repository itself is public) (confirmed by the candidate, 2026-11-23).  
**Stack:** Next.js 16, React 19, MUI 9, next-intl, Auth.js (Google OAuth, one allowlisted email with `email_verified`), Drizzle ORM + PostgreSQL, 6 manual SQL migrations, 12 tables, `audit_events`, Vitest, Playwright, GitHub Actions; developed with OpenAI Codex.  
**Registry:** `home-budget` — `primary`, `cvEligible: true`, `placement: selected_projects`, `deployment.kind: private_single_owner`, `deployment.url: null`.  
**Evidence quality:** `personal_verified`; maturity early but disciplined.

## What it does (code)

Confirmed balance checkpoints, monthly allocation, obligation reserves, savings, daily forecast, month closing with immutable versions, history, analytics, onboarding. Not implemented: categories, transactions, export, PDF import, multi-currency, multi-user.

## Verified facts (file / commit)

| Факт | Где проверено (`1561218`) |
|---|---|
| Money stored as `bigint` cents | `src/infrastructure/db/schema.ts:5`, `src/domain/money/money.ts` |
| Range-checked arithmetic with `Result` types | `addCents` in `src/domain/money/money.ts` |
| Domain functions for budgets, reserves, liquidity and allocation changes | `periodBudget`, `calculatePeriodReserves`, `calculateLiquidity` (`src/domain/forecast/liquidity.ts`), `planAllocationChange` |
| Berlin time zone handling | `BerlinDate` (`src/shared/pure/berlin-date.ts`) |
| CHECK constraint on currency; `audit_events`; 12 tables; 6 manual SQL migrations | `drizzle/0000_foundation.sql` … `drizzle/0005_period_transfers.sql`, `src/infrastructure/db/schema.ts` |
| ~100 test files: domain, 18 integration tests on a real PostgreSQL (Vitest), Playwright E2E | `tests/`, `vitest.config.ts`, `vitest.integration.config.ts`, `playwright*.config.ts` |
| CI: lint, typecheck, unit, build, double `db:migrate`, integration, a run under another time zone, finance-coverage gate | `.github/workflows/ci.yml`, `scripts/check-finance-coverage.mjs` |
| Codex-native workflow | `AGENTS.md`, `.codex/`, `.agents/skills/`, `docs/AGENT_FACTORY.md` |

## Codex-native workflow (AI-категория A) — отличие от Dark Factory

- Home Budget is developed with **OpenAI Codex** guided by repository-specific agent instructions (`AGENTS.md`), Codex configuration (`.codex/`) and agent skills (`.agents/skills/`).
- `docs/AGENT_FACTORY.md` describes it as an adaptation of the same ideas, explicitly **"not an installation or fork"** of Dark Factory: there is no `dark-factory` dependency, no Ralph, no Dark Factory verifier.
- This is separate evidence of AI-assisted development with a second tool (Codex as the implementing agent), next to Claude Code in Dark Factory consumers. Do not merge the two into one claim, and do not list Home Budget as a Dark Factory consumer.
- About 27% of tracked files are vendored skill documentation; do not present repository size as project size.

## Safe CV wording

```text
- Built a private single-owner budgeting app with Next.js, Drizzle ORM and PostgreSQL that stores money as integer cents and computes period budgets, obligation reserves and liquidity forecasts in unit-tested domain functions, with integration tests against a real PostgreSQL in CI; developed with OpenAI Codex using repository-specific agent instructions and skills.
```

Use for database / financial-logic vacancies (data integrity, money handling) and as an option for backend Node.js vacancies that require data integrity not covered by commercial experience. In the CV it is a "private single-owner app": no app URL, no statements about users (a link to the public repository is allowed).

## Interview depth

- Why integer cents: floating-point money loses cents; `bigint` cents with range checks keep every sum exact.
- Why `Result` types in arithmetic: overflow and invalid input are explicit outcomes the caller must handle, not exceptions deep in a calculation.
- Why immutable month versions: a closed month must stay reproducible; corrections create a new version.
- Why a CI run under another time zone: date logic bound to Berlin must not depend on the CI machine's time zone.

## Do not claim

- external users or production users
- a public demo or a public app URL
- bank integrations
- payments
- multi-currency support
- commercial FinTech experience
- multi-user support
- categories, transactions, export or PDF import
- owner authorization checked in every server action (not fully traced)
- a Dark Factory installation

---

# Portfolio evidence ranking

Commercial evidence still leads every CV:

1. EPAM large-scale e-commerce platform
2. ProductsUp product data sync
3. Amplience automation / webhooks / mass updates
4. CommerceTools product retrieval/enrichment
5. Customer notification production incident
6. High-risk PostgreSQL migration / Factor-IT financial data

Portfolio projects (registry `primary`, chosen by vacancy, never replacing commercial evidence):

- AI-assisted SE / Developer Productivity → P1 Dark Factory (P2 JobFlow AI integration facet in the current-work block).
- Backend Node.js/TS → P2 JobFlow in the current-work block; P5 Home Budget only when data integrity is required.
- React/Next.js full-stack → P4 B1 Kompass, then P3 Cards if a requirement stays uncovered.
- Database / financial → P5 Home Budget.
- Azure / production backend → no portfolio project in Selected Projects; JobFlow bullet only.

Secondary, not CV eligible: AI Bootcamp RAG Service (`needs_evidence`, Case 11).

---

# Стабильные решения и правила файла (с v0.5)

- External name decision: use **Denys Strakhov** everywhere. Old `Denis` spelling may appear only in archived snapshots/quoted exports.
- ProductsUp changed records source is confirmed: **Cosmos DB container / Cosmos DB change records**. Remaining open details: exact container name, schema, retention/lifecycle, and low-level trigger/config details.
- Azure Service Bus subscriptions are confirmed for the event-driven customer notification flow. Remaining open details: exact topic/subscription names, event schema, retry/dead-letter behavior and alert rules.

Внутренний evidence bank / interview case bank для Denys Strakhov.

Основа: активные источники, перечисленные в `apps/api/knowledge-sources/README.md` (master CV, project inventory, tech stack, profile summary, certifications, LinkedIn source decision).  
Цель: хранить подробные, безопасные и структурированные career cases для адаптации CV, LinkedIn, cover letters, recruiter messages и подготовки к интервью на Software Engineer / Backend Developer / Backend-focused Fullstack Developer роли в Германии и remote EU.

Правила файла:

- Не использовать как публичное CV целиком.
- Не добавлять неподтверждённые факты во внешние материалы.
- Все `[needs evidence]` требуют уточнения перед использованием в CV/LinkedIn/interview как hard claim.
- `cautious wording` означает: можно использовать осторожно, без конкретизации или с формулировкой “likely / change records / participated / contributed”.
- Не завышать ownership: если flow начинался мной, но позже дорабатывался командой, писать `built the initial implementation and later supported its maintenance with the team`.
- Python/FastAPI/AI — personal / portfolio only, не commercial production.
- PHP — strong past backend foundation, не current target stack.

---

# Подтверждённые уточнения по коммерческим кейсам

Факты ниже подтверждены кандидатом (впервые записаны в v0.3) и имеют приоритет над соответствующими `[needs evidence]` в кейсах 1–8. Остальные открытые вопросы перечислены в п. 6.

## 1. Dates / consistency

- **EPAM Systems period:** final safe period for CV/files: **Nov 2021 – May 2025**.
- **CHI Software period:** exact Sep/Oct 2021 is not material for current strategy; keep a consistent external version later, but do not spend more effort on it now.
- **External CV recommendation:** use **Nov 2021 – May 2025** for EPAM.

## 2. ProductsUp sync — confirmed updates

### Changed records source

- Changed product records came from a **Cosmos DB container**.
- External wording can now use: **Cosmos DB change records**.
- Previous cautious wording `likely Cosmos DB daily change records` is superseded by this confirmation.

### Durable Functions pattern

- Confirmed pattern: **scheduled trigger + orchestrator + Activity Functions**.
- **Sub-orchestrations:** confirmed.
- **Fan-out/fan-in:** not confirmed; do not claim externally.
- **Timers:** not part of the confirmed ProductsUp wording; use scheduled trigger instead.
- **Retry policy:** built-in Durable retry policy, retrying up to 3 times, with increasing delay and jitter.
- **Idempotency:** user personally extended/added to a basic variant that already existed in the task. Safe wording: `extended idempotency logic` or `implemented/extended idempotency handling`, depending on vacancy and interview context.

### Scale and metrics

- **20,000–40,000 products per sync:** confirmed as exact working range.
- **3–5 changed locales per sync:** typical case user encountered.
- **2+ hours:** applies to full sync.
- **Tens to hundreds of MB:** total size of all files for one sync.
- **CV usage:** these metrics are useful for interview and internal evidence. For external CV, use selectively and avoid overloading bullets with too many numbers.

### Ownership

- Safe ownership wording strengthened: user was the **first/main developer of the initial implementation**.
- Later wording should still avoid sole long-term ownership claim because the flow was later maintained and extended by the team.
- Knowledge transfer was given to **developers and QA/testers**.

## 3. Amplience automation — confirmed updates

- `Hours to minutes` impact is confirmed as an observation from the team/content managers.
- `Tens to hundreds of entities/pages` is a maximum possible range, not a typical operation. Use as: `could affect tens to hundreds of entities/pages`, not `typically affected`.
- External CV can safely say: **reduced selected manual CMS operations from hours to minutes**.
- Mass update was triggered through an **Amplience UI action**.
- No rollback/preview/dry-run confirmed for mass update; do not claim it.
- Cache mechanism for nav item was **Redis**.
- Cache invalidation/update was not always directly triggered by Amplience webhook; it depended on logic in different places. Use cautious wording: `updated/invalidation cache when relevant`.
- Confirmed webhook events: **create, update, publish, unpublish**.
- Additional field examples for mass updates: numeric value, boolean field, link/reference to another schema inside the main schema.

## 4. CommerceTools — confirmed updates

- Integration used a **custom wrapper around HTTP requests via Axios**.
- Worked with: **Product Projection Search, product by ID, product search**.
- Product catalog scale up to **~100,000 unique products excluding locales** is confirmed.
- `50+ attributes` refers to attributes in the **product model**.
- Pagination used **limit/offset**.
- Batching was **custom internal batching logic**, not a CommerceTools batch API claim.
- There were practical API/page-size/rate-like constraints; data was processed in portions to reduce request frequency/load.
- Empty-value handling was implemented by the user: empty value / empty array / empty string depending on field.
- Safer wording: **CommerceTools was one of the sources of truth / one of the authoritative product data sources**, not necessarily the only source of truth.

## 5. Event-driven customer notification flow — confirmed updates

- Role: **contributor**, not owner. Use `contributed to` / `worked on`, not `owned`, unless discussing very narrow functions.
- Messaging technology confirmed: **Azure Service Bus subscriptions**.
- Example event types: **order event**, **customer notification event**.
- Data enrichment: missing/additional data was pulled from another service.
- Payload transformation: mapping DTO to downstream email/SMS service contract.
- Downstream failure handling: error handling with notification and alerts; no confirmed retry/fallback logic.

## 6. Remaining unresolved items

Остальные вопросы остаются на потом: Redis 2–4x measurement, exact customer notification incident root cause/metrics, Factor–IT 900+ DBs / validation SQL details. Готовность портфолио-проектов закрыта аудитом 2026-11-23 (кейсы P1–P5).

---

# Case 1 — ProductsUp product data synchronization flow

## 1. Case status

- **Type:** backend integration flow / long-running serverless workflow / data synchronization.
- **Company / context:** EPAM Systems; large-scale multi-locale e-commerce platform for a major European retailer; downstream product data distribution/integration service.
- **Period:** Nov 2021 – May 2025; exact active period inside EPAM project `[needs evidence]`.
- **Domain:** retail / e-commerce / product catalog / downstream product data distribution.
- **Strength for German market:** high.
- **Best use:** CV, LinkedIn, recruiter message, cover letter, interview.
- **Evidence quality:** mostly confirmed; changed product records source is confirmed as Cosmos DB container / Cosmos DB change records; exact container/schema/retention details still need evidence.

## 2. Short summary

ProductsUp sync — самый сильный backend/cloud/integration case. Это long-running product synchronization flow, который регулярно передавал актуальные product changes в downstream service через CommerceTools enrichment, CSV/GZIP generation, Azure Blob Storage, ProductsUp Stream API, retries, idempotency and per-locale logging. Case особенно полезен для Node.js/TypeScript backend, Azure/serverless, e-commerce integrations and reliability-oriented roles.

## 3. Business context

ProductsUp/downstream service должен был регулярно получать актуальные product data changes. Это было важно для product data distribution внутри multi-locale e-commerce platform. Платформа поддерживала 18+ locales, но sync обычно обрабатывал только changed locales, чаще 3–5 locales за один запуск. Для бизнеса это означало стабильное обновление product data для downstream процессов без ручной обработки.

## 4. Technical context

Участвовали следующие компоненты:

- Node.js / TypeScript backend.
- Azure Durable Functions для long-running orchestration.
- Orchestrator Functions and Activity Functions.
- Azure Blob Storage для intermediate and final files.
- CommerceTools как one of the sources of truth / source of product catalog data для enrichment.
- ProductsUp Stream API / JavaScript streams для upload.
- Cosmos DB container with Cosmos DB change records.
- Logging and monitoring through Azure Application Insights / KQL.
- Jest unit tests / SonarQube quality gate for new changes where applicable to backend work.
- Azure DevOps release/deploy flow; exact pipeline step changes `[needs evidence]`.

## 5. Architecture / flow

Подтверждённый / cautious flow:

1. Daily scheduled sync запускался по расписанию.
2. Rare emergency/manual sync существовал отдельно; отдельная emergency logic активно использовалась в начале, позже редко.
3. Flow определял changed product records за период. Source confirmed: Cosmos DB container with Cosmos DB change records.
4. Sync usually processed only changed locales, typically 3–5 locales.
5. Durable orchestration разбивала long-running workflow на orchestrator and Activity Functions.
6. Activity Functions получали/enriched product data through CommerceTools.
7. Product data форматировалась для downstream ProductsUp format.
8. Формировались CSV files.
9. CSV files сжимались в GZIP.
10. Intermediate files per locale сохранялись в Azure Blob Storage, чтобы не передавать большие payloads между Activity Functions.
11. Upload происходил через ProductsUp Stream API / JavaScript streams.
12. Для reliability использовались activity-level retries.
13. Failed product мог быть skipped and logged.
14. В конце по каждой locale формировался final result log: сколько продуктов нужно было обновить, сколько получили из CommerceTools, сколько отформатировали, сколько отправили в ProductsUp.
15. Idempotency учитывалась через composite key: orchestration cycle number + activity number + details; product ID помогал избежать duplicate product records.

Unknown / needs evidence:

- exact Cosmos DB container name/schema/retention details;
- exact Blob Storage path naming;
- fan-out/fan-in not confirmed; timers [not confirmed; do not claim] were not part of the confirmed ProductsUp pattern; scheduled trigger + orchestrator/activity confirmed;
- exact retry policy type: built-in Durable retry vs custom retry/backoff inside activities;
- exact alerting configuration.

## 6. My role and ownership

### What I owned / started

- Built the initial implementation of the ProductsUp sync flow.
- Worked on the Durable Functions-based long-running workflow.
- Was a key contributor to the flow and helped transfer knowledge to other team members.

### Confirmed implementation areas / what I implemented or worked on during initial implementation

Confirmed / safe:

- Initial sync flow implementation.
- Parts of Durable Functions orchestration and Activity Functions.
- CommerceTools enrichment logic in context of sync flow.
- CSV/GZIP generation and intermediate file handling.
- Azure Blob Storage usage for intermediate files.
- Stream upload to ProductsUp.
- Retries/backoff around CommerceTools reads, Azure Storage writes, ProductsUp API/Stream API calls.
- Failed-product logging / skip handling.
- Per-locale result logging.
- Idempotency logic using orchestration/activity composite key and product ID.

### Where I contributed

- Later maintenance and improvements of the ProductsUp flow.
- Reliability handling.
- Debugging and production support.
- Knowledge transfer to team members.

### Where team / architect / lead / DevOps were involved

- Later contributors also maintained and extended the flow.
- Infrastructure / deployment / complex Terraform or DevOps questions involved DevOps team.
- Initial architecture or large design decisions may have involved architect/lead; do not claim sole architecture ownership unless confirmed.

## 7. Concrete implementation details

- **Technologies:** Node.js, TypeScript, Azure Durable Functions, Azure Functions, Azure Blob Storage, CommerceTools, ProductsUp Stream API, JavaScript streams, Cosmos DB change records, Azure Application Insights/KQL, Jest, Azure DevOps.
- **Patterns:** long-running workflow, orchestrator/activity pattern, sub-orchestrations, retries, idempotency, per-locale processing, intermediate file storage.
- **Data handling:** 20,000–40,000 products per sync; usually 3–5 changed locales; generated CSV/GZIP files tens to hundreds of MB.
- **Validation:** product-level handling and logging; exact validation rules `[needs evidence]`.
- **Error handling:** activity-level retries; failed product skip + logs.
- **Retries:** retries with backoff for CommerceTools reads, Azure Storage writes, ProductsUp API/Stream API calls; exact implementation type `[needs evidence]`.
- **Idempotency:** composite key: orchestration cycle number + activity number + details; product ID helped avoid duplicate records.
- **Logging:** final per-locale logs with counts: to update, received from CommerceTools, formatted, sent to ProductsUp.
- **Caching:** CommerceTools responses were not cached, because CommerceTools was one of the sources of truth and catalog was large.
- **Testing:** backend unit testing with Jest existed in EPAM; exact tests for this specific flow `[needs evidence]`.
- **CI/CD or release relevance:** participated in release/deploy/redeploy flow; Azure DevOps; exact pipeline changes not remembered.

## 8. Technical challenges

- **Scale:** 20,000–40,000 products per sync, files tens to hundreds of MB, sync more than 2 hours.
- **Locale scope:** platform supported 18+ locales, but changed locales varied; usually 3–5.
- **Long-running workflow:** needed Durable Functions and Blob Storage to handle large payloads and long execution.
- **External APIs:** CommerceTools and ProductsUp Stream API; API limits/page-size constraints should be worded cautiously.
- **Data quality:** optional/missing/empty product data from CommerceTools, handled with empty values/arrays/strings where applicable.
- **Reliability:** partial failures, retrying activities, skipping failed products without blocking entire sync.
- **Idempotency:** prevent duplicate product records.
- **Observability:** need final logs per locale and traceable execution.

## 9. Reliability / risk handling

- Activity-level retries.
- Retries/backoff for external service calls and storage writes.
- Failed-product skip with logs.
- Final per-locale result summary.
- Product-ID-based duplicate prevention.
- Composite idempotency key based on orchestration cycle number + activity number + details.
- Blob Storage used to avoid passing large payloads between Activity Functions.
- Alerts / exact alert rules `[needs evidence]`.

## 10. Testing / quality

Confirmed at EPAM level:

- Backend unit tests with Jest.
- Function-level unit tests.
- Mocks for external APIs/Azure/Cosmos/Redis where needed.
- SonarQube quality gate for new changes, around 80% coverage.

For this specific ProductsUp flow:

- Exact unit tests / integration tests `[needs evidence]`.
- Test data / test environment usage `[needs evidence]`.
- Manual QA / business validation `[needs evidence]`.

## 11. Observability / debugging

Confirmed:

- Azure Application Insights.
- KQL queries.
- Logs by operation/order/function/timestamp/error patterns in EPAM context.
- Per-locale result logs for ProductsUp.
- Failed product logs.

Needs evidence:

- exact alert condition for ProductsUp.
- exact structured fields beyond locale/product counts.
- dashboards/workbooks ownership.

## 12. Communication / collaboration

Likely / confirmed from EPAM context:

- Backend team for implementation and maintenance.
- QA for changed areas and testing focus.
- BA/PM/PO for requirements, risks and uncertainty.
- DevOps for Azure/Terraform/infrastructure/deployment questions.
- Other service teams for upstream/downstream integration boundaries.
- Knowledge transfer to team members after initial implementation.

## 13. Result / impact

### Confirmed result

- Stable long-running product synchronization for changed locales within a platform supporting 18+ locales.
- Flow handled 20,000–40,000 products per sync.
- Sync often ran more than 2 hours.
- Files were typically tens to hundreds of MB.
- Reliability included retries, failed-product logging and per-locale result summaries.

### Metrics

- Platform: 18+ locales.
- Typical changed locales: 3–5.
- Typical sync volume: approximately 20,000–40,000 products.
- Duration: often 2+ hours.
- File size: tens to hundreds of MB.

### Cautious impact

- Improved reliability and traceability of downstream product data synchronization.
- Supported business need for up-to-date product data distribution.

### What not to quantify

- Exact cost savings.
- Exact ProductsUp business revenue impact.
- Exact failure-rate reduction.
- Exact latency/performance improvement.

## 14. What this proves about me

- Backend implementation in production.
- Azure serverless / Durable Functions experience.
- Ability to work with long-running workflows.
- Integration experience with CommerceTools and ProductsUp.
- Data processing at meaningful scale.
- Reliability thinking: retries, idempotency, partial failure handling.
- Observability thinking: per-locale result logs and traceability.
- Team collaboration and knowledge transfer.
- Ability to work in complex e-commerce systems.

## 15. German market relevance

This case is highly relevant for German backend roles because many German/EU companies value reliable backend integrations, cloud/serverless workflows, e-commerce domain experience, production support, and pragmatic handling of scale and external APIs. It demonstrates modern Node.js/TypeScript backend work with Azure and a clear business flow, not just isolated coding tasks.

## 16. Safe CV bullets

**Concise version:**

- Built the initial implementation and later supported its maintenance with the team on a ProductsUp product synchronization flow using Azure Durable Functions, CommerceTools enrichment, Azure Blob Storage and Stream API uploads.

**Stronger version:**

- Built the initial implementation and later supported its maintenance with the team on a long-running ProductsUp product synchronization flow, processing around 20,000–40,000 products per sync across changed locales with retries, idempotency and per-locale result logging.

**Conservative version:**

- Contributed to ProductsUp product data synchronization workflows using Azure Durable Functions, CommerceTools enrichment, CSV/GZIP generation, Azure Blob Storage and streaming uploads.

**Vacancy-specific angle — Azure/serverless:**

- Implemented long-running Azure Durable Functions workflows with orchestrators, Activity Functions, retries, Blob Storage intermediate files and idempotency logic for product data synchronization.

**Vacancy-specific angle — e-commerce:**

- Supported downstream e-commerce product data distribution by integrating CommerceTools enrichment with ProductsUp Stream API uploads for changed product data across multiple locales.

## 17. LinkedIn wording

- Built the initial implementation and later supported its maintenance with the team on a ProductsUp product synchronization flow using Azure Durable Functions, CommerceTools enrichment, Azure Blob Storage and Stream API uploads.
- Worked on long-running product data workflows processing around 20,000–40,000 products per sync across changed locales, with retries, idempotency and per-locale result logging.
- This case reflects my strongest recent backend experience: Node.js/TypeScript, Azure serverless, external integrations, data processing and production reliability.

## 18. Recruiter / cover letter angle

My strongest recent backend case is a ProductsUp product synchronization flow on a large multi-locale e-commerce platform. I built the initial implementation and later supported its maintenance with the team on a long-running Azure Durable Functions workflow involving CommerceTools enrichment, Azure Blob Storage, Stream API uploads, retries, idempotency and per-locale result logging.

## 19. Interview story — short version

In my recent EPAM project, I worked on a ProductsUp product synchronization flow for a large multi-locale e-commerce platform. The goal was to keep downstream product data up to date for changed locales. I built the initial implementation and later supported its maintenance together with the team. Technically, it used Node.js, TypeScript, Azure Durable Functions, CommerceTools enrichment, Azure Blob Storage for intermediate files, CSV/GZIP generation and ProductsUp Stream API uploads. A typical sync processed around 20,000 to 40,000 products, usually for 3 to 5 changed locales, and could run for more than two hours. The key challenges were reliability, long-running execution, large files and partial failures. We used activity-level retries, skipped and logged failed products, produced per-locale result summaries and used idempotency logic based on orchestration/activity keys and product IDs to avoid duplicates.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
I worked on a large multi-locale e-commerce platform for a major European retailer. One of the backend flows was responsible for sending changed product data to ProductsUp, a downstream product data distribution service.

**Task / Challenge:**  
The flow had to process changed product records across locales, enrich them with CommerceTools product data, generate CSV/GZIP files and upload them through the ProductsUp Stream API. It was a long-running workflow with meaningful scale: around 20,000–40,000 products per sync, usually 3–5 changed locales, tens to hundreds of MB of files, and often more than two hours of processing.

**Action:**  
I built the initial implementation and later supported its maintenance with the team. We used Azure Durable Functions with orchestrators and Activity Functions, Azure Blob Storage for intermediate files, CommerceTools enrichment, JavaScript streams for upload, retries/backoff for external calls and storage operations, and per-locale result logging. For partial failures, failed products could be skipped and logged. For idempotency, the flow used a composite key based on orchestration cycle/activity details, and product ID helped prevent duplicate product records.

**Result:**  
The flow supported stable long-running product synchronization for changed locales in a platform with 18+ locales. It made the synchronization traceable through per-locale logs and more reliable through retries, idempotency and failed-product handling.

**Reflection / what I learned:**  
This case taught me how important reliability and observability are in backend integration flows. It is not enough to just process data; for long-running workflows, you also need clear progress tracking, safe retries, idempotency and a strategy for partial failures.

## 21. Likely interview questions

1. What problem did the ProductsUp sync solve?
2. Why did you use Azure Durable Functions?
3. What was your exact role in the flow?
4. How did the orchestration work?
5. How did you handle large payloads?
6. Why did you use Azure Blob Storage between activities?
7. How did retries work?
8. How did idempotency work?
9. How did you prevent duplicate product records?
10. What happened when one product failed?
11. How did you monitor the sync?
12. How did you debug failed syncs?
13. What was the scale of the data?
14. What would you improve now?
15. What was the most difficult part?

## 22. Strong answers outline

**Why Durable Functions?**

- Long-running workflow.
- Multiple steps: changed records → enrichment → file generation → storage → upload.
- Activity Functions allowed splitting work into steps.
- Blob Storage avoided passing large payloads directly.
- Retries/idempotency were important.

**How did you handle failures?**

- Activity-level retries.
- Failed product could be skipped and logged.
- Final per-locale result log gave traceability.
- Product ID helped avoid duplicate records.
- Exact alerting details `[needs evidence]`.

**What was your ownership?**

- Built initial implementation.
- Later maintained and extended with the team.
- Did not own entire lifecycle alone.
- DevOps/architecture decisions involved team/DevOps/lead where needed.

**How did you handle scale?**

- 20,000–40,000 products per sync.
- Usually 3–5 changed locales.
- More than 2 hours.
- Tens to hundreds MB files.
- Used Blob Storage and streaming upload.

## 23. What not to overclaim

- Do not say you were the sole architect of the entire flow.
- Do not say you owned the entire lifecycle alone.
- Do not invent exact Cosmos DB container name, schema, retention, trigger internals or lifecycle cleanup unless confirmed.
- Do not claim exact failure-rate improvements.
- Do not claim ProductsUp business/revenue impact.
- Do not claim DevOps ownership.
- Do not claim all Durable patterns such as fan-out/fan-in, timers [not confirmed; do not claim] or compensation unless confirmed.

## 24. Open questions / needs evidence

- Exact Cosmos DB container name, schema, retention/lifecycle details for changed product records.
- Exact period when ProductsUp flow was implemented.
- Whether Azure Service Bus was involved specifically in ProductsUp triggers [needs evidence].
- Built-in Durable retry vs custom retry/backoff inside activity.
- Fan-out/fan-in not confirmed; timers [not confirmed; do not claim] not confirmed/should not be claimed. Confirmed pattern: scheduled trigger + orchestrator/activity.
- Exact alerting conditions.
- Exact test coverage/test types for this flow.
- Blob Storage naming/path/lifecycle cleanup.

---

# Case 2 — Amplience automation / webhooks / mass updates

## 1. Case status

- **Type:** integration / automation / CMS workflow automation.
- **Company / context:** EPAM Systems; large-scale multi-locale e-commerce platform; Amplience as CMS/content source.
- **Period:** Nov 2021 – May 2025; exact active period `[needs evidence]`.
- **Domain:** retail / e-commerce / content management / multi-locale CMS workflows.
- **Strength for German market:** high.
- **Best use:** CV, LinkedIn, cover letter, recruiter message, interview.
- **Evidence quality:** mostly confirmed; exact cache/alerting implementation needs evidence.

## 2. Short summary

Amplience automation case показывает, как manual content management process был превращён в backend automation with Azure Functions, webhooks, validation, logging, retries and cache updates. Сильная сторона кейса — понятный business impact: selected operations, которые раньше выполнялись manually through UI, были reduced from hours to minutes, а mass update мог затрагивать tens to hundreds of entities/pages.

## 3. Business context

Content managers управляли тем, что отображается на страницах или частях страниц e-commerce platform. Иногда нужно было найти все реализации конкретного schema/content type и массово изменить field, например checkbox или другое поле. До автоматизации selected changes выполнялись вручную через UI. Это занимало часы, особенно в multi-locale context, и создавало risk of human error.

## 4. Technical context

Компоненты:

- Amplience CMS / content source.
- PDP page schemas, nav item schemas, cloned nav item listing pages, schema-driven content/page structures.
- Amplience webhooks: create, update, publish, unpublish.
- Node.js / TypeScript Azure Functions.
- Header/payload validation, secret key validation.
- Cache update logic, especially navigation cache when nav item was affected.
- Redis / cache-related services for selected Amplience API responses and navigation data.
- Azure Application Insights / KQL for logs and debugging.
- Alerts for critical paths; exact alert implementation `[needs evidence]`.

## 5. Architecture / flow

1. Content manager creates/updates/publishes/unpublishes content in Amplience.
2. Amplience emits webhook event.
3. Azure Function receives webhook request.
4. Function validates headers / secret keys / payload.
5. Function identifies event type: create, update, publish, unpublish.
6. Function identifies affected content/schema type.
7. For selected mass update tasks, backend logic applies field changes for a specific content/schema type.
8. If nav item is affected, navigation cache is updated / invalidated.
9. Function logs operation ID, steps and results.
10. Function uses retries when calling other services.
11. Critical paths could trigger alerting; exact implementation `[needs evidence]`.

Unknown / needs evidence:

- exact cache mechanism and key strategy;
- exact alert conditions;
- exact Amplience API operations;
- exact number of locales per specific operation.

## 6. My role and ownership

### What I owned / started

- Worked on Amplience-related backend automation and webhook logic.
- Participated in mass update logic.
- Implemented/delivered tasks around Amplience webhooks and content workflows.

### What I implemented or contributed to

Confirmed / safe:

- Webhook handling logic for Amplience events.
- Header/payload validation.
- Event handling for create/update/publish/unpublish.
- Mass update logic for field changes for a specific content/schema type.
- Cache update logic when nav item was affected.
- Logging: operation ID, steps, results.
- Retries when calling other services.

### Where I contributed

- Alerting discussions / implementation support for critical flows.
- Automation workflows and mass update operations.
- Debugging and production support.

### Where team / architect / lead / DevOps were involved

- Overall platform architecture and service boundaries likely involved lead/architect.
- DevOps involved in infrastructure/alerts when needed.
- Content/business requirements came from BA/PO/content-management needs.

## 7. Concrete implementation details

- **Technologies:** Node.js, TypeScript, Azure Functions, Amplience, Redis/cache, Azure Application Insights/KQL, Jest/SonarQube at EPAM level.
- **Patterns:** webhook handler, event-driven automation, validation, mass update, cache invalidation/update, logging, retries.
- **Data handling:** content/schema instances, PDP page schemas, nav item schemas, cloned nav item listing pages.
- **Validation:** headers, secret keys, payload.
- **Error handling:** retries when calling other services; exact failure handling `[needs evidence]`.
- **Retries:** used when calling other services.
- **Idempotency:** `[needs evidence]` for Amplience-specific idempotency.
- **Logging:** operation ID, steps, results.
- **Caching:** navigation cache updated when nav item changed; Redis used for Amplience API responses and navigation data.
- **Testing:** EPAM Jest unit testing at backend level; exact Amplience test cases `[needs evidence]`.
- **CI/CD or release relevance:** SonarQube quality gates, Azure DevOps release process at EPAM level.

## 8. Technical challenges

- Mapping Amplience events to backend business actions.
- Safely processing create/update/publish/unpublish webhook events.
- Validating secrets/headers/payload.
- Handling mass updates across tens to hundreds of entities/pages.
- Avoiding human errors from manual UI operations.
- Managing cache updates/invalidation for navigation data.
- Ensuring logs were traceable with operation ID and steps.
- Handling multi-locale content workflows.

## 9. Reliability / risk handling

- Header and payload validation.
- Secret key validation.
- Retries when calling other services.
- Operation ID and step/result logging.
- Cache update/invalidation when nav item changed.
- Alerts for critical flows; exact rules `[needs evidence]`.
- No confirmed rollback mechanism for content mass updates; use `[needs evidence]` if asked.

## 10. Testing / quality

Confirmed at EPAM level:

- Jest unit tests for backend functions/features.
- SonarQube quality gate for new changes.
- QA communication after feature completion.

For this specific case:

- Exact unit tests for webhook handler `[needs evidence]`.
- Mocking Amplience webhooks/API `[needs evidence]`.
- QA validation of affected pages/schemas `[needs evidence]`.
- Manual validation by content managers `[needs evidence]`.

## 11. Observability / debugging

Confirmed:

- Azure Application Insights.
- KQL.
- Operation ID logging.
- Step/result logging.
- Alerts for critical flows at project level.

Needs evidence:

- Exact alert triggers.
- Whether dashboards/workbooks existed.
- Exact log fields beyond operation ID, steps and results.

## 12. Communication / collaboration

- QA: affected areas and testing focus.
- BA: content workflow requirements, edge cases.
- PM/PO: timelines, risks, uncertainty.
- DevOps: alerting/infrastructure where needed.
- Content/business stakeholders indirectly through requirements.
- Other teams if webhook triggered downstream service notifications.

## 13. Result / impact

### Confirmed result

- Automated selected Amplience CMS workflows.
- Handled create/update/publish/unpublish events.
- Mass updates could affect tens to hundreds of entities/pages.
- Before automation, content managers performed selected changes manually through UI.
- Selected operations were reduced from hours to minutes.

### Metrics

- Platform: 18+ locales.
- Affected entities/pages: tens to hundreds per mass update operation.
- Time reduction: from hours to minutes for selected operations.

### Cautious impact

- Reduced manual work and human error risk for content managers.
- Improved consistency across content/page/schema changes.

### What not to quantify

- Total annual time saved.
- All content-management operations.
- Exact number of content managers affected.
- Exact error-rate reduction.

## 14. What this proves about me

- Ability to automate business processes.
- Backend integration with CMS/webhooks.
- Validation and reliability thinking.
- Understanding of content workflows in e-commerce.
- Ability to deliver business impact, not only code.
- Multi-locale production system experience.
- Logging/observability mindset.

## 15. German market relevance

German/e-commerce companies value engineers who can automate operational workflows, reduce manual work, and integrate third-party content/product systems. This case is strong for backend roles in retail/e-commerce, CMS integration, API automation, serverless backend and production-support contexts.

## 16. Safe CV bullets

**Concise version:**

- Automated selected Amplience CMS workflows using webhook-based Azure Functions, validation, logging, retries and cache updates.

**Stronger version:**

- Automated selected Amplience CMS workflows for a multi-locale e-commerce platform, handling create/update/publish/unpublish webhooks and mass field updates across tens to hundreds of entities/pages.

**Conservative version:**

- Contributed to Amplience CMS automation and webhook processing using Node.js, TypeScript and Azure Functions.

**Business impact version:**

- Reduced selected manual CMS operations from hours to minutes by automating Amplience webhook and mass update workflows.

**E-commerce integration version:**

- Integrated Amplience CMS workflows with backend services, including webhook validation, cache updates, retries and traceable logging.

## 17. LinkedIn wording

- Automated selected Amplience CMS workflows using Azure Functions, webhook validation, logging, retries and cache updates.
- Worked on mass update automation for content/schema types, reducing selected manual UI operations from hours to minutes.
- Integrated Amplience CMS events such as create, update, publish and unpublish into backend automation workflows.

## 18. Recruiter / cover letter angle

One of my strongest e-commerce integration cases was Amplience automation: I worked on webhook-based Azure Functions that automated selected CMS workflows and mass updates, reducing manual UI work for content managers from hours to minutes.

## 19. Interview story — short version

In my EPAM project, I worked on Amplience automation for a large multi-locale e-commerce platform. Content managers sometimes needed to update many implementations of a specific schema or content type manually through the UI, which could take hours and introduced human-error risk. I worked on webhook-based Azure Functions handling Amplience events like create, update, publish and unpublish. The functions validated headers and payloads, triggered business logic, updated cache when navigation items were affected, logged operation IDs, steps and results, and used retries when calling other services. For selected operations, automation reduced work from hours to minutes and could affect tens to hundreds of entities or pages.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
On a large multi-locale e-commerce platform, content managers used Amplience to manage content and page structures. Some updates required changing the same field across many content/schema instances.

**Task / Challenge:**  
The previous process was manual UI work. It could take hours, especially when tens or hundreds of entities/pages were affected, and it had a high risk of missed items or inconsistent updates.

**Action:**  
I worked on Azure Functions that processed Amplience webhook events such as create, update, publish and unpublish. The functions validated headers and payloads, applied business logic for selected content/schema types, updated navigation cache when needed, logged operation IDs and step results, and used retries when calling other services.

**Result:**  
Selected content-management operations were reduced from hours to minutes. The automation also reduced human-error risk and made the process more traceable through logging.

**Reflection / what I learned:**  
This case showed me that backend automation can create very visible business value. Even when the technical task is “just a webhook”, the real value is reducing manual work, improving consistency and making operations traceable.

## 21. Likely interview questions

1. What business problem did Amplience automation solve?
2. Which Amplience events did you handle?
3. How did webhook validation work?
4. What kind of mass updates were performed?
5. How did you avoid accidental updates?
6. How did cache update/invalidation work?
7. What was logged?
8. How did retries work?
9. What was the impact for content managers?
10. How many entities/pages were affected?
11. Did you write tests for webhook handlers?
12. How did QA validate changes?
13. Did you use Redis for navigation cache?
14. What would you improve now?
15. How did you handle multi-locale complexity?

## 22. Strong answers outline

**Business value:**

- Manual UI work by content managers.
- Tens to hundreds of entities/pages.
- Selected operations reduced from hours to minutes.
- Lower human-error risk.

**Technical flow:**

- Amplience event → Azure Function.
- Validate headers/secret/payload.
- Identify event/content type.
- Apply business logic/mass update.
- Update cache if needed.
- Log operation ID/steps/results.
- Retry calls to other services.

**Ownership:**

- Implemented/contributed to webhook automation and mass update logic.
- Do not claim entire CMS platform ownership.
- Alerting/cache details can be described only at confirmed level.

## 23. What not to overclaim

- Do not say all content operations were automated.
- Do not say you owned entire Amplience integration architecture.
- Do not claim exact annual time savings.
- Do not claim exact error-rate reduction.
- Do not overclaim Redis/cache architecture ownership.
- Do not claim alert implementation details unless confirmed.
- Do not claim rollback/idempotency for mass updates unless confirmed.

## 24. Open questions / needs evidence

- Exact period of Amplience automation work.
- Exact cache key/invalidation strategy.
- Exact alert conditions.
- Exact unit tests/mocks for Amplience webhooks.
- Whether idempotency was implemented for webhooks.
- Examples of specific field changes besides generic field/checkbox.
- QA/content manager acceptance process.

---

# Case 3 — CommerceTools product data retrieval and enrichment

## 1. Case status

- **Type:** backend/API/data integration / product catalog retrieval and enrichment.
- **Company / context:** EPAM Systems; large-scale e-commerce platform; CommerceTools as product catalog one of the sources of truth.
- **Period:** Nov 2021 – May 2025; exact active period `[needs evidence]`.
- **Domain:** retail / e-commerce / product catalog / product information.
- **Strength for German market:** high.
- **Best use:** CV, LinkedIn, recruiter message, cover letter, interview.
- **Evidence quality:** mostly confirmed; exact API limit/rate-limit details need refresh.

## 2. Short summary

CommerceTools case показывает сильный e-commerce/backend data integration experience. Product data использовался для PDP, listing pages, BFF/backend flows and ProductsUp enrichment. Важные details: до ~100,000 unique products excluding locales, 50+ attributes, empty-value handling, pagination where supported, custom batching where needed, and no caching because CommerceTools was one of the sources of truth.

## 3. Business context

Разные frontend/BFF и backend flows должны были получать product details: для PDP, listing pages, product-information flows, validation/enrichment and ProductsUp sync. Product catalog data должен был быть authoritative, поэтому CommerceTools использовался как one of the sources of truth.

## 4. Technical context

Компоненты:

- CommerceTools product catalog / API.
- Node.js / TypeScript backend services.
- Azure Functions.
- BFF/API layer.
- React/Next.js frontend pages using product data indirectly via BFF/backend.
- ProductsUp sync enrichment.
- Product IDs, filters, groups/categories, sizes, colors, names, materials, 50+ product attributes.
- Application Insights/KQL for debugging at project level.

## 5. Architecture / flow

1. Backend/BFF/product flow needed product information.
2. Service called CommerceTools to retrieve product data by product ID, filters, product groups/categories or other product-information criteria.
3. Pagination was used where supported by API.
4. Custom batching logic was applied where needed for large product retrieval/enrichment flows.
5. Product attributes were mapped/normalized for frontend/BFF/backend/ProductUp needs.
6. Optional/missing/empty attributes were handled safely.
7. If attribute was missing/empty, safe empty defaults were used: empty value, empty array or empty string depending on field.
8. CommerceTools responses were not cached because CommerceTools was one of the sources of truth and catalog was large.
9. Product data was used in PDP/listing/product-information flows and ProductsUp enrichment.

Needs evidence:

- exact CommerceTools endpoint types used;
- SDK vs custom wrapper vs direct HTTP details;
- exact API limits encountered;
- exact product attributes beyond examples.

## 6. My role and ownership

### What I owned / started

- Implemented and maintained CommerceTools product data retrieval logic for backend/BFF/product flows.
- Worked with product catalog data in production.

### What I implemented myself

Confirmed / safe:

- Retrieval by product ID.
- Retrieval by filters.
- Retrieval by group/category.
- Handling 50+ product attributes.
- Handling optional/missing/empty attributes.
- Using pagination where supported.
- Applying custom batching logic where needed.
- Applying product data to PDP/listing/product-information flows and ProductsUp enrichment.

### Where I contributed

- Frontend/BFF/backend integration around product data.
- ProductsUp enrichment.
- Debugging product data issues.

### Where team / architect / lead / DevOps were involved

- Overall product catalog architecture and CommerceTools platform configuration were not owned by me unless confirmed.
- Initial architecture/API contract decisions likely involved lead/architect.
- DevOps not central except deployment/infrastructure context.

## 7. Concrete implementation details

- **Technologies:** Node.js, TypeScript, CommerceTools, Azure Functions, BFF/API layer, React/Next.js indirectly, ProductsUp sync, Jest/SonarQube at EPAM level.
- **Patterns:** API integration, product retrieval, pagination, custom batching, DTO/data mapping, safe defaults.
- **Data handling:** up to ~100,000 unique products excluding locales; 50+ product attributes; PDP/listing/product-information usage.
- **Validation:** optional/missing/incorrect/empty attributes handled; exact validation rules `[needs evidence]`.
- **Error handling:** missing/empty values mapped to empty values/arrays/strings; external API errors `[needs evidence]`.
- **Retries:** retry handling existed in integration flows; exact CommerceTools retry implementation `[needs evidence]`.
- **Caching:** no caching of CommerceTools responses because one of the sources of truth and large catalog.
- **Testing:** EPAM backend Jest unit testing; exact CommerceTools test cases `[needs evidence]`.
- **CI/CD:** SonarQube gates and Azure DevOps at EPAM level.

## 8. Technical challenges

- Large catalog: up to ~100,000 unique products excluding locales.
- Product attributes: 50+ attributes.
- Empty/missing values.
- API/page-size constraints.
- Pagination where supported.
- Custom batching where needed.
- Azure Functions memory/runtime limits.
- CommerceTools as one of the sources of truth, therefore no caching.
- Product data used in multiple contexts: PDP, listing, BFF/backend, ProductsUp.

## 9. Reliability / risk handling

- Safe empty defaults instead of risky fallback business values.
- No caching because CommerceTools was one of the sources of truth.
- Pagination and batching to handle larger retrieval needs.
- Azure Functions limits considered.
- Retries for CommerceTools reads confirmed in ProductsUp flow; exact generic CommerceTools retry strategy `[needs evidence]`.
- Logging/debugging through project observability where applicable.

## 10. Testing / quality

Confirmed at EPAM level:

- Jest backend unit tests.
- Function-level tests with mocks.
- SonarQube quality gates.

Needs evidence:

- Exact CommerceTools mocks/test cases.
- Contract tests / integration tests.
- Test data examples.
- QA validation for PDP/listing/product data.

## 11. Observability / debugging

Confirmed at project level:

- Application Insights.
- KQL.
- Logs by function name, timestamps, IDs, error patterns.

Needs evidence for this case:

- exact CommerceTools error logs.
- API limit logs.
- product ID / locale / attribute logging fields.

## 12. Communication / collaboration

- Frontend team for PDP/listing data needs.
- BFF/backend team for contracts and data mapping.
- QA for testing affected pages/flows.
- BA/PO for business logic around product attributes.
- ProductsUp-related integration work with relevant service teams.
- DevOps if deployment/config/infrastructure involved.

## 13. Result / impact

### Confirmed result

- Stable product data retrieval/enrichment for PDP, listing pages, product-information flows, BFF/backend and ProductsUp sync.
- Product catalog scale up to approximately 100,000 unique products excluding locales.
- Handled 50+ product attributes and empty/missing data.

### Metrics

- Up to ~100,000 unique products excluding locales.
- 50+ product attributes.

### Cautious impact

- Improved robustness of product data handling across frontend/backend/downstream flows.
- Supported reliable e-commerce product information usage.

### What not to quantify

- Latency/performance improvement.
- Exact product volume per request.
- Exact API limit numbers unless refreshed.
- Revenue or conversion impact.

## 14. What this proves about me

- E-commerce product catalog integration experience.
- Working with source-of-truth external APIs.
- Data mapping and DTO handling.
- Handling optional/missing/empty data.
- Backend/BFF/frontend collaboration.
- API constraints awareness.
- Ability to support multiple product-information consumers.

## 15. German market relevance

CommerceTools is a recognizable e-commerce technology in the European market. Even if the role does not use CommerceTools specifically, this case shows strong transferable experience with product catalog APIs, data consistency, backend/BFF integration and production e-commerce systems.

## 16. Safe CV bullets

**Concise version:**

- Built CommerceTools product data retrieval logic for PDP, listing, BFF/backend and ProductsUp enrichment flows.

**Stronger version:**

- Integrated CommerceTools product data into backend/BFF/product-information flows, handling up to ~100,000 unique products, 50+ attributes, filters, optional/empty fields, pagination where supported and custom batching where needed.

**Conservative version:**

- Worked with CommerceTools product catalog data for product information, enrichment and backend/BFF integration flows.

**Vacancy-specific angle — e-commerce:**

- Handled CommerceTools product data as a one of the sources of truth for e-commerce flows, including PDP, listing pages, product enrichment and downstream synchronization.

**Vacancy-specific angle — backend data:**

- Implemented robust product data handling with safe defaults for missing/empty attributes and API/page-size constraints.

## 17. LinkedIn wording

- Worked with CommerceTools product catalog data as a one of the sources of truth for PDP, listing, BFF/backend and ProductsUp enrichment flows.
- Built product data retrieval logic handling 50+ attributes, filters/groups, optional/empty fields, pagination where supported and batching where needed.
- Supported product-information flows for a catalog of up to approximately 100,000 unique products excluding locales.

## 18. Recruiter / cover letter angle

I have hands-on e-commerce integration experience with CommerceTools, where I worked with product catalog data as a one of the sources of truth for PDP, listing, BFF/backend and downstream synchronization flows, handling large product catalogs, many attributes and missing/empty data safely.

## 19. Interview story — short version

In my EPAM project, CommerceTools was used as the one of the sources of truth for product catalog data. I worked on product data retrieval and enrichment for PDP, listing pages, BFF/backend flows and ProductsUp synchronization. The catalog scale was up to around 100,000 unique products excluding locales, and product data included 50+ attributes such as product IDs, sizes, colors, names and materials. A common challenge was handling missing or empty attributes safely, so depending on the field we used empty values, empty arrays or empty strings instead of inventing business fallback values. We used pagination where supported by the API and custom batching where needed. CommerceTools responses were not cached because it was the authoritative one of the sources of truth for a large product catalog.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
On a large multi-locale e-commerce platform, many frontend and backend flows needed accurate product information from CommerceTools.

**Task / Challenge:**  
The system needed to retrieve product data for PDP, listing pages, BFF/backend flows and ProductsUp enrichment. The data model was large, with up to around 100,000 unique products excluding locales and 50+ product attributes. Some attributes could be empty or missing.

**Action:**  
I implemented and maintained CommerceTools product retrieval logic. I worked with product IDs, filters, groups/categories and product attributes. I handled optional and empty values safely using empty values, arrays or strings depending on the field. I used pagination where supported by the API and custom batching where needed for larger retrieval/enrichment flows. We did not cache CommerceTools responses because CommerceTools was treated as the one of the sources of truth.

**Result:**  
The product data retrieval logic supported multiple flows: PDP, listing pages, BFF/backend product-information use cases and ProductsUp enrichment. It improved robustness when working with large product data and inconsistent or empty attributes.

**Reflection / what I learned:**  
This case reinforced that product catalog integrations are not just API calls. The main challenge is reliable data handling: missing values, many attributes, pagination, batching, API constraints and making data usable for several downstream consumers.

## 21. Likely interview questions

1. What did you use CommerceTools for?
2. Was CommerceTools the one of the sources of truth?
3. What product data did you retrieve?
4. How large was the catalog?
5. How did you handle missing attributes?
6. Did you use pagination?
7. Did you use batching?
8. Did you cache CommerceTools responses?
9. Why not cache them?
10. What flows consumed CommerceTools data?
11. Did you work with SDK or direct API?
12. How did you handle API limits?
13. How did you test product data retrieval?
14. What was the hardest part?
15. What would you improve now?

## 22. Strong answers outline

**Handling empty values:**

- Common issue: empty/missing product attributes.
- Used safe empty defaults: empty value/array/string depending on field.
- Did not invent fallback business data.
- This reduced risk of incorrect product information.

**Caching decision:**

- CommerceTools was one of the sources of truth.
- Large and authoritative catalog/data source.
- Responses were not cached.
- Other caching existed for Amplience/navigation, but not CommerceTools.

**Scale / API constraints:**

- Up to ~100,000 unique products excluding locales.
- 50+ product attributes.
- Pagination where supported.
- Custom batching where needed.
- Exact API/rate limits should be refreshed before deep interview.

## 23. What not to overclaim

- Do not claim CommerceTools platform architecture ownership.
- Do not claim you designed the product catalog model.
- Do not claim exact API rate limits unless refreshed.
- Do not claim CommerceTools batch API unless confirmed.
- Do not claim caching strategy for CommerceTools; it was not cached.
- Do not claim performance improvements without metrics.
- Do not claim SDK/direct HTTP details unless confirmed.

## 24. Open questions / needs evidence

- Exact active period.
- SDK vs custom wrapper vs direct HTTP.
- Exact CommerceTools endpoints used.
- Exact API/rate/page-size limits encountered in project.
- Exact attribute examples beyond size/color/name/material.
- Exact tests/mocks.
- Exact logs/error handling around CommerceTools failures.

---

# Case 4 — Customer email notification production incident

## 1. Case status

- **Type:** production incident / cross-service debugging / observability improvement.
- **Company / context:** EPAM Systems; order/payment user journey; upstream service → intermediate service → email/SMS service.
- **Period:** Nov 2021 – May 2025; exact date/period `[needs evidence]`.
- **Domain:** e-commerce / customer notifications / production support.
- **Strength for German market:** high.
- **Best use:** interview, CV bullet for production support roles, cover letter for reliability/observability roles.
- **Evidence quality:** partial; story confirmed, metrics/details need evidence.

## 2. Short summary

This is the strongest production debugging / observability case. A customer did not receive an email notification after order/payment. The investigation required tracing logs across upstream service, intermediate service and downstream email/SMS delivery service, identifying missing required data and improving logs/alerts for a business-critical notification flow.

## 3. Business context

Customer notifications were business-critical in the order/payment user journey. If a user did not receive an email after a critical step, it affected customer experience and required fast investigation across several services.

## 4. Technical context

Flow components:

1. Upstream service that started/passed data.
2. Intermediate service that gathered/enriched/formatted data.
3. Downstream email/SMS delivery service.

Relevant technologies / tools:

- Azure Functions / backend services.
- Azure Application Insights.
- KQL.
- Logs by order number / operation ID.
- Email/SMS downstream service.
- Event-driven notification flow using Azure Service Bus subscriptions.

## 5. Architecture / flow

1. User completes order/payment-related step.
2. Upstream service emits/passes event/data.
3. Intermediate service receives data via Azure Service Bus subscription/event flow.
4. Intermediate service processes event by type.
5. Intermediate service adds missing/additional data where needed.
6. Intermediate service formats payload for email/SMS service.
7. Downstream email/SMS service attempts to send notification.
8. Incident: user did not receive email notification.
9. Teams searched logs by order number.
10. Upstream, intermediate and downstream services were checked.
11. Issue was localized: intermediate service could not get required data, and after formatting, email service could not send email.
12. Additional logs and Azure alerts were added because notification flow was business-critical.

## 6. My role and ownership

### What I owned / started

- Key participant in intermediate service / notification flow changes, tests and debugging.
- Responsible for a set of functions in the intermediate service.

### What I implemented myself

Confirmed / safe:

- Worked on functions of intermediate service.
- Processed data according to event type.
- Added missing data.
- Formatted payload.
- Forwarded payload to email/SMS service.
- Added or contributed to additional logs and Azure alerts after incident.

### Where I contributed

- Incident investigation across upstream/intermediate/downstream services.
- Log analysis using order number.
- Failure-area / root-cause-area localization.
- Observability improvements.

### Where team / architect / lead / DevOps were involved

- Other teams checked upstream and downstream services.
- DevOps/team may have finalized alerting.
- Do not claim sole root-cause ownership if it was team investigation.

## 7. Concrete implementation details

- **Technologies:** Azure Functions, Node.js/TypeScript, Application Insights, KQL, email/SMS downstream service, Azure Service Bus subscriptions.
- **Patterns:** event-driven flow, payload enrichment, payload formatting, cross-service tracing.
- **Data handling:** order number / required data / formatted notification payload.
- **Validation:** missing required data identified; exact validation added `[needs evidence]`.
- **Error handling:** downstream email service could not send email after formatting; exact error `[needs evidence]`.
- **Retries:** `[needs evidence]`.
- **Idempotency:** `[needs evidence]`.
- **Logging:** logs by order number; additional logs after incident.
- **Alerts:** Azure alerts added; exact alert conditions `[needs evidence]`.
- **Testing:** tests/debugging of flow; exact Jest tests `[needs evidence]`.

## 8. Technical challenges

- Cross-service debugging.
- Unclear source of failure at first: upstream, intermediate or downstream.
- Missing required data.
- Notification flow was business-critical.
- Need to trace by order number across multiple services.
- Need to improve observability to detect similar issues earlier.
- Potential event-driven complexity.

## 9. Reliability / risk handling

- Additional logs were added.
- Azure alerts were added for critical flow.
- Missing data issue was localized.
- Flow traceability improved.
- Exact validation/retry/fallback changes `[needs evidence]`.
- No confirmed rollback needed.

## 10. Testing / quality

Confirmed at EPAM level:

- Jest unit tests.
- SonarQube gates.
- QA collaboration.

Specific to incident:

- Flow was tested/debugged.
- Exact unit/integration tests `[needs evidence]`.
- Whether QA regression was added `[needs evidence]`.
- Whether postmortem process existed `[needs evidence]`.

## 11. Observability / debugging

Confirmed:

- Azure Application Insights.
- KQL.
- Logs by order number.
- Checked upstream, intermediate and downstream services.
- Additional logs added.
- Azure alerts added.

Needs evidence:

- exact log fields: orderId, operationId, locale, event type, step, payload status, error code.
- exact alert condition: exception, missing required field, failed downstream call or failed status.
- investigation time.

## 12. Communication / collaboration

- Backend team.
- Other service teams: upstream and downstream.
- QA.
- PM/PO because notifications were customer journey critical.
- DevOps or platform team for alerts where needed.
- Possibly BA to understand required data/business flow.

## 13. Result / impact

### Confirmed result

- Failure reason was localized.
- Additional logs and Azure alerts were added.
- Observability improved for a business-critical notification flow.

### Metrics

- Affected users `[needs evidence / unknown]`.
- Investigation time `[needs evidence]`.
- Alert response process `[needs evidence]`.

### Cautious impact

- Reduced risk of undetected notification failures.
- Improved ability to trace similar issues across services.

### What not to quantify

- Number of affected customers.
- MTTR reduction.
- Incident frequency reduction.
- SLA impact.

## 14. What this proves about me

- Production debugging experience.
- Ability to trace failures across services.
- Business-critical thinking.
- Observability/logging mindset.
- Team collaboration under production pressure.
- Understanding of event-driven notification flows.
- Ability to improve reliability after incident.

## 15. German market relevance

German companies value engineers who can support production systems, investigate incidents, communicate across teams and improve observability. This case is especially useful for roles mentioning production support, reliability, monitoring, incident investigation, backend operations or cross-team debugging.

## 16. Safe CV bullets

**Concise version:**

- Investigated production notification failures using Azure Application Insights and KQL, tracing issues across upstream, intermediate and downstream services.

**Stronger version:**

- Helped localize a business-critical customer notification issue across multiple services and improved observability through additional logs and Azure alerts.

**Conservative version:**

- Participated in production debugging for customer notification flows, using logs and Application Insights to identify missing data and service boundaries.

**Vacancy-specific angle — observability:**

- Improved traceability of a business-critical notification flow by adding logs/alerting support after cross-service production investigation.

## 17. LinkedIn wording

- Investigated production issues using Azure Application Insights and KQL, tracing failures across Azure Functions and backend services.
- Worked on business-critical customer notification flows involving event processing, payload enrichment and downstream email/SMS delivery.
- Helped improve observability for customer notification workflows through additional logs and Azure alerts.

## 18. Recruiter / cover letter angle

I also have production support experience: for example, I helped investigate a customer notification issue across upstream, intermediate and downstream services using Application Insights and KQL, and contributed to improved logging and alerting for the flow.

## 19. Interview story — short version

One production issue I worked on involved a customer email notification not being sent after an order/payment step. The flow involved an upstream service, an intermediate service that gathered and formatted data, and a downstream email/SMS service. We traced logs by order number across the services using Azure Application Insights and KQL. The issue was localized around missing required data in the intermediate flow, and after formatting the downstream email service could not send the message. After the investigation, we added additional logs and Azure alerts because this notification flow was business-critical. My role was as a key contributor to the intermediate service and to the debugging of this flow.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
On a large e-commerce platform, customer email/SMS notifications were part of the order/payment journey. One incident involved a customer not receiving an expected email notification.

**Task / Challenge:**  
The flow crossed multiple services: an upstream service, my intermediate service and a downstream email/SMS delivery service. At the beginning, it was not clear where the failure happened.

**Action:**  
We investigated logs by order number across the services using Azure Application Insights and KQL. We checked the upstream service, the intermediate service and the email/SMS service. The problem was localized around required data that the intermediate service could not obtain or pass correctly, and after formatting the downstream service could not send the email. After that, additional logs and Azure alerts were added for the critical flow.

**Result:**  
The failure area / root-cause area was localized, and the flow became more observable. The team reduced the risk of similar notification failures going unnoticed.

**Reflection / what I learned:**  
The case showed that production debugging is not only about reading exceptions. In distributed systems, you need consistent IDs, good logging, understanding of the business flow and cooperation with other service teams.

## 21. Likely interview questions

1. What happened in the incident?
2. How did you find the responsible service?
3. What tools did you use?
4. What did you search by?
5. What was your role?
6. What was the root cause?
7. Was it upstream, intermediate or downstream?
8. What logs were missing?
9. What logs did you add?
10. What alerts were added?
11. How did QA validate the fix?
12. How long did investigation take?
13. What would you improve now?
14. How do you approach cross-service debugging?
15. How do you communicate during incidents?

## 22. Strong answers outline

**Debugging approach:**

- Start from business event/order number.
- Trace across upstream/intermediate/downstream.
- Use Application Insights and KQL.
- Compare expected vs actual payload/data.
- Identify missing required data.

**Role boundaries:**

- Key contributor to intermediate service.
- Participated in team investigation.
- Did not single-handedly own all services.
- Other teams checked their services.

**Observability improvement:**

- Added additional logs.
- Azure alerts for critical flow.
- Exact alert condition `[needs evidence]`.
- Improved traceability.

## 23. What not to overclaim

- Do not claim exact number of affected users.
- Do not claim exact investigation time.
- Do not claim sole ownership of root cause across all services.
- Do not claim exact alert logic unless confirmed.
- Do not claim full incident commander / SRE role.
- Do not claim postmortem process unless confirmed.

## 24. Open questions / needs evidence

- Exact date/period.
- One incident or recurring class of problems?
- Investigation time.
- Exact root cause: upstream missing data, intermediate mapping, downstream validation, template issue or combination.
- Exact required field.
- Exact downstream error.
- Exact logs added.
- Exact alert condition.
- Whether validation/retry/fallback was added.
- Whether you were owner or key contributor of intermediate service.

---

# Case 5 — High-risk PostgreSQL account-splitting migration

## 1. Case status

- **Type:** migration / data integrity / financial data risk handling.
- **Company / context:** Factor–IT; public-sector budget accounting production system.
- **Period:** Dec 2016 – Jun 2021; exact case period `[needs evidence]`.
- **Domain:** public-sector finance / budget accounting / financial reporting.
- **Strength for German market:** high.
- **Best use:** interview, CV for SQL-heavy/backend/data roles, cover letter for finance/enterprise roles.
- **Evidence quality:** mostly confirmed; exact validation SQL/backups/details need evidence.

## 2. Short summary

This is the strongest old-stack backend maturity case. It demonstrates complex PostgreSQL migrations, financial data integrity, irreversible/hard-to-rollback data risk, analyst collaboration, validation and testing on real-data copies. Even though the stack was PHP/PostgreSQL, the hiring signal is backend maturity and data integrity.

## 3. Business context

В public-sector accounting system деньги раньше учитывались на одном счёте, но нужно было разбить их на два счёта и корректно разложить данные по reporting registers. На каждом новом счёте нужно было указать правильные аналитические метрики. Ошибка могла повлиять на financial/accounting data and reporting correctness.

## 4. Technical context

Компоненты:

- PHP 7.x backend.
- Fully custom in-house PHP framework.
- PostgreSQL.
- SQL/PHP migration scripts.
- 3–10 related tables per migration.
- Organization-specific databases; migrations could affect from one database up to all 900+ databases.
- Transactions mandatory in migrations.
- Test database copies / real-data copies.
- Intermediate tables for preserving original state.

## 5. Architecture / flow

1. Analyst/chief analyst defined business logic and accounting/reporting requirements.
2. Developer discussed migration logic with analyst/lead/team.
3. Existing financial data in one account needed to be split into two accounts.
4. Related reporting registers and analytical metrics needed updates.
5. Migration touched 3–10 related tables.
6. SQL/PHP migration script was written.
7. Transaction used for migration on each DB.
8. Intermediate tables could preserve original state / source data.
9. Migration tested on copy of user database / real-data copy.
10. Validation checks were performed after migration.
11. Rollback plan where possible; some migrations were irreversible or very hard to roll back.
12. In some cases, focus group/users were involved in validation.

Needs evidence:

- exact SQL validation examples.
- exact backup process.
- exact number of databases for this specific migration.
- exact rollback examples.

## 6. My role and ownership

### What I owned / started

- Independently wrote SQL/PHP migration scripts.
- Worked directly on data migration logic.
- Participated in risk reduction and validation.

### What I implemented myself

Confirmed:

- SQL/PHP migration scripts.
- Multi-table updates across 3–10 related tables.
- Validation steps.
- Intermediate tables for preserving original data.
- Transaction-based migrations.
- Testing on database copies.

### Where I contributed

- Business logic clarification with analyst.
- Risk assessment and rollback planning where possible.
- Production support/release process.

### Where team / analyst / lead were involved

- Analyst/chief analyst provided accounting logic and requirements.
- Lead/team participated in concept discussions.
- QA/focus users sometimes participated in testing/validation.

## 7. Concrete implementation details

- **Technologies:** PHP 7.x, PostgreSQL, SQL, custom framework.
- **Patterns:** migration scripts, transactions, intermediate tables, validation queries, rollback planning where possible.
- **Data handling:** financial accounts, reporting registers, analytical metrics, organization-specific databases.
- **Validation:** validation on stages of migration; exact SQL checks `[needs evidence]`.
- **Error handling:** transaction rollback where possible; exact failure handling `[needs evidence]`.
- **Rollback:** planned where possible; some migrations irreversible/hard to roll back.
- **Testing:** test DB copies, real-data copies, possible focus group validation.
- **CI/CD or release relevance:** participated in releases; exact migration deployment process `[needs evidence]`.

## 8. Technical challenges

- Financial data integrity.
- Irreversible or hard-to-rollback migrations.
- Many organization-specific databases with same schema but different data.
- 3–10 related tables.
- Correct reporting register updates.
- Correct analytical metrics.
- Need for analyst collaboration.
- Need for validation on real data.
- Risk of damaging production accounting data.

## 9. Reliability / risk handling

- Close collaboration with analyst.
- Validation at migration stages.
- Intermediate tables to preserve original data.
- Testing on copies of user databases.
- Test project on real-data copy.
- Focus group/user contact sometimes.
- Rollback plan where possible.
- Transactions mandatory in migrations.
- Backups/dry-runs were not always standard — do not overclaim.

## 10. Testing / quality

Confirmed:

- Testing on test database copies.
- Real-data copy testing.
- Validation during/after migration.
- Analyst validation / focus users sometimes.

Needs evidence:

- exact validation SQL/checks.
- whether backups were always/frequently/sometimes done.
- whether migration was automated through internal tool or manual/deployment script.
- QA formal process.

## 11. Observability / debugging

Not an Application Insights/KQL case.

Confirmed:

- Validation SQL/checks used.
- Intermediate tables preserved data for risk reduction.
- Testing on DB copies helped debug migration logic.

Needs evidence:

- exact logging/audit tables.
- exact before/after reconciliation queries.
- exact rollback/audit process.

## 12. Communication / collaboration

- Analyst / chief analyst for accounting logic.
- Lead/backend developers for concept discussion.
- QA for testing.
- Focus group/users sometimes.
- Support analysts potentially, because system had production users.

## 13. Result / impact

### Confirmed result

- Correct splitting of financial data across new accounts and reporting registers.
- Production data risk reduced through validation, testing and intermediate tables.

### Metrics

- 3–10 related tables per migration.
- From 1 database to potentially all 900+ organization-specific databases for migrations in system context.
- Exact number for this specific migration `[needs evidence]`.

### Cautious impact

- Preserved data integrity for financial/accounting records.
- Supported regulatory/accounting changes.

### What not to quantify

- Exact number of users impacted.
- Exact number of databases for this specific migration unless confirmed.
- Zero-error claim.
- Time saved.

## 14. What this proves about me

- Strong SQL/PostgreSQL foundation.
- Data integrity mindset.
- Ability to handle risky production data.
- Migration planning and validation.
- Business logic understanding in regulated/financial domain.
- Collaboration with analysts and users.
- Legacy/backend maturity beyond current Node.js stack.

## 15. German market relevance

This case is very useful for German backend roles where companies care about reliability, data integrity, finance/enterprise systems, SQL, migrations and risk handling. It shows seniority/maturity even though the stack is older, because the core skill is safe handling of production financial data.

## 16. Safe CV bullets

**Concise version:**

- Implemented complex PostgreSQL migrations for financial accounting data, including multi-table updates, validation steps and rollback planning where possible.

**Stronger version:**

- Planned and executed high-risk PostgreSQL migrations across organization-specific databases, splitting financial account data across reporting registers with transactions, validation and test-database verification.

**Conservative version:**

- Worked on PostgreSQL-heavy financial data migrations with validation, test database checks and analyst collaboration.

**SQL-heavy vacancy angle:**

- Developed SQL/PHP migration scripts for production financial data, using transactions, intermediate tables and validation to reduce data integrity risk.

## 17. LinkedIn wording

- Implemented high-risk PostgreSQL migrations for public-sector financial/accounting data, including multi-table updates, validation and rollback planning where possible.
- Worked with organization-specific PostgreSQL databases, financial registers and production data integrity constraints.
- Built a strong SQL/backend foundation before moving into Node.js/TypeScript.

## 18. Recruiter / cover letter angle

Before my Node.js/TypeScript work, I built a strong backend foundation in PostgreSQL-heavy financial systems. One strong example is high-risk financial data migrations, where I wrote SQL/PHP migration scripts with transactions, validation, intermediate tables and rollback planning where possible.

## 19. Interview story — short version

In Factor–IT, I worked on a public-sector accounting system where each organization had its own PostgreSQL database. One strong case was a high-risk migration where money previously stored on one account had to be split into two accounts and correctly reflected in reporting registers. The migration touched around 3 to 10 related tables. I wrote SQL/PHP migration scripts, used transactions, validation checks, intermediate tables to preserve original data and tested the migration on copies of user databases. Some migrations were irreversible or very hard to roll back, so close collaboration with analysts and careful validation were essential.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
At Factor–IT, I worked on a public-sector budget accounting system with PostgreSQL-heavy financial data. Organizations had separate databases, and migrations could affect many databases with different data.

**Task / Challenge:**  
One migration required splitting money from one accounting account into two accounts and updating reporting registers with correct analytical metrics. The migration touched several related tables and had high data-integrity risk.

**Action:**  
I discussed the logic with analysts, wrote SQL/PHP migration scripts, used transactions, created intermediate tables to preserve original data, added validation steps and tested the migration on copies of real user databases. Rollback was planned where possible, but some migrations were irreversible or hard to roll back, so validation was critical.

**Result:**  
The financial data was correctly split and reflected in reporting registers while reducing production data risk through validation and testing.

**Reflection / what I learned:**  
This case taught me that migrations in financial systems require more than SQL skills. You need domain understanding, validation strategy, careful communication with analysts and respect for irreversible data changes.

## 21. Likely interview questions

1. What was the migration about?
2. Why was it high-risk?
3. How many tables were involved?
4. How did you validate the result?
5. Did you use transactions?
6. How did rollback work?
7. Were backups made?
8. How many databases could be affected?
9. How did you test on real data?
10. How did you work with analysts?
11. What was the hardest part?
12. How did you handle irreversible migrations?
13. Did you use stored procedures?
14. How did you optimize SQL?
15. What would you improve now?

## 22. Strong answers outline

**Risk handling:**

- Financial data and reporting registers.
- Some migrations irreversible/hard to rollback.
- Transactions mandatory.
- Intermediate tables.
- Test DB copies.
- Analyst validation.

**Ownership:**

- Independently wrote SQL/PHP migration scripts.
- Analyst provided business/accounting rules.
- Team/lead discussed concepts.
- Do not claim sole business logic ownership.

**Validation:**

- Validation at stages.
- Test on real-data copy.
- Exact SQL examples `[needs evidence]`.

## 23. What not to overclaim

- Do not say backups/dry-runs were always standard.
- Do not say every migration had rollback.
- Do not claim exact number of databases for this specific migration unless confirmed.
- Do not claim stored procedures/triggers; they were not used.
- Do not claim zero production issues.
- Do not position PHP as current target stack.

## 24. Open questions / needs evidence

- Exact validation SQL/checks.
- Backup frequency/process.
- Exact deployment/migration execution process.
- Exact number of DBs for this migration.
- Example rollback plan.
- Exact reporting registers/fields.
- Lock/performance issues during migration.

---

# Case 6 — Vacation payment calculation logic

## 1. Case status

- **Type:** complex business logic / regulated payroll/accounting calculation.
- **Company / context:** Factor–IT; public-sector budget accounting system.
- **Period:** Dec 2016 – Jun 2021; exact period `[needs evidence]`.
- **Domain:** public-sector finance / payroll / accounting / regulated business logic.
- **Strength for German market:** medium-high.
- **Best use:** interview, CV for enterprise/backend/business-logic roles, cover letter if vacancy values complex domain logic.
- **Evidence quality:** partial; high-level case confirmed, details need evidence.

## 2. Short summary

Vacation payment calculation logic показывает ability to implement complex regulated business rules, not just CRUD. The calculation depended on employment history, work type, time/period, settings, legislation/regulations and many scenarios. It is useful for enterprise backend interviews, especially when asked about complex business logic.

## 3. Business context

Public-sector/budget organizations needed correct vacation payment calculations according to legislation and internal regulations. The system supported accountants and state-funded organizations, so payroll calculations and reporting data had to be accurate.

## 4. Technical context

Components:

- PHP 7.x backend.
- Fully custom in-house PHP framework.
- PostgreSQL database.
- Payroll/accounting data.
- Reporting/register data.
- Analyst/chief analyst requirements.
- Test database / scenario testing.

## 5. Architecture / flow

Cautious flow based on Sources:

1. Analyst/chief analyst interprets legislation/regulations and business requirements.
2. Backend developers, lead and chief analyst discuss concept.
3. Vacation payment calculation requirements are broken into scenarios.
4. Backend implementation calculates vacation payments based on factors such as employment history, work type, time worked, period, settings and legal rules.
5. System calculates amounts, vacation dates, breakdown by days and related reporting/register data.
6. Results are tested on test database across scenarios.
7. QA/analyst validation process `[needs evidence]`.
8. Production release/support `[needs evidence]`.

## 6. My role and ownership

### What I owned / started

- Implemented backend logic after concept discussion.
- Worked with complex payroll/accounting business rules.

### What I implemented myself

Confirmed:

- Backend implementation of vacation payment calculation logic.
- Handling multiple scenarios / calculation branches.
- Work with sums, vacation dates, breakdown by days, reporting/register data.
- Testing scenarios on test database.

### Where I contributed

- Concept discussion with backend developers, lead and chief analyst.
- Clarification of edge cases.
- Support of business logic `[needs evidence for post-release support]`.

### Where team / analyst / lead were involved

- Analyst/chief analyst provided requirements and interpretation of legislation/regulations.
- Lead/team discussed concept.
- QA/analyst likely validated; exact process `[needs evidence]`.

## 7. Concrete implementation details

- **Technologies:** PHP 7.x, PostgreSQL, custom framework.
- **Patterns:** business rule implementation, scenario-based branching, data calculations, reporting/register updates.
- **Data handling:** amounts, vacation dates, daily breakdown, reporting/register data, payroll/accounting fields.
- **Validation:** testing possible cases for each setting/scenario; exact validation `[needs evidence]`.
- **Error handling:** `[needs evidence]`.
- **Retries/idempotency:** not relevant / no evidence.
- **Logging:** `[needs evidence]`.
- **Testing:** test DB / scenario checks; unit tests not confirmed.
- **CI/CD or release relevance:** production system; release participation at Factor–IT level.

## 8. Technical challenges

- Complex regulated business rules.
- Multiple calculation scenarios.
- Dependencies on employment history, work type, time worked, periods, settings, legislation.
- Need for correct reporting/register data.
- Legacy/custom framework context.
- Communication with analyst/chief analyst.
- Testing many scenarios on test DB.

## 9. Reliability / risk handling

- Requirement clarification with analyst/chief analyst.
- Concept discussion before implementation.
- Testing on test database.
- Scenario checks for settings/scenarios.
- Exact acceptance process `[needs evidence]`.
- No confirmed rollback/retry/idempotency relevance.

## 10. Testing / quality

Confirmed:

- Testing on test database.
- Testing possible cases for each setting/scenario.

Needs evidence:

- Unit tests vs manual scenario checks.
- QA process.
- Analyst/chief analyst acceptance.
- Focus user validation.
- Regression testing after release.

## 11. Observability / debugging

Not a KQL/Application Insights case.

Needs evidence:

- Logs/debugging tools in Factor–IT.
- How calculation discrepancies were investigated.
- Whether audit/history data was stored.

## 12. Communication / collaboration

- Backend developers.
- Team lead.
- Chief analyst.
- Analyst.
- QA.
- Possibly support analysts/users for issue reports and validation.

## 13. Result / impact

### Confirmed result

- System supported complex vacation payment calculation scenarios.
- Logic updated reporting/register data.
- Tested on test database/scenarios.

### Metrics

- Dozens of calculation branches is mentioned in Master CV as possible; use cautiously unless confirmed further.
- Exact number of scenarios `[needs evidence]`.

### Cautious impact

- Supported regulated payroll/accounting workflows for state-funded organizations.
- Improved correctness/coverage of vacation payment calculations.

### What not to quantify

- Exact number of users affected.
- Exact number of scenarios unless confirmed.
- Error reduction.
- Legal/regulatory compliance guarantee.

## 14. What this proves about me

- Ability to implement complex business logic.
- Ability to work with regulated/financial domain requirements.
- Communication with analysts.
- Backend thinking beyond CRUD.
- Testing scenario-heavy logic.
- Understanding of data/reporting impact.

## 15. German market relevance

German enterprise/backend roles often involve complex domain logic, regulations, legacy systems and communication with business analysts. This case helps show that the candidate can understand difficult requirements and implement reliable backend logic in a domain-heavy environment.

## 16. Safe CV bullets

**Concise version:**

- Implemented payroll-related backend logic for vacation payment calculations in a public-sector accounting system.

**Stronger version:**

- Implemented complex vacation payment calculation logic with multiple scenarios based on employment history, work type, periods, settings and regulatory requirements.

**Conservative version:**

- Worked on payroll/accounting business logic and reporting data updates in a PostgreSQL-backed public-sector finance system.

**Enterprise backend angle:**

- Collaborated with analysts and backend developers to implement regulated business rules and test calculation scenarios on test databases.

## 17. LinkedIn wording

- Implemented complex payroll/accounting business logic, including vacation payment calculation scenarios and related reporting data updates.
- Worked closely with analysts and backend developers to translate regulated requirements into backend logic.

## 18. Recruiter / cover letter angle

Before moving to Node.js/TypeScript, I worked on PostgreSQL-heavy financial/accounting systems where I implemented complex regulated business logic, including vacation payment calculations with multiple scenarios and reporting updates.

## 19. Interview story — short version

At Factor–IT, I worked on a public-sector accounting system used by state-funded organizations. One complex backend case was vacation payment calculation. The logic depended on many business factors: employment history, work type, time worked, period, settings and regulatory requirements. We first discussed the concept with backend developers, the lead and the chief analyst. Then I implemented the backend logic in PHP with PostgreSQL data, including amounts, vacation dates, breakdown by days and reporting/register data. The logic was tested on a test database across different scenarios. This case shows my ability to work with complex domain logic, not just simple CRUD.

## 20. Interview story — detailed STAR/CAR version

**Situation / Context:**  
At Factor–IT, I worked on a public-sector financial/accounting system. One area involved payroll-related calculations for state-funded organizations.

**Task / Challenge:**  
The system needed to calculate vacation payments according to business rules and regulations. The calculation depended on multiple factors such as employment history, work type, worked time, period, settings and legal requirements.

**Action:**  
The concept was first discussed between backend developers, the lead and the chief analyst. After that, I implemented the backend logic in PHP using PostgreSQL data. The implementation handled amounts, vacation dates, breakdown by days and related reporting/register data. We tested possible scenarios on a test database.

**Result:**  
The system supported complex vacation payment calculation scenarios and related reporting updates.

**Reflection / what I learned:**  
This case taught me how important domain understanding is for backend development. In regulated systems, the hardest part is often not syntax or framework usage, but correctly translating business and legal rules into maintainable backend logic.

## 21. Likely interview questions

1. What made the vacation payment logic complex?
2. What factors affected the calculation?
3. Who provided requirements?
4. How did you clarify edge cases?
5. How did you test scenarios?
6. Did you write unit tests?
7. Did the result affect reporting registers?
8. How did you handle changes in legislation?
9. How did you avoid regressions?
10. How did you collaborate with analysts?
11. Was this one big feature or series of tasks?
12. Did you support it after release?
13. What was the hardest edge case?
14. How would you design it today?
15. How did PostgreSQL fit into the calculation?

## 22. Strong answers outline

**Complexity:**

- Multiple business factors.
- Regulatory requirements.
- Many scenarios.
- Reporting/register updates.
- Need analyst collaboration.

**Implementation approach:**

- Discuss concept first.
- Implement backend logic.
- Use PostgreSQL data.
- Test scenarios on test DB.
- Keep logic in code, not stored procedures/triggers.

**Testing:**

- Test DB / scenario checks confirmed.
- Unit tests not confirmed.
- Say `[needs evidence]` for exact QA/acceptance.

## 23. What not to overclaim

- Do not claim exact number of scenarios unless confirmed.
- Do not claim full legal compliance ownership.
- Do not claim you designed all payroll architecture.
- Do not claim unit tests if not confirmed.
- Do not claim measurable business impact without evidence.
- Do not position this as current PHP target.

## 24. Open questions / needs evidence

- Exact active period.
- 3–5 specific calculation factors to name confidently.
- Full-time/part-time scenarios?
- Recalculations/corrections for past periods?
- Exact reporting registers affected.
- QA/analyst/chief analyst acceptance.
- Unit tests vs manual scenario tests.
- One big feature or series of tasks?
- Post-release support.
- Whether to use as CV bullet or interview-only.

---

# Cross-case comparison

| Case | Best for vacancy type | Strongest signal | Main risk | Best CV use | Best interview use |
| ---- | --------------------- | ---------------- | --------- | ----------- | ------------------ |
| ProductsUp product data synchronization flow | Node.js Backend, Azure/serverless, e-commerce integration, data processing | Long-running backend workflow, Durable Functions, retries, idempotency, scale | Exact changed-record source not 100% confirmed; avoid sole-architect claim | Strong EPAM bullet with metrics | Challenging backend project / Azure workflow / reliability |
| Amplience automation / webhooks / mass updates | Backend/API integration, automation, e-commerce CMS | Business impact: manual UI work reduced from hours to minutes | Exact cache/alert implementation needs evidence | Strong automation/business-impact bullet | Business impact / webhook automation / reducing manual work |
| CommerceTools product data retrieval and enrichment | E-commerce backend, API/data integration, BFF/backend | Product catalog source-of-truth integration, 100k products, 50+ attributes | Exact API limits, endpoints, SDK/wrapper details need evidence | Strong e-commerce integration bullet | Product catalog integration / data quality / API constraints |
| Customer email notification production incident | Production support, observability, reliability backend | Cross-service debugging, Application Insights/KQL, business-critical flow | Metrics/root cause details incomplete | Optional production-support bullet | Production incident / debugging / observability |
| High-risk PostgreSQL account-splitting migration | SQL-heavy backend, finance/enterprise, data integrity | Financial data migration, transactions, validation, rollback planning | Exact validation SQL/backups/DB count need evidence | Strong SQL/data integrity bullet | Data migration / risk handling / SQL experience |
| Vacation payment calculation logic | Enterprise backend, domain-heavy business logic | Complex regulated business logic with analysts | Exact scenarios/testing/acceptance need evidence | Optional for enterprise/business-logic CV | Complex business logic / working with analysts |

---

# Which case to use for which interview question

| Interview question | Best case to use | Backup case |
| ------------------ | ---------------- | ----------- |
| Tell me about a challenging backend project | ProductsUp product data sync | CommerceTools retrieval |
| Tell me about a production incident | Customer email notification incident | ProductsUp partial failure handling |
| Tell me about data migration | High-risk PostgreSQL account-splitting migration | Factor–IT broader PostgreSQL experience |
| Tell me about performance/reliability | ProductsUp retries/idempotency; Redis caching if asked separately | PostgreSQL query optimization |
| Tell me about cross-team communication | Customer notification incident | ProductsUp sync / Amplience automation |
| Tell me about business impact | Amplience automation | ProductsUp sync |
| Tell me about SQL experience | High-risk PostgreSQL migration | Vacation payment calculation / query optimization |
| Tell me about Azure/serverless | ProductsUp sync with Durable Functions | Amplience webhooks with Azure Functions |
| Tell me about e-commerce integrations | CommerceTools + ProductsUp + Amplience | EPAM umbrella project |
| Tell me about handling bad data | CommerceTools empty/missing attributes | ProductsUp failed-product handling |
| Tell me about observability | Customer notification incident | ProductsUp per-locale logs |
| Tell me about complex business logic | Vacation payment calculation | High-risk migration |
| Tell me about ownership | ProductsUp initial implementation + later contributed | Amplience task-level automation |
| Tell me about testing | Jest/SonarQube at EPAM level; Factor–IT test DB | Needs more case-specific evidence |
| Tell me about working with analysts | Vacation payment calculation | PostgreSQL migration |

---

# Final evidence safety checklist

- **No hallucinated facts:** checked. Facts are based on source files and user-confirmed details.
- **No overclaiming ownership:** checked. ProductsUp uses `built initial implementation and later supported its maintenance with the team`; architecture/lead ownership not claimed.
- **No unconfirmed metrics:** checked. Confirmed metrics used: 18+ locales, ProductsUp 20–40k products, 3–5 changed locales, 2+ hours, tens/hundreds MB, Amplience hours-to-minutes and tens/hundreds entities, CommerceTools up to ~100k products and 50+ attributes. Unconfirmed metrics are marked `[needs evidence]`.
- **Python/FastAPI/AI not presented as commercial production:** checked. Not used in the six commercial case deep dives except broader context; personal AI projects remain separate.
- **PHP not positioned as current target stack:** checked. PHP cases are used as backend foundation / SQL/data integrity / business logic evidence.
- **Kubernetes/Docker/DevOps not overclaimed:** checked. DevOps ownership not claimed; Docker/Kubernetes not used as core evidence.
- **German market relevance included:** checked for every case.
- **[needs evidence] preserved where needed:** checked: ProductsUp source, Durable timers [not confirmed; do not claim]/fan-out/fan-in, Redis measurement, incident metrics/root cause, SQL validation/backups, Vacation calculation details.
- **Commercial vs personal separated:** checked.
- **External CV wording separated from internal evidence:** checked through Safe CV bullets and What not to overclaim sections.

---

# Most important next questions to close `[needs evidence]`

1. **Customer notification incident:** exact root cause, investigation time, alert condition, logs added, whether you were owner or key contributor of intermediate service.
2. **Azure / Durable Functions:** whether fan-out/fan-in/timers [not confirmed; do not claim] were used, retry policy type.
3. **ProductsUp:** exact Cosmos DB container/schema/retention details and Blob Storage path/lifecycle details.
4. **PostgreSQL migration:** one concrete validation SQL/check example, backup process, exact number of DBs for the account-splitting migration.
5. **Vacation payment calculation:** exact calculation factors, acceptance process, whether it was one feature or series of tasks, whether to use in CV or interview only.
6. **CommerceTools:** SDK/wrapper/direct HTTP, exact endpoints/API limits, exact test strategy.

---

# Дополнительные кейсы 7–14 (впервые записаны в v0.2)

## 0. Состав раздела

Кейсы 7–14 расширяют evidence bank историями, которые не вошли в подробные кейсы 1–6.

### Кейсы раздела

- EPAM umbrella case: контекст большого multi-locale enterprise e-commerce проекта, ротации команд, микросервисная ownership-модель.
- Event-driven customer notification flow как отдельный backend/event-driven case, отделённый от production incident story.
- Custom PHP framework / backend core как отдельный framework/core case.
- AI Bootcamp RAG Service как personal/learning AI integration case (с v0.9 — secondary, не cvEligible).
- Viber bot schedule system как initiative / real-users personal project.
- CHI Software transition case как объяснение перехода PHP → Node.js.
- HEY, ALTER! Köln volunteer IT как local German integration signal.

### Potential contradictions / clarification needed

1. **EPAM end date:** external safe version is **Nov 2021 – May 2025**.
2. **CHI Software end date:** use **Jul 2021 – Oct 2021** as LinkedIn-consistent external version; keep exact Sep/Oct documentary proof as low-priority evidence if needed.
3. **Azure Service Bus wording:** для event-driven notification flow технология `Azure Service Bus subscriptions` подтверждена. Не подтверждены только exact topic/subscription names, event schema, retry/dead-letter behavior и alert rules.
4. **Event-driven notification flow vs notification incident:** это не противоречие. Production incident является конкретной debugging story внутри более широкого event-driven customer notification flow.
5. **Personal AI projects:** не противоречат commercial profile, но должны оставаться personal/portfolio evidence, not commercial production.
6. **PHP/custom framework:** не противоречит текущему Node.js positioning, если использовать как backend foundation / architecture maturity, not current target stack.

---

# Case 7 — EPAM large-scale multi-locale e-commerce platform overview

## 1. Case status

- **Type:** commercial project / umbrella case / enterprise e-commerce platform.
- **Company / context:** EPAM Systems; long-term project for a large European retailer present in most large German cities.
- **Period:** Nov 2021 – May 2025.
- **Domain:** retail / large-scale e-commerce / online shop.
- **Strength for German market:** very high.
- **Best use:** CV summary, LinkedIn About, recruiter messages, first interview overview, “Tell me about your recent project”.
- **Evidence quality:** strong for general context; traffic/users/business metrics `[needs evidence]`.

## 2. Short summary

EPAM umbrella case is the main context for all modern commercial Node.js/TypeScript experience. It was a large-scale multi-locale e-commerce platform for a major European retailer, with 18+ locales, microservice/serverless backend architecture, multiple cross-functional teams, rotating service ownership and production support. This case should be used when the interviewer asks for a high-level project overview before going into ProductsUp, Amplience, CommerceTools or production incident details.

## 3. Business context

The project was essentially a very large online shop for a major European retailer. It supported multiple countries/locales and product/content workflows. The platform served e-commerce needs such as product catalog, product data synchronization, content delivery, listing/product pages, user/account-related flows and customer notifications.

The project was multi-locale, supporting **18+ locales**. This matters because many backend/content/product-data changes could affect only selected locales or changed locales, and not necessarily the whole platform.

## 4. Team / organization context

Typical team composition:

- 3 backend developers.
- 2 frontend developers.
- 2 QA engineers.

Overall project structure:

- 5+ cross-functional teams.
- Each team owned a sector of services.
- Architecture was microservice/serverless-oriented.
- Every 5–10 months, rotations happened between teams, and teams changed responsibility for services.

## 5. My role

At the beginning, the role was mostly backend developer. During the last ~2 years, feature work often touched backend, BFF and frontend, so the practical role became backend-focused fullstack developer.

Safe wording:

- Started as a backend developer.
- Later contributed as a backend-focused fullstack developer.
- Worked across backend services, BFF/API layers and React/Next.js frontend areas when features required end-to-end changes.

## 6. Main areas touched

Confirmed areas:

- Product data sync.
- Content delivery.
- Integration APIs.
- User/account flows.
- BFF.
- Scheduled jobs.
- Long-running workflows.
- Frontend-to-backend debugging.
- Production bug investigation.
- Hotfixes.
- Monitoring and alerting.

## 7. Technical context

Main technologies:

- Node.js.
- TypeScript.
- Azure Functions.
- Azure Durable Functions.
- Cosmos DB.
- Azure Blob Storage.
- Azure Key Vault.
- Redis.
- REST APIs.
- BFF / GraphQL working experience.
- React.
- Next.js.
- Jest.
- SonarQube quality gates.
- Azure Application Insights / KQL.
- Azure DevOps.
- Terraform configuration support.

## 8. Engineering practices

Confirmed:

- Agile ceremonies: planning, refinement, daily meetings, retrospectives.
- Mandatory PR reviews: at least 2 reviewers.
- Code review both received and provided.
- Backend unit tests with Jest.
- SonarQube quality gate around 80% for new changes.
- QA communication after feature completion.
- Documentation in Jira / service descriptions / contracts.
- Release support and occasional team representative during release.
- Hotfix participation when team-owned functionality was affected.

## 9. Production / debugging context

Confirmed:

- Production bugs and hotfixes.
- Azure Application Insights.
- KQL queries.
- Logs by operation/order IDs, function names, timestamps, error patterns.
- Cross-service debugging when frontend symptoms had backend/root-service cause.
- Alerts via email for critical flows.

## 10. Communication context

Confirmed collaboration with:

- Backend developers.
- Frontend developers.
- QA.
- BA.
- PM.
- Product Owner.
- DevOps.
- Other service teams.

Typical communication examples:

- QA: explained what changed and which areas needed testing focus.
- BA: clarified requirements and edge cases.
- PM/PO: discussed timelines, risks and uncertainty.
- DevOps: coordinated complex infrastructure/deployment questions.
- Other teams: clarified service contracts, delivery timelines, shared testing and production debugging.

## 11. What this proves about me

- Real enterprise production experience.
- Ability to work in a large microservice/serverless system.
- Ability to adapt after team/service rotations.
- Backend-first but able to deliver fullstack changes when needed.
- Strong integration context: Amplience, CommerceTools, ProductsUp.
- Production support and observability experience.
- Cross-functional communication.
- Team maturity: code review, testing, documentation, release support.

## 12. German market relevance

This umbrella case is the strongest proof that the profile is not only “3+ years of coding”, but commercial production experience in a large European e-commerce environment. It is directly relevant for German roles in retail tech, e-commerce, enterprise backend, integration-heavy backend, cloud/serverless and backend-focused fullstack positions.

## 13. Safe CV bullets

**Concise version:**

- Worked on a large-scale multi-locale e-commerce platform for a major European retailer, supporting backend services, integrations, BFF/API layers, production support and fullstack feature delivery.

**Backend version:**

- Delivered backend functionality on a large multi-locale e-commerce platform using Node.js, TypeScript, Azure Functions, Durable Functions, REST APIs, Cosmos DB, Redis and Application Insights.

**Enterprise/team version:**

- Worked in a distributed microservice environment with 5+ cross-functional teams, rotating service ownership, mandatory code review, automated testing, QA collaboration and release support.

**Backend-focused fullstack version:**

- Started as a backend developer and later contributed as a backend-focused fullstack developer, delivering features across backend services, BFF/API layers and React/Next.js components.

## 14. Interview story — short version

In my recent EPAM project, I worked on a large multi-locale e-commerce platform for a major European retailer. The platform supported 18+ locales and had a microservice/serverless architecture with multiple cross-functional teams. My work focused mainly on Node.js/TypeScript backend services, Azure Functions, Durable Functions, API integrations, product/content data flows and production support. At the beginning I worked mostly as a backend developer, but during the last two years many features touched backend, BFF and frontend, so I contributed as a backend-focused fullstack developer. I also participated in production debugging, code reviews, testing, releases, QA/BA/PO communication and cross-team coordination.

## 15. What not to overclaim

- Do not claim ownership of the whole platform.
- Do not claim full architecture ownership across all services.
- Do not claim traffic/users/load numbers without evidence.
- Do not claim all teams worked the same way unless discussing your usual context.
- Do not overstate frontend specialization; keep backend-focused wording.

## 16. Open questions / needs evidence

- Exact project traffic/users/load.
- Exact team rotation dates.
- Exact service ownership boundaries per rotation.
- Whether EPAM end date should be May 2025 or May 2025.
- Whether certain features can be described more specifically without confidentiality risk.

---

# Case 8 — Event-driven customer notification flow

## 1. Case status

- **Type:** backend/event-driven flow / customer communication integration.
- **Company / context:** EPAM Systems; intermediate service in customer email/SMS notification chain.
- **Period:** Nov 2021 – May 2025; exact active period `[needs evidence]`.
- **Domain:** e-commerce / customer notifications / order or customer journey communication.
- **Strength for German market:** high.
- **Best use:** interview, CV for backend/event-driven roles, cover letter for production/reliability roles.
- **Evidence quality:** confirmed at flow level; Azure Service Bus subscriptions and example event types are confirmed; exact event schema/retry/dead-letter/alert details `[needs evidence]`.

## 2. Short summary

This case is broader than the production incident. It describes the backend flow where an intermediate service received subscription/event-based data, processed it according to event type, enriched missing data, formatted the final payload and sent it to an email/SMS service. It is useful for showing event-driven backend experience, payload transformation, ownership of a service area and production-critical communication logic.

## 3. Business context

Customer notifications were important for customer journey scenarios such as order/payment-related communication. The business needed reliable email/SMS notifications based on data coming from upstream services.

If notification data was incomplete or incorrectly formatted, users could miss important messages. Therefore, the intermediate service had to correctly process, enrich and format data before passing it to downstream communication services.

## 4. Technical context

Components:

- Upstream service that produced or passed event/data.
- Subscription/event-triggered backend functions, exact technology `[needs evidence]`.
- Intermediate service owned by your team or within your team responsibility.
- Data enrichment logic.
- Payload formatting logic.
- Downstream email/SMS service.
- Azure Application Insights / KQL for debugging.
- Jest/unit testing at EPAM level.

Likely technology:

- Azure Functions.
- Queue/topic/subscription triggers.
- Azure Service Bus subscriptions confirmed by user.

## 5. Architecture / flow

Cautious flow:

1. Upstream service produced event/data.
2. Intermediate service received it through subscription/event-based mechanism.
3. Backend function identified event type.
4. Service processed data according to that type.
5. Service added missing/additional data where required.
6. Service formatted final payload.
7. Service forwarded payload to email/SMS service.
8. Logs and monitoring were used for debugging and production support.
9. Changes, tests and error investigations in this chain often involved you.

## 6. My role and ownership

Confirmed:

- You were a key player in this chain.
- You were responsible for a set of functions in the intermediate service.
- You participated in changes, tests and debugging for this flow.
- You worked with event-type-based processing.
- You added missing data.
- You formatted payloads for email/SMS delivery.
- You helped investigate errors related to this chain.

Safe wording:

- `key contributor to the intermediate service`.
- `owned key parts of the event-driven notification flow` if external wording is not too strong.
- Avoid `sole owner of the whole notification system`.

## 7. Concrete implementation details

- **Technologies:** Node.js, TypeScript, Azure Functions, subscription/event triggers, Application Insights, KQL, email/SMS downstream service.
- **Patterns:** event-driven processing, payload enrichment, payload transformation, downstream integration, cross-service tracing.
- **Data handling:** customer/order-related notification data; exact fields `[needs evidence]`.
- **Validation:** missing required data was an issue in at least one production incident; exact validation logic `[needs evidence]`.
- **Testing:** tests or manual/QA validation were performed; exact test types `[needs evidence]`.
- **Logging:** logs by order number / operation ID in related incident context.

## 8. Technical challenges

- Cross-service dependencies.
- Event-type-specific processing.
- Missing required data.
- Correct payload formatting for downstream email/SMS service.
- Debugging when the visible symptom was notification failure.
- Coordinating with upstream/downstream teams.
- Business-criticality of customer communication.

## 9. Reliability / risk handling

Confirmed / safe:

- Logs were used for debugging.
- Additional logs and Azure alerts were added after at least one incident.
- Cross-service tracing by order number was used in related production incident.

Needs evidence:

- Exact retry policy.
- Exact validation/fallback strategy.
- Exact alert condition.
- Exact idempotency/deduplication logic, if any.

## 10. Communication / collaboration

Confirmed:

- Upstream/downstream service teams.
- QA.
- PM/PO if notification flow affected customer journey.
- DevOps/team for alerting if needed.
- Cross-team debugging by order number/logs.

## 11. Result / impact

Confirmed:

- Intermediate notification flow supported customer email/SMS delivery.
- You were a key contributor to changes, tests and debugging.
- Observability was improved after incident through logs/alerts.

Cautious impact:

- Supported reliability of customer communication flows.
- Improved traceability for business-critical notifications.

Metrics:

- Notification volume `[needs evidence]`.
- Affected users `[needs evidence]`.
- Investigation time `[needs evidence]`.

## 12. What this proves about me

- Event-driven backend experience.
- Payload enrichment/transformation.
- Cross-service integration.
- Production-critical flow responsibility.
- Debugging and observability thinking.
- Communication with other service teams.
- Ability to understand business impact of backend data quality.

## 13. German market relevance

Many German backend roles involve event-driven systems, message queues, customer communication, integration with downstream services and production debugging. This case is highly relevant when a vacancy mentions async/event-driven architecture, queues, service integration, reliability or customer-facing business flows.

## 14. Safe CV bullets

**Concise version:**

- Worked on an event-driven customer notification flow, processing subscription-based events, enriching missing data and formatting payloads for downstream email/SMS services.

**Stronger version:**

- Owned key parts of an event-driven customer notification flow, including event processing, data enrichment, payload formatting, testing, production debugging and coordination with upstream/downstream services.

**Conservative version:**

- Contributed to backend notification flows involving event processing, payload enrichment and downstream email/SMS integration.

## 15. Interview story — short version

In one EPAM team, I worked on an intermediate backend service in a customer notification flow. The service received subscription-based event data from upstream services, processed it according to event type, added missing data where needed, formatted the final payload and forwarded it to an email/SMS service. I was a key contributor to this chain, so changes, tests and debugging often involved me. This experience was also connected to production support: when notifications failed, we traced logs across upstream, intermediate and downstream services to localize the problem.

## 16. What not to overclaim

- Do not say you owned the whole email/SMS platform.
- Azure Service Bus subscriptions confirmed by user for the event-driven customer notification flow.
- Do not claim exact event volume.
- Do not claim SLA/availability improvements without evidence.
- Do not claim full incident commander role.

## 17. Open questions / needs evidence

- Messaging technology: Azure Service Bus subscriptions (confirmed).
- Exact event types.
- Exact notification use cases.
- Exact validation added.
- Retry/fallback/idempotency behavior.
- Notification volume.
- Whether you were official owner or key contributor of the intermediate service.

---

# Case 9 — Custom PHP backend framework / Data Mapper-based backend core

## 1. Case status

- **Type:** framework/core / developer productivity / backend architecture contribution.
- **Company / context:** Factor–IT; custom in-house PHP backend framework for public-sector accounting system.
- **Period:** Dec 2016 – Jun 2021; exact feature periods `[needs evidence]`.
- **Domain:** public-sector accounting software / internal backend platform.
- **Strength for German market:** medium-high for backend maturity; medium for CV due to old stack.
- **Best use:** interview, SQL/backend architecture roles, legacy/enterprise roles, evidence of framework thinking.
- **Evidence quality:** confirmed at high level; exact framework features/examples `[needs evidence]`.

## 2. Short summary

Factor–IT used a fully custom PHP backend framework built around Data Mapper ideas. You contributed to framework-level functionality such as backend routing to controllers, validation, migrations, database layer and permissions. This case shows not only feature delivery, but ability to improve internal backend tooling and developer productivity.

## 3. Business / engineering context

The product was a production public-sector budget accounting system. The team needed a framework that made backend development faster, more consistent and less error-prone. Because the framework was fully custom, improvements to it directly affected developer productivity and the quality/readability of feature code.

## 4. Technical context

Framework included:

- Backend routing.
- Routing to backend controllers.
- Database layer.
- Data retrieval helpers.
- Entity validation.
- Permissions.
- Migrations.
- Backend development conventions.
- Data Mapper-based ideas.

Stack:

- PHP 7.x.
- PostgreSQL.
- Custom framework.
- SQL.

## 5. My role and ownership

Confirmed:

- Actively participated in writing/developing the framework.
- Proposed new framework features.
- Worked on core development mechanisms.
- Implemented or contributed to migration tooling.
- Implemented or contributed to database layer features.
- Implemented or contributed to validation.
- Worked on main routing at backend application entry point.
- Worked with permissions.

Safe ownership wording:

- `contributed to a custom in-house PHP framework`.
- `proposed and implemented selected framework-level features`.
- Do not claim sole framework architect unless confirmed.

## 6. Concrete implementation details

Confirmed / safe:

- Routing to backend controllers.
- Migration helper/system improvements.
- Database layer features for data retrieval.
- Validation features for entities.
- Permission-related framework parts.
- Data Mapper ideas.

Needs evidence:

- Exact class/module names.
- Before/after code example.
- Which features were proposed by you vs implemented by team.
- Whether framework had ORM-like mapper, repositories, unit of work, etc.

## 7. Technical challenges

- Supporting a complex legacy/production product.
- Keeping feature code readable and consistent.
- Reducing duplicated boilerplate.
- Hiding repetitive low-level details behind framework abstractions.
- Making validation reusable.
- Keeping routing and database access predictable.
- Improving developer experience without breaking existing behavior.

## 8. Result / impact

Confirmed / safe:

- Code became shorter and more readable.
- Development became faster for backend developers.
- Framework abstractions reduced the chance of repeated manual mistakes.
- Entity validation helped reduce incorrect data handling.

Cautious impact:

- Improved maintainability of backend code.
- Reduced boilerplate and improved developer productivity.

Metrics:

- Exact speedup `[needs evidence]`.
- Exact number of developers using it: backend team at least.
- Bugs reduced `[needs evidence]`.

## 9. What this proves about me

- Framework-level thinking.
- Understanding of backend architecture patterns.
- Ability to improve internal tooling.
- Maintainability mindset.
- Ability to work with custom legacy infrastructure.
- Data Mapper pattern awareness.
- Ability to contribute beyond isolated business features.

## 10. German market relevance

Many German companies have long-lived enterprise systems, custom frameworks and legacy codebases. This case can help show that you can work with existing systems, improve internal developer tooling and think beyond ticket-level implementation. It should support backend maturity, but should not shift the profile toward PHP-only roles.

## 11. Safe CV bullets

**Concise version:**

- Contributed to a custom in-house PHP backend framework, including database access, migrations, validation, permissions and routing.

**Stronger version:**

- Proposed and implemented selected framework-level improvements in a Data Mapper-style PHP backend framework, making feature code shorter, more readable and less error-prone.

**Conservative version:**

- Worked with and extended a custom PHP backend framework used by backend developers in a production financial/accounting system.

## 12. Interview story — short version

At Factor–IT, we worked with a fully custom PHP backend framework for a production accounting system. The framework covered database access, permissions, backend routing, migrations and validation, and it was based on Data Mapper ideas. I contributed to selected framework-level features, including migration support, database layer improvements, validation and routing. The goal was to reduce repetitive code, make backend code more readable and reduce the chance of errors by moving common logic into framework abstractions.

## 13. What not to overclaim

- Do not claim sole author of the whole framework.
- Do not position this as modern PHP framework experience like Symfony/Laravel.
- Do not put PHP/framework as current target in headline.
- Do not claim exact productivity metrics without evidence.

## 14. Open questions / needs evidence

- One concrete before/after example.
- Exact Data Mapper implementation details.
- Whether there were repositories, mappers, DTOs or entity classes.
- Which framework features were implemented fully by you.
- How migration tooling worked technically.
- How validation rules were defined.

---

# Case 11 — AI Bootcamp RAG Service (secondary, not CV eligible)

## 1. Case status

- **Type:** learning/personal AI backend project / RAG service.
- **Registry:** `ai-bootcamp-rag-service` — `status: active`, `portfolioPriority: secondary`, `evidenceClass: needs_evidence`, `cvEligible: false`.
- **Period:** `[needs evidence]`.
- **Evidence quality:** the implementation was not checked in the 2026-11-23 audit; verification is postponed (P1).
- **CV use:** none — not in Summary, Skills, Current Independent Work, Selected Projects or a cover letter until the implementation is verified and the registry is changed by the owner.
- **Commercial production experience:** no.

## 2. Described scope (not verified)

A FastAPI API for a RAG/chatbot agent: a `/rag` endpoint that runs a LangGraph workflow with routing, tool calls and retrieval from Qdrant, then returns an LLM answer with the used context. Described stack: Python, FastAPI, LangGraph, Qdrant, OpenAI API, Docker. Repository: `https://github.com/strakhovdenya/ai-bootcamp`.

## 3. Interview use

Only if an interviewer asks about RAG exposure: present it as a learning project, not as portfolio evidence and not as commercial AI.

## 4. What not to overclaim

- Do not claim commercial RAG experience.
- Do not claim production-grade RAG evaluation.
- Do not claim ML/model training.
- Do not claim MLOps.

## 5. Open questions / needs evidence

- Code review of the repository (README, runnable demo, tests, limitations).
- Exact LangGraph node structure and tool calls.

---

# Case 12 — Viber bot and admin website for hockey team schedule

## 1. Case status

- **Type:** personal real-life project / initiative story / bot + admin tool.
- **Company / context:** non-commercial project for parents/responsible people of a children’s hockey team.
- **Period:** `[needs evidence]`.
- **Domain:** scheduling / communication automation.
- **Strength for German market:** low-medium for CV, useful for interview as initiative story.
- **Best use:** interview backup story, personal initiative, ownership, solving real user problem.
- **Evidence quality:** confirmed problem/solution; stack/hosting/users count `[needs evidence]`.
- **Commercial production experience:** no.

## 2. Short summary

This project solved a real scheduling problem for a children’s hockey team. Training schedules changed frequently, and parents had to ask responsible people or the coach for updates. You built a restricted admin website where responsible people could update the monthly schedule and a Viber bot where parents/team members could check training details for today, tomorrow or a specific date.

## 3. Problem context

The monthly training schedule changed often. Parents or team members had to repeatedly ask responsible people or the coach for current information. This created manual communication overhead and risk of outdated information.

## 4. Solution

You built:

- Admin website for responsible people.
- Restricted access.
- Monthly schedule management.
- Viber bot for parents/team participants.
- Query by today / tomorrow / specific date / any day.
- Training type, time and location display.
- Immediate visibility of updates after responsible people changed the schedule.

## 5. Users

Confirmed:

- Real users: parents of a children’s hockey team.

Needs evidence:

- Approximate number of users.
- Usage period.
- Hosting/deployment.
- Reliability/support.

## 6. Technical context

Stack is not confirmed in the current deep-dive file.

Possible elements from context:

- Website/admin interface.
- Viber bot API.
- Backend storage/schedule data.
- Restricted access.

Do not add exact stack until confirmed.

## 7. My role and ownership

Confirmed:

- Built the system end-to-end.
- Identified real user problem.
- Implemented admin site.
- Implemented Viber bot access.
- Supported real users.

## 8. Result / impact

Confirmed / safe:

- Reduced need for daily manual schedule clarification.
- Centralized schedule updates.
- Gave parents immediate access to current training time/type/location.
- Solved a real problem for a real user group.

Metrics:

- Number of parents/users `[needs evidence]`.
- Usage duration `[needs evidence]`.
- Time saved `[needs evidence]`.

## 9. What this proves about me

- Initiative.
- End-to-end problem solving.
- User empathy.
- Ability to build practical tools for real users.
- Admin interface + bot interface thinking.
- Product mindset outside formal work.

## 10. German market relevance

This is not a strong primary CV case for Mid Backend roles, but it is useful in interviews for questions about initiative, solving a real user problem, ownership or building something outside work. It can also support Junior+/Mid roles where personal initiative matters.

## 11. Safe LinkedIn wording (not for CV)

С v0.9 проект не входит в `portfolio-registry`, поэтому в CV не используется; формулировки ниже — только для LinkedIn и интервью.

**Conservative version:**

- Built a non-commercial schedule-management bot and restricted admin website for a children’s hockey team, allowing responsible users to update schedules and parents to check training time, type and location by date.

**Interview-only version:**

- Personal project with real users: Viber bot + admin website for hockey team schedule updates.

## 12. Interview story — short version

I built a personal Viber bot and admin website for a children’s hockey team. The problem was that the training schedule changed often, and parents had to ask responsible people or the coach for updates. I created a restricted admin website where responsible people could update the monthly schedule, and a Viber bot where parents could check today’s, tomorrow’s or a specific date’s training time, type and location. It was non-commercial, but it had real users and solved a real communication problem.

## 13. What not to overclaim

- Do not present as commercial project.
- Do not claim production-grade infrastructure without evidence.
- Do not add stack until confirmed.
- Do not make it a main CV case unless applying for early-career roles or portfolio-heavy applications.

## 14. Open questions / needs evidence

- Stack.
- Hosting.
- Database/storage.
- Number of users.
- Usage duration.
- Screenshots/demo availability.

---

# Case 13 — CHI Software Node.js transition internship

## 1. Case status

- **Type:** internship / transition program / career switch from PHP to JavaScript/Node.js.
- **Company / context:** CHI Software.
- **Period:** Jul 2021 – Oct 2021 as LinkedIn-consistent external version.
- **Format:** full-time, office.
- **Strength for German market:** low-medium as transition explanation; not a strong production case.
- **Best use:** CV chronology, explanation of PHP → Node.js transition, short interview context.
- **Evidence quality:** confirmed as internship/training; production delivery not confirmed.

## 2. Short summary

CHI Software was a full-time commercial internship / switch program focused on moving from PHP backend development to JavaScript/Node.js. It helped prepare for the EPAM Node.js/TypeScript direction, but it should not be presented as strong commercial production Node.js experience.

## 3. Context

Before CHI, the commercial backend experience was mainly PHP/PostgreSQL. CHI was a structured transition into JavaScript/Node.js backend development.

## 4. What I did

Confirmed:

- Full-time office internship.
- Node.js transition from PHP to JavaScript.
- Training backend tasks.
- REST API development.
- Express.js exposure.
- NestJS exposure.
- MongoDB exposure.
- Docker basics.
- Code review from responsible person.

Not confirmed / not present:

- Full team-based Git flow.
- Commercial production delivery.
- Kubernetes production experience.

## 5. Role in career story

This case explains the transition:

1. Factor–IT: strong PHP/PostgreSQL backend foundation.
2. CHI Software: full-time transition to JavaScript/Node.js.
3. EPAM: main modern commercial Node.js/TypeScript production experience.

## 6. What this proves about me

- Ability to switch stack.
- Learning agility.
- Basic Node.js/REST API preparation before EPAM.
- Willingness to retrain from older backend stack to modern TypeScript backend.

## 7. German market relevance

Use this case only briefly. It supports career continuity but should not take space from EPAM or Factor–IT. It should not be used as evidence for production Express/NestJS/Kubernetes.

## 8. Safe CV wording

- Completed a full-time Node.js transition internship focused on moving from PHP backend development to JavaScript/Node.js, covering REST APIs, Express.js, NestJS, MongoDB, Docker basics and code review.

## 9. Interview story — short version

After several years of PHP/PostgreSQL backend work, I wanted to move into modern JavaScript/Node.js backend development. CHI Software was a full-time office internship focused on that transition. I worked on training backend tasks around REST APIs, Express, NestJS, MongoDB and Docker basics, with code review from a responsible person. It was not my main production Node.js experience, but it made the transition to EPAM’s Node.js/TypeScript environment easier.

## 10. What not to overclaim

- Do not claim commercial production Node.js ownership.
- Do not claim microservice production work.
- Do not claim Kubernetes production experience.
- Do not use this as main backend evidence.

## 11. Open questions / needs evidence

- Exact end date: Sep vs Oct 2021.
- Exact training projects worth mentioning.
- Whether any code can be shown.
- Whether there was any team task beyond individual training.

---

# Case 14 — HEY, ALTER! Köln volunteer IT technician

## 1. Case status

- **Type:** volunteer/local German experience / practical IT.
- **Company / context:** HEY, ALTER! Köln e.V.
- **Period:** Feb 2026 – Present.
- **Location:** Cologne / Köln, Germany.
- **Strength for German market:** low as developer evidence, medium as local integration signal.
- **Best use:** small volunteering section in CV/LinkedIn, cover letter if local integration matters.
- **Evidence quality:** confirmed at high level; volume/process details `[needs evidence]`.

## 2. Short summary

This is not a software development case, but it is useful for the German market because it shows local engagement in Cologne, practical IT work and willingness to integrate socially/professionally in Germany.

## 3. Context

HEY, ALTER! Köln e.V. refurbishes donated laptops for school students. The work is practical IT support rather than software engineering.

## 4. What I do

Confirmed:

- Refurbish and prepare donated laptops for school students.
- Install operating systems.
- Install required software.
- Test devices.
- Configure devices before distribution.

## 5. What this proves about me

- Local German engagement.
- Practical IT reliability.
- Hands-on troubleshooting/setup.
- Social contribution.
- Willingness to integrate into Cologne/German environment.

## 6. German market relevance

This should not be presented as developer proof. It should be used as a short volunteer line showing that you are based in Cologne, active locally and connected to German community work.

## 7. Safe CV wording

- Volunteer IT Technician helping refurbish donated laptops for school students in Cologne, including OS/software installation, device testing and configuration.

## 8. What not to overclaim

- Do not present as software engineering experience.
- Do not make it a major technical case.
- Do not claim German professional fluency because of this.

## 9. Open questions / needs evidence

- Number of devices prepared.
- Frequency of volunteering.
- Tools/process.
- Whether German communication is used and at what level.

---

# Addendum — cross-case usage

## Strongest cases for main CV / LinkedIn

1. EPAM large-scale multi-locale e-commerce platform overview.
2. ProductsUp product data synchronization flow.
3. Amplience automation / webhooks / mass updates.
4. CommerceTools product data retrieval and enrichment.
5. Customer email notification production incident.
6. High-risk PostgreSQL account-splitting migration.

Portfolio projects P1–P5 are added by vacancy type (see "Portfolio evidence ranking" at the top of this file); they never replace these commercial cases.

## Strongest cases for interview stories

1. ProductsUp sync — long-running workflow, Azure Durable Functions, scale/reliability.
2. Amplience automation — business process automation, hours-to-minutes, webhooks.
3. Customer notification incident — production debugging and observability.
4. PostgreSQL account migration — data integrity and risk handling.
5. Event-driven notification flow — event processing and downstream integration.
6. Custom PHP framework — framework/core thinking and maintainability.

Portfolio interview stories: P1 Dark Factory (AI-assisted engineering, least-privilege agent, deterministic verdict), P4 B1 Kompass (database-enforced exam rules, E2E in CI), P5 Home Budget (money as integer cents, financial domain logic).

## Cases to keep secondary

- AI Bootcamp RAG Service — `needs_evidence`, not CV eligible; learning only.
- Viber bot schedule system — initiative story with real users.
- CHI Software — transition story, not strong production evidence.
- HEY, ALTER! Köln — local integration / volunteering signal.

## Apply/maybe/skip implications

### Apply

Use the case bank strongly for:

- Node.js/TypeScript backend roles.
- Backend-focused fullstack roles.
- Azure/serverless backend roles.
- E-commerce/retail integration roles.
- API/data integration roles.
- Production support / observability-friendly backend roles.
- SQL/data-integrity backend roles.

### Maybe

Use personal AI cases (P1 Dark Factory, P2 JobFlow AI integration facet) carefully for:

- Backend Developer with OpenAI API as nice-to-have.
- Internal tooling / developer productivity / automation roles.
- AI-enabled product roles where core backend experience matters more than ML.

### Skip / high risk

Still skip or treat as high risk:

- German C1/fluent required roles.
- Pure AI/ML/MLOps roles.
- Senior Python/FastAPI roles requiring commercial Python production.
- DevOps-only/Kubernetes-heavy roles.
- PHP-only roles.
- Pure frontend roles.

## Interview preparation priority

1. Prepare EPAM project overview in English.
2. Prepare ProductsUp detailed STAR story.
3. Prepare Amplience detailed STAR story.
4. Prepare CommerceTools data handling story.
5. Prepare customer notification incident story.
6. Prepare event-driven notification flow story.
7. Prepare PostgreSQL migration story.
8. Prepare custom PHP framework story as secondary.
9. Prepare short portfolio pitches: Dark Factory, B1 Kompass, Home Budget.
10. Prepare language/work authorization explanation for Germany.
