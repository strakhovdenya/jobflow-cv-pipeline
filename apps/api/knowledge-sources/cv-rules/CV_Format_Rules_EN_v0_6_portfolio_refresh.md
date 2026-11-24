# CV Format Rules EN

## v0.6 — portfolio refresh (2026-11-24)

This is the active version of the CV rules. It replaces v0.5 as a whole instead of adding to it: the earlier "Update v0.x" layers and outdated recommendations were removed from this file, and their history stays in v0.5 and older.

- **Project evidence:** only the `portfolio-registry` block of the active `project_inventory`. A project may appear in a CV only if its registry entry has `cvEligible: true`. Archived projects and projects without verified implementation never appear in any section.
- **Credential evidence:** only the `credential-registry` block of the active `certifications`.
- **Skill classes and the three AI categories** (A — AI-assisted Software Engineering, B — AI Integration & Agent Workflow Engineering, C — Agent Development Training): the active `tech_stack`.
- **Summary variants A/B/C and the AI evidence order:** the active `profile_summary`, section 1.
- **Commercial experience** (EPAM, Factor–IT, CHI: companies, roles, dates, facts) does not change. Portfolio technologies and training never go into an employer entry.

---

## 1. Purpose

Use the layout reference PDF as a visual and structural reference only, never as a factual source. Facts, claims, skills, metrics, seniority, dates and wording come from the active knowledge sources: `master_cv`, `profile_summary`, `tech_stack`, `project_inventory`, `career_cases`, `certifications`, `linkedin_source_decision`.

The goal is a targeted CV for Software Engineer, Backend Developer and Backend-focused Full-stack Developer roles in Germany and remote EU, in which commercial experience leads and portfolio projects and training are chosen by what the vacancy needs.

---

## 2. Evidence boundaries

| Class | What it is | Where it may appear |
|---|---|---|
| Commercial | EPAM, Factor–IT (CHI only as internship exposure) | headline, Summary first sentence, Top Skills, employer entries |
| Personal project | implementation in a `cvEligible` registry project | Current Independent Work, Selected Projects, labelled skills group, Summary after the commercial sentence |
| Training | `cvEligible` credential from `credential-registry` | Certifications, the training option of the third Current Independent Work bullet, Summary only as the last AI item |

- Commercial stays commercial, personal stays personal, training stays training. A personal implementation never makes a skill commercial; a course or badge never makes it project or work experience.
- A fact without evidence stays out of the CV. Internal evidence labels never appear in public text.
- Claude Code and OpenAI Codex are practical development tools backed by Dark Factory, JobFlow and Home Budget (AI category A/B). The OpenAI API runs inside the JobFlow application (category B). Keep the two uses apart: never merge them into one vague "AI" claim.
- Google ADK is an earned **skill badge** with supporting labs (category C). Labs are training in a Google-provided environment, never professional certifications and never production deployment of agents.

---

## 3. Layout Rules

Two-column layout where possible.

**Left column** — visually stable, a quick recruiter scan area, not a skills dump: Contact, Top Skills (8–10 items), Languages (honest levels), Certifications (3–5 items); optional Work Authorization, GitHub.

**Main column:** Name, Headline, Summary, Current Independent Work & Portfolio Projects, Experience, Education, optional Selected Projects, optional Volunteering. The main column prioritizes recent commercial backend experience.

---

## 4. Page Count Rules

- Ideal: 2 pages. Acceptable: 3 pages only for a strong enterprise/backend/cloud/e-commerce match. Avoid: 4 pages.

If the CV does not fit into 2 pages, shorten in this order:

1. Summary (stay within 60 words minimum)
2. Certifications
3. Additional Information
4. CHI Software details
5. Early PHP experience
6. Selected Projects details (fewer bullets, then fewer entries)
7. Secondary skills
8. Older or non-target bullets

Never shorten EPAM core production bullets before shortening Current Independent Work details and Selected Projects. Do not shrink the font to force content into 2 pages.

