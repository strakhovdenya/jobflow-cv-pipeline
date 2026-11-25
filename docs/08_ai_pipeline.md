# JobFlow CV Pipeline — AI Pipeline Specification

## 1. Purpose

This document describes the AI workflow for **JobFlow CV Pipeline**.

The goal is to make the existing manual prompt process reproducible, auditable and safe:

```text
workspace input
  -> Prompt 1 vacancy analysis
  -> human review gate
  -> skip OR approved apply/maybe
  -> Prompt 2 targeted CV content
  -> CV draft review
  -> optional Prompt 3 pre-PDF check
  -> PDF export by default
  -> optional Prompt 5 final check
  -> optional cover letter / recruiter message
```

The pipeline must remain **AI-assisted, human-reviewed and artifact-first**.

AI may analyze, draft and check documents, but it must not silently decide to send applications, invent experience, bypass review gates or continue after `skip` unless the user explicitly overrides the decision.

## 2. Alignment With Existing Project Rules

This pipeline follows the current project decisions:

- Manual workspace creation is the first MVP path.
- Existing folder import is P1 optional; robust import is later.
- Prompt 1 always ends with a human review gate.
- `apply` and `maybe` continue only after user approval.
- `skip` creates skip artifacts and stops the pipeline by default.
- Prompt 2 runs only after approved `apply`, approved `maybe`, or explicit `skip` override.
- Prompt 3 pre-PDF check is P1 / MVP Optional.
- Prompt 5 final check is MVP Optional.
- Cover letter generation is Phase 2 / later, not a first MVP blocker.
- PDF is the default physical CV export format.
- Markdown is primarily an internal editable artifact and optional downloadable draft.
- Internal JSON artifacts are required for reproducibility; user-facing CV JSON export is optional.
- `00_vacancy_source.txt` is the canonical internal vacancy source artifact.
- Canonical internal artifacts use stable step-based names.
- Human-readable download names may include `company_slug` and `role_slug`.
- AI usage tracking must store token usage and estimated cost if provider data is available.

## 3. Pipeline Stages Overview

| Step | Name | MVP Status | Runs automatically? | Human review after step? | Main artifacts |
|---|---|---:|---:|---:|---|
| Input | Workspace input quality checkpoint | MVP Required | No | Yes, before Prompt 1 | `00_vacancy_source.txt` |
| Prompt 1 | Vacancy Analysis | MVP Required | User-triggered | Yes | `01_vacancy_analysis.md/json` |
| Skip branch | Skip Reason | MVP Required for skip | Yes after skip decision | Optional edit/reopen | `01_skip_reason.md/json` |
| Prompt 2 | Targeted CV Content | MVP Required for approved apply/maybe | User-approved | Yes | `02_targeted_cv_content.md/json` |
| Guard | Basic Anti-Overclaiming Guard | MVP Required | Can run with Prompt 2 | Yes if issues found | warnings in Prompt 2 / guard result |
| Prompt 3 | Pre-PDF Check | P1 / MVP Optional | User-triggered | Yes | `03_pre_pdf_check.md/json` |
| Step 4 | Deterministic Document Export | MVP Required for physical CV | User-triggered | Optional after export | `04_cv_export.html/pdf/json/md` |
| Prompt 5 | Final Check | MVP Optional | User-triggered | Yes | `05_final_check.md/json` |
| Cover Letter | Cover Letter / Recruiter Message | Phase 2 | User-triggered | Yes | `cover_letter.md/pdf`, `recruiter_message.md` |

## 4. Canonical Artifact Naming

### 4.1 Internal Artifacts

Newly generated workspaces must use canonical internal file names:

```text
00_vacancy_source.txt
01_vacancy_analysis.md
01_vacancy_analysis.json
01_skip_reason.md
01_skip_reason.json
02_targeted_cv_content.md
02_targeted_cv_content.json
03_pre_pdf_check.md
03_pre_pdf_check.json
04_cv_export.html
04_cv_export.pdf
04_cv_export.json
04_cv_export.md
05_final_check.md
05_final_check.json
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

### 4.2 Human-Readable Download Names

Human-readable download/export names may include `company_slug` and `role_slug`:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
Denys_Strakhov_<company_slug>_<role_slug>_Cover_Letter.pdf
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

### 4.3 Legacy Names

Legacy manual files must be supported during import, but new generated internal artifacts should not use legacy naming.

Examples of legacy names:

```text
Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
03_targeted_CV_content_Action1_Backend_Developer.md
Denys_Strakhov_Action1_Backend_Developer_CV.pdf
SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

Legacy `03_targeted_CV_content_*` means Prompt 2 output in the old manual workflow. In the new application pipeline, Prompt 2 output is stored canonically as:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

## 5. Shared Input Context

Every AI step must have a reproducible input snapshot.

A `PromptRun` should store or reference:

- workspace ID;
- prompt template ID and version;
- step type;
- input artifact IDs;
- source knowledge files used;
- source file hashes;
- prompt variables;
- model/provider selection;
- expected output schema version;
- user notes, if provided;
- previous step outputs used as context;
- created timestamp;
- status.

An `AiRun` should store provider execution metadata:

- provider;
- model;
- request timestamp;
- response timestamp;
- status;
- input token count if available;
- output token count if available;
- total token count if available;
- cached input tokens if available;
- reasoning tokens if available;
- estimated cost if available;
- pricing config version if used;
- raw provider usage JSON if safe;
- error code and message if failed.

Do not store API keys or secrets in `PromptRun` or `AiRun`.

## 6. Source Knowledge Files

The pipeline must use a structured source knowledge base instead of random prompt attachments.

### 6.1 Recommended Repository Location

MVP source files should live in a stable repo-level folder, separate from generated application artifacts:

```text
knowledge-sources/
  candidate-profile/
  evidence/
  cv-rules/
  certifications/
  layout/
  prompts/
```

`storage/applications/` is for generated workspaces. It should not be used as the canonical location for reusable profile/evidence sources.

The sections below name sources by `sourceType`. The active file of each type is listed in `apps/api/src/knowledge-sources/active-knowledge-sources.ts` (`ACTIVE_KNOWLEDGE_SOURCES`), the only place that names active source files: a new source version changes that list, not this document. Each `sourceType` has exactly one entry; registration rejects a list that repeats one.

### 6.2 Candidate Profile Sources

Used for stable candidate facts and positioning:

```text
master_cv                  knowledge-sources/candidate-profile/
profile_summary            knowledge-sources/candidate-profile/
linkedin_source_decision   knowledge-sources/candidate-profile/  (not passed to any pipeline step)
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

### 6.3 Evidence Sources

Used to prevent unsupported claims:

```text
project_inventory   knowledge-sources/evidence/  (holds the portfolio-registry block)
tech_stack          knowledge-sources/evidence/
career_cases        knowledge-sources/evidence/
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

### 6.4 CV Generation Rules

Used for targeted CV structure, layout and safe wording:

