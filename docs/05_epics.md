# JobFlow CV Pipeline — Epics

## 1. Purpose

This document breaks **JobFlow CV Pipeline** into large implementation epics.

It is aligned with the latest versions of:

```text
00_product_vision_updated_consistent.md
01_requirements.md
02_user_flows_v3_consistent.md
```

The epics follow the current product decisions:

- The first usable MVP starts with **manual workspace creation**, not robust folder import.
- The user enters **company name**, **role title**, and **multi-line vacancy text** as separate inputs.
- `00_vacancy_source.txt` is the canonical internal vacancy source file.
- New workspace and export naming uses underscore-based slugs.
- Legacy/manual naming is supported only for import compatibility.
- Prompt 1 always ends with a human review gate.
- `apply` and `maybe` do not continue automatically without user approval.
- `skip` creates skip artifacts and stops CV generation by default.
- Prompt 2 runs only after approval or manual override.
- PDF is the default physical CV export format.
- Prompt 3 / pre-PDF check is **P1 / MVP Optional**, not MVP blocker.
- Prompt 5 / final check is optional.
- Cover letter generation is Phase 2 / later, not required for first usable MVP.
- Import existing folders is P1 optional in basic form and later in robust form.
- Redis/BullMQ queues are later-stage; queues automate execution, not decision-making.
- Anti-overclaiming guard is a core safety requirement.

## 2. Epic Priority Overview

| Epic | Priority | Phase |
|---|---:|---|
| EPIC-01 Project Bootstrap & Local Backend Foundation | P0 | MVP Required |
| EPIC-02 Application Workspace Creation & Input Contract | P0 | MVP Required |
| EPIC-03 Slug Normalization & Naming Rules | P0 | MVP Required |
| EPIC-04 PostgreSQL Metadata Model & Artifact Registry | P0 | MVP Required |
| EPIC-05 Filesystem Artifact Storage | P0 | MVP Required |
| EPIC-06 Source Knowledge Base | P0 | MVP Required |
| EPIC-07 Prompt Template Versioning | P0 | MVP Required |
| EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate | P0 | MVP Required |
| EPIC-09 Skip Handling & Manual Override | P0 | MVP Required |
| EPIC-10 Prompt 2 Targeted CV Content Generation | P0 | MVP Required |
| EPIC-11 Basic Anti-Overclaiming Guard | P0 | MVP Required |
| EPIC-12 PDF Export by Default | P0 | MVP Required |
| EPIC-13 Workspace Status, Review Gates & Artifact Access | P1 | MVP hardening / not first-PDF blocker |
| EPIC-14 Basic Existing Folder Import | P1 | MVP Optional |
| EPIC-15 Prompt 3 Pre-PDF Check | P1 | MVP Optional |
| EPIC-16 Prompt 5 Final Check | P1 | MVP Optional |
| EPIC-17 Cover Letter / Recruiter Message Generation | P2 | Later / Phase 2 |
| EPIC-18 Redis/BullMQ Async Processing | P2 | Later |
| EPIC-19 Application Tracking & Rejection Analysis | P2 | Later |
| EPIC-20 Frontend Dashboard | P2 | Later / Optional if API-first MVP is enough |
| EPIC-21 Tests, CI/CD & Portfolio Documentation | P0 → P2 | Continuous |
| EPIC-22 Full Pipeline Control UI | P1 | Later — completes EPIC-20 |
| EPIC-23 Knowledge Source Content Wiring & Manual Note Injection | P0 | Later — closes a deferred MVP gap, blocks EPIC-24 |
| EPIC-24 AI Output Calibration Against Manual Baseline | P1 | Later |
| EPIC-25 Manual Parity Testing / Regression QA | P1 | Later |
| EPIC-26 Multi-Workspace Parallel Tabs UI | P2 | Later / Optional |

## 3. Epic Structure

Each epic contains:

- **Goal** — what this epic should achieve.
- **Business Value** — why it matters for the real job-search workflow.
- **Technical Value** — why it matters as a backend portfolio project.
- **Scope** — what is included.
- **Out of Scope** — what should not be built inside this epic.
- **Dependencies** — what must exist before this epic can be completed.
- **Acceptance Criteria** — how to know the epic is done.
- **CV Relevance** — how this epic can later support honest personal-project CV wording.

---

# EPIC-01 — Project Bootstrap & Local Backend Foundation

## Goal

Create the initial backend-first project foundation for JobFlow CV Pipeline.

## Business Value

Gives the project a stable local development setup so the job-search workflow can be implemented incrementally without technical chaos.

## Technical Value

Shows backend project setup, TypeScript/NestJS structure, PostgreSQL local development, Docker Compose and project documentation discipline.

## Scope

- Initialize repository structure.
- Create NestJS backend application.
- Add TypeScript configuration.
- Add Docker Compose with PostgreSQL.
- Add Prisma setup.
- Add `.env.example`.
- Add basic health endpoint.
- Add Swagger/OpenAPI.
- Add initial README.
- Add `CLAUDE.md` for Claude Code usage.
- Add docs directory structure.

## Out of Scope

- Full frontend dashboard.
- Redis/BullMQ queues.
- Production deployment.
- Authentication.
- Automatic job scraping.

## Dependencies

- Product vision.
- Requirements document.
- User flows document.

## Acceptance Criteria

- Project starts locally.
- PostgreSQL starts with Docker Compose.
- Backend connects to PostgreSQL.
- Prisma migration can run.
- Health endpoint returns successful response.
- Swagger/OpenAPI is available.
- `CLAUDE.md` exists.
- README explains local setup.

## CV Relevance

Can support a personal-project claim around backend-first TypeScript/NestJS development, local Docker Compose setup and structured project documentation.

---

# EPIC-02 — Application Workspace Creation & Input Contract

## Goal

Implement manual creation of an Application Workspace from separate company, role and vacancy text inputs.

## Business Value

This is the starting point of the real workflow. The user can save a new job opportunity in a structured way instead of keeping vacancy data only in chat or random files.

## Technical Value

Demonstrates API design, validation, DTOs, persistence, input handling and domain modeling.

## Scope

- Create workspace manually.
- Collect required fields separately:
  - `company_name_original`;
  - `role_title_original`;
  - `vacancy_text`.
- Support optional fields:
  - `source_url`;
  - `application_date`;
  - `language`;
  - `notes`.
- Support multi-line vacancy text.
- Preserve vacancy text exactly as submitted.
- Store vacancy text as UTF-8.
- Generate vacancy content hash.
- Show workspace preview before creation.
- Save canonical vacancy file as `00_vacancy_source.txt`.
- Set initial workspace status to `source_saved`.

## Out of Scope

- Robust folder import.
- Automatic job scraping.
- AI analysis.
- CV generation.
- File upload UI polish beyond basic API support.

## Dependencies

- EPIC-01 Project Bootstrap.
- EPIC-03 Slug Normalization.
- EPIC-04 PostgreSQL Metadata Model.
- EPIC-05 Filesystem Artifact Storage.

## Acceptance Criteria

- User can create a workspace from separate company, role and vacancy text fields.
- Empty company name is rejected.
- Empty role title is rejected.
- Empty vacancy text is rejected unless importing from a source file in a later flow.
- Original company name is preserved.
- Original role title is preserved.
- Original vacancy text is preserved with line breaks and punctuation.
- `00_vacancy_source.txt` is created.
- Workspace metadata is stored in PostgreSQL.
- Workspace status is `source_saved`.

## CV Relevance

Can support claims around backend domain modeling, validation, file-backed workflows and PostgreSQL-backed metadata management.

---

# EPIC-03 — Slug Normalization & Naming Rules

## Goal