---

## 5. Stable CV Skeleton

### Contact

Cologne, Germany · Phone · Email · LinkedIn · GitHub · Authorized to work in Germany

### Top Skills

Top Skills take only names that are **commercial** in the active `tech_stack`. Personal and training technologies never go into Top Skills.

Default Backend: Node.js, TypeScript, Azure Functions, Azure Durable Functions, REST APIs, PostgreSQL, Cosmos DB, Redis, Jest, Azure Application Insights

Backend-focused Full-stack: Node.js, TypeScript, Azure Functions, REST APIs, React, Next.js, BFF/API layer, PostgreSQL, Jest, Azure Application Insights

AI-assisted / AI-friendly Backend: same commercial list as Default Backend. AI tools go into a separate, labelled skills group, never into Top Skills:

```text
AI-assisted engineering (personal projects): Claude Code, OpenAI Codex, OpenAI API, LLM call policy (retries, timeouts, output-token limits), structured output validation, BullMQ/Redis job queues, sandboxed coding agents with least-privilege permissions, GitHub Actions
```

Add this group only when the vacancy mentions AI; it always stands after the commercial skills. ADK and MCP stay in Certifications, not in skills.

### Languages

- Ukrainian — Native
- Russian — Native
- English — B1/B1+, used professionally
- German — A2/B1, actively improving

---

## 6. Headline

```text
Default:            Backend-focused TypeScript Developer | Node.js | Azure Functions | REST APIs | PostgreSQL
E-commerce:         Backend Developer | Node.js/TypeScript | E-commerce Integrations | CommerceTools | Amplience | Azure
Azure/serverless:   Backend Developer | TypeScript | Azure Functions | Durable Functions | Serverless Workflows | APIs
Full-stack:         Backend-focused Fullstack Developer | Node.js | TypeScript | Azure Functions | React/Next.js | PostgreSQL
```

The headline stays commercial for every vacancy, including AI-assisted and AI-friendly ones (Summary C): AI evidence goes into the Summary, Current Independent Work, Selected Projects and Certifications, not the headline. The headline never names a personal project, a training credential or an AI job title, and never uses a stop-list phrase (section 7).

---

## 7. Summary Rules

- Use the variant from the active `profile_summary` (section 1) chosen by vacancy family: **A** — backend Node.js/TypeScript, NestJS, Azure/production, database/financial, Python as a plus; **B** — React/Next.js and backend-focused full-stack; **C** — AI-assisted engineering, developer productivity, AI/LLM integration and agent workflows. AI only as a plus: A or B with one short AI-assisted development clause. No AI mention: A or B without it.
- 60–90 words, one paragraph, adapted to the vacancy by narrowing the facts the variant already contains; never add facts the sources do not support.
- The **first sentence is about commercial experience** (EPAM Node.js/TypeScript/Azure, or Node.js/TypeScript + React/Next.js). Portfolio projects and training come after it.
- AI evidence order: commercial foundation → Claude Code / OpenAI Codex and Dark Factory → JobFlow AI integration → Google ADK skill badge. The ADK badge moves forward only when the vacancy explicitly requires ADK or Google agent tooling, and even then it is training, never production or commercial ADK experience.
- The Summary never lists all five projects and never names a project that is not `cvEligible`. A portfolio fact goes into the Summary only if it covers a vacancy requirement that commercial experience does not cover, or covers more weakly.
- The Summary names a fact in one short clause; the section that carries the proof (the JobFlow bullet, a Selected Projects entry) gives the mechanism and does not repeat the Summary's phrase. Example: if the Summary says the work is checked by an independent verifier before a human merge, the Dark Factory entry shows the sandbox, the agent's Git boundary and the verdict computed by code instead.

### Stop-list — Summary and headline

Never use these phrases in the Summary or headline:

- `Passionate about technology`
- `Always learning`
- `AI enthusiast`
- `Highly motivated developer`
- `Expert in artificial intelligence`
- `Experienced ML engineer`
- `Production-grade autonomous AI architect`

Internal evidence terms never reach any public field: `evidenceClass`, `needs evidence`, `personal_verified` (and the other registry field names and class values). Avoid any generic "AI expertise" claim: name the concrete tool, project or credential instead.

---

## 8. Current Independent Work & Portfolio Projects

The block is **mandatory** in every external CV/PDF/HTML output (Germany / remote EU, Ukraine / Ukrainian market, generic and no-specific-role CVs). It closes the post-EPAM timeline gap and shows continued hands-on development. It never competes with EPAM as the primary commercial evidence and is never removed because of market, page fit or weak role relevance; if space is tight, shorten inside the block.

Placement: Header / Summary / Skills → **Current Independent Work & Portfolio Projects** (compact, 4–5 bullets) → EPAM Systems → Factor–IT → CHI Software → Education / Certifications / Selected Projects / Volunteering.

### Stable block template

```text
CURRENT INDEPENDENT WORK & PORTFOLIO PROJECTS
Freelance Software Development, Backend Portfolio Projects & Relocation
May 2025 – Present · Cologne, Germany · Remote

Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects and continued learning.

- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- Built JobFlow CV Pipeline, a NestJS/TypeScript and PostgreSQL application with OpenAI integration, BullMQ/Redis background jobs, human review gates, checks that flag unsupported CV claims and deterministic PDF export.
- [third bullet: one concrete fact chosen for the vacancy — options below]
- Volunteered as IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

Always keep, unchanged: section title, role line, `May 2025 – Present`, `Cologne, Germany`, the stable intro line after the dates (it is not a bullet), and the small-tasks bullet in exactly the wording above. Where another active source quotes an older form of this template or of the third-bullet options, this section wins.

### JobFlow bullet

JobFlow CV Pipeline is the only project with `placement: current_work_block`. It is always one bullet here and never repeated in Selected Projects. Take the wording from its `allowedWording` in the registry and pick the facet the vacancy needs:

- **Backend / Node.js / NestJS:** NestJS/TypeScript, PostgreSQL/Prisma, REST API with Swagger/OpenAPI, background jobs, deterministic PDF export.
- **AI/LLM integration:** OpenAI API behind a provider abstraction, BullMQ/Redis background jobs for LLM steps, explicit LLM call policy (retries only for 429/5xx, no retry after a timeout, per-step output-token limits), typed errors for truncated, refused or empty answers, human review gates.
- **Full-stack / UI:** the Next.js dashboard for reviewing AI-generated drafts, tracking workflow progress and exporting PDFs. It is evidence of a workflow review interface only — never of financial dashboards, charts, data visualisation or large data tables.

The JobFlow bullet describes the application. How it is developed with Claude Code belongs to the Dark Factory entry when Dark Factory is selected; otherwise, for an AI-mentioning vacancy, the JobFlow bullet may end with "developed with Claude Code under human review".

### Third bullet — one concrete fact chosen for the vacancy

Choose exactly one option. It must not restate an entry in Selected Projects; if the best option would, take the next most relevant one.

| Vacancy | Third bullet |
|---|---|
| AI-assisted engineering, developer productivity, AI/LLM integration, agents | `Completed Google Cloud hands-on labs on agent development with ADK, covering tool-enabled agents, multi-agent systems and deployment to Agent Runtime, alongside ongoing development with Claude Code and OpenAI Codex.` Drop the closing clause if the Summary and Selected Projects already name Claude Code and OpenAI Codex. |
| Backend Node.js/TypeScript, Azure / production, database / financial (default) | `Deepened Node.js engineering through LinkedIn Learning courses on scaling, testing, security and design patterns.` |
| React/Next.js as a secondary requirement, or a full-stack vacancy where neither B1 Kompass nor Cards fits into Selected Projects | `Built two publicly available Next.js/TypeScript applications on Supabase PostgreSQL, including a German exam-practice app with SQL migrations and Playwright end-to-end tests in CI.` |
| Python/FastAPI as a plus | `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".` |

