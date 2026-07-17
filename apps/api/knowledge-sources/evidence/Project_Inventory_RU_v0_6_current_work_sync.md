# Project Inventory RU — Case Map


## Update v0.6 — current independent work / JobFlow case added

This update supersedes the older `Career Break — Relocation, May 2025 – Feb 2026` as the main external timeline framing. Current external framing should be **Current Independent Work & Portfolio Projects, May 2025 – Present** and should be kept in every external CV/PDF/HTML output to close the post-EPAM gap.

---

## 18. Current Independent Work & Portfolio Projects

1. **Название case:** Current Independent Work & Portfolio Projects
2. **Тип case:** timeline / gap-closing / light professional activity; not a single commercial project
3. **Контекст:** relocation to Germany, small freelance / independent Node.js/React tasks, portfolio projects, structured upskilling. Volunteering is a separate market-dependent supporting signal.
4. **Период:** May 2025 – Present
5. **Почему важен для external CVs:** закрывает post-EPAM timeline gap для Germany / remote EU, Ukraine / Ukrainian-market, generic CV и no-specific-role CV; показывает активность, remote readiness from Germany and continued backend development. Local integration через volunteering особенно полезен для Germany / Cologne, но сам volunteering bullet market-dependent.
6. **Основной стек:** Node.js, React, NestJS, TypeScript, PostgreSQL, Prisma, Docker, OpenAI API, FastAPI/Python as secondary personal-project angle.
7. **Что доказывает:** active development after relocation, self-directed engineering discipline, current backend learning, portfolio ownership; does not replace EPAM commercial production evidence.
8. **Потенциальный CV description line:** `Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.` This is a description line after dates, not a bullet. Volunteering, if included, should be a separate bullet.
9. **Сила case:** medium as timeline/gap-closing; low-medium as technical evidence; EPAM remains primary evidence.
10. **Что уточнить:** freelance clients/scope/payment/references [needs evidence]. Until confirmed, use only `small Node.js/React improvements on an independent basis`.

Safe bullet:

```text
Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
```

Unsafe / do not claim:

- full-time freelance backend engineer
- enterprise freelance clients
- commercial AI platform delivery
- major product ownership for freelance clients
- production client systems without evidence

---

## 19. JobFlow CV Pipeline

1. **Название case:** JobFlow CV Pipeline
2. **Тип case:** personal / portfolio backend-first AI tooling project
3. **Компания / контекст:** personal GitHub project; current portfolio project for AI-assisted CV/vacancy workflow automation
4. **Период:** June 2026 – Present
5. **Почему важен для Германии / remote:** current hands-on NestJS/TypeScript backend evidence; shows structured thinking, AI tooling awareness, documentation-driven engineering and anti-overclaiming discipline.
6. **Основной стек:** NestJS, TypeScript, PostgreSQL, Prisma, Docker, OpenAI API, AI Provider Abstraction, Swagger/OpenAPI
7. **GitHub:** https://github.com/strakhovdenya/jobflow-cv-pipeline
8. **Что доказывает:** current backend practice, modular architecture, AI-assisted workflow design, evidence-based claim validation, deterministic document export, token/cost tracking, reproducibility.
9. **Потенциальный CV angle:** `Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export.`
10. **Сила case:** medium-high as current portfolio evidence; not commercial production.
11. **Что уточнить:** completeness, tests, deployed demo, README/screenshots, CI status, real usage beyond personal workflow [needs evidence].

Safe details:

- Human-in-the-loop pipeline with mandatory review gates after each AI step.
- Evidence Guard module flags unsupported CV claims using a structured knowledge base with evidence levels.
- Deterministic backend HTML-to-PDF export with predictable output and no AI tokens used for export.
- AI usage tracking by run, prompt type, token count and estimated cost.
- Modular NestJS architecture with Workspace, Artifact Storage, Prompt Pipeline, AI Provider Abstraction, Evidence Guard and Document Export modules.
- Prompt versioning with input hashes, source snapshots, artifact traceability and explicit KnowledgeSource selection.

Safe CV bullets:

```text
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export.
- Implemented human-in-the-loop AI workflow concepts, Evidence Guard, prompt versioning, artifact traceability, token/cost tracking and backend HTML-to-PDF export without AI token usage.
```

Do not claim:

- commercial production AI product
- enterprise/client adoption
- ML engineering, MLOps or model training
- fully autonomous CV generation without human review
- production-grade distributed queue implementation until Redis/BullMQ migration is actually implemented

---

## Update v0.5 — consistency sync

- External name decision: use **Denys Strakhov** everywhere.
- ProductsUp changed records source is confirmed: **Cosmos DB container / Cosmos DB change records**. Remaining unknowns are exact container/schema/retention details.
- Streamlit is confirmed as personal/project UI for **AI Job Assistant**; keep it in personal/portfolio evidence only.
- Treat old v0.3/v2.0 files as archive; active sources should use v0.6/v2.3 current-work-sync naming.

Основа: `Master_CV_RU_v0_6_current_work_sync.md`. Под “проектом” здесь понимается career case — значимый блок опыта, который можно использовать в CV, LinkedIn, cover letter или на интервью.

---

## Update v0.4 — cases added from LinkedIn profile MD

Profile linkedIn MD draft был использован как публичный LinkedIn draft, а не как главный evidence source. В inventory добавлены только новые useful cases и context blocks.

---

## 15. Career Break — Relocation / Germany transition

