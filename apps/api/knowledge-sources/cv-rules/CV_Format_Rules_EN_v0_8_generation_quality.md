# CV Format Rules EN

## v0.8 — generation quality (2026-11-25)

This is the active version of the CV rules. It replaces v0.7 as a whole instead of adding to it; the history stays in v0.7 and older. What changed against v0.7, in section 8: the stable intro line of Current Independent Work has a new canonical wording; the block's technology line covers what its bullets name plus the JobFlow technologies the vacancy names, one label per technology; the public-deployment facet of the portfolio overview follows the `deployment.kind` of the applications the overview represents, with no fixed count; a practice shared by the applications the overview represents is not a repeat of a Selected Projects entry. Sections 5 and 9.3 point to that technology-line rule for AI tools, and section 5 keeps AI tools out of Selected Projects entries in a vacancy without an AI mention.

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
| Personal project | implementation in a `cvEligible` registry project | Current Independent Work, Selected Projects, the `tech_stack` of its entry, Summary after the commercial sentence |
| Training | `cvEligible` credential from `credential-registry` | Certifications, the additional-evidence bullet of Current Independent Work, Summary only as the last AI item |

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

AI-assisted / AI-friendly Backend: the same commercial list as Default Backend (or Backend-focused Full-stack).

AI tools have **no skills section of their own**: the CV has no separate AI skills group, and they never go into Top Skills. Each AI tool is listed in the `tech_stack` of the entry whose evidence holds it — Claude Code in the Dark Factory entry and in Current Independent Work (JobFlow) when the block's bullets name it (section 8, technology line); OpenAI Codex in the Dark Factory entry and the Home Budget entry; the OpenAI API in Current Independent Work (JobFlow) when the block's bullets name it — where its personal provenance is visible. In a vacancy without an AI mention no AI tool is listed in a Selected Projects entry either. ADK and MCP stay in Certifications, not in skills.

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

- Use the variant from the active `profile_summary` (section 1) chosen by vacancy family: **A** — backend Node.js/TypeScript, NestJS, Azure/production, database/financial, Python as a plus; **B** — React/Next.js and backend-focused full-stack; **C** — roles whose focus is AI-assisted engineering, developer productivity, AI/LLM integration or agent workflows. In a standard backend or full-stack role the variant stays A or B whatever the AI weight: one full AI sentence when AI-assisted development is a key responsibility (Core), one short AI-assisted development clause when AI is a plus, none without an AI mention (section 9.3).
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

Placement: Header / Summary / Skills → **Current Independent Work & Portfolio Projects** (compact, usually 4 bullets) → EPAM Systems → Factor–IT → CHI Software → Education / Certifications / Selected Projects / Volunteering.

### Stable block template