Training stays training in this bullet: it says what was completed, never that it was used at work or in production.

### Volunteering

A separate, market-dependent bullet, never merged into another bullet. Germany / remote EU: usually include as a local integration signal. Ukraine / Ukrainian market: case by case. It is not developer evidence. If it is omitted, keep 4 bullets by adding a second relevant third-bullet option or a second JobFlow facet; never pad with repeated content.

### Safety

Do not claim:

- full-time freelance employment
- named clients, client impact or business results of the small tasks
- production client systems
- commercial production experience with NestJS, FastAPI or the OpenAI API
- users of JobFlow other than the owner
- queue throughput or load metrics

---

## 9. Vacancy-aware evidence selection

### 9.1 Coverage, not topic

Commercial experience comes first. EPAM and Factor–IT bullets that cover a vacancy requirement are never displaced by a portfolio project. A portfolio project is selected only because it demonstrates an important requirement that commercial evidence does not already cover sufficiently — not because it shares a topic with the vacancy. Never list all five projects; most CVs carry zero to two Selected Projects entries.

### 9.2 Registry fields

| Field | Meaning in selection |
|---|---|
| `cvEligible` | the **only** permission to appear in a CV; `false` means never, in any section |
| `portfolioPriority` | visibility priority only; it grants no permission and does not decide selection |
| `placement` | the CV section: `current_work_block` (JobFlow) or `selected_projects` |
| `roleFamilies` | the vacancy families a project is relevant to; a project is a candidate only if its families match the vacancy's |

Selection: `cvEligible: true` → `roleFamilies` match the vacancy → coverage test (9.1) → the CV section given by `placement`. Facts and wording come from the entry's `allowedWording`; nothing from its `prohibitedClaims` is ever stated.

### 9.3 AI weight

Decide how much the vacancy weighs AI from the whole vacancy (must-have, nice-to-have, responsibilities) and the Prompt 1 analysis.

| AI weight | Summary | Selected Projects | Skills group / Certifications |
|---|---|---|---|
| **Core** — `ai_assisted_engineering` / `developer_productivity` / `ai_integration` is a must-have, a main responsibility or the role title | C | Dark Factory (`must_show`) for AI-assisted engineering and developer productivity; for AI/LLM integration only when the vacancy also asks for coding agents or AI tooling | AI-assisted engineering group; ADK badge and AI courses |
| **Plus** — AI in nice-to-have or responsibilities ("you use AI tools daily") | A or B + one AI-assisted development clause | Dark Factory as one compact bullet only if the vacancy names AI coding tools and a slot is free without displacing a commercial bullet; otherwise none | AI-assisted engineering group optional; at most one AI credential |
| **Not mentioned** | A or B, no AI clause | none | no AI group; no AI credential |

### 9.4 Expected selection by vacancy family

