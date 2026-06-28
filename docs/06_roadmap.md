# JobFlow CV Pipeline — Roadmap

## 1. Purpose

This document defines the phased roadmap for **JobFlow CV Pipeline**, from the first usable MVP to a portfolio-ready version.

It is aligned with the current project documents:

```text
00_product_vision_updated_consistent.md
01_requirements.md
02_user_flows_v3_consistent.md
05_epics.md
```

The roadmap follows the current product decisions:

- The first usable MVP starts with manual workspace creation, not robust folder import.
- The user enters company name, role title and multi-line vacancy text as separate inputs.
- `00_vacancy_source.txt` is the canonical internal vacancy source file.
- New workspace names use underscore-based slugs.
- Company slug may preserve numbers.
- Role slug allows English letters, Unicode Cyrillic letters and underscores.
- Original company name, original role title and original vacancy text must always be preserved.
- Prompt 1 always ends with a human review gate.
- `apply` and `maybe` continue only after explicit user approval.
- `skip` creates canonical internal skip artifacts and stops the pipeline by default.
- Prompt 2 runs only after user approval or manual override.
- PDF is the default physical CV export.
- Prompt 3 / pre-PDF check is P1 / MVP Optional.
- Prompt 5 / final check is optional.
- Cover letter generation is Phase 2 / later, not required for the first usable MVP.
- Basic existing folder import is optional/P1; robust import is later.
- Redis/BullMQ queues are later-stage.
- Queues automate execution, not decision-making.
- Anti-overclaiming guard is a core safety requirement.

## 2. Roadmap Philosophy

The project should deliver practical value as early as possible.

The first milestone is not a perfect full-featured system. The first milestone is:

```text
Company + role + vacancy text
  -> workspace created
  -> vacancy saved as 00_vacancy_source.txt
  -> Prompt 1 analysis
  -> human review gate
  -> Prompt 2 targeted CV content after approval
  -> PDF exported by default
```

The first skip milestone is:

```text
Company + role + vacancy text
  -> workspace created
  -> Prompt 1 analysis
  -> decision = skip
  -> 01_skip_reason.md/json created
  -> pipeline stops
```

Every phase must produce a visible physical result, not only internal code.

## 3. Phase Overview

| Phase | Name | Type | Main Result |
|---|---|---|---|
| Phase 0 | Project Foundation | MVP foundation | Local NestJS/PostgreSQL project runs |
| Phase 1 | Manual Workspace Creation | MVP required | Workspace folder + `00_vacancy_source.txt` |
| Phase 2 | Metadata, Artifacts & Knowledge Base | MVP required | PostgreSQL metadata + source knowledge registry |
| Phase 3 | Prompt Templates, AI Runs & Prompt 1 | MVP required | Vacancy analysis + decision gate |
| Phase 4 | Skip Handling & Manual Override | MVP required | Skip artifact + stopped pipeline |
| Phase 5 | Prompt 2 Targeted CV Draft & Evidence Guard | MVP required | Targeted CV content saved as MD/JSON |
| Phase 6 | PDF Export by Default | First usable MVP | Physical CV PDF generated |
| Phase 7 | Workspace Review & Artifact Access | MVP hardening / not first-PDF blocker | Workspace status and downloadable artifacts |
| Phase 8 | P1 Safety & Quality Layer | MVP optional / P1 | Pre-PDF check and optional final check |
| Phase 9 | Basic Existing Folder Import | MVP optional / P1 | Import Action1/Amach/AppsFlyer/Broadvoice-style folders |
| Phase 10 | Cover Letter & Recruiter Message | Phase 2 | Physical cover letter PDF / messages |
| Phase 11 | Application Tracking & Rejection Analysis | Phase 2 | Track applied/rejected and save rejection analysis |
| Phase 12 | Redis/BullMQ Async Processing | Later / production-style | Background jobs, retries, failures, idempotency |
| Phase 13 | Frontend Dashboard | Later / portfolio UX | Visual workspace dashboard |
| Phase 14 | Tests, CI/CD & Portfolio Polish | Portfolio-ready | GitHub-ready project with docs, tests and demo flow |

