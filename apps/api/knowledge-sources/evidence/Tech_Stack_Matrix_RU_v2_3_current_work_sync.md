# Tech Stack Matrix RU


## Update v2.3 — current JobFlow / NestJS portfolio sync

This update adds JobFlow CV Pipeline and current independent work as personal/portfolio evidence. It does **not** change the commercial core stack: Node.js/TypeScript/Azure/REST integrations/production debugging/PostgreSQL remain the strongest commercial positioning.

### Current work classification

| Technology / area | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
|---|---|---|---|---|---|---|---|
| Current Independent Work | Mandatory timeline / light professional activity | Small freelance/independent Node.js/React tasks, portfolio projects and structured upskilling after relocation; volunteering is separate market-dependent supporting signal | Limited / needs evidence for freelance client scope | Current | Current Independent Work & Portfolio Projects | `Continued active software development after relocating to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.` | Medium. Safe and mandatory for gap-closing; do not overstate freelance scope without evidence. Volunteering is not core software-engineering evidence. |
| Small Node.js/React freelance tasks | Small independent work, needs evidence for scope | Feature additions, bug fixes, API-related changes, UI adjustments, maintenance | Needs evidence for commercial/client details | Current | Independent tasks | `Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.` | Medium-high if interviewer asks for clients/references. Keep wording small and cautious. |
| NestJS | Personal portfolio / current hands-on | JobFlow CV Pipeline; modular backend architecture | No confirmed commercial production | Current | JobFlow CV Pipeline | `Built a personal NestJS/TypeScript backend-first portfolio project with modular service boundaries and Swagger/OpenAPI documentation.` | Medium. Strong current portfolio signal, but not commercial production. Do not claim EPAM production NestJS. |
| Prisma | Personal portfolio / current hands-on | JobFlow CV Pipeline persistence with PostgreSQL | No commercial production | Current | JobFlow CV Pipeline | `Used Prisma with PostgreSQL in a personal NestJS backend project.` | Medium-low. Safe as personal. |
| Swagger/OpenAPI | Personal portfolio / current hands-on | API documentation for JobFlow CV Pipeline | No commercial production confirmed | Current | JobFlow CV Pipeline | `Used Swagger/OpenAPI for API documentation in a personal NestJS backend project.` | Low-medium. Do not imply commercial API governance ownership. |
| AI Provider Abstraction | Personal portfolio / AI tooling design | JobFlow CV Pipeline abstraction around AI provider usage | No commercial production | Current | JobFlow CV Pipeline | `Designed an AI provider abstraction in a personal backend project to keep AI integration boundaries modular.` | Medium. Safe as architecture/design concept; avoid production platform claim. |
| Evidence Guard / anti-overclaiming | Personal portfolio / domain-specific backend module | Rule-based claim validation using source knowledge base with evidence levels | No commercial production | Current | JobFlow CV Pipeline | `Implemented an Evidence Guard concept to flag unsupported CV claims before export using structured source evidence levels.` | Medium. Strong unique portfolio signal, but domain-specific and personal. |
| Deterministic HTML-to-PDF export | Personal portfolio / backend document export | Backend HTML-to-PDF export without AI token usage | No commercial production | Current | JobFlow CV Pipeline | `Implemented deterministic backend HTML-to-PDF export without AI token usage in a personal NestJS project.` | Medium-low. Prepare tool/library details if used in interviews. |
| Prompt versioning / artifact traceability | Personal portfolio / AI workflow reproducibility | Versioned prompt templates, input hashes, source snapshots, artifact traceability | No commercial production | Current | JobFlow CV Pipeline | `Implemented prompt versioning, source snapshots and artifact traceability concepts for reproducible AI-assisted workflows.` | Medium. Safe as project feature; not enterprise governance. |

### Updated safety notes

- NestJS moved from `training/internship exposure only` to **current personal portfolio experience** through JobFlow. It is still not commercial production experience.
- Prisma and Swagger/OpenAPI are safe as JobFlow personal project evidence only.
- OpenAI API evidence is now supported by both AI Job Assistant and JobFlow, but remains personal/project experience.
- Docker remains personal/local development unless a vacancy specifically accepts portfolio evidence.
- Redis/BullMQ queue migration is a future design target only; do not claim implemented Redis/BullMQ unless confirmed later.

