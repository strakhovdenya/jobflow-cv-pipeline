# Master Profile Summary RU

## v0.8 — portfolio refresh (2026-11-24)

Это активная версия profile summary. Она заменяет v0.7 целиком, а не дополняет её: прежние слои «Update v0.x» и устаревшие рекомендации удалены из тела файла, история осталась в файлах v0.7 и старше.

- **Источники:** коммерческие факты — без изменений с v0.7. Проектные факты — блок `portfolio-registry` активного `project_inventory` и активный `career_cases`; навыки — активный `tech_stack`; обучение — блок `credential-registry` активного `certifications`.
- **Пять основных портфолио-проектов:** Dark Factory, JobFlow CV Pipeline, Cards, B1 Kompass, Home Budget. В CV допускается только проект с `cvEligible: true` в `portfolio-registry`; архивные проекты и проекты без проверенной реализации в CV не используются ни в каком разделе.
- **Dark Factory** — отдельный npm-пакет в собственном репозитории, а не часть репозитория JobFlow. JobFlow, Cards и B1 Kompass — его consumer-репозитории.
- **Python/FastAPI** — только обучение (Udemy course), проверенного Python-проекта нет.
- Коммерческое позиционирование (Node.js/TypeScript/Azure, EPAM; PostgreSQL foundation, Factor–IT) не меняется. Портфолио и обучение идут после него и никогда не формулируются как commercial или production experience.

---

## 1. Summary variants (English, for CVs)

Три варианта Summary. Каждый — 60–90 слов. Первое предложение всегда о коммерческом опыте (EPAM, Node.js/TypeScript, Azure или React/Next.js); портфолио и обучение идут после него. Факты в вариантах проверены по активным источникам; при адаптации к вакансии факты можно сужать и переставлять внутри своего предложения, но не добавлять новые.

### Variant A — General Backend / Software Engineer

For Node.js/TypeScript, NestJS, Azure/serverless, production backend and database/financial backend vacancies.

```text
Backend-focused TypeScript developer based in Cologne, Germany, with commercial Node.js/TypeScript experience at EPAM building Azure Functions and Durable Functions workflows for a large-scale e-commerce platform. Integrated CommerceTools, Amplience and ProductsUp, wrote Jest unit tests and investigated production issues with Application Insights and KQL. Earlier financial accounting work built a strong PostgreSQL foundation in complex SQL, data migrations and query optimization. Since May 2025 has continued hands-on development through small independent tasks and personal projects, including a NestJS/PostgreSQL application with REST APIs, background jobs and CI.
```

85 words. Опора: EPAM (кейсы ProductsUp, Amplience, CommerceTools, incident), Factor–IT, JobFlow.

### Variant B — Backend-focused Full-stack

For React/Next.js, TypeScript full-stack and backend-focused full-stack vacancies.

```text
Backend-focused full-stack developer based in Cologne, Germany, with commercial Node.js/TypeScript backend experience and production React/Next.js contributions at EPAM on a large-scale e-commerce platform, including BFF/GraphQL changes and Azure Functions integrations. Brings an earlier PostgreSQL foundation from financial accounting systems. Continues full-stack work in personal projects: a publicly available Next.js and Supabase exam-practice app with Playwright end-to-end tests in CI, and a NestJS/PostgreSQL backend with a Next.js review dashboard.
```

68 words. Опора: EPAM React/Next.js/BFF, Factor–IT, B1 Kompass (exam-practice app), JobFlow (dashboard). Если B1 Kompass не выбран в Selected Projects, вторую половину последнего предложения можно сузить до JobFlow.

### Variant C — AI-assisted Engineering / Developer Productivity (AI-friendly Backend)

For vacancies about AI-assisted software engineering, coding agents, developer productivity or tooling, AI/LLM integration, agent workflows, or where AI is a core requirement.

```text
Backend-focused TypeScript developer based in Cologne, Germany, with commercial Node.js and Azure serverless experience at EPAM on large-scale e-commerce integrations and an earlier PostgreSQL foundation. In personal projects, develops software with Claude Code and OpenAI Codex: built Dark Factory, a reusable Node.js package that runs a sandboxed Claude Code agent from scoped GitHub Issues to pull requests, checked by an independent Codex-based verifier before a human merge. Integrated the OpenAI API into a personal NestJS backend with background jobs and human review gates. Holds a Google Cloud ADK skill badge.
```

90 words. Опора: EPAM, Factor–IT, Dark Factory (кейс P1), JobFlow AI integration, credential `gc-adk-engineer-ai-agents`. Вариант на верхней границе: при адаптации что-то добавляешь — что-то убираешь. Для вакансии про AI/LLM integration без coding agents и AI tooling порядок тот же, но предложение о Dark Factory сужается до «develops software with Claude Code and OpenAI Codex», а освободившиеся слова получает предложение об интеграции OpenAI API (LLM call policy, валидация ответа модели).

### Variant selection by vacancy

Вариант выбирается по семейству вакансии из анализа Prompt 1 (`roleFamilies` registry) и по тому, насколько вакансия весит AI.

| Vacancy | Variant |
|---|---|
| Backend Node.js/TypeScript, NestJS, Software Engineer with backend/API focus | A |
| Azure / serverless / production backend, e-commerce integrations | A |
| Database / SQL-heavy / financial backend | A |
| Python/FastAPI as a secondary plus | A |
| React/Next.js full-stack, backend-focused full-stack, full-stack TypeScript | B |
| AI-assisted software engineering, coding agents, developer productivity or tooling | C |
| AI/LLM integration or agent workflows as a main requirement | C |
| AI only as a plus (nice-to-have, «you use AI tools in daily work») | A or B + AI clause (below) |

**AI as a plus.** Variant A or B gets one short clause about practical AI-assisted development; the total stays within 60–90 words, so one less relevant detail goes out. Example for A (80 words):

```text
Backend-focused TypeScript developer based in Cologne, Germany, with commercial Node.js/TypeScript experience at EPAM building Azure Functions and Durable Functions workflows for a large-scale e-commerce platform. Integrated CommerceTools, Amplience and ProductsUp and investigated production issues with Application Insights and KQL. Earlier financial accounting work built a strong PostgreSQL foundation in complex SQL, data migrations and query optimization. Develops software with Claude Code and OpenAI Codex under human review in personal projects, including a NestJS/PostgreSQL application with REST APIs and background jobs.
```