---

# Phase 0 — Project Foundation

## Goal

Create a local backend-first foundation for the project.

## Related Epics

- EPIC-01 — Project Bootstrap & Local Backend Foundation
- EPIC-21 — Tests, CI/CD & Portfolio Documentation

## Deliverables

- Git repository initialized.
- NestJS backend application created.
- TypeScript configured.
- Docker Compose with PostgreSQL.
- Prisma configured.
- `.env.example` added.
- Basic health endpoint.
- Swagger/OpenAPI enabled.
- `README.md` initial version.
- `CLAUDE.md` initial version.
- `docs/` folder created.

## Dependencies

- Product Vision.
- Requirements.
- User Flows.
- Epics.

## Done Criteria

- Backend starts locally.
- PostgreSQL starts via Docker Compose.
- API can connect to PostgreSQL.
- Health endpoint returns success.
- Swagger page is available.
- `.env.example` contains required local variables.
- README explains how to start the project.
- Claude Code has clear project instructions in `CLAUDE.md`.

## Physical Result

```text
Running local backend + PostgreSQL
Swagger/OpenAPI page
README.md
CLAUDE.md
```

## CV Relevance

Shows project bootstrap discipline, local backend setup, Docker Compose, PostgreSQL and documentation-first development.

---

# Phase 1 — Manual Workspace Creation

## Goal

Allow the user to create an Application Workspace manually from separate inputs.

## Related Epics

- EPIC-02 — Application Workspace Creation & Input Contract
- EPIC-03 — Slug Normalization & Naming Rules
- EPIC-05 — Filesystem Artifact Storage

## Deliverables

- API endpoint to create workspace manually.
- Separate inputs:
  - company name;
  - role title;
  - multi-line vacancy text;
  - optional source URL;
  - optional date.
- Input quality checkpoint before workspace creation.
- Company slug generation.
- Role slug generation.
- Workspace slug generation.
- Filesystem workspace folder creation.
- Canonical vacancy source saved as:

```text
00_vacancy_source.txt
```

- Original company name, role title and vacancy text preserved.
- Vacancy text saved as UTF-8 without sanitizing content.

## Dependencies

- Phase 0.
- PostgreSQL connection.
- Filesystem storage root configuration.

## Done Criteria

- User can create workspace from manually pasted vacancy text.
- Company name cannot be empty.
- Role title cannot be empty.
- Vacancy text cannot be empty.
- System previews generated workspace and file names.
- New workspace uses underscore-based naming.
- Company slug preserves meaningful numbers, such as `Action1` or `CHECK24`.
- Role slug supports English letters, Unicode Cyrillic letters and underscores.
- Original values are stored separately from slugs.
- Workspace status becomes `source_saved`.

## Physical Result

Example:

```text
storage/applications/
  2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
    00_vacancy_source.txt
```

## CV Relevance

Shows backend handling of input contracts, validation, Unicode-safe normalization, filesystem-safe naming and user-oriented workflow design.

---

# Phase 2 — Metadata, Artifacts & Source Knowledge Base

## Goal

Create the metadata layer that connects workspaces, source knowledge files and generated artifacts.

## Related Epics

- EPIC-04 — PostgreSQL Metadata Model & Artifact Registry
- EPIC-05 — Filesystem Artifact Storage
- EPIC-06 — Source Knowledge Base

## Deliverables

- Prisma models for:
  - ApplicationWorkspace;
  - GeneratedArtifact;
  - KnowledgeSource;
  - SourceFileVersion or equivalent;
  - optional initial ApplicationNote.
- Artifact registry service.
- Knowledge source import/register endpoint.
- Source knowledge metadata:
  - file path;
  - file type;
  - content hash;
  - active/inactive flag;
  - last imported timestamp.
- Artifact metadata:
  - workspace ID;
  - artifact type;
  - canonical file path;
  - content hash;
  - generated by prompt run if available later;
  - latest flag.

## Dependencies

- Phase 0.
- Phase 1.
- Prisma migrations.

## Done Criteria