| Vacancy family | Leading evidence | Selected Projects | Do not include | Certifications (3–5) | Third bullet | Summary |
|---|---|---|---|---|---|---|
| Backend Node.js/TypeScript (`backend_node`, `nestjs`) | EPAM (Node.js/TS, Azure Functions, integrations, Jest), Factor–IT (SQL), JobFlow bullet (NestJS/PostgreSQL facet) | none; Home Budget only if the vacancy requires data-integrity or money-handling logic that commercial experience does not cover | Dark Factory, Cards, B1 Kompass, ADK badge | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud; + Advanced Node.js: Scaling Applications or Node.js: Design Patterns if mentioned | Node.js courses | A |
| AI-assisted SE / Developer Productivity (`ai_assisted_engineering`, `developer_productivity`) | EPAM, Dark Factory, JobFlow (AI integration facet) | Dark Factory (`must_show`) | Cards, Home Budget; B1 Kompass as a separate entry (it appears only as a Dark Factory consumer inside the Dark Factory entry) | Engineer AI Agents with Agent Development Kit (ADK) (skill badge); Claude Code 101; Model Context Protocol: Advanced Topics; + one Node.js course | Google ADK labs | C |
| AI/LLM integration in a backend role (`ai_integration`) | EPAM, JobFlow (AI integration facet) | none; Dark Factory only if coding agents or AI tooling are also asked for | Cards, Home Budget | Build a JavaScript AI App with React and the OpenAI API; Model Context Protocol: Advanced Topics or Introduction to Model Context Protocol; ADK badge if agents are mentioned; + one Node.js course | Google ADK labs | C |
| React/Next.js full-stack (`fullstack_react`) | EPAM React/Next.js/BFF/GraphQL, JobFlow (dashboard facet) | B1 Kompass; Cards only if a requirement stays uncovered after B1 Kompass | Dark Factory, ADK badge | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud; Build a JavaScript AI App with React and the OpenAI API only with an AI requirement | Node.js courses (the full-stack option only if no full-stack project is selected) | B |
| Database / financial backend (`database_financial`) | Factor–IT (PostgreSQL, migrations, financial logic), EPAM | Home Budget | Dark Factory, Cards, ADK badge | System Design in Cloud; Node.js: Testing and Code Quality; Node.js: Security | Node.js courses | A |
| Azure / production backend (`azure_production`) | EPAM (Azure Functions, Durable Functions, integrations, Application Insights/KQL) | none | every Selected Projects entry; JobFlow stays only as its Current Independent Work bullet | System Design in Cloud; Node.js: Security; Node.js: Testing and Code Quality | Node.js courses | A |
| Python/FastAPI as a secondary plus (`python_secondary`) | EPAM, Factor–IT | none (no `cvEligible` Python project) | every project that is not `cvEligible`; any Python project claim | FastAPI - The Complete Course 2026 (Beginner + Advanced); then Node.js courses by relevance | FastAPI course | A |

In every vacancy: archived projects never appear; JobFlow stays in Current Independent Work and never in Selected Projects; the Current Independent Work block is present; EPAM and Factor–IT bullets that cover the vacancy are not displaced.

### 9.5 Selected Projects entries

- Entry format: exact registry `title`, "Personal project", the public repository link (`repositoryUrl`); a deployment link only where the registry has a public `deployment.url` (Cards, B1 Kompass). Home Budget is a private single-owner app: never a deployment or demo link, never users.
- 1–2 bullets per entry, from the entry's `allowedWording`; never anything from its `prohibitedClaims`.
- **Dark Factory** is a standalone, versioned Node.js package in its own repository (`github.com/strakhovdenya/dark-factory`), not a part of JobFlow. The AI-assisted delivery workflow was first built while developing JobFlow and was extracted into this package in Oct 2026; JobFlow, Cards and B1 Kompass are its consumer repositories (B1 Kompass uses the verifier and spec approval, not Ralph). Home Budget uses a separate Codex-native workflow and is not a Dark Factory installation. Describe the agent's Git boundary exactly: it may read repository state (`git status`, `git diff`, `git log`, and `git show` on review passes) but cannot commit, push or call the GitHub CLI; the controller commits, pushes and opens the pull request. Never "no Git access", never auto-merge.
- Dark Factory wording by depth: compact (default) — the two compact `allowedWording` lines; detailed (vacancies about coding agents or AI tooling) — the versioned-package and reuse lines. Lead with what an employer checks: scoped GitHub Issues with acceptance criteria, implementation with Claude Code, independent Codex-based verification before a human merge.

### 9.6 Certifications

- Only `cvEligible` entries of `credential-registry`; labs, learning paths, assessments and in-progress items never appear as a credential anywhere.
- **3–5 entries chosen by relevance to the vacancy, not by date and not to fill space**; fewer only when fewer are relevant. The table in 9.4 is the default; the full family table is section 2.2 of the active `certifications`.
- Copy the `title` (or one of its `aliases`) verbatim with issuer and year. The ADK entry is always a skill badge: `Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge, 2026`, never a certification.
- AI only as a plus: at most one AI credential. No AI mention: none.
- A credential supports a skill; it never proves commercial, production or project experience.