For B append: `Develops software with Claude Code and OpenAI Codex under human review.` (79 words in total).

**AI not mentioned in the vacancy.** Variant A or B without an AI clause. JobFlow stays in Current Independent Work, where its OpenAI integration is part of what the application does.

### AI evidence order

Порядок AI-доказательств в Summary и во всём CV — от сильного к поддерживающему:

1. Коммерческий инженерный фундамент: EPAM (Node.js/TypeScript, Azure serverless, интеграции, production debugging) и Factor–IT (PostgreSQL). Он всегда первый.
2. Практическая AI-assisted разработка (AI-категория A): Claude Code и OpenAI Codex как практические инструменты разработки, подтверждённые Dark Factory (Claude Code hooks/skills/agents, Ralph, Codex acceptance verifier), JobFlow (разработан с Claude Code) и Home Budget (Codex-native workflow).
3. Реализованная AI-интеграция и агентные workflow (AI-категория B): JobFlow (OpenAI API за provider abstraction, валидация ответа модели, LLM call policy, BullMQ/Redis jobs, human review gates) и оркестрация агента в Dark Factory.
4. Обучение (AI-категория C): Google Cloud skill badge «Engineer AI Agents with Agent Development Kit (ADK)», labs, курсы Anthropic (Claude Code 101, MCP).

Обучение (4) не подменяет реализацию (2, 3) и идёт после неё. Исключение одно: вакансия прямо требует ADK или Google agent tooling. Тогда предложение о бейдже может встать сразу после коммерческого предложения и назвать темы labs (agent tools, multi-agent systems, deployment to Agent Runtime) — но только как обучение: без production- и commercial-опыта с ADK, без «certified».

### Rules for every variant

- Стоп-лист Summary и headline (клише и внутренние термины доказательств) — в активном `cv_rules`, раздел «Summary rules». Ни один вариант его не нарушает.
- Summary не перечисляет все пять проектов и не называет архивные проекты. Портфолио-факт попадает в Summary, только если он покрывает требование вакансии, которое коммерческий опыт не покрывает или покрывает слабее.
- Summary называет факт одной короткой фразой; раздел с доказательством (JobFlow bullet, запись Selected Projects) раскрывает механизм и не повторяет формулировку Summary.

Do not claim:

- commercial or production AI experience
- model training or fine-tuning
- ML engineering or MLOps
- the job title AI Engineer or LLM Platform Engineer
- external users or team adoption of personal projects
- productivity or speed-up figures
- enabled auto-merge
- production deployment of AI agents

---

## 1a. One-line positioning

### 1. Main backend positioning

Backend-focused TypeScript Developer with commercial Node.js, Azure serverless, REST/API integrations, production debugging and strong PostgreSQL foundation.

### 2. Backend-focused fullstack positioning

Backend-focused Fullstack Developer with Node.js/TypeScript backend experience and production React/Next.js contribution in large-scale e-commerce.

### 3. AI-friendly backend positioning

Backend-focused TypeScript Developer with commercial Node.js/Azure experience and hands-on AI-assisted development with Claude Code and OpenAI Codex in personal projects.

---

## 1b. Current Independent Work & Portfolio Projects (May 2025 – Present)

- Публичная рамка периода после EPAM — **Current Independent Work & Portfolio Projects, May 2025 – Present, Cologne, Germany**. Прежняя рамка `Career Break — Relocation, May 2025 – Feb 2026` не используется.
- Блок обязателен в каждом внешнем CV/PDF/HTML: он закрывает post-EPAM gap, но не заменяет EPAM как главное коммерческое доказательство.
- Состав блока (точные формулировки — в активном `cv_rules`): stable intro → bullet о небольших независимых Node.js/React задачах → JobFlow (`placement: current_work_block`, не дублируется в Selected Projects) → один конкретный факт, выбранный по вакансии → volunteering по рынку.
- Small freelance tasks — только как `small Node.js/React improvements on an independent basis`; клиенты, объём и оплата [needs evidence].
- Volunteering at HEY, ALTER! Köln e.V. — отдельный market-dependent сигнал локальной интеграции, не доказательство разработки. Germany / remote EU — обычно включать; Ukraine / Ukrainian-market — по ситуации.
- LinkedIn Experience title: **Freelance Software Developer | Backend Portfolio Projects & Relocation**, `Self-employed`; не LinkedIn `Career Break`.

---

## 1c. Stable decisions carried over

- Внешнее имя — **Denys Strakhov**.
- ProductsUp changed records source — **Cosmos DB container / Cosmos DB change records** (confirmed).
- Языки: `English B1/B1+, used professionally`; `German A2/B1, actively improving`.
- Сертификаты в CV: 3–5 по релевантности, только `cvEligible` записи `credential-registry` (правило — в активном `cv_rules`).
- Profile linkedIn MD — не источник истины; полезные факты синхронизируются в master sources.

---

## 2. Краткий профиль на русском

Denys Strakhov — backend-focused TypeScript developer, находится в Cologne / Köln, Germany.  
Основной современный commercial stack: Node.js, TypeScript, Azure Functions, Azure Durable Functions, REST/API integrations, e-commerce integrations, Jest, Azure Application Insights/KQL.  
Основной production experience — EPAM Systems, large-scale multi-locale e-commerce platform for a major European retailer, 18+ locales, Nov 2021 – May 2025.  
Сильный backend foundation из Factor–IT: PostgreSQL-heavy financial/accounting production system, complex SQL, migrations, data integrity, business logic, legacy backend.  
React/Next.js есть как commercial production contribution, но позиционирование должно оставаться backend-focused.  
Целевой рынок: Germany, Cologne / remote EU; роли: Software Engineer, Backend Developer, Backend-focused Fullstack Developer.  
Ограничения: English-speaking или English-friendly команда; German A2/B1 — риск для German-speaking roles; remote preferred, hybrid/office in Cologne possible.

---

## 3. Target roles

### Prioritize / основной фокус

**Backend Developer Node.js/TypeScript.**  
Лучшее совпадение с текущим commercial stack: Node.js, TypeScript, Azure Functions, Durable Functions, REST APIs, integrations, production debugging, Jest.

