# JobFlow CV Pipeline — Product Vision

## 1. Product Summary

**JobFlow CV Pipeline** is a backend-first application for managing a real job-search CV production workflow.

The application creates new application workspaces, can optionally import existing job application folders, stores vacancy and generation metadata, runs AI-assisted vacancy analysis, produces evidence-based targeted CV content, and generates physical CV files by default. Cover letter generation is part of the broader product vision, but it is not required for the first usable MVP.

The project is not a generic job tracker, a todo app, or a fake AI demo. Its purpose is to automate an existing manual workflow for creating targeted CVs while also serving as a production-style backend portfolio project.

Short product definition:

```text
Backend-first application for creating or importing job application workspaces, running AI-assisted vacancy analysis and evidence-based CV tailoring, and generating physical CV files by default, with cover letter generation as a later optional extension.
```

## 2. Why This Product Exists

The current job-search workflow is effective but too manual.

For each vacancy, the process usually includes:

1. Save the vacancy text as a `.txt` file.
2. Run Prompt 1 for quick vacancy analysis.
3. Pause for a human review of the `apply`, `maybe`, or `skip` recommendation.
4. If Prompt 1 recommends `skip`, create a skip-reason file and stop the CV generation pipeline unless the user explicitly overrides the decision.
5. If Prompt 1 recommends `apply`, continue to Prompt 2 only after user approval.
6. If Prompt 1 recommends `maybe`, pause by default and continue only after explicit user approval.
7. Run Prompt 2 for targeted CV content after approval.
8. Optionally run Prompt 3 for pre-PDF checking.
9. Run Step 4 deterministic document export for PDF generation.
10. Run Prompt 5 for final PDF check when a CV artifact exists and the user wants a final review.
11. Optionally generate a cover letter or recruiter message.
12. Save generated Markdown / HTML / JSON / PDF files into a company-specific folder.

This works, but it has several problems:

- Some intermediate steps exist only in chat context and are not saved as reproducible artifacts.
- Prompt versions are not tracked in a structured way.
- Source files are used manually and inconsistently.
- Generated files are stored on disk, but metadata and status are not tracked centrally.
- It is difficult to see which applications have only a vacancy source, which have targeted CV content, which were skipped, and which have a final PDF.
- It is easy to lose intermediate warnings, `needs evidence` notes, skip reasons, and pre-PDF recommendations.
- Physical CV generation still requires too much manual copying, checking and exporting.

JobFlow CV Pipeline should turn this manual workflow into a structured, reproducible application pipeline.

## 3. Existing Workflow Examples

The first real folders that represent the current workflow are:

