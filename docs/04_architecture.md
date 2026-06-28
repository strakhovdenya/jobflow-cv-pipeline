# JobFlow CV Pipeline — Architecture

## 1. Purpose

This document describes the backend-first architecture for **JobFlow CV Pipeline**.

The architecture must support the product flow defined in Product Vision, Requirements, User Flows, Domain Model, Epics and Roadmap:

```text
manual workspace creation
  -> save vacancy as canonical file
  -> run AI vacancy analysis
  -> human review gate after Prompt 1
  -> apply/maybe approval or skip handling
  -> targeted CV content generation
  -> PDF export by default
  -> artifact access and workspace history
```

The first usable MVP must stay simple enough to build quickly, but the architecture should not block later additions such as Redis/BullMQ queues, robust folder import, cover letters, final checks and a Next.js dashboard.

## 2. Architecture Principles

### 2.1 Backend-first

The MVP is a backend-first TypeScript application.

Primary backend responsibilities:

- enforce the workflow rules;
- validate input;
- store metadata in PostgreSQL;
- save physical artifacts on the filesystem;
- call AI providers through an abstraction layer;
- track AI token usage and estimated cost per AI run, prompt step and workspace;
- generate canonical Markdown/JSON/HTML/PDF artifacts;
- preserve prompt versions and AI run history;
- prevent unsafe CV claims through an anti-overclaiming guard.

A frontend dashboard is useful later, but it must not block the first usable MVP.

### 2.2 Human-in-the-loop

The system must not act as a fully automatic CV generator.

Human review gates are part of the architecture:

```text
Prompt 1 completed -> pause for Apply / Maybe / Skip review
Prompt 2 completed -> pause for CV draft review
PDF exported -> optional final check / download / regenerate
```

The system may automate execution, but it must not automate risky decisions.

### 2.3 Artifact-first

Every important step must produce a physical or structured artifact.

Canonical internal artifacts use stable names:

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
05_final_check.md
05_final_check.json
cover_letter.md
cover_letter.pdf
```

Human-readable download/export names may include `company_slug` and `role_slug`.

### 2.4 PostgreSQL metadata + filesystem storage

PostgreSQL stores metadata, state, relationships and audit history.

The filesystem stores generated content and physical documents.

The two must stay linked through `GeneratedArtifact` records.

### 2.5 Extendable, not overengineered

The domain model and architecture can evolve.

The MVP should implement what is needed now, while leaving room for:

- robust import;
- Redis/BullMQ async workers;
- Next.js dashboard;
- cover letter generation;
- final check;
- DOCX export;
- MCP-style local tooling;
- rejection analysis;
- version comparison.

## 3. High-Level MVP Architecture

MVP architecture:

```text
Client / Swagger / API caller
        |
        v
NestJS API
  |-- Workspace Module
  |-- Slug & Naming Module
  |-- Artifact Storage Module
  |-- Knowledge Source Module
  |-- Prompt Template Module
  |-- AI Provider Module
  |-- AI Usage Tracking Module
  |-- Prompt Pipeline Module
  |-- Evidence Guard Module
  |-- Document Export Module
        |
        |-- Prisma ORM
        |       |
        |       v
        |   PostgreSQL
        |
        |-- Local Filesystem Storage
        |
        |-- OpenAI / Anthropic API
```

MVP runtime:

```text
Docker Compose
  - postgres

Local process
  - NestJS API
  - Prisma client
  - filesystem storage
```

MVP does not require Redis/BullMQ or Next.js.

Long-running operations can initially run synchronously as request/response operations, provided that:

- results are saved as artifacts;
- metadata is stored in PostgreSQL;
- errors are persisted where useful;
- user review gates are respected.

## 4. Later Architecture

Later architecture with background processing and dashboard:

```text
Next.js Dashboard
        |
        v
NestJS API
  |-- Workspace Module
  |-- Artifact Module
  |-- Prompt Pipeline Module
  |-- Review Gate Module
  |-- Import Module
  |-- Document Export Module
        |
        |-- Prisma ORM -> PostgreSQL
        |-- Filesystem Storage
        |-- Redis / BullMQ
                  |
                  v
            Worker Process
              |-- analysis worker
              |-- cv generation worker
              |-- pre-pdf check worker
              |-- export worker
              |-- final check worker
              |-- cover letter worker
              |-- import worker
        |
        |-- AI Provider APIs