Implement safe and consistent naming rules for workspaces, internal artifacts and human-readable export/download files.

## Business Value

Prevents broken filenames, lost artifacts and inconsistent workspace folders while preserving original company and role names for display and prompt context.

## Technical Value

Shows attention to file safety, Unicode handling, deterministic naming, validation and testable utility design.

## Scope

- Generate `company_slug` from `company_name_original`.
- Generate `role_slug` from `role_title_original`.
- Preserve original company and role values separately.
- Use underscore-based naming for new workspaces and exported filenames.
- Support Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters.
- Preserve meaningful numbers in company slugs, for example `Action1` and `CHECK24`.
- Remove numbers from role slugs according to current rule unless changed later.
- Replace spaces and separators with `_`.
- Collapse repeated underscores.
- Remove leading/trailing underscores.
- Prevent empty slugs.
- Detect overly long generated filenames.
- Distinguish:
  - canonical internal artifact names;
  - human-readable download/export names;
  - legacy imported names.

## Out of Scope

- Full duplicate detection.
- Advanced transliteration.
- Renaming old legacy folders on disk.
- Changing imported original filenames automatically without user confirmation.

## Dependencies

- EPIC-02 Application Workspace Creation.
- EPIC-05 Filesystem Artifact Storage.

## Acceptance Criteria

- `Action1` remains `Action1` as company slug.
- `CHECK24 Vergleichsportal` becomes `CHECK24_Vergleichsportal`.
- `Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS` becomes `Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS`.
- Ukrainian/Cyrillic company names are not broken by Russian-only regex.
- Role slug uses only English letters, Cyrillic letters and underscores.
- Company slug may include English letters, Cyrillic letters, numbers and underscores.
- Empty generated slug blocks workspace creation and asks user to adjust input.
- Internal canonical files use short stable names such as `00_vacancy_source.txt` and `04_cv_export.pdf`.
- Download/export files may include `company_slug` and `role_slug`.

## CV Relevance

Can support careful backend-engineering positioning around input normalization, Unicode-safe filename handling, deterministic artifact generation and filesystem-safe design.

---

# EPIC-04 — PostgreSQL Metadata Model & Artifact Registry

## Goal

Create the PostgreSQL-backed data model for workspaces, prompts, AI runs, artifacts, knowledge sources and user review states.

## Business Value

Makes the workflow traceable. The user can see what was generated, from which vacancy, with which prompt version and where each file is stored.

## Technical Value

Demonstrates relational modeling, Prisma schema design, lifecycle states, auditability and backend persistence.

## Scope

Define initial models for:

- `ApplicationWorkspace`;
- `Company` or embedded company metadata;
- `JobVacancy` or vacancy metadata;
- `KnowledgeSource`;
- `PromptTemplate`;
- `PromptRun`;
- `AiRun`;
- `GeneratedArtifact`;
- `UserReviewDecision` or review fields;
- basic `ApplicationStatus` values.

Store metadata for:

- original company name;
- company slug;
- original role title;
- role slug;
- vacancy source path;
- vacancy source hash;
- workspace status;
- decision value;
- manual override flags;
- prompt version;
- AI provider/model;
- source file hashes;
- artifact path;
- artifact type;
- artifact hash;
- latest artifact flag;
- created/updated timestamps.

## Out of Scope

- Multi-user permissions.
- Complex role-based access control.
- Cloud database deployment.
- Full event sourcing.
- Advanced audit UI.

## Dependencies

- EPIC-01 Project Bootstrap.
- EPIC-02 Workspace Creation.
- EPIC-05 Filesystem Artifact Storage.

## Acceptance Criteria

- Prisma schema contains core domain models.
- Migrations can be applied locally.
- Workspace can be created and retrieved from PostgreSQL.
- Generated artifact metadata can be saved and queried.
- Prompt template version can be linked to prompt runs.
- AI run metadata can be linked to generated outputs.
- Workspace status can be updated through the pipeline.
- Manual overrides can be stored.

## CV Relevance

Can support claims around PostgreSQL/Prisma data modeling, metadata-driven workflows, auditability and artifact registry design.

---

# EPIC-05 — Filesystem Artifact Storage

## Goal

Implement reliable local filesystem storage for vacancy sources and generated artifacts.

## Business Value

The project must create real files that can be downloaded and used for real job applications.

## Technical Value

Shows backend work with local file storage, safe paths, content hashing, artifact lifecycle and metadata synchronization with PostgreSQL.

## Scope

- Configurable storage root.
- Workspace folder creation.
- Canonical internal file names:
  - `00_vacancy_source.txt`;
  - `01_vacancy_analysis.md/json`;
  - `01_skip_reason.md/json`;
  - `02_targeted_cv_content.md/json`;
  - `03_pre_pdf_check.md/json`;
  - `04_cv_export.html/pdf/json/md`;
  - `05_final_check.md/json`;
  - `cover_letter.md/pdf` later.
- Human-readable download/export names.
- File existence checks.
- Duplicate prevention.
- Content hash calculation.
- Artifact registry updates in PostgreSQL.
- Basic artifact download endpoint.

## Out of Scope

- Cloud object storage.
- Full version comparison UI.
- Automatic cleanup policies.
- OCR or PDF visual inspection.

## Dependencies

- EPIC-03 Slug Normalization.
- EPIC-04 PostgreSQL Metadata Model.

## Acceptance Criteria

- New workspace folder is created under the storage root.
- `00_vacancy_source.txt` is saved correctly.
- Generated artifacts are written with canonical internal names.
- Artifact metadata is stored in PostgreSQL.
- Artifact content hash is stored.
- Existing files are not overwritten silently.
- User can download at least the generated PDF artifact.
- Legacy names can be registered during import without changing the canonical rules for new workspaces.

## CV Relevance

Can support claims around filesystem artifact storage, file safety, backend-generated documents and metadata-driven file management.

---

# EPIC-06 — Source Knowledge Base

## Goal

Implement management of source knowledge files used by the AI pipeline.

## Business Value

Makes CV generation evidence-based and consistent. Source files become structured project knowledge instead of random prompt attachments.

## Technical Value

Demonstrates document metadata management, source versioning, hashing and AI input preparation.

## Scope

Support source knowledge files such as:

- master CV/profile sources;
- tech stack matrix;
- project/career case inventory;
- deep-dive evidence bank;
- CV format rules;
- certifications inventory;
- LinkedIn/CV layout references where applicable.

Store:

- file path;
- source type;
- display name;
- content hash;
- active/inactive status;
- imported timestamp;
- version or revision label.

Allow:

- listing knowledge sources;
- activating/deactivating sources;
- linking source files to PromptRun records;
- preserving which sources were used for each generated artifact.

## Out of Scope

- Full RAG/vector search.
- Automatic summarization of every source file.
- Cloud document connectors.
- Editing source files from the application in MVP.

## Dependencies

- EPIC-04 PostgreSQL Metadata Model.
- EPIC-05 Filesystem Artifact Storage.

## Acceptance Criteria

- Source knowledge file metadata can be registered.
- Active sources can be listed.
- PromptRun can store references to used sources and their hashes.
- The system can distinguish profile/evidence/format/certification source types.
- Source changes can be detected through content hash changes.

## CV Relevance

Can support claims around evidence-based AI workflows, source metadata management and reproducible document generation.

---

# EPIC-07 — Prompt Template Versioning

## Goal

Implement versioned prompt templates for Prompt 1, Prompt 2 and later prompt steps.

## Business Value

Makes the AI workflow reproducible. The user can know which prompt version produced which analysis or CV draft.

## Technical Value

Demonstrates versioned configuration, immutable prompt history, reproducible AI runs and safe change management.

## Scope

