# Tech Stack Matrix RU

## v2.5 — portfolio refresh (2026-11-23)

Это активная версия matrix. Она заменяет v2.4 целиком, а не дополняет её: прежние слои «Update v2.x» и устаревшие рекомендации удалены, история осталась в файлах v2.4 и старше.

- **Источники:** коммерческие факты — без изменений с v2.4 (mapping-чат, уточнения кандидата, проверка документации commercetools). Проектные факты — аудит пяти репозиториев от 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`) и блок `portfolio-registry` активного `project_inventory`. Обучение — блок `credential-registry` активного `certifications`.
- **Проект как доказательство:** только проект из `portfolio-registry` с `cvEligible: true` — Dark Factory, JobFlow CV Pipeline, Cards, B1 Kompass, Home Budget. Архивные проекты и проекты с `evidenceClass: needs_evidence` не являются доказательством навыка в активном CV.
- **Credential как доказательство:** только запись `credential-registry`; она подтверждает обучение, а не опыт.
- Цель файла — честно классифицировать стек для Software Engineer / Backend Developer / Backend-focused Full-stack Developer ролей в Германии и remote EU. Принцип: не завышать уровень. Технология без commercial production evidence не попадает в core skills и в `top_skills`. Факт без доказательства помечен `needs evidence`.

---

## 1. Evidence classes

| Класс | Что значит | Где допустим в CV |
|---|---|---|
| **commercial** | Подтверждённый коммерческий опыт у работодателя (EPAM, Factor–IT; CHI — только internship exposure) | headline, summary, `top_skills`, experience entry работодателя |
| **personal** (проект) | Реализация видна в коде проекта из `portfolio-registry` | bullets и `tech_stack` этого проекта или Current Independent Work; не в `top_skills`, не в записи работодателя |
| **training** (credential) | Пройденное обучение из `credential-registry` | Certifications (только `cvEligible`) или третий bullet Current Independent Work; никогда как опыт работы |
| **needs evidence** | Доказательства нет или оно есть только в архивном / непроверенном проекте | не используется в CV |

Один навык может иметь несколько классов (например, Jest: commercial + personal + training). Классы не смешиваются в одной формулировке: personal-реализация не делает навык commercial, training не делает его project experience.

---

## 2. Skill evidence matrix

| Skill | Commercial (employer) | Personal (project) | Training (credential) | Положение в CV |
|---|---|---|---|---|
| Node.js | EPAM: serverless backend, integrations, async processing (to May 2025) | JobFlow (NestJS backend); Dark Factory (Node.js package) | Advanced Node.js: Scaling Applications; Node.js: Testing and Code Quality; Node.js: Security; Node.js: Design Patterns | core |
| TypeScript | EPAM: backend, Azure Functions, BFF, React/Next.js | JobFlow; Cards; B1 Kompass (`strict`, `noUncheckedIndexedAccess`); Home Budget | — | core |
| NestJS | — (CHI internship exposure only, 2021) | JobFlow (NestJS 11) | — | personal; JobFlow bullet / `tech_stack`, not `top_skills` |
| Express | — (CHI internship exposure only) | — | — | usually omit |
| React | EPAM: production features (working level) | JobFlow dashboard; Cards; B1 Kompass; Home Budget (React 19) | Build a JavaScript AI App with React and the OpenAI API | commercial working; full-stack vacancies only |
| Next.js | EPAM: SSR, pages, components (working level) | JobFlow dashboard (`apps/web`); Cards, B1 Kompass, Home Budget (Next.js 16) | — | commercial working; full-stack vacancies only |
| GraphQL / BFF | EPAM: query/mutation changes on a Node.js/TypeScript BFF | — | — | commercial working |
| PostgreSQL / SQL | Factor–IT: complex SQL, migrations, indexes, transactions (to Jun 2021) | JobFlow (Prisma migrations); Home Budget (Drizzle, 6 SQL migrations, integration tests on a real PostgreSQL in CI); B1 Kompass (Supabase, 15 SQL migrations, RLS, triggers); Cards (Supabase) | — | core |
| Prisma | — | JobFlow | — | personal |
| Drizzle ORM | — | Home Budget | — | personal |
| Supabase | — | B1 Kompass (PostgreSQL, RLS, Storage signed URLs); Cards (PostgreSQL, email/password auth, invite-only sign-up via RPC) | — | personal |
| Auth.js | — | Home Budget (Google OAuth, one allowlisted email with `email_verified`) | — | personal |
| next-intl | — | B1 Kompass (EN/RU interface); Home Budget | — | personal |
| MUI | — | B1 Kompass (MUI 7); Home Budget (MUI 9) | — | personal |
| zod | — | B1 Kompass (`packages/domain`) | — | personal |
| Redis | EPAM: used and extended an existing caching service (working level) | JobFlow (BullMQ on Redis); Cards (Upstash Redis rate limiting) | Redis for JavaScript Developers; Get Started with Redis | commercial working |
| BullMQ | — | JobFlow (AI steps as background jobs) | — | personal |
| Azure (Functions, Durable Functions, Cosmos DB, Blob Storage, Application Insights/KQL, Key Vault) | EPAM (to May 2025) | — | System Design in Cloud (general cloud design, not Azure-specific) | core (Functions, Durable Functions); working (rest) |
| Azure DevOps / CI/CD | EPAM: release, deploy and redeploy participation | — | — | commercial working; not pipeline ownership |
| GitHub Actions | — | JobFlow (lint, typecheck, unit, e2e, Docker build); Dark Factory (Linux and Windows; verifier workflows); Cards; B1 Kompass (`supabase start` + E2E); Home Budget (integration on PostgreSQL, finance-coverage gate) | — | personal |
| Docker | EPAM: local development only, no production ownership | JobFlow (Docker Compose with PostgreSQL and Redis; image build with a smoke test in CI); Dark Factory (Docker sandbox for the coding agent) | — | personal / tools; not core |
| Terraform | EPAM: resource and module changes, local plan/apply | — | — | commercial working; not DevOps ownership |
| Jest | EPAM: function-level unit tests, mocks, SonarQube gate | JobFlow (unit + e2e, coverage floor) | Node.js: Testing and Code Quality | core |
| Vitest | — | Cards (47 test files); B1 Kompass (29 unit test files); Home Budget (domain and integration tests) | — | personal |
| Playwright | — | B1 Kompass (49 specs in CI on a local Supabase); Home Budget (E2E); Cards (one spec) | — | personal |
| SonarQube | EPAM: quality gate for new changes | — | — | commercial working |
| Swagger / OpenAPI | — | JobFlow (ADR-019) | — | personal |
| OpenAI API | — | JobFlow (`AiProvider` abstraction, AI category B) | Build a JavaScript AI App with React and the OpenAI API | personal |
| Claude Code | — | AI category A: Dark Factory, JobFlow, Cards, B1 Kompass; AI category B: Dark Factory (headless agent orchestration) | Certificate of completion: Claude Code 101 (category C) | personal (A/B) + training (C) |
| OpenAI Codex | — | AI category A: Home Budget (Codex-native workflow); AI category B: Dark Factory (acceptance verifier on `openai/codex-action`, runs on JobFlow pull requests) | — | personal (A/B) |
| MCP | — | `needs evidence` for project use | Introduction to Model Context Protocol; Model Context Protocol: Advanced Topics; Antigravity labs (category C) | training |
| Google ADK, multi-agent systems, Agent Runtime, Antigravity | — | — | Engineer AI Agents with Agent Development Kit (ADK) skill badge; nine Google Cloud labs; Wrap Up: Deploy Production-Ready Agents (category C) | training |
| Python | — | `needs evidence`: no verified project in `portfolio-registry` | FastAPI - The Complete Course 2026 (Beginner + Advanced) (Udemy, Apr 2026); Основи програмування мовою Python (Prometheus) | training |
| FastAPI | — | `needs evidence`: no verified project in `portfolio-registry` | FastAPI - The Complete Course 2026 (Beginner + Advanced) (Udemy, Apr 2026) | training |
| LangGraph, Qdrant, RAG, tool-calling | — | `needs evidence`: claimed stack of AI Bootcamp RAG Service (`needs_evidence`, not `cvEligible`) | — | not used |
| SQLAlchemy, Alembic, Pytest, Streamlit | — | `needs evidence`: no evidence in an active project | — | not used |
| React Query, TailwindCSS, Resend API | — | `needs evidence`: not found in the 2026-11 audit of the active projects | — | not used |
| Vercel | — | Cards and B1 Kompass deployed publicly (B1 Kompass: manual `release-production.yml` with the Vercel CLI) | — | personal; not cloud/DevOps experience |
| PHP | Factor–IT: PHP 7–7.4, custom framework (to Jun 2021) | — | — | experience entry only |
| Kubernetes | — (training exposure only) | — | — | omit |
| MongoDB | — (CHI internship exposure only) | — | — | omit |
| AWS | — | — | — | no evidence; never claim |

`top_skills` takes only names that are commercial in this matrix. A personal technology goes into the `tech_stack` and bullets of its project; a training-only skill goes into Certifications or the training bullet of Current Independent Work.

---

## 3. AI experience — three independent categories

Три категории классифицируются и формулируются раздельно. Ни одна не является коммерческим AI- или production-опытом. Общей формулировки «AI expertise» нет. Обучение (C) не подменяет реализацию (A, B): в CV сначала A/B, потом C — кроме вакансии, где ADK прямо в требованиях.

### 3.1 A — AI-assisted Software Engineering

Как кандидат разрабатывает ПО с coding agents. Это практическая инженерная работа в личных проектах (`personal_verified`), не обучение и не коммерческий опыт.

| Evidence | Project | Tools | Safe CV wording |
|---|---|---|---|
| Hooks, skills and agents for Claude Code; repository-specific instructions; Ralph loop that takes a scoped GitHub Issue to a pull request; independent acceptance verification before a human merge | Dark Factory | Claude Code, OpenAI Codex, GitHub Actions | `allowedWording` of `dark-factory` in `portfolio-registry` |
| Developed with Claude Code (354 merged PRs as of 2026-11-23); tasks as scoped GitHub Issues with acceptance criteria; task PRs checked by the acceptance verifier, since 2026-10 from the Dark Factory package | JobFlow CV Pipeline | Claude Code, Dark Factory | `Developed JobFlow with Claude Code, using scoped GitHub Issues with acceptance criteria and independent acceptance verification before a human merge.` |
| Consumer repositories of Dark Factory (B1 Kompass: verifier and spec approval, Ralph not found) | Cards, B1 Kompass | Claude Code, Dark Factory | only as part of the Dark Factory wording («installed in three personal repositories») |
| Codex-native workflow: `AGENTS.md`, `.codex/`, `.agents/skills/` — a separate adaptation, not a Dark Factory installation | Home Budget | OpenAI Codex | `Developed with OpenAI Codex using repository-specific agent instructions and skills.` |

Summary wording: `Develops software with Claude Code and OpenAI Codex, using repository-specific instructions, skills and independent acceptance verification before a human merge.`

Do not claim: commercial or team adoption of these tools, productivity or speed-up figures, autonomous production deployment, enabled auto-merge.

### 3.2 B — AI Integration & Agent Workflow Engineering

Реализованная инженерная функциональность вокруг LLM и агентов (`personal_verified`).

| Evidence | Project | Safe CV wording | Interview risk |
|---|---|---|---|
| OpenAI API behind an `AiProvider` abstraction; explicit provider required in production | JobFlow | `Integrated the OpenAI API behind a provider abstraction in a personal NestJS backend.` | Medium. One real provider plus a fake for tests |
| Structured output validation: typed errors for truncated, refused and empty answers; schema-validated JSON before use | JobFlow | `Validated LLM output before use, with typed errors for truncated, refused or empty answers.` | Medium |
| LLM call policy: retries only on HTTP 429/5xx with backoff, no retry after a timeout, per-attempt timeout, per-step output-token limits | JobFlow (ADR-040 amendment) | `Implemented an explicit LLM call policy: retries only for 429/5xx with backoff, no retry after a timeout and per-step output-token limits.` | Medium. Explain the cost reasoning (a retry after a timeout pays twice) |
| AI steps as BullMQ jobs on Redis: `202` + `jobId`, status polling, one job per workspace + step, no automatic retries of paid calls | JobFlow (ADR-040) | `Moved long-running LLM steps into BullMQ/Redis background jobs with 202 + jobId status polling and one in-flight job per workspace step.` | Medium. One local worker; no throughput or load numbers |
| Human review gates after AI steps; Evidence Guard flags unsupported CV claims; prompt versioning, source snapshots, token/cost tracking | JobFlow | `Built human review gates and an evidence check that flags unsupported claims in AI-generated drafts.` | Medium. Domain-specific personal project |
| Agent orchestration: Claude Code headless in a Docker sandbox with an egress proxy; the agent may read Git history (`git status/diff/log`, `git show` on review passes) but cannot commit, push or call `gh`; the controller commits, pushes and opens the PR | Dark Factory (`ralph/workspace.js`, `ralph/sandbox.js`) | `Orchestrated a Claude Code agent in a Docker sandbox with least-privilege Git rights; a Node.js controller owns commits, pushes and pull requests.` | Medium. Never say «no Git access» |
| Deterministic verification: Codex acceptance verifier on `openai/codex-action` with a model allowlist; the verdict is computed by code, `NEEDS_HUMAN` when two runs disagree; checks for protected paths and test tampering; fail-closed hooks | Dark Factory (`verifier/verdict.js`, `ralph/boundary.js`) | `Built an OpenAI Codex-based acceptance verifier in GitHub Actions whose verdict is computed and re-checked by code.` | Medium. Explain why the model does not decide the verdict |
| Calibration: Calibration Judge for root-cause analysis of verifier rounds; a small golden case set replayed against the verifier | Dark Factory (`judge/`); JobFlow (`.github/verifier/golden`, ADR-042, ADR-044) | `Built a small golden case set and a calibration workflow to check an LLM-based verifier against known cases.` | Medium-high. Small set, no published accuracy metrics |

Do not claim: ML engineering, MLOps, model training, the job title AI Engineer or LLM Platform Engineer, external users, queue throughput, verifier accuracy metrics.

### 3.3 C — Agent Development Training

Подтверждённое обучение (`training_verified`), записи — в `credential-registry` активного `certifications`.

| Topic | Credentials | In a CV |
|---|---|---|
| Google ADK, agent tools, multi-agent systems, Agent Runtime | Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge, 2026-11 (`cvEligible`); six of the nine labs | badge in Certifications; labs only in the training bullet of Current Independent Work |
| Antigravity (topics include MCP and Go) | three Google Cloud labs | training bullet only |
| Production-ready agents (course content) | Wrap Up: Deploy Production-Ready Agents (completed, not `cvEligible`) | not shown; never as production deployment |
| MCP | Introduction to Model Context Protocol; Model Context Protocol: Advanced Topics (Anthropic) | Certifications for AI-tooling vacancies |
| Claude Code (course) | Certificate of completion: Claude Code 101 (Anthropic) | Certifications; the practical Claude Code work is category A/B |
| OpenAI API (course) | Build a JavaScript AI App with React and the OpenAI API | Certifications when OpenAI API is a plus |

In progress, never shown: Professional Agentic Architect Certification (learning path), Deploy Production Ready Agents (learning path), Build Agent Skills with Google (course).

Training rules: training is not project, production or commercial experience. The badge description mentions topics such as tokenization, fine-tuning and pretraining; badge metadata does not prove those skills — never claim model training, fine-tuning, pretraining or tokenization work. Google Cloud lab deployments are not production deployment of AI agents.

---

## 4. Core commercial stack

Технологии, которые можно ставить в headline / summary / top skills.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Node.js | Strong commercial production experience | EPAM Systems; clean Node.js/TypeScript + Azure Functions; backend services, API/integration flows, async processing | Yes | May 2025 | EPAM large-scale e-commerce platform; Amplience automation; CommerceTools retrieval; ProductsUp sync; notification flows | `Backend-focused developer with commercial Node.js experience building production serverless backend workflows, integrations and data-processing flows.` | Low-medium. Риск только в system design/API design на уровне architect ownership: в EPAM initial architecture/API design часто начинались с architect/lead, но implementation, technical discussion and delivery были твоей зоной. |
| TypeScript | Strong commercial production experience | EPAM Systems; main modern backend/fullstack language | Yes | May 2025 | Azure Functions, Durable Functions, BFF/API, React/Next.js contributions | `Commercial TypeScript experience across backend services, serverless workflows, BFF/API layers and fullstack features.` | Low. Подтверждены interfaces/types, generics, utility types, type guards, DTO mapping. Нужно освежить advanced TS edge cases, но можно ставить в core. |
| Azure Functions | Strong commercial production experience | EPAM Systems; serverless backend components with HTTP, timer, queue/topic/subscription triggers | Yes | May 2025 | Amplience webhooks; CommerceTools flows; ProductsUp sync; notification flows | `Built and maintained production Azure Functions using HTTP, timer and queue/topic/subscription triggers for backend workflows and integrations.` | Low-medium. Нужно уверенно объяснять triggers, bindings/configuration, env/secrets, runtime limits, deployment flow. Queue/topic/subscription likely Azure Service Bus, but exact term still needs final confirmation before interview. |
| Azure Durable Functions | Strong commercial production experience | EPAM; long-running workflows, orchestrator and Activity Functions, sub-orchestrations, retries, idempotency | Yes | May 2025 | ProductsUp product data sync | `Built and maintained long-running backend workflows using Azure Durable Functions, orchestrators, Activity Functions, sub-orchestrations, retries and idempotency patterns.` | Medium. Хорошая зона. Не заявлять ownership entire lifecycle: ProductsUp flow начинал ты, позже contributing делали другие. Освежить timers/fan-out/fan-in/compensation, если вакансия требует deep Durable Functions. |
| REST APIs / API integrations | Strong commercial production experience | EPAM; Amplience, CommerceTools, ProductsUp; Factor–IT had PHP/JsonRPC API design experience | Yes | May 2025 | ProductsUp built from scratch; Amplience/CommerceTools partly from scratch and partly maintained; Factor–IT JsonRPC API | `Implemented production API integrations and backend workflows with external platforms, handling retries, API limits, invalid payloads, missing fields, auth, timeouts, pagination and batching.` | Medium. В EPAM не claiming full API design ownership from blank page; сказать: implementation and technical contribution after lead/architect-level design. Auth менее уверенная зона. |
| Jest / backend unit testing | Strong commercial backend testing experience | EPAM; function-level unit tests for backend features/functions; mocking external APIs/Azure/Cosmos/Redis where needed | Yes | May 2025 | EPAM testing; SonarQube quality gate for new changes; frontend Jest tests in changed areas | `Wrote and maintained function-level unit tests with Jest, mocked external dependencies and worked within SonarQube quality gates for new changes.` | Low-medium. Не claiming integration/e2e testing ownership. Риск: если попросят advanced testing strategy beyond unit tests. |
| Azure Application Insights / KQL / production debugging | Strong commercial production experience | EPAM; logs, KQL queries, incident investigation, structured logging, alerting ideas | Yes | May 2025 | Customer email notification incident; production bugs; tracing by operation/order IDs, function name, timestamp, keywords/errors | `Investigated production issues using Azure Application Insights and KQL, tracing failures across Azure Functions and services by operation IDs, function names, timestamps and error patterns.` | Low-medium. Хорошая зона. Не claiming dashboard/workbook ownership; alerts were logs + email alerts and ideas/finalization with team/DevOps. |
| PostgreSQL / SQL | Strong commercial production experience | Factor–IT; financial/accounting production system; complex SQL, migrations, indexes, performance optimization | Yes | Commercial: Jun 2021; personal: current | High-risk account migrations; vacation payment logic; SQL-heavy financial backend; personal: JobFlow CV Pipeline (Prisma), Home Budget (Drizzle ORM), B1 Kompass (Supabase SQL migrations) | `Strong PostgreSQL background from production financial systems, including complex SQL, migrations, indexes, transactions and performance optimization.` | Low-medium. Сильная зона, но коммерческий PostgreSQL не самый свежий. Освежить EXPLAIN, isolation levels, locking, modern syntax. |

---

## 5. Strong backend foundation

Технологии и навыки, которые сильные, но могут быть из прошлого стека или не являются текущим основным таргетом.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Backend business logic | Strong commercial production experience | EPAM + Factor–IT; e-commerce flows and regulated financial/payroll logic | Yes | May 2025 | Product sync, content automation, notification flows, vacation payment calculation | `Implemented complex backend business logic in e-commerce and financial/accounting domains.` | Low. Говорить только через concrete cases. |
| Data migrations | Strong commercial production experience | Factor–IT; financial data, SQL/PHP migration scripts, transactions, test DB validation | Yes | Jun 2021 | High-risk account-splitting migration; many organization-specific databases | `Planned and executed PostgreSQL migrations with transactions, validation on test databases and rollback planning where possible.` | Low-medium. Подтверждено: transactions обязательны, migrations могли затрагивать от 1 до 900+ databases, irreversible cases often. Backup/dry-run was not always standard. |
| SQL performance optimization | Strong commercial production experience | Factor–IT; large complex queries, indexes, reducing selected data, intermediate tables | Yes | Jun 2021 | Factor–IT financial/accounting system | `Optimized PostgreSQL queries using indexes, query simplification and intermediate tables, achieving 2x+ improvements and in some cases much faster read performance.` | Medium. Можно говорить 2x+ and sometimes tens of times for read-heavy cases, but без точной метрики лучше не ставить в CV bullet как hard metric. |
| PHP | Strong past commercial experience, not target stack | Factor–IT; PHP 7–7.4, fully custom framework, financial backend | Yes | Jun 2021 | Public-sector accounting system; custom framework; migrations | `Earlier backend experience with PHP 7.x in production financial systems; currently positioned as backend foundation, not target stack.` | Medium. Не ставить в headline/top skills, чтобы не получать PHP-only roles. |
| Custom backend framework / Data Mapper ideas | Strong past backend architecture contribution | Factor–IT; fully custom PHP framework | Yes | Jun 2021 | Routing to backend controllers, validation, migrations, DB layer, permissions | `Contributed to a fully custom PHP backend framework, including routing, validation, migration tooling, database layer and permissions.` | Medium. Можно объяснить Data Mapper, но нужно подготовить 1–2 конкретных examples before/after. |
| Legacy backend maintenance | Strong past commercial experience | Factor–IT; legacy financial production system | Yes | Jun 2021 | Budget accounting production system | `Maintained and extended legacy backend systems while improving reliability, readability and data integrity.` | Low. Полезно как maturity signal, но не делать центром CV. |
| Production support / incident investigation | Strong commercial production experience | EPAM + Factor–IT; production bugs, logs, hotfix/redeploy participation | Yes | May 2025 | Customer notification incident; production bugs; releases/hotfixes | `Supported production systems through debugging, log analysis, redeploy/hotfix participation and post-release checks.` | Low-medium. Хороший сигнал для немецкого рынка. Не позиционировать как SRE/DevOps. |
| Async processing / batching / retries | Strong commercial production experience | EPAM; Promise.all, batching, rate limits, retries/backoff, streams | Yes | May 2025 | ProductsUp sync; CommerceTools API handling; large-file processing services | `Handled asynchronous backend processing, batching, rate limits, retry/backoff logic and streaming/file-processing scenarios.` | Medium. Streams were used in ProductsUp and other large-file services, but exact service names not remembered. |

---

## 6. Working commercial experience

Технологии, которые использовались коммерчески, но их не стоит продавать как expert-level.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Cosmos DB | Commercial production experience | EPAM; created containers via Terraform; read/query/insert/update/upsert/delete; usually read by ID, queries by filters, insert/update | Yes | May 2025 | EPAM e-commerce flows; ProductsUp changed records came from a confirmed Cosmos DB container / Cosmos DB change records | `Used Cosmos DB in production backend flows, including container creation via Terraform and item-level read/query/insert/update operations.` | Medium. Partition key/item-document confirmed. RU/throughput/query cost need refresh before interview. Do not claim deep NoSQL architecture. |
| Azure Blob Storage | Commercial working-to-strong experience | EPAM; ProductsUp flow; intermediate files between Activity Functions and final CSV/GZIP output | Yes | May 2025 | ProductsUp product data sync | `Used Azure Blob Storage for intermediate and final files in backend data-processing workflows, including product sync across changed locales.` | Low-medium. Good evidence. Prepare naming/access/lifecycle details if asked. |
| Azure Key Vault / secrets / env vars | Commercial working experience | EPAM; early-stage self-service secret/config changes, later DevOps ownership | Production-related | May 2025 | Azure Functions / Terraform / deployment-related process | `Worked with environment configuration and secrets in Azure-based backend services, collaborating with DevOps for ownership and complex changes.` | Medium. Do not position as security specialist. |
| Redis | Commercial working experience | EPAM; Redis service existed, you used and extended it; cached Amplience API responses and navigation data | Yes | May 2025 | Amplience/navigation caching; API response caching | `Used and extended Redis-based caching for selected API responses and navigation data, including TTL and cache invalidation logic.` | Medium. Safe internal metric: some Lambda/Azure Function executions improved by 2–4x. Do not claim you designed Redis service/core caching architecture end-to-end. For external CV prefer no hard metric until measurement source is clarified. |
| React | Commercial working fullstack experience | EPAM; production frontend tasks, slider feature, PDP page changes, related products/product data display | Yes | May 2025 | Last ~2 years in EPAM; React/Next.js features | `Contributed to production React features as a backend-focused fullstack developer, including components, PDP changes and API integration.` | Medium. Good for backend-focused fullstack. Avoid pure frontend specialist positioning. |
| Next.js | Commercial working fullstack experience | EPAM; SSR and components/pages | Yes | May 2025 | EPAM frontend features | `Worked with Next.js production pages/components and SSR-related frontend work as part of fullstack feature delivery.` | Medium. Need clarify Pages Router/App Router if needed. Not frontend-first. |
| GraphQL / BFF | Commercial working experience | EPAM; BFF/frontend boundary; changed queries/mutations; BFF was Node.js/TypeScript | Yes | May 2025 | BFF/API layer; frontend-backend integration | `Worked with Node.js/TypeScript BFF layers and GraphQL query/mutation changes at the frontend/backend boundary.` | Medium-high. Do not claim schema/platform ownership unless confirmed. |
| Terraform | Commercial working experience | EPAM; created/changed subscriptions and Cosmos DB resources; often via modules; local plan/apply checks | Production-related | May 2025 | Cosmos DB containers/resources; subscriptions; env/config changes | `Supported Terraform-based infrastructure changes, including Cosmos DB resources and subscriptions, with local plan/apply checks and DevOps collaboration.` | Medium. Stronger than basic exposure, but still not DevOps ownership. |
| Azure DevOps / CI-CD | Commercial working experience | EPAM; release/deploy process, redeploy, pipeline exposure; exact step changes not remembered | Production-related | May 2025 | Releases, redeploy, post-release checks | `Participated in Azure DevOps-based CI/CD and release processes, including redeploys and coordination with DevOps.` | Medium. Do not claim pipeline architecture. Exact pipeline step changes unknown. |
| SonarQube | Commercial working experience | EPAM; quality gate for new changes, around 80% coverage | Yes | May 2025 | Jest backend unit tests and quality gates | `Worked within SonarQube quality gates for new changes, including coverage expectations around 80%.` | Low-medium. Keep as quality/process, not as expert-level tool. |
| CommerceTools | Commercial working-to-strong integration experience | EPAM; product catalog source of truth for product information; catalog scale up to ~100,000 unique products excluding locales | Yes | May 2025 | CommerceTools product data retrieval/enrichment; product data for PDP/listing/product-information pages and any flows needing product details; ProductsUp enrichment | `Integrated CommerceTools product data into backend/BFF/product-information flows, handling up to ~100,000 unique products, product IDs, filters/groups, empty attributes, pagination where supported by the API, batching/custom batching logic where needed, and safe defaults such as empty values/arrays/strings.` | Medium. Strong e-commerce evidence, but be precise: do not claim CommerceTools platform architecture ownership. Official docs confirm query pagination via limit/offset and general API limits such as 0–500 query limit and Product Projection Search offset max 10,000; for batch behavior and rate limits, use cautious wording unless project-specific details are remembered. CommerceTools was treated as source of truth, so responses were not cached. |
| Amplience | Commercial working-to-strong integration experience | EPAM; CMS/content automation, schemas, create/update/publish/unpublish webhooks, mass field updates | Yes | May 2025 | Amplience automation/webhooks/mass updates; 18+ locales | `Automated Amplience CMS workflows using webhook-based Azure Functions, handling create/update/publish/unpublish events, validation, logging, retries, cache updates and mass field updates across tens to hundreds of entities/pages.` | Medium. Strong automation/business-impact case. Safe claim: selected manual UI operations were reduced from hours to minutes. Do not claim all content operations were automated. |
| ProductsUp Stream API | Commercial strong flow experience | EPAM; downstream product data distribution; built initial implementation and later supported its maintenance with the team; long-running sync | Yes | May 2025 | ProductsUp product data sync; Durable Functions; CommerceTools enrichment; Blob Storage; Stream API | `Built the initial implementation and later supported its maintenance with the team on a ProductsUp product synchronization flow using Azure Durable Functions, CommerceTools enrichment, Azure Blob Storage and Stream API uploads, processing around 20,000–40,000 products per sync across changed locales with activity-level retries, idempotency and per-locale result logging.` | Medium. Very strong backend/cloud/integration case. Use approximate metrics: 20–40k products, usually 3–5 changed locales, 2+ hours, tens to hundreds of MB files. Changed records source is confirmed as Cosmos DB change records; remaining details such as container/schema/retention are still interview-detail level. |

---

## 7. Personal / portfolio experience

Реализация в проектах из `portfolio-registry`. Не commercial production experience; не в `top_skills` и не в записи работодателя. AI-строки (Claude Code, OpenAI Codex, OpenAI API, BullMQ, LLM call policy) — в разделе 3.

| Technology | Project | Safe CV wording | Interview risk |
|---|---|---|---|
| NestJS | JobFlow | `Built a personal NestJS/TypeScript backend-first project with modular service boundaries and Swagger/OpenAPI documentation.` | Medium. Strong current signal, not commercial production. Do not claim EPAM production NestJS. |
| Prisma | JobFlow | `Used Prisma with PostgreSQL migrations in a personal NestJS backend project.` | Medium-low |
| Swagger / OpenAPI | JobFlow | `Documented a REST API with Swagger/OpenAPI in a personal NestJS project.` | Low-medium. Not API governance ownership |
| Explicit status machine, review gates | JobFlow (ADR-038) | `Implemented an explicit workflow status machine with guarded compare-and-set transitions and audited human overrides.` | Medium |
| Deterministic HTML-to-PDF export | JobFlow (Handlebars, Puppeteer) | `Implemented deterministic HTML-to-PDF export without AI token usage, including an ATS variant.` | Medium-low |
| Drizzle ORM | Home Budget | `Used Drizzle ORM with PostgreSQL and manual SQL migrations in a personal budgeting app.` | Medium. Personal, early-stage project |
| Money handling in integer cents | Home Budget (`bigint` cents, range-checked arithmetic, `Result` types) | `Stored money as integer cents and computed period budgets, reserves and liquidity forecasts in unit-tested domain functions.` | Medium. Not commercial FinTech; no payments or bank integrations |
| Auth.js | Home Budget | `Implemented Google sign-in with Auth.js restricted to one allowlisted owner account.` | Medium. Single owner. Do not claim per-action authorization. |
| Supabase | B1 Kompass; Cards | `Built a Supabase PostgreSQL schema with SQL migrations, row-level security and Storage signed URLs in a personal Next.js project.` (B1 Kompass) | Medium. RLS only for B1 Kompass: in Cards the policies exist only as manual SQL in docs |
| next-intl | B1 Kompass; Home Budget | `Localized a Next.js interface (English/Russian) with next-intl.` (B1 Kompass) | Low. Cards has no localization library |
| MUI | B1 Kompass; Home Budget | `Built Next.js interfaces with MUI.` | Low. Secondary skill |
| zod | B1 Kompass | `Kept domain logic in a pure TypeScript package with zod validation.` | Low-medium |
| Upstash Redis rate limiting | Cards | `Added rate limiting with an Upstash Redis limiter and an in-memory fallback.` | Low-medium |
| Vitest | Cards; B1 Kompass; Home Budget | `Covered domain logic with Vitest unit tests.` | Low-medium |
| Playwright | B1 Kompass; Home Budget; Cards | `Wrote Playwright end-to-end tests that run in CI against an isolated local Supabase.` (B1 Kompass) | Medium. Personal CI, not a QA role |
| Integration tests on a real database | Home Budget (18 integration tests); JobFlow (e2e against a PostgreSQL service in CI) | `Ran integration tests against a real PostgreSQL in CI.` | Medium-low |
| GitHub Actions | all five projects | `Configured GitHub Actions pipelines for personal projects: lint, type-check, unit and end-to-end tests, builds.` | Medium. Not DevOps or commercial CI/CD ownership |
| Docker | JobFlow; Dark Factory | `Used Docker Compose for local infrastructure and a Docker sandbox for an AI coding agent in personal projects.` | Medium. Not production container ownership |
| Vercel | Cards; B1 Kompass | `Deployed personal Next.js projects on Vercel.` | Low-medium. Not cloud/DevOps experience |
| node:test | Dark Factory (84 test files, CI on Linux and Windows) | `Covered a Node.js package with node:test suites running in CI on Linux and Windows.` | Low-medium |

---

## 8. Training only and needs evidence

| Skill | Evidence | Rule |
|---|---|---|
| Python, FastAPI | Training: FastAPI - The Complete Course 2026 (Beginner + Advanced), Udemy, Apr 2026; Prometheus Python fundamentals (old) | Only as training: Certifications or the Python training bullet of Current Independent Work (`Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".`). Never as project, commercial or production experience |
| Google ADK, multi-agent systems, Agent Runtime, MCP, Antigravity | Training, category C (section 3.3) | Badge in Certifications; labs only in the training bullet |
| AI Bootcamp RAG Service stack (Python, FastAPI, LangGraph, Qdrant, OpenAI API, Docker) | `needs_evidence` in `portfolio-registry`, implementation not verified | Not used in a CV until verified |
| SQLAlchemy, Alembic, Pytest, Streamlit | no evidence in an active project | Not used |
| React Query, TailwindCSS, Resend API | not found in the 2026-11 audit of the active projects | Not used |
| Viber bot / admin website | non-commercial real-life project; stack, period, hosting and users `needs evidence` | Interview only, not the CV |