### CV tailoring recommendation

For targeted CVs, do not add all JobFlow technologies to Top Skills. Use them only when the vacancy values NestJS, AI tooling, OpenAI API, backend architecture, document generation, prompt versioning or developer productivity.

---

## Update v2.2 — consistency sync

- External name decision: **Denys Strakhov**.
- ProductsUp changed records source is confirmed: **Cosmos DB container / Cosmos DB change records**.
- Streamlit is confirmed as personal/project UI for AI Job Assistant; still not a core skill.
- Active source set should use v0.6/v2.3 current-work-sync files; old v0.3/v2.0 files should be treated as archive.

Основа: `Master_CV_RU_v0_6_current_work_sync.md`, `Project_Inventory_RU_v0_6_current_work_sync.md`, уточнения пользователя в mapping-чате и точечная проверка официальной документации commercetools.

Цель файла — честно классифицировать tech stack для поиска Software Engineer / Backend Developer / Backend-focused Full-stack Developer ролей в Германии и remote EU.

Принцип: не завышать уровень. Если технология не подтверждена commercial production experience, она не попадает в core skills. Если факт требует уточнения, отмечено `[needs evidence]`. Если факт подтверждён пользователем в этом чате, `[needs evidence]` убран.

---

## Update v2.1 — LinkedIn MD sync: additional personal-project technologies

Источник: Profile linkedIn MD draft как LinkedIn output. Эти технологии добавлены **только** в personal/portfolio bucket. Не переносить в core commercial stack.

### Personal / portfolio additions from Email Camp and Cards

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Supabase | Personal project experience | Email Camp; Cards; PostgreSQL/Auth/Storage/RLS depending on project | No commercial production | Current/2025 according to LinkedIn draft | Email Camp; Cards | `Used Supabase/PostgreSQL, Auth/Storage and RLS in personal full-stack projects.` | Medium. Good personal-project evidence, but not commercial. Prepare RLS/auth/storage details before using in interviews. |
| React Query | Personal project experience | Client-side data fetching/state in personal Next.js apps | No commercial production | Current/2025 according to LinkedIn draft | Email Camp; Cards | `Used React Query for client-side data fetching in personal Next.js projects.` | Medium-low. Safe as personal. Do not claim commercial React Query unless separately confirmed. |
| Resend API | Personal project experience | Automated email notifications in Email Camp | No commercial production | 2025 according to LinkedIn draft | Email Camp | `Integrated Resend API for automated email notifications in a personal full-stack project.` | Medium. Need confirm deliverability/auth/templates/errors if asked. |
| Vercel | Personal project deployment | Deployed personal Next.js projects | No commercial production | Current/2025 according to LinkedIn draft | Email Camp; Cards | `Deployed personal Next.js projects on Vercel.` | Low-medium. Do not position as DevOps/cloud production experience. |
| TailwindCSS | Personal/frontend project experience | UI styling for personal Next.js apps | No commercial production | Current/2025 according to LinkedIn draft | Email Camp; Cards | `Used TailwindCSS in personal Next.js projects.` | Low. Secondary skill only. |
| Streamlit | Personal/project UI exposure | AI Job Assistant; AI Bootcamp/RAG learning context | No commercial production | Current/2025 according to LinkedIn draft | AI Job Assistant; AI Bootcamp/RAG | `Used Streamlit as a simple UI layer in personal AI/backend projects, including AI Job Assistant.` | Medium-low. Safe as personal/project UI only; do not use as backend/core skill. |

### Updated safety note

- Email Camp and Cards are useful as portfolio support for backend-focused fullstack roles.
- They should **not** replace EPAM as main evidence.
- Do not add Supabase/React Query/Resend/Vercel/TailwindCSS to top skills unless a vacancy explicitly values personal project evidence.
- For backend-only CVs, usually omit Cards and keep Email Camp only if email/API/product ownership is relevant.

---

## 1. Core commercial stack

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
| PostgreSQL / SQL | Strong commercial production experience | Factor–IT; financial/accounting production system; complex SQL, migrations, indexes, performance optimization | Yes | Commercial: Jun 2021; personal: current | High-risk account migrations; vacation payment logic; SQL-heavy financial backend; AI Job Assistant personal project | `Strong PostgreSQL background from production financial systems, including complex SQL, migrations, indexes, transactions and performance optimization.` | Low-medium. Сильная зона, но коммерческий PostgreSQL не самый свежий. Освежить EXPLAIN, isolation levels, locking, modern syntax. |

