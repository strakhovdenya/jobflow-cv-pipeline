# CV Format Rules EN


## Update v0.3 — Current Independent Work block rules

**2026-07-02 clarification:** The `Current Independent Work & Portfolio Projects` block is mandatory for external CV/PDF/HTML outputs. Do not remove the block because of market, page-fit, or weak role relevance. If space is tight, shorten details inside the block before touching EPAM core commercial evidence. The volunteering bullet is market-dependent; the block itself is not.

Use the v0.6/v2.3 current-work source set as active sources:

- `Master_CV_RU_v0_6_current_work_sync.md`
- `Master_Profile_Summary_RU_v0_6_current_work_sync.md`
- `Tech_Stack_Matrix_RU_v2_3_current_work_sync.md`
- `Project_Inventory_RU_v0_6_current_work_sync.md`
- `Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md`
- `LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md`
- `LinkedIn_Certifications_Inventory_RU_EN_2026-06.md`

### Purpose of the current-work block

The current-work block exists to prevent the post-EPAM period from looking like an unexplained gap. It is mandatory in external CV/PDF/HTML outputs for Germany / remote EU, Ukraine / Ukrainian-market, generic CVs and no-specific-role CVs. It should show active software development, relocation context, small freelance/independent tasks, current portfolio projects and structured upskilling. Volunteering is a separate market-dependent supporting signal, not part of the mandatory engineering evidence. The block must not compete with EPAM as the primary commercial production evidence.

### Preferred placement in PDF CV

For most targeted CVs:

1. Header / Summary / Skills
2. **Current Independent Work & Portfolio Projects** — mandatory compact block, 4–5 bullets
3. **Professional Experience — EPAM Systems** — main commercial evidence
4. Factor–IT
5. CHI Software
6. Education / Certifications / Optional Projects / Volunteering if not already included and relevant

Do not start the CV with a large freelance/relocation block. Do not hide EPAM below a long personal-project section.

### Stable block template

```text
CURRENT INDEPENDENT WORK & PORTFOLIO PROJECTS
Freelance Software Development, Backend Portfolio Projects & Relocation
May 2025 – Present · Cologne, Germany · Remote

Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and continued learning.

- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export, with human-in-the-loop AI workflow concepts, Evidence Guard, prompt versioning, artifact traceability, token/cost tracking and backend HTML-to-PDF export without AI token usage.
- Continued Python/FastAPI backend learning through personal projects using PostgreSQL, SQLAlchemy, Pytest, OpenAI API and GitHub Actions.
- Volunteered as IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

### Tailoring rules for this block

This block is semi-fixed.

Always keep:

- Section title
- Role line
- Dates and location
- Description line after dates explaining relocation + continued active development; this line is **not a bullet**
- Cautious freelance wording: `small Node.js/React improvements on an independent basis`
- Current-work block itself; never omit it from external CV/PDF/HTML outputs

Allowed adaptation:

- Change 1–2 bullets to emphasize vacancy-relevant current evidence.
- Keep 4–5 bullets total.
- Use JobFlow as the main current portfolio project for Node/NestJS/AI-tooling roles.
- Use AI Job Assistant only as secondary Python/FastAPI/OpenAI personal evidence.
- Use Email Camp for backend-focused fullstack/Next.js roles.
- Use HEY, ALTER! volunteering for German/local/Cologne integration signal.
- For Germany / remote EU CVs, usually include the volunteering bullet as local integration signal.
- For Ukraine / Ukrainian-market CVs, decide the volunteering bullet case-by-case; if omitted, keep the current-work block and preserve 4–5 bullets with other safe current-work content.

### Variant bullets

#### Default backend

```text
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project for vacancy analysis, targeted CV generation, evidence-based claim validation and deterministic PDF export, with human-in-the-loop AI workflow concepts, Evidence Guard, prompt versioning, artifact traceability, token/cost tracking and backend HTML-to-PDF export without AI token usage.
```

#### Node.js / NestJS

```text
- Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project with modular service boundaries, PostgreSQL/Prisma persistence, Swagger/OpenAPI documentation and deterministic PDF export.
- Designed backend modules around Workspace, Artifact Storage, Prompt Pipeline, AI Provider Abstraction, Evidence Guard and Document Export.
```

#### AI tooling / developer productivity

```text
- Built JobFlow CV Pipeline, an AI-assisted backend workflow with human review gates, Evidence Guard, AI provider abstraction, prompt versioning, source snapshots and artifact traceability.
- Implemented token/cost tracking per AI run and deterministic backend HTML-to-PDF export without AI token usage.
```

#### Python / FastAPI secondary

```text
- Continued Python/FastAPI backend learning through personal projects using PostgreSQL, SQLAlchemy, Pytest, Docker, OpenAI API and GitHub Actions.
- Built AI Job Assistant, a personal FastAPI/PostgreSQL project for job ingestion, deduplication, AI-assisted extraction and automated review workflows.
```

#### Backend-focused fullstack

```text
- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- Built Email Camp, a personal full-stack letter tracking system using Next.js 14, Supabase/PostgreSQL, React Query, Resend email API and Vercel.
```

#### German / Cologne local signal

```text
- Continued German language practice and local integration through volunteering as an IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