---

## 9. Basic / exposure only

| Technology | Level | Context | Production experience | Last used | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | --------------- | -------------- |
| Express | Training / internship exposure | CHI Software; учебные REST APIs | No confirmed production | Sep 2021 | `Worked with Express during a Node.js internship.` | Medium-high. Не использовать для Express-heavy roles without refresh. |
| MongoDB | Internship/training exposure | CHI Software | No confirmed production | Sep 2021 | `Worked with MongoDB during a Node.js internship.` | High. Usually omit. |
| Kubernetes | Basic / training exposure | CHI/training context | No | Sep 2021 / training | `Basic Kubernetes exposure.` | Very high. Usually omit from CV unless vacancy explicitly lists it as optional and you refresh basics. |
| KQL / Kusto Query Language | Commercial working experience, not standalone core skill | Application Insights log queries | Production-related | May 2025 | `Used KQL in Azure Application Insights for production debugging.` | Low-medium. Include as part of observability, not as separate headline skill. |

NestJS: internship exposure at CHI (2021) is superseded as evidence by current personal work in JobFlow (section 7); still not commercial.

---

## 10. Do not position as core skill

| Technology | Why risky | How to mention safely | When to omit |
| ---------- | --------- | --------------------- | ------------ |
| Kubernetes | Только basic/training exposure, no commercial production. | `Basic Kubernetes exposure` only if specifically asked. | Almost always omit from skills section. |
| Docker | Local dev at EPAM + personal projects; no commercial production ownership. | `Docker for local development and personal projects.` | Omit from core/top skills; project `tech_stack` or Tools only. |
| NestJS | Personal project only (JobFlow); EPAM production was clean Node.js/TS + Azure Functions. | `Personal NestJS/TypeScript backend project (JobFlow).` | Never in `top_skills` or an employer entry. |
| Next.js full-stack personal stack (Supabase, Drizzle, Auth.js, next-intl, MUI, Vitest, Playwright) | Personal projects only. | In the `tech_stack` and bullets of the project that uses it. | Omit for backend-only vacancies unless a requirement stays uncovered. |
| Claude Code / OpenAI Codex | Personal practical work (AI categories A/B), not commercial. | Section 3 wording, tied to Dark Factory, JobFlow or Home Budget. | Omit for vacancies without an AI mention. |
| Python / FastAPI | Training only (FastAPI course); no verified project. | `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".` | Omit unless Python/FastAPI is in the vacancy. |
| OpenAI API | Personal (JobFlow) + training. | `Integrated the OpenAI API behind a provider abstraction in a personal NestJS backend.` | Omit for pure backend roles where it distracts; never claim ML/MLOps/model training. |
| Google ADK / agents | Training only (category C). | `Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge` | Omit unless the vacancy mentions AI agents or AI-assisted engineering. |
| PHP | Strong, but old target stack and can attract PHP-only roles. | `Earlier backend experience with PHP 7.x in production financial systems.` | Omit from headline; keep in work experience and maybe secondary skills. |
| React / Next.js | Production work exists, but target is backend-focused. | `React/Next.js production contribution as backend-focused fullstack developer.` | Omit from headline for backend-only roles; include for backend-focused fullstack roles. |
| GraphQL | Working commercial changes, but not schema/platform ownership. | `GraphQL query/mutation changes at BFF/frontend boundary.` | Omit for deep GraphQL platform roles unless refreshed. |
| Terraform | Real commercial usage, but not DevOps ownership. | `Terraform configuration support, resource/module changes, local plan/apply checks.` | Omit from core for non-cloud roles; include under DevOps collaboration. |
| MongoDB / Express | Internship/training only. | `Worked with MongoDB/Express during a Node.js internship.` | Usually omit. |
| WordPress / low-code / support tools | Not aligned with target Software Engineer / Backend Developer positioning. | Do not mention. | Always omit. |