```text
CURRENT INDEPENDENT WORK & PORTFOLIO PROJECTS
Freelance Software Development, Backend Portfolio Projects & Relocation
May 2025 – Present · Cologne, Germany · Remote

After relocating from Ukraine to Germany, continued developing software through small freelance tasks, backend-focused portfolio projects and ongoing learning.

- Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.
- Built JobFlow CV Pipeline, a NestJS/TypeScript and PostgreSQL application with OpenAI integration, BullMQ/Redis background jobs, human review gates, checks that flag unsupported CV claims and deterministic PDF export.
- [portfolio overview: the rest of the period's portfolio work, 1–2 facets chosen for the vacancy — see below]
- [optional: one additional piece of evidence, only when it covers a vacancy requirement — see below]
- Volunteered as IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

Always keep, unchanged: section title, role line, `May 2025 – Present`, `Cologne, Germany`, the stable intro line after the dates (it is not a bullet), and the small-tasks bullet in exactly the wording above. The stable intro line above is the canonical one, identical in every CV. Where another active source quotes an older form of this template — a fixed four-item list, a "third bullet" chosen from a table, or an older wording of the stable intro line — this section wins.

### Bullets and count

| # | Bullet | Presence | Content |
|---|---|---|---|
| 1 | Small tasks | always | the stable wording above |
| 2 | JobFlow | always, exactly one bullet | the facets the vacancy needs (below) |
| 3 | Portfolio overview | always | one sentence about the rest of the period's `cvEligible` portfolio work, 1–2 facets chosen for the vacancy |
| 4 | Additional evidence | 0–1, only when it covers a vacancy requirement | one verified fact (below) |
| 5 | Volunteering | by market | the stable wording above |

- Usually 4 bullets; 5 when bullet 4 covers a vacancy requirement and the CV still fits its page target.
- Without volunteering: 4 when bullet 4 is present, otherwise 3. Three bullets are a complete block, not a gap: never fill it with a repeated fact, a generic course added for the count or a second JobFlow bullet.
- The bullets adapted to the vacancy are JobFlow, the portfolio overview and the additional evidence. The small-tasks and volunteering bullets keep their wording.

### JobFlow bullet

JobFlow CV Pipeline is the only project with `placement: current_work_block`. It is always one bullet here and never repeated in Selected Projects. Take the wording from its `allowedWording` in the registry and pick the facet the vacancy needs:

- **Backend / Node.js / NestJS:** NestJS/TypeScript, PostgreSQL/Prisma, REST API with Swagger/OpenAPI, background jobs, deterministic PDF export.
- **AI/LLM integration:** OpenAI API behind a provider abstraction, BullMQ/Redis background jobs for LLM steps, explicit LLM call policy (retries only for 429/5xx, no retry after a timeout, per-step output-token limits), typed errors for truncated, refused or empty answers, human review gates.
- **Full-stack / UI:** the Next.js dashboard for reviewing AI-generated drafts, tracking workflow progress and exporting PDFs. It is evidence of a workflow review interface only — never of financial dashboards, charts, data visualisation or large data tables.

The JobFlow bullet describes the application. How it is developed with Claude Code belongs to the Dark Factory entry when Dark Factory is selected; otherwise, for an AI-mentioning vacancy, the JobFlow bullet may end with "developed with Claude Code under human review".

### Portfolio overview

One sentence that shows the period produced more than one project. It speaks about the rest of the period's `cvEligible` portfolio work — Cards, B1 Kompass, Home Budget and, when its entry is not selected, Dark Factory — by kind, never by name, and picks 1–2 facets this vacancy needs from this verified list:

- independent development of whole applications in TypeScript;
- PostgreSQL work: SQL migrations, Supabase PostgreSQL, Drizzle ORM;
- full-stack work with TypeScript, React and Next.js;
- public deployment — only when at least one application the overview represents has `deployment.kind: public` in its registry entry; singular or plural, and any number, follow those entries;
- authentication and access control;
- financial domain logic (money kept in integer cents, period budgets, reserves and forecasts);
- automated tests and CI;
- AI-assisted development;
- reusable developer tooling.

Rules:

- Every statement is true of the applications the overview represents **after** the Selected Projects choice: an application selected as its own entry is no longer represented by the overview, so a count, a plural or the public-deployment fact is taken from the registry entries that remain (`deployment.kind`), never from the whole portfolio.
- Every statement is true of the application it is about. Row-level security belongs to B1 Kompass only, never to Cards; Supabase PostgreSQL belongs to Cards and B1 Kompass, Drizzle ORM to Home Budget; invite-only sign-up and the server-enforced read-only demo belong to Cards.
- It never repeats the mechanism, figure or feature of a Selected Projects entry: with B1 Kompass selected, it does not mention exam timing, the number of migrations or row-level security; with Home Budget selected, it does not mention integer cents, reserves or forecasts. A repeat is the same achievement of the same project; a practice or technology that is true of the applications the overview represents (automated tests and CI, TypeScript, PostgreSQL) is not a repeat, even when a selected project shows it too.
- It is not a catalogue: never a list of every application or every technology.
- The AI-assisted development and developer-tooling facets appear only when the vacancy mentions AI or asks for building developer tooling (section 9.3). When the Dark Factory entry is selected, the overview does not describe it again.
- Claude Code is never attributed to Cards or B1 Kompass on their own: they carry it only through the Dark Factory wording "installed in three personal repositories" (`tech_stack`, section 3.1). Home Budget is developed with OpenAI Codex in its own workflow and is never a Dark Factory installation.

Draft examples — the wording follows the vacancy, the facts stay inside the list above:

| Vacancy | Portfolio overview |
|---|---|
| Backend without AI | `Built further personal TypeScript applications backed by PostgreSQL, including publicly deployed ones, each with automated tests in CI.` |
| Full-stack (B1 Kompass in Selected Projects) | `Built further personal Next.js/React applications in TypeScript, including a publicly available vocabulary trainer with invite-only sign-up and a server-enforced read-only demo, and a private budgeting app on Drizzle ORM and PostgreSQL.` |
| Financial backend (Home Budget not selected) | `Built further PostgreSQL-backed TypeScript applications, including a private single-owner budgeting app that keeps money in integer cents and is covered by integration tests against a real PostgreSQL.` |
| AI-assisted engineering (Dark Factory not selected) | `Built further personal TypeScript applications, including publicly deployed ones, and a reusable Node.js package, installed in three personal repositories, that sets up an AI-assisted delivery workflow with Claude Code and independent OpenAI Codex-based verification.` |

The public-deployment wording in these examples is a placeholder for the rule above: "publicly deployed ones" only while two or more represented entries have `deployment.kind: public`, "a publicly deployed one" when exactly one has, and no deployment wording when none has.

### Additional evidence (optional)

At most one bullet, and only when it covers a vacancy requirement the rest of the CV does not cover yet. Choose by relevance; the order below is a guide, not a ranking:

1. An implemented engineering achievement or a verified practice from portfolio work that is neither a Selected Projects entry nor already in the overview, worded from its `allowedWording` or its case in `career_cases`. Example, for a vacancy about reviewing AI-generated code when the Dark Factory entry is not selected: `Identified AI-generated changes that passed tests but violated requirements, then added targeted checks and acceptance gates to catch similar failures.`
2. Completed hands-on training: `Completed Google Cloud hands-on labs on agent development with ADK, covering tool-enabled agents, multi-agent systems and deployment to Agent Runtime.`
3. A course: `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".` for Python/FastAPI as a plus; `Deepened Node.js engineering through LinkedIn Learning courses on scaling, testing, security and design patterns.` only when the vacancy names that requirement and Certifications does not already cover it.