```text
cv_rules   knowledge-sources/cv-rules/
layout     knowledge-sources/layout/  (PDF)
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

### 6.5 Certifications Inventory

Used only when certificates support the vacancy:

```text
certifications   knowledge-sources/certifications/  (holds the credential-registry block)
```

Active file: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

### 6.6 Prompt Source Files

Prompt templates may be registered in PostgreSQL, but their source text should also exist in repo for review/versioning:

```text
knowledge-sources/prompts/prompt_1_vacancy_analysis.md
knowledge-sources/prompts/prompt_2_targeted_cv_content.md
knowledge-sources/prompts/prompt_3_pre_pdf_check.md
knowledge-sources/prompts/prompt_4_pdf_export_rules.md
knowledge-sources/prompts/prompt_5_final_check.md
knowledge-sources/prompts/prompt_2_1_cover_letter.md
```

### 6.7 Project Direction Sources

Used to safely describe this project and AI-assisted development:

```text
Claude Code / MCP / JobFlow project context
Prompt templates 1–5
Existing company workspaces
```

## 6.8 Prompt-Step Source Selection

Source inclusion must be explicit and reproducible. The app must not simply attach every file found under `knowledge-sources/`.

Knowledge sources per step, as `STEP_SOURCE_GROUPS` in `apps/api/src/knowledge-sources/knowledge-source-selection.service.ts` defines them (`selectForStep` passes the active sources of these types; the files are those of `apps/api/src/knowledge-sources/active-knowledge-sources.ts`):

| Step | Required `sourceType` | Optional `sourceType` |
|---|---|---|
| Prompt 1 vacancy analysis | `master_cv`, `profile_summary`, `tech_stack`, `project_inventory`, `career_cases`, `cv_rules` | `certifications` |
| Prompt 2 targeted CV content | `master_cv`, `profile_summary`, `tech_stack`, `project_inventory`, `career_cases`, `cv_rules` | `certifications`, `layout` |
| Prompt 3 pre-PDF check | `tech_stack`, `career_cases` | — |
| Cover letter | `profile_summary`, `cv_rules`, `career_cases`, `tech_stack`, `project_inventory` | — |
| Prompt 5 final check | no knowledge sources are passed | — |
| Skip reason | no knowledge sources are passed | — |

Other inputs of a step (vacancy source, earlier step artifacts, the exported CV) are listed in the step's own Inputs section. The anti-overclaiming guard uses knowledge sources without an AI call: it checks the Prompt 2 draft against the registries parsed from the active `project_inventory` and `certifications` sources plus `EvidenceItem` records and manual notes (§11.2). Step 4 export uses no knowledge source: it checks the effective CV against the registry snapshot stored in the draft (§11.6) and renders the approved `02_targeted_cv_content.json` with the optional `03_pre_pdf_check.json` (§13.2). `linkedin_source_decision` is registered but passed to no step.

`PromptRun.sourceSnapshot` must store the exact source IDs, paths, hashes and version labels used for the run.

## 7. Step 0 — Workspace Input Quality Checkpoint

### 7.1 Purpose

Validate the workspace input before spending AI tokens.

This checkpoint prevents running Prompt 1 on incomplete vacancy text, wrong company name, malformed role title or bad filename metadata.

### 7.2 Inputs

Manual workspace creation requires separate fields:

```text
company_name_original
role_title_original
vacancy_text
source_url optional
date optional, default current date
language optional, auto-detect later
```

Uploaded `.txt` vacancy file may replace pasted vacancy text.

### 7.3 Normalization Rules

`role_slug` may contain:

```text
English letters
Unicode Cyrillic letters
underscore
```

`company_slug` may contain:

```text
English letters
Unicode Cyrillic letters
numbers
underscore
```

Whitespace and separators should become `_`, repeated underscores should collapse, and leading/trailing underscores should be removed. Original company and role values must always be preserved separately.

### 7.4 Output Artifacts

Canonical vacancy source:

```text
00_vacancy_source.txt
```

Optional later processing artifact:

```text
00_vacancy_source.cleaned.txt
```

### 7.5 Expected Metadata

```json
{
  "company_name_original": "Broadvoice",
  "company_slug": "Broadvoice",
  "role_title_original": "Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS",
  "role_slug": "Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS",
  "workspace_slug": "2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS",
  "vacancy_text_path": "00_vacancy_source.txt",
  "source_url": null,
  "initial_status": "source_saved"
}
```

### 7.6 Manual Review Point

Before Prompt 1 runs, the user must be able to confirm:

- company name;
- role title;
- generated company slug;
- generated role slug;
- vacancy text completeness;
- source URL if available;
- generated canonical file names.

User options:

```text
Run Analysis
Edit Input
Save and Pause
Cancel Workspace
```

### 7.7 Failure Handling

| Failure | Handling |
|---|---|
| Empty company name | Block workspace creation |
| Empty role title | Block workspace creation |
| Empty vacancy text | Block workspace creation unless a source file is uploaded/imported |
| Role slug becomes empty | Ask user for a simpler English/Cyrillic title |
| File name too long | Ask for shorter manual slug |
| Workspace already exists | Offer open existing / create new version / cancel |
| Encoding issue | Ask user to paste text or choose encoding |

## 8. Prompt 1 — Vacancy Analysis

### 8.1 Purpose

Prompt 1 decides whether a vacancy is worth spending time on.

It must analyze the role as a career strategist, recruiter and hiring manager for the German/EU software engineering market.

It must produce:

- must-have requirements;
- nice-to-have requirements;
- wishlist requirements;
- hidden role logic;
- stack match;
- gaps;
- language risk;
- location/remote risk;
- seniority risk;
- evidence risks;
- score;
- final recommendation: `apply`, `maybe`, or `skip`.

### 8.2 Inputs

Required:

```text
ApplicationWorkspace metadata
00_vacancy_source.txt
active Prompt 1 template
knowledge sources: master_cv, profile_summary, tech_stack, project_inventory, career_cases, cv_rules
```

Optional knowledge source: `certifications`. Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`; selection: §6.8.

Optional:

```text
source URL
user notes
previous similar workspace summaries
rejection learnings later
```

### 8.3 Source Files

Minimum source set:

- vacancy source;
- profile summary;
- tech stack matrix;
- project inventory;
- career case deep dives;
- CV format rules.

### 8.4 Expected JSON Output

Canonical artifact:

```text
01_vacancy_analysis.json
```

Recommended schema:

```json
{
  "schema_version": "1.0",
  "step": "prompt_1_vacancy_analysis",
  "workspace": {
    "company_name_original": "Broadvoice",
    "company_slug": "Broadvoice",
    "role_title_original": "Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS",
    "role_slug": "Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS"
  },
  "decision": "skip",
  "score": 49,
  "summary": "AI-heavy fullstack role with production LLM/RAG/Kafka/Kubernetes expectations; not a safe match for current profile.",
  "must_have": [
    {
      "requirement": "Production LLM / AI integration",
      "match_level": "weak",
      "evidence_status": "personal_only",
      "risk": "high",
      "notes": "AI/RAG/FastAPI experience is personal/coursework, not commercial production."
    }
  ],
  "nice_to_have": [],
  "wishlist": [],
  "hidden_role_logic": [
    "Company likely wants production AI product ownership, not only Node.js backend development."
  ],
  "tech_stack_match": {
    "strong": ["Node.js", "TypeScript", "PostgreSQL foundation", "API integrations"],
    "transferable": ["Azure Functions", "Durable Functions", "async workflows", "production debugging"],
    "weak_or_missing": ["Kafka", "Kubernetes", "production LLM/RAG", "NestJS commercial evidence"]
  },
  "language_risk": {
    "risk_level": "high",
    "notes": "Fluent English required; safe profile level is B1/B1+."
  },
  "location_risk": {
    "risk_level": "unknown",
    "notes": "Remote-first signal, exact country/timezone not confirmed."
  },
  "evidence_risks": [
    {
      "claim": "Kafka production experience",
      "status": "needs evidence"
    }
  ],
  "top_reasons": [
    "Production AI/RAG is a must-have.",
    "Kafka/Kubernetes are weak or unsupported.",
    "Fluent English and ownership expectations create risk."
  ],
  "recommended_next_action": "Generate skip reason and stop pipeline unless manually overridden.",
  "manual_review_required": true
}
```

### 8.5 Markdown Output

Canonical artifact:

```text
01_vacancy_analysis.md
```

Recommended sections:

```text
# Vacancy Analysis — <Company> — <Role>

## Decision
## Score
## Summary
## Must-have Requirements
## Nice-to-have Requirements
## Wishlist
## Hidden Role Logic
## Candidate Match
## Gaps and Risks
## Language Risk
## Location / Remote Risk
## Evidence Risks
## Recommended Next Action
## Apply / Maybe / Skip Rationale
```

### 8.6 Safety Checks

Prompt 1 must:

- avoid inventing candidate experience;
- mark unsupported requirements as `needs evidence`;
- separate commercial experience from personal/project exposure;
- separately evaluate German-language risk;
- evaluate English risk when role requires fluent communication;
- detect seniority/ownership mismatch;
- detect hidden role logic;
- avoid recommending `apply` only because some keywords match;
- preserve uncertainty instead of hiding it.

### 8.7 Manual Review Point

Prompt 1 must always pause.

User options:

```text
Approve and Generate CV
Save as Maybe and Pause
Change Decision
Generate Skip Reason
Override and Continue
Edit Analysis
Add Notes
Pause
```

### 8.8 Failure Handling

| Failure | Handling |
|---|---|
| AI provider error | Save failed AiRun, show provider/model/error, allow retry/switch provider |
| Invalid JSON | Save raw output, mark PromptRun `failed_validation`, allow repair/regenerate |
| Missing decision | Block pipeline continuation, ask user to repair or rerun |
| Missing must-have/nice-to-have/wishlist split | Mark output invalid |
| Unsupported claims not marked | Evidence guard warning |
| Token usage unavailable | Store null normalized token fields and raw usage if available |

## 9. Skip Branch — Skip Reason Generation

### 9.1 Purpose

If Prompt 1 recommends `skip`, the system must preserve the decision as useful data instead of silently abandoning the workspace.

The skip branch must create skip artifacts and stop the CV generation pipeline by default.

### 9.2 Inputs

Required:

```text
01_vacancy_analysis.json
01_vacancy_analysis.md
ApplicationWorkspace metadata
00_vacancy_source.txt
```

Optional:

```text
user notes
manual edits to analysis
similar previous skip examples
```

### 9.3 Output Artifacts

Canonical internal artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

Human-readable download/export artifact:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

Skip reason language defaults to Russian for personal review.

### 9.4 Expected JSON Output

```json
{
  "schema_version": "1.0",
  "step": "skip_reason",
  "decision": "skip",
  "score": 49,
  "company": "Broadvoice",
  "role": "Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS",
  "location_remote": "remote-first signal; exact country/timezone not specified",
  "core_stack": ["Node.js", "TypeScript", "NestJS", "React", "LLM", "RAG", "Kafka", "PostgreSQL", "Docker", "Kubernetes"],
  "main_skip_reason": "AI-heavy production role with unsupported LLM/RAG/Kafka/Kubernetes expectations.",
  "key_mismatches": [
    "Production AI/LLM integration is a must-have; current AI experience is personal/coursework only.",
    "Kafka evidence is missing: needs evidence.",
    "Kubernetes level is basic/training exposure only."
  ],
  "evidence_from_profile": [
    "Strong commercial Node.js/TypeScript backend experience.",
    "Azure serverless and production debugging experience.",
    "Strong PostgreSQL foundation from Factor-IT."
  ],
  "risks_if_applying_anyway": [
    "Targeted CV may need unsafe overemphasis of personal AI projects.",
    "Interview may focus on unsupported production AI/Kafka/Kubernetes topics."
  ],
  "useful_keywords_to_track_later": ["Production LLM", "RAG", "Kafka", "CCaaS AI"],
  "future_reconsideration_condition": "Consider similar roles later if AI/RAG is nice-to-have and Kafka/Kubernetes are not core requirements."
}
```