---

## 11. CV skill section recommendations

Skills section пишется на английском. В CV, который строит JobFlow, `top_skills` берёт только commercial-названия из раздела 2; строки personal ниже (11.3) подписаны как таковые, стоят после коммерческих и годятся для вручную собранного CV и для `tech_stack` проекта.

### 11.1 Backend Node.js / TypeScript roles

```text
Technical Skills
Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, serverless backend workflows, API integrations
Cloud & Data: Azure, Cosmos DB, Azure Blob Storage, Redis, PostgreSQL
Testing & Quality: Jest, unit testing, SonarQube quality gates, Postman, code review
DevOps Collaboration: Azure DevOps, CI/CD participation, Terraform configuration support
Observability: Azure Application Insights, KQL, production debugging, structured logging, alerting support
Frontend Collaboration: React, Next.js, BFF/API layer, GraphQL working experience
```

Самый сильный вариант. NestJS, Docker, OpenAI API, Python/FastAPI не входят: это personal или training.

### 11.2 Backend-focused Fullstack roles

```text
Technical Skills
Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, serverless workflows, third-party integrations
Frontend: React, Next.js, production frontend features, SSR-related work, frontend-to-backend integration, Jest tests
API Layer: BFF, GraphQL working experience, API contracts, frontend/backend debugging
Data & Cloud: Cosmos DB, Azure Blob Storage, Redis, PostgreSQL, Azure Application Insights
Testing & Delivery: Jest, unit testing, SonarQube quality gates, Postman, Azure DevOps, CI/CD participation, code review
```