**Software Engineer with backend/API/cloud focus.**  
Подходит, если роль включает backend services, API integrations, cloud/serverless, production support, data processing, e-commerce или SQL.

**Backend-focused Fullstack Developer.**  
Подходит, если backend остаётся значимой частью роли, а React/Next.js используется как дополнительное преимущество.

**E-commerce / integration-heavy Backend Engineer.**  
Сильное совпадение за счёт Amplience, CommerceTools, ProductsUp, product catalog flows, product data sync, multi-locale e-commerce.

**Azure/serverless Backend Developer.**  
Подходит для ролей с Azure Functions, Durable Functions, serverless workflows, Application Insights, Blob Storage, Cosmos DB.

**SQL/PostgreSQL-focused Backend Developer.**  
Подходит как дополнительный сильный вектор благодаря Factor–IT: financial data, migrations, complex SQL, data integrity.

### Maybe / дополнительное направление

**Backend Developer with AI integrations as nice-to-have.**  
Можно рассматривать, если AI/LLM — плюс, а не основной commercial must-have. Опора: JobFlow (OpenAI API integration) и Claude Code / OpenAI Codex в личных проектах; Summary A или B с AI-фразой.

**AI-assisted engineering / developer productivity / internal tooling roles with a backend core.**  
Можно рассматривать, если роль не требует commercial AI/ML production. Опора: Dark Factory, JobFlow, коммерческий Node.js; Summary C.

**Python/FastAPI Backend Developer.**  
Только как дополнительное направление: Python/FastAPI подтверждены только обучением (FastAPI course), проверенного Python-проекта нет. Не для ролей с обязательным commercial Python.

**Fullstack TypeScript Developer.**  
Можно рассматривать, если не pure frontend и есть backend/API ownership.

**Consulting / agency roles.**  
Можно, если команда English-friendly и нет heavy German-speaking client communication.

**Senior-leaning roles.**  
Только при сильном совпадении по Node.js/TypeScript/Azure/e-commerce/integrations и реалистичных expectations по коммуникации.

### Avoid / не тратить ресурс

**German C1/fluent required roles.**  
Высокий риск из-за текущего German A2/B1.

**PHP-only roles.**  
PHP — сильный past backend foundation, но не current target stack.

**DevOps-only / Kubernetes-heavy roles.**  
Terraform/Azure DevOps есть как collaboration/support, Kubernetes — only basic/training exposure.

**Pure Frontend Developer.**  
React/Next.js есть, но профиль не frontend-first.

**Pure AI/ML Engineer / MLOps / model training roles.**  
AI-assisted engineering и LLM-интеграция — personal/portfolio experience, ADK и курсы — обучение; не commercial AI/ML production, обучения моделей нет.

**QA, support, low-code, WordPress.**  
Не соответствуют целевому Software Engineer / Backend Developer позиционированию.

---

## 4. Core commercial profile

| Area | Evidence | How to use in CV |
| ---- | -------- | ---------------- |
| Node.js / TypeScript | EPAM production e-commerce platform; Azure Functions, Durable Functions, BFF/API, integrations, backend workflows | Core headline and summary skill: commercial Node.js/TypeScript backend experience |
| Azure Functions / Durable Functions | Azure Functions with HTTP/timer/queue/topic/subscription triggers; Durable Functions orchestrators, Activity Functions, sub-orchestrations, retries, idempotency in ProductsUp sync | Use for serverless/backend/cloud roles; do not claim Azure architect ownership |
| REST APIs / API integrations | Amplience, CommerceTools, ProductsUp; Factor–IT JsonRPC/API background | Use as integration-heavy backend evidence; phrase as implementation/technical contribution, not full platform ownership |
| E-commerce integrations | EPAM large-scale e-commerce; Amplience CMS, CommerceTools product catalog, ProductsUp sync | Strong Germany-relevant angle for retail/e-commerce/backend integration roles |
| Production debugging / observability | Azure Application Insights, KQL, logs by operation/order IDs, customer email notification incident, alerts/logging improvements | Use for production support, reliability, observability and incident investigation bullets |
| Testing / Jest / SonarQube | Backend unit tests with Jest; mocks; SonarQube quality gate around 80% for new changes | Use as quality/process evidence; do not claim integration/e2e testing ownership |
| PostgreSQL / SQL foundation | Factor–IT production financial/accounting system; complex SQL, migrations, indexes, transactions, data integrity | Use as strong backend foundation, especially for SQL/data-heavy roles; note commercial last used Jun 2021 |
| Backend-focused fullstack React/Next.js contribution | EPAM last ~2 years; production React/Next.js features, PDP changes, related products, slider, SSR/components/pages, GraphQL/BFF changes | Use only for backend-focused fullstack roles; avoid pure frontend positioning |

---

## 5. Strongest technical areas

### Strong commercial production

| Technology / area | Safe level | Where used | Safe CV wording | Interview risk |
| ----------------- | ---------- | ---------- | --------------- | -------------- |
| Node.js | Strong commercial production | EPAM e-commerce platform; backend services, integrations, serverless workflows | Commercial Node.js experience building production serverless backend workflows, integrations and data-processing flows | Low-medium: prepare system design/API ownership boundaries |
| TypeScript | Strong commercial production | EPAM backend, BFF/API, React/Next.js contribution | Commercial TypeScript experience across backend services, serverless workflows, BFF/API layers and fullstack features | Low: refresh advanced TypeScript edge cases |
| Azure Functions | Strong commercial production | EPAM; HTTP, timer, queue/topic/subscription triggered functions | Built and maintained production Azure Functions for backend workflows and integrations | Low-medium: exact messaging term still [needs evidence] |
| Azure Durable Functions | Strong commercial production | ProductsUp long-running sync | Built and maintained long-running backend workflows with orchestrators, Activity Functions, sub-orchestrations, retries and idempotency patterns | Medium: fan-out/fan-in, timers, compensation [needs evidence] |
| REST/API integrations | Strong commercial production | Amplience, CommerceTools, ProductsUp; Factor–IT API background | Implemented production API integrations and backend workflows with external platforms | Medium: avoid claiming full API architecture ownership |
| Jest backend unit testing | Strong commercial backend testing | EPAM backend functions/features | Wrote and maintained function-level unit tests with Jest and mocked external dependencies | Low-medium: integration/e2e ownership not confirmed |
| Azure Application Insights / KQL / production debugging | Strong commercial production | EPAM production debugging, customer notification incident | Investigated production issues with Application Insights and KQL, tracing failures across Azure Functions and services | Low-medium: dashboard/workbook ownership [needs evidence] |
| PostgreSQL / SQL | Strong commercial production foundation | Factor–IT financial/accounting system | Strong PostgreSQL background from production financial systems, including complex SQL, migrations, transactions and performance optimization | Low-medium: commercial last used Jun 2021; refresh modern PostgreSQL topics |