### 9.5 Markdown Output

Recommended sections:

```text
# SKIP — <Company> — <Role>

Date analyzed:
Company:
Role:
Location / remote:
Core stack:
Final score:
Decision: SKIP

## Main skip reason
## Key mismatches
## Evidence from my profile
## Risks if applying anyway
## Useful keywords to track later
## Future reconsideration condition
```

### 9.6 Safety Checks

Skip reason must:

- preserve why the role was skipped;
- not insult the company;
- not invent missing evidence;
- distinguish confirmed gaps from uncertain risks;
- include future reconsideration conditions;
- keep useful keywords for later portfolio planning.

### 9.7 Manual Review Point

After skip artifacts are created:

```text
status -> skipped
pipeline stops
```

User options:

```text
Archive
Edit Skip Reason
Add Notes
Reopen
Override and Continue
```

Override must be explicit and logged.

### 9.8 Failure Handling

| Failure | Handling |
|---|---|
| Skip artifact generation fails | Keep analysis output, status `analysis_ready`, allow retry skip generation |
| Skip JSON invalid | Save Markdown and raw output, allow JSON repair |
| User overrides skip | Keep skip artifacts, set decision `manual_override_apply` or `manual_override_maybe`, log override note |

## 10. Prompt 2 — Targeted CV Content

### 10.1 Purpose

Prompt 2 generates evidence-based targeted CV content for approved vacancies.

It must adapt the candidate profile to the vacancy without inventing experience.

Prompt 2 is responsible for deciding the CV content: which bullets to include, how many bullets each experience item should have, what each bullet says, and which personal/current projects are relevant enough to include. The deterministic renderer must not make content decisions or rewrite claims.

Prompt 2 is the main MVP generation step for apply/maybe paths.

### 10.2 Run Conditions

Prompt 2 may run only when:

```text
Prompt 1 decision = apply and user approves
OR Prompt 1 decision = maybe and user explicitly approves
OR Prompt 1 decision = skip and user explicitly overrides
```

Prompt 2 must not run automatically after `apply` or `maybe` without review approval.

### 10.3 Inputs

Required:

```text
ApplicationWorkspace metadata
00_vacancy_source.txt
01_vacancy_analysis.json/md
active Prompt 2 template
knowledge sources: master_cv, profile_summary, tech_stack, project_inventory, career_cases, cv_rules
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`; selection: §6.8.

Optional:

```text
user notes from Prompt 1 review
selected export target, default PDF
previous successful CV examples
knowledge sources: layout, certifications (optional sourceType of Prompt 2)
additional user notes about current work, current/personal projects and volunteering
```

### 10.4 Expected JSON Output

Canonical artifact:

```text
02_targeted_cv_content.json
```

Recommended schema. `evidence_source` quotes the `filePath` of the cited source exactly as the source header gives it (`prompt_2` template); the example shows a placeholder instead of a file name, because the active files change with each source version:

```json
{
  "schema_version": "1.0",
  "step": "prompt_2_targeted_cv_content",
  "workspace_id": "uuid",
  "decision_context": {
    "prompt_1_decision": "apply",
    "user_approval": true,
    "override": false
  },
  "target_strategy": {
    "positioning": "Backend-focused TypeScript Developer",
    "main_angle": "Commercial Node.js/TypeScript backend, Azure serverless, REST/API integrations, production debugging and PostgreSQL foundation; PostgreSQL-heavy financial backend. AI: none — the vacancy makes no AI request, so no AI facet, AI credential or Dark Factory entry.",
    "risk_mitigation": ["Do not overclaim AWS/Docker/Kubernetes/NestJS as commercial core skills."]
  },
  "requirement_coverage": [
    {
      "requirement": "Relational data modelling and SQL migrations in PostgreSQL",
      "priority": "must_have",
      "evidence_selected": "Factor–IT PostgreSQL migrations for financial data; Home Budget",
      "shown_in": "experience; selected_projects",
      "strength": "strong",
      "reason_if_not_shown": null
    }
  ],
  "cv_content": {
    "headline": "Backend Developer | Node.js | TypeScript | REST APIs | Serverless Workflows",
    "summary": [
      "Backend-focused TypeScript developer with commercial Node.js, Azure Functions and REST/API integration experience.",
      "Strong production debugging and PostgreSQL foundation with experience in e-commerce workflows and long-running serverless processes."
    ],
    "top_skills": ["Node.js", "TypeScript", "REST APIs", "Azure Functions", "PostgreSQL", "Jest", "Production Debugging"],
    "current_work_block": {
      "include": true,
      "safe_label": "Current Independent Work & Portfolio Projects",
      "role_line": "Freelance Software Development, Backend Portfolio Projects & Relocation",
      "dates": "May 2025 – Present",
      "location": "Cologne, Germany | Remote",
      "purpose": "Close the post-EPAM timeline gap while preserving EPAM as the primary commercial production evidence.",
      "stable_intro": "Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects and continued learning.",
      "bullets": [
        {
          "text": "Supported small Node.js/React improvements on an independent basis, including feature additions, bug fixes, API-related changes, UI adjustments and maintenance tasks.",
          "priority": "high",
          "evidence_source": "<filePath of the active master_cv source>",
          "risk_level": "medium"
        },
        {
          "text": "Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript and PostgreSQL/Prisma application with a REST API documented in Swagger/OpenAPI, BullMQ/Redis background jobs, human review gates and deterministic PDF export.",
          "priority": "high",
          "evidence_source": "<filePath of the active project_inventory source>",
          "risk_level": "low"
        },
        {
          "text": "Built two further personal Next.js/TypeScript applications on Supabase PostgreSQL, both publicly available.",
          "priority": "medium",
          "evidence_source": "<filePath of the active project_inventory source>",
          "risk_level": "low"
        }
      ],
      "tech_stack": ["NestJS", "TypeScript", "PostgreSQL", "Prisma", "BullMQ", "Redis", "Swagger/OpenAPI"]
    },
    "experience": [
      {
        "company": "EPAM Systems",
        "role": "Backend-focused Fullstack Developer",
        "dates": "Nov 2021 – May 2025",
        "experience_type": "commercial",
        "can_split_across_pages": true,
        "bullets": [
          {
            "text": "Built and maintained Node.js/TypeScript backend services and Azure serverless workflows for e-commerce integrations, including CommerceTools, Amplience and ProductsUp-related processes.",
            "priority": "high",
            "evidence_source": "<filePath of the active career_cases source>",
            "risk_level": "low"
          }
        ],
        "tech_stack": ["Node.js", "TypeScript", "Azure Functions", "REST APIs"]
      }
    ],
    "selected_projects": [
      {
        "title": "Home Budget",
        "project_type": "personal_project",
        "include": true,
        "safe_label": "Personal Project",
        "relevance_reason": "Covers the PostgreSQL and financial-domain requirements that commercial experience does not show: money in integer cents, budgets and forecasts in unit-tested domain functions, integration tests against a real PostgreSQL.",
        "display_priority": "must_show",
        "bullets": [
          {
            "text": "Built a private single-owner budgeting app with Next.js, Drizzle ORM and PostgreSQL that stores money as integer cents and computes period budgets, obligation reserves and liquidity forecasts in unit-tested domain functions, with integration tests against a real PostgreSQL in CI.",
            "priority": "high",
            "evidence_source": "<filePath of the active project_inventory source>"
          }
        ],
        "tech_stack": ["Next.js", "TypeScript", "Drizzle ORM", "PostgreSQL", "Vitest", "GitHub Actions"]
      }
    ],
    "certifications": [
      { "title": "System Design in Cloud", "include": true, "reason": "Supports the system design and cloud requirements of the vacancy." },
      { "title": "Node.js: Testing and Code Quality", "include": true, "reason": "Backs the automated testing requirement." },
      { "title": "Node.js: Security", "include": true, "reason": "Backs the secure API requirement." }
    ],
    "rendering_hints": {
      "density": "normal",
      "target_pages": 2,
      "max_pages": 3,
      "strong_match_allows_page_3": false,
      "optional_sections_to_hide_first": ["volunteering", "low_priority_certifications"]
    }
  },
  "quality_score": 86,
  "evidence_table": [
    {
      "claim": "Commercial Node.js/TypeScript backend experience",
      "support": "EPAM backend services and serverless workflows",
      "source": "<filePath of the active tech_stack source>",
      "status": "confirmed"
    },
    {
      "claim": "AWS production experience",
      "support": null,
      "source": null,
      "status": "needs evidence"
    }
  ],
  "overclaiming_check": {
    "critical_issues": [],
    "warnings": ["Avoid presenting Docker as production platform ownership."],
    "needs_evidence": ["AWS", "DynamoDB", "Kafka"],
    "registry_violations": [],
    "registry_snapshot": { "schema": "registry-snapshot/v2", "projects": ["…"], "credentials": ["… (with issuer and issued)"], "acceptedForced": { "projects": [], "credentials": [] } }
  },
  "pdf_readiness_notes": {
    "estimated_page_count": 2,
    "layout_risks": [],
    "recommended_next_step": "Review CV draft, then export PDF or run optional pre-PDF check."
  }
}
```