Не писать `Frontend Engineer` или `React specialist`. Личный Next.js-стек (Supabase, Drizzle ORM, Auth.js, next-intl, MUI, Vitest, Playwright) — в `tech_stack` выбранного проекта, не в skills section.

### 11.3 AI-friendly backend / AI-assisted engineering roles

Для Backend Developer с AI integration как плюсом, internal tooling, developer productivity, AI-assisted workflows. Не для pure AI/ML Engineer.

```text
Technical Skills
Commercial Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, Cosmos DB, Redis, PostgreSQL, Jest
Production & Delivery: API integrations, production debugging, Azure Application Insights, KQL, Azure DevOps, CI/CD participation, code review
AI-Assisted Engineering (personal projects): Claude Code, OpenAI Codex, repository-specific agent instructions and skills, independent acceptance verification
AI Integration (personal projects): OpenAI API, provider abstraction, structured output validation, BullMQ/Redis background jobs, human review gates
Personal Backend: NestJS, Prisma, Docker, GitHub Actions
```

Категория C (ADK, MCP) — в Certifications, не в skills. Коммерческие и personal строки разделены, чтобы не создать впечатление commercial AI-опыта.

### 11.4 Python / FastAPI as a plus

Python/FastAPI не входят в skills section как опыт. Используется только обучение: курс FastAPI в Certifications или Python training bullet в Current Independent Work. Commercial-строки — как в 11.1.