1. **Название case:** Career Break — Relocation to Germany
2. **Тип case:** timeline/context; not technical evidence
3. **Компания / контекст:** relocation from Ukraine to Germany; active job-market preparation
4. **Период:** May 2025 – Feb 2026
5. **Почему важен для Германии:** объясняет gap после EPAM и показывает proactive upskilling, local integration and German-market preparation.
6. **Основной стек:** not applicable; related learning/projects: FastAPI, PostgreSQL, Next.js, Supabase, OpenAI API, GitHub Actions, certifications, German practice
7. **Что доказывает:** не commercial production, а proactive transition period: relocation, upskilling, portfolio projects, certifications.
8. **Потенциальный CV angle:** использовать только если нужно объяснить gap; для LinkedIn можно отдельным Experience block.
9. **Сила case:** medium as timeline explanation; low as technical evidence
10. **Что уточнить:** exact relocation dates / legal-work authorization wording already handled in Master CV; final CHI/EPAM date consistency [needs evidence for CHI Sep/Oct only]

---

## 16. Email Camp

1. **Название case:** Email Camp — camp letter tracking and notification system
2. **Тип case:** personal full-stack project
3. **Компания / контекст:** personal project; letter tracking/delivery workflow for camps
4. **Период:** Sep 2024 – Nov 2025 according to LinkedIn draft; confirm exact active dates if used externally [needs evidence]
5. **Почему важен для Германии:** useful supporting portfolio for backend-focused fullstack roles: Next.js, TypeScript, Supabase/PostgreSQL, email integration, deployment.
6. **Основной стек:** Next.js 14 App Router, TypeScript, Supabase/PostgreSQL, RLS, Storage, React Query, TailwindCSS, Resend API, Vercel
7. **Что доказывает:** personal end-to-end product thinking, full-stack delivery, email API integration, basic architecture separation, deployment.
8. **Потенциальный CV angle:** `Personal full-stack project for camp letter tracking, photo uploads, delivery statuses and automated email notifications using Next.js, Supabase/PostgreSQL and Resend.`
9. **Сила case:** medium for fullstack roles; low-medium for backend-only roles
10. **Что уточнить:** production users vs demo only, auth model, RLS details, deployed URL, README/screenshots, tests [needs evidence]

---

## 17. Cards — Language Learning App

1. **Название case:** Cards — Language Learning App
2. **Тип case:** personal full-stack project
3. **Компания / контекст:** personal language-learning project
4. **Период:** Aug 2024 – Present according to LinkedIn draft; confirm exact status if used externally [needs evidence]
5. **Почему важен для Германии:** supports fullstack/React/Next.js positioning and shows local integration motivation through language learning; not a core backend case.
6. **Основной стек:** Next.js 14 App Router, TypeScript, Supabase/PostgreSQL/Auth/Storage, React Query, TailwindCSS, Vercel
7. **Что доказывает:** personal full-stack work, UX/product initiative, auth/storage exposure, demo/guest mode, multilingual UI.
8. **Потенциальный CV angle:** `Personal language-learning app with flashcards, trainer modes, guest/demo access and multilingual UI using Next.js, TypeScript and Supabase.`
9. **Сила case:** low-medium for backend roles; medium for backend-focused fullstack roles
10. **Что уточнить:** real usage, auth/RLS details, tests, architecture, current demo status [needs evidence]

---

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
8. **Потенциальный CV angle:** daily/manual product sync for 18+ locales using Durable Functions, CommerceTools enrichment, CSV/ZIP and Azure Storage.
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

## 11. AI Job Assistant

1. **Название case:** AI Job Assistant
2. **Тип case:** personal project
3. **Компания / контекст:** personal project / active development; job search automation
4. **Период:** [needs evidence]
5. **Почему важен для Германии:** показывает актуальные skills: FastAPI, PostgreSQL, AI extraction, GitHub Actions, OpenAI API; полезно как portfolio.
6. **Основной стек:** Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pytest, Docker, GitHub Actions, OpenAI API, Streamlit
7. **Что доказывает:** самостоятельный end-to-end backend project, AI integration, tests, CI, ownership.
8. **Потенциальный CV angle:** personal backend/AI project for raw job ingestion, deduplication, AI extraction and draft workflows.
9. **Сила case:** medium-high
10. **Что уточнить:** current completeness, README, screenshots, demo flow, coverage, CI badge, architecture diagram [needs evidence]

---

## 12. AI Bootcamp RAG Service

1. **Название case:** AI Bootcamp RAG Service
2. **Тип case:** personal project
3. **Компания / контекст:** learning / personal AI backend project
4. **Период:** [needs evidence]
5. **Почему важен для Германии:** useful nice-to-have для backend roles with AI integrations, but not commercial AI/ML evidence.
6. **Основной стек:** Python, FastAPI, LangGraph, Qdrant, OpenAI API, Docker, Streamlit
7. **Что доказывает:** basic hands-on RAG, vector retrieval, LLM workflow orchestration, wrapping AI workflow into API.
8. **Потенциальный CV angle:** built FastAPI RAG service using LangGraph, Qdrant, OpenAI embeddings/generation and tool-calling.
9. **Сила case:** medium
10. **Что уточнить:** project polish, README, runnable demo, limitations, whether suitable for portfolio [needs evidence]

---

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

---

# Второстепенные 3 кейса

1. **Vacation payment calculation** — хороший business logic case, но старый стек PHP и нужны details.
2. **Custom PHP framework / backend core** — полезен для architecture/core thinking, но не должен уводить профиль в PHP.
3. **AI Bootcamp RAG Service** — хороший nice-to-have для AI integration, но не commercial evidence.

---

# Кейсы, которые лучше не выносить в основной CV, но держать для интервью

1. **Viber bot schedule system** — good initiative story, но слабее для professional CV, если мало места.
2. **AI Bootcamp RAG Service** — можно использовать в portfolio/GitHub, но осторожно в CV, чтобы не выглядеть как AI/ML Engineer.
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