### Working commercial

| Technology / area | Safe level | Where used | Safe CV wording | Interview risk |
| ----------------- | ---------- | ---------- | --------------- | -------------- |
| Cosmos DB | Commercial production experience | EPAM backend flows | Used Cosmos DB in production backend flows for item-level read/query/insert/update operations | Medium: RU/throughput/partition strategy needs refresh |
| Azure Blob Storage | Commercial working-to-strong | ProductsUp intermediate/final files | Used Azure Blob Storage for intermediate and final files in backend data-processing workflows | Low-medium |
| Azure Key Vault / env / secrets | Commercial working | EPAM configuration/secrets collaboration | Worked with environment configuration and secrets in Azure-based backend services, collaborating with DevOps | Medium: not a security specialist |
| Redis | Commercial working | Amplience API responses, navigation data, TTL/cache invalidation | Used and extended Redis-based caching for selected API responses and navigation data | Medium: do not claim cache architecture ownership; 2–4x metric needs measurement evidence |
| React | Commercial working fullstack | EPAM production frontend tasks | Contributed to production React features as a backend-focused fullstack developer | Medium: not frontend-first |
| Next.js | Commercial working fullstack | EPAM SSR/pages/components | Worked with Next.js production pages/components and SSR-related work as part of fullstack delivery | Medium: Pages/App Router [needs evidence] |
| GraphQL / BFF | Commercial working | EPAM BFF/frontend boundary | Worked with Node.js/TypeScript BFF layers and GraphQL query/mutation changes | Medium-high: schema/resolver ownership [needs evidence] |
| Terraform | Commercial working | EPAM resource/config changes, Cosmos/subscriptions, plan/apply checks | Supported Terraform-based infrastructure changes with DevOps collaboration | Medium: not DevOps ownership |
| Azure DevOps / CI/CD | Commercial working | EPAM releases, redeploys, post-release checks | Participated in Azure DevOps-based CI/CD and release processes | Medium: exact pipeline step changes [needs evidence] |
| SonarQube | Commercial working | EPAM quality gates | Worked within SonarQube quality gates for new changes | Low-medium |
| CommerceTools | Commercial working-to-strong integration | EPAM product catalog retrieval/enrichment | Integrated CommerceTools product data into backend/BFF/product-information flows | Medium: no platform architecture ownership |
| Amplience | Commercial working-to-strong integration | EPAM CMS automation/webhooks/mass updates | Automated selected Amplience CMS workflows using webhook-based Azure Functions | Medium: exact cache/alerting details [needs evidence] |
| ProductsUp Stream API | Commercial strong flow experience | EPAM ProductsUp product data sync with confirmed Cosmos DB change records | Built the initial implementation and later supported its maintenance with the team on a ProductsUp synchronization flow | Medium: strong flow evidence; container/schema/retention details still need preparation |

### Strong past backend foundation

| Technology / area | Safe level | Where used | Safe CV wording | Interview risk |
| ----------------- | ---------- | ---------- | --------------- | -------------- |
| PHP 7.x | Strong past commercial, not target stack | Factor–IT | Earlier backend experience with PHP 7.x in production financial systems | Medium: can attract PHP-only roles; do not put in headline |
| Data migrations | Strong commercial production | Factor–IT PostgreSQL migrations | Planned and executed PostgreSQL migrations with transactions, validation on test databases and rollback planning where possible | Low-medium: exact backup/dry-run process [needs evidence] |
| SQL performance optimization | Strong commercial production | Factor–IT | Optimized PostgreSQL queries using indexes, query simplification and intermediate tables | Medium: external metrics should be cautious |
| Custom backend framework / Data Mapper ideas | Strong past backend architecture contribution | Factor–IT custom PHP framework | Contributed to a custom backend framework improving migrations, DB access, validation, permissions and routing | Medium: prepare concrete before/after examples |
| Legacy backend maintenance | Strong past commercial | Factor–IT | Maintained and extended legacy backend systems while improving reliability, readability and data integrity | Low |

### Personal / portfolio only

Только проекты из `portfolio-registry` с `cvEligible: true`. Полная классификация (commercial / personal / training) — в активном `tech_stack`.

| Technology / area | Safe level | Where used | Safe CV wording | Interview risk |
| ----------------- | ---------- | ---------- | --------------- | -------------- |
| NestJS / Prisma / Swagger | Personal, current | JobFlow CV Pipeline | Built a personal NestJS/TypeScript backend with PostgreSQL/Prisma and Swagger/OpenAPI documentation | Medium: not commercial NestJS |
| OpenAI API, LLM call policy, BullMQ/Redis jobs | Personal (AI category B) | JobFlow CV Pipeline | Integrated the OpenAI API behind a provider abstraction, with background jobs, typed failure handling and human review gates | Medium: not commercial AI |
| Claude Code, OpenAI Codex | Personal (AI category A) | Dark Factory, JobFlow, Cards, B1 Kompass (Claude Code); Home Budget, Dark Factory verifier (Codex) | Develops software with Claude Code and OpenAI Codex under human review | Medium: no productivity figures, no team adoption |
| Agent orchestration, acceptance verification | Personal (AI category B) | Dark Factory | Sandboxed Claude Code agent with least-privilege Git rights; Codex-based acceptance verifier whose verdict is computed by code | Medium: never «no Git access», never auto-merge |
| Next.js / React personal stack (Supabase, Drizzle ORM, Auth.js, next-intl, MUI) | Personal | B1 Kompass, Cards, Home Budget | In the project's own bullet and `tech_stack` only | Medium: not commercial |
| Vitest / Playwright | Personal | B1 Kompass, Home Budget, Cards | Playwright end-to-end tests in CI (B1 Kompass) | Medium-low |
| GitHub Actions | Personal working | all five projects | Configured GitHub Actions pipelines for personal projects | Medium: not commercial CI/CD ownership |
| Docker | Personal + local development | JobFlow (Docker Compose), Dark Factory (agent sandbox); EPAM local dev | Used Docker for local infrastructure and an agent sandbox in personal projects | Medium: not commercial production ownership |