---

## 10. Experience Rules

### EPAM Systems

The main recent commercial evidence. 6–8 bullets for a 2-page CV; 8–10 only for a 3-page strong match.

Choose bullets by vacancy: Azure/serverless — Azure Functions, Durable Functions, Blob Storage, Cosmos DB, Application Insights; integrations — REST APIs, Amplience, CommerceTools, ProductsUp; e-commerce — multi-locale platform, product data, content workflows, product synchronization; production/reliability — Application Insights, KQL, logs, incident investigation, retries, idempotency; full-stack — React, Next.js, BFF/API layer, GraphQL working experience.

Safe EPAM bullet patterns:

- Built and maintained production backend services using Node.js, TypeScript and Azure Functions.
- Worked with Azure Durable Functions for long-running backend workflows, including product synchronization flows with retries, idempotency and per-locale result logging.
- Integrated Amplience, CommerceTools and ProductsUp to support content workflows, product data retrieval and downstream product synchronization.
- Automated selected Amplience CMS workflows using webhook-based Azure Functions, validation, logging, retries and cache updates.
- Worked with CommerceTools product data for PDP, listing, BFF/backend and product synchronization flows, handling product attributes, filters, optional/empty values, pagination where supported and batching where needed.
- Investigated production issues using Azure Application Insights and KQL, tracing failures across Azure Functions, BFF layers and backend services.
- Wrote and maintained backend unit tests with Jest and worked within SonarQube quality gates.
- Collaborated with frontend, QA, BA, Product Owners, DevOps and other service teams in a distributed engineering environment.

Do not claim:

- sole architecture ownership
- full DevOps ownership
- full GraphQL platform ownership
- deep Kubernetes experience
- commercial Python/FastAPI production experience
- commercial AI experience

### Factor–IT

Supports backend maturity, SQL, data integrity and business logic. 3–5 bullets. Focus: PostgreSQL, SQL, financial/accounting system, complex business logic, migrations, data integrity, legacy backend maintenance. Avoid making the profile look PHP-only.

- Developed backend functionality for a production public-sector budget accounting system, focusing on PostgreSQL-heavy features, complex business logic, data migrations and legacy backend maintenance.
- Wrote complex SQL queries and worked with joins, subqueries, indexes, transactions and PostgreSQL migrations.
- Planned and executed high-risk data migrations across organization-specific databases, including validation steps and rollback planning where possible.
- Contributed to a custom in-house PHP backend framework, including database access, migrations, validation, permissions and routing.
- Supported production users through bug fixing, releases and legacy system maintenance.

### CHI Software

1–2 bullets maximum; shows the transition from PHP to Node.js, never production Node.js experience.

- Completed a full-time Node.js transition program focused on JavaScript/Node.js backend development, covering REST APIs, Express/NestJS basics, MongoDB, Docker basics and code review.

### Earlier PHP Experience

Only if space allows: 1–2 lines, or omit for a 2-page targeted CV. Never let it compete with the Node.js/TypeScript positioning.

---

## 11. Volunteering section

When volunteering is not already a Current Independent Work bullet and space allows (Germany/Cologne):

- Volunteer IT Technician helping refurbish donated laptops for school students in Cologne, including OS/software installation, testing and device preparation.

A local integration signal, not developer evidence. Never repeat it in both places.

---

## 12. Style Rules

Tone: clear, specific, production-oriented, evidence-based, no exaggeration.

Preferred verbs: Built, Maintained, Integrated, Automated, Implemented, Investigated, Supported, Collaborated, Contributed.

Bullet length: ideally 1 line, 2 acceptable, never 3+. Each bullet: action + technology or area + business/technical context + a metric only if confirmed.