---

## 2. Strong backend foundation

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

## 3. Working commercial experience

Технологии, которые использовались коммерчески, но их не стоит продавать как expert-level.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Cosmos DB | Commercial production experience | EPAM; created containers via Terraform; read/query/insert/update/upsert/delete; usually read by ID, queries by filters, insert/update | Yes | May 2025 | EPAM e-commerce flows; ProductsUp changed records came from a confirmed Cosmos DB container / Cosmos DB change records | `Used Cosmos DB in production backend flows, including container creation via Terraform and item-level read/query/insert/update operations.` | Medium. Partition key/item-document confirmed. RU/throughput/query cost need refresh before interview. Do not claim deep NoSQL architecture. |
| Azure Blob Storage | Commercial working-to-strong experience | EPAM; ProductsUp flow; intermediate files between Activity Functions and final CSV/ZIP output | Yes | May 2025 | ProductsUp product data sync | `Used Azure Blob Storage for intermediate and final files in backend data-processing workflows, including product sync across changed locales.` | Low-medium. Good evidence. Prepare naming/access/lifecycle details if asked. |
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
| ProductsUp Stream API | Commercial strong flow experience | EPAM; downstream product data distribution; built initial implementation and later maintained/contributed; long-running sync | Yes | May 2025 | ProductsUp product data sync; Durable Functions; CommerceTools enrichment; Blob Storage; Stream API | `Built the initial implementation and later maintained/contributed to a ProductsUp product synchronization flow using Azure Durable Functions, CommerceTools enrichment, Azure Blob Storage and Stream API uploads, processing around 20,000–40,000 products per sync across changed locales with activity-level retries, idempotency and per-locale result logging.` | Medium. Very strong backend/cloud/integration case. Use approximate metrics: 20–40k products, usually 3–5 changed locales, 2+ hours, tens to hundreds of MB files. Changed records source is confirmed as Cosmos DB change records; remaining details such as container/schema/retention are still interview-detail level. |

---

## 4. Personal / portfolio experience

Технологии из personal projects, курсов, pet projects. Их можно использовать как additional skills / portfolio, но не как commercial production evidence.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Python | Personal project / coursework experience | AI Job Assistant; AI Bootcamp/RAG | No commercial production | Current/active | AI Job Assistant; AI Bootcamp API/RAG | `Additional hands-on Python experience through personal backend/AI projects.` | Medium-high. Не использовать как commercial Python. Подходит only secondary angle. |
| FastAPI | Personal project / coursework experience | AI Job Assistant; AI Bootcamp; sync and async endpoints | No commercial production | Current/active | Job Assistant runnable locally; demo/README not polished | `Built personal FastAPI backend projects, including job ingestion, AI-assisted review/test suggestions and RAG API experiments.` | Medium. Project runnable locally, but not demo-polished. Need README/screenshots/API examples. |
| SQLAlchemy | Personal project experience | AI Job Assistant; ORM models, sessions | No commercial production | Current/active | AI Job Assistant | `Used SQLAlchemy ORM models and sessions in a personal FastAPI/PostgreSQL project.` | Medium. Relationships not confirmed; do not overclaim. |
| Alembic | Personal project experience | AI Job Assistant migrations | No commercial production | Current/active | AI Job Assistant | `Used Alembic for database migrations in a personal FastAPI/PostgreSQL project.` | Medium-low. Safe as personal. |
| Pytest | Personal project experience | AI Job Assistant; unit and integration tests | No commercial production | Current/active | AI Job Assistant tests | `Wrote unit and integration tests with Pytest in personal backend projects.` | Medium-low. Coverage not confirmed; do not mention coverage unless added. |
| GitHub Actions | Personal project working experience | AI Job Assistant CI; workflow YAML with GPT support; PostgreSQL service + Pytest | No commercial production | Current/active | AI Job Assistant; AI-assisted review/test suggestions | `Configured GitHub Actions for personal projects, including Pytest runs with PostgreSQL service and AI-assisted review/test checks.` | Medium. Mention GPT-assisted implementation honestly if asked, but this is normal. No CI badge confirmed. |
| Docker | Personal + commercial local development experience | Local dev in EPAM and personal projects; Dockerfile/docker-compose in personal projects with GPT support | No confirmed commercial production ownership | Current/active | Local Redis/backend; FastAPI projects | `Used Docker for local development and personal project setup, including Dockerfile/docker-compose.` | Medium. Do not put in core. Safe under Tools/Local development. |
| OpenAI API | Personal project experience | AI Job Assistant; code diff review, test relevance/recommendations | No commercial production | Current/active | AI Job Assistant; GitHub Actions review workflows | `Integrated OpenAI API in personal projects for AI-assisted code review and test recommendation workflows.` | Medium. Good portfolio angle; not commercial AI. |
| LangGraph | Learning / basic personal exposure | AI Bootcamp RAG; learning project, not yet polished pet project | No commercial production | Current/active | AI Bootcamp RAG | `Basic hands-on LangGraph exposure through a learning RAG project.` | High. Keep as exposure unless you can explain end-to-end without prompts. |
| Qdrant | Learning / basic personal exposure | AI Bootcamp RAG; vector retrieval storage | No commercial production | Current/active | AI Bootcamp RAG | `Basic Qdrant/vector retrieval exposure through a learning RAG project.` | High. Do not position as vector DB expert. |
| RAG / tool-calling | Learning / basic personal exposure | AI Bootcamp/RAG; FastAPI endpoint around LLM workflow | No commercial production | Current/active | AI Bootcamp RAG | `Basic RAG and tool-calling exposure through personal learning projects.` | High. Use only as nice-to-have. |
| Viber bot / admin website | Personal real-life project | Hockey team schedule; real users, admin site, restricted access | Non-commercial | [needs evidence] | Viber bot schedule system | `Built a non-commercial schedule-management bot/admin tool for a real user group.` | Medium. Need stack, period, hosting, users. Keep for interview, not main CV. |