### Training only

| Technology / area | Evidence | Safe CV use |
| ----------------- | -------- | ----------- |
| Python / FastAPI | FastAPI - The Complete Course 2026 (Beginner + Advanced), Udemy | Certifications or the Python training bullet of Current Independent Work; never project or commercial experience |
| Google ADK, agent tools, multi-agent systems, Agent Runtime | Google Cloud skill badge + labs (AI category C) | Badge in Certifications; labs only in the training bullet |
| MCP | Anthropic courses | Certifications for AI-tooling vacancies |

### Basic / exposure only

| Technology / area | Safe level | Where used | Safe CV wording | Interview risk |
| ----------------- | ---------- | ---------- | --------------- | -------------- |
| Kubernetes | Basic/training exposure | CHI/training | Basic Kubernetes exposure | Very high: usually omit |
| Express | Training/internship exposure | CHI Software | Worked with Express during a Node.js internship | Medium-high: not EPAM production stack |
| MongoDB | Internship/training exposure | CHI Software | Introductory MongoDB exposure | High: usually omit |

NestJS: CHI internship exposure (2021) is superseded by current personal work in JobFlow (table above); still not commercial. RAG / vector-search stacks and Python ORM/testing tools have no verified active project and are not used in a CV.

---

## 6. Strongest career cases / evidence

| Case | Why it matters for Germany | Best use |
| ---- | -------------------------- | -------- |
| EPAM large-scale multi-locale e-commerce platform | Main proof of modern commercial production experience: Node.js/TypeScript, Azure serverless, e-commerce, integrations, 18+ locales, team delivery, releases and support | CV bullet / LinkedIn / interview story |
| ProductsUp product data sync | Strong backend/cloud/integration case: Durable Functions, long-running workflow, CommerceTools enrichment, Blob Storage, Stream API, retries, idempotency, production relevance | CV bullet / interview story / recruiter message |
| Amplience automation / webhooks / mass updates | Shows automation of manual business processes, webhook handling, validation, logging, retries, cache updates and multi-locale content operations | CV bullet / cover letter / interview story |
| CommerceTools product data retrieval | Strong e-commerce/API/data integration evidence: product catalog source of truth, 50+ attributes, filters/groups/IDs, empty values, pagination where supported, batching where needed | CV bullet / interview story |
| Customer email notification incident | Shows production debugging, observability, multi-service tracing and business-critical thinking | Interview story / CV bullet if vacancy values production support |
| High-risk PostgreSQL account migration | Strong SQL/data integrity/backend maturity case from financial systems: migrations across related tables, validation, test DB copies, rollback planning where possible | Interview story / CV bullet for SQL-heavy roles |
| JobFlow CV Pipeline (personal) | Current hands-on NestJS/TypeScript/PostgreSQL backend after EPAM; OpenAI integration with background jobs and human review gates; not commercial production | Current Independent Work bullet / interview story |
| Dark Factory (personal) | Strongest verifiable proof of practical AI-assisted engineering: sandboxed Claude Code agent, Codex-based acceptance verifier, reuse in three personal repositories; not commercial | Selected Projects for AI-assisted / developer-productivity vacancies / interview story |
| B1 Kompass, Home Budget (personal) | Full-stack Next.js/PostgreSQL work (B1 Kompass) and money-handling business logic with integration tests (Home Budget); not commercial | Selected Projects when a vacancy requirement stays uncovered by commercial experience |

---

## 7. Strongest business / engineering arguments

| Argument | Evidence from files | Safe English wording |
| -------- | ------------------- | -------------------- |
| Production backend experience | EPAM production e-commerce platform; Factor–IT production financial/accounting system | Commercial backend experience in production systems, including e-commerce and financial/accounting domains. |
| Integration-heavy e-commerce | Amplience, CommerceTools, ProductsUp, product catalog/content/product sync flows | Built and maintained integration-heavy backend workflows for a large multi-locale e-commerce platform. |
| Azure serverless | Azure Functions, Durable Functions, Blob Storage, Cosmos DB, Application Insights | Worked with Azure serverless backend components, including Azure Functions, Durable Functions and Application Insights. |
| Long-running workflows | ProductsUp sync; Durable Functions; 20,000–40,000 products; 2+ hours; Blob intermediate files; retries/idempotency | Built and maintained long-running product synchronization workflows with retries, idempotency and per-locale result logging. |
| Observability/debugging | Customer notification incident; Application Insights; KQL; operation/order IDs; added logs/alerts | Investigated production issues using Application Insights and KQL, improving logs and alerting for business-critical flows. |
| Data integrity / PostgreSQL migrations | Factor–IT high-risk account splitting migration; financial data; 3–10 tables; validation; test DB copies | Implemented high-risk PostgreSQL migrations for financial data with validation and rollback planning where possible. |
| Cross-team communication | EPAM cross-functional teams, QA/BA/PM/PO/DevOps, service contracts, debugging across ownership boundaries | Collaborated with QA, BA, Product Owners, DevOps and other service teams to deliver and support backend features. |
| Backend-focused fullstack flexibility | Last ~2 years EPAM React/Next.js/BFF/GraphQL contribution while backend remained core | Contributed across backend, BFF and React/Next.js frontend as a backend-focused fullstack developer. |

---

## 8. German market positioning

### 1. Что делает профиль сильным для Германии

- Реальный commercial backend experience since 2016.
- Современный Node.js/TypeScript production focus since 2021.
- Azure serverless, Durable Functions, production debugging and integration-heavy backend experience.
- E-commerce/retail domain experience, relevant for Germany and EU.
- Strong PostgreSQL/data integrity background from financial/accounting systems.
- Experience with code review, releases, QA/BA/PO/DevOps communication, cross-team debugging.
- Cologne-based candidate with work authorization in Germany.

### 2. Что может быть непонятно немецкому работодателю