```text
Action1/
  2026.06.23/
    Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
    03_targeted_CV_content_Action1_Backend_Developer.md
    Denys_Strakhov_Action1_Backend_Developer_CV.pdf

Amach/
  2026.06.23/
    Amach_Full_Stack_Developer.txt
    03_targeted_CV_content_Amach_Full_Stack_Developer.md
    Denys_Strakhov_Amach_Full_Stack_Developer_CV.pdf
    Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf

AppsFlyer/
  2026.06.23/
    AppsFlyer_Backend_Engineer.txt

Broadvoice/
  2026.06.24/
    Broadvoice_Software_Engineer_ReactJS_TypeScript_NodeJS.txt
    SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

These examples show four different application states:

| Company | Current state | Existing artifacts |
|---|---|---|
| Action1 | CV PDF generated | Vacancy source, targeted CV content, CV PDF |
| Amach | CV PDF and cover letter generated | Vacancy source, targeted CV content, CV PDF, cover letter PDF |
| AppsFlyer | Vacancy saved only | Vacancy source |
| Broadvoice | Skipped after analysis | Vacancy source, skip-reason file |

The application must support incomplete workspaces. Not every vacancy will have all prompt outputs, CV drafts, PDFs, cover letters, or final checks.

The application must also support skipped workspaces. If Prompt 1 decides `skip`, the system must save the skip decision and generate a dedicated skip-reason artifact instead of continuing to CV generation.

## 4. Product Goals

### 4.1 Practical Job-Search Goals

The application must help generate application-ready documents faster.

Main practical goal:

```text
Paste or create a vacancy workspace -> run analysis -> review apply/maybe/skip -> if approved, generate targeted CV content -> export physical CV PDF -> send to employer.
```

Skip-path goal:

```text
Paste or import a vacancy -> run analysis -> if skip, generate skip-reason file -> stop CV generation -> keep workspace history.
```

The system should reduce the time required to create a targeted CV and make the workflow repeatable.

The most important physical outputs are:

- targeted CV PDF;
- targeted CV Markdown;
- targeted CV HTML preview/export;
- targeted CV JSON;
- cover letter PDF;
- cover letter Markdown;
- vacancy analysis;
- skip-reason file;
- pre-PDF check result;
- final check result.

### 4.2 Portfolio and CV Goals

The project should also strengthen the developer profile for Backend Developer / Software Engineer / Backend-focused Fullstack Developer roles in Germany or remote EU.

The project should provide honest personal-project evidence for:

- NestJS;
- TypeScript;
- PostgreSQL;
- Prisma;
- Docker Compose;
- filesystem artifact storage;
- AI API integration;
- prompt versioning;
- document generation;
- structured backend workflows;
- validation and error handling;
- later Redis / BullMQ async processing;
- later Next.js dashboard;
- Claude Code-assisted development workflow;
- optional MCP/local tooling exposure.

This is important because some technologies are useful for target jobs but are not commercial production evidence yet. The project can safely strengthen them as personal-project evidence.

## 5. Target User

The primary user is one person: **Denys Strakhov**, a backend-focused TypeScript developer looking for Software Engineer / Backend Developer / Backend-focused Fullstack Developer roles in Germany or remote EU.

The application should optimize for a real personal workflow, not for a generic public SaaS product.

Primary user needs:

- save and organize vacancies;
- optionally import existing job application folders;
- run vacancy analysis;
- generate skip files for unsuitable vacancies;
- generate targeted CV content for suitable vacancies;
- check CV safety and evidence quality;
- generate physical CV / cover letter files;
- choose export format when needed;
- use PDF as the default CV export format;
- track application status;
- reuse source knowledge files consistently;
- avoid overclaiming unsupported experience;
- keep all artifacts reproducible and auditable.

## 6. Core Product Concept

The core concept is an **Application Workspace**.

Each workspace represents one job opportunity for one company and role.

A workspace may contain:

- company name;
- role title;
- vacancy source text;
- application date;
- source URL if available;
- decision: `apply`, `maybe`, `skip`;
- current status;
- prompt runs;
- AI analysis outputs;
- skip-reason file;
- targeted CV draft;
- generated Markdown / HTML / JSON / PDF files;
- cover letter draft and PDF;
- final check results;
- application status and notes.

The application should treat workspaces as artifact-first units:

```text
ApplicationWorkspace
  -> Vacancy source
  -> Prompt runs
  -> AI outputs
  -> Skip reason or CV / cover letter drafts
  -> Generated physical files
  -> Status and history
```

## 7. Product Workflow Vision

The target workflow should look like this:

```text
1. Import or create Application Workspace
2. Save vacancy source
3. Run Prompt 1: vacancy analysis
4. If decision is skip:
   4.1 Save vacancy analysis
   4.2 Generate skip-reason artifact
   4.3 Mark workspace as skipped
   4.4 Stop CV generation pipeline
5. If decision is apply or maybe:
   5.1 Pause for user review and approval
   5.2 Continue only after explicit user approval
   5.3 Run Prompt 2: targeted CV content generation
   5.4 Optionally run Prompt 3: pre-PDF check
   5.5 Run Step 4 deterministic document export in the requested format
   5.6 Default CV export format is PDF
   5.7 Run Prompt 5: final check when a CV artifact exists and the user wants final review
   5.8 Optionally generate cover letter