---

## 5. Basic / exposure only

Технологии, которые были в training/internship или basic exposure. Их не стоит активно продавать в CV.

| Technology | Level | Context | Production experience | Last used | Evidence / projects | Safe CV wording | Interview risk |
| ---------- | ----- | ------- | --------------------- | --------- | ------------------- | --------------- | -------------- |
| Express | Training / internship exposure | CHI Software; учебные REST APIs | No confirmed production | Sep 2021 | CHI Node.js internship | `Introductory Express exposure during Node.js internship.` | Medium-high. Не использовать для Express-heavy roles without refresh. |
| NestJS | Training / internship exposure | CHI Software; учебные backend tasks | No confirmed production | Sep 2021 | CHI Node.js internship | `Introductory NestJS exposure during Node.js internship.` | High. Не писать как commercial NestJS. |
| MongoDB | Internship/training exposure | CHI Software | No confirmed production | Sep 2021 | CHI Node.js internship | `Introductory MongoDB exposure during Node.js internship.` | High. Usually omit. |
| Kubernetes | Basic / training exposure | CHI/training context | No | Sep 2021 / training | Basic exposure only | `Basic Kubernetes exposure.` | Very high. Usually omit from CV unless vacancy explicitly lists it as optional and you refresh basics. |
| Streamlit | Personal/project UI exposure | AI Job Assistant; AI Bootcamp RAG UI | No | Current/active | AI Job Assistant; AI Bootcamp | `Streamlit UI in personal AI/backend projects.` | Medium-low. Usually omit for backend CV unless personal projects are relevant. |
| KQL / Kusto Query Language | Commercial working experience, not standalone core skill | Application Insights log queries | Production-related | May 2025 | Production debugging | `Used KQL in Azure Application Insights for production debugging.` | Low-medium. Include as part of observability, not as separate headline skill. |

---

## 6. Do not position as core skill

Технологии, которые могут увести не туда или создать риск на интервью.