- EPAM title “Backend-focused Fullstack Developer” может восприниматься слишком широко; нужно объяснять backend-first contribution.
- PHP experience может затмить текущий Node.js/TypeScript focus, если неправильно структурировать CV.
- Личные AI-проекты и обучение могут создать ложное ожидание commercial AI production, если не отделены от коммерческого опыта.
- Factor–IT public-sector accounting system может быть непонятен без краткого business context.
- Remote preference может восприниматься как unwillingness to integrate, если не указать openness to Cologne hybrid/office.

### 3. Какие риски есть из-за языка

- German A2/B1 недостаточен для German-only teams, customer-facing consulting и ролей с документацией/воркшопами на немецком.
- English B1/B1+ может быть риском для Senior roles, где ждут очень уверенную коммуникацию.
- Нужно готовить English interview stories заранее: EPAM overview, ProductsUp, Amplience, incident, PostgreSQL migration.

### 4. Какие риски есть из-за remote preference

- Remote-only сужает немецкий рынок.
- Безопасная формулировка: remote preferred, open to hybrid or office in Cologne.
- Для Cologne roles стоит подчёркивать local availability and integration.

### 5. Как формулировать work authorization

**Safe wording:**  
Authorized to work in Germany.

**Optional detailed wording if needed:**  
Authorized to work in Germany; residence permit under §24 AufenthG.

Не нужно перегружать CV юридическими деталями, если вакансия не просит.

### 6. Как формулировать German level

**Safe wording:**  
German: A2/B1, basic everyday communication; completed integration course, actively improving.

Не писать “professional working German”.

### 7. Как формулировать English level

**Safe wording:**  
English: B1/B1+, used professionally for Jira, documentation, daily meetings, retrospectives, written communication and short Product Owner calls.

Не писать “fluent English”.

### 8. Как не выглядеть PHP-only developer

- Headline: Node.js / TypeScript / Azure Functions / REST APIs / PostgreSQL / E-commerce Integrations.
- PHP держать в Factor–IT experience как earlier backend foundation.
- Не ставить PHP в top skills для основного CV.
- Описывать Factor–IT через SQL, data integrity, migrations, business logic, production maturity.

### 9. Как не выглядеть pure AI/Python developer

- Первое предложение Summary — всегда коммерческий опыт (раздел 1); AI идёт после него и только в объёме, который просит вакансия.
- AI-доказательства — в Current Independent Work (JobFlow), Selected Projects (Dark Factory) и отдельной skills-группе с пометкой personal projects; обучение — в Certifications.
- Headline всегда коммерческий; AI в headline не выносить.
- Python/FastAPI — только обучение; не выдавать за проектный или коммерческий опыт.
- Не использовать ML/MLOps/model training wording.

### 10. Как показать local German integration через Köln / HEY, ALTER!, но не переоценивать

- Добавить небольшой Volunteering section.
- Позиционировать как local engagement, practical IT, social contribution.
- Не использовать как developer proof.
- Safe wording: Volunteer IT Technician helping refurbish donated laptops for school students in Cologne.

---

## 9. Weak areas / risks / needs evidence

| Area | Risk | What to do |
| ---- | ---- | ---------- |
| German-speaking roles | German A2/B1 too low for German-only or customer-facing roles | Skip German C1/fluent roles; apply only where English-friendly |
| English speaking confidence | English used professionally, but speaking is weaker than reading/writing | Prepare concise interview scripts and practice technical stories |
| Senior-level communication expectations | Senior roles may expect stronger verbal leadership/communication | Target Mid/Middle+ primarily; Senior only for strong stack/domain match |
| Python/FastAPI gap | No commercial Python/FastAPI experience and no verified Python project; only the FastAPI course | Keep as training only; do not apply to Senior Python roles |
| Kubernetes / DevOps-only roles | Kubernetes only basic/training; Terraform/Azure DevOps not ownership | Omit Kubernetes; position Terraform/CI/CD as collaboration/support |
| PHP past experience risk | Recruiters may push PHP-only roles | Keep PHP out of headline/top skills; use as backend foundation only |
| Missing metrics for EPAM impact | Some impact metrics are approximate or not fully confirmed | Use confirmed metrics only: 18+ locales, 20–40k products, 2+ hours, tens/hundreds MB, hours-to-minutes for selected Amplience operations |
| Exact ProductsUp changed records source | Confirmed Cosmos DB container / Cosmos DB change records | External CV may use “Cosmos DB change records” when relevant; container/schema/retention details still [needs evidence] |
| Exact CommerceTools API limits / batching | General concepts confirmed, exact project-specific limits need refresh | Use cautious wording: pagination where supported, batching where needed, API/page-size constraints |
| Exact Redis performance details | 2–4x improvement internal evidence, measurement source not confirmed | Avoid hard metric in external CV until confirmed |
| Customer notification incident details | affected users, investigation time, exact root cause details incomplete | Use as interview story with [needs evidence] for metrics |
| Personal projects are single-owner | Cards and B1 Kompass are public, Home Budget is private; JobFlow has no public deployment; no confirmed users for any of them | Never claim users, adoption or commercial operation; link only public deployments (Cards, B1 Kompass) |
| AI evidence is personal and training | Claude Code / Codex work and LLM integration are personal projects; ADK is a skill badge with labs | Keep the AI evidence order (section 1); never commercial AI, model training or production agent deployment |
| React/Next.js depth | Commercial contribution exists, but not frontend specialist | Use only for backend-focused fullstack roles |
| GraphQL depth | Query/mutation changes confirmed; schema/resolver/platform ownership [needs evidence] | Phrase as BFF/frontend boundary working experience |
| Azure Service Bus exact term | queue/topic/subscription likely Service Bus but [needs evidence] | Say queue/topic/subscription triggers until confirmed |

---

## 10. CV usage rules

### Always emphasize

- Node.js / TypeScript commercial backend experience.
- Azure Functions and Azure Durable Functions.
- REST APIs and third-party integrations.
- E-commerce product/content/data flows.
- Production debugging with Azure Application Insights / KQL.
- Jest backend unit testing and SonarQube quality gates.
- PostgreSQL / SQL / migrations / data integrity as strong backend foundation.
- Code review, releases, cross-team communication, QA/BA/PO/DevOps collaboration.
- Authorized to work in Germany; Cologne-based.