- Workspace metadata is stored in PostgreSQL.
- GeneratedArtifact records can be created for `00_vacancy_source.txt`.
- KnowledgeSource records can be created for source files.
- The system can list active knowledge sources.
- The system can list artifacts for a workspace.
- Filesystem artifacts and PostgreSQL metadata stay linked.

## Physical Result

```text
PostgreSQL records:
- ApplicationWorkspace
- GeneratedArtifact for 00_vacancy_source.txt
- KnowledgeSource records
```

Visible output:

```text
Workspace details response with artifact list and source knowledge list
```

## CV Relevance

Shows relational modeling, metadata design, artifact tracking, PostgreSQL/Prisma usage and traceability-focused backend design.

---

# Phase 3 — Prompt Templates, AI Runs & Prompt 1 Vacancy Analysis

## Goal

Run Prompt 1 analysis and produce a structured vacancy analysis with a human review gate.

## Related Epics

- EPIC-07 — Prompt Template Versioning
- EPIC-08 — Prompt 1 Vacancy Analysis & Decision Gate
- EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Deliverables

- PromptTemplate model and service.
- PromptTemplateVersion model or equivalent versioning mechanism.
- PromptRun model.
- AiRun model.
- AI provider abstraction.
- Prompt 1 template storage.
- Prompt 1 execution endpoint.
- Input snapshot for PromptRun.
- AI response saved.
- Canonical Prompt 1 artifacts:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

- Workspace status transitions:

```text
source_saved -> analysis_running -> analysis_ready -> paused_after_analysis
```

- Human review gate after Prompt 1.

## Dependencies

- Phase 1.
- Phase 2.
- Active source knowledge files.
- Active Prompt 1 template.
- AI provider configuration.

## Done Criteria

- User can run Prompt 1 for a workspace.
- Prompt version used is recorded.
- AI provider/model metadata is recorded.
- Input snapshot is stored.
- Output includes:
  - must-have requirements;
  - nice-to-have requirements;
  - wishlist requirements;
  - hidden role logic;
  - score;
  - decision: `apply`, `maybe`, or `skip`;
  - language risk;
  - location risk;
  - evidence risks;
  - next recommended action.
- System pauses after analysis.
- No Prompt 2 runs automatically.

## Physical Result

Example:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

Workspace shows:

```text
Decision: apply / maybe / skip
Status: paused_after_analysis
```

## CV Relevance

Shows prompt versioning, AI API integration, structured AI outputs, metadata tracking and human-in-the-loop workflow design.

---

# Phase 4 — Skip Handling & Manual Override

## Goal

Implement skip decision handling as a first-class workflow path.

## Related Epics

- EPIC-09 — Skip Handling & Manual Override
- EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Deliverables

- Skip decision handler after Prompt 1.
- Canonical internal skip artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

- Human-readable download/export skip name:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

- Skip reason language defaults to Russian.
- Workspace status transition:

```text
paused_after_analysis -> skipped
```

- Pipeline stops by default after skip.
- Manual override options:
  - override skip to continue;
  - change decision;
  - add reason/note;
  - log override.

## Dependencies

- Phase 3.
- Artifact registry.
- Workspace status model.

## Done Criteria

- If Prompt 1 decision is `skip`, the system creates skip artifacts.
- Workspace becomes `skipped`.
- Prompt 2 does not run by default.
- User can open/download skip reason.
- User can explicitly override skip.
- Override is logged.
- Skip artifact includes:
  - date analyzed;
  - company;
  - role;
  - core stack;
  - final score;
  - main skip reason;
  - key mismatches;
  - evidence from profile;
  - risks if applying anyway;
  - useful keywords;
  - future reconsideration condition.

## Physical Result

Example:

```text
01_skip_reason.md
01_skip_reason.json
SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

## CV Relevance

Shows workflow branching, decision gates, artifact generation, auditability and careful product logic around avoiding wasted effort.

---

# Phase 5 — Prompt 2 Targeted CV Draft & Basic Anti-Overclaiming Guard

## Goal

Generate targeted CV content only after user approval and protect the output from unsupported claims.

## Related Epics

- EPIC-10 — Prompt 2 Targeted CV Content Generation
- EPIC-11 — Basic Anti-Overclaiming Guard
- EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Deliverables

- Prompt 2 template storage.
- Prompt 2 execution endpoint.
- Execution conditions:
  - approved `apply`;
  - approved `maybe`;
  - manually overridden `skip`.
- Canonical Prompt 2 artifacts:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

- Basic anti-overclaiming guard.
- Claim safety classification:
  - supported commercial;
  - supported personal/project;
  - weak / needs evidence;
  - unsafe / remove.
- Commercial vs personal experience separation.
- Workspace status:

```text
cv_generation_running -> cv_draft_ready -> paused_after_cv_draft
```

## Dependencies

- Phase 3.
- Phase 4 for skip override logic.
- Source Knowledge Base.
- CV format rules.
- Evidence sources.

## Done Criteria

- Prompt 2 cannot run before Prompt 1 review approval.
- Prompt 2 cannot run for skipped workspace unless manually overridden.
- Targeted CV content is saved as Markdown and internal JSON artifact.
- Generated CV content includes:
  - role-specific headline;
  - summary;
  - top skills;
  - EPAM bullets;
  - Factor-IT bullets;
  - optional projects only when relevant;
  - evidence table;
  - risks;
  - open evidence questions.
- Anti-overclaiming guard flags unsafe claims such as:
  - commercial AI/LLM production experience;
  - commercial NestJS if unsupported;
  - Docker production ownership if unsupported;
  - Kubernetes production experience;
  - AWS/DynamoDB/MySQL without evidence;
  - fluent English or professional German if unsupported.
- User can approve, edit, regenerate or pause after CV draft.

## Physical Result

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

Visible output:

```text
CV draft review screen / API response with warnings and evidence status
```

## CV Relevance

Shows evidence-based AI workflow, prompt pipeline implementation, domain-specific safety rules, structured output and practical AI integration for a real personal backend tool.

---

# Phase 6 — PDF Export by Default: First Usable MVP

## Goal

Generate a physical CV PDF by default from approved targeted CV content.

## Related Epics

- EPIC-12 — PDF Export by Default
- EPIC-05 — Filesystem Artifact Storage
- EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Deliverables

- Document export service.
- Pre-PDF recommendation reader for export, active only when Prompt 3 artifacts exist.
- HTML generation for PDF rendering.
- PDF generation.
- Default export format: PDF.
- Optional internal/downloadable formats:
  - HTML;
  - JSON export later or if easy;
  - Markdown as downloadable draft.
- Canonical export artifacts:

```text
04_cv_export.html
04_cv_export.pdf
```

- Optional:

```text
04_cv_export.json
04_cv_export.md
```

- Human-readable download name:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
```

- Export metadata stored in PostgreSQL.

## Dependencies

- Phase 5.
- Artifact registry.
- Filesystem storage.
- Basic CV layout/template.

## Done Criteria

- User can export PDF from approved targeted CV content.
- If no output format is selected, system generates PDF.
- PDF file is saved on disk.
- HTML file used for rendering is saved or available.
- Artifact metadata is stored.
- User can download the PDF.
- Workspace status becomes `cv_pdf_generated`.
- Export failure saves an error and does not destroy previous artifacts.
- If Prompt 3 artifacts exist, export uses their recommendations; if Prompt 3 was skipped, export proceeds without them.

## Physical Result

```text
04_cv_export.html
04_cv_export.pdf
Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf
```

## First Usable MVP Definition

The project reaches first usable MVP when the following flow works end-to-end:

```text
Create workspace manually
  -> save 00_vacancy_source.txt
  -> run Prompt 1
  -> review apply/maybe/skip
  -> generate skip file OR approve Prompt 2
  -> generate targeted CV draft
  -> export PDF by default
  -> download physical CV PDF
```

## CV Relevance

This is the first phase where the project can be shown as a useful backend tool that produces real physical output for real job applications.

---

# Phase 7 — Workspace Status, Review Gates & Artifact Access

## Goal

Make the MVP comfortable to use repeatedly by improving status visibility, review gates and artifact access.

## Related Epics