Avoid generic bullets ("Worked on backend tasks", "Participated in development", "Improved performance", "Used cloud technologies", "Helped the team"). Prefer specific ones ("Built Azure Functions-based backend workflows for product/content integrations in a multi-locale e-commerce platform").

---

## 13. Content Safety Rules

### Keep stable

Name `Denys Strakhov`, location, contact details, work authorization, company dates, honest language levels, commercial Node.js/TypeScript/Azure positioning, PostgreSQL as strong backend foundation, Germany / remote EU target.

### Adapt per vacancy

Headline, Summary variant, Top Skills order, EPAM bullets, the JobFlow facet and the third Current Independent Work bullet, Selected Projects, Certifications, whether to include React/Next.js, whether to include Volunteering.

### Never as commercial core skills

Kubernetes, MongoDB, Express, NestJS, Python, FastAPI, OpenAI API, Claude Code, OpenAI Codex, Google ADK, MCP, Supabase, Drizzle ORM, Vitest, Playwright, Docker as production ownership. Use them only as personal project work, training or basic exposure, in their labelled place.

### Avoid PHP-only positioning

Keep PHP inside Factor–IT; emphasize PostgreSQL, migrations, data integrity and business logic; never put PHP in the headline or in Top Skills for Node.js/backend roles; never lead with old PHP experience.

### Avoid pure AI/Python positioning

Separate personal AI work and training from commercial backend experience.

Do not claim:

- commercial or production AI experience
- commercial Python production experience
- the job title AI Engineer or LLM Platform Engineer
- ML engineering or MLOps or model training
- fine-tuning or pretraining work
- production deployment of AI agents
- productivity or speed-up figures
- external users or team adoption of personal projects
- enabled auto-merge

### Avoid DevOps overclaiming

Say Azure DevOps CI/CD participation, Terraform configuration support, collaboration with DevOps.

Do not claim:

- DevOps ownership
- Kubernetes production experience
- infrastructure architecture ownership

---

## 14. Targeted CV Generation Checklist

1. Identify the vacancy family (9.4) and the AI weight (9.3).
2. Extract must-have, nice-to-have and responsibilities.
3. Choose the headline (section 6) and the Summary variant (section 7).
4. Select 8–10 commercial Top Skills.
5. Select EPAM bullets (6–8 for 2 pages), Factor–IT bullets (3–5), keep CHI short.
6. Build Current Independent Work: stable header and intro, small-tasks bullet, JobFlow facet, third bullet, volunteering by market.
7. Select Selected Projects by coverage, only `cvEligible`, never JobFlow.
8. Select 3–5 relevant `cvEligible` certifications.
9. Check that commercial, personal and training evidence are clearly separated and that no stop-list phrase or internal evidence term appears.
10. Check that no unsupported claim was added.

---

## 15. PDF Final Check Checklist

1. Page count: prefer 2 pages; 3 only if justified; never an accidental 4-page CV.
2. Visual: no cut-off text, broken bullets, orphan section titles, awkwardly broken email/LinkedIn, overlapping columns or compressed unreadable text.
3. Left column: contact visible, Top Skills commercial and not overloaded, languages honest, certifications relevant.
4. Main column: Summary within 60–90 words, Current Independent Work present, EPAM starts on page 1 if possible, recent experience dominates, older experience shorter.
5. Content: no invented facts or metrics, no inflated seniority, no commercial Python/FastAPI or AI claim, no Kubernetes/DevOps overclaim, no PHP-only impression, no archived project, JobFlow not repeated in Selected Projects.
6. Recruiter scan (10 seconds): Backend-focused TypeScript Developer; Node.js / Azure Functions / REST APIs; production e-commerce experience; PostgreSQL foundation; authorized to work in Germany; Cologne / remote EU availability.
7. File: correct filename, PDF opens, text selectable, links work, no hidden draft comments, no layout corruption.