```

Later benefits:

- background AI runs;
- job status tracking;
- retries;
- failed job handling;
- cancellation;
- idempotency;
- better UI feedback;
- portfolio-ready production-style backend workflows.

Important rule:

```text
Queues automate execution, not decision-making.
```

Even after Redis/BullMQ is added, human review gates remain mandatory.

## 5. Technology Stack

### 5.1 MVP Stack

```text
Node.js
TypeScript
NestJS
PostgreSQL
Prisma
Docker Compose
Local filesystem storage
OpenAI or Anthropic API
Markdown / JSON / HTML / PDF generation
Swagger / OpenAPI
Jest
Claude Code-assisted development workflow
```

### 5.2 Later Stack

```text
Redis
BullMQ
Worker process
Next.js dashboard
GitHub Actions
Supertest
Structured logging with Pino or Winston
DOCX export
MCP-style local tooling
```

## 6. Main Modules

## 6.1 Workspace Module

### Responsibility

Manages `ApplicationWorkspace`, `Company` and `JobVacancy` records.

### Main functions

- create workspace manually;
- validate separate company name, role title and vacancy text;
- generate `company_slug`, `role_slug` and `workspace_slug`;
- create workspace folder;
- save canonical vacancy artifact as `00_vacancy_source.txt`;
- track workspace status;
- expose workspace overview;
- support review status updates;
- later support application tracking.

### MVP endpoints

```text
POST /workspaces
GET /workspaces
GET /workspaces/:id
PATCH /workspaces/:id
GET /workspaces/:id/status
```

### Key workflow rules

- Company name, role title and vacancy text are separate inputs.
- Original values must always be stored separately from slugs.
- Vacancy text is saved exactly as submitted, except normal encoding handling.
- Sanitization applies only to slugs and file names, not vacancy content.
- Manual workspace creation is the MVP path.
- Import existing folders is P1 optional.

## 6.2 Slug and Naming Module

### Responsibility

Provides deterministic, safe naming for workspaces and human-readable export files.

### Company slug rules

Company slug may contain:

```text
English letters
Unicode Cyrillic letters
numbers
underscore
```

Company slug may preserve meaningful numbers, for example:

```text
Action1
CHECK24
```

### Role slug rules

Role slug may contain:

```text
English letters
Unicode Cyrillic letters
underscore
```

Current rule: numbers are removed from role slug unless this is changed later.

### Unicode rule

Use Unicode Cyrillic script matching, not only Russian letters.

Implementation guidance:

```text
Use Unicode property matching such as \p{Script=Cyrillic}
```

This matters because existing company names may include Ukrainian Cyrillic characters.

### Naming separation

The architecture must distinguish:

```text
canonical internal artifact names
human-readable download/export names
legacy imported names
```

Internal names stay short and stable:

```text
04_cv_export.pdf
```

Download names can be descriptive:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
```

Legacy names are supported during import only.

## 6.3 Artifact Storage Module

### Responsibility

Writes, reads, registers and downloads physical artifacts.

### Storage root

Default configurable root:

```text
storage/applications/
```

New workspace folder format:

```text
<date>_<company_slug>_<role_slug>/
```

Example:

```text
storage/applications/2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
```

### Canonical artifacts

The module must support at least:

```text
00_vacancy_source.txt
01_vacancy_analysis.md
01_vacancy_analysis.json
01_skip_reason.md
01_skip_reason.json
02_targeted_cv_content.md
02_targeted_cv_content.json
04_cv_export.html
04_cv_export.pdf
```