Training stays training in this bullet: it says what was completed, never that it was used at work or in production. It is never a second JobFlow bullet, never a Selected Projects entry told again and never a project that is not `cvEligible`.

### Volunteering

A separate, market-dependent bullet, never merged into another bullet. Germany / remote EU: usually include as a local integration signal. Ukraine / Ukrainian market: case by case. It is not developer evidence. If it is omitted, the block has 4 bullets only when an additional-evidence bullet covers a requirement, otherwise 3 (see the count above); never pad with repeated content.

### Technology line (`tech_stack`)

The block's technology line is a composite entry for the whole period, not the stack of one project. It lists:

- the technologies the block's bullets name: Node.js and React of the small-tasks bullet, the technologies of the selected JobFlow facets, and the technologies the portfolio overview and the additional evidence name;
- plus the technologies of the JobFlow registry entry (`techStack`) that the vacancy names (AI technologies only as stated below).

It is never the whole JobFlow `techStack`: a JobFlow technology that neither the block's bullets nor the vacancy name stays out. It never merges the stacks of the applications the overview represents or of Selected Projects entries. One label per technology, without a version number and without a parenthetical detail that only tells projects apart; the name itself stays as the evidence writes it, and a material restriction from the evidence stays in the label. AI technologies (an LLM API, coding assistants) appear only when the block's bullets name them; the AI weight and kind (9.3) decide whether they do. No numeric limit; the order follows vacancy relevance.

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

