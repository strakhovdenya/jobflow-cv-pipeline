# Master CV — внутренний карьерный профиль  
## Denys Strakhov — v0.8 portfolio refresh

## v0.8 — portfolio refresh (2026-11-23)

Это активная версия master CV. Она заменяет v0.7 целиком, а не дополняет её: устаревшие рекомендации удалены из тела файла, история осталась в файлах v0.7 и старше.

- **Источник проектных фактов:** аудит пяти репозиториев от 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`). Подробные кейсы — в активном `career_cases`, допуск проектов — в блоке `portfolio-registry` активного `project_inventory`.
- **Основные портфолио-проекты — пять:** Dark Factory, JobFlow CV Pipeline, Cards, B1 Kompass, Home Budget. Проект вне registry или с `cvEligible: false` в CV не используется. AI Bootcamp RAG Service — secondary, `needs_evidence`, в CV не используется.
- Dark Factory — отдельный репозиторий и пакет, а не часть репозитория JobFlow.
- Коммерческий опыт (EPAM, Factor–IT, CHI) не меняется: компании, роли, даты и факты те же, что в v0.7. Портфолио-технологии и обучение не попадают в коммерческие записи.
- Всё о личных проектах — personal / portfolio evidence, не commercial production experience. Cards и B1 Kompass публично развёрнуты и работают, но это личные деплои одного владельца: без подтверждённых пользователей, SLA и коммерческой ответственности. В CV их не выдавать за коммерческую эксплуатацию.

---

## Current Independent Work & Portfolio Projects

**2026-07-02 clarification:** `Current Independent Work & Portfolio Projects` is mandatory for external CV/PDF/HTML outputs. The volunteering bullet is market-dependent; the current-work block itself is not optional.

### Current timeline decision

- Use **May 2025 – Present** as current period after EPAM.
- External CV/LinkedIn positioning should not leave an unexplained gap after EPAM.
- Preferred CV block name: **Current Independent Work & Portfolio Projects**. Use this block in every external CV/PDF/HTML output to close the post-EPAM timeline gap.
- Preferred CV role line: **Freelance Software Development, Backend Portfolio Projects & Relocation**.
- Preferred LinkedIn regular Experience title: **Freelance Software Developer | Backend Portfolio Projects & Relocation**.
- If using LinkedIn, prefer a normal Experience entry with `Self-employed`, not LinkedIn `Career Break`, because LinkedIn displays it as “Career break / Перерыв в карьере”.

### Strategic rule

Use this period to close the timeline gap and show active development, but do **not** let it replace EPAM as the strongest commercial production evidence. In PDF CVs, always place a compact current block before EPAM or as a light current section, then immediately show EPAM as the main professional experience.

### Stable CV wording

```text
CURRENT INDEPENDENT WORK & PORTFOLIO PROJECTS
Freelance Software Development, Backend Portfolio Projects & Relocation
May 2025 – Present · Cologne, Germany · Remote

Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.

- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export, with human-in-the-loop review gates, an AI provider abstraction, BullMQ/Redis background jobs for LLM steps, an explicit LLM call policy (retries only for 429/5xx, per-step output-token limits, typed errors for bad answers), prompt versioning, token/cost tracking and HTML-to-PDF export without AI token usage.
- [one concrete fact chosen for the vacancy — see the tailoring rule below]
- Volunteered as IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

Short JobFlow variants (when space is tight):

```text
- Built JobFlow CV Pipeline, a NestJS/TypeScript and PostgreSQL application with OpenAI integration, BullMQ/Redis background jobs, human review gates, checks that flag unsupported CV claims and deterministic PDF export.
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation and deterministic PDF export, with human-in-the-loop review gates, OpenAI integration behind a provider abstraction and BullMQ/Redis background jobs for LLM steps.
```

### Tailoring rule for CV pipeline

This block is **semi-fixed**:

- Always keep the header, dates, location and the gap-closing description line stable.
- The description line after dates is not a bullet.
- Always keep the current-work block itself in external CV/PDF/HTML outputs.
- Adapt only 1–2 bullets based on the vacancy.
- Keep 4–5 bullets total.
- Do not turn this block into the main proof of commercial experience.
- Main targeting still belongs to Summary, Skills, EPAM bullets, Certifications and selected projects.
- JobFlow CV Pipeline stays in this block (`placement: current_work_block`) and is never repeated in Selected Projects.
- The third bullet is one concrete, verified fact chosen for the vacancy; it does not repeat Selected Projects. The final selection rule lives in the active `cv_rules`. Verified options:
  - AI: `Completed Google Cloud hands-on labs on agent development with ADK, covering tool-enabled agents, multi-agent systems and deployment to Agent Runtime, alongside ongoing development with Claude Code and OpenAI Codex.`
  - Node.js/backend: `Deepened Node.js engineering through LinkedIn Learning courses on scaling, testing, security and design patterns.`
  - Full-stack (if the projects are not in Selected Projects): `Built and published Next.js/React applications on Supabase PostgreSQL with SQL migrations and Playwright end-to-end tests.`
  - Python: `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".`
- Volunteering is a separate bullet when included: Germany / remote EU usually include; Ukraine / Ukrainian-market case-by-case.

Recommended emphasis by vacancy:

- **Default backend / Node/NestJS:** JobFlow (NestJS, TypeScript, PostgreSQL, Prisma, Swagger/OpenAPI, modular service boundaries) + small Node.js/React improvements + volunteering.
- **AI integration:** JobFlow facet — provider abstraction, LLM call policy, BullMQ/Redis jobs, human review gates, Evidence Guard.
- **AI-assisted engineering / developer productivity:** Dark Factory in Selected Projects; JobFlow stays one bullet here.
- **Full-stack / React / Next.js:** B1 Kompass in Selected Projects, then Cards if a requirement stays uncovered; JobFlow dashboard facet here.
- **Database / financial logic:** Home Budget in Selected Projects.
- **Python/FastAPI secondary:** only the FastAPI course as the third bullet; there is no verified Python portfolio project.
- **German/local:** mention Cologne, German practice and HEY, ALTER! volunteering.

### Safety boundaries

- Small freelance tasks are safe only as `small Node.js/React improvements on an independent basis`; do not imply major clients, long contracts, enterprise scope or full-time freelance workload without evidence.
- All five portfolio projects remain **personal / portfolio** evidence, not commercial production evidence.
- NestJS/Prisma/Swagger/OpenAPI are current personal portfolio skills through JobFlow, not commercial production skills.
- Python/FastAPI is learning only (Udemy course), not commercial Python production and not a portfolio project.
- Do not claim ML/MLOps, model training, production AI platform, enterprise usage or client adoption.

---

## Portfolio projects (registry-aligned)

Порядок ниже не задаёт приоритет: проекты выбираются по вакансии (правило «coverage, not topic»). Подробности, проверенные файлы и «Do not claim» — в активном `career_cases` (кейсы P1–P5).

### JobFlow CV Pipeline — current-work block

- Period: June 2026 – Present. Repository: https://github.com/strakhovdenya/jobflow-cv-pipeline
- Stack: NestJS 11, TypeScript, PostgreSQL, Prisma, BullMQ/Redis, OpenAI API behind an AI provider abstraction, Swagger/OpenAPI, Handlebars/Puppeteer, Jest, Docker Compose, GitHub Actions; Next.js dashboard.
- Scale (2026-11-23): 782 commits, 354 merged PRs, 45 ADRs; unit + three e2e suites with a coverage floor in CI.
- Safe details: human-in-the-loop review gates; Evidence Guard; deterministic HTML-to-PDF export without AI tokens; token/cost tracking; prompt versioning with source snapshots; explicit workspace status machine; BullMQ/Redis AI jobs (`202` + `jobId`, one job per workspace + step, no automatic retries of paid AI calls); LLM call policy (retries only for 429/5xx, no retry after a timeout, per-step output-token limits, typed errors).
- Not confirmed: public deployment, users other than the owner, user authentication (API key only).

### Dark Factory — Selected Projects

- Type: standalone, versioned Node.js package in its own repository (releases `v0.1.0`–`v0.1.3`). Period: 2026 – Present (extracted from JobFlow into a separate package in Oct 2026). Repository: https://github.com/strakhovdenya/dark-factory
- Stack: Node.js, Claude Code (headless CLI, hooks, skills, agents), OpenAI Codex, GitHub Actions, Docker, JSON Schema.
- Git boundary of the coding agent: it may read repository state (`git status`, `git diff`, `git log`, `git show` on review passes); `git commit`, `git push` and `gh` are denied; the controller commits, pushes and opens the PR.
- Installed in three personal repositories: JobFlow CV Pipeline, Cards, B1 Kompass. Not installed in Home Budget.