### Safety rules

Do not claim:

- full-time freelance employment unless confirmed
- named clients or client impact without evidence
- commercial production NestJS/FastAPI/OpenAI experience
- enterprise AI platform usage
- ML/MLOps/model training
- implemented Redis/BullMQ migration until it is actually implemented

### Shortening priority

If a 2-page CV is tight, shorten in this order:

1. Remove optional GitHub link inside current-work block if GitHub is already in contact.
2. Keep JobFlow as one combined bullet rather than separate purpose/features bullets.
3. Do not merge Python/FastAPI learning and volunteering by default; volunteering is a separate bullet when included.
4. For Ukraine / Ukrainian-market CVs, omit the volunteering bullet if it distracts from the role, but keep the current-work block and maintain 4–5 bullets with safe current-work content.
5. Remove Email Camp unless fullstack/Next.js is relevant.
6. Never remove the current-work block itself.
7. Never remove EPAM core production bullets before shortening current-work details.

---

## Update v0.2 — active source set

Use the v0.6/v2.3 current-work-sync files as active sources. Treat older v0.3/v2.0 files and old PDFs as archive/reference only unless the user explicitly asks to compare versions.

## 1. Purpose

Use the current CV PDF as a visual and structural reference only.  
Do not use it as the main factual source.

Facts, claims, skills, metrics, seniority, dates and wording must come from the project sources:

- `Master_CV_RU_v0_6_current_work_sync.md`
- `Master_Profile_Summary_RU_v0_6_current_work_sync.md`
- `Tech_Stack_Matrix_RU_v2_3_current_work_sync.md`
- `Project_Inventory_RU_v0_6_current_work_sync.md`
- `Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md`
- `LinkedIn_Certifications_Inventory_RU_EN_2026-06.md`
- `LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md`

The goal is to generate targeted CV PDFs for Software Engineer, Backend Developer and Backend-focused Fullstack Developer roles in Germany and remote EU.

---

## 2. Layout Rules

Use a two-column CV layout where possible.

### Left Column

The left column should be visually stable and compact.

Recommended sections:

1. Contact
2. Top Skills
3. Languages
4. Certifications

Optional:

5. Work Authorization
6. GitHub

The left column should not become a full skills dump. It should act as a quick recruiter scan area.

Recommended maximum:

- Top Skills: 8-10 items
- Certifications: 3-5 items
- Languages: all relevant languages, but with honest levels

### Main Column

The main column should contain:

1. Name
2. Headline
3. Summary
4. Experience
5. Education
6. Optional Selected Projects
7. Optional Volunteering

The main column must prioritize recent commercial backend experience.

---

## 3. Page Count Rules

Target length:

- Ideal: 2 pages
- Acceptable: 3 pages only for strong enterprise/backend/cloud/e-commerce match
- Avoid: 4 pages for targeted applications

If the CV does not fit into 2 pages, shorten in this order:

1. Summary
2. Certifications
3. Additional Information
4. CHI Software details
5. Early PHP experience
6. Personal AI/Python project details
7. Secondary skills
8. Older or non-target bullets

Do not shrink font too much to force content into 2 pages. Prefer removing weaker content.

---

## 4. Stable CV Skeleton

### Left Column

**Contact**

- Cologne, Germany
- Phone
- Email
- LinkedIn
- GitHub
- Authorized to work in Germany

**Top Skills**

Adapt to the vacancy, but keep the core focused.

Default Backend version:

- Node.js
- TypeScript
- Azure Functions
- Azure Durable Functions
- REST APIs
- PostgreSQL
- Cosmos DB
- Redis
- Jest
- Azure Application Insights

Backend-focused Fullstack version:

- Node.js
- TypeScript
- Azure Functions
- REST APIs
- React
- Next.js
- BFF/API layer
- PostgreSQL
- Jest
- Azure Application Insights

AI-friendly Backend version:

- Node.js
- TypeScript
- Azure Functions
- REST APIs
- PostgreSQL
- FastAPI
- OpenAI API
- Pytest
- GitHub Actions
- Azure Application Insights

Only use the AI-friendly version when the vacancy mentions AI integrations as a plus.

**Languages**

- Ukrainian — Native
- Russian — Native
- English — B1/B1+, used professionally
- German — A2/B1, actively improving