---

## 12. Suggested positioning by vacancy type

| Vacancy type | Main positioning | Skills to emphasize | Skills to de-emphasize |
| ------------ | ---------------- | ------------------- | ---------------------- |
| Node.js Backend Developer | Backend-focused TypeScript developer with Azure/serverless and integrations | Node.js, TypeScript, REST APIs, Azure Functions, Durable Functions, Jest, KQL, production debugging, integrations | React, PHP, Python/AI, Docker/Kubernetes |
| Backend-focused Fullstack Developer | Backend-first fullstack engineer with React/Next.js production contribution | Node.js, TypeScript, Azure Functions, BFF, React, Next.js, GraphQL working experience; personal Next.js projects | PHP, Kubernetes, pure frontend claims |
| E-commerce Backend Engineer | Integration-heavy backend developer with product/catalog/content flows | CommerceTools, Amplience, ProductsUp, product sync, Azure, retries, pagination/batching | Python/AI, Kubernetes, PHP as target stack |
| Cloud/serverless Backend Developer | TypeScript backend engineer with Azure serverless production experience | Azure Functions, Durable Functions, Cosmos DB, Blob Storage, Application Insights, KQL | Terraform as expert, Kubernetes, DevOps-only positioning |
| SQL-heavy / financial Backend Developer | Backend developer with strong PostgreSQL/data integrity foundation | PostgreSQL, SQL, migrations, financial data, data integrity; personal: Home Budget money handling | PHP as current target, MongoDB, AI |
| AI integration Backend Developer | Commercial Node.js backend + personal AI integration (category B) | Node.js/TypeScript commercial; JobFlow OpenAI integration, LLM call policy, background jobs | ML Engineer claims, model training, MLOps |
| AI-assisted SE / Developer Productivity | Commercial Node.js backend + personal AI-assisted engineering (category A) | Dark Factory, Claude Code, OpenAI Codex, acceptance verification; ADK badge as supporting training | commercial AI claims, productivity figures, autonomous deployment |