6. Download physical CV / cover letter / skip files
7. Track application status
```

The first meaningful milestone is not a perfect architecture. The first meaningful milestone is:

```text
Vacancy source -> AI-assisted targeted CV content -> physical CV PDF saved to disk.
```

The first meaningful skip milestone is:

```text
Vacancy source -> AI-assisted vacancy analysis -> skip-reason file saved to disk.
```

Everything else should support these two goals.

## 8. Prompt Pipeline Vision

The current manual workflow with prompts 1–5 should become a reproducible AI pipeline.

### Prompt 1 — Vacancy Analysis

Purpose:

- analyze the job description;
- separate must-have, nice-to-have and wishlist requirements;
- detect hidden role logic;
- identify language, location and tech-stack risks;
- produce `apply / maybe / skip` recommendation;
- mark unsupported requirements as `needs evidence`.

Expected artifacts:

```text
01_vacancy_analysis.json
01_vacancy_analysis.md
```

If the decision is `skip`, the system must additionally generate canonical internal artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

Skip reason language defaults to Russian for personal review. The exported human-readable file may include a language suffix, for example:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

When a vacancy is skipped after Prompt 1, the pipeline must stop by default. It must not generate targeted CV content, CV PDF, cover letter, or final PDF check unless the user explicitly overrides the decision.

### Prompt 2 — Targeted CV Content

Purpose:

- generate evidence-based targeted CV content;
- select relevant headline, summary, skills, experience bullets, current-work block and optional projects;
- connect real experience to vacancy requirements;
- avoid unsupported claims;
- preserve risks and `needs evidence` notes.

Expected artifacts:

```text
02_targeted_cv_content.json
02_targeted_cv_content.md
```

Prompt 2 should run only when the decision from Prompt 1 is `apply` or `maybe` and the user explicitly approves continuing, or when the user manually overrides a `skip` decision.

### Prompt 3 — Pre-PDF Check

Purpose:

- review generated CV content before export;
- detect overclaiming, weak wording, missing evidence and layout risks;
- recommend final edits before PDF generation.

Expected artifacts:

```text
03_pre_pdf_check.json
03_pre_pdf_check.md
```

### Step 4 — Deterministic Document Export

Purpose:

- convert approved targeted CV content into a structured layout-ready format;
- generate HTML and PDF-ready content without calling an AI provider;
- produce a physical CV file.

If Prompt 3 pre-PDF check artifacts exist for the workspace, Step 4 document export must read and apply their recommendations as vacancy-specific context. These recommendations are more specific than generic export instructions because they are produced for the current CV draft. If Prompt 3 was not run, this dependency is ignored.

The default CV output format is PDF.

Supported CV export formats:

```text
pdf   -> default format for real applications
html  -> preview / layout debugging / browser-based export
json  -> structured data exchange / future template rendering
```

Expected artifacts for default PDF export:

```text
04_cv_export.html
04_cv_export.pdf
```

Optional artifacts depending on selected output format:

```text
04_cv_export.json
04_cv_export.md
```

### Prompt 5 — Final Check

Purpose:

- review final generated output;
- check whether the CV is ready to send;
- preserve warnings and final quality score.

Expected artifacts:

```text
05_final_check.json
05_final_check.md
```

Prompt 5 is relevant only when a CV artifact exists. It should not run for skipped vacancies unless the user explicitly asks for a skip-file review.

### Optional Prompt 2.1 — Cover Letter / Recruiter Message

Purpose:

- generate a targeted cover letter, recruiter message or application email;
- keep wording aligned with the same vacancy and source evidence.

Expected artifacts:

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
```

Cover letter generation should run only after a CV draft or final CV has been generated, unless the user explicitly requests a cover letter without CV generation.

## 9. Source Knowledge Base Vision

The application must use a structured source knowledge base. Source files must not be treated as random prompt attachments. They are the evidence layer of the system.

### 9.1 Candidate Profile Sources

Examples:

```text
Master_CV_RU_v0_6_current_work_sync.md
Master_Profile_Summary_RU_v0_6_current_work_sync.md
LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md
CV_Layout_Reference_EN_2026-06.pdf
```

Purpose:

- provide stable candidate facts;
- define target roles;
- define language levels, location, work authorization and career positioning;
- provide visual reference for CV layout.

### 9.2 Evidence Sources

Examples:

```text
Project_Inventory_RU_v0_6_current_work_sync.md
Tech_Stack_Matrix_RU_v2_3_current_work_sync.md
Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md
```

Purpose:

- provide safe commercial evidence;
- classify technologies as commercial production, working commercial, personal project or basic exposure;
- provide career cases such as ProductsUp, Amplience, CommerceTools, production debugging and PostgreSQL migrations;
- prevent unsupported claims.