| Technology | Why risky | How to mention safely | When to omit |
| ---------- | --------- | --------------------- | ------------ |
| Kubernetes | Только basic/training exposure, no commercial production. | `Basic Kubernetes exposure` only if specifically asked. | Almost always omit from skills section. |
| Docker | Есть local dev + personal projects; no confirmed commercial production ownership. | `Docker for local development and personal projects.` | Omit from core/top skills; include only under Tools if vacancy values it. |
| Python | Personal/coursework only, no commercial production. | `Personal Python/FastAPI backend and AI integration projects.` | Omit from core commercial skills; include only for AI integration angle. |
| FastAPI | Personal projects only; demo not polished. | `Personal FastAPI projects with PostgreSQL, Pytest and OpenAI API.` | Omit for commercial FastAPI roles unless they accept personal experience. |
| OpenAI API / LangGraph / Qdrant / RAG | Personal/learning only; can make profile look like AI/ML Engineer without evidence. | `Personal AI integration projects; basic RAG exposure.` | Omit for pure backend roles where it distracts; never claim ML/MLOps/model training. |
| PHP | Strong, but old target stack and can attract PHP-only roles. | `Earlier backend experience with PHP 7.x in production financial systems.` | Omit from headline; keep in work experience and maybe secondary skills. |
| React / Next.js | Production work exists, but target is backend-focused. | `React/Next.js production contribution as backend-focused fullstack developer.` | Omit from headline for backend-only roles; include for backend-focused fullstack roles. |
| GraphQL | Working commercial changes, but not schema/platform ownership. | `GraphQL query/mutation changes at BFF/frontend boundary.` | Omit for deep GraphQL platform roles unless refreshed. |
| Terraform | Real commercial usage, but not DevOps ownership. | `Terraform configuration support, resource/module changes, local plan/apply checks.` | Omit from core for non-cloud roles; include under DevOps collaboration. |
| MongoDB | Internship/training only. | `Introductory MongoDB exposure.` | Usually omit. |
| NestJS / Express | Training exposure only; EPAM production was clean Node.js/TS + Azure Functions. | `Introductory Express/NestJS exposure; strong transferable Node.js/TypeScript backend experience.` | Omit unless vacancy is flexible and you refresh. |
| WordPress / low-code / support tools | Not aligned with target Software Engineer / Backend Developer positioning. | Do not mention. | Always omit. |

---

## 7. CV skill section recommendations

Ниже — 3 безопасных варианта skills section. Они написаны на английском, потому что CV для Германии / EU лучше готовить на английском, если вакансия не требует немецкий.

### 7.1 Backend Node.js / TypeScript roles

Использовать для Backend Developer / Software Engineer вакансий, где main stack — Node.js, TypeScript, APIs, cloud/serverless, integrations.

```text
Technical Skills
Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, serverless backend workflows, API integrations
Cloud & Data: Azure, Cosmos DB, Azure Blob Storage, Redis, PostgreSQL
Testing & Quality: Jest, unit testing, SonarQube quality gates, Postman, code review
DevOps Collaboration: Azure DevOps, CI/CD participation, Terraform configuration support
Observability: Azure Application Insights, KQL, production debugging, structured logging, alerting support
Frontend Collaboration: React, Next.js, BFF/API layer, GraphQL working experience
```

Комментарий: это самый сильный вариант. Python/FastAPI/Docker/OpenAI не включены в core, потому что это personal/portfolio или non-core evidence.

---

### 7.2 Backend-focused Fullstack roles

Использовать, если вакансия требует Node.js/TypeScript + React/Next.js, но backend остаётся значимой частью роли.

```text
Technical Skills
Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, serverless workflows, third-party integrations
Frontend: React, Next.js, production frontend features, SSR-related work, frontend-to-backend integration, Jest tests
API Layer: BFF, GraphQL working experience, API contracts, frontend/backend debugging
Data & Cloud: Cosmos DB, Azure Blob Storage, Redis, PostgreSQL, Azure Application Insights
Testing & Delivery: Jest, unit testing, SonarQube quality gates, Postman, Azure DevOps, CI/CD participation, code review
DevOps Collaboration: Terraform configuration support, environment variables, secrets/configuration collaboration
```

Комментарий: React/Next.js здесь можно поднять выше, но формулировка остаётся backend-focused. Не писать `Frontend Engineer` или `React specialist`.

---

### 7.3 AI integration / Python secondary angle

Использовать для Backend Developer roles with AI integrations as nice-to-have, internal tooling, developer productivity, automation, AI-assisted workflows. Не использовать для pure AI/ML Engineer roles.