Commercial experience comes first. EPAM and Factor–IT bullets that cover a vacancy requirement are never displaced by a portfolio project. A portfolio project is selected only because it demonstrates an important requirement that commercial evidence does not already cover sufficiently — not because it shares a topic with the vacancy.

A project may also stand next to a commercial bullet that covers the same requirement when it adds a dimension the commercial evidence does not show: independent end-to-end delivery of a whole application, a public deployment, a named technology, or a specific constraint such as access control, data integrity or money handling. Repeating a technology the CV already shows, with nothing new about how it was used, is not such a dimension. Projects that share a stack are not alternatives to each other: each earns its place by its own dimension.

The number of entries follows the evidence: zero when commercial experience and Current Independent Work already cover the vacancy, one or two in most CVs, three when each raises a different requirement. No CV lists every eligible project.

### 9.2 Registry fields

| Field | Meaning in selection |
|---|---|
| `cvEligible` | the **only** permission to appear in a CV; `false` means never, in any section |
| `portfolioPriority` | visibility priority only; it grants no permission and does not decide selection |
| `placement` | the CV section: `current_work_block` (JobFlow) or `selected_projects` |
| `roleFamilies` | default relevance: the vacancy families a project usually serves. A project outside the vacancy's families is still selected when the inclusion test names a requirement it raises (`must_have`, `nice_to_have` or hidden); the reason goes into `target_strategy.main_angle` |

Selection: `cvEligible: true` → the CV section given by `placement` → the inclusion test (9.1), starting from `roleFamilies` and the expected selection in 9.4. Facts and wording come from the entry's `allowedWording`; nothing from its `prohibitedClaims` is ever stated.

### 9.3 AI-assisted engineering: weight and kind

Two decisions, both made from the whole vacancy (must-have, nice-to-have, responsibilities, tooling notes) and the Prompt 1 analysis: the **weight** of AI decides how much space it takes; the **kind** of the request decides which fact is shown.

**The weight follows how important AI-assisted development is in this vacancy, not the job title.**

| Weight | When | Summary | Dark Factory entry | Certifications |
|---|---|---|---|---|
| **Core** | AI-assisted development, developer productivity or LLM integration is a `must_have` or a key responsibility | the role family's variant (A or B) with one full AI sentence; C only when AI-assisted engineering, developer productivity or LLM integration is the focus of the role | 2 bullets, `must_show` (for LLM integration only when coding agents or AI tooling are asked for too) | ADK badge and AI courses by relevance |
| **Plus** | AI appears in nice-to-have, as "a plus" or in a tooling note ("you use AI tools daily") | A or B + one short AI-assisted development clause | one compact bullet by default (`show_if_space`), as long as it displaces no requirement-covering commercial bullet and the CV stays within `max_pages`; otherwise the JobFlow bullet ends with "developed with Claude Code under human review" | at most one AI credential |
| **Not mentioned** | no AI anywhere in the vacancy | A or B, no AI clause | only under the developer-tooling rule below | no AI credential |

**The kind of request decides the fact.**