### 9.3 CV Generation Rules

Examples:

```text
CV_Format_Rules_EN_v0_3_current_work_sync.md
CV_Layout_Reference_EN_2026-06.pdf
```

Purpose:

- define targeted CV structure;
- define page count expectations;
- define safe wording rules;
- define what should be included or omitted depending on vacancy type.

### 9.4 Certifications Inventory

Example:

```text
LinkedIn_Certifications_Inventory_RU_EN_2026-06.md
```

Purpose:

- select relevant certificates for backend, Node.js, AI-friendly, Redis/caching or cloud-oriented roles;
- keep certifications supportive rather than replacing commercial experience.

### 9.5 Current Work Block Source Logic

The system must support a semi-fixed current-work block for May 2025–Present. Its purpose is to close the post-EPAM timeline gap while preserving EPAM as the primary commercial production evidence. The block may include small independent Node.js/React work, JobFlow CV Pipeline, structured backend upskilling, and local volunteering, but it must not turn portfolio/personal evidence into commercial production experience.

### 9.6 Project Direction Sources

Examples:

```text
Claude Code / MCP / JobFlow project context
Prompt templates 1–5
Existing company workspaces
```

Purpose:

- define this project as a personal backend tooling project;
- preserve safe wording for Claude Code / MCP / AI-assisted development;
- avoid claiming commercial MCP or production agentic AI experience.

## 10. Evidence and Safety Principles

The application must follow strict evidence rules.

Main principles:

- Do not invent experience.
- Do not create generic CV bullets.
- Connect experience to a concrete vacancy requirement.
- Mark unsupported claims as `needs evidence`.
- Separate commercial production experience from personal project experience.
- Separate must-have, nice-to-have and wishlist requirements.
- Identify hidden role logic.
- Evaluate German-language risk separately.
- Preserve `apply / maybe / skip` recommendation.
- Generate a skip-reason artifact when the decision is `skip`.
- Stop CV generation by default when the decision is `skip`.
- Never present personal AI, FastAPI, MCP or Claude Code exposure as commercial production experience.
- Never present Docker, NestJS, Kubernetes, MongoDB or AWS as commercial core skills unless evidence is added later.

Examples of safe classification:

| Technology / area | Safe positioning |
|---|---|
| Node.js / TypeScript | Commercial production experience |
| Azure Functions / Durable Functions | Commercial production experience |
| CommerceTools / Amplience / ProductsUp | Commercial e-commerce integration experience |
| PostgreSQL / SQL | Strong commercial backend foundation |
| React / Next.js | Commercial backend-focused fullstack contribution |
| Docker | Local / personal project / tooling unless new evidence exists |
| NestJS | Personal project / training / this project after implementation |
| OpenAI API | Personal project / AI integration exposure |
| Claude Code / MCP | AI-assisted development workflow / personal tooling exposure |
| Kubernetes | Basic exposure, usually omit |
| AWS / DynamoDB / MySQL | Needs evidence unless confirmed later |

## 11. Physical Artifact Vision

A core requirement is physical output.

The application must produce real files that can be used outside the application.

Target folder structure for new generated workspaces:

```text
storage/applications/
  2026_06_23_Action1_Backend_Developer_Node_js_JavaScript_TypeScript/
    00_vacancy_source.txt
    01_vacancy_analysis.json
    01_vacancy_analysis.md
    02_targeted_cv_content.json
    02_targeted_cv_content.md
    03_pre_pdf_check.json
    03_pre_pdf_check.md
    04_cv_export.html
    04_cv_export.pdf
    05_final_check.json
    05_final_check.md
    cover_letter.md
    cover_letter.pdf
```

Target folder structure for skipped workspaces:

```text
storage/applications/
  2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
    00_vacancy_source.txt
    01_vacancy_analysis.json
    01_vacancy_analysis.md
    01_skip_reason.md
    01_skip_reason.json
```

For newly created workspaces, the canonical vacancy source file is always:

```text
00_vacancy_source.txt
```

Imported legacy vacancy files may keep their original names, but the system should register them as vacancy source artifacts and may optionally copy them to `00_vacancy_source.txt`.

