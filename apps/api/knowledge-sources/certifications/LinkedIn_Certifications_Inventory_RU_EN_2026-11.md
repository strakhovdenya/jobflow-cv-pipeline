# LinkedIn Certifications Inventory — Denys Strakhov

## 2026-11 — Google Cloud and credential registry (2026-11-23)

Это активная версия inventory. Она заменяет версию 2026-06 целиком, а не дополняет её: история осталась в файле 2026-06.

- **Purpose:** internal source for CV, LinkedIn, cover letters, recruiter messages and vacancy-specific CV targeting.
- **Sources:** the LinkedIn certifications list provided by Denys in June 2026 (all entries carried over with the same title, issuer, date and credential ID); Google Cloud activity history and the Credly badge page shown by Denys as screenshots on 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`, section 4).
- **Допуск credential в CV определяет только блок `credential-registry` ниже** (`cvEligible`). Запись с `cvEligible: false` в CV не выводится ни в каком разделе.
- Credentials support the profile, they do not define it. The main selling points remain commercial Node.js/TypeScript, Azure serverless, production e-commerce integrations, testing, production debugging and the PostgreSQL foundation.
- Any credential is **training**, never commercial or production experience. A course, badge or lab does not prove practical work experience in the skill it teaches.

---

## 1. Credential registry

Contract: `credential-registry/v1` (`project-management/plan/PLAN-career-evidence-refresh.md`, section «Registry-контракт»). Strict JSON, exactly one block in this file.

Field notes:

- `type` says what the credential is. `professional_certificate` is not used: none of the entries is a professional certification. LinkedIn Learning, Udemy, Anthropic, Redis and Prometheus entries are certificates of course completion (`course_completion`); the Google Cloud ADK entry is a **skill badge**.
- Google Cloud lab titles are **descriptive, not official**: the exact lab titles were not provided (`needs evidence`). Each descriptive title starts with `Descriptive title:` and names the lab topic from the activity history. Completion itself is verified by the screenshot.
- `issued: null` — the date was not provided or the item is not finished. `credentialId: null` — not provided. The ADK badge has no credential ID or verification URL: they were not provided and are not invented.

```json credential-registry
{
  "schema": "credential-registry/v1",
  "credentials": [
    {
      "id": "gc-adk-engineer-ai-agents",
      "title": "Engineer AI Agents with Agent Development Kit (ADK)",
      "issuer": "Google Cloud",
      "type": "skill_badge",
      "status": "earned",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "credentialId": null,
      "verificationUrl": null,
      "skills": ["Google Agent Development Kit (ADK)", "AI agents", "multi-agent systems", "agent tools"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_integration", "ai_assisted_engineering"]
    },
    {
      "id": "gc-lab-adk-challenge-1",
      "title": "Descriptive title: ADK challenge lab 1 of 2",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-adk-challenge-2",
      "title": "Descriptive title: ADK challenge lab 2 of 2",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-adk-get-started",
      "title": "Descriptive title: getting started with ADK",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-adk-tools",
      "title": "Descriptive title: ADK agent tools",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)", "agent tools"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-adk-multi-agent",
      "title": "Descriptive title: multi-agent systems with ADK",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)", "multi-agent systems"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-agent-runtime",
      "title": "Descriptive title: deploying an ADK agent to Agent Runtime",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Google Agent Development Kit (ADK)", "Agent Runtime"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-antigravity-1",
      "title": "Descriptive title: Antigravity lab 1 of 3",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Antigravity"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-antigravity-2",
      "title": "Descriptive title: Antigravity lab 2 of 3",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Antigravity"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-lab-antigravity-3",
      "title": "Descriptive title: Antigravity lab 3 of 3",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "skills": ["Antigravity"],
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-course-wrap-up-deploy-production-ready-agents",
      "title": "Wrap Up: Deploy Production-Ready Agents",
      "issuer": "Google Cloud",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-path-professional-agentic-architect",
      "title": "Professional Agentic Architect Certification",
      "issuer": "Google Cloud",
      "type": "learning_path",
      "status": "in_progress",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": null,
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-path-deploy-production-ready-agents",
      "title": "Deploy Production Ready Agents",
      "issuer": "Google Cloud",
      "type": "learning_path",
      "status": "in_progress",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": null,
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-course-build-agent-skills",
      "title": "Build Agent Skills with Google",
      "issuer": "Google Cloud",
      "type": "course_completion",
      "status": "in_progress",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": null,
      "aiCategory": "agent_training"
    },
    {
      "id": "anthropic-mcp-advanced-topics",
      "title": "Model Context Protocol: Advanced Topics",
      "issuer": "Anthropic",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-05",
      "credentialId": "qrkvzyc2ghpi",
      "skills": ["MCP", "AI tooling", "AI integration awareness"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_assisted_engineering", "developer_productivity", "ai_integration"]
    },
    {
      "id": "anthropic-mcp-introduction",
      "title": "Introduction to Model Context Protocol",
      "issuer": "Anthropic",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-05",
      "credentialId": "csdvyts5u2ip",
      "skills": ["MCP fundamentals", "AI tooling ecosystem"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_assisted_engineering", "developer_productivity", "ai_integration"]
    },
    {
      "id": "anthropic-claude-code-101",
      "title": "Certificate of completion: Claude Code 101",
      "aliases": ["Claude Code 101"],
      "issuer": "Anthropic",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-05",
      "credentialId": "89f8ofugj778",
      "skills": ["Claude Code", "AI-assisted development workflows"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_assisted_engineering", "developer_productivity"]
    },
    {
      "id": "udemy-fastapi-complete-course-2026",
      "title": "FastAPI - The Complete Course 2026 (Beginner + Advanced)",
      "aliases": ["FastAPI - The Complete Course 2026"],
      "issuer": "Udemy",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-04",
      "credentialId": null,
      "skills": ["Python", "FastAPI"],
      "roleFamilies": ["python_secondary"]
    },
    {
      "id": "linkedin-js-ai-app-react-openai",
      "title": "Build a JavaScript AI App with React and the OpenAI API",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-02",
      "credentialId": null,
      "skills": ["OpenAI API", "React"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_integration", "fullstack_react"]
    },
    {
      "id": "linkedin-advanced-nodejs-scaling",
      "title": "Advanced Node.js: Scaling Applications",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-02",
      "credentialId": null,
      "skills": ["Node.js scalability"],
      "roleFamilies": ["backend_node", "nestjs"]
    },
    {
      "id": "linkedin-nodejs-testing-code-quality",
      "title": "Node.js: Testing and Code Quality",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-02",
      "credentialId": null,
      "skills": ["node.js testing", "code quality"],
      "roleFamilies": ["backend_node", "nestjs", "fullstack_react", "database_financial"]
    },
    {
      "id": "linkedin-nodejs-security",
      "title": "Node.js: Security",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-02",
      "credentialId": null,
      "skills": ["Web Development", "Application Security"],
      "roleFamilies": ["backend_node", "nestjs", "fullstack_react", "azure_production"]
    },
    {
      "id": "linkedin-system-design-in-cloud",
      "title": "System Design in Cloud",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-01",
      "credentialId": null,
      "skills": ["Cloud-Native Architecture", "Computer System Design"],
      "roleFamilies": ["backend_node", "azure_production", "database_financial"]
    },
    {
      "id": "linkedin-nodejs-design-patterns",
      "title": "Node.js: Design Patterns",
      "issuer": "LinkedIn Learning Community",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2025-12",
      "credentialId": null,
      "skills": ["Software Design Patterns", "Node.js"],
      "roleFamilies": ["backend_node", "nestjs"]
    },
    {
      "id": "redis-for-javascript-developers",
      "title": "Redis for JavaScript Developers",
      "issuer": "Redis",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2025-12",
      "credentialId": "ajg5wk48cpc4sk",
      "skills": ["Redis", "caching"],
      "roleFamilies": ["backend_node"]
    },
    {
      "id": "redis-get-started",
      "title": "Get Started with Redis",
      "issuer": "Redis",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2025-11",
      "credentialId": "rrua3d7rklao0x",
      "skills": ["Redis"],
      "roleFamilies": ["backend_node"]
    },
    {
      "id": "prometheus-software-testing-fundamentals",
      "title": "Основи тестування програмного забезпечення",
      "issuer": "Prometheus",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2015-07",
      "credentialId": null,
      "skills": ["software testing fundamentals"]
    },
    {
      "id": "prometheus-web-ui-fundamentals",
      "title": "Основи Web UI розробки",
      "issuer": "Prometheus",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2016-01",
      "credentialId": null,
      "skills": ["Web UI fundamentals"]
    },
    {
      "id": "prometheus-python-programming-fundamentals",
      "title": "Основи програмування мовою Python",
      "issuer": "Prometheus",
      "type": "course_completion",
      "status": "completed",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": null,
      "credentialId": null,
      "skills": ["Python programming fundamentals"]
    }
  ]
}
```

---

## 2. Recommended CV usage

### 2.1 Selection rules

- Only entries with `cvEligible: true` go into a CV. Labs, learning paths, in-progress items and the wrap-up course are never shown in the Certifications section or anywhere else as a credential.
- **3–5 entries per CV, chosen by relevance to the vacancy**, not by date and not to fill space. Fewer is fine when fewer are relevant; zero AI entries for a vacancy without an AI mention.
- Copy the `title` verbatim (or one of its `aliases`), with the issuer and the year: `<title> — <issuer>, <year>`.
- The Google Cloud ADK entry is always called a **skill badge**: `Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge, 2026`. It is never called a professional certification or a certificate.
- `Professional Agentic Architect Certification` is the name of an **unfinished learning path**, not a credential the candidate holds. Never list it, never shorten it to «Google Cloud certification».
- A credential supports a skill; it does not prove experience in it. Never turn a course or the badge into a claim of commercial, production or project work.

### 2.2 Selection by vacancy family (`roleFamilies`)

| Vacancy family | Show (3–5, most relevant first) | Do not show |
|---|---|---|
| `backend_node` / `nestjs` — Backend Node.js/TypeScript | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud; then Advanced Node.js: Scaling Applications or Node.js: Design Patterns if the vacancy mentions scaling or design patterns | ADK badge; AI courses unless the vacancy mentions AI |
| `ai_assisted_engineering` / `developer_productivity` — AI-assisted SE, developer productivity | Engineer AI Agents with Agent Development Kit (ADK) (skill badge); Claude Code 101; Model Context Protocol: Advanced Topics; optionally Introduction to Model Context Protocol | Redis, Prometheus |
| `ai_integration` — LLM/AI integration in a backend role | Build a JavaScript AI App with React and the OpenAI API; Model Context Protocol: Advanced Topics or Introduction to Model Context Protocol; ADK badge when the vacancy mentions agents; plus one Node.js course | Redis unless named |
| `fullstack_react` — React/Next.js full-stack | Node.js: Testing and Code Quality; Node.js: Security; System Design in Cloud; Build a JavaScript AI App with React and the OpenAI API only when the vacancy mentions AI | ADK badge |
| `database_financial` — database / financial backend | System Design in Cloud; Node.js: Testing and Code Quality; Node.js: Security | ADK badge, AI courses |
| `azure_production` — Azure / production backend | System Design in Cloud; Node.js: Security; Node.js: Testing and Code Quality | ADK badge, AI courses |
| `python_secondary` — Python/FastAPI as a plus | FastAPI - The Complete Course 2026 (Beginner + Advanced); then Node.js courses by relevance | — |
| Redis / caching explicitly named | Redis for JavaScript Developers; Get Started with Redis; plus Node.js courses | — |

For a vacancy where AI is only a plus, at most one AI credential (usually the ADK badge or Claude Code 101) next to the backend courses. Prometheus courses are old and usually omitted from targeted CVs; FastAPI 2026 is stronger than the Prometheus Python course.

### 2.3 CV section examples

```text
Certifications (backend Node.js)
- Node.js: Testing and Code Quality — LinkedIn Learning Community, 2026
- Node.js: Security — LinkedIn Learning Community, 2026
- System Design in Cloud — LinkedIn Learning Community, 2026
- Advanced Node.js: Scaling Applications — LinkedIn Learning Community, 2026
```

```text
Certifications (AI-assisted engineering)
- Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud skill badge, 2026
- Claude Code 101 — Anthropic, 2026
- Model Context Protocol: Advanced Topics — Anthropic, 2026
- Node.js: Testing and Code Quality — LinkedIn Learning Community, 2026
```

```text
Certifications (Redis / caching)
- Redis for JavaScript Developers — Redis, 2025
- Get Started with Redis — Redis, 2025
- Advanced Node.js: Scaling Applications — LinkedIn Learning Community, 2026
- System Design in Cloud — LinkedIn Learning Community, 2026
```

---

## 3. Google Cloud (2026-11)

Source: Google Cloud activity history and the Credly badge page (screenshots, 2026-11-23). Dates of the activity history were relative («N days ago») and are converted from 2026-11-23; everything was completed 2026-11-21 … 2026-11-23, in a CV — «2026».

| Item | Type | Status | CV |
|---|---|---|---|
| Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud, issued 2026-11-23, level Intermediate | skill badge | earned | yes, as a skill badge, for AI/agent vacancies |
| Nine hands-on labs, each completed at 100 %: two ADK challenge labs, getting started with ADK, agent tools, multi-agent systems, deployment to Agent Runtime, three Antigravity labs (topics include MCP and Go) | lab | completed | no — supporting training evidence only |
| Wrap Up: Deploy Production-Ready Agents — passed 2026-11-22, no score | course (closing module of an unfinished path) | completed | no — supporting training evidence only |
| Professional Agentic Architect Certification | learning path | started, not finished | never |
| Deploy Production Ready Agents | learning path | started, not finished | never |
| Build Agent Skills with Google | course | started, not finished | never |

A passed quiz in the same activity history is not a credential and is not recorded.

Rules:

- The labs and the wrap-up course may support the Current Independent Work AI bullet («Completed Google Cloud hands-on labs on agent development with ADK…», wording in the active `career_cases`, Current Independent Work), never the Certifications section.
- Lab work is training in a Google-provided environment. It is not production deployment of agents, not commercial AI work and not project experience.
- The badge description mentions topics such as tokenization, fine-tuning and pretraining. Badge metadata does not prove practical skills: never claim model training, fine-tuning, pretraining or tokenization work, and never claim production deployment of AI agents.
- Credly URL and credential ID of the badge were not provided (`needs evidence`); do not add a link.
- Exact official titles of the nine labs were not provided (`needs evidence`); the registry uses descriptive titles.

---

## 4. Earlier certificates (carried over from 2026-06)

Title, issuer, date and credential ID are in the registry. Relevance and safe usage:

| Certificate | Relevance | Safe CV usage |
|---|---|---|
| Model Context Protocol: Advanced Topics (Anthropic) | MCP, AI tooling, AI integration architecture awareness | AI-friendly backend, developer tooling, vacancies mentioning MCP/Claude/AI agents |
| Introduction to Model Context Protocol (Anthropic) | MCP fundamentals, AI-tool integration concepts | AI-friendly backend and AI tooling roles |
| Certificate of completion: Claude Code 101 (Anthropic) | Claude Code, AI-assisted development workflows | vacancies that value AI-assisted development tools (Claude Code, Codex, Cursor, Copilot or similar) |
| FastAPI - The Complete Course 2026 (Beginner + Advanced) (Udemy) | Python/FastAPI backend learning: APIs, validation, backend structure, testing/migrations angle; LinkedIn skills: Python, FastAPI | Python/FastAPI roles where coursework is acceptable; the only current basis for Python/FastAPI. Not proof of commercial or project Python/FastAPI experience |
| Build a JavaScript AI App with React and the OpenAI API (LinkedIn Learning Community) | AI app basics, OpenAI API, React integration; LinkedIn skills: OpenAI API, React | AI-friendly full-stack/backend roles where OpenAI API is a plus. Supports learning, not commercial AI experience |
| Advanced Node.js: Scaling Applications (LinkedIn Learning Community) | Node.js scaling concepts | Node.js backend roles where scalability is mentioned |
| Node.js: Testing and Code Quality (LinkedIn Learning Community) | Node.js testing, code quality; LinkedIn skill: node.js testing | strong general backend certificate; supports Jest/testing/code-quality positioning |
| Node.js: Security (LinkedIn Learning Community) | backend/web security basics; LinkedIn skills: Web Development, Application Security | backend roles mentioning security, secure APIs or application security |
| System Design in Cloud (LinkedIn Learning Community) | cloud-native design, system design awareness; LinkedIn skills: Cloud-Native Architecture, Computer System Design | backend/cloud/serverless roles |
| Node.js: Design Patterns (LinkedIn Learning Community) | maintainability, design patterns; LinkedIn skills: Software Design Patterns, Node.js | Node.js roles mentioning design patterns or clean code |
| Redis for JavaScript Developers (Redis) | Redis with JavaScript, caching, backend performance | Redis/caching/backend performance roles |
| Get Started with Redis (Redis) | Redis fundamentals | only if Redis/caching matters for the role |
| Основи тестування програмного забезпечення (Prometheus, course by Lviv IT School instructors Георгій Гульов and Денис Сорохан) | software testing fundamentals | usually omit: old, weaker than current Node.js/Jest evidence |
| Основи Web UI розробки (Prometheus, course by Lviv IT School instructor Світлана Шабаранська) | Web UI fundamentals | usually omit: old, not central to backend positioning |
| Основи програмування мовою Python (Prometheus, course by National Technical University of Ukraine “KPI” instructor Нікіта Павлюченко) | Python programming fundamentals | usually omit: FastAPI 2026 is stronger and more current |

---

## 5. LinkedIn / CV safety notes

- Do not put all certificates into a compact two-page CV: 3–5, selected by vacancy (section 2).
- On LinkedIn all `cvEligible` entries may be listed; labs and in-progress paths are not listed as certifications there either.
- Old Prometheus certificates are acceptable on LinkedIn but usually not useful in a modern targeted CV.
- The ADK badge and the Anthropic certificates are agent-development and AI-tooling **training** (AI category C in the active `tech_stack`). Practical AI-assisted engineering and AI integration (categories A and B) are evidenced by projects, not by these credentials; in a CV, project evidence comes before training.