---

## 13. Confirmed commercial evidence notes from mapping chat

### 13.1 Core / Azure / TypeScript / Testing

- EPAM backend was clean Node.js/TypeScript + Azure Functions, not Express/NestJS.
- TypeScript depth includes interfaces/types, generics, utility types, type guards, DTO mapping.
- Azure Functions triggers used: HTTP, timer, queue/topic/subscription.
- Durable Functions: wrote orchestrator and Activity Functions end-to-end; used sub-orchestrations, retries, idempotency.
- ProductsUp flow was started by you, later contributed by others.
- Jest testing was unit-only, function-level, with mocks; SonarQube gate for new changes.
- KQL confirmed in Application Insights.
- Azure DevOps: participated in release/deploy/redeploy flow; exact pipeline step changes not remembered.

### 13.2 ProductsUp confirmed details

- Typical sync volume: approximately 20,000–40,000 products.
- Sync processed only changed locales, usually 3–5 locales, not always all 18+ locales.
- Full sync could run for more than 2 hours.
- Generated CSV/GZIP files were usually tens to hundreds of MB.
- Changed product records came from a confirmed Cosmos DB container / Cosmos DB change records. External CV can use `Cosmos DB change records` when relevant, but avoid unsupported details such as container name, schema, retention or trigger internals.
- Emergency/manual sync had separate initial logic and was rarely used later.
- Reliability handling included retries for whole activities, skipping failed products with logs, and final per-locale result logs.
- Final per-locale logs included counts such as: products to update, CommerceTools records received, products formatted, products sent to ProductsUp.
- Idempotency used a composite key based on orchestration cycle number, activity number and additional details; product ID helped prevent duplicate product records.
- Safe ownership wording: `built the initial implementation and later supported its maintenance with the team`.