Compact (default when space is tight):

```text
Built Dark Factory, a reusable Node.js toolkit for sandboxed Claude Code development workflows, with independent OpenAI Codex-based pull request verification and deterministic acceptance checks.
Extracted the workflow from JobFlow into a versioned package and integrated it into Cards and B1 Kompass, retaining human-controlled merges.
```

Detailed (AI tooling vacancies):

```text
Built Dark Factory, a versioned Node.js package (releases v0.1.0–v0.1.3) that installs an AI-assisted delivery workflow into a repository: Claude Code hooks, skills and agents; Ralph, a loop that runs Claude Code in a Docker sandbox on a scoped GitHub Issue, where the agent can read Git history but cannot commit, push or call the GitHub CLI, and the controller opens the pull request; and an OpenAI Codex-based acceptance verifier in GitHub Actions whose verdict is computed and re-checked by code.
Extracted the workflow from JobFlow into this standalone package and installed it in two further personal projects; the package test suite runs in CI on Linux and Windows.
```

### B1 Kompass — Selected Projects

- Publicly available practice app for the German DTZ exam (listening and reading): https://b1-kompass.vercel.app. Period: Oct 2026 – Present. Repository: https://github.com/strakhovdenya/b1-kompass
- Stack: Next.js 16, React 19, TypeScript (strict), MUI 7, next-intl, Supabase (PostgreSQL, RLS, Storage), Vitest, Playwright.

```text
Built B1 Kompass, a publicly available Next.js/TypeScript practice app for the German DTZ exam (listening and reading) with guest sessions, server-enforced exam timing and a Supabase PostgreSQL schema with 15 SQL migrations, row-level security and immutable answer keys, covered by Vitest and Playwright end-to-end tests in CI.
```

### Cards — Selected Projects

- German vocabulary trainer with a public demo: https://cards-indol-eight.vercel.app/demo. Period: Jul 2025 – Present. Repository: https://github.com/strakhovdenya/cards
- Stack: Next.js 16, React 19, TypeScript, Supabase (PostgreSQL, Auth), Upstash rate limiting, Vitest, Playwright.
- The interface is in Russian only; no AI features inside the app; row-level security is not claimed.

```text
Built a German vocabulary trainer on Next.js and Supabase with invite-only email/password sign-up, a publicly accessible read-only demo enforced on the server, and rate limiting with an Upstash Redis limiter and in-memory fallback.
```

### Home Budget — Selected Projects

- Private single-owner budgeting app; no deployment URL, no demo, no users other than the owner (the GitHub repository is public). Period: Nov 2026 – Present. Repository: https://github.com/strakhovdenya/home-budget
- Stack: Next.js 16, React 19, MUI 9, next-intl, Auth.js (Google OAuth), Drizzle ORM, PostgreSQL, Vitest, Playwright.
- Developed with OpenAI Codex through a Codex-native workflow (`AGENTS.md`, `.codex/`, `.agents/skills/`); this is not a Dark Factory installation.
- Not claimed: bank integrations, payments, multi-currency, commercial FinTech experience.

```text
Built a private single-owner budgeting app with Next.js, Drizzle ORM and PostgreSQL that stores money as integer cents and computes period budgets, obligation reserves and liquidity forecasts in unit-tested domain functions, with integration tests against a real PostgreSQL in CI; developed with OpenAI Codex using repository-specific agent instructions and skills.
```

### Skills group: AI-assisted engineering (personal projects)

```text
AI-assisted engineering (personal projects): Claude Code, OpenAI Codex, OpenAI API, LLM call policy (retries, timeouts, output-token limits), structured output validation, BullMQ/Redis job queues, agent guardrails, GitHub Actions
```

Правило: эта группа всегда подписана как personal projects и стоит после commercial skills. Для вакансии без упоминания ИИ группу не добавлять; ИИ-часть остаётся внутри JobFlow-bullet. Claude Code подкрепляется Dark Factory и JobFlow, OpenAI Codex — verifier Dark Factory и Home Budget.

### Safety boundaries for portfolio projects