- EPIC-13 — Workspace Status, Review Gates & Artifact Access
- EPIC-04 — PostgreSQL Metadata Model & Artifact Registry
- EPIC-05 — Filesystem Artifact Storage

## Deliverables

- Workspace overview endpoint/screen.
- Workspace statuses:

```text
source_saved
analysis_running
analysis_ready
paused_after_analysis
skipped
cv_generation_running
cv_draft_ready
paused_after_cv_draft
export_running
cv_pdf_generated
ready_to_apply
failed
```

- Artifact list endpoint.
- Artifact preview/download endpoint.
- Latest artifact marker.
- Manual notes.
- Basic status transitions.
- User review records.

## Dependencies

- Phase 1 through Phase 6.

## Done Criteria

- User can list workspaces.
- User can open one workspace and see:
  - company;
  - role;
  - status;
  - decision;
  - score;
  - next recommended action;
  - artifacts;
  - warnings.
- User can download any generated artifact.
- User can pause and continue later.
- System does not lose previous outputs when regenerating.

## Physical Result

```text
Workspace overview with artifacts:
- 00_vacancy_source.txt
- 01_vacancy_analysis.md/json
- 01_skip_reason.md/json OR 02_targeted_cv_content.md/json
- 04_cv_export.pdf
```

## CV Relevance

Shows workflow state management, artifact access, API design and product usability beyond a one-off script.

---

# Phase 8 — P1 Safety & Quality Layer

## Goal

Add optional quality checks that improve real sending confidence without blocking first usable MVP.

## Related Epics

- EPIC-15 — Prompt 3 Pre-PDF Check
- EPIC-16 — Prompt 5 Final Check
- EPIC-11 — Basic Anti-Overclaiming Guard

## Deliverables

- Optional Prompt 3 pre-PDF check.
- Optional pre-export review gate.
- Optional Prompt 5 final check.
- Canonical artifacts:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
05_final_check.md
05_final_check.json
```

- Pre-PDF check output:
  - critical issues;
  - minor issues;
  - overclaiming risks;
  - unsupported technologies;
  - summary length risk;
  - page count risk;
  - recommended edits;
  - readiness status.
- Final check output:
  - final quality score;
  - formatting notes;
  - readiness decision.

## Dependencies

- Phase 5 for CV draft.
- Phase 6 for PDF export if running final check.
- CV format rules.

## Done Criteria

- User can run Prompt 3 before export.
- User can run Prompt 5 after PDF export.
- These checks are optional and do not block MVP if skipped.
- Findings are saved as artifacts.
- Findings become mandatory export context for Step 4 once they exist.
- User can approve export after review.
- User can edit/regenerate based on findings.

## Physical Result

```text
03_pre_pdf_check.md/json
05_final_check.md/json
```

## CV Relevance

Shows quality gates, validation, safe AI workflow design and practical document-generation reliability.

---

# Phase 9 — Basic Existing Folder Import

## Goal

Import existing manual job application folders without data loss.

## Related Epics

- EPIC-14 — Basic Existing Folder Import
- EPIC-03 — Slug Normalization & Naming Rules
- EPIC-04 — PostgreSQL Metadata Model & Artifact Registry

## Deliverables

- Import root configuration.
- Basic scanner for existing folder structure:

```text
Company/YYYY.MM.DD/
```

- Detection of files:

```text
*.txt
03_targeted_CV_content_*.md
*_CV.pdf
*_Cover_Letter.pdf
SKIP_*.md
```

- Import preview.
- Manual metadata correction.
- Duplicate detection by path/hash.
- Legacy artifact registration.
- Optional copy to canonical workspace structure.

## Dependencies

- Phase 2 artifact registry.
- Phase 3/4/5 artifact types.
- Slug normalization.

## Done Criteria

- System can scan an existing root folder.
- System detects Action1-style workspace with CV PDF.
- System detects Amach-style workspace with CV PDF and cover letter.
- System detects AppsFlyer-style workspace with vacancy source only.
- System detects Broadvoice-style skip file.
- User can confirm or correct company/role metadata before import.
- Imported legacy artifacts are not renamed destructively.
- Imported workspace status is inferred or manually corrected.

## Physical Result

Example imported workspace list:

```text
Action1 -> cv_pdf_generated
Amach -> cover_letter_generated
AppsFlyer -> source_saved
Broadvoice -> skipped
```

## CV Relevance

Shows file import logic, legacy compatibility, metadata inference, data preservation and practical migration from manual workflow to structured backend system.

---

# Phase 10 — Cover Letter & Recruiter Message Generation

## Goal

Generate optional cover letter and recruiter communication artifacts after CV draft or PDF exists.

## Related Epics

- EPIC-17 — Cover Letter / Recruiter Message Generation

## Deliverables

- Cover letter prompt template.
- Recruiter message prompt template.
- Optional application email prompt template.
- Canonical artifacts:

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

- Human-readable download name:

```text
Denys_Strakhov_<company_slug>_<role_slug>_Cover_Letter.pdf
```

## Dependencies

- Phase 3 Prompt 1 analysis.
- Phase 5 CV draft.
- Phase 6 PDF export preferred, but not always mandatory if user explicitly requests cover letter.
- Source Knowledge Base.

## Done Criteria

- User can generate cover letter after CV draft or PDF exists.
- User can generate recruiter message.
- Output stays aligned with the same vacancy and source evidence.
- Cover letter PDF is saved and downloadable.
- Cover letter generation is not required for first usable MVP.

## Physical Result

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
```

