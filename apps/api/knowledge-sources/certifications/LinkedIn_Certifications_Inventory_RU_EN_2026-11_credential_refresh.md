# LinkedIn Certifications Inventory — Denys Strakhov

## 2026-11 credential refresh — three Google Cloud skill badges (2026-11-25)

Это активная версия inventory. Она заменяет версию 2026-11 от 2026-11-23 целиком, а не дополняет её: история осталась в прежних файлах (2026-11 и 2026-06). Что изменилось: в registry добавлены два Google Cloud skill badge (Terraform и Deploy Multi-Agent Architectures); у ADK badge появился `verificationUrl`, а из его `roleFamilies` убран `ai_assisted_engineering`; все три бейджа сверены с Credly; таблица выбора по семействам вакансий убрана — **какие credentials показывать в CV, решает политика выбора в разделе 9.6 активного `cv_rules`**, этот файл хранит registry и факты безопасного использования каждого credential.

- **Purpose:** internal source for CV, LinkedIn, cover letters, recruiter messages and vacancy-specific CV targeting.
- **Sources:** the LinkedIn certifications list provided by Denys in June 2026 (all entries carried over with the same title, issuer, date and credential ID); Google Cloud activity history and the Credly badge page shown by Denys as screenshots on 2026-11-23 (`project-management/analysis-career-evidence-audit-2026-11.md`, section 4); the Credly Open Badges (OBI) API and the public Credly pages of the three Google Cloud skill badges, checked on 2026-11-25 (recipient Denys Strakhov, the same recipient hash on all three assertions, none revoked, none with an expiry date); the badge levels from Denys's screenshots (Credly does not return the level).
- **Допуск credential в CV определяет только блок `credential-registry` ниже** (`cvEligible`). Запись с `cvEligible: false` в CV не выводится ни в каком разделе.
- **Выбор credentials для конкретной вакансии** — только по разделу 9.6 активного `cv_rules` (смысловая релевантность всей вакансии, ранжирование, лимиты AI weight). `roleFamilies` записи — вспомогательный сигнал, а не фильтр. Новый credential добавляется записью в registry и строкой безопасного использования в разделе 4, без правки правил выбора и промптов.
- Credentials support the profile, they do not define it. The main selling points remain commercial Node.js/TypeScript, Azure serverless, production e-commerce integrations, testing, production debugging and the PostgreSQL foundation.
- Any credential is **training**, never commercial or production experience. A course, badge or lab does not prove practical work experience in the skill it teaches.

---

## 1. Credential registry

Contract: `credential-registry/v1` (`project-management/plan/PLAN-career-evidence-refresh.md`, section «Registry-контракт»). Strict JSON, exactly one block in this file.

Field notes:

- `type` says what the credential is. `professional_certificate` is not used: none of the entries is a professional certification. LinkedIn Learning, Udemy, Anthropic, Redis and Prometheus entries are certificates of course completion (`course_completion`); the three Google Cloud entries with `status: "earned"` are **skill badges** (`skill_badge`).
- Google Cloud lab titles are **descriptive, not official**: the exact lab titles were not provided (`needs evidence`). Each descriptive title starts with `Descriptive title:` and names the lab topic from the activity history. Completion itself is verified by the screenshot.
- `issued: null` — the date was not provided or the item is not finished. `credentialId: null` — not provided, or the issuer has no separate credential ID. The three Google Cloud skill badges carry their public Credly badge URL as `verificationUrl`; Credly issues no separate credential ID, so `credentialId` stays `null` and no ID is invented.
- `aiCategory` marks an **AI credential** (`cv_rules` 9.6): only entries with it count against the AI-weight limits. The Terraform badge has no `aiCategory`: it is infrastructure training, not an AI credential.
- `roleFamilies` is a supporting signal for selection, never a filter (`cv_rules` 9.6). The ADK badge no longer lists `ai_assisted_engineering`: agent-development training is not default evidence for a vacancy about AI-assisted coding.

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
      "verificationUrl": "https://www.credly.com/badges/5e0a99e4-40f7-40b9-a531-2352f18eb35c",
      "skills": ["Google Agent Development Kit (ADK)", "AI agents", "multi-agent systems", "agent tools"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_integration"]
    },
    {
      "id": "gc-deploy-multi-agent-architectures",
      "title": "Deploy Multi-Agent Architectures",
      "issuer": "Google Cloud",
      "type": "skill_badge",
      "status": "earned",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "credentialId": null,
      "verificationUrl": "https://www.credly.com/badges/789df055-d94a-4162-ae40-576888a85b25",
      "skills": ["Google Agent Development Kit (ADK)", "multi-agent systems", "Agent-to-Agent (A2A) protocol", "Model Context Protocol (MCP)", "agent tool integration", "agent authentication", "Agent Engine deployment"],
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_integration"]
    },
    {
      "id": "gc-terraform-build-infrastructure",
      "title": "Build Infrastructure with Terraform on Google Cloud Skill Badge",
      "aliases": ["Build Infrastructure with Terraform on Google Cloud"],
      "issuer": "Google Cloud",
      "type": "skill_badge",
      "status": "earned",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "credentialId": null,
      "verificationUrl": "https://www.credly.com/badges/d6666c31-2078-4546-b30a-976a48a6fded",
      "skills": ["Terraform", "Infrastructure as Code", "Google Cloud resource provisioning", "Terraform state management", "Terraform modules"],
      "roleFamilies": ["azure_production", "backend_node"]
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
- **Which `cvEligible` entries a CV shows is decided by the credential-selection policy in section 9.6 of the active `cv_rules`**: every entry is judged by its semantic relevance to the whole vacancy and to the candidate's evidence, then ranked; 3–5 entries, fewer when fewer are relevant. This file does not repeat that policy and holds no selection table by vacancy family: `roleFamilies` in the registry is a supporting signal, never a filter.
- Copy the `title` verbatim (or one of its `aliases`); the export adds the issuer, the type label and the year from the registry (section 2.2).
- Every `skill_badge` entry is always called a **skill badge**. It is never called a professional certification or a certificate, and a skill badge is not a vendor certification exam.
- `Professional Agentic Architect Certification` is the name of an **unfinished learning path**, not a credential the candidate holds. Never list it, never shorten it to «Google Cloud certification».
- A credential supports a skill; it does not prove experience in it. Never turn a course or a badge into a claim of commercial, production or project work.

### 2.2 Print format

The CV names a credential by its registry `title` or one of its `aliases` and nothing else; the export prints the line as `<title> — <issuer> <type label>, <year>`. The type label is «skill badge» for a `skill_badge` and «professional certificate» for a `professional_certificate`; a course completion has none. When the name already ends with its type label, the export does not repeat it. Examples of the printed form:

```text
<skill badge title> — Google Cloud skill badge, 2026
<skill badge title ending in "Skill Badge"> — Google Cloud, 2026
<course title> — LinkedIn Learning Community, 2026
```

---

## 3. Google Cloud (2026-11)

Sources: Google Cloud activity history and the Credly badge page (screenshots, 2026-11-23); the Credly Open Badges (OBI) API and the public Credly pages of the three skill badges (2026-11-25). Dates of the activity history were relative («N days ago») and are converted from 2026-11-23; everything was completed 2026-11-21 … 2026-11-24, in a CV — «2026».

### 3.1 Skill badges (verified on Credly)

All three: issuer Google Cloud, recipient Denys Strakhov (the same recipient hash on all three assertions), not revoked, no expiry date, earning criterion «Successful completion of the hands-on challenge lab». The level is taken from Denys's screenshots (Credly does not return it). No separate credential ID exists on Credly.

| Item | Type | Status | Issued | Level | Credly verification URL | CV |
|---|---|---|---|---|---|---|
| Engineer AI Agents with Agent Development Kit (ADK) | skill badge | earned | 2026-11-23 | Intermediate | https://www.credly.com/badges/5e0a99e4-40f7-40b9-a531-2352f18eb35c | yes, as a skill badge; agent-development training (AI category C) |
| Deploy Multi-Agent Architectures | skill badge | earned | 2026-11-24 | Advanced | https://www.credly.com/badges/789df055-d94a-4162-ae40-576888a85b25 | yes, as a skill badge; agent-development training (AI category C) |
| Build Infrastructure with Terraform on Google Cloud Skill Badge (official title; short form `Build Infrastructure with Terraform on Google Cloud`) | skill badge | earned | 2026-11-24 | Intermediate | https://www.credly.com/badges/d6666c31-2078-4546-b30a-976a48a6fded | yes, as a skill badge; infrastructure training, not an AI credential |

### 3.2 Other Google Cloud training

| Item | Type | Status | CV |
|---|---|---|---|
| Nine hands-on labs, each completed at 100 %: two ADK challenge labs, getting started with ADK, agent tools, multi-agent systems, deployment to Agent Runtime, three Antigravity labs (topics include MCP and Go) | lab | completed | no — supporting training evidence only |
| Wrap Up: Deploy Production-Ready Agents — passed 2026-11-22, no score | course (closing module of an unfinished path) | completed | no — supporting training evidence only |
| Professional Agentic Architect Certification | learning path | started, not finished | never |
| Deploy Production Ready Agents | learning path | started, not finished | never |
| Build Agent Skills with Google | course | started, not finished | never |

A passed quiz in the same activity history is not a credential and is not recorded.

Rules:

- The labs and the wrap-up course may support the Current Independent Work AI bullet («Completed Google Cloud hands-on labs on agent development with ADK…», wording in the active `career_cases`, Current Independent Work), never the Certifications section.
- Lab work, including the challenge labs behind the three skill badges, is training in a Google-provided environment. It is not production deployment of agents, not commercial AI work, not commercial cloud work and not project experience.
- The ADK badge description mentions topics such as tokenization, fine-tuning and pretraining. Badge metadata does not prove practical skills: never claim model training, fine-tuning, pretraining or tokenization work, and never claim production deployment of AI agents.
- Exact official titles of the nine labs were not provided (`needs evidence`); the registry uses descriptive titles.

---

## 4. Relevance and safe usage of every CV-eligible credential

Title, issuer, date, credential ID and verification URL are in the registry. This table records what each credential covers and how it may be described safely; which credentials a given CV shows is decided by `cv_rules` 9.6, not by this table. The earlier certificates are carried over from 2026-06 unchanged.

| Certificate | Relevance | Safe CV usage |
|---|---|---|
| Engineer AI Agents with Agent Development Kit (ADK) (Google Cloud skill badge) | Google ADK, AI agents, multi-agent systems, agent tools; AI category C | Agent-development **training**, always as a skill badge. Not commercial AI, not production deployment of agents, not an implemented agent system; never model training, fine-tuning, pretraining or tokenization work |
| Deploy Multi-Agent Architectures (Google Cloud skill badge) | multi-agent systems with ADK, Agent-to-Agent (A2A) protocol, MCP through ADK, agent tool integration, agent authentication, deployment to Agent Engine; AI category C | Agent-development **training**, always as a skill badge. Not commercial AI, not production deployment of agents and not production ownership of agent systems: the Agent Engine deployment was a lab in a Google-provided environment |
| Build Infrastructure with Terraform on Google Cloud Skill Badge (Google Cloud skill badge) | Terraform, Infrastructure as Code, provisioning Google Cloud resources, Terraform state and modules; not an AI credential | Infrastructure **training**, always as a skill badge. Not a HashiCorp certification, not commercial Google Cloud (GCP) experience and not DevOps ownership. It sits next to the commercial EPAM Terraform work («Terraform configuration support, resource/module changes, local plan/apply checks», active `tech_stack`) without enlarging it: the badge adds Google Cloud training, never Google Cloud work experience |
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

- Do not put all certificates into a compact two-page CV: 3–5, selected by the policy in `cv_rules` 9.6.
- On LinkedIn all `cvEligible` entries may be listed; labs and in-progress paths are not listed as certifications there either.
- Old Prometheus certificates are acceptable on LinkedIn but usually not useful in a modern targeted CV.
- The ADK and Deploy Multi-Agent Architectures badges and the Anthropic certificates are agent-development and AI-tooling **training** (AI category C in the active `tech_stack`). Practical AI-assisted engineering and AI integration (categories A and B) are evidenced by projects, not by these credentials; in a CV, project evidence comes before training.
- The Terraform badge is infrastructure **training** and not an AI credential: the AI-weight limits of `cv_rules` 9.6 do not apply to it, and it never turns the commercial EPAM Terraform work into DevOps ownership or into Google Cloud experience.