P1 optional:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
05_final_check.md
05_final_check.json
```

Phase 2:

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

### Metadata synchronization

Every physical file must have a `GeneratedArtifact` record with:

- workspace id;
- artifact type;
- canonical file name;
- relative path;
- download file name if applicable;
- MIME type;
- content hash;
- source prompt run id if applicable;
- Step 4 export artifacts do not have an AiRun;
- latest version flag;
- created timestamp.

### Path safety

The module must prevent:

- path traversal;
- invalid filenames;
- writing outside configured storage root;
- accidental overwrite without versioning or explicit replace behavior.

## 6.4 PostgreSQL / Prisma Data Access Layer

### Responsibility

Stores domain metadata, state, relationships and audit history.

### Main Prisma models

Core MVP models:

```text
Company
JobVacancy
ApplicationWorkspace
KnowledgeSource
PromptTemplate
PromptRun
AiRun
GeneratedArtifact
EvidenceItem
CvDraft
```

Phase 2 / later models:

```text
CoverLetterDraft
QueueJob
ApplicationEvent
UserNote
RejectionAnalysis
```

### Data access rules

- PostgreSQL stores metadata, not large generated documents.
- Large content is saved to filesystem artifacts.
- JSON outputs can be stored as files and optionally summarized in PostgreSQL.
- Every prompt run should be traceable to prompt template version, input hash and output artifacts.
- Every AI run should be traceable to provider, model, status and token/cost metadata if available.

## 6.5 Source Knowledge Base Module

### Responsibility

Manages reusable source files and evidence data.

### Source types

```text
master_cv
profile_summary
linkedin_snapshot
cv_layout_reference
cv_format_rules
tech_stack_matrix
project_inventory
career_case_deep_dive
certifications_inventory
project_context
prompt_template_source
legacy_workspace
other
```

### Main functions

- register source knowledge files;
- compute content hashes;
- track active/inactive status;
- expose selected sources for prompt runs;
- connect evidence items to source files;
- prevent random, untracked prompt attachments.

### Evidence use

The module supports anti-overclaiming by providing evidence for:

- commercial production experience;
- working commercial experience;
- personal project experience;
- basic/training exposure;
- missing evidence.

## 6.6 Prompt Template Module

### Responsibility

Stores and versions prompts.

### Prompt template types

```text
vacancy_analysis          # Prompt 1
cv_content_generation     # Prompt 2
pre_pdf_check             # Prompt 3, P1 optional
# Step 4 document export is not an AI prompt and has no prompt template.
final_check               # Prompt 5, P1 optional
cover_letter              # Prompt 2.1, Phase 2
recruiter_message         # Phase 2
rejection_analysis        # Later
```

### Rules

- Prompt versions must not be silently overwritten.
- Editing a prompt creates a new version.
- Only one active version per prompt type should be used by default.
- Prompt runs must reference the exact template version used.

## 6.7 AI Provider Abstraction Module

### Responsibility

Wraps OpenAI / Anthropic / future provider calls behind a stable interface.

### Interface concept

```ts
interface AiProvider {
  runTextGeneration(input: AiTextGenerationInput): Promise<AiTextGenerationResult>;
}
```

### Provider-agnostic input

```text
provider
model
system_prompt
user_prompt
input_files_context
expected_output_format
temperature
metadata
```

### Provider-agnostic output

```text
raw_response
parsed_json
markdown_text
finish_reason
token_usage
normalized_usage
cost_estimate
cost_currency
provider_request_id
usage_raw_json
error
```

### MVP providers

MVP can start with one provider.

The abstraction exists so the system can later support:

- provider switching;
- retry with another provider;
- model comparison;
- fallback handling;
- cost tracking.

## 6.8 AI Usage Tracking Module

### Responsibility

Tracks token usage, provider usage metadata and estimated AI cost for every AI-assisted step.

This is useful for:

- understanding how expensive each prompt step is;
- comparing Prompt 1 / Prompt 2 / export-related AI steps;
- detecting unusually large vacancy inputs or source-context payloads;
- deciding when to reduce context size;
- showing cost and token summaries in workspace history;
- supporting later queue dashboards and portfolio-ready observability.

### Scope

The module should collect AI usage information from provider responses when available and store it on `AiRun`.

Minimum tracked fields:

```text
provider
model
prompt_type
workspace_id
prompt_run_id
input_tokens
output_tokens
total_tokens
cached_input_tokens optional
reasoning_tokens optional
cost_estimate optional
cost_currency optional
provider_request_id optional
usage_raw_json optional
created_at
```

### Cost estimate rules

The system should not hard-code provider pricing directly inside business logic.

Recommended approach:

```text
AI provider response -> token usage -> AiUsageTrackingService -> pricing config -> estimated cost -> AiRun metadata
```

Cost estimates may be approximate because provider pricing, token categories and billing rules can change. The architecture should therefore store:

- raw token usage from the provider;
- normalized token usage fields;
- pricing configuration version if cost estimation is enabled;
- estimated cost separately from actual billing.

The application must not rely on cost estimation for correctness of the CV pipeline. If usage or pricing data is missing, the AI run should still be saved, but usage fields should be nullable and the UI/API should show `usage unavailable`.

### Workspace-level summaries

The system should be able to calculate usage summaries at several levels:

```text
per AiRun
per PromptRun
per ApplicationWorkspace
per prompt type
per provider/model
per day/month later
```

Example workspace usage summary:

```text
Workspace: Broadvoice / Full-Stack Engineer with AI background
Prompt 1 analysis: 8,200 input tokens, 1,400 output tokens
Skip reason generation: 1,200 input tokens, 700 output tokens
Total: 11,500 tokens
Estimated cost: optional / approximate
```

### API output

AI usage should be visible in API responses for AI runs and workspace summaries.

Example fields in a workspace detail response:

```json
{
  "ai_usage_summary": {
    "total_input_tokens": 12000,
    "total_output_tokens": 2500,
    "total_tokens": 14500,
    "estimated_cost": null,
    "currency": null,
    "usage_available": true
  }
}
```

### MVP vs later

MVP required:

- store token usage returned by the AI provider on `AiRun`;
- expose token usage per AI run;
- show workspace-level token totals if easy to calculate.

Later:

- model/provider cost comparison;
- monthly cost reports;
- token budget warnings;
- queue dashboard usage metrics;
- alert when a prompt run exceeds expected token usage.

## 6.9 Prompt Pipeline Service

### Responsibility

Coordinates prompt execution and workflow state transitions.

### MVP pipeline

```text
Prompt 1 Vacancy Analysis
  -> save 01_vacancy_analysis.md/json
  -> status analysis_ready / paused_after_analysis
  -> wait for user decision