## CV Relevance

Shows multi-artifact generation, reuse of AI pipeline, business-oriented communication automation and real job-search utility.

---

# Phase 11 — Application Tracking & Rejection Analysis

## Goal

Track what happened after sending applications and learn from rejections.

## Related Epics

- EPIC-19 — Application Tracking & Rejection Analysis

## Deliverables

- Application statuses:

```text
ready_to_apply
applied
recruiter_contacted
interview
test_task
rejected
offer
archived
```

- Mark as applied flow.
- Submitted files metadata.
- Notes:
  - application notes;
  - recruiter notes;
  - salary notes;
  - location notes;
  - why applied;
  - why skipped.
- Rejection text input.
- Rejection analysis artifact:

```text
rejection_analysis.md
rejection_analysis.json
```

## Dependencies

- Phase 7 workspace status.
- Phase 6 PDF output.
- Optional Phase 10 cover letter.

## Done Criteria

- User can mark workspace as applied.
- System records application date, channel and files used.
- User can paste rejection text.
- System saves rejection analysis.
- Rejection analysis does not automatically rewrite source knowledge without user approval.

## Physical Result

```text
application_note.md
submitted_files.json
rejection_analysis.md/json
```

## CV Relevance

Shows full lifecycle workflow design, product thinking, structured notes, learning loop and business process automation.

---

# Phase 12 — Redis/BullMQ Async Processing

## Goal

Move long-running AI and export steps into background jobs with retries and failure handling.

## Related Epics

- EPIC-18 — Redis/BullMQ Async Processing

## Deliverables

- Redis service in Docker Compose.
- BullMQ integration.
- Worker process.
- Queue types:

```text
analysis-queue
cv-generation-queue
pre-pdf-check-queue
document-export-queue
final-check-queue
cover-letter-queue
import-queue
```

- Queue job statuses:

```text
pending
running
completed
failed
retrying
cancelled
```

- Retry handling.
- Failed job handling.
- Idempotency key:

```text
workspace_id
step
prompt_template_version
input_hash
source_files_hash
output_format
```

- Cancel/resume support where practical.

## Dependencies

- Phase 3 through Phase 6.
- Stable PromptRun and AiRun model.
- Artifact registry.

## Done Criteria

- Prompt 1 can run as background job.
- Prompt 2 can run as background job.
- PDF export can run as background job.
- Failed jobs preserve input snapshots and errors.
- Retry does not duplicate artifacts unintentionally.
- Human review gates still pause the workflow after job completion.
- Queues automate execution, not decision-making.

## Physical Result

```text
Queue dashboard/API state
Background-generated artifacts
Failed job records with retry metadata
```

## CV Relevance