```text
Technical Skills
Commercial Backend: Node.js, TypeScript, REST APIs, Azure Functions, Azure Durable Functions, Cosmos DB, Redis, PostgreSQL, Jest
Production & Delivery: API integrations, production debugging, Azure Application Insights, KQL, Azure DevOps, CI/CD participation, code review
Personal Backend / AI Projects: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pytest, Docker, GitHub Actions, OpenAI API
AI Integration Exposure: AI-assisted code review/test recommendations, basic RAG, LangGraph basics, Qdrant, tool-calling
Frontend Collaboration: React, Next.js, BFF/API layer, GraphQL working experience
```

Комментарий: здесь явно отделены `Commercial Backend` и `Personal Backend / AI Projects`, чтобы не создать ложное впечатление commercial Python/AI production experience.

---

## 8. Suggested positioning by vacancy type

| Vacancy type | Main positioning | Skills to emphasize | Skills to de-emphasize |
| ------------ | ---------------- | ------------------- | ---------------------- |
| Node.js Backend Developer | Backend-focused TypeScript developer with Azure/serverless and integrations | Node.js, TypeScript, REST APIs, Azure Functions, Durable Functions, Jest, KQL, production debugging, integrations | React, PHP, Python/AI, Docker/Kubernetes |
| Backend-focused Fullstack Developer | Backend-first fullstack engineer with React/Next.js production contribution | Node.js, TypeScript, Azure Functions, BFF, React, Next.js, GraphQL working experience | PHP, Kubernetes, pure frontend claims |
| E-commerce Backend Engineer | Integration-heavy backend developer with product/catalog/content flows | CommerceTools, Amplience, ProductsUp, product sync, Azure, retries, pagination/batching | Python/AI, Kubernetes, PHP as target stack |
| Cloud/serverless Backend Developer | TypeScript backend engineer with Azure serverless production experience | Azure Functions, Durable Functions, Cosmos DB, Blob Storage, Application Insights, KQL | Terraform as expert, Kubernetes, DevOps-only positioning |
| SQL-heavy Backend Developer | Backend developer with strong PostgreSQL/data integrity foundation | PostgreSQL, SQL, migrations, financial data, data integrity, performance analysis | PHP as current target, MongoDB, AI |
| AI integration Backend Developer | Commercial Node.js backend + personal FastAPI/OpenAI projects | Node.js/TypeScript commercial + FastAPI/OpenAI personal projects | ML Engineer claims, model training, MLOps |

---

## 9. Confirmed evidence notes from mapping chat

### 9.1 Core / Azure / TypeScript / Testing

- EPAM backend was clean Node.js/TypeScript + Azure Functions, not Express/NestJS.
- TypeScript depth includes interfaces/types, generics, utility types, type guards, DTO mapping.
- Azure Functions triggers used: HTTP, timer, queue/topic/subscription.
- Durable Functions: wrote orchestrator and Activity Functions end-to-end; used sub-orchestrations, retries, idempotency.
- ProductsUp flow was started by you, later contributed by others.
- Jest testing was unit-only, function-level, with mocks; SonarQube gate for new changes.
- KQL confirmed in Application Insights.
- Azure DevOps: participated in release/deploy/redeploy flow; exact pipeline step changes not remembered.

### 9.2 ProductsUp confirmed details

- Typical sync volume: approximately 20,000–40,000 products.
- Sync processed only changed locales, usually 3–5 locales, not always all 18+ locales.
- Full sync could run for more than 2 hours.
- Generated CSV/ZIP files were usually tens to hundreds of MB.
- Changed product records came from a confirmed Cosmos DB container / Cosmos DB change records. External CV can use `Cosmos DB change records` when relevant, but avoid unsupported details such as container name, schema, retention or trigger internals.
- Emergency/manual sync had separate initial logic and was rarely used later.
- Reliability handling included retries for whole activities, skipping failed products with logs, and final per-locale result logs.
- Final per-locale logs included counts such as: products to update, CommerceTools records received, products formatted, products sent to ProductsUp.
- Idempotency used a composite key based on orchestration cycle number, activity number and additional details; product ID helped prevent duplicate product records.
- Safe ownership wording: `built the initial implementation and later maintained/contributed`.

### 9.3 Amplience confirmed details