### Emphasize only for matching vacancies

- React / Next.js for backend-focused fullstack roles.
- CommerceTools / Amplience / ProductsUp for e-commerce/integration roles.
- Terraform / Azure DevOps for cloud/backend roles where DevOps collaboration is expected.
- Redis caching for performance/caching/backend roles.
- PostgreSQL migrations for SQL-heavy/backend/data roles.
- Dark Factory, Claude Code and OpenAI Codex for AI-assisted engineering / developer-productivity roles (Summary C).
- JobFlow OpenAI integration, LLM call policy and background jobs for AI/LLM-integration roles.
- B1 Kompass (then Cards) for React/Next.js full-stack roles; Home Budget for database / financial-logic roles — only when commercial experience leaves the requirement uncovered.
- Google Cloud ADK skill badge for AI-agent vacancies, after the project evidence.

### Mention carefully

- PHP: only as earlier backend foundation, not target stack.
- Python/FastAPI: training only (FastAPI course).
- NestJS: personal (JobFlow), never commercial.
- Docker: local development and personal projects, not commercial production ownership.
- GraphQL: working experience at BFF/frontend boundary.
- Terraform: configuration support, not DevOps ownership.
- Redis performance metric: do not write 2–4x externally unless measurement is confirmed.
- Senior-leaning positioning: only if vacancy strongly matches.

### Usually omit

- Kubernetes from main CV skills.
- MongoDB unless internship line is relevant.
- Express except as CHI internship/training exposure.
- RAG / vector-search stacks and any project without `cvEligible: true` in the registry.
- AI-tooling detail, Dark Factory and the ADK badge for vacancies without an AI mention.
- WordPress, low-code, support-like positioning.
- Pure frontend positioning.
- Pure AI/ML wording: ML Engineer, MLOps, model training.

---

## 11. Main CV keywords

### Main backend CV keywords

Node.js, TypeScript, Backend Development, Software Engineer, REST APIs, API integrations, serverless backend, backend workflows, data processing, business logic, code review, production support, Agile, Scrum, cross-functional team.

### Backend-focused fullstack keywords

Backend-focused Fullstack Developer, React, Next.js, BFF, GraphQL working experience, frontend/backend integration, SSR-related work, production frontend contribution, component changes, PDP changes, API integration.

### E-commerce / integration keywords

E-commerce, retail platform, multi-locale platform, 18+ locales, product catalog, product data sync, content automation, CMS integration, Amplience, CommerceTools, ProductsUp, product enrichment, webhooks, mass updates, product attributes, PDP, listing pages.

### Cloud / Azure keywords

Azure Functions, Azure Durable Functions, Durable Functions orchestrator, Activity Functions, sub-orchestrations, Azure Blob Storage, Cosmos DB, Azure Application Insights, Azure Key Vault, Azure DevOps, serverless workflows, long-running workflows, queue/topic/subscription triggers.

### Testing / quality keywords

Jest, backend unit testing, mocked dependencies, SonarQube quality gates, around 80% coverage gate, Postman, code review, PR review, testable backend logic, CI quality gates.

### Observability / production support keywords

Azure Application Insights, KQL, production debugging, structured logging, operation ID, order ID tracing, incident investigation, alerting support, logs, hotfix participation, post-release checks, root cause analysis.

### SQL / PostgreSQL keywords

PostgreSQL, SQL, complex queries, joins, subqueries, indexes, transactions, locks, migrations, data integrity, financial data, reporting registers, query optimization, test database validation, rollback planning where possible.

### Personal project keywords (label as personal projects)

AI-assisted engineering: Claude Code, OpenAI Codex, coding agents, agent sandbox, least-privilege agent permissions, acceptance verification, GitHub Issues with acceptance criteria, human-controlled merges, developer productivity tooling, Node.js package.

AI integration: OpenAI API, provider abstraction, structured output validation, LLM call policy, BullMQ/Redis background jobs, human review gates.

Personal backend / full-stack: NestJS, Prisma, Swagger/OpenAPI, Docker Compose, GitHub Actions, Next.js, Supabase, Drizzle ORM, Vitest, Playwright, SQL migrations, integer-cent money handling.

Training (Certifications only): Google ADK skill badge, Model Context Protocol, Claude Code 101, FastAPI course.

---

## 12. Recommended CV headlines

Варианты headline и правило выбора — в активном `cv_rules`, раздел 6 (единственный список). Headline всегда коммерческий, включая AI-friendly и AI-assisted вакансии: AI-доказательства идут в Summary, Current Independent Work, Selected Projects и Certifications.

---

## 13. Recommended LinkedIn About angle

**Opening angle:**  
Cologne-based backend-focused TypeScript developer with commercial production experience in Node.js, Azure serverless, REST/API integrations and large-scale e-commerce.

**3 proof points:**
1. EPAM large-scale multi-locale e-commerce platform: Node.js/TypeScript, Azure Functions, Durable Functions, integrations, production support.
2. Strong integration evidence: Amplience automation, CommerceTools product data retrieval, ProductsUp product sync.
3. Strong backend foundation: PostgreSQL-heavy financial/accounting production system, complex SQL, migrations, data integrity.

**Technologies to mention:**  
Node.js, TypeScript, Azure Functions, Durable Functions, REST APIs, PostgreSQL, Cosmos DB, Redis, Jest, Application Insights, React/Next.js as backend-focused fullstack contribution.

**Technologies to avoid or de-emphasize:**  
PHP as current target, Kubernetes, MongoDB, Express, NestJS as commercial stack, pure AI/ML, Python/FastAPI as commercial stack.

**Closing positioning for Germany:**  
Authorized to work in Germany, based in Cologne, looking for Software Engineer / Backend Developer / Backend-focused Fullstack roles in English-speaking or English-friendly teams, remote EU or Cologne hybrid/office.

---

## 14. Recruiter message angle

### 1. Backend Node.js / TypeScript

I’m a Cologne-based backend-focused TypeScript developer with commercial experience in Node.js, Azure Functions, Durable Functions, REST APIs and production backend workflows. I’m looking for Backend Developer or Software Engineer roles in Germany or remote EU where the team is English-speaking or English-friendly.

### 2. E-commerce integrations