Strong backend portfolio value: async workflows, Redis, BullMQ, retries, idempotency, failed-job handling and production-style processing.

---

# Phase 13 — Frontend Dashboard

## Goal

Create a simple dashboard to make the tool comfortable for repeated daily use.

## Related Epics

- EPIC-20 — Frontend Dashboard
- EPIC-13 — Workspace Status, Review Gates & Artifact Access

## Deliverables

- Workspace list page.
- New workspace form.
- Input quality preview.
- Analysis review screen.
- Apply/Maybe/Skip decision screen.
- CV draft review screen.
- Artifact list/download screen.
- Optional source knowledge screen.
- Optional prompt template screen.

## Dependencies

- Phase 6 first usable MVP API.
- Phase 7 artifact/status endpoints.

## Done Criteria

- User can create workspace through UI.
- User can paste vacancy text in multi-line form.
- User can run Prompt 1 from UI.
- User can approve/skip/override from UI.
- User can generate targeted CV draft.
- User can export/download PDF.
- UI clearly shows pause points and current status.

## Physical Result

```text
Local web dashboard
Downloadable CV PDF from UI
Workspace status screen
```

## CV Relevance

Shows backend-focused fullstack capability without positioning the project as frontend-first. Useful for backend-focused fullstack roles.

---

# Phase 14 — Tests, CI/CD & Portfolio Polish

## Goal

Turn the project into a portfolio-ready backend project that can be shown on GitHub and used in CV/LinkedIn as personal project evidence.

## Related Epics

- EPIC-21 — Tests, CI/CD & Portfolio Documentation
- All previous epics

## Deliverables

- Unit tests for:
  - slug normalization;
  - workspace creation;
  - artifact naming;
  - skip handling;
  - anti-overclaiming guard;
  - prompt run creation.
- Integration tests for:
  - workspace creation with PostgreSQL;
  - artifact registration;
  - Prompt 1 mocked run;
  - Prompt 2 mocked run;
  - PDF export path.
- GitHub Actions.
- README with demo flow.
- Architecture diagram or textual architecture overview.
- `.env.example` complete.
- Example seed data or demo scripts.
- Screenshots or sample generated artifacts with sensitive data removed.
- Documentation updated:
  - requirements;
  - roadmap;
  - architecture;
  - task backlog;
  - AI pipeline;
  - artifact storage.

## Dependencies

- Stable MVP implementation.
- Clear file/artifact rules.
- Testable services.

## Done Criteria

- `npm test` passes locally.
- CI runs tests on push/PR.
- README explains:
  - what the project does;
  - how to run locally;
  - how to create a workspace;
  - how to generate a CV PDF;
  - how skip handling works;
  - what is commercial vs personal evidence.
- Demo flow can be reproduced in 10–15 minutes.
- Project can be safely linked as personal backend project.

## Physical Result

```text
GitHub-ready repository
Passing tests
CI workflow
README demo
Generated sample CV PDF
Generated sample skip artifact
```

## CV Relevance

This is the phase that makes the project strong enough for CV usage.

Safe wording after this phase:

```text
Built a backend-first NestJS/TypeScript application for AI-assisted vacancy analysis and evidence-based targeted CV generation, using PostgreSQL, Prisma, Docker Compose, filesystem artifact storage, OpenAI/Anthropic API integration, Markdown/HTML/PDF export and Claude Code-assisted development workflow.
```

Stronger wording after Phase 12:

```text
Implemented an asynchronous AI pipeline for vacancy analysis, skip-decision handling, targeted CV generation and document export, with prompt versioning, PostgreSQL metadata, filesystem artifacts, retry handling, failed-job tracking and structured backend workflows.
```

---

# 4. First Usable MVP Cut

The smallest useful MVP includes:

```text
Phase 0 — Project Foundation
Phase 1 — Manual Workspace Creation
Phase 2 — Metadata, Artifacts & Source Knowledge Base
Phase 3 — Prompt Templates, AI Runs & Prompt 1
Phase 4 — Skip Handling & Manual Override
Phase 5 — Prompt 2 Targeted CV Draft & Basic Anti-Overclaiming Guard
Phase 6 — PDF Export by Default
```

