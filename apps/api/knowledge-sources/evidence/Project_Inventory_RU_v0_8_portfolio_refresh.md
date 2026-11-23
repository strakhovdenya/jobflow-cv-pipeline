# Project Inventory RU — Case Map

## v0.8 — portfolio refresh (2026-11-23)

Это активная версия inventory. Она заменяет v0.7 целиком, а не дополняет её: устаревшие рекомендации из прежних версий здесь удалены, история осталась в файлах v0.7 и старше.

- **Источник проектных фактов:** аудит пяти репозиториев от 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`, разделы 2 и 6). Факт считается проверенным, только если он найден в коде, миграциях или CI на указанном commit, а не только в README.
- **Допуск проекта в CV определяет только блок `portfolio-registry` ниже.** Проект, которого нет в registry или у которого `cvEligible: false`, в CV не попадает.
- Коммерческие кейсы (EPAM, Factor–IT, CHI) перенесены без изменений фактов, дат и ролей.
- Всё о личных проектах — personal / portfolio evidence, не commercial production experience. Cards и B1 Kompass публично развёрнуты и работают, но это личные деплои одного владельца: без подтверждённых пользователей, SLA и коммерческой ответственности. В CV их не выдавать за коммерческую эксплуатацию.
- Стабильные решения прежних версий, которые остаются в силе: внешнее имя — **Denys Strakhov**; источник changed records в ProductsUp — **Cosmos DB container / Cosmos DB change records**; внешняя рамка периода после EPAM — **Current Independent Work & Portfolio Projects, May 2025 – Present** (кейс 18), а не career break.

---

## Portfolio registry

Правила чтения:

- `cvEligible` — **единственный** признак допуска проекта в CV.
- `portfolioPriority` — только приоритет видимости; допуска не даёт.
- `placement` — раздел CV: `current_work_block` (bullet внутри Current Independent Work), `selected_projects` (раздел Selected Projects) или `none`.
- Проект с `status: archived` или `evidenceClass: needs_evidence` в CV не используется ни в каком разделе (Summary, Skills, Current Independent Work, Selected Projects, cover letter).
- JobFlow CV Pipeline описывается только в Current Independent Work и не дублируется в Selected Projects.
- Какие из допущенных проектов показать, решает вакансия (правило «coverage, not topic»), а не `portfolioPriority`.
- `allowedWording` — проверенные формулировки; `prohibitedClaims` — что нельзя утверждать ни в CV, ни в cover letter.

```json portfolio-registry
{
  "schema": "portfolio-registry/v1",
  "projects": [
    {
      "id": "dark-factory",
      "title": "Dark Factory",
      "aliases": ["dark-factory", "AI-Assisted Software Factory"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/dark-factory",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "054feb3",
      "deployment": { "kind": "package", "url": null },
      "roleFamilies": ["ai_assisted_engineering", "developer_productivity", "ai_integration"],
      "techStack": ["Node.js", "JavaScript", "Claude Code (headless CLI, hooks, skills, agents)", "OpenAI Codex (openai/codex-action)", "GitHub Actions", "Docker", "JSON Schema", "node:test"],
      "allowedWording": [
        "Built Dark Factory, a reusable Node.js toolkit for sandboxed Claude Code development workflows, with independent OpenAI Codex-based pull request verification and deterministic acceptance checks.",
        "Extracted the workflow from JobFlow into a versioned package and integrated it into Cards and B1 Kompass, retaining human-controlled merges.",
        "Built Dark Factory, a versioned Node.js package (releases v0.1.0–v0.1.3) that installs an AI-assisted delivery workflow into a repository: Claude Code hooks, skills and agents; Ralph, a loop that runs Claude Code in a Docker sandbox on a scoped GitHub Issue, where the agent can read Git history but cannot commit, push or call the GitHub CLI, and the controller opens the pull request; and an OpenAI Codex-based acceptance verifier in GitHub Actions whose verdict is computed and re-checked by code.",
        "Extracted the workflow from JobFlow into this standalone package and installed it in two further personal projects; the package test suite runs in CI on Linux and Windows.",
        "Installed in three personal repositories: JobFlow CV Pipeline, Cards and B1 Kompass."
      ],
      "prohibitedClaims": [
        "autonomous production deployment",
        "enterprise or team adoption",
        "external users of the package",
        "enabled auto-merge",
        "AI platform ownership",
        "commercial or production AI experience",
        "that the coding agent cannot use Git at all (it may run git status, git diff, git log and git show)",
        "that Ralph runs in three repositories (the package is installed in three; B1 Kompass uses the verifier and spec approval, Ralph was not found there)",
        "a GitHub Projects integration",
        "verifier accuracy metrics, false-PASS rates or productivity figures",
        "installation in Home Budget"
      ]
    },
    {
      "id": "jobflow-cv-pipeline",
      "title": "JobFlow CV Pipeline",
      "aliases": ["JobFlow", "jobflow-cv-pipeline"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "current_work_block",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/jobflow-cv-pipeline",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "5f97499",
      "deployment": { "kind": "none", "url": null },
      "roleFamilies": ["backend_node", "nestjs", "ai_integration", "ai_assisted_engineering", "fullstack_react"],
      "techStack": ["NestJS 11", "TypeScript", "PostgreSQL", "Prisma", "BullMQ", "Redis", "OpenAI API", "Swagger/OpenAPI", "Handlebars", "Puppeteer", "Jest", "Docker Compose", "GitHub Actions", "Next.js (dashboard)"],
      "allowedWording": [
        "Built JobFlow CV Pipeline, a NestJS/TypeScript and PostgreSQL application with OpenAI integration, BullMQ/Redis background jobs, human review gates, checks that flag unsupported CV claims and deterministic PDF export.",
        "Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export, with human-in-the-loop review gates, an AI provider abstraction, BullMQ/Redis background jobs for LLM steps, an explicit LLM call policy, prompt versioning, token/cost tracking and HTML-to-PDF export without AI token usage.",
        "Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation and deterministic PDF export, with human-in-the-loop review gates, OpenAI integration behind a provider abstraction and BullMQ/Redis background jobs for LLM steps.",
        "Built JobFlow CV Pipeline, a personal NestJS/TypeScript and PostgreSQL application with OpenAI integration and a Next.js dashboard for reviewing AI-generated drafts, tracking workflow progress and exporting PDFs."
      ],
      "prohibitedClaims": [
        "a public deployment or demo",
        "users other than the owner",
        "user accounts or user authentication (access is protected by an API key)",
        "commercial or production AI experience",
        "queue throughput or load metrics",
        "fully autonomous CV generation without human review",
        "ML engineering, MLOps or model training",
        "the job title AI Engineer or LLM Platform Engineer"
      ]
    },
    {
      "id": "cards",
      "title": "Cards",
      "aliases": ["Cards — Language Learning App"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/cards",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "b90b9e5",
      "deployment": { "kind": "public", "url": "https://cards-indol-eight.vercel.app/demo" },
      "roleFamilies": ["fullstack_react"],
      "techStack": ["Next.js 16 (App Router)", "React 19", "TypeScript", "Supabase (PostgreSQL, Auth)", "Upstash Redis rate limiting", "Vitest", "Playwright", "GitHub Actions"],
      "allowedWording": [
        "Built a German vocabulary trainer on Next.js and Supabase with invite-only email/password sign-up, a publicly accessible read-only demo enforced on the server, and rate limiting with an Upstash Redis limiter and in-memory fallback."
      ],
      "prohibitedClaims": [
        "interface localization or UI language switching (the interface is in Russian only)",
        "AI features inside the app",
        "spaced repetition",
        "PWA or offline mode",
        "row-level security as a delivered feature (the policies exist only as manual SQL in docs)",
        "data-fetching or state libraries that are not in the code",
        "user numbers or usage metrics",
        "commercial experience"
      ]
    },
    {
      "id": "b1-kompass",
      "title": "B1 Kompass",
      "aliases": ["b1-kompass"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/b1-kompass",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "2766a0b",
      "deployment": { "kind": "public", "url": "https://b1-kompass.vercel.app" },
      "roleFamilies": ["fullstack_react", "ai_assisted_engineering"],
      "techStack": ["Next.js 16", "React 19", "TypeScript (strict)", "MUI 7", "next-intl", "Supabase (PostgreSQL, RLS, Storage)", "zod", "npm workspaces", "Vitest", "Playwright", "GitHub Actions", "Vercel CLI"],
      "allowedWording": [
        "Built B1 Kompass, a publicly available Next.js/TypeScript practice app for the German DTZ exam (listening and reading) with guest sessions, server-enforced exam timing and a Supabase PostgreSQL schema with 15 SQL migrations, row-level security and immutable answer keys, covered by Vitest and Playwright end-to-end tests in CI."
      ],
      "prohibitedClaims": [
        "the number of users or exams taken",
        "AI features inside the app",
        "an official affiliation with the DTZ exam or its publishers",
        "that the answer key never leaves the server (not fully traced)",
        "commercial experience"
      ]
    },
    {
      "id": "home-budget",
      "title": "Home Budget",
      "aliases": ["home-budget"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/home-budget",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "1561218",
      "deployment": { "kind": "private_single_owner", "url": null },
      "roleFamilies": ["database_financial", "fullstack_react", "backend_node"],
      "techStack": ["Next.js 16", "React 19", "TypeScript", "MUI 9", "next-intl", "Auth.js (Google OAuth)", "Drizzle ORM", "PostgreSQL", "Vitest", "Playwright", "GitHub Actions", "OpenAI Codex"],
      "allowedWording": [
        "Built a private single-owner budgeting app with Next.js, Drizzle ORM and PostgreSQL that stores money as integer cents and computes period budgets, obligation reserves and liquidity forecasts in unit-tested domain functions, with integration tests against a real PostgreSQL in CI; developed with OpenAI Codex using repository-specific agent instructions and skills."
      ],
      "prohibitedClaims": [
        "external users or production users",
        "a public demo or a public app URL",
        "bank integrations",
        "payments",
        "multi-currency support",
        "commercial FinTech experience",
        "multi-user support",
        "categories, transactions, export or PDF import",
        "owner authorization checked in every server action",
        "an installation of Dark Factory"
      ]
    },
    {
      "id": "ai-bootcamp-rag-service",
      "title": "AI Bootcamp RAG Service",
      "aliases": ["ai-bootcamp", "AI Bootcamp API / RAG Service"],
      "status": "active",
      "cvEligible": false,
      "portfolioPriority": "secondary",
      "placement": "none",
      "evidenceClass": "needs_evidence",
      "repositoryUrl": "https://github.com/strakhovdenya/ai-bootcamp",
      "lastVerifiedAt": "2026-11-23",
      "roleFamilies": ["python_secondary", "ai_integration"],
      "prohibitedClaims": [
        "any CV use until the implementation is verified",
        "commercial RAG or AI experience",
        "production-grade RAG evaluation"
      ]
    },
    {
      "id": "ai-job-assistant",
      "title": "AI Job Assistant",
      "aliases": ["job-assistant"],
      "status": "archived",
      "cvEligible": false,
      "portfolioPriority": "none",
      "placement": "none",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/job-assistant",
      "lastVerifiedAt": "2026-11-23"
    },
    {
      "id": "email-camp",
      "title": "Email Camp",
      "aliases": ["email_camp"],
      "status": "archived",
      "cvEligible": false,
      "portfolioPriority": "none",
      "placement": "none",
      "evidenceClass": "candidate_confirmed",
      "repositoryUrl": "https://github.com/strakhovdenya/email_camp",
      "lastVerifiedAt": "2026-11-23"
    }
  ]
}
```

---

## 18. Current Independent Work & Portfolio Projects

1. **Название case:** Current Independent Work & Portfolio Projects
2. **Тип case:** timeline / gap-closing / light professional activity; not a single commercial project
3. **Контекст:** relocation to Germany, small freelance / independent Node.js/React tasks, portfolio projects, structured upskilling. Volunteering is a separate market-dependent supporting signal.
4. **Период:** May 2025 – Present
5. **Почему важен для external CVs:** закрывает post-EPAM timeline gap для Germany / remote EU, Ukraine / Ukrainian-market, generic CV и no-specific-role CV; показывает активность, remote readiness from Germany and continued backend development. Local integration через volunteering особенно полезен для Germany / Cologne, но сам volunteering bullet market-dependent.
6. **Основной стек:** Node.js, React, NestJS, TypeScript, PostgreSQL, Prisma, Docker, OpenAI API (JobFlow); Next.js, Supabase, Drizzle ORM (personal projects); AI-assisted development with Claude Code and OpenAI Codex. Python/FastAPI — только обучение (Udemy course), не проектное доказательство.
7. **Что доказывает:** active development after relocation, self-directed engineering discipline, current backend learning, portfolio ownership; does not replace EPAM commercial production evidence.
8. **Потенциальный CV description line:** `Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.` This is a description line after dates, not a bullet. Volunteering, if included, should be a separate bullet.
9. **Сила case:** medium as timeline/gap-closing; low-medium as technical evidence; EPAM remains primary evidence.
10. **Что уточнить:** freelance clients/scope/payment/references [needs evidence]. Until confirmed, use only `small Node.js/React improvements on an independent basis`.

Safe bullet:

```text
Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
```

JobFlow CV Pipeline (`placement: current_work_block`) — второй bullet этого блока. Третий bullet — один конкретный проверенный факт, выбранный по вакансии (правило — в активном `cv_rules`); он не повторяет содержимое Selected Projects. Volunteering — отдельный bullet по рынку.

Unsafe / do not claim:

- full-time freelance backend engineer
- enterprise freelance clients
- commercial AI platform delivery
- major product ownership for freelance clients
- production client systems without evidence

---

# Основные портфолио-проекты (primary, cvEligible)

Пять проектов ниже — все `status: active`, `portfolioPriority: primary`, `cvEligible: true`. Какие из них показать, решает вакансия. Все пять — личные проекты одного владельца, не commercial experience.

Матрица релевантности (● высокая, ◐ средняя, ○ низкая, — нет; по аудиту, раздел 3):

| Вакансия | JobFlow | Dark Factory | Cards | B1 Kompass | Home Budget |
|---|---|---|---|---|---|
| Backend Node.js/TS | ● | ○ | — | ○ | ◐ |
| NestJS | ● | — | — | — | — |
| AI Integration / LLM | ● | ◐ | — | — | — |
| AI-assisted SE / Developer Productivity | ◐ | ● | ○ | ◐ (consumer фабрики) | ○ (Codex) |
| React/Next.js Full-stack | ◐ (dashboard) | — | ◐ | ● | ◐ |
| Database / Financial backend | ◐ | — | — | ◐ (SQL-триггеры) | ● |
| Azure / Production backend | ○ | — | — | — | — |

---

## 19. JobFlow CV Pipeline

1. **Название case:** JobFlow CV Pipeline
2. **Тип case:** personal / portfolio backend-first AI tooling project; `placement: current_work_block`
3. **Компания / контекст:** personal GitHub project for vacancy analysis, targeted CV generation and deterministic CV export
4. **Период:** June 2026 – Present
5. **Почему важен для Германии / remote:** current hands-on NestJS/TypeScript backend evidence; LLM integration with human review gates; documentation-driven engineering and anti-overclaiming discipline.
6. **Основной стек:** NestJS 11, TypeScript, PostgreSQL, Prisma (migrations), BullMQ/Redis, OpenAI API behind an `AiProvider` abstraction, Swagger/OpenAPI, Handlebars/Puppeteer (HTML/PDF), Jest, Docker Compose, GitHub Actions; Next.js dashboard (`apps/web`)
7. **GitHub:** https://github.com/strakhovdenya/jobflow-cv-pipeline (verified at `5f97499`)
8. **Что доказывает:** current backend practice, modular architecture, LLM integration with typed failure handling, evidence-based claim validation, deterministic document export, token/cost tracking, reproducibility.
9. **Потенциальный CV angle:** см. `allowedWording` записи `jobflow-cv-pipeline` в registry.
10. **Сила case:** medium-high as current portfolio evidence; not commercial production.
11. **Масштаб (2026-11-23):** 782 commits since 2026-06-28, 354 merged PRs, 45 ADRs; 79 unit spec files in `apps/api/src`, 3 e2e suites, ~35 web test files.
12. **Что уточнить:** public deployment and users beyond the owner [needs evidence]; access is protected only by an API key, there is no user authentication.

Safe details:

- Human-in-the-loop pipeline with mandatory review gates after each AI step.
- Evidence Guard module flags unsupported CV claims using a structured knowledge base with evidence levels.
- Deterministic backend HTML-to-PDF export (plus an ATS variant) with predictable output and no AI tokens used for export.
- AI usage tracking by run, prompt type, token count and estimated cost.
- Modular NestJS architecture with Workspace, Artifact Storage, Prompt Pipeline, AI Provider Abstraction, Evidence Guard and Document Export modules.
- Prompt versioning with input hashes, source snapshots, artifact traceability and explicit KnowledgeSource selection.
- Explicit workspace status machine (ADR-038) with guarded compare-and-set transitions, and human decision overrides stored with their previous and new decision as an audit trail.
- REST API documented with Swagger (ADR-019), API-key guard and global rate limiting.
- Unit tests and three end-to-end suites covering the main pipeline flow, the skip flow and rate limiting, with a coverage threshold enforced on every run (statements, lines and functions at 90%, branches at 68%).
- CI on every pull request and push to `main`: lint, type-check, unit tests, end-to-end tests against a real PostgreSQL service, build, and a Docker image build with a smoke test; CodeQL; acceptance verification of task PRs through Dark Factory.
- Local infrastructure through Docker Compose: PostgreSQL and Redis running as services next to the API and web containers.
- AI steps run as BullMQ background jobs on Redis in one `ai-step` worker: the endpoint answers `202` + `jobId`, the client polls the job status; one job per workspace + step (`409` on a duplicate); no automatic retries of paid AI calls.
- LLM call policy in the OpenAI provider: retries only on HTTP 429/5xx with backoff, no retry after a timeout, per-attempt timeout, per-step output-token limits, typed errors for truncated, refused or empty answers; explicit AI provider required in production.
- Developed with Claude Code; since 2026-10 the AI-assisted delivery workflow (Ralph, Acceptance Verifier, hooks) comes from the separate Dark Factory package (кейс 20), JobFlow is one of its consumers.

Разделять две разные вещи:

- **AI integration в приложении** (AI-категория B): OpenAI API, provider abstraction, structured output validation, LLM call policy, BullMQ/Redis AI jobs, human review gates, Evidence Guard.
- **AI-assisted процесс разработки** (AI-категория A): Claude Code и Dark Factory. Это кейс 20, не часть описания приложения.

Do not claim:

- commercial production AI product
- enterprise/client adoption, users other than the owner
- public deployment or demo
- ML engineering, MLOps or model training
- fully autonomous CV generation without human review
- queue throughput or load metrics
- commercial or production AI experience
- the job title AI Engineer or LLM Platform Engineer
- enabled auto-merge

---

## 20. Dark Factory

1. **Название case:** Dark Factory
2. **Тип case:** personal / portfolio project; standalone reusable Node.js package in its own repository
3. **Компания / контекст:** personal GitHub project; installs an AI-assisted delivery workflow into other repositories. The workflow was first built inside JobFlow and extracted into the separate `dark-factory` package in 2026-10 (JobFlow ISSUE-656 connected the package, ISSUE-657 removed the local copies).
4. **Период:** 2026 – Present (separate package since Oct 2026)
5. **Почему важен для Германии / remote:** the strongest verifiable personal evidence of hands-on AI-assisted software engineering and developer-productivity tooling: agent orchestration with least privilege, deterministic gates around probabilistic models, independent verification of AI work, reuse across repositories.
6. **Основной стек:** Node.js, JavaScript, Claude Code (headless CLI, hooks, skills, agents), OpenAI Codex (`openai/codex-action`), GitHub Actions, Docker, JSON Schema, `node:test`
7. **GitHub:** https://github.com/strakhovdenya/dark-factory (verified at `054feb3`, 2026-11-15); releases `v0.1.0`–`v0.1.3`
8. **Что доказывает:** least-privilege agent orchestration, sandboxing, deterministic verdicts, fail-closed CI design, packaging and reuse of engineering tooling, learning from real agent failures.
9. **Потенциальный CV angle:** см. `allowedWording` записи `dark-factory` в registry.
10. **Сила case:** high for AI-assisted SE / Developer Productivity vacancies; low for ordinary backend vacancies.
11. **Зрелость:** working package with releases; three consumer repositories of one owner; 84 test files (`node --test`); CI on Linux and Windows: lint, typecheck, test.

Safe details (проверено в коде, `054feb3`):

- **Ralph:** Claude Code CLI headless (`ralph/agent.js`); fresh clone + branch per issue (`ralph/workspace.js:77`); pipeline `implement → self-review → code-review → final-gate` (`ralph/steps/registry.js`); issues come from a list in the consumer profile with `dependsOn` (`ralph/config.js:95`), not from a GitHub query.
- **Git-права агента** (`ralph/workspace.js:431-437`): агенту разрешено только чтение — `git status`, `git diff`, `git log`, на review-проходах ещё `git show`. Всегда запрещены `git commit`, `git push` и `gh`. Commit, push и PR делает контроллер (`ralph/github.js:323`).
- **Docker sandbox:** `ralph/sandbox/Dockerfile`, `ralph/sandbox.js`, egress proxy (`ralph/sandbox/proxy.js`); separate CI job `ralph-sandbox-integration.yml`.
- **Acceptance Verifier:** reusable GitHub Actions workflow on `openai/codex-action` with an allowlist of models. The verdict is computed by code (`verifier/verdict.js`), `NEEDS_HUMAN` when two runs disagree. Deterministic checks include test tampering and protected paths (`ralph/boundary.js`).
- **Calibration Judge** (`judge/`), **issue linter** (`verifier/issue-lint.js`), five fail-closed Claude Code hooks, setup/postinstall into the consumer repository.
- **Consumers** (`dark-factory#v0.1.3`): JobFlow CV Pipeline, Cards (`package.json:58`, `.claude/settings.json`, `.factory/`), B1 Kompass (`package.json:40`). В B1 Kompass используются verifier и spec approval, Ralph там не найден. В Home Budget пакет **не установлен** (там отдельный Codex-native workflow, кейс 22).
- Human keeps intent, ambiguous decisions, architecture and merge; auto-merge is not enabled.

Не подтверждено (не утверждать): интеграция с GitHub Projects (в коде нет); регулярные боевые прогоны Ralph в consumer-репозиториях после выноса (задокументирован один прогон); что Judge «только наблюдает» (advisory по замыслу, независимо не проверено).

Do not claim:

- commercial or production AI experience
- the job title AI Engineer or LLM Platform Engineer
- ML engineering or MLOps or model training
- autonomous production deployment
- enabled auto-merge
- external users, teams or enterprise adoption
- that the agent cannot use Git at all (reading Git history is allowed; only committing and pushing and the GitHub CLI are denied)
- that Ralph runs in three repositories (the package is installed in three; B1 Kompass uses the verifier and spec approval)
- verifier accuracy metrics, false-PASS rates or productivity figures

---

## 17. Cards

1. **Название case:** Cards (German vocabulary trainer)
2. **Тип case:** personal full-stack project
3. **Компания / контекст:** personal language-learning project for German vocabulary
4. **Период:** Jul 2025 – Present (repository created 2025-07; verified at `b90b9e5`, 2026-10-30)
5. **Почему важен для Германии:** supports React/Next.js full-stack positioning and shows local integration motivation through learning German; not a core backend case.
6. **Основной стек (используется в коде):** Next.js 16 App Router, React 19, TypeScript, Supabase (email/password auth, invite-only sign-up via RPC, 7 tables), Upstash rate limiting with in-memory fallback, Strategy pattern for card types; ~18 route handlers; Vitest (47 test files) and one Playwright spec
7. **GitHub / demo:** https://github.com/strakhovdenya/cards; public demo `https://cards-indol-eight.vercel.app/demo` (URL from README; public availability confirmed by the candidate on 2026-11-23)
8. **Что доказывает:** personal full-stack work: flashcards, article, verb-conjugation and time trainers, card editor and bulk import; read-only demo user with write access blocked on the server (`src/lib/auth-server.ts:74-76`), guest progress in localStorage; CI with check, test, build, CodeQL and a factory-separation job; Dark Factory consumer.
9. **Потенциальный CV angle:** см. `allowedWording` записи `cards` в registry.
10. **Сила case:** low-medium for backend roles; medium for React/Next.js full-stack roles (after B1 Kompass, when a requirement stays uncovered)
11. **Ограничения:** интерфейс только на русском, библиотеки локализации нет; AI-вызовов в приложении нет (только копирование prompt в буфер); нет spaced repetition и PWA; RLS-политики лежат ручными SQL в `docs/`, а не в миграциях, live-состояние не проверено — RLS для Cards в CV не утверждаем; число пользователей не подтверждено.

---

## 21. B1 Kompass

1. **Название case:** B1 Kompass
2. **Тип case:** personal full-stack project; publicly available
3. **Компания / контекст:** online practice app for the German DTZ exam (A2–B1): listening (Hören) and reading (Lesen), guest mode without registration; interface in English and Russian (`next-intl`)
4. **Период:** Oct 2026 – Present (verified at `2766a0b`, 2026-11-19)
5. **Почему важен для Германии:** the most engineering-mature full-stack project of the five; German-market product context.
6. **Основной стек:** npm-workspaces monorepo (`packages/domain` — pure TypeScript + zod, `apps/web`), Next.js 16, React 19, MUI 7, TypeScript `strict` + `noUncheckedIndexedAccess`; 10 route handlers; Supabase: 15 SQL migrations, 15 tables, RLS, signed URLs in Storage
7. **GitHub / site:** https://github.com/strakhovdenya/b1-kompass; public site `https://b1-kompass.vercel.app` (URL from README; public availability confirmed by the candidate on 2026-11-23)
8. **Что доказывает:** server-side exam timing with timing-profile revisions; immutable exam versions with a trigger that keeps answer keys unchanged; publish guard in SQL; httpOnly guest cookie; origin check; scoring by DTZ rules (`packages/domain/src/scoring/dtz.ts`); MyMemory/OpenThesaurus integrations with cache and budget.
9. **Тесты / CI:** 29 unit test files (Vitest) + 49 Playwright specs on an isolated local Supabase; CI: typecheck, lint, unit, build, `supabase start`, E2E; manual `release-production.yml` (Vercel CLI); Dark Factory consumer (verifier, spec approval).
10. **Потенциальный CV angle:** см. `allowedWording` записи `b1-kompass` в registry.
11. **Сила case:** high for React/Next.js full-stack roles; medium for AI-assisted SE (as a Dark Factory consumer)
12. **Что уточнить:** production usage and number of exams (README: owner-reported, not independently verified); «answer key never leaves the server» traced only partly — do not claim. AI inside the app: none.

---

## 22. Home Budget

1. **Название case:** Home Budget
2. **Тип case:** personal full-stack / business-logic project; private single-owner app
3. **Компания / контекст:** personal budgeting for one owner (EUR, one card): confirmed balance checkpoints, monthly allocation, obligation reserves, savings, daily forecast, month closing with immutable versions, history, analytics, onboarding
4. **Период:** Nov 2026 – Present (verified at `1561218`, 2026-11-18; 44 commits in 18 days)
5. **Почему важен для Германии:** strongest personal evidence for data-integrity and money-handling business logic; complements Factor–IT financial background without being commercial FinTech.
6. **Основной стек:** Next.js 16, React 19, MUI 9, next-intl, Auth.js (Google OAuth, one allowlisted email with `email_verified`), Drizzle ORM + PostgreSQL, 6 manual SQL migrations, 12 tables, `audit_events`, CHECK constraint on currency
7. **GitHub:** https://github.com/strakhovdenya/home-budget. Деплой: частное приложение одного владельца, без публичной ссылки на приложение и без demo (сам репозиторий публичный) (подтверждено кандидатом 2026-11-23).
8. **Что доказывает:** money stored as `bigint` cents (`schema.ts:5`, `money.ts`); range-checked arithmetic with `Result` types (`addCents`); domain functions `periodBudget`, `calculateLiquidity`, `calculatePeriodReserves`, `planAllocationChange`; Berlin time zone handling (`BerlinDate`).
9. **Тесты / CI:** ~100 test files (Vitest: domain, 18 integration tests on a real PostgreSQL; Playwright E2E); CI: lint, typecheck, unit, build, double `db:migrate`, integration, a run under another time zone, `check-finance-coverage.mjs` gate.
10. **AI workflow — Codex-native:** developed with OpenAI Codex using `AGENTS.md`, `.codex/` and `.agents/skills/` (`docs/AGENT_FACTORY.md`: «not an installation or fork»). Это отдельное доказательство AI-assisted разработки (AI-категория A), **не** установка Dark Factory.
11. **Потенциальный CV angle:** см. `allowedWording` записи `home-budget` в registry.
12. **Сила case:** high for database / financial-logic roles; medium for full-stack; low for AI-assisted SE (Codex workflow only)
13. **Не реализовано:** categories, transactions, export, PDF import, multi-currency, multi-user. Owner authorization in every server action is not fully traced — do not claim per-action authorization.

Do not claim: external or production users, public demo or app URL, bank integrations, payments, multi-currency, commercial FinTech experience, Dark Factory installation.

---

## 12. AI Bootcamp RAG Service (secondary, не cvEligible)

1. **Название case:** AI Bootcamp RAG Service
2. **Тип case:** learning / personal AI backend project; `portfolioPriority: secondary`, `evidenceClass: needs_evidence`, `cvEligible: false`
3. **Компания / контекст:** learning project
4. **Период:** [needs evidence]
5. **Статус:** реализация в аудите 2026-11-23 не проверялась. До проверки (P1) проект в CV не используется ни в каком разделе; допустим только как тема разговора на интервью, если спросят.
6. **Заявленный стек (не проверен):** Python, FastAPI, LangGraph, Qdrant, OpenAI API, Docker
7. **Что уточнить:** README, runnable demo, tests, limitations [needs evidence]

---

# Коммерческие кейсы (EPAM, Factor–IT) — без изменений с v0.7

## 1. EPAM large-scale e-commerce platform

1. **Название case:** EPAM large-scale multi-locale e-commerce platform
2. **Тип case:** commercial project
3. **Компания / контекст:** EPAM Systems; large European retailer; retail / online shop; 18+ locales
4. **Период:** Nov 2021 – May 2025
5. **Почему важен для Германии:** показывает современный commercial experience в Node.js/TypeScript, Azure serverless, e-commerce, integrations и production-системах.
6. **Основной стек:** TypeScript, Node.js, Azure Functions, Durable Functions, Cosmos DB, Azure Storage, Redis, React, Next.js, Jest, Azure DevOps, Application Insights
7. **Что доказывает:** не junior; есть опыт долгого production-проекта, командной разработки, релизов, code review, support и cross-team work.
8. **Потенциальный CV angle:** “Worked on a large-scale multi-locale e-commerce platform for a major European retailer…”
9. **Сила case:** high
10. **Что уточнить:** exact scale beyond 18+ locales, traffic/users, team ownership boundaries, measurable impact [needs evidence]

---

## 2. Amplience automation / webhooks / mass updates

1. **Название case:** Amplience content automation / webhooks / mass updates
2. **Тип case:** integration / automation
3. **Компания / контекст:** EPAM Systems; CMS/content workflows for e-commerce pages and schemas
4. **Период:** Nov 2021 – May 2025; exact period [needs evidence]
5. **Почему важен для Германии:** показывает backend automation, webhook handling, business impact, multi-locale content operations и reduction of manual work.
6. **Основной стек:** TypeScript, Node.js, Azure Functions, Amplience, Azure Storage/cache-related services [needs evidence], Application Insights
7. **Что доказывает:** умеешь превращать manual business process в backend automation с validation, logging, retries и alerting.
8. **Потенциальный CV angle:** automation of content workflows for 18+ locales with webhooks, validation, cache updates and retries.
9. **Сила case:** high
10. **Что уточнить:** number of pages/entities affected, before/after time, exact cache mechanism, exact alerting, examples of mass updates [needs evidence]

---

## 3. ProductsUp product data sync

1. **Название case:** ProductsUp product data synchronization flow
2. **Тип case:** backend integration flow
3. **Компания / контекст:** EPAM Systems; downstream product data distribution service
4. **Период:** Nov 2021 – May 2025; exact period [needs evidence]
5. **Почему важен для Германии:** сильный backend/cloud/integration case: scheduled jobs, manual trigger, enrichment, files, storage, streams, retries.
6. **Основной стек:** TypeScript, Node.js, Azure Durable Functions, Cosmos DB change records, CommerceTools, ProductsUp API/Stream API, Azure Storage, JS streams
7. **Что доказывает:** ownership of backend flow, long-running workflow experience, integration reliability, data processing, production relevance.
8. **Потенциальный CV angle:** daily/manual product sync for 18+ locales using Durable Functions, CommerceTools enrichment, CSV/GZIP and Azure Storage.
9. **Сила case:** high
10. **Что уточнить:** products per sync, file size, sync duration, exact Cosmos DB container/schema/retention details, idempotency details, failure handling details [needs evidence]

---

## 4. CommerceTools product data retrieval

1. **Название case:** CommerceTools product data retrieval and enrichment
2. **Тип case:** backend/API/data integration
3. **Компания / контекст:** EPAM Systems; product catalog data source for frontend/BFF/backend flows
4. **Период:** Nov 2021 – May 2025; exact period [needs evidence]
5. **Почему важен для Германии:** relevant для e-commerce, product catalog, API integration и data-heavy backend ролей.
6. **Основной стек:** TypeScript, Node.js, CommerceTools API, Azure Functions, BFF/API layer, Cosmos DB [needs evidence]
7. **Что доказывает:** умеешь работать с external APIs, product attributes, filters, pagination, batching, optional/missing data.
8. **Потенциальный CV angle:** built product data retrieval logic handling 50+ attributes, filters, product groups, IDs, pagination and batching.
9. **Сила case:** high
10. **Что уточнить:** product volume, API limits, latency/performance impact, exact use in frontend/BFF/backend validation [needs evidence]

---

## 5. Customer email notification incident

1. **Название case:** Customer email notification production incident
2. **Тип case:** production incident
3. **Компания / контекст:** EPAM Systems; order/payment user journey; upstream service → intermediate service → email/SMS service
4. **Период:** Nov 2021 – May 2025; exact date/period [needs evidence]
5. **Почему важен для Германии:** показывает production debugging, incident investigation, observability и business-critical thinking.
6. **Основной стек:** Azure Functions, Azure Application Insights, logs, operation/order IDs, email/SMS downstream service
7. **Что доказывает:** умеешь искать root cause across services, добавлять logs/alerts и работать с production-critical flows.
8. **Потенциальный CV angle:** investigated production notification failures across microservices and improved logging/alerting.
9. **Сила case:** high
10. **Что уточнить:** affected users, investigation time, exact root cause, alert details, hotfix/postmortem process [needs evidence]

---

## 6. Event-driven customer notification flow

1. **Название case:** Event-driven customer notification flow
2. **Тип case:** backend/event flow
3. **Компания / контекст:** EPAM Systems; intermediate service for email/SMS notifications
4. **Период:** Nov 2021 – May 2025; exact period [needs evidence]
5. **Почему важен для Германии:** показывает event-driven backend, payload transformation, integration with downstream communication services.
6. **Основной стек:** TypeScript, Node.js, Azure Functions, Azure Service Bus subscriptions, email/SMS service, Application Insights
7. **Что доказывает:** contribution to backend functions, event handling, enrichment, formatting, debugging and testing of business-critical flows.
8. **Потенциальный CV angle:** maintained event-driven notification flow that processed events, enriched data and forwarded payloads to email/SMS services.
9. **Сила case:** high
10. **Что уточнить:** exact topic/subscription names, event schema, volume, retry/dead-letter behavior, failure handling, tests, SLA/business impact [needs evidence]

---

## 7. Factor–IT public-sector accounting system

1. **Название case:** Public-sector budget accounting production system
2. **Тип case:** commercial project
3. **Компания / контекст:** Factor–IT; financial/accounting software for state-funded organizations
4. **Период:** Dec 2016 – Jun 2021
5. **Почему важен для Германии:** показывает backend maturity: financial data, PostgreSQL, legacy, migrations, production responsibility.
6. **Основной стек:** PHP, custom in-house framework, PostgreSQL, React
7. **Что доказывает:** strong backend foundation до Node.js: complex business logic, SQL, migrations, production support, releases.
8. **Потенциальный CV angle:** backend development for production public-sector accounting system with PostgreSQL-heavy features and financial data integrity.
9. **Сила case:** medium-high
10. **Что уточнить:** number of users, organizations, databases, release process, data volume [needs evidence]

---

## 8. High-risk PostgreSQL account migration

1. **Название case:** High-risk PostgreSQL account-splitting migration
2. **Тип case:** migration / data integrity
3. **Компания / контекст:** Factor–IT; financial accounting data and reporting registers
4. **Период:** Dec 2016 – Jun 2021; exact period [needs evidence]
5. **Почему важен для Германии:** очень сильный backend case для data integrity, SQL, risk management и enterprise/finance systems.
6. **Основной стек:** PostgreSQL, SQL, PHP migration scripts, test DB copies
7. **Что доказывает:** умеешь работать с risky production data, multi-table migrations, validation, intermediate tables, rollback planning where possible.
8. **Потенциальный CV angle:** implemented complex PostgreSQL migrations across financial registers with validation and rollback planning.
9. **Сила case:** high
10. **Что уточнить:** number of databases affected, validation SQL examples, backup/dry-run process, rollback examples [needs evidence]

---

## 9. Vacation payment calculation

1. **Название case:** Vacation payment calculation logic
2. **Тип case:** business logic
3. **Компания / контекст:** Factor–IT; payroll/accounting logic for public-sector organizations
4. **Период:** Dec 2016 – Jun 2021; exact period [needs evidence]
5. **Почему важен для Германии:** показывает ability to implement complex regulated business logic, useful for enterprise/backend roles.
6. **Основной стек:** PHP, PostgreSQL, custom framework
7. **Что доказывает:** умеешь разбираться в сложных requirements, edge cases, regulations, calculations and testing scenarios.
8. **Потенциальный CV angle:** implemented payroll-related business logic with dozens of calculation branches and reporting updates.
9. **Сила case:** medium-high
10. **Что уточнить:** exact scenarios, fields involved, test approach, acceptance process, measurable result [needs evidence]

---

## 10. Custom PHP framework / backend core

1. **Название case:** Custom PHP framework / backend core contribution
2. **Тип case:** framework/core
3. **Компания / контекст:** Factor–IT; internal backend framework based on Data Mapper ideas
4. **Период:** Dec 2016 – Jun 2021
5. **Почему важен для Германии:** показывает framework thinking, maintainability, developer productivity, backend architecture contribution.
6. **Основной стек:** PHP, PostgreSQL, custom framework, Data Mapper pattern ideas
7. **Что доказывает:** не только feature delivery; умеешь улучшать internal tooling, validation, routing, migrations, database layer.
8. **Потенциальный CV angle:** contributed to custom backend framework improving migrations, DB access, validation, permissions and routing.
9. **Сила case:** medium
10. **Что уточнить:** exact framework features, before/after impact, who used it, examples of reduced complexity [needs evidence]

---

# Прочие кейсы (не портфолио-проекты registry)

## 13. Viber bot schedule system

1. **Название case:** Viber bot for hockey team schedule
2. **Тип case:** personal real-life project
3. **Компания / контекст:** non-commercial real-life use case for parents/team participants
4. **Период:** [needs evidence]
5. **Почему важен для Германии:** показывает initiative and real users, но не основной developer selling point для немецкого CV.
6. **Основной стек:** [needs evidence]
7. **Что доказывает:** ability to solve a real user problem end-to-end: admin site, restricted access, bot interface, schedule updates.
8. **Потенциальный CV angle:** лучше держать для интервью as initiative story, не как основной CV project.
9. **Сила case:** low-medium
10. **Что уточнить:** stack, users count, usage period, hosting, reliability, screenshots/demo [needs evidence]

---

## 14. HEY, ALTER! Köln volunteer IT

1. **Название case:** HEY, ALTER! Köln volunteer IT technician
2. **Тип case:** volunteer/local German experience
3. **Компания / контекст:** HEY, ALTER! Köln e.V.; local volunteer IT support for donated laptops
4. **Период:** Feb 2026 – Present
5. **Почему важен для Германии:** полезен как local German integration signal: Köln, volunteering, practical IT, social contribution.
6. **Основной стек:** OS/software installation, laptop refurbishing, device testing/configuration
7. **Что доказывает:** local engagement, reliability, hands-on IT, willingness to integrate in Germany.
8. **Потенциальный CV angle:** small additional experience/volunteering section, not technical developer proof.
9. **Сила case:** low for dev, useful for integration
10. **Что уточнить:** number of devices, frequency, tools/process, German communication context [needs evidence]

---

# Самые сильные 5 кейсов для немецкого рынка

1. **EPAM large-scale e-commerce platform** — главный umbrella case: modern commercial production experience.
2. **ProductsUp product data sync** — лучший backend/cloud/integration flow.
3. **Amplience automation / webhooks / mass updates** — сильный automation + business impact case.
4. **Customer email notification incident** — лучший production debugging / observability case.
5. **High-risk PostgreSQL account migration** — лучший data integrity / SQL / backend maturity case.

Дополнительно почти в top-5: **CommerceTools product data retrieval** и **Event-driven customer notification flow**. Они особенно сильны для e-commerce/API/integration roles.

Портфолио-проекты (кейсы 19–22, 17) не конкурируют с коммерческими кейсами за этот список: они дополняют их по типу вакансии (см. матрицу релевантности выше).

---

# Второстепенные кейсы

1. **Vacation payment calculation** — хороший business logic case, но старый стек PHP и нужны details.
2. **Custom PHP framework / backend core** — полезен для architecture/core thinking, но не должен уводить профиль в PHP.

---

# Кейсы, которые лучше не выносить в основной CV, но держать для интервью

1. **Viber bot schedule system** — good initiative story, но слабее для professional CV, если мало места.
2. **AI Bootcamp RAG Service** — `cvEligible: false` до проверки реализации; только как тема на интервью, если спросят.
3. **HEY, ALTER! Köln volunteer IT** — лучше отдельным small volunteering section, не в technical experience.
4. **CHI Software internship** — использовать коротко как transition from PHP to Node.js, не как отдельный сильный project case.

---

# Какой case разобрать первым глубоко

Первым глубоко стоит разобрать:

## ProductsUp product data synchronization flow

Причина: это самый сбалансированный case для немецкого Backend / Software Engineer рынка. Он показывает сразу несколько важных сигналов:

- Node.js / TypeScript commercial backend;
- Azure Durable Functions;
- integration with external systems;
- scheduled/manual workflows;
- data processing;
- file generation and streaming;
- retries / reliability;
- production relevance;
- ownership and knowledge transfer.

После него логичный порядок deep dive:

1. ProductsUp product data sync
2. Amplience automation / webhooks
3. Customer email notification incident
4. High-risk PostgreSQL migration
5. EPAM large-scale e-commerce platform overview

Из портфолио для интервью первыми готовить Dark Factory (AI-assisted SE), B1 Kompass (full-stack) и Home Budget (data integrity / financial logic).