**Certifications**

Include only relevant certificates. Do not overload this section.

---

## 5. Main Column Structure

### Header

Use a short, role-specific headline.

Default:

```text
Backend-focused TypeScript Developer | Node.js | Azure Functions | REST APIs | PostgreSQL
```

For e-commerce roles:

```text
Backend-focused TypeScript Developer | Node.js | Azure Functions | E-commerce Integrations | PostgreSQL
```

For backend-focused fullstack roles:

```text
Backend-focused Fullstack Developer | Node.js | TypeScript | React | Next.js | Azure Functions
```

For AI-friendly backend roles:

```text
Backend-focused TypeScript Developer | Node.js | Azure | FastAPI/OpenAI Personal Projects
```

---

## 6. Summary Rules

The Summary must be short and targeted.

Recommended length:

- 4-6 lines
- 2 short paragraphs maximum
- No long LinkedIn-style “About” text

Summary must include:

1. Role positioning
2. Main commercial stack
3. Recent production context
4. Strongest evidence for the vacancy
5. Germany/work authorization signal

Avoid:

- Long paragraphs
- Too many technologies
- Generic claims
- Overexplaining personal projects
- Mixing commercial and personal experience without separation

---

## 7. Experience Rules

### EPAM Systems

EPAM is the main recent commercial evidence.

Recommended length:

- 6-8 bullets for a 2-page CV
- 8-10 bullets only for a 3-page strong-match CV

Choose bullets based on the vacancy:

- Azure/serverless roles: Azure Functions, Durable Functions, Blob Storage, Cosmos DB, Application Insights
- Backend integration roles: REST APIs, Amplience, CommerceTools, ProductsUp
- E-commerce roles: multi-locale platform, product data, content workflows, product synchronization
- Production/reliability roles: Application Insights, KQL, logs, incident investigation, retries, idempotency
- Fullstack roles: React, Next.js, BFF/API layer, GraphQL working experience

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

- Sole architecture ownership
- Full DevOps ownership
- Full GraphQL platform ownership
- Deep Kubernetes experience
- Commercial Python/FastAPI production experience

### Factor-IT

Factor-IT should support backend maturity, SQL, data integrity and business logic.

Recommended length:

- 3-5 bullets

Focus on:

- PostgreSQL
- SQL
- financial/accounting system
- complex business logic
- migrations
- data integrity
- legacy backend maintenance

Avoid making the profile look PHP-only.

Safe Factor-IT bullet patterns:

- Developed backend functionality for a production public-sector budget accounting system, focusing on PostgreSQL-heavy features, complex business logic, data migrations and legacy backend maintenance.
- Wrote complex SQL queries and worked with joins, subqueries, indexes, transactions and PostgreSQL migrations.
- Planned and executed high-risk data migrations across organization-specific databases, including validation steps and rollback planning where possible.
- Contributed to a custom in-house PHP backend framework, including database access, migrations, validation, permissions and routing.
- Supported production users through bug fixing, releases and legacy system maintenance.

### CHI Software

Keep this short.

Recommended length:

- 1-2 bullets maximum

Purpose:

- Show transition from PHP to Node.js
- Do not sell it as production Node.js experience

Safe wording:

- Completed a full-time Node.js transition program focused on JavaScript/Node.js backend development, covering REST APIs, Express/NestJS basics, MongoDB, Docker basics and code review.

### Earlier PHP Experience

Use only if space allows.

Recommended length:

- 1-2 lines
- Or omit for 2-page targeted CVs

Do not let early PHP experience compete with recent Node.js/TypeScript positioning.

---

## 8. Optional Sections

### Selected Projects

Use only when relevant.

For AI-friendly backend roles:
Include AI Job Assistant as a personal project.

Safe wording:

- Personal FastAPI/PostgreSQL project for job ingestion, deduplication, AI-assisted extraction and draft workflows, using SQLAlchemy, Alembic, Pytest, GitHub Actions and OpenAI API.

Do not claim:

- Commercial AI production experience
- ML Engineer experience
- MLOps
- Model training

### Volunteering

Use if space allows or when applying in Germany/Cologne.

Safe wording:

- Volunteer IT Technician helping refurbish donated laptops for school students in Cologne, including OS/software installation, testing and device preparation.

Keep it short. It is a local integration signal, not developer evidence.

---

## 9. Style Rules

Tone:

- Clear
- Specific
- Production-oriented
- Evidence-based
- No exaggeration

Preferred verbs:

- Built
- Maintained
- Integrated
- Automated
- Implemented
- Investigated
- Supported
- Collaborated
- Contributed

Bullet length:

- Ideal: 1 line
- Acceptable: 2 lines
- Avoid: 3+ lines

Each bullet should include:

1. Action
2. Technology or area
3. Business/technical context
4. Optional metric or impact if confirmed

Avoid generic bullets:

- Worked on backend tasks
- Participated in development
- Improved performance
- Used cloud technologies
- Helped the team

Prefer specific bullets:

- Built Azure Functions-based backend workflows for product/content integrations in a multi-locale e-commerce platform.
- Investigated production issues using Azure Application Insights and KQL across Azure Functions and backend services.

---

## 10. Content Safety Rules

### Keep Stable

- Name: use `Denys Strakhov` consistently
- Location
- Contact details
- Work authorization
- Company dates
- Honest language levels
- Commercial Node.js/TypeScript/Azure positioning
- PostgreSQL as strong backend foundation
- Germany / remote EU target

### Adapt Per Vacancy

- Headline
- Summary
- Top Skills order
- EPAM bullets
- Selected Projects
- Certifications
- Whether to include React/Next.js
- Whether to include AI Job Assistant
- Whether to include Volunteering

### Do Not Add to Core Skills Without Evidence

Do not present these as commercial core skills:

- Kubernetes
- MongoDB
- Express
- NestJS
- Python
- FastAPI
- OpenAI API
- LangGraph
- Qdrant
- Docker as production ownership

Use them only as:

- personal project experience
- coursework
- basic exposure
- secondary skills
- vacancy-specific nice-to-have

### Avoid PHP-only Positioning

Do:

- Keep PHP inside Factor-IT experience
- Emphasize PostgreSQL, migrations, data integrity, business logic
- Keep headline focused on Node.js/TypeScript/Azure

Do not:

- Put PHP in headline
- Put PHP in top skills for Node.js/backend roles
- Lead with old PHP experience

### Avoid Pure AI/Python Positioning

Do:

- Separate personal AI/Python projects from commercial backend experience
- Mention FastAPI/OpenAI only for AI-friendly backend roles

Do not:

- Claim commercial Python production experience
- Claim AI/ML Engineer experience
- Claim model training or MLOps

### Avoid DevOps Overclaiming

Do:

- Say Azure DevOps CI/CD participation
- Say Terraform configuration support
- Say collaboration with DevOps

Do not:

- Claim DevOps ownership
- Claim Kubernetes production experience
- Claim infrastructure architecture ownership

---

## 11. Targeted CV Generation Checklist

Before writing a targeted CV:

1. Identify target role type:
   - Backend Node.js/TypeScript
   - Backend-focused Fullstack
   - Azure/serverless Backend
   - E-commerce Integration Backend
   - SQL-heavy Backend
   - AI-friendly Backend

2. Extract vacancy requirements:
   - Must-have
   - Nice-to-have
   - Wishlist

3. Choose headline based on role.

4. Select 8-10 Top Skills for the left column.

5. Write a 4-6 line Summary matching the vacancy.

6. Select EPAM bullets:
   - 6-8 bullets for 2 pages
   - 8-10 bullets for 3 pages

7. Select Factor-IT bullets:
   - 3-5 bullets
   - Focus on PostgreSQL, migrations, data integrity, business logic

8. Keep CHI short:
   - 1-2 lines

9. Decide whether to include:
   - Selected Projects
   - Volunteering
   - Certifications

10. Remove weak or distracting technologies.

11. Check that commercial and personal experience are clearly separated.

12. Check that no unsupported claim was added.

---

## 12. PDF Final Check Checklist

Before sending the PDF:

1. Page count:
   - Prefer 2 pages
   - 3 pages only if justified
   - Never send accidental 4-page CV

2. Visual check:
   - No cut-off text
   - No broken bullets
   - No orphan section titles at page bottom
   - No email/LinkedIn broken awkwardly
   - No overlapping columns
   - No compressed unreadable text

3. Left column check:
   - Contact visible
   - Top Skills not overloaded
   - Languages honest
   - Certifications relevant
   - No distracting secondary technologies

4. Main column check:
   - Summary short
   - EPAM starts on page 1 if possible
   - Bullets are scannable
   - Recent experience dominates
   - Older experience is shorter

5. Content check:
   - No invented facts
   - No unsupported metrics
   - No inflated seniority
   - No commercial Python/FastAPI claim
   - No Kubernetes/DevOps overclaim
   - No PHP-only impression

6. Recruiter scan test:
   Within 10 seconds the CV should show:
   - Backend-focused TypeScript Developer
   - Node.js / Azure Functions / REST APIs
   - Production e-commerce experience
   - PostgreSQL foundation
   - Authorized to work in Germany
   - Cologne / remote EU availability

7. File check:
   - Correct filename
   - PDF opens correctly
   - Text is selectable
   - Links work
   - No hidden draft comments
   - No layout corruption after export