| Kind of request | Evidence | Plus | Core |
|---|---|---|---|
| Using AI assistants (Claude Code, Copilot, Cursor, "AI tools daily") | Dark Factory: scoped GitHub Issues with acceptance criteria → Claude Code → independent OpenAI Codex-based verification → merge decided by a human | the content of the one compact bullet | among the 2 bullets |
| Quality and review of AI code ("review AI-generated code", "code quality with AI") | `Identified AI-generated changes that passed tests but violated requirements, then added targeted checks and acceptance gates to catch similar failures.` (`career_cases`, Dark Factory) | the content of the one compact bullet | among the 2 bullets |
| AI-assisted delivery workflow / developer productivity | reuse: the package is installed in three personal repositories; Home Budget uses a separate Codex-native workflow | 1 bullet | 2 bullets |
| Coding-agent tooling, AI developer platforms | the mechanisms of 9.5: Docker sandbox, the agent's Git boundary, the controller, the verdict computed by code, hooks and skills | — | after the proof points, only for such vacancies |
| LLM / AI API integration | the JobFlow AI-integration and background-jobs facets; Dark Factory only when coding agents are asked for too | the JobFlow facet | the Summary (C when LLM integration is the role's focus) and the JobFlow facet |
| Agent frameworks / ADK | ADK skill badge (Certifications), ADK labs (additional evidence) — training only | at most one AI credential | badge and labs |
| RAG / Python AI | no implemented project: training only, or `not_shown` | — | — |

One fact, one place: the Summary names the competence in one clause or sentence; the portfolio overview carries an AI facet only when the Dark Factory entry is not selected; the Dark Factory entry carries the concrete proof. `tech_stack`: Claude Code in the Dark Factory entry and in Current Independent Work (JobFlow) when the block's bullets name it (section 8, technology line); OpenAI Codex in the Dark Factory entry and the Home Budget entry; neither in the Cards or B1 Kompass entries. The three AI categories — A (developing with coding agents), B (AI inside an application), C (training) — are never merged, and C never hides A or B. Provenance stays "Personal Project": no AI Engineer title, no productivity figures, no external users.

**Developer tooling without an AI mention.** Dark Factory is allowed in a vacancy without any AI mention only when the vacancy asks for building developer tooling, CI/CD automation or quality gates, and commercial experience does not cover that (EPAM shows participation in Azure DevOps CI/CD, not building such tooling). Then it is one compact bullet with tooling facts — a versioned Node.js package with releases, a test suite in CI on Linux and Windows, a GitHub Actions workflow, deterministic checks — naming AI only as what the tool orchestrates; its `tech_stack` then lists no AI tool (section 5). The Summary carries no AI clause, Certifications no AI credential and the portfolio overview no AI facet. A plain "experience with CI/CD" does not open this rule.

### 9.4 Expected selection by vacancy

The default starting point, not a fixed template. A project in "Not by default" is selected only when the inclusion test names a requirement it raises, with the reason in `target_strategy.main_angle`; a vacancy whose requirements touch several rows combines them.

| Vacancy | Leading evidence | Portfolio overview / additional evidence | Selected Projects | Not by default | Certifications (3–5) | Summary |
|---|---|---|---|---|---|---|
| Backend Node.js/TypeScript without AI (`backend_node`, `nestjs`) | EPAM (Node.js/TS, Azure Functions, integrations, Jest), Factor–IT (SQL), JobFlow (NestJS/PostgreSQL facet) | overview: PostgreSQL applications, public deployment, tests in CI; no AI facet; additional evidence only for a named requirement | none; Home Budget when the vacancy requires data integrity or money handling | Dark Factory, Cards, B1 Kompass, ADK badge | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud; + Advanced Node.js: Scaling Applications or Node.js: Design Patterns if mentioned | A |
| Backend with AI coding assistants as a plus | as above | overview without an AI facet (AI is in the Dark Factory entry) | Dark Factory — one compact bullet chosen by the kind of request (`show_if_space`); Home Budget as above | Cards, B1 Kompass | backend courses + at most one AI credential | A + AI clause |
| Full-stack with daily AI-assisted development (`fullstack_react` + AI) | EPAM React/Next.js/BFF/GraphQL, JobFlow (dashboard facet) | overview: full-stack work and access control, without B1 Kompass mechanisms | B1 Kompass; Dark Factory: 1 bullet at Plus, 2 bullets at Core (a key responsibility); Cards for an uncovered requirement | — | Node.js courses; at most one AI credential at Plus | B + AI clause (Plus) or one full AI sentence (Core) |
| React/Next.js full-stack without AI (`fullstack_react`) | EPAM React/Next.js/BFF/GraphQL, JobFlow (dashboard facet) | overview without B1 Kompass mechanisms | B1 Kompass; Cards only for an uncovered requirement | Dark Factory, ADK badge | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud | B |
| AI-assisted SE / Developer Productivity (`ai_assisted_engineering`, `developer_productivity`) | EPAM, Dark Factory, JobFlow (AI integration facet) | overview without describing Dark Factory again; additional evidence: ADK labs | Dark Factory (`must_show`, 2 bullets) | Cards, Home Budget; B1 Kompass as a separate entry | Engineer AI Agents with Agent Development Kit (ADK) (skill badge); Claude Code 101; Model Context Protocol: Advanced Topics; + one Node.js course | C |
| LLM integration in a backend role (`ai_integration`) | EPAM, JobFlow (AI integration and background-jobs facets) | overview without an AI-tooling facet | none; Dark Factory only when coding agents are asked for too | Cards, Home Budget | Build a JavaScript AI App with React and the OpenAI API; Model Context Protocol: Advanced Topics or Introduction to Model Context Protocol; ADK badge when agents are mentioned; + one Node.js course | C |
| Database / financial backend (`database_financial`) | Factor–IT (PostgreSQL, migrations, financial logic), EPAM | overview: PostgreSQL work, without Home Budget mechanisms | Home Budget | Dark Factory, Cards, ADK badge | System Design in Cloud; Node.js: Testing and Code Quality; Node.js: Security | A |
| Combined: full-stack + financial + AI | EPAM, Factor–IT | overview by the requirements | by the inclusion test (for example B1 Kompass, Home Budget, Dark Factory compact), within `max_pages` | — | by the requirements | B or C |
| Developer tooling without AI | EPAM (CI/CD participation) | overview without an AI facet | Dark Factory — the developer-tooling rule (9.3), one bullet about the tooling | Cards | backend courses | A |
| Azure / production backend (`azure_production`) | EPAM (Azure Functions, Durable Functions, integrations, Application Insights/KQL) | overview | none | every Selected Projects entry | System Design in Cloud; Node.js: Security; Node.js: Testing and Code Quality | A |
| Python/FastAPI as a secondary plus (`python_secondary`) | EPAM, Factor–IT | overview; additional evidence: the FastAPI course | none (no `cvEligible` Python project) | any Python project claim | FastAPI - The Complete Course 2026 (Beginner + Advanced); then Node.js courses by relevance | A |

In every vacancy: archived and `cvEligible: false` projects never appear; JobFlow is one bullet in Current Independent Work and never in Selected Projects; the portfolio overview never repeats the mechanism of a Selected Projects entry; EPAM and Factor–IT bullets that cover the vacancy are not displaced.

### 9.5 Selected Projects entries

- Entry format: exact registry `title`, "Personal project", the public repository link (`repositoryUrl`); a deployment link only where the registry has a public `deployment.url` (Cards, B1 Kompass). Home Budget is a private single-owner app: never a deployment or demo link, never users.
- 1–2 bullets per entry, from the entry's `allowedWording`; never anything from its `prohibitedClaims`.
- **Dark Factory** is a standalone, versioned Node.js package in its own repository (`github.com/strakhovdenya/dark-factory`), not a part of JobFlow. The AI-assisted delivery workflow was first built while developing JobFlow and was extracted into this package in Oct 2026; JobFlow, Cards and B1 Kompass are its consumer repositories (B1 Kompass uses the verifier and spec approval, not Ralph). Home Budget uses a separate Codex-native workflow and is not a Dark Factory installation. Describe the agent's Git boundary exactly: it may read repository state (`git status`, `git diff`, `git log`, and `git show` on review passes) but cannot commit, push or call the GitHub CLI; the controller commits, pushes and opens the pull request. Never "no Git access", never auto-merge.
- Dark Factory wording follows 9.3. One compact bullet (Plus, or the developer-tooling rule) carries the fact the kind of request points at — for example `Used Claude Code to implement scoped features from GitHub Issues with explicit acceptance criteria; added independent OpenAI Codex verification against requirements, code changes and test evidence before human merge.` Two bullets (Core) take the recruiter-facing proof lines of its `career_cases` case. The versioned-package and mechanism lines are for vacancies about coding agents, AI tooling or developer tooling, after the proof points. Lead with what an employer checks: scoped GitHub Issues with acceptance criteria, implementation with Claude Code, independent Codex-based verification before a human merge.

### 9.6 Certifications

- Only `cvEligible` entries of `credential-registry`; labs, learning paths, assessments and in-progress items never appear as a credential anywhere.
- **3–5 entries chosen by relevance to the vacancy, not by date and not to fill space**; fewer only when fewer are relevant. The table in 9.4 is the default; the full family table is section 2.2 of the active `certifications`.
- A certification is its registry identity: the `title` (or one of its `aliases`) verbatim, with nothing appended. The issuer, the type and the year are added by the export from the registry snapshot of the CV draft, never written by hand or by the model, and print as `<title> — <issuer> <type>, <year>`: the type label is "skill badge" or "professional certificate", a course completion has none. The ADK entry therefore prints as `Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge, 2026` and is never called a certification.
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

Headline, Summary variant, Top Skills order, EPAM bullets, the JobFlow facet, the portfolio overview and the optional additional-evidence bullet of Current Independent Work, Selected Projects, Certifications, whether to include React/Next.js, whether to include Volunteering.

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

1. Identify every vacancy family the requirements touch (9.4, a default) and the AI weight and kind of request (9.3).
2. Extract must-have, nice-to-have and responsibilities.
3. Choose the headline (section 6) and the Summary variant (section 7).
4. Select 8–10 commercial Top Skills; no AI skills group.
5. Select EPAM bullets (6–8 for 2 pages), Factor–IT bullets (3–5), keep CHI short.
6. Build Current Independent Work: stable header and intro, small-tasks bullet, one JobFlow bullet, the portfolio overview with 1–2 facets, at most one additional piece of evidence, volunteering by market — usually 4 bullets, up to 5, 3 without volunteering and without filler.
7. Select Selected Projects by the inclusion test, only `cvEligible`, never JobFlow; a "Not by default" project only with a named requirement.
8. Select 3–5 relevant `cvEligible` certifications by their bare registry titles; the export adds issuer, type and year.
9. Check that commercial, personal and training evidence are clearly separated and that no stop-list phrase or internal evidence term appears.
10. Check that no unsupported claim was added.

---

## 15. PDF Final Check Checklist

1. Page count: prefer 2 pages; 3 only if justified; never an accidental 4-page CV.
2. Visual: no cut-off text, broken bullets, orphan section titles, awkwardly broken email/LinkedIn, overlapping columns or compressed unreadable text.
3. Left column: contact visible, Top Skills commercial and not overloaded, languages honest, certifications relevant.
4. Main column: Summary within 60–90 words, Current Independent Work present with its portfolio overview, EPAM starts on page 1 if possible, recent experience dominates, older experience shorter.
5. Content: no invented facts or metrics, no inflated seniority, no commercial Python/FastAPI or AI claim, no Kubernetes/DevOps overclaim, no PHP-only impression, no archived project, JobFlow not repeated in Selected Projects.
6. Recruiter scan (10 seconds): Backend-focused TypeScript Developer; Node.js / Azure Functions / REST APIs; production e-commerce experience; PostgreSQL foundation; authorized to work in Germany; Cologne / remote EU availability.
7. File: correct filename, PDF opens, text selectable, links work, no hidden draft comments, no layout corruption.