- Store prompt templates.
- Support prompt types:
  - Prompt 1 vacancy analysis;
  - Prompt 2 targeted CV content;
  - Prompt 3 pre-PDF check later;
  - Prompt 5 final check later;
  - cover letter later.
- Version prompt templates.
- Mark one version as active.
- Prevent silent overwrite of old prompt versions.
- Link PromptRun to exact prompt template version.
- Store prompt input snapshot.

## Out of Scope

- Full prompt editor UI in MVP if API/Swagger is enough.
- Prompt A/B testing.
- Multi-model benchmarking.

## Dependencies

- EPIC-04 PostgreSQL Metadata Model.
- EPIC-06 Source Knowledge Base.

## Acceptance Criteria

- Prompt templates can be created.
- Prompt templates can be versioned.
- Active prompt version can be selected.
- PromptRun stores exact prompt version used.
- Old prompt versions remain available for audit.
- Generated artifacts can be traced back to prompt version.

## CV Relevance

Can support claims around prompt versioning, reproducible AI workflows and backend configuration management.

---

# EPIC-08 — Prompt 1 Vacancy Analysis & Decision Gate

## Goal

Run AI-assisted vacancy analysis and pause for human review of `apply`, `maybe` or `skip`.

## Business Value

Prevents wasting time on unsuitable vacancies and gives a structured summary before CV generation.

## Technical Value

Demonstrates AI API integration, structured outputs, JSON/Markdown artifact generation, state transitions and human-in-the-loop workflow design.

## Scope

Prompt 1 must generate:

- must-have requirements;
- nice-to-have requirements;
- wishlist requirements;
- hidden role logic;
- tech stack match;
- gaps;
- language risk;
- location/remote risk;
- evidence risks;
- final score;
- decision: `apply`, `maybe`, or `skip`;
- next recommended action.

The system must create:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

The system must then pause at `paused_after_analysis`.

## Out of Scope

- Automatic continuation to CV generation.
- Full async queue processing in MVP.
- Prompt 2 generation.
- Cover letter generation.

## Dependencies

- EPIC-04 PostgreSQL Metadata Model.
- EPIC-06 Source Knowledge Base.
- EPIC-07 Prompt Template Versioning.
- Basic workspace status and review-gate fields from EPIC-04 / EPIC-05; full EPIC-13 hardening can follow after first PDF export.

## Acceptance Criteria

- User can start Prompt 1 for a workspace with `source_saved` status.
- System creates an AiRun and PromptRun record.
- System saves Markdown and internal JSON artifacts.
- System updates status to `analysis_ready` and then `paused_after_analysis`.
- User sees decision summary.
- User must approve before continuing to Prompt 2.
- `apply`, `maybe` and `skip` are handled distinctly.

## CV Relevance

Can support claims around AI-assisted analysis, structured AI outputs, prompt runs, source-backed decision workflows and human-in-the-loop design.

---

# EPIC-09 — Skip Handling & Manual Override

## Goal

Implement the skip path after Prompt 1, including skip artifact generation, pipeline stop and explicit manual override.

## Business Value

Skipped vacancies still produce useful learning artifacts without wasting time on targeted CV generation.

## Technical Value

Shows branching workflow logic, state management, artifact creation, auditability and safe manual override handling.

## Scope

- Detect `skip` decision after Prompt 1.
- Generate canonical internal skip artifacts:
  - `01_skip_reason.md`;
  - `01_skip_reason.json`.
- Support human-readable download/export skip file:
  - `SKIP_<company_slug>_<role_slug>_reason_RU.md`.
- Default skip reason language: Russian.
- Set workspace status to `skipped`.
- Stop CV generation by default.
- Allow explicit manual override:
  - `manual_override_apply`;
  - `manual_override_maybe`.
- Log manual override with timestamp and optional user note.

Skip file should include:

- date analyzed;
- company;
- role;
- location/remote;
- core stack;
- final score;
- decision;
- main skip reason;
- key mismatches;
- evidence from profile;
- risks if applying anyway;
- useful keywords to track later;
- future reconsideration condition.

## Out of Scope

- Rejection analysis.
- Application tracking after skip beyond basic archive/reopen.
- Automatic rescheduling of skipped roles.

## Dependencies

- EPIC-08 Prompt 1 Analysis.
- EPIC-05 Filesystem Artifact Storage.
- Basic workspace status and review-gate fields from EPIC-04 / EPIC-05; full EPIC-13 hardening can follow after first PDF export.

## Acceptance Criteria

- Skip decision generates `01_skip_reason.md/json`.
- Workspace status becomes `skipped`.
- Prompt 2 is not started automatically.
- User can archive or reopen skipped workspace.
- User can explicitly override skip and continue.
- Override is logged.
- Download/export skip file can use human-readable name with `_RU` suffix.

## CV Relevance

Can support claims around branching backend workflows, decision handling, audit trails and safety-first automation.

---

# EPIC-10 — Prompt 2 Targeted CV Content Generation

## Goal

Generate targeted CV content only after user approval of `apply` or `maybe`, or explicit manual override of `skip`.

## Business Value

Creates evidence-based targeted CV content connected to the vacancy while preventing unsafe or unnecessary CV generation.

## Technical Value

Demonstrates structured document generation, AI integration, evidence-source usage, JSON/Markdown outputs and workflow gating.

## Scope

Prompt 2 must generate:

- metadata;
- target CV strategy;
- role-specific headline;
- summary;
- top skills;
- experience bullets;
- selected projects if relevant;
- certifications selection;
- evidence table;
- overclaiming check;
- risks;
- open evidence questions;
- PDF readiness notes.

The system creates:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

Prompt 2 runs only when:

- `apply` was approved;
- `maybe` was explicitly approved;
- `skip` was manually overridden.

## Out of Scope

- PDF generation.
- Cover letter generation.
- Prompt 3 pre-PDF check.
- Automatic application submission.

## Dependencies

- EPIC-08 Prompt 1 Analysis.
- EPIC-09 Skip Handling.
- EPIC-11 Basic Anti-Overclaiming Guard.
- EPIC-06 Source Knowledge Base.
- EPIC-07 Prompt Template Versioning.

## Acceptance Criteria

- Prompt 2 cannot run before Prompt 1 decision gate is resolved.
- Prompt 2 cannot run for skipped vacancy unless override exists.
- System saves Markdown and internal JSON artifacts.
- Workspace status becomes `cv_draft_ready` and then `paused_after_cv_draft`.
- User can review, edit, regenerate or pause.
- Generated content separates commercial and personal experience.
- Unsupported claims are flagged or avoided.

## CV Relevance

Can support claims around AI-assisted document generation, structured outputs, evidence-based content generation and human-reviewed workflow design.

---

# EPIC-11 — Basic Anti-Overclaiming Guard

## Goal

Implement basic guardrails that prevent unsupported CV claims from being generated or exported.

## Business Value

Protects the user from sending risky CVs that overstate commercial experience or create interview traps.

## Technical Value

Demonstrates business-rule validation, evidence classification, safety checks and structured warnings.

## Scope

Guard against unsafe claims such as:

- commercial AI/LLM/RAG production experience;
- commercial FastAPI/Python production experience;
- commercial NestJS EPAM production stack;
- Docker production ownership;
- Kubernetes production experience;
- AWS/DynamoDB/MySQL without evidence;
- fluent English or professional German without support;
- DevOps ownership instead of DevOps collaboration.

The system should:

- use source knowledge base classifications;
- produce warnings;
- mark `needs evidence`;
- suggest safer wording;
- log manual overrides.

## Out of Scope

- Full semantic claim verification.
- Automated fact-checking against external sources.
- ML-based hallucination detection.
- Legal compliance tooling.