If skip:
  -> generate 01_skip_reason.md/json
  -> status skipped
  -> stop pipeline

If apply/maybe approved:
  -> Prompt 2 Targeted CV Content
  -> save 02_targeted_cv_content.md/json
  -> status cv_draft_ready / paused_after_cv_draft

If export approved:
  -> Step 4 deterministic Document Export, no AI provider call
  -> read approved 02_targeted_cv_content.json
  -> save 04_cv_export.html/pdf
  -> status cv_pdf_generated
```

### P1 optional pipeline

```text
Prompt 3 Pre-PDF Check
  -> save 03_pre_pdf_check.md/json
  -> status pre_pdf_check_ready / paused_before_export
  -> recommendations become mandatory context for Step 4 if artifacts exist

Prompt 5 Final Check
  -> save 05_final_check.md/json
  -> status final_check_ready
```

### Phase 2 pipeline

```text
Cover Letter Generation
  -> save cover_letter.md/pdf
  -> status cover_letter_generated
```

### Pipeline constraints

- Prompt 2 must not run until apply/maybe is approved or skip is manually overridden.
- Skip stops the pipeline by default.
- Manual override must be logged.
- Prompt 5 must not run if there is no CV artifact.
- If Prompt 3 artifacts exist, Step 4 document export must read and apply their recommendations before rendering HTML/PDF.
- Cover letter generation is not required for first usable MVP.

## 6.10 Review Gate Service

### Responsibility

Controls user approvals and pauses.

### Required review gates

MVP required:

```text
After Prompt 1: Apply / Maybe / Skip review
After Prompt 2: CV draft review
```

P1 optional:

```text
After Prompt 3: pre-export review
After Prompt 5: final send decision
```

Optional:

```text
After PDF export: download / final check / regenerate
```

### Review state values

```text
pending_review
approved
edited
rejected
overridden
```

### Decision values

```text
apply
maybe
skip
manual_override_apply
manual_override_maybe
manual_override_skip
```

## 6.11 Anti-Overclaiming Guard Module

### Responsibility

Prevents unsupported claims in generated CV content.

### Guard sources

- source knowledge base;
- `EvidenceItem` records;
- tech stack classifications;
- career case deep dives;
- CV format rules;
- prompt output warnings.

### MVP guard behavior

The MVP guard can be rule-based and conservative.

It should flag or block claims such as:

- commercial AI/LLM production experience if only personal/coursework evidence exists;
- commercial NestJS if unsupported;
- Docker production ownership if unsupported;
- Kubernetes real production experience if only basic exposure exists;
- AWS/DynamoDB/MySQL without evidence;
- fluent English or professional German if not supported;
- generic CV bullets not connected to the vacancy.

### Guard outputs

```text
claim
risk_level
evidence_status
source_reference
suggested_safe_wording
needs_evidence
user_override_status
```

### Architecture rule

Anti-overclaiming guard is P0/MVP required.

Prompt 3 is P1 optional, so the basic guard must already work during Prompt 2 or immediately after Prompt 2.

## 6.12 Document Export Service

### Responsibility

Generates physical CV files through a deterministic backend export step.

Step 4 is **not an AI prompt**. It must not call OpenAI, Anthropic or any other AI provider.

### MVP responsibility

- take approved `02_targeted_cv_content.json`;
- check for `03_pre_pdf_check.md/json`;
- if present, use Prompt 3 recommendations as mandatory vacancy-specific export context;
- create HTML representation;
- generate PDF by default;
- save `04_cv_export.html`;
- save `04_cv_export.pdf`;
- create artifact metadata;
- provide human-readable download file name;
- keep AI token usage at zero / not applicable for this step.

### Default export

```text
PDF
```

### Optional export formats

```text
HTML
JSON
Markdown downloadable draft
DOCX later
```

### Internal vs download names

Internal:

```text
04_cv_export.pdf
```

Download:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
```