- Claude Code, Codex, BullMQ, LLM-интеграция и AI evaluation — personal / portfolio evidence, не commercial production.
- Do not claim commercial or production AI experience.
- Do not claim the job title AI Engineer or LLM Platform Engineer.
- Do not claim ML engineering or MLOps or model training.
- Do not claim enabled auto-merge or autonomous production deployment.
- Do not describe the coding agent as having no Git rights at all; use the exact boundary above.
- Deployment/demo links only for Cards (https://cards-indol-eight.vercel.app/demo) and B1 Kompass (https://b1-kompass.vercel.app). Home Budget never gets a deployment or demo URL. Public GitHub repository links (`repositoryUrl` in the registry) are allowed for all five projects.

---

## Стабильные решения прежних версий

- **Внешнее имя:** **Denys Strakhov** во всех внешних материалах.
- **ProductsUp changed records source:** **Cosmos DB container / Cosmos DB change records** confirmed.
- **CommerceTools (v0.3):** scale up to ~100,000 unique products excluding locales, usage across PDP/listing/product-information flows, CommerceTools as one of the sources of truth, no caching, empty-value handling, cautious wording for pagination/batching/API constraints.
- **v0.2:** only confirmed details from ProductsUp, Amplience, Durable Functions and Redis clarifications; unconfirmed facts stay `[needs evidence]` or cautious.
- **EPAM external period:** **Nov 2021 – May 2025**.
- **CHI Software period:** temporarily **Jul 2021 – Oct 2021** as the LinkedIn-consistent external version; finalize later if documentary proof of Sep/Oct exists.
- **Career break framing** (`Career Break — Relocation, May 2025 – Feb 2026`) is superseded by Current Independent Work & Portfolio Projects and is not used in CVs.
- `Completed 13 certifications` can be used in LinkedIn / relocation context; CVs keep only 3–5 targeted certificates.
- Profile linkedIn MD draft is not an authoritative source; useful facts are absorbed here.

---

## 1. Базовая информация

**Имя:** Denys Strakhov  
**External name consistency:** use **Denys Strakhov** in CV, LinkedIn, cover letters, recruiter messages and source files. Do not mix with `Denis` except when quoting old snapshots.  
**Локация:** Cologne / Köln, Germany  
**Готовность к релокации:** только Köln и remote  
**Рабочее разрешение / виза:** authorized to work in Germany; residence permit under §24 AufenthG  
**Формулировка для внешних материалов:** Authorized to work in Germany  
**Целевые страны:** Germany, remote EU  
**Основной рынок:** Germany, Cologne / remote-first roles  

**Целевые роли:**
- Backend Developer Node.js/TypeScript
- Backend-focused Fullstack Developer
- Fullstack Developer TypeScript
- Software Engineer with backend/API/cloud focus
- Backend Developer with AI integrations as nice-to-have
- Python/FastAPI roles — только как дополнительное направление, не основной таргет

**Роли, которые не подходят:**
- pure Frontend Developer
- PHP-only roles
- DevOps-only
- QA
- support
- low-code
- WordPress

**Формат работы:**
- remote preferred
- hybrid in Cologne possible
- office in Cologne possible
- основное условие: English-speaking или English-friendly команда, нормальный onboarding

**Языки:**
- Ukrainian — native
- Russian — native
- English — B1/B1+, used for Jira, documentation, daily meetings, retrospectives, written communication, short calls with Product Owner
- German — A2/B1, basic everyday communication and small talk; completed integration course, actively improving

**LinkedIn:** https://linkedin.com/in/denys-strakhov
**GitHub:** https://github.com/strakhovdenya  
**Email:** strakhov.denya@gmail.com  
**Phone:** актуален из текущего CV  
**Portfolio:** GitHub projects; dedicated portfolio not created yet  
**Ожидаемый уровень позиции:** Mid / Middle+ as primary; Senior-leaning for strong technical match; Junior+ only strategically for German market entry if role has good onboarding and technical fit  

**Зарплатные ожидания:**  
Хочется выше, но готов к компромиссам ради стабильности, нормального onboarding, хорошей команды и входа в немецкий рынок.  
Точный диапазон: [уточнить]

---

## 2. Позиционирование

**Кто я как специалист:**  
Backend-focused TypeScript Developer based in Cologne, with commercial experience in Node.js, TypeScript, Azure serverless, REST APIs, third-party integrations, production support, and strong earlier backend experience with PostgreSQL-heavy financial systems.

**Краткая внутренняя формула:**  
Я backend-focused TypeScript developer. Мой основной современный коммерческий стек — Node.js/TypeScript, Azure serverless, REST APIs, e-commerce integrations, production support. Дополнительно у меня сильный backend foundation: PostgreSQL, сложная финансовая логика, миграции, legacy systems и custom framework development. Дополнительно — AI-assisted engineering (Claude Code, OpenAI Codex) и LLM-интеграция через personal projects (Dark Factory, JobFlow); Python/FastAPI — только обучение. Ни то ни другое не является основным commercial profile.

**Какие роли мне подходят:**
- Backend Developer Node.js/TypeScript
- Backend-focused Fullstack Developer
- Fullstack TypeScript Developer, если backend остаётся значимой частью роли
- Software Engineer в e-commerce / retail / integration-heavy продукте
- Backend Developer with Azure/serverless
- Backend Developer with SQL/PostgreSQL focus
- Backend Developer with AI integrations as plus
- Internal tooling / developer productivity roles with backend + AI automation

**Какие роли мне не подходят:**
- pure frontend
- PHP-only
- DevOps-only
- QA
- support
- low-code
- WordPress
- customer-facing German-speaking technical consultant roles

**Мой основной technical profile:**  
Node.js / TypeScript backend developer with Azure serverless, REST APIs, third-party integrations, production support, testing, CI/CD collaboration, React/Next.js contribution, and strong PostgreSQL background.

**Мой главный профессиональный аргумент:**  
У меня есть реальный коммерческий backend/fullstack background, опыт production-систем, e-commerce integrations, Azure serverless и сложной backend-логики. Я быстро обучаюсь, умею работать в команде, беру ownership за flows/services и хочу профессионально интегрироваться в Германии.

**Что должно быть понятно работодателю за первые 10 секунд:**  
Я не начинающий разработчик. У меня есть коммерческий backend experience since 2016, современный Node.js/TypeScript focus since 2021, production support, cloud/serverless exposure, strong SQL/PostgreSQL foundation и мотивация работать в Германии.

---

## 3. Технологический стек

### Strong / уверенный уровень

#### Node.js / TypeScript

**Уровень:** strong commercial production experience  
**Где использовал:** EPAM Systems  
**Период:** Nov 2021 – May 2025  
**Commercial experience:** да  
**Production experience:** да  

**Что могу делать самостоятельно:**
- проектировать и реализовывать REST APIs
- писать backend business logic
- интегрировать external APIs / third-party platforms
- работать с databases
- писать unit tests
- делать debugging
- поддерживать production backend services
- работать с BFF/API layer
- участвовать в code review
- работать в Agile delivery process
- использовать TypeScript interfaces/types, generics, utility types, type guards and DTO mapping in production code

**Как использовать в CV:**  
Основной современный commercial stack. Должен быть в headline, summary и first skills.

---

#### Azure Functions

**Уровень:** strong commercial production experience  
**Где использовал:** EPAM Systems  
**Production experience:** да  

**Что делал:**
- писал Azure Functions с нуля
- дорабатывал существующие Azure Functions
- реализовывал backend workflows
- работал с configuration, env vars, secrets
- участвовал в deployment-related process

**CV-кандидат:**  
Built and maintained serverless backend functionality using Azure Functions, including new functions from scratch and extensions of existing production components.

---

#### Durable Functions

**Уровень:** strong commercial production experience  
**Где использовал:** EPAM Systems  
**Production experience:** да  

**Что делал:**
- использовал Durable Functions для long-running workflows
- писал orchestrator functions и Activity Functions end-to-end
- использовал sub-orchestrations
- реализовывал retries
- учитывал idempotency для long-running sync flows
- организовывал выполнение нескольких actions внутри workflow
- участвовал в ProductsUp sync flow; начинал initial implementation, позже flow поддерживался и дорабатывался также другими участниками команды
- использовал Azure Blob Storage, чтобы не передавать большие payloads между Activity Functions

**Нужно уточнить:**
- timers
- fan-out/fan-in
- compensation/rollback

**CV-кандидат:**  
Built and maintained long-running backend workflows using Azure Durable Functions, orchestrators, Activity Functions, sub-orchestrations, retries and idempotency patterns.

---

#### Cosmos DB

**Уровень:** commercial production experience  
**Где использовал:** EPAM Systems  
**Production experience:** да  

**Что делал:**
- создавал Cosmos DB containers
- продумывал структуру данных
- работал с partition key / id
- писал queries
- делал select/update operations
- использовал в production backend flows

**Нужно уточнить:**  
точная терминология и глубина: database, container, item/document, partition key, throughput/RU.

---

#### PostgreSQL

**Уровень:** strong commercial production experience  
**Где использовал:** Factor–IT  
**Production experience:** да  

**Что делал:**
- проектировал схемы
- работал с моделями данных
- писал миграции
- писал сложные SQL-запросы
- использовал подзапросы
- использовал множественные JOIN
- анализировал queries
- делал performance analysis
- корректировал медленные запросы
- работал с индексами
- делал rollback миграций, если это было возможно
- работал с большим количеством organization-specific databases

**Ценность:**  
Сильный transferable backend asset для Германии. Особенно для backend roles, где важны relational databases, migrations, query optimization, data integrity.

---

#### Redis

**Уровень:** commercial working experience  
**Где использовал:** EPAM Systems  
**Production experience:** да  

**Что делал:**
- использовал и дорабатывал существующий Redis service / Redis abstraction layer
- использовал Redis для caching selected API responses
- кэшировал Amplience API responses и navigation data
- работал с TTL и cache invalidation
- участвовал в обсуждении, какие данные можно кэшировать
- реализовывал caching по задаче
- работал с performance improvement context

**Не преувеличивать:**  
Не писать, что owned distributed caching architecture end-to-end или designing Redis architecture from scratch.

**CV-кандидат:**  
Used and extended Redis-based caching for selected API responses and navigation data, including TTL and cache invalidation logic.

**Internal evidence:**  
- selected Azure Function executions improved approximately 2–4x after caching, but this metric should be used in external CV only after confirming how it was measured.
- request volume: [нужна метрика]

---

#### React / Next.js

**Уровень:** commercial working-to-strong fullstack experience  
**Где использовал:** EPAM Systems  
**Период активного использования:** примерно последние 2 года в EPAM  
**Production experience:** да  

**Что делал:**
- самостоятельно реализовывал frontend features
- дорабатывал существующие features
- создавал и изменял components
- работал со sliders и другими UI components
- интегрировал frontend с API
- работал через BFF layer
- вносил изменения в GraphQL layer на BFF
- поддерживал и обновлял frontend tests
- выполнял accessibility-related tasks
- проходил accessibility course в EPAM
- исправлял select behavior и другие accessibility issues

**Позиционирование:**  
Не frontend-first. Использовать как backend-focused fullstack advantage.

---

#### Testing / Jest

**Уровень:** strong commercial backend testing experience  
**Где использовал:** EPAM Systems  
**Commercial:** да  

**Что делал:**
- писал в основном unit tests
- большая часть тестов была для backend
- тесты писались почти для каждой функции/feature
- поддерживал frontend tests
- обновлял существующие тесты при изменениях
- работал с quality gate около 80% coverage
- инструмент: SonarQube

**Инструменты:**
- Jest — commercial
- Postman — local API testing
- Pytest — learning exposure only; не утверждать как навык без подтверждения
- Vitest, Playwright — personal projects (B1 Kompass, Cards, Home Budget)

**CV-кандидат:**  
Wrote and maintained backend unit tests with Jest and worked within CI quality gates requiring around 80% test coverage before deployment.

---

### Working knowledge / рабочий уровень

#### Terraform

**Уровень:** commercial working knowledge  
**Где использовал:** EPAM Systems  
**Production-related:** да  

**Что делал:**
- правил Terraform configurations
- создавал новые resources
- менял environment variables
- работал с secrets/configuration
- коммуницировал с DevOps team по сложным вопросам
- участвовал в infrastructure delivery/configuration

**Не преувеличивать:**  
Не писать DevOps Engineer / owned infrastructure end-to-end.

**CV-кандидат:**  
Supported infrastructure configuration and delivery using Terraform, including resource changes, environment variables, and secrets in collaboration with DevOps engineers.

---

#### CI/CD

**Уровень:** commercial working knowledge + personal hands-on GitHub Actions  

**Commercial experience:**
- pipelines запускались автоматически при deployment
- делал небольшие изменения в Azure DevOps steps
- участвовал в deployment process
- взаимодействовал с DevOps по сложным pipeline/infrastructure вопросам

**Personal projects:**
- писал GitHub Actions workflows: lint, typecheck, unit/e2e tests, build, Docker smoke test (JobFlow); CI на Linux и Windows (Dark Factory); E2E на локальном Supabase и ручной release (B1 Kompass); интеграционные тесты на реальной PostgreSQL и прогон под другим часовым поясом (Home Budget)
- построил acceptance verifier на OpenAI Codex в GitHub Actions с вердиктом, который считает код (Dark Factory)

---

#### Azure DevOps

**Уровень:** working knowledge  
**Что делал:**
- небольшие правки pipeline steps
- участие в deployment process
- debugging/coordination with DevOps team

**Нужно уточнить:**  
какие именно pipeline steps менял.

---

#### GraphQL / BFF

**Уровень:** working commercial experience  
**Где использовал:** EPAM  

**Что делал:**
- работал с BFF layer
- вносил изменения в GraphQL
- интегрировал frontend features с backend/API layer

---

#### Docker

**Уровень:** personal/course working knowledge  
**Commercial production experience:** нет / needs evidence  

**Что делал:**
- поднимал local Redis
- поднимал local backend
- Docker Compose с PostgreSQL, Redis, API и web (JobFlow); Docker image build + smoke test в CI (JobFlow)
- Docker sandbox для coding-агента (Dark Factory)
- применял в personal/course projects

**Формулировка:**  
Docker — used in local development and personal projects.

---

#### Python / FastAPI

**Уровень:** coursework  
**Commercial production experience:** нет  
**Portfolio project:** нет проверенного Python-проекта; AI Bootcamp RAG Service — `needs_evidence`, в CV не используется

**Доказательство:** Udemy course «FastAPI - The Complete Course 2026 (Beginner + Advanced)», Apr 2026.

**CV-позиционирование:**  
Только как обучение (третий bullet Current Independent Work или Certifications) для вакансий, где Python/FastAPI — плюс. Не как project experience и не как commercial production.

---

### Basic / поверхностный уровень

#### Kubernetes

**Уровень:** basic / training exposure  
**Commercial production experience:** нет  

**Что делал:**  
Немного изучал, training/internship exposure.

**Не ставить в core skills**, если вакансия не требует.

---

#### MongoDB

**Уровень:** internship/training experience  
**Где использовал:** CHI Software  
**Commercial production:** нет / internship only

---

#### Express / NestJS

**Уровень:** internship/training + transferable Node.js knowledge; NestJS 11 — current personal project (JobFlow)  
**Где использовал:** CHI Software (internship); JobFlow CV Pipeline (personal)  
**Commercial production:** не основной EPAM production stack

---

#### PHP

**Уровень:** strong past commercial experience  
**Где использовал:** Factor–IT  
**Период:** Dec 2016 – Jun 2021  
**Целевая технология сейчас:** нет  

**Как использовать:**  
Не как целевой стек, а как доказательство backend experience, legacy systems, SQL, business logic, migrations, production maturity.

---

## 4. Опыт работы

---

# EPAM Systems

**Период:** Nov 2021 – May 2025  
**Должность:** Backend-focused Fullstack Developer  
**Клиент:** large European retailer, присутствует в большинстве крупных городов Германии  
**Домен:** retail / large-scale e-commerce / online shop  
**Тип системы:** large-scale multi-locale e-commerce platform  
**Количество локалей:** 18+  
**Архитектура:** microservices, serverless backend, API-driven architecture, Azure Functions, Durable Functions, BFF, React/Next.js frontend  
**Проект:** один долгосрочный проект на протяжении всего периода работы  

## Команда

Обычно в моей команде:
- 3 backend developers
- 2 frontend developers
- 2 QA engineers

На проекте было более 5 cross-functional teams. Каждая команда отвечала за свой сектор сервисов. Примерно раз в 5–10 месяцев происходили ротации между командами, и команды меняли ответственность за сервисы.

## Моя роль

Вначале — Backend Developer.  
Последние ~2 года — backend-focused fullstack developer, потому что features часто затрагивали backend, BFF и frontend.

**Реальная роль:**  
Backend-focused Fullstack Developer working across backend services, BFF/API layers, and React/Next.js frontend components.

## Основные направления

- product data sync
- content delivery
- integration APIs
- user/account flows
- BFF
- scheduled jobs
- long-running workflows
- frontend-to-backend debugging
- production bug investigation
- hotfixes
- monitoring and alerting

## Tech stack

TypeScript, Node.js, Azure Functions, Durable Functions, Cosmos DB, Azure Storage, Azure Key Vault, Redis, PostgreSQL, Terraform, React, Next.js, Jest, Azure Application Insights, Azure DevOps.

## Third-party integrations

### Amplience

**Роль:** CMS/content source для разных типов страниц и схем.  
**С чем работал:**
- PDP page schemas
- nav item schemas
- cloned nav item listing pages
- schema-driven content/page structures
- webhooks
- automation workflows
- mass update operations

**Что делал:**
- работал со схемами страниц
- обрабатывал изменения типов схем
- реализовывал webhooks на события внутри Amplience
- обрабатывал webhook events: create, update, publish, unpublish
- автоматизировал logic при создании/обновлении page/schema instances
- участвовал в mass update logic для изменений полей конкретного content/schema type
- обновлял navigation cache, если изменение касалось nav item
- валидировал headers и payload
- логировал operation ID, steps, results
- добавлял retries при обращении к другим сервисам
- участвовал в alerting для critical flows

**Confirmed scale / impact:**
- one mass update operation could affect tens to hundreds of entities/pages;
- before automation, content managers performed selected changes manually through the UI;
- selected operations were reduced from hours to minutes.

**Business impact:**  
Упрощение работы content managers, снижение human error, ускорение selected manual operations from hours to minutes, especially for multi-locale changes.

---

### CommerceTools

**Роль:** source of truth для product catalog data.  
**Confirmed scale:** до ~100,000 unique products без учёта локалей.

**С чем работал:**
- product ID
- sizes
- colors
- names
- materials
- 50+ product attributes
- filters
- product groups/categories

**Что делал:**
- реализовывал получение product data
- получал товары по filters
- получал товары по group/category
- получал конкретный product по ID
- применял product data для PDP, listing pages и других flows, где нужна информация о продукте
- применял product data для ProductsUp enrichment и backend/BFF flows
- обрабатывал optional/missing/incorrect attributes и empty values
- если attribute отсутствовал или был empty, использовал безопасные empty defaults: empty value, empty array или empty string в зависимости от поля
- использовал pagination where supported by the API
- применял custom batching logic where needed for large product retrieval/enrichment flows
- учитывал API/page-size constraints и Azure Functions memory/runtime limits
- не кэшировал CommerceTools responses, потому что CommerceTools был source of truth и product catalog был большой

**Safe wording:**
CommerceTools можно использовать как сильный e-commerce integration signal, но без claim, что я проектировал весь product catalog или CommerceTools architecture.

---

### ProductsUp

**Роль:** downstream service для product data distribution/integration.  
**Что делал:**
- начинал initial implementation sync flow и позже поддерживал/дорабатывал его вместе с командой
- участвовал в daily scheduled sync
- поддерживал emergency/manual trigger; отдельная emergency logic активно использовалась в начале, позже редко
- вычитывал changed product records from a confirmed Cosmos DB container / Cosmos DB change records
- обогащал данные через CommerceTools
- формировал CSV files
- сжимал в GZIP
- хранил промежуточные файлы по каждой локали в Azure Blob Storage, чтобы не передавать большие payloads между Activity Functions
- загружал данные в ProductsUp через Stream API / JavaScript streams
- добавлял retries with backoff для CommerceTools reads, Azure Storage writes, ProductsUp API/Stream API calls
- использовал activity-level retries
- обрабатывал partial failures через skip failed product + logs
- добавлял final per-locale result logs: сколько продуктов нужно было обновить, сколько получили из CommerceTools, сколько отформатировали, сколько отправили в ProductsUp
- учитывал idempotency через composite key: orchestration cycle number + activity number + details; product ID помогал избежать duplicate product records

**Confirmed scale / reliability:**
- typical sync volume: approximately 20,000–40,000 products;
- sync usually processed only changed locales, typically 3–5 locales, while the platform supported 18+ locales;
- full sync could run for more than 2 hours;
- generated CSV/GZIP files were usually tens to hundreds of MB;
- duplicate product records were prevented by product-ID-based idempotency logic.

**Business impact:**  
Стабильное long-running обновление ProductsUp/downstream product data service для changed locales внутри multi-locale e-commerce platform.

---

## Production experience

**Был production support:** да.

Что делал:
- разбирал production bugs
- участвовал в hotfixes
- смотрел logs
- работал с monitoring
- участвовал в incident investigation
- искал responsible service
- проверял Azure Functions
- анализировал ошибки в backend flows
- определял источник проблемы, если ошибка проявлялась только на frontend

## Logs / monitoring / alerting

**Основной инструмент:** Azure Application Insights.  
**Язык запросов:** KQL / Kusto Query Language.

Что делал:
- находил responsible service
- анализировал конкретные Azure Functions
- смотрел logs
- искал errors/exceptions
- анализировал flow execution
- использовал operation/order IDs для tracing
- участвовал в настройке alerts на email для critical flows

## Ownership

### ProductsUp sync flow

- начинал писать реализацию sync flow
- активно развивал и поддерживал её
- работал с Durable Functions
- участвовал в long-running workflow
- делал knowledge transfer другим членам команды
- помогал другим разобраться в поддержке flow

### Event-driven customer notification flow

- отвечал за набор функций промежуточного сервиса
- сервис получал данные через subscription на события, вероятно Azure Service Bus subscriptions
- обрабатывал данные согласно типу события
- добавлял недостающие данные
- форматировал payload
- передавал данные в email/SMS service
- был ключевым участником изменений, тестов и debugging этого flow

## Architecture / technical input

Предлагал:
- code patterns
- logging approaches
- что именно логировать
- какие данные включать в logs
- как сделать flow traceable
- как упростить debugging
- как проверять прохождение workflow по steps

## Agile / refinement / planning

Участвовал в:
- refinement
- planning
- обсуждении требований
- уточнении technical details
- выявлении неопределённостей
- оценке рисков
- подсвечивании unknowns
- обсуждении задач, связанных с хорошо знакомыми частями системы

## Cross-team communication

Часто взаимодействовал с другими командами:
- уточнение service contracts
- согласование сроков
- совместное тестирование
- помощь в поиске ошибок
- debugging на границах ownership
- коммуникация с upstream/downstream service teams

## Communication with QA / BA / PM / PO

С QA:
- объяснял, что изменилось
- подсвечивал affected areas
- указывал, на что обратить внимание при тестировании

С BA:
- уточнял требования
- обсуждал business logic
- уточнял edge cases

С PM / PO:
- обсуждал сроки
- подсвечивал риски
- объяснял uncertainty

## Mentoring / onboarding

- помогал junior/middle developers с тонкостями проекта
- делал onboarding по знакомым частям системы
- проводил knowledge transfer
- объяснял backend flows, которые знал лучше других

## Code review

- каждый PR требовал минимум 2 reviewers
- сам часто ревьюил код других
- мой код всегда проходил review
- review был обязательной частью CI/CD/delivery process

## Documentation

- писал service descriptions в Jira
- обновлял feature descriptions
- вносил изменения в contracts после backend/API updates
- поддерживал документацию по изменениям

## Release responsibility

- участвовал в релизах
- иногда был представителем команды во время релиза
- участвовал в post-release checks
- участвовал в hotfixes при incidents

## Ключевые проекты / кейсы EPAM

### Кейс 1 — Amplience automation / webhooks / mass update

**Business problem:**  
Content managers должны были управлять тем, что отображается на конкретных страницах или частях страниц. Иногда нужно было найти все реализации конкретной схемы и массово изменить поле, например boolean checkbox. Без автоматизации это делалось вручную в каждой странице, с большим риском что-то пропустить. Некоторые изменения применялись только для конкретных локалей.

**Technical solution:**  
Azure Functions обрабатывали Amplience webhooks, включая create/update/publish/unpublish events, валидировали secret keys и payload, запускали нужную business logic, оповещали другие сервисы, обновляли cache, логировали steps, использовали retries и alerts для critical paths. Mass update logic применяла изменения полей для конкретного content/schema type.

**Result:**  
Сокращение ручной работы content managers, снижение human error, поддержка multi-locale workflows. Selected operations were reduced from hours to minutes.

**Metrics / scale:**  
- locales: 18+
- affected entities/pages: tens to hundreds per mass update operation
- time reduction: from hours to minutes for selected content-management operations
- previous process: manual UI changes by content managers

---

### Кейс 2 — CommerceTools product data retrieval

**Business problem:**  
Разные frontend/BFF и backend flows должны были получать данные о товарах: по ID, filter, group/category, а также использовать product details для PDP/listing pages, validation/enrichment и ProductsUp sync.

**Technical solution:**  
Реализовывал product data retrieval из CommerceTools, работал с 50+ attributes, optional/missing/empty fields, pagination where supported by the API, custom batching logic where needed, API/page-size constraints and Azure Functions limits. CommerceTools не кэшировался, потому что был source of truth для большой номенклатуры.

**Result:**  
Более стабильная обработка product catalog data для frontend, BFF, backend business logic и downstream product sync flows.

**Metrics / scale:**  
- product attributes: 50+
- product catalog scale: up to approximately 100,000 unique products excluding locales
- usage: PDP, listing pages, product-information flows, ProductsUp enrichment, backend/BFF flows
- empty-value handling: empty value / empty array / empty string depending on the field
- caching: no caching of CommerceTools responses because it was the source of truth

---

### Кейс 3 — ProductsUp product data sync

**Business problem:**  
ProductsUp/downstream service должен был регулярно получать актуальные product data changes.

**Technical solution:**  
Daily scheduled job + rare emergency/manual trigger, changed product records from a Cosmos DB container / Cosmos DB change records, CommerceTools enrichment, CSV generation, GZIP compression, Azure Blob Storage for intermediate files per locale, ProductsUp Stream API upload via JavaScript streams, activity-level retries, failed-product skipping with logs, final per-locale result summaries, and product-ID-based idempotency.

**Result:**  
Стабильное long-running обновление downstream product data service для changed locales внутри platform supporting 18+ locales.

**Metrics / scale:**  
- frequency: daily scheduled sync + rare emergency/manual sync
- scope: usually 3–5 changed locales per sync, within a platform supporting 18+ locales
- volume: approximately 20,000–40,000 products per sync
- duration: often more than 2 hours
- file size: typically tens to hundreds of MB
- reliability: activity-level retries, failed-product skipping with logs, and final per-locale result summaries

---

### Кейс 4 — Production incident: customer email notification

**Situation:**  
В user journey от заказа до оплаты пользователь не получал email notification.

Flow включал:
1. upstream service, который стартовал/передавал данные;
2. мой intermediate service, который собирал и форматировал данные;
3. downstream email/SMS delivery service.

**Task:**  
Найти, где ломается flow, почему email не отправляется, какие данные отсутствуют.

**Action:**  
Команды искали logs по order number, проверяли upstream service, мой intermediate service и email/SMS service. Выяснилось, что мой сервис не мог получить обязательные данные, а после форматирования email service не мог отправить письмо.

**Result:**  
Причина была локализована, добавлены дополнительные logs и Azure alerts, потому что customer notifications были business-critical.

**Metrics:**  
- affected users: [нужна метрика / unknown]
- investigation time: [нужна метрика]
- alert response process: [уточнить]

---

## CV bullets candidates — EPAM

- Worked on a large-scale multi-locale e-commerce platform for a major European retailer, supporting 18+ locales in a microservice-based Azure serverless environment.
- Delivered backend and fullstack features across product data synchronization, content delivery, integration APIs, user/account flows, BFF layers, scheduled jobs, and long-running workflows.
- Integrated Amplience, CommerceTools, and ProductsUp to support content management, product catalog data, and downstream product data synchronization.
- Automated Amplience content workflows for 18+ locales using webhook-based Azure Functions, validation, logging, retries, cache updates, and mass update logic, reducing selected manual UI operations from hours to minutes.
- Built CommerceTools product data retrieval logic for PDP, listing, BFF/backend and ProductsUp enrichment flows, handling filters, product groups, product IDs, 50+ attributes, optional/empty fields, pagination where supported and custom batching where needed for a catalog of up to ~100,000 unique products excluding locales.
- Built the initial implementation and later supported its maintenance with the team on a ProductsUp product data sync flow using scheduled/emergency triggers, change records, CommerceTools enrichment, CSV/GZIP files, Azure Blob Storage, Stream API uploads, retries, idempotency and per-locale result logging.
- Investigated production issues using Azure Application Insights and log queries, tracing failures across Azure Functions, BFF layers, frontend symptoms, and backend microservices.
- Took ownership of key backend flows, provided knowledge transfer, onboarded new team members, and regularly reviewed pull requests in a mandatory two-reviewer process.

---

# Factor–IT

**Период:** Dec 2016 – Jun 2021  
**Должность:** PHP Developer  
**Тип компании:** маленькая продуктовая IT-компания  
**Домен:** budget accounting / public-sector finance / financial accounting for state-funded organizations  
**Пользователи:** бухгалтеры бюджетных / государственных организаций  
**Тип системы:** production-система для финансового учёта и государственной отчётности  
**Backend stack:** PHP, custom in-house framework, raw PHP  
**Database:** PostgreSQL  
**Frontend:** React  
**Команда:**
- 2 backend developers
- 2 frontend developers
- 1 QA
- 1 lead
- 1 главный аналитик
- 3 analysts / support specialists

## Продукт

Система использовалась для:
- учёта прихода средств
- учёта расхода средств
- начислений сотрудникам
- зарплат
- отпускных
- годовой государственной отчётности
- финансового учёта организаций

## Production context

Система была production и использовалась реальными пользователями.

Особенности:
- тысячи пользователей
- у каждой организации своя база данных
- базы одного типа, но данные сильно отличаются
- некоторые миграции были необратимыми или сложно обратимыми
- высокая ответственность из-за финансовых данных и отчётности

## Моя роль

- самостоятельно закрывал backend features
- работал с legacy code
- реализовывал сложную business logic
- писал SQL queries
- делал database migrations
- занимался performance analysis
- участвовал в bug fixing
- участвовал в production support
- участвовал в releases
- развивал custom backend framework
- предлагал framework-level features
- работал с core development tooling

## PostgreSQL / SQL

Что делал:
- schema design
- complex SQL queries
- multiple JOINs
- subqueries
- performance analysis
- indexes
- slow query correction
- migrations
- rollback planning where possible
- работа с большим количеством organization-specific databases

## Key cases Factor–IT

### Кейс 1 — сложная миграция: разбиение счетов учёта

**Business problem:**  
Деньги раньше учитывались на одном счёте, но нужно было разбить их на два счёта и корректно разложить данные по регистрам отчётности. На каждом новом счёте нужно было указать правильные аналитические метрики.

**Technical problem:**  
Миграция затрагивала 3–10 связанных таблиц. Нужно было корректно перенести и разделить данные по новым счетам и reporting registers.

**Risk:**  
После изменения данных на счетах и регистрах собрать их обратно не всегда было возможно. Многие миграции были необратимыми или очень сложными для rollback.

**Risk reduction:**
- плотное общение с аналитиком
- validation на этапах миграции
- intermediate tables для сохранения исходных данных
- testing на копии пользовательской базы
- test project on real-data copy
- иногда contact with focus group of users
- rollback plan where possible

**Мой вклад:**  
Самостоятельно писал SQL/PHP migration scripts.

**Result:**  
Корректное разделение финансовых данных по новым счетам и регистрам с минимизацией production data risk.

**CV-кандидат:**  
Implemented complex PostgreSQL migrations for financial accounting data, including account splitting across reporting registers, multi-table updates, validation steps, and rollback planning where possible.

---

### Кейс 2 — сложная бизнес-логика: расчёт отпускных

**Business problem:**  
Система должна была рассчитывать отпускные для сотрудников бюджетных организаций в соответствии с законодательством и регламентами.

**Why complex:**  
Расчёт зависел от:
- стажа
- типа работы
- времени работы
- периода
- разных настроек
- законодательных требований
- множества scenarios

Для одного бизнес-кейса могли существовать десятки вариантов расчёта.

**Requirements source:**
- analyst
- chief analyst
- legislation/regulations

**Process:**  
Сначала обсуждение концепции между backend developers, lead и главным аналитиком. Потом самостоятельная backend implementation.

**Data involved:**
- суммы
- даты отпуска
- разбивка отпускных по дням
- reporting/register data
- other payroll/accounting fields: [уточнить]

**Testing:**  
Тестирование на тестовой базе, прохождение возможных кейсов для каждой настройки/scenario.

**CV-кандидат:**  
Implemented complex payroll-related business logic for vacation payment calculations, handling dozens of calculation branches based on employment history, work type, periods, and regulatory requirements.

---

### Кейс 3 — custom PHP framework / backend core

**Technical context:**  
В компании использовался custom in-house PHP backend framework.

Framework включал:
- database layer
- permissions
- backend routing
- migrations
- data validation
- backend development conventions

Framework был построен на идеях Data Mapper pattern.

**Мой вклад:**
- участвовал в развитии framework
- предлагал и реализовывал migration system improvements
- улучшал database layer
- работал с data retrieval
- добавлял validation features
- участвовал в main backend routing logic

**Кто пользовался:**  
Backend developers.

**Impact:**  
Framework ускорял разработку, делал код короче и читабельнее, скрывал повторяющиеся technical details, снижал риск ошибок через entity validation.

**CV-кандидат:**  
Contributed to a custom in-house PHP backend framework based on Data Mapper ideas, improving migration tooling, database access, validation, permissions, and backend routing to make development faster, more readable, and less error-prone.

---

## CV bullets candidates — Factor–IT

- Developed backend functionality for a production public-sector budget accounting system used by many organizations, focusing on PostgreSQL-heavy features, complex business logic, legacy maintenance, and data migrations.
- Implemented complex financial and payroll-related business logic, including vacation payment calculations with multiple regulatory scenarios and reporting updates.
- Planned and executed high-risk PostgreSQL migrations across organization-specific databases, including multi-table account-splitting migrations with validation and rollback planning where possible.
- Optimized complex SQL queries using joins, subqueries, indexes, and performance analysis.
- Contributed to a custom in-house PHP backend framework, improving database access, migrations, validation, permissions, and routing.
- Supported production users through bug fixing, releases, and legacy system maintenance.

---

# CHI Software

**Период:** Jul 2021 – Sep 2021  
**Должность:** Node.js Developer Intern / Trainee  
**Формат:** full-time, office  
**Тип опыта:** commercial internship / switch program from PHP to JavaScript/Node.js  
**Цель:** переход из PHP backend development в JavaScript/Node.js backend development  

## Что делал

- выполнял учебные backend-задачи
- писал backend services самостоятельно в рамках training tasks
- работал с Express / NestJS
- изучал REST API development
- использовал MongoDB / Docker / Kubernetes в training/introductory context
- получал code review от ответственного лица
- командной разработки и полноценного Git flow не было
- production/commercial project delivery не было или needs evidence

## Роль в карьерной истории

CHI Software был переходным этапом из PHP в JavaScript/Node.js. Он дал базовое знакомство с Node.js, Express, NestJS, REST API и modern backend tooling. Основное коммерческое развитие в Node.js/TypeScript произошло уже в EPAM.

## CV-кандидат

Completed a full-time Node.js internship focused on transitioning from PHP to JavaScript backend development, covering Express, NestJS, REST APIs, MongoDB, Docker basics, and code review.

---

# HEY, ALTER! Köln e.V.

**Период:** Feb 2026 – Present  
**Должность:** Volunteer IT Technician  
**Локация:** Cologne / Köln, Germany  
**Тип опыта:** local German volunteer IT experience  

## Что делаю

- refurbish and prepare donated laptops for school students
- install operating systems and required software
- test and configure devices before distribution

## Как использовать

Это не developer role, но полезно для немецкого рынка как:
- local German context
- volunteering
- practical IT involvement
- social integration
- Cologne-based activity

## CV-кандидат

Volunteer IT Technician helping refurbish donated laptops for school students, including OS/software installation, testing, configuration, and device preparation.

---

## 5. Personal projects

Пять основных портфолио-проектов (Dark Factory, JobFlow CV Pipeline, Cards, B1 Kompass, Home Budget) описаны выше в разделе «Portfolio projects (registry-aligned)»; кейсы с проверенными файлами — в активном `career_cases`. Здесь — остальные личные проекты.

---

# AI Bootcamp API / RAG Service

**Тип:** learning / personal project  
**Registry:** `portfolioPriority: secondary`, `evidenceClass: needs_evidence`, `cvEligible: false`  
**GitHub:** https://github.com/strakhovdenya/ai-bootcamp  
**Commercial experience:** нет  

Реализация не проверялась в аудите 2026-11-23 (проверка отложена, P1). До проверки проект в CV не используется ни в каком разделе. Заявленный стек: Python, FastAPI, LangGraph, Qdrant, OpenAI API, Docker. На интервью — только как учебный проект, если спросят про RAG.

---

# Viber bot for hockey team schedule

**Тип:** personal project / real-life use case / non-commercial  
**Users:** parents of children’s hockey team  

## Problem

Расписание тренировок каждый месяц сильно менялось. Родителям и участникам приходилось постоянно уточнять актуальное расписание у ответственных лиц или тренера.

## Solution

Сделал:
- admin website for responsible users
- restricted access
- monthly schedule management
- Viber bot for parents/team participants
- access by date: today, tomorrow, specific date, any day
- training type, time, location
- changes immediately visible to all bot users

## Value

- уменьшение ручного уточнения расписания
- централизованное обновление информации
- актуальные данные для всех родителей
- решение реальной проблемы с реальными пользователями

## CV usage

Не для CV: проекта нет в `portfolio-registry`. Можно использовать на интервью как example of initiative.

---

## 6. Достижения — сырой список

### EPAM

**Что сделал:** автоматизировал Amplience content workflows, webhooks and mass updates.  
**Почему важно:** content managers раньше делали часть операций вручную через UI, что занимало часы и повышало риск human error.  
**Результат:** selected operations were reduced from hours to minutes; mass updates could affect tens to hundreds of entities/pages across 18+ locales.  
**Метрики:** 18+ locales; tens to hundreds of affected entities/pages; hours-to-minutes reduction for selected operations.

**Что сделал:** работал с CommerceTools product data retrieval как source of truth для product catalog data.  
**Почему важно:** product data нужно было стабильно получать для PDP, listing pages, BFF/backend flows и ProductsUp enrichment.  
**Результат:** robust handling of 50+ attributes, optional/missing/empty fields, pagination where supported, custom batching where needed, and safe empty defaults without caching CommerceTools responses.  
**Метрики:** up to approximately 100,000 unique products excluding locales; 50+ product attributes.

**Что сделал:** built the initial implementation and later supported its maintenance with the team on ProductsUp product data sync.  
**Почему важно:** downstream product data service должен был регулярно получать актуальные product changes для changed locales.  
**Результат:** stable long-running sync flow with CommerceTools enrichment, Blob Storage intermediate files, Stream API upload, activity-level retries, failed-product logging and per-locale result summaries.  
**Метрики:** approximately 20,000–40,000 products per sync; usually 3–5 changed locales; sync duration often 2+ hours; files typically tens to hundreds of MB.

**Что сделал:** участвовал в production incident investigation по customer email notifications.  
**Почему важно:** email notifications были critical для customer journey.  
**Результат:** добавлены logs и Azure alerts.  
**Метрики:** affected users/investigation time [нужна метрика].

**Что сделал:** делал onboarding/knowledge transfer/reviews.  
**Почему важно:** ускорял работу команды и передачу ownership.  
**Результат:** new team members быстрее понимали flows.  
**Метрики:** [нужна метрика / возможно не нужна].

### Factor–IT

**Что сделал:** реализовывал high-risk PostgreSQL migrations.  
**Почему важно:** financial/accounting data, many organization-specific databases, rollback limitations.  
**Результат:** корректные изменения данных с validation and risk reduction.  
**Метрики:** 3–10 tables per migration; number of databases/users [нужна метрика].

**Что сделал:** реализовывал сложную payroll/financial business logic.  
**Почему важно:** законодательные требования, много calculation branches.  
**Результат:** система могла рассчитывать отпускные и reporting data по разным scenarios.  
**Метрики:** number of scenarios [нужна метрика].

**Что сделал:** участвовал в custom PHP framework development.  
**Почему важно:** framework ускорял backend development и снижал ошибки.  
**Результат:** более лаконичный, читаемый код; validation and database layer improvements.  
**Метрики:** [не обязательно].

### Personal projects

**Что сделал:** построил Dark Factory — переиспользуемый пакет AI-assisted delivery workflow (releases v0.1.0–v0.1.3).  
**Почему важно:** практическая инженерия с Claude Code и OpenAI Codex с детерминированными проверками.  
**Результат:** пакет установлен в трёх личных репозиториях (JobFlow, Cards, B1 Kompass).  
**Метрики:** 84 test files; CI на Linux и Windows.

**Что сделал:** построил JobFlow CV Pipeline (NestJS/PostgreSQL, OpenAI integration, deterministic PDF export).  
**Почему важно:** current backend practice и LLM-интеграция с human review.  
**Результат:** рабочий pipeline с unit + e2e тестами и coverage floor в CI.  
**Метрики:** 782 commits, 354 merged PRs, 45 ADRs (2026-11-23).

**Что сделал:** построил B1 Kompass и Home Budget.  
**Почему важно:** full-stack Next.js + PostgreSQL с правилами, которые обеспечивает база данных (B1 Kompass), и денежная логика в integer cents (Home Budget).  
**Результат:** B1 Kompass публично доступен; Home Budget — частное приложение одного владельца.  
**Метрики:** B1 Kompass — 15 SQL migrations, 49 Playwright specs; Home Budget — ~100 test files.

---

## 7. Production experience

## EPAM

**С какими production-системами работал:**
- large-scale multi-locale e-commerce platform
- Azure Functions backend services
- Durable Functions workflows
- Amplience/CommerceTools/ProductsUp integrations
- BFF/API layer
- React/Next.js frontend features
- customer notification flow
- product data sync

**Инциденты / bugs:**
- customer email notification not sent after order/payment
- frontend-visible errors with backend root cause
- errors across microservices where source service was unclear
- rerendering issues in complex frontend pages

**Debugging:**
- Azure Application Insights
- KQL-style queries
- logs by order number / operation ID
- tracing across Azure Functions and services
- identifying responsible service/team
- checking payloads and missing required data

**Monitoring / alerting:**
- Azure Application Insights
- alerts via email for critical flows
- additional logs after incidents

**Releases:**
- participated in releases
- sometimes present as team representative
- post-release checks
- hotfix participation

## Factor–IT

**Production systems:**
- public-sector budget accounting system
- financial reporting
- payroll/vacation calculations
- organization-specific PostgreSQL databases

**Production risks:**
- financial data integrity
- irreversible or hard-to-rollback migrations
- many databases with different data
- statutory reporting correctness

**Risk reduction:**
- analyst collaboration
- test database copies
- validation SQL
- intermediate tables
- rollback plans where possible
- focus group testing in some cases

---

## 8. Engineering practices

**Testing:**
- Jest unit tests in EPAM
- backend-focused tests
- frontend tests updates
- quality gate around 80% coverage
- unit, integration and E2E tests with coverage gates in personal projects (Jest, Vitest, Playwright, `node --test`)
- API testing with Postman
- testing complex Factor–IT logic on test DBs

**Code review:**
- mandatory two-reviewer PR process in EPAM
- regularly reviewed code of others
- own code always reviewed
- code review from responsible person in CHI Software internship

**CI/CD:**
- Azure DevOps exposure in EPAM
- automatic pipelines on deploy
- small pipeline step changes
- GitHub Actions in personal projects (JobFlow, Dark Factory, B1 Kompass, Home Budget)
- end-to-end tests against a real PostgreSQL service in CI (JobFlow, Home Budget)
- independent OpenAI Codex-based acceptance verification of PRs (Dark Factory)

**Documentation:**
- Jira service descriptions
- feature notes
- contract updates
- documentation of service changes
- requirements clarification with BA/analysts

**Agile/Scrum/Kanban:**
- sprint planning
- daily standups
- retrospectives
- refinement
- reviews
- risk/uncertainty discussions

**Architecture discussions:**
- logging approach
- code patterns
- traceability
- workflow debugging
- framework-level features in Factor–IT
- Data Mapper ideas in custom framework

**Security:**
- Azure Key Vault
- secrets/env vars
- webhook secret key validation
- access restrictions in personal Viber/admin project
- deeper security experience: needs evidence

**Performance:**
- Redis caching
- PostgreSQL query optimization
- indexes
- query analysis
- batching/pagination
- Azure Functions memory limits
- streaming uploads

**Refactoring:**
- legacy code in Factor–IT
- maintainability improvements
- custom framework abstractions
- code patterns in EPAM

**Observability:**
- Azure Application Insights
- KQL-style log queries
- operation ID logging
- step-by-step workflow logs
- alerts for critical flows

---

## 9. Командная работа и коммуникация

**С кем работал:**
- backend developers
- frontend developers
- QA
- DevOps
- BA
- PM
- Product Owner
- analysts
- support analysts
- team lead
- other service teams
- content/product-related stakeholders indirectly through features

**QA communication:**
- after feature completion, explained what changed
- highlighted affected areas
- advised where to focus testing

**BA / analyst communication:**
- clarified requirements
- discussed business logic
- discussed edge cases
- worked closely on financial logic/migrations in Factor–IT

**PM / PO communication:**
- discussed timelines
- communicated risks
- clarified uncertainties
- short calls with Product Owner in English

**Cross-team communication:**
- service contracts
- timelines
- integration testing
- debugging across ownership boundaries
- finding responsible service/team

**Mentoring / onboarding:**
- helped junior/middle developers
- explained project details
- onboarded new team members to familiar functionality
- provided knowledge transfer for owned flows

**English in work:**
- daily meeting with team and PO
- Jira/documentation in English
- written communication
- short PO calls
- retrospectives in English

**German in work:**  
No professional German technical experience yet. Basic everyday communication and small talk.

---

## 10. Истории для интервью

### Story 1 — Amplience automation

**Context:** multi-locale e-commerce platform with 18+ locales. Content managers needed to update schema/page implementations manually through UI.  
**Task:** automate webhook-based content workflows and mass updates.  
**Action:** implemented Azure Functions with header/payload validation, create/update/publish/unpublish event handling, service notifications, cache updates, logs, retries, alerts and mass field update logic for specific content/schema types.  
**Result:** reduced selected content-management operations from hours to minutes, especially when the same field change had to be applied across tens to hundreds of entities/pages and multiple locales.

---

### Story 2 — ProductsUp sync

**Context:** downstream ProductsUp service needed stable product data updates.  
**Task:** build/support daily and emergency/manual sync for changed products in a platform supporting 18+ locales.  
**Action:** implemented the initial version of the flow and later supported its maintenance with the team. The workflow processed around 20,000–40,000 products per sync, usually for 3–5 changed locales, generated tens-to-hundreds of MB CSV/GZIP files, used Azure Blob Storage for intermediate files between activities, enriched data via CommerceTools, uploaded via ProductsUp Stream API, retried failed activities, skipped and logged failed products, and produced final per-locale result summaries.  
**Result:** supported stable long-running product synchronization, often running for more than 2 hours, with idempotency based on orchestration/activity keys and product IDs to avoid duplicate product records.

---

### Story 3 — Customer email notification production issue

**Context:** customer did not receive email notification after order/payment step.  
**Task:** find where the multi-service flow failed.  
**Action:** traced logs by order number across upstream service, intermediate service, and email/SMS service. Found missing required data in intermediate flow. Added logs and Azure alerts.  
**Result:** improved observability and reduced risk of undetected failures in business-critical notification flow.

---

### Story 4 — High-risk financial data migration

**Context:** public-sector accounting system needed to split one accounting account into two accounts and reporting registers.  
**Task:** safely migrate financial data across 3–10 related tables.  
**Action:** discussed logic with analyst, wrote SQL/PHP migration scripts, used validation, intermediate tables, test database copies, rollback planning where possible.  
**Result:** completed complex migration while reducing production data risk.

---

### Story 5 — Vacation payment calculation

**Context:** public-sector payroll logic with many regulatory scenarios.  
**Task:** implement vacation payment calculation based on employment history, work type, periods, legislation.  
**Action:** discussed concept with backend developers, lead and chief analyst; implemented backend logic; tested scenarios on test DB.  
**Result:** system supported complex calculation branches and reporting updates.

---

### Story 6 — Custom framework

**Context:** Factor–IT used custom PHP backend framework.  
**Task:** improve development speed, readability and validation.  
**Action:** contributed migration tooling, database layer, validation, routing features using Data Mapper ideas.  
**Result:** code became shorter, more readable, less error-prone.

---

## 11. Риски для немецкого рынка

### Риск 1 — German-speaking roles

**Risk:** high if German C1/fluent required.  
**Action:** skip most German-only roles unless company explicitly accepts English-speaking engineers.

### Риск 2 — English speaking

**Risk:** medium.  
**Reason:** English used professionally, but speaking is weaker than reading/writing.  
**Action:** prepare technical interview stories in English; train concise explanations.

### Риск 3 — 7+ years experience vs communication level

**Risk:** if applying as Senior, company may expect senior-level verbal communication.  
**Action:** target Mid/Middle+ primarily; Senior only when strong stack/domain match.

### Риск 4 — remote-only perception

**Risk:** remote-only narrows German market.  
**Action:** write “remote preferred, open to hybrid/office in Cologne”.

### Риск 5 — Python/FastAPI/AI overclaiming

**Risk:** no commercial production experience.  
**Action:** present as personal projects / nice-to-have, not as primary commercial stack.

### Риск 6 — PHP past experience

**Risk:** recruiters may push PHP-only roles.  
**Action:** keep PHP as past backend foundation, not headline.

---

## 12. Пробелы и задачи

### Каких фактов не хватает

EPAM:
- exact CommerceTools API limit/rate-limit details if needed for interview; current wording should stay cautious
- exact Cosmos DB container name / schema / retention logic for ProductsUp change records [needs evidence]
- exact cache TTL/invalidation strategy
- Redis latency improvement
- exact Azure messaging term: Service Bus subscriptions?
- exact Amplience cache/alerting implementation details
- whether Durable Functions used timers/fan-out/fan-in/compensation patterns

Factor–IT:
- exact number of users
- exact number of organization-specific databases
- examples of SQL performance improvements
- migration validation examples
- whether backups/dry-runs were standard process
- exact reporting registers/fields if remembered
- examples of custom framework features with before/after impact

Personal projects:
- Credly URL/ID for the Google Cloud ADK badge (not provided)
- live state of row-level security in Cards (not verified; not claimed)
- owner authorization in every server action of Home Budget (not fully traced; not claimed)
- verify AI Bootcamp RAG Service implementation (P1) before any CV use
- details and scope of small independent paid tasks

Language:
- prepare English self-introduction
- prepare EPAM stories in English
- prepare Factor–IT stories in English
- prepare answer about German level
- prepare answer about work authorization

### Что нужно добавить в LinkedIn

- headline focused on Backend-focused TypeScript Developer
- Cologne + authorized to work in Germany
- Node.js/TypeScript/Azure/e-commerce integrations
- Selected projects: Dark Factory, B1 Kompass, Home Budget, Cards (by audience); JobFlow in the current Experience entry
- English/German levels honestly
- Open to remote/hybrid Cologne

### Что нужно подготовить для интервью

English scripts:
- Tell me about yourself
- EPAM project overview
- ProductsUp sync story
- Amplience automation story
- Production incident story
- Factor–IT migration story
- Why Germany / why Cologne
- Why remote/hybrid
- Language level explanation
- Why Python/FastAPI/AI is additional, not primary

---

## 13. Стратегия применения

### Best-fit roles

- Backend Developer Node.js/TypeScript
- Backend-focused Fullstack Developer
- Fullstack TypeScript Developer
- Software Engineer — e-commerce/retail
- Backend Engineer — integrations/API/cloud
- Backend Developer with Azure/serverless
- Backend Developer with SQL/PostgreSQL plus
- Software Engineer with AI integrations as nice-to-have

### Must-have in vacancy

- English-speaking or English-friendly team
- Node.js/TypeScript or strong backend match
- remote or Cologne/hybrid
- reasonable onboarding
- role not requiring fluent German
- backend/API/integration work

### Nice-to-have

- Azure
- serverless
- e-commerce/retail
- product catalog
- CommerceTools or similar
- React/Next.js as secondary
- PostgreSQL
- AI/OpenAI integration

### Wishlist

- remote-first
- international team
- product company
- stable company
- growth path
- good onboarding
- salary aligned with Mid German market

### Apply / maybe / skip rules

**Apply:**
- Node.js/TypeScript backend/fullstack
- English-speaking team
- remote or Cologne
- backend/API/cloud/integrations
- German not required or A2/B1 acceptable

**Maybe:**
- Python/FastAPI as secondary stack
- German B1/B2 preferred but not mandatory
- hybrid/office Cologne with English-friendly team
- consultancy if client communication not German-heavy

**Skip:**
- German C1/fluent required
- pure frontend
- PHP-only
- DevOps-only
- QA/support
- customer-facing German-speaking technical role
- Senior Python role requiring commercial Python production experience
- pure AI/ML Engineer requiring ML/MLOps/model training