Legacy manual workflow may contain files named `03_targeted_CV_content_*`. In the new application pipeline, Prompt 2 output is stored canonically as `02_targeted_cv_content.md/json`.

Internal artifact files inside the workspace should use stable step-based names. Human-readable download/export names may include `company_slug` and `role_slug`.

Examples:

```text
Internal artifact name: 04_cv_export.pdf
Download/export file name: Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf

Internal skip artifact: 01_skip_reason.md
Download/export skip file: SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

Company slug and role slug may use different normalization rules. Company slug may preserve numbers because company names often include meaningful numbers, such as `Action1` or `CHECK24`.

PostgreSQL should store metadata and state. The filesystem should store generated documents.

PostgreSQL should know:

- which workspace owns each artifact;
- artifact type;
- file path;
- content hash;
- prompt run that produced it;
- generation status;
- creation time;
- whether the artifact is the latest version;
- whether the workspace was skipped;
- skip reason summary when applicable.

The filesystem should store:

- vacancy text;
- generated Markdown;
- generated JSON;
- generated HTML;
- generated PDF;
- generated cover letters;
- skip-reason files;
- optional screenshots or previews.

## 12. Output Format Vision

The application must support multiple output formats for generated CV content.

Default behavior:

```text
CV export format: PDF
```

Supported output formats:

| Format | Purpose | Default |
|---|---|---|
| PDF | Main physical CV file for real applications | Yes |
| HTML | Preview, layout debugging, browser-based rendering | No |
| JSON | Structured CV data, future template rendering, API use | No |
| Markdown | Internal editable draft artifact and optional downloadable draft | No |

The system should allow the user to choose a format explicitly, but if no format is provided, it must generate PDF by default.

Default CV export file:

```text
04_cv_export.pdf
```

Optional export files:

```text
04_cv_export.html
04_cv_export.json
04_cv_export.md
```

Markdown is primarily an internal editable artifact. It may be downloadable, but it is not the primary physical CV format.

Cover letter default output should also be PDF when generating a physical application package.

## 13. Technical Vision

The project should be implemented as a backend-first TypeScript application.

### 13.1 MVP Technical Stack

```text
Node.js
TypeScript
NestJS
PostgreSQL
Prisma
Docker Compose
Local filesystem storage
OpenAI or Anthropic API integration
Markdown / HTML / JSON / PDF export
Swagger / OpenAPI
Jest / basic tests
Claude Code with CLAUDE.md
```

### 13.2 Later Technical Stack

```text
Redis
BullMQ
Async background workers
Failed job handling
Retry logic
Idempotency keys
Next.js dashboard
GitHub Actions
Supertest integration tests
Structured logging with Pino or Winston
Optional MCP-style local tooling
DOCX export
```

## 14. Claude Code and MCP Role

Claude Code should be used from the start as a development assistant.

Claude Code should help with:

- project bootstrap;
- NestJS module structure;
- Prisma schema design;
- Docker Compose setup;
- test generation;
- refactoring;
- README and documentation;
- reviewing implementation tasks;
- producing PR-style summaries.

The repository should include:

```text
CLAUDE.md
docs/00_product_vision_updated_consistent.md
docs/01_requirements.md
docs/03_domain_model.md
docs/04_architecture.md
docs/05_epics.md
docs/06_roadmap.md
docs/07_task_backlog.md
docs/08_ai_pipeline.md
docs/09_artifact_storage.md
```

MCP should not block the MVP.

MCP is useful as:

- local file access during development;
- a way to inspect existing company folders;
- possible later local tooling around source files and generated artifacts;
- personal AI-assisted workflow exposure.

MCP should not be presented as commercial production experience.

## 15. What the Product Is Not

JobFlow CV Pipeline is not:

- a generic todo app;
- a public SaaS product for all job seekers;
- a fake ATS;
- a pure AI demo;
- a pure frontend project;
- an ML/MLOps project;
- a replacement for manual review;
- a tool that invents experience;
- a system that automatically sends applications without review.

The application must keep a human-in-the-loop workflow. Generated CVs and cover letters must be reviewed before use.

The application should not continue generating CV materials for a skipped vacancy unless the user explicitly overrides the skip decision.

## 16. Scope Boundaries

### 16.1 MVP Required

- Create application workspace manually from separate company, role and vacancy text inputs.
- Store vacancy source.
- Store source knowledge files metadata.
- Store prompt templates and versions.
- Run AI-assisted vacancy analysis.
- Pause after Prompt 1 for user review of `apply`, `maybe`, or `skip`.
- Generate skip-reason file when decision is `skip`.
- Stop CV generation by default for skipped vacancies.
- Continue to targeted CV generation only after user approval for `apply` or `maybe`.
- Generate targeted CV content for approved `apply` or `maybe` decisions.
- Export PDF by default.
- Optionally export HTML / JSON / Markdown.
- Save generated artifacts to filesystem.
- Save metadata to PostgreSQL.
- Use Docker Compose for PostgreSQL.
- Use Claude Code during development.

### 16.2 MVP Optional

- Final PDF check after PDF export.
- Basic existing folder import with preview and manual metadata correction.
- Basic PDF preview through generated HTML.

### 16.3 Later Scope

- Cover letter generation.
- Existing folder import with robust detection.
- Redis/BullMQ async processing.
- Retry and failed-job handling.
- Next.js dashboard.
- GitHub Actions.
- Advanced PDF preview.
- DOCX export.
- MCP-style local tooling.
- Application status tracking.
- Rejection analysis.

### 16.4 Out of Scope for Early MVP

- Multi-user authentication.
- Public deployment.
- Complex role-based access control.
- Automatic job scraping.
- Automatic application submission.
- Full ATS replacement.
- Advanced vector search / RAG unless clearly needed later.
- Production-grade cloud deployment.

## 17. Success Criteria

The project is successful when it produces real useful output and supports the job-search process.

### 17.1 Practical Success Criteria

- A new vacancy can be saved as an application workspace.
- The system can generate a structured vacancy analysis.
- The system can decide `apply`, `maybe`, or `skip`.
- If the decision is `skip`, the system creates a skip-reason file and stops CV generation by default.
- If the decision is `apply` or `maybe`, the system pauses for user approval and can generate targeted CV content using source knowledge files after approval.
- The system can export a physical PDF CV file by default.
- The system can optionally export CV content as HTML or JSON.
- Generated artifacts are saved on disk.
- Metadata is stored in PostgreSQL.
- Existing workspace states can be inspected.
- Unsupported claims are flagged or avoided.

### 17.2 Portfolio Success Criteria

- The repository has a clear README.
- The repository has `CLAUDE.md`.
- The project runs locally with Docker Compose and PostgreSQL.
- The backend has a clear NestJS module structure.
- The data model is documented and implemented with Prisma.
- The project demonstrates backend-first engineering, not only AI prompting.
- Tests cover at least core services in MVP.
- Later versions demonstrate async processing, retries and failed jobs.

## 18. CV Relevance

After implementation, the project can be safely described as a personal project.

Safe CV wording after real implementation:

```text
Personal Project: JobFlow CV Pipeline