### 10.5 Markdown Output

Canonical artifact:

```text
02_targeted_cv_content.md
```

Recommended sections:

```text
# Targeted CV Content — <Company> — <Role>

## Metadata
## Target Strategy
## Headline
## Summary
## Top Skills
## Current Independent Work & Portfolio Projects
## Professional Experience
## Selected Projects
## Certifications
## Evidence Table
## Overclaiming Check
## Needs Evidence
## Risks
## PDF Readiness Notes
```

### 10.6 Safety Checks

Prompt 2 must:

- not invent commercial experience;
- not turn personal AI/FastAPI/RAG exposure into commercial production experience;
- not present Docker, NestJS, Kubernetes, MongoDB or AWS as commercial core skills without evidence;
- use `needs evidence` for unsupported claims;
- keep React/Next.js as backend-focused fullstack contribution unless the role justifies frontend emphasis;
- connect each major bullet to a vacancy requirement;
- decide bullet count and bullet content based on vacancy relevance, available evidence and page target;
- include the mandatory semi-fixed current-work block for external CV/PDF/HTML outputs to close the post-EPAM timeline gap;
- include current/personal projects when they are relevant to the role and safely supported by the project inventory;
- clearly label non-commercial projects as personal/current projects and never mix them into commercial employment experience;
- avoid generic CV bullets;
- keep language levels honest;
- preserve German-language risk where relevant;
- maintain German/EU market positioning.

### 10.7 Prompt 2 Content Selection Rules

Prompt 2, not the renderer, decides content selection.

AI decides:

```text
which experience bullets to include
how many bullets each experience item should have
exact bullet wording
which current-work bullets are adapted (JobFlow facets, portfolio overview, optional additional evidence)
whether selected personal/current projects are included
which certifications are worth showing
which optional sections are useful for the role
```

Renderer decides only placement, page breaks, column rendering and overflow handling according to priorities provided by Prompt 2.

Renderer must not invent bullets, rewrite bullets, decide that a project is relevant if Prompt 2 excluded it, move personal projects into commercial experience, or add unsupported claims to fill space.

Current-work block rule:

```text
current_work_block is semi-fixed:
  Header, role line, dates and stable intro remain consistent.
  It closes the May 2025-Present timeline gap after EPAM.
  It renders before Professional Experience for external CV/PDF/HTML outputs.
  It does not compete with EPAM as commercial production evidence.
  Bullets, in order (cv_rules v0_7 §8, prompt_2 v12, ISSUE-696):
    1. small independent tasks — always, stable wording;
    2. JobFlow — always, exactly one bullet, facets chosen for the vacancy;
    3. portfolio overview — always: one sentence about the rest of the period's
       cvEligible portfolio work, by kind and never by name, 1-2 facets chosen for
       the vacancy, never the mechanism, figure or feature of a Selected Projects
       entry, no AI facet without an AI request or a developer-tooling requirement;
    4. additional evidence — optional, at most one, only when it covers a vacancy
       requirement (an implemented achievement or practice, hands-on training, a course);
    5. volunteering — by market.
  Usually 4 bullets, up to 5; without volunteering 3 is complete — no filler bullet.
  Prompt 2 adapts the JobFlow bullet, the overview and the additional evidence.
  Do not present JobFlow, NestJS, Python/FastAPI or OpenAI API as commercial production experience.
```

Selected projects rule:

```text
Candidates: cvEligible portfolio-registry entries with placement selected_projects (hard limits).
roleFamilies and the cv_rules "Not by default" column are defaults, not filters:
  a project outside the vacancy's families is included when the inclusion test names
  a requirement it raises (must_have, nice_to_have or hidden), with the reason in
  target_strategy.main_angle.
Inclusion test — coverage, not topic: the project raises a requirement the CV does not
  cover sufficiently, or adds a dimension next to a commercial bullet (end-to-end delivery,
  public deployment, a named technology, access control, data integrity, money handling);
  commercial work outranks a personal project on the same requirement.
The number of entries follows the evidence (usually 0-2, 3 when each raises a different
  requirement); there is no separate cap on AI projects.

Hide a project when it fails the inclusion test, creates overclaiming risk, or would push the CV past max_pages at the cost of a requirement-covering commercial bullet.
```

AI-assisted engineering evidence (cv_rules v0_7 §9.3, prompt_2 v12): the **weight** of AI in the vacancy decides how much space it takes, the **kind** of request decides which fact is shown.

```text
Weight — by importance in the vacancy (must_have, key responsibility), not the job title:
  Core:          Summary A or B with one full AI sentence (C only when AI-assisted
                 engineering, developer productivity or LLM integration is the role's focus);
                 the AI-assisted engineering project with 2 bullets, must_show.
  Plus:          A or B + one short AI clause; the project as one compact bullet by default
                 (show_if_space), never displacing a requirement-covering commercial bullet
                 and never past max_pages; at most one AI credential.
  Not mentioned: no AI clause, no AI credential, no AI facet in the overview; the project
                 only for a requirement to build developer tooling, CI/CD automation or quality
                 gates that commercial experience does not cover —
                 one bullet about the tooling.
Kind: using AI assistants -> scoped issues, Claude Code, independent Codex verification, human merge;
      quality of AI code -> AI changes that passed tests but violated requirements, checks added;
      workflow / developer productivity -> reuse of the package across personal repositories;
      coding-agent tooling -> mechanisms, after the proof points;
      LLM / AI API integration -> JobFlow AI-integration and background-jobs facets;
      agent frameworks / ADK -> skill badge and labs, training only;
      RAG / Python AI -> no implemented project: training only or not_shown.
```

`certifications[].title` stays the bare registry title or alias; the export adds issuer, type label and year (section 11.6).

### 10.8 Prompt 2 Template Contract

The active Prompt 2 template must explicitly instruct the AI to:

```text
1. decide bullet count and exact bullet wording per vacancy;
2. use evidence-based bullets only;
3. include the current-work block for external CV/PDF/HTML outputs to close the post-EPAM timeline gap;
4. include current/personal projects when relevant to the role;
5. label current-work and current/personal projects separately from commercial experience;
6. return selected projects with include/relevance_reason/project_type fields;
7. return rendering hints and priorities for sections and bullets;
8. avoid fixed bullet counts unless the user explicitly asks for a fixed format;
9. avoid moving current-work or personal projects into commercial employment history;
10. mark unsupported claims as needs evidence instead of inventing support.
```

This contract must be checked when real Prompt 2 template content is seeded. A prompt template that only asks for generic CV bullets is not acceptable for MVP.

### 10.9 Manual Review Point

After Prompt 2:

```text
status -> cv_draft_ready
status -> paused_after_cv_draft
```

User options:

```text
Approve for PDF Export
Run Optional Pre-PDF Check
Edit CV Draft
Regenerate with Notes
Change Output Format
```

`Pause` and `Mark as Not Worth Applying` were removed (ADR-029) — both were no-ops from the
user's perspective. `Regenerate with Notes` feeds the user's typed feedback plus the previous
draft back into the Prompt 2 input context so the AI revises against concrete instructions
(`prompt2-input-builder.service.ts`'s `ALLOWED_STATUSES` now also accepts `cv_draft_ready`/
`paused_after_cv_draft`, not only `cv_generation_running`).

### 10.10 Failure Handling

| Failure | Handling |
|---|---|
| AI provider failure | Save failed AiRun, allow retry or provider switch |
| Invalid JSON | Save raw output, attempt repair or regenerate |
| Generic bullets detected | Mark output `needs_review`, require regeneration/edit |
| Unsupported claims detected | Block direct export until removed/rephrased/overridden |
| Markdown missing key sections | Mark PromptRun invalid |
| Token/cost unusually high | Show warning; do not fail generation by default |

## 11. Basic Anti-Overclaiming Guard

### 11.1 Purpose

The anti-overclaiming guard is an MVP requirement because Prompt 3 is optional/P1.

The guard must ensure that unsafe claims are caught before the first usable PDF is generated.

It may be implemented as:

- structured checks inside Prompt 2;
- a small deterministic rule-based service;
- a separate AI-assisted validation step later;
- a combination of the above.

### 11.2 Inputs

```text
02_targeted_cv_content.json          (the Prompt 2 answer, checked before it is saved)
EvidenceItem records and the workspace's manual notes
career registries                    (parsed from the active project_inventory and certifications sources, §11.6)
```

The guard is not an AI call and takes no other knowledge source: the registries come from the source text Prompt 2 already loaded (`Prompt2InputBuilderService`). Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

### 11.3 Output

MVP guard policy:

```text
critical unsupported claim -> block PDF export until removed, safely rephrased, or manually overridden with note
medium warning -> store warning and allow export by default
needs_evidence -> allowed only as internal warning or after safe rephrase; do not present needs_evidence as a CV claim
```

In MVP, warnings may be stored inside:

```text
02_targeted_cv_content.json
```

Later, a separate artifact may be added:

```text
02_evidence_guard.json
02_evidence_guard.md
```

### 11.4 Critical Claims to Flag

Examples:

```text
commercial MCP production experience
AI Engineer
LLM platform engineer
production Claude Code automation
agentic AI production experience
commercial NestJS EPAM production stack
Docker production ownership
Kubernetes production experience
AWS production experience
Kafka production experience
fluent English
professional German
```

### 11.5 User Actions

```text
Remove Claim
Rephrase Safely
Mark needs evidence
Add Evidence
Override Manually
```

Overrides must be logged and should require a note.

Critical unsupported claims should block PDF export unless the user explicitly overrides. Medium warnings should not block export by default.

### 11.6 Career Registry Check and Export Gate (ISSUE-689)

Which portfolio projects and credentials a CV may carry is decided by two strict registry blocks inside the active knowledge sources, not by the prompts:

- ```` ```json portfolio-registry ```` in the active `project_inventory` source (`portfolio-registry/v1`: `id`, `title`, `aliases`, `status`, `cvEligible`, `portfolioPriority`, `placement`, `evidenceClass`, `roleFamilies`, `allowedWording`, `prohibitedClaims`, …);
- ```` ```json credential-registry ```` in the active `certifications` source (`credential-registry/v1`: `id`, `title`, `aliases`, `issuer`, `type`, `status`, `cvEligible`, `evidenceClass`, …).

The full field contract is in `project-management/plan/PLAN-career-evidence-refresh.md` ("Registry-контракт"). `cvEligible` is the only permission to appear in a CV; `portfolioPriority` is visibility only, `placement` is the CV section, `roleFamilies` is vacancy relevance.

**Parsing (fail-closed).** `src/evidence/career-registry.parser.ts` parses both blocks from the source text Prompt 2 already loaded (no second file read). Strict JSON, required fields, enums, unknown fields, duplicate `id`/normalized `title`/`aliases`, a missing block, two blocks of one type and contradictions (archived or `needs_evidence` marked `cvEligible`, a lab/learning path/assessment/in-progress credential marked `cvEligible`, `cvEligible` without a placement, more than one `current_work_block` project) raise `CareerRegistryError`. In Prompt 2 the error fails the step on the existing "Evidence guard failed" path; there is no fallback list.

**Guard on the Prompt 2 draft.** `EvidenceGuardService.checkOutput(output, evidenceItems, manualNotes, registries)` applies the one rule set in `src/evidence/registry-compliance.ts` (names compared after Unicode NFKC, lowercasing and whitespace collapsing, against `title` and `aliases`):

| Violation | Rule |
|---|---|
| included project not `cvEligible` | registry entry with `cvEligible: false`, whatever its status |
| included project with the wrong section | `placement` is not `selected_projects` (e.g. the current-work project listed again) |
| included credential not `cvEligible` | lab, learning path, assessment, in progress, needs evidence |
| unregistered project or credential | not in the registry and not backed by a manual note (ADR-034 amendment of 2026-11-24) |
| excluded project named | title or alias of any project with `cvEligible: false` (archived or not) as a whole phrase in `headline`, `summary`, `top_skills`, an included `current_work_block`, `experience`, an included `selected_projects` entry or an included certification |