### 13.3 Amplience confirmed details

- Handled Amplience webhook events such as create, update, publish and unpublish.
- Mass update logic could apply field changes for a specific content/schema type.
- One mass update could affect tens to hundreds of entities/pages.
- Before automation, content managers had to perform these changes manually through the UI.
- Automation reduced selected operations from hours to minutes.
- Safe wording: `selected content-management operations`, not all content operations.

### 13.4 CommerceTools confirmed details

- Product catalog scale: up to approximately 100,000 unique products, excluding locale duplication.
- CommerceTools was used as a source of truth for product information.
- Product data was used for PDP, listing pages and other product-information flows where product details were needed.
- CommerceTools responses were not cached because the catalog/source-of-truth data was large and expected to stay authoritative.
- Empty values were a common data issue; safe handling used empty values, empty arrays or empty strings instead of fallback business values.
- Pagination was used where supported by the API.
- Batching/custom batching should be worded cautiously: use `batching/custom batching logic where needed`, not `CommerceTools batch API`, unless later confirmed.
- API constraints should be worded cautiously as `API limits/page-size constraints/rate-limit-like constraints`, because exact project-specific limits still need refresh.

### 13.5 Official commercetools documentation check for interview safety

- commercetools query endpoints support `limit` with allowed values between 0 and 500, with default 20 on most query endpoints.
- Product Projection Search supports `offset`; the maximum allowed offset is 10,000.
- commercetools documents product-search indexing limits, including a maximum of 50 Product Attributes per Product and 50 Variant Attributes per Product Variant for Product Search.
- commercetools performance guidance documents JSON document size constraints, which is relevant when working with large product payloads.

### 13.6 Redis / caching confirmed details

- Redis was production.
- Redis service itself was not written by you from scratch; you used and extended existing getter/setter service.
- Cached Amplience API responses and navigation data.
- Worked with TTL and cache invalidation.
- Some function executions improved around 2–4x, but this should remain internal evidence until measurement source is confirmed.

### 13.7 React / Next.js / GraphQL confirmed details

- Production frontend tasks were real production work.
- React/Next.js work included a slider, PDP changes, adding product data, and related products for a specific product.
- Next.js work included SSR and components/pages.
- GraphQL work was query/mutation changes at BFF/frontend boundary.
- BFF was Node.js/TypeScript.
- Frontend tests were maintained in changed areas, mostly generated/script-supported tests.

### 13.8 PostgreSQL / Factor–IT confirmed details

- PostgreSQL was used throughout Factor–IT from the first day.
- Confident areas: schema design, joins, subqueries, indexes, migrations, transactions, locks.
- Stored procedures/functions/triggers were not used; logic was intentionally kept in code.
- Query optimization examples: large composite queries improved via indexes, removing unused selected data, and sometimes intermediate tables for read-heavy scenarios.
- Typical improvement: 2x+; in some read-heavy cases, tens of times faster reads after using intermediate tables.
- Transactions were mandatory in migrations.
- Dry-runs/backups were not always standard.
- Migrations could affect from one database up to all 900+ organization-specific databases.
- Irreversible or hard-to-rollback migrations happened often; risk was reduced by testing on test databases.

### 13.9 PHP / custom framework confirmed details

- PHP version: 7–7.4.
- Framework was fully custom.
- Contributions included backend routing to controllers, validation, migrations, DB layer, permissions.
- Data Mapper pattern can be explained.
- PHP should not be a current target stack.

---

## 14. Remaining clarification questions — commercial cases

Здесь оставлены только вопросы, которые ещё не закрыты в чате и могут повлиять на финальную безопасность CV/interview.

### 14.1 Azure / Durable Functions

1. Queue/topic/subscription trigger — это точно Azure Service Bus?
2. Durable Functions: fan-out/fan-in использовался или лучше писать только `sub-orchestrations, retries, idempotency`?
3. Durable Functions: timers использовались или нет?
4. Sub-orchestrations в ProductsUp были по чему: locale, batch, step, file-processing stage?
5. Retry policy была built-in Durable retry или custom retry/backoff внутри activity?
6. Azure Functions limits: что реально приходилось учитывать — timeout, memory, payload size, cold start, concurrency?
7. Node.js runtime в Azure Functions помнишь: Node 14 / 16 / 18?
8. Для больших файлов Blob Storage использовался именно чтобы не передавать большие payloads между activities?