### Suggested implementation approach

MVP can use HTML-to-PDF generation.

Possible implementation approaches:

- generate HTML template from approved structured CV content;
- render PDF with Playwright or Puppeteer;
- store HTML as a debug/preview artifact;
- store PDF as the default physical output.

The exact PDF library can be decided during implementation. The export service must not modify CV wording or add new claims during templating.

## 6.13 Import Service

### Responsibility

Imports existing folders and registers legacy artifacts.

### MVP status

Import existing folders is **P1 / MVP Optional**, not first usable MVP required.

### Import source examples

```text
Company/
  YYYY.MM.DD/
    *.txt
    03_targeted_CV_content_*.md
    *_CV.pdf
    *_Cover_Letter.pdf
    SKIP_*.md
```

### Import behavior

The service should detect:

- company;
- date;
- role;
- vacancy source file;
- targeted CV content;
- CV PDF;
- cover letter PDF;
- skip reason;
- current status.

### Import preview

The system must not silently import ambiguous folders.

It should show preview and allow:

- accept detected metadata;
- edit company name;
- edit role title;
- regenerate slug;
- skip workspace;
- skip duplicates.

### Legacy naming rule

Imported legacy files may keep original filenames.

Newly generated internal artifacts should use canonical names.

The service may optionally copy imported vacancy source into:

```text
00_vacancy_source.txt
```

## 7. Data Structure Overview

## 7.1 Core relational structure

```text
Company 1---N ApplicationWorkspace
JobVacancy 1---1 ApplicationWorkspace
ApplicationWorkspace 1---N PromptRun
ApplicationWorkspace 1---N AiRun
ApplicationWorkspace 1---N GeneratedArtifact
ApplicationWorkspace 1---N CvDraft
ApplicationWorkspace 1---N CoverLetterDraft
ApplicationWorkspace N---N KnowledgeSource through PromptRunSource or WorkspaceKnowledgeSource
PromptTemplate 1---N PromptRun
PromptRun 1---N GeneratedArtifact
PromptRun 0..1---1 AiRun
KnowledgeSource 1---N EvidenceItem
EvidenceItem N---N CvDraft or GeneratedClaim later
```