My strongest recent experience is in large-scale e-commerce integrations: Amplience automation, CommerceTools product data retrieval and ProductsUp product synchronization. I’m especially interested in backend roles involving APIs, product/catalog data, integrations and production reliability.

### 3. Backend-focused fullstack

I’m backend-first, but I also contributed to production React/Next.js features, BFF/API layers and GraphQL query/mutation changes. I’m a good fit for backend-focused fullstack roles where Node.js/TypeScript backend work remains the core of the position.

---

## 15. Apply / maybe / skip rules

### Apply

Apply when most of these are true:

- Main stack includes Node.js, TypeScript, REST APIs, backend services, integrations, Azure/serverless or PostgreSQL.
- Role is Backend Developer, Software Engineer, Backend-focused Fullstack Developer or Fullstack TypeScript with meaningful backend scope.
- Team is English-speaking or clearly English-friendly.
- Location is remote EU, remote Germany, hybrid Cologne or office Cologne.
- Role values production backend experience, integrations, e-commerce, observability, testing, CI/CD collaboration or SQL.
- German is not required, or A2/B1 is acceptable.
- Seniority is Mid/Middle+ or Senior-leaning with strong stack/domain match.

### Maybe

Consider conditionally when:

- Python/FastAPI/AI is a secondary plus, not main commercial requirement.
- The role centres on AI-assisted engineering or developer productivity with a Node.js/TypeScript backend core and does not require commercial AI production.
- React/Next.js is required but backend remains significant.
- German B1/B2 is preferred but not mandatory.
- Hybrid/office is in Cologne and team can onboard in English.
- Role includes some DevOps/Terraform/Azure DevOps collaboration but not DevOps ownership.
- Consultancy role has limited German-speaking client exposure.

### Skip

Skip when:

- German C1/fluent is mandatory.
- Role is PHP-only or mainly legacy PHP.
- Role is DevOps-only, Kubernetes-heavy or infrastructure ownership-heavy.
- Role is pure frontend.
- Role is Senior Python/FastAPI requiring commercial Python production.
- Role is AI/ML Engineer, MLOps, model training or data science.
- Role is QA, support, WordPress, low-code or technical consultant with German-heavy customer communication.
- Vacancy would force overclaiming Docker/Kubernetes/Python/AI.

---

## 16. Final summary for future chats

### Use this as system context for vacancy analysis

* Candidate profile: Denys Strakhov, Cologne-based backend-focused TypeScript developer, authorized to work in Germany.
* Main target roles: Software Engineer, Backend Developer, Backend-focused Fullstack Developer in Germany or remote EU.
* Core commercial stack: Node.js, TypeScript, Azure Functions, Azure Durable Functions, REST APIs, API integrations, Jest, Azure Application Insights/KQL.
* Strongest evidence: EPAM large-scale multi-locale e-commerce platform, 18+ locales, Nov 2021 – May 2025.
* Strongest EPAM cases: ProductsUp sync, Amplience automation/webhooks/mass updates, CommerceTools product data retrieval, customer notification incident.
* Strong backend foundation: Factor–IT PostgreSQL-heavy financial/accounting production system, migrations, complex SQL, data integrity, custom PHP framework.
* Secondary skills: React/Next.js production contribution, GraphQL/BFF working experience, Redis, Cosmos DB, Blob Storage, Terraform/Azure DevOps collaboration.
* Personal/portfolio evidence (five projects, all personal): JobFlow CV Pipeline (NestJS/PostgreSQL, OpenAI integration, BullMQ/Redis), Dark Factory (Claude Code / OpenAI Codex workflow package), B1 Kompass and Cards (Next.js/Supabase), Home Budget (Next.js/Drizzle/PostgreSQL money logic).
* Training: Google Cloud ADK skill badge and labs, Anthropic Claude Code / MCP courses, FastAPI course (the only basis for Python/FastAPI), Node.js courses.
* Summary: variant A (backend), B (full-stack) or C (AI-assisted engineering / developer productivity) by vacancy family — section 1.
* Do not overclaim: Python/FastAPI/AI, Kubernetes, Docker production ownership, Terraform/DevOps ownership, GraphQL platform ownership.
* Do not position as: PHP-only developer, pure frontend developer, DevOps engineer, AI/ML engineer.
* Main risks: German A2/B1, English speaking confidence, Senior communication expectations, remote preference, missing exact metrics/details for some incidents and integrations.
* Best-fit vacancies: Node.js/TypeScript backend, Azure/serverless backend, e-commerce integrations, API/data workflows, production support, SQL/PostgreSQL backend roles.
* Apply logic: apply for English-friendly Node.js/TypeScript backend roles with remote/Cologne fit and backend production relevance.
* Maybe logic: consider Python/AI/fullstack/consulting only if secondary requirements and no German-heavy communication.
* Skip logic: skip German C1/fluent, PHP-only, DevOps/Kubernetes-only, pure frontend, pure AI/ML, QA/support/low-code roles.

---

## Self-check

1. **Не добавлен неподтверждённый опыт:** проверено; неподтверждённые или неполные факты помечены как `[needs evidence]` или сформулированы осторожно.  
2. **Python/FastAPI/AI не завышены:** проверено; Python/FastAPI — только обучение, AI-assisted engineering и LLM-интеграция — personal projects, ADK — training; ничего не подано как commercial production.  
3. **Kubernetes/Docker/DevOps не завышены:** проверено; Kubernetes — basic exposure / usually omit, Docker — local/personal, Terraform/Azure DevOps — collaboration/support, not ownership.  
4. **PHP не сделан текущим target stack:** проверено; PHP описан как strong past backend foundation, не headline/top target.  
5. **Сильные EPAM / Factor–IT кейсы учтены:** проверено; включены EPAM umbrella, ProductsUp, Amplience, CommerceTools, customer notification incident, Factor–IT PostgreSQL migration.  
6. **[needs evidence] добавлен там, где фактов не хватает:** проверено; особенно для ProductsUp Cosmos DB container/schema/retention details, Redis metrics, incident metrics, Azure Service Bus topic/subscription details, GraphQL depth, freelance task details.
7. **Summary variants A/B/C:** 60–90 слов, первое предложение — коммерческий опыт, AI-доказательства в порядке раздела 1, без архивных проектов.