### 14.2 Cosmos DB / Blob Storage / Terraform

1. Cosmos DB partition key ты выбирал сам или использовал existing architecture pattern?
2. Можешь безопасно назвать пример partition key без confidential details?
3. Cosmos DB использовалась для чего: sync state, change records, product records, config, logs, temporary records?
4. Blob Storage path/naming был примерно по operationId/locale/date?
5. Были ли cleanup/lifecycle rules для intermediate files?
6. Terraform: ты писал новые modules или использовал existing modules и добавлял resource/config?
7. `terraform apply` ты запускал сам на dev/test или только `plan`?
8. Secrets/env vars через Terraform менял?

### 14.3 Production incident / customer notification flow

1. Это был один конкретный incident или повторяющийся класс проблем?
2. Investigation заняло примерно: часы, день, несколько дней?
3. Root cause был где: upstream missing data, intermediate service mapping, downstream validation, email template, комбинация?
4. Missing data — это было обязательное поле для email/SMS payload?
5. Downstream service возвращал ошибку или проблема находилась только через logs?
6. После incident вы добавили: validation, structured logs, alert, retry, fallback?
7. Какие fields ты логировал или предлагал логировать: orderId, operationId, locale, event type, step, payload status, error code?
8. Alert condition была на exception, missing required field, failed downstream call или failed status?
9. Можно ли писать: `improved observability for a business-critical notification flow`?
10. Ты был owner этого intermediate service или key contributor?

### 14.4 Redis caching / performance

1. 2–4x ускорение касалось execution time Azure Functions или API response latency?
2. Это измерялось через Application Insights duration или примерно по наблюдениям?
3. Cache invalidation запускалась через Amplience webhook?
4. TTL был фиксированный или разный для разных типов данных?
5. Были ли cache hit/miss logs?
6. Ты менял cache key strategy или использовал existing pattern?
7. Были stale cache issues?
8. Redis использовался только backend/Azure Functions или ещё BFF?
9. Можно ли во внутреннем Master CV оставить `2–4x`, а во внешнем CV писать без цифры?
10. CV wording безопаснее такой? `Used Redis caching for selected Amplience/navigation data to reduce repeated API calls and improve execution time.`

### 14.5 React / Next.js / GraphQL

1. Slider был custom component или доработка existing component?
2. PDP changes — добавлял новые UI blocks или только новые fields?
3. Related products data приходили из BFF/backend?
4. SSR: ты менял data fetching logic или работал на страницах, где SSR уже был?
5. Next.js был Pages Router или App Router?
6. GraphQL queries/mutations ты менял только на frontend side или также в BFF?
7. GraphQL schema/types/resolvers ты менял или нет?
8. Frontend Jest tests были snapshot/generated/component tests?
9. Accessibility tasks были real production issues или больше course/training?
10. В CV fullstack version можно писать `React/Next.js production contribution`, верно?

### 14.6 PostgreSQL / Factor–IT

1. Можно ли в CV писать `thousands of users`?
2. 900+ databases — это общее количество organization-specific DBs в системе или одна миграция реально могла пройти по всем 900+?
3. Миграции запускались через internal migration tool, deployment script или вручную?
4. Backups перед risky migrations делались всегда / часто / иногда?
5. Validation после migration: что проверял — counts, sums, balances, register consistency, account totals?
6. Intermediate tables хранили original state для rollback/audit?
7. Transactions были на уровне каждой DB?
8. Были ли lock/performance issues во время миграций?
9. Один конкретный SQL optimization example: какая была проблема → что изменил → какой результат?
10. Можно ли во внешнем CV писать `optimized SQL queries using indexes, query simplification and intermediate tables`, без цифр?

### 14.7 Vacation payment calculation

1. Какие 3–5 факторов расчёта можешь уверенно назвать: стаж, тип занятости, период, ставки, календарные дни, больничные, премии?
2. Были full-time/part-time scenarios?
3. Были recalculations/corrections за прошлые периоды?
4. Результат расчёта попадал в reporting registers?
5. Acceptance делали QA, analyst, chief analyst, focus users?
6. Тестирование было через test DB/scenario checks, без unit tests?
7. Можно писать `multiple calculation scenarios` или `dozens of calculation branches`?
8. Это была одна большая feature или серия задач?
9. Ты поддерживал эту логику после release?
10. Этот case оставляем для interview only или добавляем в CV как bullet?

### 14.8 Custom PHP framework

1. Migration system improvement: что именно улучшал?
2. DB layer был query builder, mapper, repository-like layer или Data Mapper-style abstraction?
3. Validation была на entity/model level, request level или перед сохранением в DB?
4. Permissions были role-based, module-based, object-level?
5. Routing — route/request → controller/action mapping?
6. Before/after impact: меньше boilerplate, fewer manual checks, safer migrations, faster feature delivery?
7. Framework использовали все backend developers?
8. Ты был main contributor или one of contributors?
9. Этот case можно использовать как architecture-thinking example?
10. В CV его держать коротко или только для интервью?

---

## 15. Current recommendation

Для немецкого рынка основной безопасный профиль:

```text
Backend-focused TypeScript Developer with commercial production experience in Node.js, Azure Functions, Durable Functions, REST/API integrations, e-commerce workflows, Jest testing, Azure Application Insights/KQL, Redis caching and strong PostgreSQL foundation from financial systems.
```

Самая безопасная CV headline:

```text
Backend-focused TypeScript Developer | Node.js | Azure Functions | REST APIs | PostgreSQL | E-commerce Integrations
```

Альтернатива для fullstack вакансий:

```text
Backend-focused Fullstack Developer | Node.js | TypeScript | Azure Functions | React/Next.js | PostgreSQL
```

Для AI-friendly вакансий headline остаётся коммерческим; AI-доказательства (категории A и B, затем C) идут в Summary, Selected Projects и Certifications, не в headline.

Что держать в top skills for main backend CV:

```text
Node.js, TypeScript, Azure Functions, Azure Durable Functions, REST APIs, Cosmos DB, Azure Blob Storage, Redis, PostgreSQL, Jest, SonarQube, Azure DevOps, Azure Application Insights, KQL
```

Что держать как personal (в проектах, не в top skills):

```text
NestJS, Prisma, BullMQ, OpenAI API, Claude Code, OpenAI Codex, Docker, GitHub Actions, Next.js personal stack (Supabase, Drizzle ORM, Auth.js, next-intl, MUI, Vitest, Playwright)
```

Что только как обучение:

```text
Python, FastAPI, Google ADK, MCP
```

Что обычно не ставить в core:

```text
PHP, Kubernetes, MongoDB, Express, NestJS, Docker, Python, AI/RAG
```

Итог по positioning: **apply** для Node.js/TypeScript backend, backend-focused fullstack, Azure/serverless, API integration, e-commerce, SQL-heavy backend roles. **Maybe** для AI integration или AI-assisted engineering roles, где AI — плюс, и для Python/FastAPI roles только когда Python secondary. **Skip** для Kubernetes/DevOps-only, PHP-only, pure frontend, German C1/fluent customer-facing roles, pure AI/ML Engineer roles.