## 7.2 Main state fields

`ApplicationWorkspace` should track:

```text
status
decision
review_state
company_id
job_vacancy_id
workspace_slug
storage_path
created_at
updated_at
```

`GeneratedArtifact` should track:

```text
workspace_id
artifact_type
canonical_file_name
relative_path
download_file_name
mime_type
content_hash
prompt_run_id
origin
is_latest
created_at
```

MVP rule: `GeneratedArtifact` links to `PromptRun` where applicable; `PromptRun` links to `AiRun`. Deterministic Step 4 export artifacts use `origin = generated_by_export_service` and no `AiRun`.

`PromptRun` should track:

```text
workspace_id
prompt_template_id
prompt_type
prompt_version
input_hash
source_files_hash
status
started_at
completed_at
```

`AiRun` should track:

```text
workspace_id
prompt_run_id
provider
model
status
raw_request_path
raw_response_path
input_tokens
output_tokens
total_tokens
cached_input_tokens optional
reasoning_tokens optional
usage_raw_json
cost_estimate optional
cost_currency optional
pricing_config_version optional
provider_request_id optional
error_message
started_at
completed_at
```

## 8. Status Model

Recommended workspace statuses:

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

MVP required statuses:

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
failed
```

P1 optional statuses:

```text
pre_pdf_check_ready
paused_before_export
final_check_ready
ready_to_apply
```

Phase 2 statuses:

```text
cover_letter_generated
applied
rejected
archived
```

## 9. Main MVP Sequence

## 9.1 Create workspace

```text
User submits:
  company_name_original
  role_title_original
  vacancy_text
  source_url optional

NestJS WorkspaceController
  -> WorkspaceService validates input
  -> SlugService generates company_slug and role_slug
  -> WorkspaceService creates ApplicationWorkspace and JobVacancy
  -> ArtifactStorageService creates workspace folder
  -> ArtifactStorageService writes 00_vacancy_source.txt
  -> GeneratedArtifact record is created
  -> status = source_saved
```

Physical result:

```text
storage/applications/<date>_<company_slug>_<role_slug>/00_vacancy_source.txt
```

## 9.2 Run Prompt 1

```text
User clicks Run Analysis
  -> PromptPipelineService loads vacancy source
  -> loads active Prompt 1 template
  -> loads selected knowledge sources
  -> creates PromptRun
  -> creates AiRun
  -> AiProvider generates analysis
  -> ArtifactStorageService writes 01_vacancy_analysis.md/json
  -> status = analysis_ready / paused_after_analysis
```

Physical result:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

## 9.3 Decision gate

```text
User reviews apply/maybe/skip
```

If skip:

```text
PromptPipelineService creates skip reason
ArtifactStorageService writes 01_skip_reason.md/json
status = skipped
pipeline stops
```

Physical result:

```text
01_skip_reason.md
01_skip_reason.json
SKIP_<company_slug>_<role_slug>_reason_RU.md as download/export name
```

If apply or maybe approved:

```text
ReviewGateService records approval
status = cv_generation_running
Prompt 2 can run
```

## 9.4 Run Prompt 2

```text
PromptPipelineService loads:
  vacancy source
  Prompt 1 analysis
  Prompt 2 template
  source knowledge base
  evidence items
  CV format rules

AiProvider generates targeted CV content
EvidenceGuard checks unsafe claims
ArtifactStorageService writes 02_targeted_cv_content.md/json
status = cv_draft_ready / paused_after_cv_draft
```

Physical result:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

## 9.5 Export PDF by default

```text
User approves CV draft and export
DocumentExportService reads approved 02_targeted_cv_content.json
DocumentExportService renders HTML
DocumentExportService renders PDF
ArtifactStorageService writes 04_cv_export.html/pdf
GeneratedArtifact records are created
No AiRun is created and no AI tokens are consumed
status = cv_pdf_generated
```

Physical result:

```text
04_cv_export.html
04_cv_export.pdf
```

Download result:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
```