- Handled Amplience webhook events such as create, update, publish and unpublish.
- Mass update logic could apply field changes for a specific content/schema type.
- One mass update could affect tens to hundreds of entities/pages.
- Before automation, content managers had to perform these changes manually through the UI.
- Automation reduced selected operations from hours to minutes.
- Safe wording: `selected content-management operations`, not all content operations.

### 9.4 CommerceTools confirmed details

- Product catalog scale: up to approximately 100,000 unique products, excluding locale duplication.
- CommerceTools was used as a source of truth for product information.
- Product data was used for PDP, listing pages and other product-information flows where product details were needed.
- CommerceTools responses were not cached because the catalog/source-of-truth data was large and expected to stay authoritative.
- Empty values were a common data issue; safe handling used empty values, empty arrays or empty strings instead of fallback business values.
- Pagination was used where supported by the API.
- Batching/custom batching should be worded cautiously: use `batching/custom batching logic where needed`, not `CommerceTools batch API`, unless later confirmed.
- API constraints should be worded cautiously as `API limits/page-size constraints/rate-limit-like constraints`, because exact project-specific limits still need refresh.

### 9.5 Official commercetools documentation check for interview safety

- commercetools query endpoints support `limit` with allowed values between 0 and 500, with default 20 on most query endpoints.
- Product Projection Search supports `offset`; the maximum allowed offset is 10,000.
- commercetools documents product-search indexing limits, including a maximum of 50 Product Attributes per Product and 50 Variant Attributes per Product Variant for Product Search.
- commercetools performance guidance documents JSON document size constraints, which is relevant when working with large product payloads.

### 9.6 Redis / caching confirmed details

- Redis was production.
- Redis service itself was not written by you from scratch; you used and extended existing getter/setter service.
- Cached Amplience API responses and navigation data.
- Worked with TTL and cache invalidation.
- Some function executions improved around 2–4x, but this should remain internal evidence until measurement source is confirmed.

### 9.7 React / Next.js / GraphQL confirmed details

- Production frontend tasks were real production work.
- React/Next.js work included a slider, PDP changes, adding product data, and related products for a specific product.
- Next.js work included SSR and components/pages.
- GraphQL work was query/mutation changes at BFF/frontend boundary.
- BFF was Node.js/TypeScript.
- Frontend tests were maintained in changed areas, mostly generated/script-supported tests.

### 9.8 PostgreSQL / Factor–IT confirmed details

- PostgreSQL was used throughout Factor–IT from the first day.
- Confident areas: schema design, joins, subqueries, indexes, migrations, transactions, locks.
- Stored procedures/functions/triggers were not used; logic was intentionally kept in code.
- Query optimization examples: large composite queries improved via indexes, removing unused selected data, and sometimes intermediate tables for read-heavy scenarios.
- Typical improvement: 2x+; in some read-heavy cases, tens of times faster reads after using intermediate tables.
- Transactions were mandatory in migrations.
- Dry-runs/backups were not always standard.
- Migrations could affect from one database up to all 900+ organization-specific databases.
- Irreversible or hard-to-rollback migrations happened often; risk was reduced by testing on test databases.

### 9.9 PHP / custom framework confirmed details

- PHP version: 7–7.4.
- Framework was fully custom.
- Contributions included backend routing to controllers, validation, migrations, DB layer, permissions.
- Data Mapper pattern can be explained.
- PHP should not be a current target stack.

### 9.10 Python / AI / personal projects confirmed details

- AI Job Assistant runs locally for you, but not yet demo-tested/polished.
- Public README/screenshots/API examples are not yet ready.
- FastAPI includes both sync and async endpoints.
- SQLAlchemy: ORM models and sessions confirmed.
- Alembic migrations written by you.
- Pytest includes unit and integration tests.
- GitHub Actions CI exists and includes PostgreSQL service + Pytest.
- OpenAI API used for diff review, recommendations and checking whether diff has relevant tests.
- LangGraph/Qdrant/RAG is learning exposure, not yet polished portfolio project.

---

## 10. Remaining clarification questions — next batches only

Здесь оставлены только вопросы, которые ещё не закрыты в чате и могут повлиять на финальную безопасность CV/interview.

### 10.1 Azure / Durable Functions