## Dependencies

- EPIC-06 Source Knowledge Base.
- EPIC-10 Prompt 2 Targeted CV Generation.
- Basic review-gate fields from EPIC-04 / EPIC-05; full EPIC-13 hardening can follow after first PDF export.

## Acceptance Criteria

- Generated CV content includes an evidence/safety section.
- Known unsafe claims are flagged.
- User can remove, rephrase, mark `needs evidence` or override.
- Override is logged.
- Guardrails distinguish commercial, working commercial, personal project and basic exposure.
- Basic guard runs before PDF export.

## CV Relevance

Can support claims around evidence-based automation, safety checks, validation rules and domain-specific AI workflow constraints.

---

# EPIC-12 — PDF Export by Default

## Goal

Generate a physical CV PDF file by default from approved targeted CV content.

## Business Value

This is the first real output that can be sent to employers.

## Technical Value

Demonstrates backend document generation, HTML/PDF rendering, file output, artifact metadata and download support.

## Scope

- Default export format: PDF.
- Generate `04_cv_export.pdf`.
- Generate `04_cv_export.html` if required for PDF rendering.
- Optionally generate `04_cv_export.json` as user-facing structured export later.
- Optionally allow Markdown as downloadable draft.
- Store artifact metadata.
- If `03_pre_pdf_check.md/json` exists, read and apply its recommendations before rendering `04_cv_export.html/pdf`.
- Provide download endpoint.
- Use human-readable download filename:
  - `Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf`.

## Out of Scope

- DOCX export.
- Pixel-perfect CV template matching from day one.
- Advanced visual PDF validation.
- Final check as a blocker.
- Cover letter generation.

## Dependencies

- EPIC-05 Filesystem Artifact Storage.
- EPIC-10 Prompt 2 Targeted CV Content Generation.
- EPIC-11 Basic Anti-Overclaiming Guard.

## Acceptance Criteria

- User can export PDF after CV draft review approval.
- If no format is selected, PDF is generated by default.
- Internal file is `04_cv_export.pdf`.
- Human-readable download filename includes company and role slugs.
- Artifact metadata is stored in PostgreSQL.
- User can download the PDF.
- Export failure saves error information and does not delete previous artifacts.
- Existing Prompt 3 recommendations are treated as mandatory context for export; if Prompt 3 was not run, export is not blocked by their absence.

## CV Relevance

Can support claims around Markdown/HTML/PDF export, document generation, filesystem artifacts and backend-generated files.

---

# EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Goal

Implement workspace lifecycle statuses, human review gates and artifact access.

## Business Value

Allows the user to pause, review, resume and understand what has already been done for each vacancy.

## Technical Value

Demonstrates workflow state machine design, user decision persistence, artifact browsing and safe pipeline control.

## Scope

Statuses include:

```text
source_saved
analysis_running
analysis_ready
paused_after_analysis
skipped
cv_generation_running
cv_draft_ready
paused_after_cv_draft
pre_pdf_check_ready
paused_before_export
export_running
cv_pdf_generated
final_check_ready
ready_to_apply
cover_letter_generated
applied
rejected
archived
failed
```

Review gates:

- input quality checkpoint before Prompt 1;
- after Prompt 1 decision;
- after Prompt 2 CV draft;
- before export if Prompt 3 is implemented later;
- after PDF export optionally;
- after final check if implemented.

Artifact access:

- preview where possible;
- download;
- copy path;
- latest marker;
- generated-by prompt run;
- created timestamp.

## Out of Scope

- Full frontend dashboard if API/Swagger is enough initially.
- Advanced version comparison.
- Collaboration/multi-user review.

## Dependencies

- EPIC-04 PostgreSQL Metadata Model.
- EPIC-05 Filesystem Artifact Storage.
- EPIC-08 Prompt 1 Analysis.
- EPIC-10 Prompt 2 Generation.
- EPIC-12 PDF Export.

## Acceptance Criteria

- Workspace status changes after each pipeline step.
- User can pause and resume from key states.
- Prompt 1 review gate prevents automatic continuation.
- Prompt 2 review gate prevents automatic export.
- Artifacts can be listed for a workspace.
- PDF can be downloaded.
- Skip artifacts can be downloaded.
- Failed state preserves previous artifacts.

## CV Relevance

Can support claims around workflow lifecycle management, review gates, artifact access APIs and human-in-the-loop process design.

---

# EPIC-14 — Basic Existing Folder Import

## Goal

Implement optional import of existing manual job application folders with preview and manual metadata correction.

## Business Value

Allows migration of existing workspaces such as Action1, Amach, AppsFlyer and Broadvoice into the new system without losing history.

## Technical Value

Demonstrates filesystem scanning, legacy compatibility, metadata inference, duplicate handling and import preview workflows.

## Scope

Basic import should detect legacy/manual structures such as:

```text
Company/
  YYYY.MM.DD/
    *.txt
    03_targeted_CV_content_*.md
    *_CV.pdf
    *_Cover_Letter.pdf
    SKIP_*.md
```

Detect:

- company;
- date;
- role;
- vacancy source file;
- targeted CV content;
- CV PDF;
- cover letter PDF;
- skip reason file;
- current status.

Support user preview and manual correction.

## Out of Scope

- Fully robust recursive import across all edge cases.
- Automatic correction of all metadata.
- Renaming old files.
- Import without user confirmation.

## Dependencies

- EPIC-03 Slug Normalization.
- EPIC-04 PostgreSQL Metadata Model.
- EPIC-05 Filesystem Artifact Storage.

## Acceptance Criteria

- User can select an existing folder root.
- System scans expected legacy patterns.
- System shows import preview.
- User can fix company/role metadata.
- Imported files are registered as artifacts.
- Legacy names are preserved as imported artifact paths.
- New canonical naming rules remain unchanged for new workspaces.

## CV Relevance

Can support claims around import workflows, filesystem scanning, legacy compatibility and metadata reconciliation.

---

# EPIC-15 — Prompt 3 Pre-PDF Check

## Goal

Add optional pre-PDF safety and layout check before PDF export.

## Business Value

Improves CV safety and quality before sending files to employers.

## Technical Value

Demonstrates multi-step AI pipelines, quality gates, structured review output and document-readiness validation.

## Scope

Prompt 3 should generate:

- critical issues;
- minor issues;
- overclaiming risks;
- unsupported technologies;
- summary length risk;
- page count risk;
- recommended edits;
- readiness status.