## 10. Later Sequence With Redis/BullMQ

After queues are added, the API should create background jobs instead of executing long operations in the request.

```text
User clicks Run Analysis
  -> API creates PromptRun
  -> API creates AiRun
  -> API enqueues BullMQ job
  -> Worker picks job
  -> Worker calls PromptPipelineService
  -> Artifacts are saved
  -> Status changes to analysis_ready
  -> User review gate opens
```

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

Queue job statuses:

```text
pending
running
completed
failed
retrying
cancelled
```

Idempotency key should include:

```text
workspace_id
step
prompt_template_version
input_hash
source_files_hash
output_format
```

## 11. API Surface

## 11.1 MVP API endpoints

```text
POST   /workspaces
GET    /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
GET    /workspaces/:id/artifacts
GET    /workspaces/:id/status

POST   /workspaces/:id/run-analysis
POST   /workspaces/:id/decision
POST   /workspaces/:id/generate-cv-content
POST   /workspaces/:id/export-cv

GET    /artifacts/:id/download
GET    /artifacts/:id/preview

GET    /knowledge-sources
POST   /knowledge-sources
PATCH  /knowledge-sources/:id

GET    /prompt-templates
POST   /prompt-templates
POST   /prompt-templates/:id/new-version
PATCH  /prompt-templates/:id/activate
```

## 11.2 P1 / later endpoints

```text
POST   /workspaces/:id/run-pre-pdf-check
POST   /workspaces/:id/run-final-check
POST   /workspaces/:id/generate-cover-letter
POST   /imports/existing-folders/preview
POST   /imports/existing-folders/confirm
GET    /queue-jobs/:id
POST   /queue-jobs/:id/retry
POST   /queue-jobs/:id/cancel
```

## 12. Configuration

Recommended environment variables:

```text
DATABASE_URL
STORAGE_ROOT
OPENAI_API_KEY
ANTHROPIC_API_KEY
AI_PROVIDER_DEFAULT
AI_MODEL_DEFAULT
PDF_RENDER_MODE
APP_ENV
LOG_LEVEL
```

Later:

```text
REDIS_URL
QUEUE_CONCURRENCY
GITHUB_ACTIONS_MODE
```

## 13. Docker Compose Architecture

MVP `docker-compose.yml` should include PostgreSQL:

```text
services:
  postgres:
    image: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: jobflow
      POSTGRES_PASSWORD: jobflow
      POSTGRES_DB: jobflow
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 13.1 PostgreSQL persistence requirement

PostgreSQL data must survive normal local development shutdowns on Windows.

The MVP must use a Docker named volume for PostgreSQL data, not only container-local storage. This means that workspace metadata, Prisma tables, prompt runs, AI runs and artifact registry records must still exist after:

```text
docker compose down
Docker Desktop restart
Windows restart
container removal and recreation
docker compose up -d
```

Expected behavior:

- stopping containers must not delete PostgreSQL data;
- removing/recreating the PostgreSQL container must not delete PostgreSQL data as long as the named volume is preserved;
- Prisma migrations must not reset or wipe existing data during normal startup;
- seed scripts must be explicit and must not silently overwrite user data;
- destructive reset commands must be documented separately and never used in normal startup commands.

The system does not need to protect data after an explicit volume deletion command such as:

```text
docker compose down -v
```

That command is considered destructive and should be documented as data-removing.

### 13.2 PostgreSQL persistence verification

The project must include a manual or scripted persistence check during local setup.

Minimum verification flow:

```text
1. Run docker compose up -d postgres.
2. Run Prisma migrations.
3. Create a test ApplicationWorkspace record.
4. Stop containers with docker compose down.
5. Start containers again with docker compose up -d postgres.
6. Verify that the test ApplicationWorkspace still exists.
7. Remove/recreate the PostgreSQL container without deleting the named volume.
8. Verify that tables and data still exist.
```

This check should be represented in the task backlog and later automated or documented in README.

The NestJS API may run locally with:

```text
npm run start:dev
```

Later Docker Compose can include:

```text
api
worker
redis
postgres
```

## 14. Error Handling and Recovery

### Deterministic export rule

Step 4 document export must not be represented as an `AiRun`. AI usage tracking applies to Prompt 1, skip reason generation if AI-assisted, Prompt 2, optional Prompt 3, optional Prompt 5 and cover letter generation. It does not apply to deterministic PDF export.

### AI provider failure

Save:

- provider;
- model;
- step;
- prompt version;
- input hash;
- error message;
- retry count;
- failed timestamp.

User options:

```text
Retry
Switch provider
Edit input and retry
Save failed result
Pause
```

### File access failure

Save and show:

- path;
- operation;
- permission issue if known;
- invalid filename;
- duplicate warning;
- failed timestamp.

User options:

```text
Choose another folder
Create missing directory
Rename file
Cancel import
Retry
```

### PDF export failure

Save:

- HTML artifact if generated;
- export error;
- template error if available;
- file path issue if relevant.

User options:

```text
Retry PDF export
Export HTML only
Export JSON only
Edit template
Pause
```

## 15. Testing Strategy

## 15.1 MVP tests

Unit tests:

- slug normalization;
- workspace validation;
- artifact path generation;
- artifact type mapping;
- prompt template versioning;
- skip decision handling;
- anti-overclaiming guard rules.

Integration tests:

- create workspace with PostgreSQL;
- save `00_vacancy_source.txt`;
- register `GeneratedArtifact`;
- run mocked Prompt 1;
- apply skip flow;
- run mocked Prompt 2;
- export mocked/simple PDF artifact.

## 15.2 Later tests

- BullMQ job lifecycle;
- retry behavior;
- idempotency;
- import preview detection;
- PDF rendering regression;
- frontend dashboard flows.

## 16. Security and Safety Requirements

This is a local/personal tool in MVP, but basic safety still matters.

Required:

- never write outside storage root;
- sanitize slugs and download filenames;
- preserve original vacancy text separately;
- never overwrite prompt versions silently;
- preserve AI usage metadata when provider response includes it;
- never claim unsupported experience as fact;
- log manual overrides;
- do not automatically submit applications;
- do not auto-generate CV after skip unless explicitly overridden.

Out of scope for early MVP:

- multi-user authentication;
- public deployment;
- complex RBAC;
- cloud production security.

## 17. MVP Architecture Summary

First usable MVP:

```text
NestJS API
  -> PostgreSQL/Prisma metadata
  -> filesystem artifact storage
  -> source knowledge base registry
  -> prompt templates and prompt runs
  -> AI provider abstraction
  -> AI token usage tracking per AiRun
  -> Prompt 1 analysis with human review gate
  -> skip handling
  -> Prompt 2 targeted CV content
  -> basic anti-overclaiming guard
  -> deterministic PDF export by default, no AI provider call
```

Required physical result:

```text
storage/applications/<workspace_slug>/00_vacancy_source.txt
storage/applications/<workspace_slug>/01_vacancy_analysis.md/json
storage/applications/<workspace_slug>/02_targeted_cv_content.md/json
storage/applications/<workspace_slug>/04_cv_export.html/pdf
```

Skip physical result:

```text
storage/applications/<workspace_slug>/00_vacancy_source.txt
storage/applications/<workspace_slug>/01_vacancy_analysis.md/json
storage/applications/<workspace_slug>/01_skip_reason.md/json
```

## 18. Later Architecture Summary

Portfolio-ready version:

```text
Next.js dashboard
  -> NestJS API
  -> PostgreSQL/Prisma
  -> filesystem artifact storage
  -> Redis/BullMQ queues
  -> worker process
  -> AI provider abstraction
  -> robust import service
  -> document export service
  -> cover letter generation
  -> final checks
  -> application tracking
  -> rejection analysis
  -> version comparison
```

Portfolio-ready backend evidence:

- NestJS modular architecture;
- PostgreSQL/Prisma relational modeling;
- filesystem artifact storage;
- AI provider abstraction;
- prompt versioning;
- human-in-the-loop workflow;
- anti-overclaiming guard;
- PDF generation;
- background queues;
- retries and failed-job handling;
- clear documentation and tests.