Violations are written to `overclaiming_check.registry_violations` (each prefixed with its field path) and repeated in `critical_issues`, so the CV draft review shows them. An unregistered item backed by a manual note is a `warnings` entry instead. The guard also writes `overclaiming_check.registry_snapshot` (`registry-snapshot/v2` since ISSUE-696: every registry entry's `title`, `aliases`, `status`/`type`, `cvEligible`, `placement`; for a credential also `issuer` and `issued` (`YYYY-MM` or `null`); plus `acceptedForced` — the unregistered titles accepted through a manual note). Both fields are optional when validating the AI answer and are always overwritten by the guard. `parseRegistrySnapshot()` chooses the exact key set by the snapshot's own `schema`: a `registry-snapshot/v1` stored by a draft generated between ISSUE-689 and ISSUE-696 is still read (credentials without `issuer`/`issued`); a v2 credential without a non-empty `issuer` or with an `issued` that is not `YYYY-MM` or `null` (checked by the same `isIsoMonth` predicate as the registry parser), or a v1 snapshot carrying v2 keys, makes the snapshot invalid — never read as the other version.

**Export gate.** `DocumentExportService.exportCv` builds the effective CV content with `buildEffectiveCvContent()` (`src/document-export/effective-cv-content.ts`: validated `02_targeted_cv_content.json` → `mapPrompt2OutputToCvContent` → corrections from `03_pre_pdf_check.json` → `applyCorrectionsToCvContent`). Both renderers receive exactly this object, so the gate checks what is rendered. Before the `paused_before_export → export_running` claim, next to the candidate-profile guard (ADR-032), it checks this content against the snapshot stored in the draft with the same `findRegistryViolations()`:

- violations → `400` "Export blocked: registry violations …" listing each violation with its field path, and the action: regenerate the CV draft, then re-run or skip the pre-PDF check (or register a new registry version);
- missing or malformed snapshot (a draft generated before this check) → `400`, regenerate the draft;
- missing or invalid draft, or invalid pre-PDF check JSON → `400` before the claim.

**Credential metadata (ISSUE-696).** After the gate passes and before the claim, `exportCv` calls `applyCredentialMetadata(content, snapshot)` (`src/document-export/credential-metadata.ts`) with the snapshot it already parsed for the gate. For every certification whose name resolves (normalized title or alias, `findSnapshotCredential()`) to a snapshot entry with `cvEligible: true`, it sets `issuer`, `kind` (`skill_badge` → "skill badge", `professional_certificate` → "professional certificate", `course_completion` → none) and `date` (the year of `issued`); `name` and every other field stay as they are. A v1 snapshot, an `acceptedForced` title or `issued: null` yields a certification without the missing parts. Both renderers receive this one object: the design template prints `name — issuer kind` with the year below, the ATS template `name — issuer kind, year` on one line, both through escaping `{{…}}`. The metadata never comes from the model (Prompt 2 writes only the registry title) and never from the `certifications` source at export time.

In every case no HTML/PDF/ATS file is written or registered. A `paused_before_export` workspace keeps its status and no `lastStepError` is recorded; a workspace that entered through the legacy `export_running` status (ADR-026) has no claim to skip, so it is rolled back to `paused_before_export` with the refusal recorded in `lastStepError`, which makes the advised regenerate reachable. The gate never loads knowledge sources and never calls an AI provider, so export remains a deterministic function of the workspace artifacts (ADR-012). This closes the path where Prompt 2 passed the guard and a Prompt 3 correction then introduced an archived project or an ineligible credential. The rendered HTML is not parsed: the renderers add only the static candidate profile and template literals to the checked content. Other `critical_issues` (the regex patterns in 11.4) still do not block export.

What the check does **not** do: it matches names, not meaning. Credential titles are checked only where a credential is claimed (`certifications`), not in prose, because completed training is legitimately described in words; and a claim such as "built a RAG service" that names no registry entry is left to the prompts and the human review.

## 12. Prompt 3 — Pre-PDF Check, P1 / MVP Optional

### 12.1 Purpose

Prompt 3 checks targeted CV content before export.

It is useful for safety and quality, but it is not required for the first usable MVP if Prompt 2 and the basic anti-overclaiming guard already work.

### 12.2 Inputs

Required when running Prompt 3:

```text
02_targeted_cv_content.md/json
selected output format, default PDF
```

Also loaded and inlined into the prompt input by `Prompt3InputBuilderService`
(`apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts`), best-effort where noted —
missing artifacts fall back to a placeholder string rather than blocking the check (ISSUE-247):

```text
01_vacancy_analysis.md/json           (optional — best-effort)
00_vacancy_source.txt                 (optional — best-effort, raw vacancy text)
knowledge source tech_stack           (required if an active knowledge source exists)
knowledge source career_cases         (required if an active knowledge source exists)
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

`tech_stack`/`career_cases` are selected via `KnowledgeSourceSelectionService.selectForStep('prompt_3', ...)`
— same mechanism Prompt 1/Prompt 2 use, restricted to only these two source types for Prompt 3 (not
`master_cv`/`profile_summary`/`cv_rules`, which Prompt 3 does not need since the current-work
rendering rules it needs are already preserved verbatim in the `PromptTemplate` body itself, per
`docs/10_calibration_and_parity.md` §2.8 item 1). If no active knowledge source of a given type
exists, or its content is unavailable, the prompt template instructs the model to fall back to the
CV content's own `evidence_table`/`overclaiming_check` fields rather than skip the check.

`cv_rules` (`CV_Format_Rules_EN_*`) is intentionally not wired in as a separate knowledge source
for Prompt 3. The reasoning below was confirmed by reading the full
`CV_Format_Rules_EN_v0_3_current_work_sync.md` (not assumed) during ISSUE-247; later `cv_rules`
versions add selection and wording rules (AI evidence by vacancy, AI wording and depth, portfolio
and credential selection) used by Prompt 2 when it selects evidence, and the v0_3 analysis was not
repeated for them:
its ~730 lines split into content that belongs to other pipeline stages, not Prompt 3's own. §§1-11
(layout skeleton, bullet-count targets, content-generation guardrails) are Prompt 1/2's job — both
already load it as the `cv_rules` knowledge source. §12 ("PDF Final Check Checklist") checks an
already-exported PDF file (page-open, text-selectable, no cut-off text, no layout corruption after
export) — that's Prompt 5's domain (`05_final_check`, operates on `04_cv_export.html/pdf`), not
Prompt 3's, since Prompt 3 runs before export and never sees a PDF. The remaining Prompt-3-relevant
subset — current-work block rules, page/bullet-count caps, BOP-style wording constraints — is
already preserved verbatim inside the `prompt_3` `PromptTemplate` body's persistent preamble and
checklist sections 0/3/5/6 (§2.8 item 1), matching how the manual ChatGPT-web-app workflow carried
it via session/project memory rather than a per-message attached file — confirmed directly by the
screenshot evidence in §2.8 item 3's follow-up note, where `CV_Format_Rules` is absent from the 4
sources actually attached to that pre-PDF-check response.

Optional:

```text
user notes
layout reference
previous pre-PDF recommendations
```

**Current-work block check (prompt_3 v10, ISSUE-696).** Prompt 3 does not receive `cv_rules`, so v10 states the block itself in its CURRENT-WORK CONTEXT: small tasks, one JobFlow bullet, a mandatory portfolio overview, at most one additional-evidence bullet, volunteering by market; usually 4 bullets, up to 5, 3 without volunteering and without filler. Its §0 checks that the overview is present, names no project, is not a catalogue and carries no AI facet without an AI request or a developer-tooling requirement, and that the optional bullet covers a requirement; the adaptable bullets are JobFlow, the overview and the additional evidence. §0.1 treats the same achievement told twice as duplication: an overview or additional-evidence bullet that repeats a fact of a Selected Projects entry gets a correction narrowing that bullet's text; dropping an entry (`include: false`) stays an `overall_notes` instruction for a duplicated entry such as a re-listed JobFlow.

### 12.3 Expected JSON Output

Canonical artifact:

```text
03_pre_pdf_check.json
```

Actual schema (`apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts`, `PrePdfCheckOutput`):

```json
{
  "schema_version": "1.0",
  "workspace_id": "company-slug/role-slug",
  "readiness": "ready_with_minor_edits",
  "corrections": [
    {
      "field_path": "summary[0]",
      "original_text": "Backend engineer with cloud experience.",
      "suggested_text": "Backend engineer with commercial Node.js/TypeScript and Azure serverless experience.",
      "severity": "suggestion",
      "reason": "More specific phrasing improves ATS keyword match."
    }
  ],
  "quality_score": 88,
  "export_blocked": false,
  "overall_notes": "CV draft is in good shape; minor wording suggestions only."
}
```

`field_path` references a field inside the targeted CV content JSON (e.g. `headline`, `summary[0]`, `current_work_block.stable_intro`, `experience[0].bullets[1].text`) — see ADR (`project-management/prd/PRD-prompt3-calibration-against-manual-baseline.md`, "Ключевые инварианты") for the field-path-validity invariant. `original_text` is the field's current, complete value as Prompt 3 copied it, and it is what makes a correction applicable: `applyCorrectionsToCvContent()` (called only from `buildEffectiveCvContent()`, so the export and the cover-letter input behave the same) applies a correction only when `original_text` is byte-for-byte equal (`===`, no whitespace, case or Unicode normalization) to the current value at `field_path`; for `certifications[i]` that value is the name of the entry found by `source_index` (Prompt 2's index). Corrections are applied in file order and each field changes at most once. A correction is skipped with a warning that names only its `field_path` — never CV text — when its `original_text` is null, missing, empty or different, when an earlier correction already changed that field (also when its `original_text` equals that earlier result), or when its path is not an existing correctable text field; the remaining corrections still apply and the export is never blocked by a skipped correction (ADR-026, ADR-031). This keeps a model index that points at the wrong element (B1, ISSUE-699: `tech_stack[22]` named while `original_text` was the value at `[23]`) from overwriting a true fact. Files whose corrections lack `original_text` stay valid; their corrections are not applied. `quality_score` (0-100) is a self-assessment of how thoroughly the check itself was performed, mirroring the `quality_score` field already present on `VacancyAnalysis`/`TargetedCvContentOutput`/`FinalCheckOutput`. `export_blocked` is advisory-only (ADR-026) — export is gated on having run or skipped this check, not on this value or on `readiness`. BOP-style natural-wording findings and any other check-section finding are all expressed as `corrections` entries; there is no separate structured field per check section.

### 12.4 Markdown Output

Canonical artifact:

```text
03_pre_pdf_check.md
```

Recommended sections:

```text
# Pre-PDF Check — <Company> — <Role>

## Readiness
## Critical Issues
## Minor Issues
## Overclaiming Risks
## Unsupported Claims
## Layout / Page Count Risks
## Recommended Edits
## Export Recommendation
```

### 12.5 Safety Checks

Prompt 3 must:

- re-check unsupported claims;
- verify that vacancy-specific requirements are covered safely;
- flag weak or generic bullets;
- flag layout/page count risks;
- flag language-level overclaiming;
- recommend safe edits before PDF export.

### 12.6 Manual Review Point

After Prompt 3:

```text
status -> pre_pdf_check_ready
status -> paused_before_export
```

User options:

```text
Apply Safe Fixes
Edit Manually
Export PDF
Export HTML
Export JSON
Pause
Go Back to CV Draft
```

### 12.7 Failure Handling

| Failure | Handling |
|---|---|
| Prompt 3 fails | User may retry or export from reviewed Prompt 2 draft with warning |
| Prompt 3 finds critical issues | Block direct export unless user fixes or explicitly overrides |
| Prompt 3 recommendations exist but cannot be read by Step 4 | Block export until the artifact is repaired, deleted by explicit user decision, or manually overridden |
| Invalid JSON | Save Markdown/raw output; allow repair |
| Page count cannot be estimated | Warn and continue to HTML preview/PDF export |

## 13. Step 4 — Deterministic Document Export

### 13.1 Purpose

Step 4 is a deterministic backend export step, not an AI prompt. It prepares approved CV content for physical export and produces a real file without calling an AI provider.

In MVP, the key physical result is:

```text
04_cv_export.pdf
```

PDF is the default because it is the file used for real applications.

AI provider: none.
Token usage: 0 / not applicable.
Input source: approved `02_targeted_cv_content.json`.

### 13.2 Inputs

Required:

```text
approved 02_targeted_cv_content.json
ApplicationWorkspace metadata
selected output format, default PDF
```

Optional unless present:

```text
03_pre_pdf_check.md/json
user edits
layout reference
custom export template
```

If `03_pre_pdf_check.md/json` exists, it is no longer optional for Step 4. The export step must read it and apply or preserve its recommendations before generating HTML/PDF. If Prompt 3 was not run, Step 4 must proceed without this input.

### 13.3 Export Formats

Default:

```text
PDF
```

Optional:

```text
HTML
JSON
Markdown downloadable draft
DOCX later
```

Internal Markdown and JSON artifacts for prompt outputs are not the same as user-facing CV JSON export.

### 13.4 Expected JSON Output

Canonical export metadata may be stored as:

```text
04_cv_export.json
```

Recommended schema:

```json
{
  "schema_version": "1.0",
  "step": "step_4_document_export",
  "ai_provider": null,
  "token_usage": null,
  "output_format": "pdf",
  "internal_artifacts": [
    {
      "type": "cv_html",
      "canonical_file_name": "04_cv_export.html",
      "path": "storage/applications/.../04_cv_export.html"
    },
    {
      "type": "cv_pdf",
      "canonical_file_name": "04_cv_export.pdf",
      "path": "storage/applications/.../04_cv_export.pdf"
    }
  ],
  "download_names": {
    "pdf": "Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf"
  },
  "source_artifacts": ["02_targeted_cv_content.md", "02_targeted_cv_content.json"],
  "optional_source_artifacts_used_if_present": ["03_pre_pdf_check.md", "03_pre_pdf_check.json"],
  "used_pre_pdf_check": false,
  "export_status": "completed",
  "warnings": []
}
```

### 13.5 Markdown / HTML Output

Canonical output artifacts:

```text
04_cv_export.html
04_cv_export.pdf
```

Optional:

```text
04_cv_export.md
04_cv_export.json
```

HTML should be usable for preview and PDF rendering.

### 13.6 Safety Checks

Document export must:

- use reviewed targeted CV content from approved `02_targeted_cv_content.json`;
- check whether `03_pre_pdf_check.md/json` exists;
- use Prompt 3 recommendations as mandatory CV-specific context when those artifacts exist;
- not require Prompt 3 recommendations when Prompt 3 was not run;
- check the effective content (draft + Prompt 3 corrections) against the draft's `overclaiming_check.registry_snapshot` before the export claim, and refuse with 400 on any registry violation or a missing snapshot (section 11.6);
- add certification issuer, type label and year from that same snapshot after the gate and before the claim, and give both renderers the same enriched content (section 11.6);
- not create `AiRun`;
- not consume AI tokens;
- preserve safe wording;
- not add new unsupported claims during templating;
- not decide bullet count or bullet wording;
- not decide project relevance;
- render current_work_block before Professional Experience for new external CV/PDF/HTML outputs;
- render selected projects only when Prompt 2 includes them and marks them for inclusion;
- not silently modify candidate facts;
- respect selected output format;
- generate PDF by default when no format is selected;
- store file path, hash and generation metadata;
- preserve previous artifact versions if regeneration happens.

### 13.7 Manual Review Point

After export:

```text
status -> cv_pdf_generated
```

User options:

```text
Open PDF
Download PDF
Run Optional Final Check
Generate Cover Letter later
Regenerate
Pause
Mark Ready to Apply
```

### 13.8 Failure Handling

| Failure | Handling |
|---|---|
| PDF renderer fails | Save HTML if generated, allow retry PDF export |
| HTML/CSS issue | Show HTML preview and error notes |
| Filesystem write error | Show path and permission problem, allow alternate folder |
| File name too long | Use shorter internal canonical file; adjust download name |
| Exported PDF missing content | Mark export failed; do not set `cv_pdf_generated` |

## 14. Prompt 5 — Final Check, MVP Optional

### 14.1 Purpose

Prompt 5 reviews the final generated output after a CV artifact exists.

It is useful before sending the CV, but it is not required for the first usable MVP.

### 14.2 Inputs

Required:

```text
04_cv_export.pdf or extracted text from PDF
04_cv_export.html optional
02_targeted_cv_content.md/json
01_vacancy_analysis.md/json
```

No knowledge source is passed to Prompt 5 (§6.8): it checks the exported CV against the vacancy analysis, the draft and the rules stated in the `prompt_5` template.

Optional:

```text
03_pre_pdf_check.md/json
PDF screenshot or visual validation later
user notes
```

### 14.3 Expected JSON Output

Canonical artifact:

```text
05_final_check.json
```

Recommended schema:

```json
{
  "schema_version": "1.0",
  "step": "prompt_5_final_check",
  "final_decision": "ready_to_send",
  "quality_score": 92,
  "page_count": 2,
  "missing_sections": [],
  "formatting_issues": [],
  "overclaiming_issues": [],
  "broken_links": [],
  "warnings": ["Manual visual check still recommended before sending."],
  "final_checklist": {
    "pdf_opens": true,
    "content_matches_vacancy": true,
    "no_unsupported_claims": true,
    "contact_info_present": true,
    "ready_to_apply": true
  }
}
```

### 14.4 Markdown Output

Canonical artifact:

```text
05_final_check.md
```

Recommended sections:

```text
# Final Check — <Company> — <Role>

## Final Decision
## Quality Score
## Page Count
## Missing Sections
## Formatting Issues
## Overclaiming Issues
## Final Checklist
## Recommendation
```

### 14.5 Safety Checks

Prompt 5 must:

- check final output against targeted content;
- flag accidental missing sections;
- flag unsupported claims that survived export;
- flag broken layout/content issues if detectable;
- not claim visual inspection unless actually performed;
- not run for skipped vacancies unless user requests skip-file review.

### 14.6 Manual Review Point

After Prompt 5:

```text
status -> final_check_ready
```

User options:

```text
Mark Ready to Apply
Edit and Re-export
Generate Cover Letter later
Pause
Archive
```

### 14.7 Failure Handling

| Failure | Handling |
|---|---|
| PDF text extraction unavailable | Use HTML/Markdown content and mark visual check as manual |
| Prompt 5 fails | Keep PDF artifact, allow manual download with warning |
| Critical issue found | Mark `needs_edit`, recommend re-export |
| Invalid JSON | Save Markdown/raw output, allow repair |

## 15. Cover Letter / Recruiter Message Step, Phase 2

### 15.1 Purpose

Generate a targeted cover letter, recruiter message or application email aligned with the vacancy and CV evidence.

This is Phase 2 / later. It should not block the first usable MVP.

### 15.2 Run Conditions

Usually run after:

```text
02_targeted_cv_content.md/json exists
OR 04_cv_export.pdf exists
```

The user may explicitly request a cover letter without CV generation, but the system should warn that CV context may be weaker.

### 15.3 Inputs

Required:

```text
ApplicationWorkspace metadata
00_vacancy_source.txt
01_vacancy_analysis.md/json
02_targeted_cv_content.md/json
knowledge sources: profile_summary, cv_rules, career_cases, tech_stack, project_inventory
```

Active files: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`.

The five knowledge sources are selected by `KnowledgeSourceSelectionService.selectForStep('cover_letter', ...)`;
`master_cv`, `certifications` and `layout` are not.

**The CV the letter sees is the exported CV (ISSUE-696).** `CoverLetterInputBuilderService` does not pass the raw
`02_targeted_cv_content.json`. It rebuilds the exported CV from the workspace artifacts with the export's own
`buildEffectiveCvContent()` — `02_targeted_cv_content.json` with the `03_pre_pdf_check.json` corrections applied —
and adds certification metadata with `parseRegistrySnapshot()` + `applyCredentialMetadata()` exactly as the export
does. The PDF is never parsed and no new storage is needed: from `cv_pdf_generated` and `final_check_ready` there is
no transition back to Prompt 2/3, so `02`/`03` do not change after the export. The input then holds:

```text
=== EXPORTED CV ===       headline, summary, top skills, the current-work block when included, experience,
                          the include:true selected projects, education, the included certifications
                          (with issuer, type label and year for a registry-snapshot/v2), languages, volunteering
=== CV DRAFT NOTES ===    requirement_coverage and evidence_table of the draft — context only
```

`overclaiming_check` and the registry snapshot are not passed. A draft without a snapshot (generated before ISSUE-689)
gives certifications without metadata; an invalid draft or pre-PDF check answers `400` before any AI call. Because the
draft is now validated with the current schemas (v4 passed the raw text through), an old workspace whose draft no longer
validates gets this `400` for the cover letter too; from `cv_pdf_generated` and `final_check_ready` there is no transition back to
regenerate it, so such a workspace gets no cover letter. A claim forced into the CV through a manual note keeps its
`"user-forced, unverified"` status in the letter: the CV draft notes carry its `evidence_table` row. The Nest
modules and their imports are unchanged (`pipeline/cover-letter` already depended on `document-export`).

The active `cover_letter` prompt (v5) names a project or a credential only when the EXPORTED CV names it; a manual
note never adds such a name (the request goes to `risks`), the rest of the note stays user-forced (ADR-034 amendment
of 2026-11-24, ISSUE-696). `requirement_coverage` and `evidence_table` never restore a claim the exported CV omits or
corrected. Personal AI evidence follows the same weight and kind as the CV (section 10.7): development with Claude Code
and OpenAI Codex is kept apart from the OpenAI API inside JobFlow, the AI-assisted delivery workflow is a separate
versioned package, the agent's Git boundary is stated as the sources state it, no RAG/Python AI project is claimed,
and the ADK credential is a skill badge.

Optional:

```text
04_cv_export.pdf
recruiter name
company-specific notes
source URL
user tone preference
application platform constraints
```

### 15.4 Expected JSON Output

Optional structured artifact:

```text
cover_letter.json
```

Recommended schema:

```json
{
  "schema_version": "1.0",
  "step": "cover_letter_generation",
  "document_type": "cover_letter",
  "language": "en",
  "company": "Amach",
  "role": "Full Stack Developer",
  "subject": null,
  "cover_letter": {
    "greeting": "Dear Hiring Team,",
    "body_paragraphs": [
      "I am applying for the Full Stack Developer role at Amach..."
    ],
    "closing": "Kind regards,\nDenys Strakhov"
  },
  "evidence_alignment": [
    {
      "vacancy_requirement": "TypeScript/Node.js fullstack development",
      "profile_evidence": "Commercial Node.js/TypeScript and React/Next.js contribution at EPAM",
      "status": "supported"
    }
  ],
  "risks": [],
  "output_files": ["cover_letter.md", "cover_letter.pdf"]
}
```

### 15.5 Markdown Output

Canonical artifacts:

```text
cover_letter.md
cover_letter.pdf
```

Optional:

```text
recruiter_message.md
application_email.md
```

Recommended cover letter sections:

```text
# Cover Letter — <Company> — <Role>

Dear Hiring Team,

<paragraph 1: role and fit>
<paragraph 2: relevant experience>
<paragraph 3: motivation and practical closing>

Kind regards,
Denys Strakhov
```

### 15.6 Safety Checks

Cover letter step must:

- not invent motivation beyond safe wording;
- not invent company facts unless provided by vacancy text or user;
- not overstate language level;
- not overstate seniority;
- not claim unsupported AI/DevOps/cloud experience;
- align with the same evidence used in the CV;
- name projects and credentials only from the exported CV, never from the sources alone (ADR-034 amendment of 2026-11-24).

### 15.7 Manual Review Point

After generation:

```text
status -> cover_letter_generated
```

User options:

```text
Download Cover Letter PDF
Edit Cover Letter
Regenerate with Notes
Copy Recruiter Message
Mark Applied
Pause
```

### 15.8 Failure Handling

| Failure | Handling |
|---|---|
| Missing CV context | Warn user and continue only with explicit approval |
| Generic cover letter | Mark as weak, allow regenerate with notes |
| Unsupported claims | Block PDF export until fixed or overridden |
| PDF export fails | Keep Markdown, allow retry PDF export |

## 16. AI Usage Tracking Across Pipeline

### 16.1 Purpose

AI calls consume tokens and may cost money. The pipeline must track usage so the user can understand which steps are expensive and optimize prompts later.

### 16.2 Per-Run Tracking

Each `AiRun` should store, when available:

```text
input_tokens
output_tokens
total_tokens
cached_input_tokens optional
reasoning_tokens optional
usage_raw_json optional
cost_estimate optional
cost_currency optional
pricing_config_version optional
```

### 16.3 Per-Step Summary

The UI/API should be able to show:

```text
Prompt 1 Vacancy Analysis: input tokens, output tokens, total tokens, estimated cost
Skip Reason: input tokens, output tokens, total tokens, estimated cost if AI-assisted
Prompt 2 Targeted CV: input tokens, output tokens, total tokens, estimated cost
Prompt 3 Pre-PDF Check: input tokens, output tokens, total tokens, estimated cost
Step 4 Document Export: no AiRun, token usage 0 / not applicable
Prompt 5 Final Check: input tokens, output tokens, total tokens, estimated cost
Cover Letter: input tokens, output tokens, total tokens, estimated cost
```

Step 4 document export must not call an AI provider and must not create an `AiRun`.

### 16.4 Workspace Summary

Workspace-level summary example:

```json
{
  "workspace_id": "uuid",
  "ai_usage_summary": {
    "total_input_tokens": 12000,
    "total_output_tokens": 2500,
    "total_tokens": 14500,
    "estimated_total_cost": 0.18,
    "currency": "USD",
    "runs_count": 3
  }
}
```

### 16.5 Cost Accuracy Rule

Cost estimates must be treated as approximate because provider pricing can change.

The system should store:

- raw usage returned by provider;
- normalized usage fields;
- pricing config version used for estimate;
- optional estimated cost.

Cost estimate must not be used as a business-critical source of truth.

## 17. Pipeline Status and Lifecycle

The lifecycle labels below are conceptual workflow events unless they already exist in the canonical `WorkspaceStatus` enum from `03_domain_model.md`. Implementation should not add extra `WorkspaceStatus` values only because they appear in this narrative flow.

### 17.1 Happy Path: Apply

```text
source_saved
  -> input_quality_confirmed
  -> analysis_running
  -> analysis_ready
  -> paused_after_analysis
  -> user_approved_apply
  -> cv_generation_running
  -> cv_draft_ready
  -> paused_after_cv_draft
  -> export_running
  -> cv_pdf_generated
  -> ready_to_apply optional
  -> applied optional
```

If Prompt 3 is used:

```text
cv_draft_ready
  -> pre_pdf_check_running
  -> pre_pdf_check_ready
  -> paused_before_export
  -> export_running
```

If Prompt 5 is used:

```text
cv_pdf_generated
  -> final_check_running
  -> final_check_ready
  -> ready_to_apply
```

### 17.2 Happy Path: Maybe

```text
analysis_ready
  -> paused_after_analysis
  -> decision maybe
  -> user explicitly approves
  -> manual_override_apply or user_approved_maybe
  -> cv_generation_running
```

Maybe must not continue automatically.

### 17.3 Happy Path: Skip

```text
analysis_ready
  -> decision skip
  -> skip_reason_generation_running
  -> skipped
  -> pipeline stops
```

### 17.4 Override Path

```text
skipped
  -> user chooses Override and Continue
  -> override logged
  -> manual_override_apply or manual_override_maybe
  -> cv_generation_running
```

Existing skip artifacts must remain in history.

## 18. Reproducibility Requirements

Every AI output must be reproducible enough for debugging.

The system should store:

- prompt template version;
- rendered prompt input snapshot or secure reference;
- source artifact hashes;
- source knowledge file hashes;
- provider;
- model;
- AI response raw output if safe;
- parsed JSON output;
- Markdown output;
- artifacts created;
- token usage if available;
- user approvals and overrides.

If a user regenerates any step, the system should create a new version rather than silently overwrite the previous output.

## 19. Failure Handling — Global Rules

### 19.1 AI Provider Failure

User should see:

```text
provider
model
step
error message
retry count
input hash
prompt template version
```

User options:

```text
Retry
Switch Provider
Edit Input and Retry
Save Failed Result
Pause
```

### 19.2 JSON Validation Failure

If AI returns invalid JSON:

1. Save raw output.
2. Save Markdown if available.
3. Mark `PromptRun` as `failed_validation`.
4. Offer repair or regenerate.
5. Do not advance pipeline automatically.

### 19.3 Safety Failure

If unsupported claims are found:

```text
status -> needs_review
```

User options:

```text
Remove
Rephrase
Mark needs evidence
Add Evidence
Override with note
```

Critical unsupported claims should block PDF export unless user explicitly overrides.

### 19.4 Filesystem Failure

If artifact write fails:

- preserve database state as failed;
- show path and permission issue;
- allow alternate storage root;
- do not mark artifact as created unless the file exists and hash is stored.

### 19.5 Partial Success

If JSON succeeds but Markdown fails, or Markdown succeeds but JSON validation fails, keep the successful artifact and mark the step as partial.

The user should be able to repair or regenerate only the missing part.

## 20. Manual Review Gates Summary

| Gate | Required? | Trigger | User decision |
|---|---:|---|---|
| Input quality checkpoint | Yes | Before Prompt 1 | Run analysis / edit / pause |
| Prompt 1 decision gate | Yes | After vacancy analysis | Apply / maybe / skip / override |
| Skip review | Optional | After skip artifacts | Archive / edit / reopen / override |
| CV draft review | Yes | After Prompt 2 | Approve / edit / regenerate / skip |
| Pre-PDF review | P1 optional | After Prompt 3 | Fix / export / pause |
| PDF review | Optional | After export | Download / final check / regenerate |
| Final check review | Optional | After Prompt 5 | Ready / needs edit / do not send |
| Cover letter review | Phase 2 | After cover letter generation | Download / edit / regenerate |

## 21. MVP AI Pipeline

The first usable MVP pipeline should be:

```text
1. Create workspace manually.
2. Save vacancy as 00_vacancy_source.txt.
3. Confirm input quality.
4. Run Prompt 1.
5. Save 01_vacancy_analysis.md/json.
6. Pause for Apply / Maybe / Skip review.
7. If Skip: save 01_skip_reason.md/json and stop.
8. If Apply/Maybe approved: run Prompt 2.
9. Save 02_targeted_cv_content.md/json.
10. Run basic anti-overclaiming guard.
11. Pause for CV draft review.
12. Export PDF by default through deterministic Document Export, without AI provider calls.
13. Save 04_cv_export.html/pdf.
14. Store GeneratedArtifact metadata and AI token usage for AI-assisted steps only.
```

Prompt 3, Prompt 5 and cover letter are not first MVP blockers.

MVP acceptance requires two checks:

```text
TASK-038 mechanical check:
  fake provider E2E proves workflow mechanics

TASK-038A practical check:
  real OpenAI provider
  -> real vacancy
  -> real Prompt 1
  -> real Prompt 2
  -> anti-overclaiming guard
  -> real generated CV PDF
  -> manual acceptance note
```

## 22. Later AI Pipeline Enhancements

Later pipeline improvements:

- Redis/BullMQ queues for AI steps;
- retry and failed-job handling;
- idempotency keys;
- cancellation/resume;
- AI usage dashboard;
- monthly token/cost reports;
- provider/model comparison;
- prompt A/B comparison;
- robust existing folder import;
- cover letter generation;
- final PDF visual validation;
- DOCX export;
- rejection analysis pipeline;
- version comparison for CV drafts and PDFs.

## 23. Implementation Notes for NestJS Services

Recommended services:

```text
WorkspaceService
InputValidationService
SlugService
KnowledgeSourceService
PromptTemplateService
PromptRunService
AiProviderService
AiUsageTrackingService
VacancyAnalysisService
SkipReasonService
TargetedCvService
EvidenceGuardService
PrePdfCheckService
DocumentExportService
FinalCheckService
CoverLetterService later
ArtifactStorageService
```

MVP minimum services:

```text
WorkspaceService
SlugService
ArtifactStorageService
KnowledgeSourceService
PromptTemplateService
PromptRunService
AiProviderService
AiUsageTrackingService
VacancyAnalysisService
TargetedCvService
EvidenceGuardService
DocumentExportService
```

## 24. Final Rule

The AI pipeline should optimize for speed, but not at the cost of unsafe claims.

The core rule is:

```text
Automate repetitive drafting and checking, but preserve human decision points where wrong automation could waste time or create unsafe CV claims.
```