1. Queue/topic/subscription trigger — это точно Azure Service Bus?
2. Durable Functions: fan-out/fan-in использовался или лучше писать только `sub-orchestrations, retries, idempotency`?
3. Durable Functions: timers использовались или нет?
4. Sub-orchestrations в ProductsUp были по чему: locale, batch, step, file-processing stage?
5. Retry policy была built-in Durable retry или custom retry/backoff внутри activity?
6. Azure Functions limits: что реально приходилось учитывать — timeout, memory, payload size, cold start, concurrency?
7. Node.js runtime в Azure Functions помнишь: Node 14 / 16 / 18?
8. Для больших файлов Blob Storage использовался именно чтобы не передавать большие payloads между activities?

### 10.2 Cosmos DB / Blob Storage / Terraform

1. Cosmos DB partition key ты выбирал сам или использовал existing architecture pattern?
2. Можешь безопасно назвать пример partition key без confidential details?
3. Cosmos DB использовалась для чего: sync state, change records, product records, config, logs, temporary records?
4. Blob Storage path/naming был примерно по operationId/locale/date?
5. Были ли cleanup/lifecycle rules для intermediate files?
6. Terraform: ты писал новые modules или использовал existing modules и добавлял resource/config?
7. `terraform apply` ты запускал сам на dev/test или только `plan`?
8. Secrets/env vars через Terraform менял?

### 10.3 Production incident / customer notification flow

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

### 10.4 Redis caching / performance

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

### 10.5 React / Next.js / GraphQL

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

### 10.6 PostgreSQL / Factor–IT

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

### 10.7 Vacation payment calculation

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

### 10.8 Custom PHP framework

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

### 10.9 AI Job Assistant / portfolio

1. Добавляем AI Job Assistant в CV уже сейчас или сначала доводим до portfolio-ready?
2. README сейчас достаточно понятный для запуска?
3. Есть `.env.example`?
4. Есть docker-compose для PostgreSQL/backend?
5. Есть screenshots или API examples?
6. GitHub Actions запускается on push, on PR или оба?
7. OpenAI API: structured output или prompt + JSON parsing?
8. Дедупликация уже рабочая?
9. Draft workflow уже рабочий: raw job → extraction → draft → edit → accept?
10. Для CV лучше писать `personal project` или `portfolio project in active development`?

### 10.10 Финальные решения для CV skills

Ответить коротко `да / нет / зависит`:

1. PHP оставляем только в Experience, не в top skills?
2. Docker добавляем только в Tools / Personal projects, не в core?
3. Python/FastAPI добавляем только в Personal Projects / Additional?
4. React/Next.js добавляем в skills только для fullstack вакансий?
5. GraphQL оставляем как `working experience`, не core?
6. Terraform оставляем как `configuration support`, не DevOps skill?
7. Kubernetes полностью убираем из CV?
8. MongoDB убираем из CV?
9. NestJS/Express убираем из CV, кроме internship line?
10. OpenAI API добавляем только для AI-friendly backend roles?

---

## 11. Current recommendation

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

Альтернатива для AI-friendly вакансий:

```text
Backend-focused TypeScript Developer | Node.js/Azure | PostgreSQL | Personal FastAPI & AI Integration Projects
```

Что держать в top skills for main backend CV:

```text
Node.js, TypeScript, Azure Functions, Azure Durable Functions, REST APIs, Cosmos DB, Azure Blob Storage, Redis, PostgreSQL, Jest, SonarQube, Azure DevOps, Azure Application Insights, KQL
```

Что держать как secondary / portfolio:

```text
Python, FastAPI, SQLAlchemy, Alembic, Pytest, Docker, GitHub Actions, OpenAI API, LangGraph, Qdrant, RAG basics
```

Что обычно не ставить в core:

```text
PHP, Kubernetes, MongoDB, Express, NestJS, Docker, Python, AI/RAG
```

Итог по positioning: **apply** для Node.js/TypeScript backend, backend-focused fullstack, Azure/serverless, API integration, e-commerce, SQL-heavy backend roles. **Maybe** для Python/FastAPI or AI integration roles only when Python/AI is secondary. **Skip** для Kubernetes/DevOps-only, PHP-only, pure frontend, German C1/fluent customer-facing roles, pure AI/ML Engineer roles.