Built a backend-first NestJS/TypeScript application for AI-assisted vacancy analysis and evidence-based targeted CV generation, using PostgreSQL, Prisma, Docker Compose, filesystem artifact storage, OpenAI/Anthropic API integration, Markdown/HTML/JSON/PDF export and Claude Code-assisted development workflow.
```

Stronger wording after async pipeline is implemented:

```text
Implemented an asynchronous AI pipeline for vacancy analysis, skip-decision handling, targeted CV generation and document export, with prompt versioning, PostgreSQL metadata, filesystem artifacts, retry handling, failed-job tracking and structured backend workflows.
```

Safe AI-assisted development wording:

```text
AI-assisted development: Claude Code / MCP / OpenAI API exposure through personal backend tooling and workflow automation projects.
```

Unsafe wording to avoid:

```text
Commercial MCP production experience
AI Engineer
LLM platform engineer
Production Claude Code automation
Agentic AI production experience
```

## 19. Skip Decision Example

The following skip file is an example of a workspace that should stop after Prompt 1 and generate a skip-reason artifact instead of continuing to CV generation.

```text
# SKIP — Broadvoice — Full-Stack Engineer with AI background

Date analyzed: 2026-06-24
Company: Broadvoice
Role: Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS
Location / remote: remote-first signal; exact country/timezone not specified in uploaded vacancy
Core stack: Node.js, TypeScript, Nest.js, React.js, LLM/AI services, RAG, function calling, agentic workflows, Kafka, Postgres, Docker, Kubernetes
Final score: 49/100
Decision: SKIP