Minimal artifact download and metadata access are covered by the earlier artifact/API tasks. Phase 7 is MVP hardening and should not block the first physical PDF result.

The first usable MVP does **not** require:

```text
Prompt 3 pre-PDF check
Prompt 5 final check
Cover letter generation
Redis/BullMQ queues
Frontend dashboard
Robust existing folder import
Application tracking
Rejection analysis
DOCX export
Production cloud deployment
```

These are valuable, but they should not block the first physical PDF result.

## First Usable MVP Physical Result

```text
storage/applications/
  2026_06_24_Company_Role_Title/
    00_vacancy_source.txt
    01_vacancy_analysis.md
    01_vacancy_analysis.json
    02_targeted_cv_content.md
    02_targeted_cv_content.json
    04_cv_export.html
    04_cv_export.pdf
```

For skipped vacancy:

```text
storage/applications/
  2026_06_24_Company_Role_Title/
    00_vacancy_source.txt
    01_vacancy_analysis.md
    01_vacancy_analysis.json
    01_skip_reason.md
    01_skip_reason.json
```

---

# 5. Portfolio-Ready Cut

The portfolio-ready version should include:

```text
First usable MVP
+ P1 safety layer
+ basic folder import
+ tests
+ CI/CD
+ README demo
+ optional dashboard or strong Swagger/API demo
+ optional Redis/BullMQ async processing if time allows
```

The strongest portfolio version includes:

```text
First usable MVP
+ Prompt 3 pre-PDF check
+ Prompt 5 final check
+ basic existing folder import
+ cover letter generation
+ application tracking
+ Redis/BullMQ async jobs
+ tests and CI/CD
+ frontend dashboard
+ clean documentation
```

## Portfolio-Ready Physical Result

```text
A runnable repository that demonstrates:
- manual workspace creation
- source knowledge registry
- Prompt 1 analysis with decision gate
- skip handling
- Prompt 2 targeted CV generation
- anti-overclaiming guard
- PDF export by default
- artifact registry
- optional pre-PDF/final checks
- optional folder import
- tests and CI
```

## Portfolio-Ready CV Value

The project should support the following honest personal-project signals:

- backend-first product design;
- NestJS/TypeScript implementation;
- PostgreSQL/Prisma data modeling;
- filesystem artifact storage;
- AI API integration;
- prompt template versioning;
- AI run metadata tracking;
- evidence-based CV generation;
- anti-overclaiming guard;
- PDF export;
- optional async processing with Redis/BullMQ;
- tests and CI/CD;
- Claude Code-assisted development workflow.

---

# 6. Recommended Implementation Order

Recommended order for Claude Code tasks:

```text
1. Bootstrap NestJS + PostgreSQL + Prisma + Docker Compose
2. Implement workspace creation with separate company/role/vacancy text inputs
3. Implement slug normalization and canonical file storage
4. Implement PostgreSQL metadata and artifact registry
5. Implement source knowledge registry
6. Implement prompt template versioning
7. Implement PromptRun and AiRun metadata
8. Implement Prompt 1 analysis and review gate
9. Implement skip handling and manual override
10. Implement Prompt 2 targeted CV content generation
11. Implement basic anti-overclaiming guard
12. Implement PDF export by default
13. Implement workspace status and artifact access
14. Add tests around stable rules
15. Add P1 checks/import/CI/dashboard later
```

This order keeps the project useful early and prevents overengineering before the first physical CV PDF exists.

---

# 7. Roadmap Summary

The roadmap should be executed around one guiding principle:

```text
Do not build a generic AI platform.
Build a reliable backend workflow that turns real vacancies into safe, evidence-based, physical application files.
```

The most important early result is:

```text
A generated CV PDF that is safe enough to review and send.
```

The most important safety result is:

```text
A skipped vacancy produces a documented skip reason instead of wasting time or forcing unsafe CV tailoring.
```

The most important portfolio result is:

```text
A backend-first, artifact-based, AI-assisted workflow system with PostgreSQL metadata, filesystem storage, prompt versioning, evidence guard, PDF export and clear documentation.
```