Artifacts:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
```

Status:

```text
pre_pdf_check_ready
paused_before_export
```

## Out of Scope

- Required blocker for first usable MVP.
- Visual PDF inspection.
- OCR.
- Full layout engine.

## Dependencies

- EPIC-10 Prompt 2 Targeted CV Generation.
- EPIC-11 Anti-Overclaiming Guard.
- EPIC-13 Review Gates.

## Acceptance Criteria

- User can run Prompt 3 after CV draft is ready.
- System saves Markdown and JSON artifacts.
- System pauses before export.
- Prompt 3 recommendations are available to the export step and must be used if the user proceeds to export.
- User can apply safe fixes, edit manually, export, or return to CV draft.
- Prompt 3 is optional and does not block basic MVP PDF export if not implemented yet.

## CV Relevance

Can support claims around quality gates, AI-assisted review, document readiness checks and safety-focused generation pipelines.

---

# EPIC-16 — Prompt 5 Final Check

## Goal

Add optional final review after PDF export.

## Business Value

Helps verify whether the final generated CV is ready to send.

## Technical Value

Demonstrates post-generation validation, final quality scoring and artifact-linked review outputs.

## Scope

Prompt 5 should generate:

- final quality score;
- page count notes;
- missing sections;
- overclaiming issues;
- formatting notes;
- final decision:
  - `ready_to_send`;
  - `needs_edit`;
  - `do_not_send`.

Artifacts:

```text
05_final_check.md
05_final_check.json
```

## Out of Scope

- Required MVP blocker.
- Automated sending.
- Full visual PDF validation in early version.
- Skip-file review unless explicitly requested.

## Dependencies

- EPIC-12 PDF Export.
- EPIC-13 Review Gates.

## Acceptance Criteria

- User can run final check after PDF exists.
- Final check does not run automatically for skipped vacancies.
- System saves artifacts.
- User can mark ready, edit/re-export, pause or archive.
- Final check is optional for MVP.

## CV Relevance

Can support claims around post-generation validation, workflow quality checks and document lifecycle management.

---

# EPIC-17 — Cover Letter / Recruiter Message Generation

## Goal

Generate optional cover letters, recruiter messages and application emails after CV draft or PDF exists.

## Business Value

Supports real application packages when a vacancy or platform requires a cover letter or message.

## Technical Value

Demonstrates multi-artifact generation, prompt reuse, document generation and workflow extension.

## Scope

Generate:

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

Use:

- vacancy source;
- Prompt 1 analysis;
- targeted CV content;
- source profile;
- risk notes;
- cover letter prompt template.

Default cover letter physical output: PDF.

## Out of Scope

- Required first MVP.
- Automatic application sending.
- Gmail/LinkedIn integrations.
- German cover letters unless explicitly requested later.

## Dependencies

- EPIC-10 Prompt 2 Targeted CV Generation.
- EPIC-12 PDF Export.
- EPIC-07 Prompt Template Versioning.

## Acceptance Criteria

- User can generate cover letter after CV draft or final CV exists.
- Markdown and PDF artifacts are saved.
- Artifact metadata is stored.
- User can download cover letter PDF.
- Generated text remains evidence-based and vacancy-specific.

## CV Relevance

Can support claims around multi-document generation, application workflow automation and AI-assisted recruiter communication tooling.

---

# EPIC-18 — Redis/BullMQ Async Processing

## Goal

Move long-running pipeline steps into background queues using Redis and BullMQ.

## Business Value

Improves reliability and user experience for AI calls, document export and import tasks that may take time.

## Technical Value

Demonstrates production-style async processing, retries, failed-job handling, idempotency and worker design.

## Scope

Add:

- Redis;
- BullMQ;
- worker process;
- queue job records;
- retry handling;
- failed job handling;
- cancellation;
- resume;
- idempotency keys;
- progress state.

Recommended queues:

```text
analysis-queue
cv-generation-queue
pre-pdf-check-queue
document-export-queue
final-check-queue
cover-letter-queue
import-queue
```

Important rule:

```text
Queues automate execution, not decision-making.
```

## Out of Scope

- Replacing human review gates.
- High-scale distributed processing.
- Kubernetes deployment.
- Cloud queue infrastructure.

## Dependencies

- EPIC-08 Prompt 1 Analysis.
- EPIC-10 Prompt 2 Generation.
- EPIC-12 PDF Export.
- EPIC-13 Status & Review Gates.

## Acceptance Criteria

- AI analysis can run as background job.
- CV generation can run as background job.
- PDF export can run as background job.
- Job status can be tracked.
- Failed jobs preserve previous artifacts.
- Retry count is stored.
- Idempotency key prevents accidental duplicate work or asks user whether to reuse/create new version.
- Human review gates remain enforced.

## CV Relevance

Can support stronger personal-project wording around asynchronous processing, Redis/BullMQ, retries, idempotency, failed jobs and production-style backend workflows.

---

# EPIC-19 — Application Tracking & Rejection Analysis

## Goal

Track what happened after sending an application and save rejection analysis when applicable.

## Business Value

Closes the loop between generated CVs and real hiring outcomes. Helps improve future targeting.

## Technical Value

Demonstrates lifecycle management, note-taking, post-application analytics and document generation beyond CV export.

## Scope

Track statuses:

```text
applied
recruiter_contacted
interview
test_task
rejected
offer
archived
```

Support:

- applied date;
- applied via;
- submitted files;
- notes;
- pasted rejection text;
- generated rejection analysis;
- learning points;
- future CV rule notes.

## Out of Scope

- Automatic email scraping.
- Gmail integration in early version.
- Calendar integration.
- Recruiter CRM features.

## Dependencies

- EPIC-04 PostgreSQL Metadata Model.
- EPIC-05 Filesystem Artifact Storage.
- EPIC-13 Workspace Status.

## Acceptance Criteria

- User can mark workspace as applied.
- User can store submitted file references.
- User can paste rejection text.
- System can save rejection analysis artifact.
- Workspace status can become `rejected` or `archived`.

## CV Relevance

Can support claims around workflow management, lifecycle tracking and AI-assisted analysis of real job-search feedback.

---

# EPIC-20 — Frontend Dashboard

## Goal

Add a convenient UI for managing workspaces, review gates, artifacts and prompt runs.

## Business Value

Makes the tool faster and more comfortable to use than Swagger/API-only workflow.

## Technical Value

Demonstrates backend-focused fullstack capability with a practical UI connected to a real API.

## Scope

Potential screens:

```text
/workspaces
/workspaces/new
/workspaces/:id
/workspaces/:id/analysis
/workspaces/:id/cv-draft
/workspaces/:id/pre-pdf-check
/workspaces/:id/artifacts
/workspaces/:id/final-check
/knowledge-sources
/prompt-templates
```

UI should support:

- workspace list;
- workspace creation;
- input preview;
- analysis review;
- decision gate;
- CV draft review;
- artifact list/download;
- prompt template management;
- source knowledge list.

## Out of Scope

- Public SaaS UI.
- Multi-user collaboration.
- Advanced design system.
- Authentication unless deployment requires it later.

## Dependencies

- EPIC-13 Workspace Status & Artifact Access.
- EPIC-02 Workspace Creation.
- EPIC-08 Prompt 1.
- EPIC-10 Prompt 2.
- EPIC-12 PDF Export.

## Acceptance Criteria

- User can create workspace through UI.
- User can review Prompt 1 result through UI.
- User can approve/skip/override through UI.
- User can see CV draft artifact.
- User can download PDF.
- User can view artifact list.

## CV Relevance

Can support backend-focused fullstack positioning with React/Next.js if implemented, while keeping backend as the core value.

**Note (added during EPIC-22 planning):** the Phase 13 implementation (TASK-055/056/057) delivered
workspace creation and review-gate screens, but not the step-trigger actions or artifact
content/download views this epic's Scope/Acceptance Criteria describe (e.g. "User can download
PDF", "User can see CV draft artifact" were never wired to real UI controls — only reachable via
direct API/Swagger calls). That remaining scope is picked up by EPIC-22 rather than reopening this
epic, consistent with ADR-018's approach to gaps found after a phase is marked done.

---

# EPIC-21 — Tests, CI/CD & Portfolio Documentation

## Goal

Ensure the project is testable, documented and portfolio-ready.

## Business Value

Reduces risk of breaking the workflow and makes the project easier to maintain.

## Technical Value

Demonstrates software engineering maturity: tests, CI, docs, architecture notes and reproducible local setup.

## Scope

Tests for:

- slug normalization;
- workspace creation;
- artifact storage;
- prompt template versioning;
- skip decision handling;
- status transitions;
- anti-overclaiming guard basics;
- PDF export service where feasible.

Documentation:

- README;
- setup instructions;
- architecture notes;
- AI-assisted workflow notes;
- known limitations;
- safe CV wording;
- examples/screenshots later.

CI/CD:

- GitHub Actions later or when repo is ready;
- run tests;
- optionally lint/build.

## Out of Scope

- Full enterprise CI/CD.
- Cloud deployment pipeline.
- Kubernetes.
- Full test coverage promises without implementation evidence.

## Dependencies

- All P0 epics for meaningful test coverage.
- GitHub repository.

## Acceptance Criteria

- Core unit tests exist.
- Slug normalization has tests, including Cyrillic and company numbers.
- Workspace creation has tests.
- Skip handling has tests.
- Artifact storage has tests.
- README explains how to run locally.
- Project documentation is consistent with product vision, requirements and user flows.
- Portfolio wording does not claim commercial experience for personal-project technologies.

## CV Relevance

Can support claims around Jest testing, CI/CD, documentation, maintainability and portfolio-quality backend engineering.

---

# EPIC-22 — Full Pipeline Control UI

## Goal

Let the user drive every pipeline step — start analysis, generate/regenerate the CV draft, run
PDF export, view and download every artifact — entirely from the web dashboard, without falling
back to curl/Swagger for actions the backend already supports.

## Business Value

Today the dashboard can create a workspace and approve/skip/regenerate once the backend has
already progressed to a paused state, but starting analysis, running the first CV draft
generation and triggering export still require a direct API call. A real end-to-end user (the
project owner processing a real vacancy) cannot yet stay inside the browser for a full
application cycle.

## Technical Value

Exercises the full existing `apps/api` endpoint surface from a real client rather than curl/
Swagger, and establishes the Server Action + API client patterns future steps (cover letter,
final check, application tracking) will reuse.

## Scope

- Trigger control for every pipeline action not yet wired to the UI:
  - start analysis (`POST /workspaces/:id/run-analysis`, and the async/queued variant
    `run-analysis-async` + job status polling via `GET .../analysis-job/:jobId`);
  - generate the first CV draft (`POST /workspaces/:id/generate-cv-content` — today only the
    post-draft `regenerate` action exists in the UI, not the initial generation call);
  - run PDF export (`POST /workspaces/:id/export-cv`);
  - confirm a skip decision (`POST /workspaces/:id/confirm-skip` — TASK-057 wired `override-skip`
    but not this one);
  - run the optional Prompt 3 pre-PDF check (`POST /workspaces/:id/run-pre-pdf-check`) and view
    its result;
  - run the optional Prompt 5 final check (`POST /workspaces/:id/run-final-check`) and view its
    result;
  - generate a cover letter (`POST /workspaces/:id/generate-cover-letter`, Phase 2 feature already
    implemented on the backend since TASK-049) and view its content;
  - the application-tracking lifecycle actions (`mark-ready-to-apply`, `mark-applied`,
    `mark-rejected`, `archive` — `TASK-050`) and rejection-text submission
    (`POST /workspaces/:id/rejection-text` — `TASK-051`).
- In-UI artifact content viewing: render the actual content of `01_vacancy_analysis` and
  `02_targeted_cv_content` (not just filename/version metadata in a table row).
- Raw vacancy source view (`00_vacancy_source.txt`) — currently the UI never shows what was
  actually submitted for a workspace.
- A real download link/button for every `GeneratedArtifact`, not just its filename as plain text.
- A manual-note input field per workspace (data/behavior defined by EPIC-23 — this epic only
  needs to expose the control once that field exists).
- Visual quality matching or exceeding the existing `apps/web` pages (Tailwind conventions
  already in use: spacing/typography hierarchy, dark mode, loading/empty/error states) — this is
  a portfolio-facing screen, not an internal admin form.
- Structure the new step-trigger/artifact-viewer UI as one self-contained component tree (own
  local state, no assumption of being the only workspace panel on the page), so EPIC-26's
  multi-workspace tabs can host multiple instances of it later without a rewrite. Building the
  tab container itself stays EPIC-26's scope.

## Out of Scope

- Multi-workspace tabs UI (EPIC-26) — this epic only needs to keep its components reusable for
  it, per the Scope note above; it does not build the tab container.
- New backend endpoints — this epic wires up API surface that already exists per `CLAUDE.md`'s
  module map; only add a backend endpoint if a genuine gap is found during implementation, and
  treat that as a separate, explicitly-scoped change.
- A new design system or component library — reuse the existing Tailwind setup and component
  conventions already established in `apps/web`, don't introduce a new one.

## Dependencies

- EPIC-20 Frontend Dashboard (Phase 13) — this epic completes remaining scope from EPIC-20 (see
  note in EPIC-20).
- EPIC-13 Workspace Status, Review Gates & Artifact Access — the data (`GeneratedArtifact` list,
  workspace status) already exists via `getWorkspace`.

## Acceptance Criteria

- From a workspace at `source_saved`, the user can start analysis from a button, without leaving
  the browser.
- After apply/maybe approval, the user can trigger the first CV draft generation from a button
  (not only `regenerate` after a draft already exists).
- After CV draft approval, the user can trigger PDF export from a button.
- The user can read the actual content of the vacancy analysis and targeted CV content artifacts
  in the UI, not just see that they exist.
- The user can download every listed artifact via a working link/button.
- The user can run and read the Prompt 3 pre-PDF check and Prompt 5 final check results, generate
  and read a cover letter, and drive the full application-tracking lifecycle (ready-to-apply →
  applied → rejected/archived, plus rejection-text submission) — all without a direct API call.
- The new UI's visual design matches or exceeds the existing `apps/web` pages' quality bar.
- The new UI is built as a self-contained, reusable-per-panel component tree per the Scope note
  above (verified by EPIC-26 being able to host multiple instances without rewriting it, once
  EPIC-26 is picked up).

## CV Relevance

Can support claims around building a full-featured internal tool UI on top of an existing REST
API, not just a read-only dashboard.

---

# EPIC-23 — Knowledge Source Content Wiring & Manual Note Injection

## Goal

Close a known, documented MVP gap — knowledge source content is never actually loaded into any
prompt's input — and add a mechanism for the user to attach a free-text manual note to a
workspace that subsequent prompt steps include in their input, mirroring the two things the
manual ChatGPT-chat workflow relies on that the pipeline does not yet replicate: real source
content, and ad hoc human clarifications carried forward.

## Business Value

Real knowledge source content (master CV, tech stack matrix, project inventory, etc.) is
currently replaced in every prompt input by the literal placeholder string
`[content not loaded in MVP]` — confirmed present in `PromptInputBuilderService`,
`Prompt2InputBuilderService`, and `CoverLetterInputBuilderService`. This was an explicit, tracked
MVP-time deferral (`TEST_LOG.md`, TASK-037B: "Loading actual source content into the input
context is out of scope for TASK-037B, see TASK-037C-0/037C") — TASK-037C-0/037C then registered
the files' metadata in PostgreSQL but never returned to wire the content itself into the prompt.
Without it, the AI has no real evidence to draw from beyond the vacancy text and its own general
knowledge, so no amount of prompt-wording calibration (EPIC-24) can reach parity with the manual
workflow, which does have real source content available.

Separately, the manual workflow lets the user type an ad hoc clarification/instruction into the
chat mid-flow (e.g. "no commercial AWS experience, remove that", "add this project") which the
chat's own memory carries into later steps. The pipeline's per-step outputs already carry forward
today (`Prompt2InputBuilderService` includes the full `01_vacancy_analysis` artifact as
`=== PROMPT 1 ANALYSIS ===`), but there is no equivalent field for a human-authored note.

A real example transcript of the manual workflow (a full Prompt 1 → Prompt 2 → Prompt 3 → PDF
session, reviewed during this epic's planning) also showed a third gap: **every step in the
manual flow ends with the AI self-scoring its own output** ("Output Quality Score" — a weighted
rubric out of 100, a verdict, and a proceed yes/no). `final-check.schema.ts` (Prompt 5) already
has an equivalent `quality_score: number` field — but `vacancy-analysis.schema.ts` (Prompt 1) and
`targeted-cv-content.schema.ts` (Prompt 2) have no such field at all. This epic adds it to both,
matching the pattern Prompt 5 already established, so the pipeline replicates this self-QA
signal consistently across every AI-assisted step, not just the last one.

## Technical Value

Closes a long-deferred, explicitly-documented MVP gap with real, hash-verified content loading
against the already-existing `KnowledgeSource` registry and `HashService`. Adds a clean new
mechanism (a per-workspace manual note) that fits the existing artifact/`PromptRun` model rather
than building a full chat/conversation system.

## Scope

- Replace the `[content not loaded in MVP]` placeholder in `PromptInputBuilderService` (Prompt 1),
  `Prompt2InputBuilderService`, and `CoverLetterInputBuilderService` with the real file content,
  read from `KNOWLEDGE_SOURCES_ROOT` + `ks.filePath`, respecting the existing
  `KnowledgeSourceSelectionService` per-step source groups (explicit selection, not "everything on
  disk" — see `CLAUDE.md`).
- At read time, verify the file's actual content hash still matches its registered `contentHash`
  and surface a mismatch instead of silently trusting stale metadata.
- Add a manual-note field the user can attach to a workspace at any point (single accumulating
  free-text field per workspace, not a full conversation thread) — included by every subsequent
  prompt step's input builder as its own labeled block, the same way `01_vacancy_analysis` is
  included today.
- Expose a control for the manual note in the UI (surfaced by EPIC-22).
- Add a self-assessment field (mirroring `FinalCheckOutput.quality_score`) to
  `VacancyAnalysis` (Prompt 1) and `TargetedCvContentOutput` (Prompt 2), with a corresponding new
  `PromptTemplate` version instructing the model to score its own output the same way the manual
  workflow's chat prompts already do.

## Out of Scope

- A full multi-turn chat interface — one accumulating note per workspace, not a message thread.
- Editing or versioning individual manual-note entries.
- Retroactively applying a manual note to `PromptRun`s that already completed before the note was
  added.

## Dependencies

- EPIC-06 Source Knowledge Base (the registry this reads from already exists).
- EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate / EPIC-10 Prompt 2 Targeted CV Content
  Generation (the input builders being fixed).
- EPIC-22 Full Pipeline Control UI (UI surface for the manual-note field).

## Acceptance Criteria

- Prompt 1, Prompt 2 and cover-letter input builders include the real content of every selected
  knowledge source, not a placeholder string.
- A mismatch between a knowledge source's registered `contentHash` and its current on-disk
  content is detected and surfaced, not silently ignored.
- The user can attach a manual note to a workspace, and it appears in the input context of every
  subsequent prompt step run for that workspace.
- Existing `EvidenceGuardService`/anti-overclaiming tests still pass with real content wired in;
  spot-checked real runs show fewer `needs evidence` flags than before (more grounded claims),
  not more critical issues.
- `VacancyAnalysis` and `TargetedCvContentOutput` both include a self-assessment quality score,
  consistent with the field `FinalCheckOutput` already has.

## CV Relevance

Can support claims around closing a documented technical debt item end-to-end (not leaving a
known MVP placeholder unresolved) and designing a lightweight human-in-the-loop context-injection
mechanism.

---

# EPIC-24 — AI Output Calibration Against Manual Baseline

## Goal

Tune the Prompt 1 and Prompt 2 templates so the AI-produced vacancy analysis and targeted CV
content converge with what the project owner currently produces manually for the same vacancy,
using real historical (vacancy, manually-produced CV) pairs as ground truth.

## Business Value

The product's entire premise is replacing a manual workflow that already works
(`docs/00_product_vision_updated_consistent.md` §3 lists real existing folders like `Action1/`,
`Amach/`). Without verifying the AI output actually reaches parity with that manual baseline, the
tool cannot be trusted to replace it — "AI-assisted" would just mean "AI-generated and hoped for
the best."

## Technical Value

Introduces a repeatable prompt-evaluation loop tied to the existing `PromptTemplate` versioning
(EPIC-07) — a real, demonstrable evaluation methodology rather than ad hoc prompt editing. See
[docs/10_calibration_and_parity.md](10_calibration_and_parity.md) for the full methodology.

`prisma/seed.ts` currently marks every seeded `PromptTemplate` (`prompt_1`, `prompt_2`, `prompt_3`,
`prompt_5`, `skip_reason`, `cover_letter`) as "Placeholder content pending full prompt-engineering
review" — none contain real, refined prompt wording yet. The project owner already has a
manually-refined, heavily-iterated (dozens of versions) prompt text for each step, used directly
in the manual ChatGPT **web app** workflow this product replaces. Importing that text is not a
direct copy: the web app gives a prompt implicit capabilities/context an API-based call does not
automatically have — e.g. the web app's own browsing feature (used in the reviewed transcript to
verify a real employer via a LinkedIn lookup), its file-attachment handling, and its own session
memory. Some of these are already independently covered by other epics (persisted per-step output
carry-forward and the manual note both come from EPIC-23; the JSON-shaped, schema-validated output
this pipeline requires versus the web app's free-form Markdown replies is a separate structural
difference this epic must also adapt for). This epic's import step must audit each prompt for any
remaining assumption the API-based `AiProvider` call cannot fulfill (live browsing being one
concrete example found so far) and, for each one found, either confirm it is already covered by an
existing mechanism or explicitly reword the instruction with a documented fallback — the same
pattern already used for `needs_evidence` (e.g. flagging an unverifiable claim as
`needs_verification` instead of guessing) — rather than silently dropping the capability or
fabricating a result. Whether to build a dedicated capability (e.g. real web search) to close a
specific gap found this way is a separate decision to make once the actual gaps are known from the
real prompt files, not something to design blind ahead of time.

## Scope

- Import the project owner's existing manually-refined prompt text (once added to the repository)
  as the starting `PromptTemplate` content for Prompt 1/Prompt 2, replacing the current
  placeholder content.
- Audit each imported prompt for assumptions tied to the ChatGPT web app specifically (browsing,
  file attachments, implicit session memory, or anything else found) and resolve each one: map it
  to an existing mechanism (EPIC-23's content wiring/manual note, or the schema-validated JSON
  output shape this pipeline requires instead of free-form Markdown), or reword the instruction
  with an explicit, documented fallback.
- Build a golden dataset from existing manually-processed vacancy folders (real vacancy text +
  the CV that was actually produced and sent for it).
- Run each golden vacancy through the real pipeline (Prompt 1 then Prompt 2), using the UI from
  EPIC-22, with real knowledge source content and manual notes available (EPIC-23).
- Structured comparison against the manual result: apply/maybe/skip decision match, then
  section-by-section CV comparison (headline, summary, top skills, experience bullets, evidence
  table) — not a literal text diff, since exact wording is not expected to match.
- Iterate on `PromptTemplate` content, creating a new version per ADR/versioning rules, and
  re-run the golden set until the convergence criteria in
  [docs/10_calibration_and_parity.md](10_calibration_and_parity.md) are met.

## Out of Scope

- Automatic/AI-graded comparison (LLM-as-judge) for this first pass — comparison is manual.
- New prompt steps beyond Prompt 1/Prompt 2.
- Calibrating Prompt 3/Prompt 5 (pre-PDF/final check) — out of scope until the core Prompt 1/2
  parity is reached.
- Building a new AI provider capability (e.g. real web search) to close a web-app-specific gap —
  accepted as a known limitation for this pass via the `needs_verification` fallback; whether to
  build one is a follow-up decision made after the real prompt files reveal the actual gaps.

## Dependencies

- EPIC-23 Knowledge Source Content Wiring & Manual Note Injection (calibration is meaningless
  without real source content reaching the model).
- EPIC-22 Full Pipeline Control UI (run each golden case without manual API calls).
- EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate.
- EPIC-10 Prompt 2 Targeted CV Content Generation.
- EPIC-07 Prompt Template Versioning (the mechanism calibration iterates against).

## Acceptance Criteria

- `PromptTemplate` content for Prompt 1/Prompt 2 is based on the project owner's existing
  manually-refined prompt text, not written from scratch, and no longer marked as placeholder
  content in `prisma/seed.ts`.
- Any instruction that previously assumed live web verification is reworded to flag the claim as
  `needs_verification` rather than fabricate a result.
- A golden dataset of real (vacancy, manual CV) pairs exists and is documented.
- Each golden case has a recorded comparison result (decision match + section-by-section CV
  comparison) against the manual baseline.
- Convergence criteria (defined in `docs/10_calibration_and_parity.md`) are met for the golden
  set, or documented exceptions are recorded with reasoning.
- Prompt template version history reflects the calibration iterations (no silent overwrites, per
  `CLAUDE.md`'s Prompt Pipeline Rules).

## CV Relevance

Can support claims around prompt evaluation methodology and iterative AI-output quality
validation against a real-world baseline, not just "integrated an LLM API."

---

# EPIC-25 — Manual Parity Testing / Regression QA

## Goal

After calibration (EPIC-24), run a formal manual QA pass confirming the pipeline's logic and
output are identical in substance to the manual workflow it replaces — both the *decisions* it
makes (apply/maybe/skip) and the *content* it produces.

## Business Value

Calibration tunes prompts against a fixed golden set; this epic checks the result generalizes —
that using the pipeline for a *new* real vacancy (not part of the golden set) produces the same
kind of outcome the project owner would have produced manually, so the tool can be trusted for
real applications going forward.

## Technical Value

Establishes a repeatable manual regression-QA checklist that can be re-run whenever prompt
templates change later, similar in spirit to the existing manual persistence checklist
(`apps/api/scripts/check-postgres-persistence.md`, TASK-005/TASK-059).

## Scope

- A documented manual test procedure (see
  [docs/10_calibration_and_parity.md](10_calibration_and_parity.md)) run against a small number
  of *new* real vacancies not used during calibration.
- For each: compare the pipeline's apply/maybe/skip decision and generated CV content against
  what the project owner would judge/produce manually for the same vacancy.
- Record results in `project-management/TEST_LOG.md`.

## Out of Scope

- Automated end-to-end test suite for this comparison (manual only, per the backlog's own
  "documented/manual or automated" pattern used for TASK-059).
- Expanding the golden dataset itself (that's EPIC-24's scope).

## Dependencies

- EPIC-24 AI Output Calibration Against Manual Baseline.
- EPIC-22 Full Pipeline Control UI.

## Acceptance Criteria

- A documented manual parity-test procedure exists.
- At least one full manual QA pass is recorded in `project-management/TEST_LOG.md` with real
  vacancies, decisions and outcomes compared against manual judgment.
- Any mismatches found are either fixed (new prompt template version, back to EPIC-24) or
  explicitly documented as accepted limitations.

## CV Relevance

Can support claims around manual/regression QA process design for an AI-assisted system, beyond
just building the system itself.

---

# EPIC-26 — Multi-Workspace Parallel Tabs UI

## Goal

Let the user process several vacancies in parallel from one browser window — a dynamic set of
tabs, each hosting an independent workspace at its own pipeline step — replacing the current
habit of opening one manual browser tab per vacancy.

## Business Value

The backend already supports fully independent concurrent workspaces (separate DB rows, separate
storage folders); today the only thing forcing "one vacancy at a time" is the UI having no
concept of more than one open workspace at once.

## Technical Value

A pure frontend state-management exercise on top of EPIC-22's per-workspace controls — dynamic
tab list, per-tab independent state, no server-side change required.

## Scope

- A tab bar that can open/close a dynamic number of workspace tabs (not a fixed count).
- Each tab hosts the full per-workspace control UI from EPIC-22, independently of other open
  tabs.
- Tab state (which workspaces are open) should survive a page reload at least for the current
  browser session.

## Out of Scope

- Cross-tab batch actions (e.g. "export all").
- Persisting open-tab state server-side or per-user (no auth/multi-user concept exists).

## Dependencies

- EPIC-22 Full Pipeline Control UI (tabs host this epic's controls).

## Acceptance Criteria

- The user can open N workspace tabs simultaneously, where N is not hardcoded.
- Each tab's workspace can be progressed through pipeline steps independently of the others.
- Closing a tab does not affect the state of other open tabs or their underlying workspaces.

## CV Relevance

Can support claims around building stateful, multi-context frontend UIs (not just CRUD screens)
on top of a REST backend.

---

## 4. Suggested MVP Epic Order

Recommended first implementation order:

```text
1. EPIC-01 Project Bootstrap & Local Backend Foundation
2. EPIC-03 Slug Normalization & Naming Rules
3. EPIC-04 PostgreSQL Metadata Model & Artifact Registry
4. EPIC-05 Filesystem Artifact Storage
5. EPIC-02 Application Workspace Creation & Input Contract
6. EPIC-06 Source Knowledge Base
7. EPIC-07 Prompt Template Versioning
8. EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate
9. EPIC-09 Skip Handling & Manual Override
10. EPIC-11 Basic Anti-Overclaiming Guard
11. EPIC-10 Prompt 2 Targeted CV Content Generation
12. EPIC-12 PDF Export by Default
13. EPIC-13 Workspace Status, Review Gates & Artifact Access
14. EPIC-21 Tests, CI/CD & Portfolio Documentation
```

Reasoning:

- Slug/naming and storage should be solved early because they affect every artifact.
- Workspace creation must be manual-first and stable before import.
- Prompt 1 and skip handling should come before CV generation.
- Anti-overclaiming guard should be present before generated CVs are exported.
- PDF export is the first real application-ready output.

## 5. MVP Boundary

The first usable MVP is complete when:

```text
Manual workspace creation
  -> 00_vacancy_source.txt saved
  -> Prompt 1 analysis generated
  -> human Apply / Maybe / Skip gate
  -> skip file generated if Skip
  -> Prompt 2 generated after approval if Apply/Maybe
  -> CV draft reviewed
  -> PDF exported by default
  -> artifacts saved to filesystem
  -> metadata saved to PostgreSQL
```

MVP does **not** require:

- robust existing folder import;
- Prompt 3 pre-PDF check;
- Prompt 5 final check;
- cover letter generation;
- Redis/BullMQ queues;
- full frontend dashboard;
- DOCX export;
- automatic application sending.

## 6. Portfolio-Safe Project Description After MVP

Safe wording after MVP is actually implemented:

```text
Built a backend-first NestJS/TypeScript application for AI-assisted vacancy analysis and evidence-based targeted CV generation, using PostgreSQL, Prisma, Docker Compose, filesystem artifact storage, prompt versioning, source knowledge metadata, PDF export and human review gates for apply/maybe/skip decisions.
```

Stronger wording after queues are implemented:

```text
Extended the system with Redis/BullMQ asynchronous processing for AI analysis, CV generation and document export, including retries, failed-job tracking, idempotency keys and artifact-linked workflow status updates.
```

Safety note:

```text
This project is personal/portfolio evidence. It must not be described as commercial production experience.
```