## Main skip reason
Главный blocker — это не обычная Node.js/TypeScript fullstack роль, а AI-heavy product engineering роль для CCaaS платформы с production LLM/AI integrations, RAG/agentic workflows, Kafka, Docker/Kubernetes и end-to-end ownership. Для моего профиля коммерчески сильны Node.js/TypeScript, Azure serverless, integrations, production debugging и PostgreSQL foundation, но AI/RAG/OpenAI/FastAPI у меня personal/portfolio only, Nest.js training-only, Kubernetes basic/training, Docker non-production ownership, Kafka [needs evidence].

## Key mismatches
- Production AI/LLM integration is a must-have, but my AI/OpenAI/FastAPI/RAG experience is personal/coursework only, not commercial production.
- Kafka is required for async AI processing pipelines; Kafka evidence is missing: [needs evidence].
- Kubernetes is listed as required; my Kubernetes level is basic/training exposure only.
- Docker is required in product/platform context; my safe Docker wording is local development and personal projects, not production platform ownership.
- Nest.js is part of the role stack; my Nest.js is internship/training exposure, not commercial EPAM production stack.
- Fluent English is required; my safe level is English B1/B1+ professional working use, which creates a high communication risk for ownership/stakeholder-heavy role.

## Evidence from my profile
- Strong commercial Node.js/TypeScript backend experience from EPAM: Azure Functions, API integrations, backend workflows, testing and production support.
- Commercial React/Next.js contribution exists, but positioning must remain backend-focused fullstack, not frontend-first.
- Strong event-driven/async transferable background exists through Azure Functions, Durable Functions, Service Bus subscriptions, retries/idempotency and ProductsUp sync, but it is not Kafka.
- PostgreSQL foundation is strong from Factor–IT financial/accounting production systems, migrations and complex SQL.

## Risks if applying anyway
- Targeted CV would need to overemphasize AI/RAG/MCP/OpenAI personal projects as if they were production product experience.
- Interview could focus on production LLM integration, RAG architecture, agentic workflows, Kafka, Kubernetes and ambiguous AI product delivery — weak or unsupported areas.
- Fluent English plus stakeholder alignment, mentoring, contractor coordination and technical leadership could expose communication/seniority risk.
- Senior/ownership expectations are higher than my safest positioning: Mid/Middle+ primary, Senior-leaning only with very strong stack/domain match.

## Useful keywords to track later
- Production LLM integration
- RAG in production
- Function calling
- Agentic workflows
- MCP
- Kafka event-driven architecture
- CCaaS / contact center AI
- Real-time transcription / sentiment / intent detection
- AI product ownership

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если AI/LLM/RAG указан как nice-to-have, а не production must-have; если Kafka/Kubernetes не являются core requirements; если роль ближе к Node.js/TypeScript backend integrations; и если English expectations не требуют fluent stakeholder-heavy leadership.
```

This example shows that a skipped vacancy should still be treated as useful data. It preserves:

- final score;
- final decision;
- main skip reason;
- key mismatches;
- evidence from the candidate profile;
- risks if applying anyway;
- useful keywords to track later;
- future reconsideration condition.

The system should use this structure as a reference for skip artifacts.

## 20. Product Direction Summary

JobFlow CV Pipeline should first become a useful personal tool, then a portfolio-quality backend project.

The first meaningful apply/maybe milestone is:

```text
Vacancy source -> AI-assisted targeted CV content -> physical CV PDF saved to disk.
```

The first meaningful skip milestone is:

```text
Vacancy source -> AI-assisted vacancy analysis -> skip-reason file saved to disk.
```

Long-term vision:

```text
A reproducible, evidence-based, backend-first CV production system for real job applications, with prompt versioning, skip-decision handling, source knowledge management, physical document generation, artifact history and production-style backend workflows.
```

The project should always optimize for two outcomes:

1. Faster and safer job applications.
2. Honest, demonstrable backend portfolio value.
