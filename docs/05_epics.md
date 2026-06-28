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
