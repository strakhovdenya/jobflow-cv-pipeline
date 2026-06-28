# JobFlow CV Pipeline — Domain Model

## 1. Purpose

This document describes the current domain model for **JobFlow CV Pipeline**.

The model is designed for PostgreSQL and Prisma, but it should remain flexible. The project is still evolving, so the goal is not to predict every future entity perfectly. The goal is to define a solid current model that supports the first usable MVP and can be extended later without rewriting the whole system.

This model follows the current product decisions:

- The first usable MVP starts with manual workspace creation.
- The user enters company name, role title and multi-line vacancy text as separate inputs.
- Existing folder import is P1 optional; robust import is later.
- `00_vacancy_source.txt` is the canonical internal vacancy source file.
- Original company name, original role title and original vacancy text must always be preserved.
- New workspace names use underscore-based slugs.
- `company_slug` may preserve meaningful numbers.
- `role_slug` allows English letters, Unicode Cyrillic letters and underscores.
- Prompt 1 always ends with a human review gate.
- `apply` and `maybe` continue only after explicit user approval.
- `skip` creates canonical internal skip artifacts and stops the pipeline by default.
- Prompt 2 runs only after user approval or manual override.
- Prompt 3 / pre-PDF check is P1 / MVP Optional.
- Prompt 5 / final check is optional.
- PDF is the default physical CV export.
- Internal artifact names are short and stable.
- Human-readable download/export names may include `company_slug` and `role_slug`.
- Internal JSON artifacts for prompt outputs are required for reproducibility.
- User-facing CV JSON export is optional.
- Cover letter generation is Phase 2 / later.
- Redis/BullMQ queue entities are later-stage and are not required for the first usable MVP.
- Anti-overclaiming guard is a core safety requirement.

## 2. Modeling Principles

### 2.1 Artifact-first model

The product is not only a database tracker. It creates real files that must be usable outside the application.

Therefore, the model must always connect:

```text
ApplicationWorkspace
  -> PromptRun / AiRun
  -> GeneratedArtifact
  -> filesystem path
  -> source hashes
  -> user review decision
```

PostgreSQL stores metadata, state, relationships, hashes and audit information.

The filesystem stores physical content:

```text
00_vacancy_source.txt
01_vacancy_analysis.md/json
01_skip_reason.md/json
02_targeted_cv_content.md/json
03_pre_pdf_check.md/json
04_cv_export.html/pdf/json
05_final_check.md/json
cover_letter.md/pdf
```

### 2.2 Preserve original input

The system must never destroy original user-provided information.

For every workspace, preserve:

- original company name;
- original role title;
- original vacancy text;
- optional source URL;
- original imported file names if the workspace came from legacy folders.

Normalized slugs are generated for storage and file names, but they must not replace original display values.

### 2.3 Human-in-the-loop state machine

The system should automate repetitive work but not skip key review points.

Mandatory behavior:

- Prompt 1 output must pause at a decision gate.
- `apply` and `maybe` require user approval before Prompt 2.
- `skip` creates skip artifacts and stops the pipeline by default.
- Manual overrides must be logged.
- Generated CV content must be reviewable before PDF export.

### 2.4 Extensibility

Some entities will evolve. The model should support this by using:

- stable IDs;
- enums for known workflow states;
- JSON fields for provider-specific or prompt-specific data;
- artifact types instead of hardcoded file columns;
- versioned prompt templates;
- hashes for reproducibility;
- optional fields for later features.

Do not over-normalize too early, but do not hide core workflow concepts in one generic JSON blob.

## 3. Main Entities Overview

| Entity | Purpose | MVP required? |
|---|---|---:|
| `Company` | Stores company display name and normalized slug | Yes |
| `JobVacancy` | Stores role metadata and vacancy source metadata | Yes |
| `ApplicationWorkspace` | Main workflow container for one company + role opportunity | Yes |
| `PromptTemplate` | Stores prompt identity and active version metadata | Yes |
| `PromptRun` | Stores a concrete prompt execution context and output metadata | Yes |
| `AiRun` | Stores AI provider/model call metadata, status and cost/tokens if available | Yes |
| `KnowledgeSource` | Stores imported source knowledge files and their versions/hashes | Yes |
| `EvidenceItem` | Stores structured evidence extracted from knowledge sources or manually added | Yes, basic |
| `GeneratedArtifact` | Registry for every generated or imported physical file | Yes |
| `CvDraft` | Domain record for targeted CV draft versions | Yes |
| `CoverLetterDraft` | Domain record for cover letter versions | Later / Phase 2 |

Recommended later entities:

| Entity | Purpose | Phase |
|---|---|---|
| `ReviewDecision` | Dedicated audit trail for approvals, edits and overrides | P1 / can be embedded in MVP |
| `ApplicationNote` | Notes, salary notes, recruiter notes, evidence questions | P1/P2 |
| `QueueJob` | BullMQ job metadata, retries, failures, idempotency | P2 |
| `ApplicationEvent` | Append-only lifecycle/event history | P1/P2 |
| `RejectionAnalysis` | Rejection text and learning analysis | P2 |
| `ExportTemplate` | Multiple CV/PDF templates | P2 |

## 4. Entity Relationship Summary

High-level relationship map:

```text
Company 1 ── * ApplicationWorkspace
JobVacancy 1 ── 1 ApplicationWorkspace
ApplicationWorkspace 1 ── * PromptRun
ApplicationWorkspace 1 ── * AiRun
ApplicationWorkspace 1 ── * GeneratedArtifact
ApplicationWorkspace 1 ── * CvDraft
ApplicationWorkspace 1 ── * CoverLetterDraft
ApplicationWorkspace * ── * KnowledgeSource through PromptRunKnowledgeSource
KnowledgeSource 1 ── * EvidenceItem
PromptTemplate 1 ── * PromptRun
PromptRun 1 ── 0..1 AiRun
PromptRun 1 ── * GeneratedArtifact
CvDraft 1 ── * GeneratedArtifact
CoverLetterDraft 1 ── * GeneratedArtifact
```

Recommended MVP simplification:

- `Company` and `JobVacancy` may be separate tables from the start.
- If implementation speed matters, `Company` and `JobVacancy` can be embedded into `ApplicationWorkspace` initially, but separate tables are cleaner for import, duplicate detection and future tracking.
- `ReviewDecision` can start as fields on `ApplicationWorkspace` and later become a separate audit table.
- `PromptTemplateVersion` can be a separate table later; for MVP, `PromptTemplate` can contain `version`, `isActive`, and `content`.

## 5. Enums

### 5.1 WorkspaceStatus

Recommended enum:

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

MVP must support at least:

```text
source_saved
analysis_running
analysis_ready
paused_after_analysis
skipped
cv_generation_running
cv_draft_ready
export_running
cv_pdf_generated
failed
```

P1/P2 can add or start using:

```text
pre_pdf_check_ready
paused_before_export
final_check_ready
ready_to_apply
cover_letter_generated
applied
rejected
archived
```

### 5.2 VacancyDecision

```text
apply
maybe
skip
manual_override_apply
manual_override_maybe
manual_override_skip
```

Rules:

- `apply` means AI recommends applying, but the system still waits for user approval.
- `maybe` means AI recommends manual review before spending time on CV generation.
- `skip` means the system generates skip artifacts and stops by default.
- `manual_override_apply` means the user explicitly continued despite a lower-confidence or skip recommendation.
- Overrides must be logged through fields or a later `ReviewDecision` / `ApplicationEvent` table.

### 5.3 UserReviewState

```text
pending_review
approved
edited
rejected
overridden
```

Suggested usage:

- after Prompt 1: `pending_review`;
- after user approves apply/maybe: `approved`;
- after user changes AI recommendation: `overridden`;
- after user edits analysis/CV: `edited`;
- after user rejects generated output: `rejected`.

### 5.4 PromptStep

```text
vacancy_analysis
skip_reason
targeted_cv_content
pre_pdf_check
cv_export
final_check
cover_letter
recruiter_message
rejection_analysis
```

MVP uses:

```text
vacancy_analysis
skip_reason
targeted_cv_content
cv_export
```

P1/P2 uses:

```text
pre_pdf_check
final_check
cover_letter
recruiter_message
rejection_analysis
```

### 5.5 PromptRunStatus / AiRunStatus

```text
pending
running
completed
failed
cancelled
skipped
```

Later with queues:

```text
retrying
expired
```

### 5.6 ArtifactType

```text
vacancy_source
vacancy_source_cleaned
vacancy_analysis_md
vacancy_analysis_json
skip_reason_md
skip_reason_json
targeted_cv_content_md
targeted_cv_content_json
pre_pdf_check_md
pre_pdf_check_json
cv_export_html
cv_export_pdf
cv_export_json
cv_export_md
final_check_md
final_check_json
cover_letter_md
cover_letter_pdf
recruiter_message_md
application_email_md
application_note_md
submitted_files_json
imported_legacy_file
error_log
screenshot_or_preview
```

MVP must support at least:

```text
vacancy_source
vacancy_analysis_md
vacancy_analysis_json
skip_reason_md
skip_reason_json
targeted_cv_content_md
targeted_cv_content_json
cv_export_html
cv_export_pdf
error_log
imported_legacy_file
```

### 5.7 ArtifactOrigin

```text
created_by_user
uploaded_by_user
imported_legacy
generated_by_prompt_run
generated_by_export_service
generated_by_system
```

### 5.8 ArtifactFormat

```text
txt
md
json
html
pdf
docx
png
jpg
log
unknown
```

### 5.9 KnowledgeSourceType

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
other
```

### 5.10 EvidenceCategory

```text
commercial_production
working_commercial
personal_project
coursework_or_training
basic_exposure
needs_evidence
unsafe_claim
```

### 5.11 OutputFormat

```text
pdf
html
json
markdown
docx
```

Rules:

- `pdf` is default for physical CV export.
- `html` is preview/layout/debug output.
- `json` can mean user-facing CV JSON export only at export step.
- Internal JSON artifacts are required for prompt outputs regardless of user-facing JSON export.
- `markdown` is primarily internal editable draft output and may be downloadable.
- `docx` is later.

## 6. Entity: Company

### 6.1 Purpose

`Company` stores the company display name and normalized company slug.

The company name is entered separately from role title and vacancy text. It must be preserved exactly for display and prompt context.

### 6.2 Fields

Recommended Prisma-style fields:

```text
id                       String   @id @default(cuid())
nameOriginal             String
companySlug              String
normalizedName           String?
sourceType               String?  # manual, imported_legacy, detected
notes                    String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
websiteUrl               String?
linkedinUrl              String?
careerPageUrl            String?
country                  String?
industry                 String?
companySize              String?
```

### 6.3 Company slug rules

Allowed characters:

```text
English letters
Unicode Cyrillic letters
Numbers
Underscore
```

Company slug may preserve meaningful numbers:

```text
Action1 -> Action1
CHECK24 Vergleichsportal -> CHECK24_Vergleichsportal
Omega CRM, A Merkle Company -> Omega_CRM_A_Merkle_Company
```

Use Unicode script matching for Cyrillic letters, for example `\p{Script=Cyrillic}`, instead of only `[А-Яа-яЁё]`.

### 6.4 Relationships

```text
Company 1 -> * ApplicationWorkspace
```

Optional later:

```text
Company 1 -> * JobVacancy
```

### 6.5 Lifecycle

```text
created manually
  -> company_slug generated
  -> linked to ApplicationWorkspace
  -> reused for future vacancies from same company
  -> optionally enriched with website/LinkedIn later
```

## 7. Entity: JobVacancy

### 7.1 Purpose

`JobVacancy` stores role-specific metadata and vacancy source information.

The vacancy text is content, not filename input. It may be English, German, mixed English/German, Russian notes, or copied multi-line text from job boards.

### 7.2 Fields

```text
id                       String   @id @default(cuid())
companyId                String
roleTitleOriginal         String
roleSlug                 String
sourceUrl                String?
languageDetected         String?
locationText             String?
remoteType               String?  # remote, hybrid, onsite, unknown
employmentType           String?  # full_time, contract, freelance, unknown
seniority                String?  # middle, senior, lead, unknown
vacancyTextPath          String   # canonical path to 00_vacancy_source.txt
vacancyTextHash          String
vacancyTextSizeBytes     Int?
sourceFormat             String?  # pasted_text, uploaded_txt, imported_legacy
originalImportedFileName String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Possible later fields:

```text
salaryText               String?
requiredLanguages        Json?
coreStack                Json?
sourcePlatform           String?  # LinkedIn, company website, Instaffo, etc.
postedAt                 DateTime?
closedAt                 DateTime?
```

### 7.3 Role slug rules

Allowed characters:

```text
English letters
Unicode Cyrillic letters
Underscore
```

Numbers are removed or converted through separator replacement according to current normalization rules.

Recommended algorithm:

1. Take `roleTitleOriginal`.
2. Trim leading and trailing whitespace.
3. Replace whitespace with `_`.
4. Replace non-letter separators and special characters with `_`.
5. Keep only English letters, Unicode Cyrillic letters and underscores.
6. Collapse repeated underscores.
7. Remove leading and trailing underscores.
8. Preserve original case unless a later implementation decision changes casing consistently.

The original title is always stored separately, so slug normalization does not cause user-facing information loss.

### 7.4 Relationships

```text
JobVacancy 1 -> 1 ApplicationWorkspace
JobVacancy * -> 1 Company
```

### 7.5 Lifecycle

```text
manual input or imported legacy file
  -> vacancy text saved as 00_vacancy_source.txt
  -> text hash generated
  -> role slug generated
  -> linked to ApplicationWorkspace
  -> used as input for Prompt 1
```

## 8. Entity: ApplicationWorkspace

### 8.1 Purpose

`ApplicationWorkspace` is the central workflow object. It represents one job opportunity for one company and one role.

It owns the workflow status, current decision, review state, storage folder and links to all generated artifacts.

### 8.2 Fields

```text
id                       String   @id @default(cuid())
companyId                String
jobVacancyId             String   @unique
workspaceSlug            String   @unique
storageRoot              String
workspacePath            String
status                   WorkspaceStatus
currentDecision          VacancyDecision?
reviewState              UserReviewState?
score                    Int?
skipReasonSummary         String?
nextRecommendedAction    String?
isSkipped                Boolean  @default(false)
isArchived               Boolean  @default(false)
createdFrom              String   # manual, imported_legacy, cloned
sourceImportedPath        String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
lastActivityAt           DateTime?
```

Optional later fields:

```text
appliedAt                DateTime?
appliedVia               String?
rejectedAt               DateTime?
rejectionSummary         String?
notes                    String?
latestCvDraftId          String?
latestCvPdfArtifactId    String?
latestAnalysisRunId      String?
latestPromptRunId        String?
```

### 8.3 Workspace slug

Recommended format:

```text
<YYYY_MM_DD>_<company_slug>_<role_slug>
```

Example:

```text
2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS
```

If generated path is too long, the system may ask user for a shorter manual slug or create a shortened internal slug while preserving full original metadata.

### 8.4 Relationships

```text
ApplicationWorkspace * -> 1 Company
ApplicationWorkspace 1 -> 1 JobVacancy
ApplicationWorkspace 1 -> * PromptRun
ApplicationWorkspace 1 -> * AiRun
ApplicationWorkspace 1 -> * GeneratedArtifact
ApplicationWorkspace 1 -> * CvDraft
ApplicationWorkspace 1 -> * CoverLetterDraft
```

### 8.5 Lifecycle

#### Manual MVP lifecycle

```text
created
  -> source_saved
  -> analysis_running
  -> analysis_ready
  -> paused_after_analysis
  -> if skip: skipped
  -> if apply/maybe approved: cv_generation_running
  -> cv_draft_ready
  -> paused_after_cv_draft
  -> export_running
  -> cv_pdf_generated
```

#### Optional P1/P2 lifecycle additions

```text
cv_draft_ready
  -> paused_after_cv_draft
  -> pre_pdf_check_ready
  -> paused_before_export
  -> export_running
  -> cv_pdf_generated
  -> final_check_ready
  -> ready_to_apply
  -> cover_letter_generated
  -> applied
  -> rejected / archived
```

Note: Prompt 3 pre-PDF check happens before export when implemented. It is P1 / MVP Optional, so the MVP can export PDF without Prompt 3 if the user approves the CV draft directly. If `03_pre_pdf_check.md/json` exists, it becomes a required source artifact for the export step and its recommendations must be applied or explicitly preserved before `04_cv_export.html/pdf` is generated.

### 8.6 State transition rules

| From | To | Condition |
|---|---|---|
| `source_saved` | `analysis_running` | User starts Prompt 1 |
| `analysis_running` | `analysis_ready` | Prompt 1 completes |
| `analysis_ready` | `paused_after_analysis` | Decision gate is shown |
| `paused_after_analysis` | `skipped` | Decision is `skip` and skip artifacts are created |
| `paused_after_analysis` | `cv_generation_running` | User approves `apply` or `maybe`, or overrides `skip` |
| `cv_generation_running` | `cv_draft_ready` | Prompt 2 completes |
| `cv_draft_ready` | `paused_after_cv_draft` | CV draft review gate is shown |
| `paused_after_cv_draft` | `export_running` | User approves PDF export |
| `export_running` | `cv_pdf_generated` | PDF artifact is created |
| any running state | `failed` | Step fails and error artifact is saved |

## 9. Entity: PromptTemplate

### 9.1 Purpose

`PromptTemplate` stores reusable AI prompt templates such as Prompt 1, Prompt 2, Prompt 3, Prompt 5 and cover letter prompts. Step 4 document export is deterministic and must not be stored as an AI prompt template.

Prompt templates must be versioned. The system should never silently overwrite old prompt versions.

### 9.2 Fields

MVP single-table versioning option:

```text
id                       String   @id @default(cuid())
key                      String   # prompt_1_vacancy_analysis, prompt_2_targeted_cv_content
name                     String
step                     PromptStep
version                  Int
content                  String
systemInstructions       String?
outputSchema             Json?
isActive                 Boolean  @default(false)
notes                    String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Recommended unique constraint:

```text
@@unique([key, version])
```

Optional later split:

```text
PromptTemplate
  -> PromptTemplateVersion
```

Use this split later if prompt editing becomes complex.

### 9.3 Relationships

```text
PromptTemplate 1 -> * PromptRun
```

### 9.4 Lifecycle

```text
created
  -> activated
  -> used by PromptRun
  -> edited by creating a new version
  -> old version remains available for audit
  -> deactivated if no longer default
```

### 9.5 MVP prompt templates

MVP requires:

```text
prompt_1_vacancy_analysis
prompt_2_targeted_cv_content
```

MVP/P1 optional:

```text
prompt_3_pre_pdf_check
prompt_5_final_check
```

Phase 2:

```text
prompt_2_1_cover_letter
recruiter_message
rejection_analysis
```

## 10. Entity: PromptRun

### 10.1 Purpose

`PromptRun` records a concrete execution of a prompt template against a workspace.

It connects:

- workspace;
- prompt template and version;
- input snapshot;
- source knowledge files and hashes;
- AI run;
- output artifacts;
- user review state.

### 10.2 Fields

```text
id                       String   @id @default(cuid())
workspaceId              String
promptTemplateId          String
step                     PromptStep
status                   PromptRunStatus
inputSnapshot            Json
sourceFilesSnapshot       Json?
outputSummary            String?
outputJson               Json?
outputTextPreview        String?
reviewState              UserReviewState?
userNotes                String?
errorMessage             String?
startedAt                DateTime?
completedAt              DateTime?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Recommended additional fields:

```text
inputHash                String?
sourceFilesHash          String?
promptContentHash         String?
outputHash               String?
idempotencyKey           String?
```

### 10.3 Relationships

```text
PromptRun * -> 1 ApplicationWorkspace
PromptRun * -> 1 PromptTemplate
PromptRun 1 -> 0..1 AiRun
PromptRun 1 -> * GeneratedArtifact
PromptRun * -> * KnowledgeSource through PromptRunKnowledgeSource
```

### 10.4 Source files snapshot

The system should know which source knowledge files were used for each prompt run.

MVP approach:

```text
sourceFilesSnapshot: Json
```

Example:

```json
[
  {
    "knowledgeSourceId": "...",
    "path": "Tech_Stack_Matrix_RU_v2_0.md",
    "hash": "sha256...",
    "type": "tech_stack_matrix"
  }
]
```

Later normalized join table:

```text
PromptRunKnowledgeSource
  id
  promptRunId
  knowledgeSourceId
  sourceHashAtRun
  includedReason
```

### 10.5 Lifecycle

```text
created with input snapshot
  -> pending / running
  -> AiRun created
  -> completed
  -> output artifacts saved
  -> review state becomes pending_review if human review is required
  -> approved / edited / rejected / overridden
```

### 10.6 Step-specific behavior

#### Prompt 1

Expected artifacts:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

Must set:

```text
workspace.currentDecision
workspace.score
workspace.status = paused_after_analysis
```

#### Skip reason

Expected artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

Must set:

```text
workspace.status = skipped
workspace.isSkipped = true
```

#### Prompt 2

Expected artifacts:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

Must create or update:

```text
CvDraft
```

#### Prompt 3

P1 / MVP Optional.

Expected artifacts:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
```

When present, these artifacts must be linked as source/context artifacts for Step 4 document export.

#### Prompt 5

Optional.

Expected artifacts:

```text
05_final_check.md
05_final_check.json
```

## 11. Entity: AiRun

### 11.1 Purpose

`AiRun` records the actual AI provider/model execution.

A PromptRun describes product-level prompt execution. An AiRun describes provider-level call metadata.

This separation is useful because later one PromptRun may involve multiple AI calls, retries, provider switches or queue jobs.

### 11.2 Fields

```text
id                       String   @id @default(cuid())
workspaceId              String
promptRunId              String?  @unique
provider                 String   # openai, anthropic, local_mock, other
model                    String?
status                   AiRunStatus
requestPayloadHash        String?
responsePayloadHash       String?
inputTokens              Int?
outputTokens             Int?
totalTokens              Int?
estimatedCost            Decimal?
latencyMs                Int?
temperature              Float?
maxTokens                Int?
errorMessage             String?
errorCode                String?
startedAt                DateTime?
completedAt              DateTime?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
providerRequestId        String?
retryCount               Int      @default(0)
queueJobId               String?
cancelledAt              DateTime?
rawRequestPath           String?
rawResponsePath          String?
```

### 11.3 Relationships

```text
AiRun * -> 1 ApplicationWorkspace
AiRun * -> 0..1 PromptRun
```

Later:

```text
AiRun * -> 0..1 QueueJob
```

### 11.4 Lifecycle

```text
created
  -> pending
  -> running
  -> completed / failed / cancelled
  -> linked output saved through PromptRun artifacts
```

### 11.5 MVP notes

MVP does not need to store raw provider payloads in the database. It can store hashes and optional filesystem paths if needed.

Do not store secrets or API keys in AiRun.

## 12. Entity: KnowledgeSource

### 12.1 Purpose

`KnowledgeSource` stores source knowledge files used by the prompt pipeline.

These files are the evidence layer of the system. They prevent generic CV generation and unsupported claims.

### 12.2 Fields

```text
id                       String   @id @default(cuid())
type                     KnowledgeSourceType
title                    String
fileName                 String
filePath                 String
fileFormat               ArtifactFormat
contentHash              String
version                  Int      @default(1)
isActive                 Boolean  @default(true)
language                 String?
summary                  String?
notes                    String?
lastImportedAt           DateTime?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
sourceOrigin             String?  # uploaded, local_path, generated, imported
validFrom                DateTime?
validTo                  DateTime?
embeddingStatus          String?
```

### 12.3 Core source knowledge files

Examples:

```text
Master_CV_RU_v0_3_final.md
Master_Profile_Summary_RU.md
Tech_Stack_Matrix_RU_v2_0.md
Project_Inventory_RU.md
Career_Case_Deep_Dives_RU_v0_3_resolved.md
CV_Format_Rules_EN.md
LinkedIn_Certifications_Inventory_RU_EN_2026-06.md
CV_Layout_Reference_EN_2026-06.pdf
Reference_LinkedIn_Profile_Snapshot_EN_2026-06.pdf.pdf
```

### 12.4 Relationships

```text
KnowledgeSource 1 -> * EvidenceItem
KnowledgeSource * -> * PromptRun through PromptRunKnowledgeSource
```

### 12.5 Lifecycle

```text
imported or registered
  -> content hash generated
  -> marked active
  -> used in PromptRun
  -> updated by creating new version or updating hash
  -> old version remains traceable through PromptRun snapshots
```

## 13. Entity: EvidenceItem

### 13.1 Purpose

`EvidenceItem` stores structured evidence extracted from knowledge sources or manually added by the user.

It supports the anti-overclaiming guard.

Evidence items help answer:

```text
Can this CV claim be supported?
Is this commercial production experience, personal project experience, training-only, basic exposure or needs evidence?
```

### 13.2 Fields

```text
id                       String   @id @default(cuid())
knowledgeSourceId         String?
category                 EvidenceCategory
claim                    String
safeWording              String?
unsafeWording            String?
technology               String?
projectName              String?
companyName              String?
experienceContext        String?  # EPAM, Factor-IT, personal_project, course, etc.
confidence               String?  # high, medium, low
needsEvidence            Boolean  @default(false)
notes                    String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
sourceLineReference      String?
sourceQuote              String?
riskLevel                String?  # low, medium, high, blocker
validForRoleTypes        Json?
```

### 13.3 Relationships

```text
EvidenceItem * -> 0..1 KnowledgeSource
```

Later:

```text
EvidenceItem * -> * CvDraft through CvDraftEvidenceItem
EvidenceItem * -> * PromptRun through PromptRunEvidenceItem
```

### 13.4 Examples

```text
claim: Node.js / TypeScript commercial backend experience
category: commercial_production
safeWording: Commercial Node.js/TypeScript backend experience with Azure Functions, API integrations and production support.
```

```text
claim: Production MCP experience
category: unsafe_claim
safeWording: AI-assisted development workflow / personal tooling exposure.
needsEvidence: true
```

```text
claim: Kafka event-driven architecture
category: needs_evidence
safeWording: needs evidence
needsEvidence: true
```

### 13.5 Lifecycle

```text
created from source knowledge file or manually
  -> used by evidence guard
  -> referenced in PromptRun source snapshot
  -> updated when new evidence is added
  -> never silently converts personal project into commercial production experience
```

## 14. Entity: GeneratedArtifact

### 14.1 Purpose

`GeneratedArtifact` is the registry of every file generated, uploaded, imported or saved by the system.

It is one of the most important entities because the product is artifact-first.

### 14.2 Fields

```text
id                       String   @id @default(cuid())
workspaceId              String
promptRunId              String?
cvDraftId                String?
coverLetterDraftId        String?
type                     ArtifactType
format                   ArtifactFormat
origin                   ArtifactOrigin
canonicalFileName         String
humanReadableFileName    String?
relativePath             String
absolutePath             String?
contentHash              String?
sizeBytes                Int?
isLatest                 Boolean  @default(true)
isInternal               Boolean  @default(true)
version                  Int      @default(1)
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional fields:

```text
mimeType                 String?
previewText              String?
errorMessage             String?
sourceImportedPath        String?
```

### 14.3 Relationships

```text
GeneratedArtifact * -> 1 ApplicationWorkspace
GeneratedArtifact * -> 0..1 PromptRun
GeneratedArtifact * -> 0..1 CvDraft
GeneratedArtifact * -> 0..1 CoverLetterDraft
```

### 14.4 Canonical internal names

Internal artifact files inside the workspace should use stable step-based names:

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
recruiter_message.md
application_email.md
```

### 14.5 Human-readable export/download names

Download/export names may include `company_slug` and `role_slug`:

```text
Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf
Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf
SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

### 14.6 Lifecycle

```text
file created/imported/uploaded
  -> GeneratedArtifact record created
  -> content hash stored
  -> linked to workspace and optional PromptRun
  -> marked latest
  -> older version marked not latest if regenerated
  -> downloadable through artifact access flow
```

### 14.7 Artifact versioning rule

If the same artifact type is generated again:

- do not overwrite the old database record;
- either create a new file version or overwrite the file but preserve old metadata/version only if content backup exists;
- recommended: create a new versioned artifact record and mark previous `isLatest = false`.

MVP may use simple overwrite during early development, but portfolio-ready version should preserve artifact versions.

## 15. Entity: CvDraft

### 15.1 Purpose

`CvDraft` represents a targeted CV content draft generated for a workspace.

It is created by Prompt 2 and may later be edited, checked, exported and versioned.

### 15.2 Fields

```text
id                       String   @id @default(cuid())
workspaceId              String
promptRunId              String?
version                  Int      @default(1)
status                   String   # draft_ready, approved, edited, exported, rejected
headline                 String?
summaryPreview           String?
topSkills                Json?
selectedProjects         Json?
evidenceSummary          Json?
overclaimingWarnings      Json?
openEvidenceQuestions    Json?
outputTarget             OutputFormat @default(pdf)
approvedAt               DateTime?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
editedMarkdownPath       String?
layoutProfile            String?
pageCountEstimate        Int?
qualityScore             Int?
```

### 15.3 Relationships

```text
CvDraft * -> 1 ApplicationWorkspace
CvDraft * -> 0..1 PromptRun
CvDraft 1 -> * GeneratedArtifact
```

Later:

```text
CvDraft * -> * EvidenceItem
```

### 15.4 Expected artifacts

Prompt 2 creates:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

PDF export creates:

```text
04_cv_export.html
04_cv_export.pdf
```

Optional user-facing JSON export:

```text
04_cv_export.json
```

### 15.5 Lifecycle

```text
Prompt 2 completed
  -> CvDraft created
  -> status = draft_ready
  -> user reviews
  -> approved / edited / rejected
  -> if approved: exported to PDF by default
  -> GeneratedArtifact links to exported files
```

### 15.6 Rules

- CvDraft cannot be generated before Prompt 1 decision gate is resolved.
- CvDraft cannot be generated for `skip` unless user explicitly overrides.
- CvDraft must preserve evidence and overclaiming warnings.
- CvDraft markdown is internal editable artifact and may be downloadable.
- PDF is the default physical export.

## 16. Entity: CoverLetterDraft

### 16.1 Purpose

`CoverLetterDraft` represents optional cover letter or recruiter message generation.

This is part of the broader product vision but not required for the first usable MVP.

### 16.2 Fields

```text
id                       String   @id @default(cuid())
workspaceId              String
promptRunId              String?
cvDraftId                String?
version                  Int      @default(1)
status                   String   # draft_ready, approved, edited, exported, rejected
letterType               String   # cover_letter, recruiter_message, application_email
summaryPreview           String?
approvedAt               DateTime?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Optional later fields:

```text
recipientName            String?
recipientCompany         String?
tone                     String?
```

### 16.3 Relationships

```text
CoverLetterDraft * -> 1 ApplicationWorkspace
CoverLetterDraft * -> 0..1 PromptRun
CoverLetterDraft * -> 0..1 CvDraft
CoverLetterDraft 1 -> * GeneratedArtifact
```

### 16.4 Expected artifacts

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

### 16.5 Lifecycle

```text
CV draft or CV PDF exists
  -> user requests cover letter / recruiter message
  -> PromptRun created
  -> CoverLetterDraft created
  -> user reviews
  -> PDF or Markdown generated
  -> optional mark applied
```

### 16.6 Rules

- Cover letter generation is Phase 2 / later.
- It should usually run after a CV draft or final CV exists.
- The user may explicitly request a cover letter without CV generation, but this is not the normal MVP path.
- Cover letter artifacts must be linked to the same workspace and source evidence.

## 17. Supporting Join Entities

These entities are recommended when implementing with Prisma. They may be introduced immediately or added when the model grows.

### 17.1 PromptRunKnowledgeSource

Purpose: preserve exactly which knowledge sources were used in a prompt run.

```text
id                       String @id @default(cuid())
promptRunId              String
knowledgeSourceId         String
sourceHashAtRun           String
includedReason            String?
createdAt                DateTime @default(now())
```

Relationships:

```text
PromptRunKnowledgeSource * -> 1 PromptRun
PromptRunKnowledgeSource * -> 1 KnowledgeSource
```

### 17.2 WorkspaceDecisionEvent

Purpose: audit decision changes and manual overrides.

This can be implemented later, but the concept is important.

```text
id                       String @id @default(cuid())
workspaceId              String
fromDecision             VacancyDecision?
toDecision               VacancyDecision
fromStatus               WorkspaceStatus?
toStatus                 WorkspaceStatus?
reason                   String?
userNote                 String?
createdAt                DateTime @default(now())
```

Use cases:

- AI recommends `skip`, user overrides to continue.
- AI recommends `maybe`, user approves to continue.
- User marks CV draft as not worth applying.

### 17.3 WorkspaceNote

Purpose: store manual notes without mixing them into generated CV content.

```text
id                       String @id @default(cuid())
workspaceId              String
noteType                 String # recruiter, evidence_question, salary, interview, general, skip_reason_note
content                  String
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

### 17.4 QueueJob

Later entity for Redis/BullMQ metadata.

```text
id                       String @id @default(cuid())
workspaceId              String
promptRunId              String?
aiRunId                  String?
queueName                String
jobName                  String
status                   String # pending, running, completed, failed, retrying, cancelled
attempts                 Int
maxAttempts              Int
idempotencyKey           String?
errorMessage             String?
createdAt                DateTime @default(now())
updatedAt                DateTime @updatedAt
```

Queues are later-stage. They automate execution, not decision-making.

## 18. Recommended Prisma Model Sketch

This is not a final schema. It is a practical starting point for implementation.

```prisma
enum WorkspaceStatus {
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
}

enum VacancyDecision {
  apply
  maybe
  skip
  manual_override_apply
  manual_override_maybe
  manual_override_skip
}

enum UserReviewState {
  pending_review
  approved
  edited
  rejected
  overridden
}

enum PromptStep {
  vacancy_analysis
  skip_reason
  targeted_cv_content
  pre_pdf_check
  cv_export
  final_check
  cover_letter
  recruiter_message
  rejection_analysis
}

enum RunStatus {
  pending
  running
  completed
  failed
  cancelled
  skipped
}

enum ArtifactFormat {
  txt
  md
  json
  html
  pdf
  docx
  png
  jpg
  log
  unknown
}

enum ArtifactOrigin {
  created_by_user
  uploaded_by_user
  imported_legacy
  generated_by_prompt_run
  generated_by_export_service
  generated_by_system
}

enum ArtifactType {
  vacancy_source
  vacancy_source_cleaned
  vacancy_analysis_md
  vacancy_analysis_json
  skip_reason_md
  skip_reason_json
  targeted_cv_content_md
  targeted_cv_content_json
  pre_pdf_check_md
  pre_pdf_check_json
  cv_export_html
  cv_export_pdf
  cv_export_json
  cv_export_md
  final_check_md
  final_check_json
  cover_letter_md
  cover_letter_pdf
  recruiter_message_md
  application_email_md
  application_note_md
  submitted_files_json
  imported_legacy_file
  error_log
  screenshot_or_preview
}

enum KnowledgeSourceType {
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
  other
}

enum EvidenceCategory {
  commercial_production
  working_commercial
  personal_project
  coursework_or_training
  basic_exposure
  needs_evidence
  unsafe_claim
}

enum OutputFormat {
  pdf
  html
  json
  markdown
  docx
}

model Company {
  id             String   @id @default(cuid())
  nameOriginal   String
  companySlug    String
  normalizedName String?
  sourceType     String?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  workspaces     ApplicationWorkspace[]
}

model JobVacancy {
  id                       String   @id @default(cuid())
  companyId                String
  roleTitleOriginal         String
  roleSlug                 String
  sourceUrl                String?
  languageDetected         String?
  locationText             String?
  remoteType               String?
  employmentType           String?
  seniority                String?
  vacancyTextPath          String
  vacancyTextHash          String
  vacancyTextSizeBytes     Int?
  sourceFormat             String?
  originalImportedFileName String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  company                  Company  @relation(fields: [companyId], references: [id])
  workspace                ApplicationWorkspace?
}

model ApplicationWorkspace {
  id                    String           @id @default(cuid())
  companyId             String
  jobVacancyId          String           @unique
  workspaceSlug         String           @unique
  storageRoot           String
  workspacePath         String
  status                WorkspaceStatus
  currentDecision       VacancyDecision?
  reviewState           UserReviewState?
  score                 Int?
  skipReasonSummary      String?
  nextRecommendedAction String?
  isSkipped             Boolean          @default(false)
  isArchived            Boolean          @default(false)
  createdFrom           String
  sourceImportedPath     String?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  lastActivityAt        DateTime?

  company               Company          @relation(fields: [companyId], references: [id])
  jobVacancy            JobVacancy       @relation(fields: [jobVacancyId], references: [id])
  promptRuns            PromptRun[]
  aiRuns                AiRun[]
  artifacts             GeneratedArtifact[]
  cvDrafts              CvDraft[]
  coverLetterDrafts      CoverLetterDraft[]
}

model PromptTemplate {
  id                 String     @id @default(cuid())
  key                String
  name               String
  step               PromptStep
  version            Int
  content            String
  systemInstructions String?
  outputSchema       Json?
  isActive           Boolean    @default(false)
  notes              String?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  promptRuns         PromptRun[]

  @@unique([key, version])
}

model PromptRun {
  id                  String          @id @default(cuid())
  workspaceId          String
  promptTemplateId      String
  step                PromptStep
  status              RunStatus
  inputSnapshot        Json
  sourceFilesSnapshot  Json?
  outputSummary        String?
  outputJson           Json?
  outputTextPreview    String?
  reviewState          UserReviewState?
  userNotes            String?
  errorMessage         String?
  inputHash            String?
  sourceFilesHash      String?
  promptContentHash    String?
  outputHash           String?
  idempotencyKey       String?
  startedAt            DateTime?
  completedAt          DateTime?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  workspace            ApplicationWorkspace @relation(fields: [workspaceId], references: [id])
  promptTemplate        PromptTemplate       @relation(fields: [promptTemplateId], references: [id])
  aiRun                AiRun?
  artifacts            GeneratedArtifact[]
  knowledgeSources      PromptRunKnowledgeSource[]
}

model AiRun {
  id                 String     @id @default(cuid())
  workspaceId         String
  promptRunId         String?    @unique
  provider           String
  model              String?
  status             RunStatus
  requestPayloadHash  String?
  responsePayloadHash String?
  inputTokens        Int?
  outputTokens       Int?
  totalTokens        Int?
  estimatedCost      Decimal?
  latencyMs          Int?
  temperature        Float?
  maxTokens          Int?
  errorMessage       String?
  errorCode          String?
  startedAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  workspace          ApplicationWorkspace @relation(fields: [workspaceId], references: [id])
  promptRun          PromptRun?           @relation(fields: [promptRunId], references: [id])
}

model KnowledgeSource {
  id             String              @id @default(cuid())
  type           KnowledgeSourceType
  title          String
  fileName       String
  filePath       String
  fileFormat     ArtifactFormat
  contentHash    String
  version        Int                 @default(1)
  isActive       Boolean             @default(true)
  language       String?
  summary        String?
  notes          String?
  lastImportedAt DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  evidenceItems  EvidenceItem[]
  promptRuns     PromptRunKnowledgeSource[]
}

model EvidenceItem {
  id                String            @id @default(cuid())
  knowledgeSourceId  String?
  category          EvidenceCategory
  claim             String
  safeWording       String?
  unsafeWording     String?
  technology        String?
  projectName       String?
  companyName       String?
  experienceContext String?
  confidence        String?
  needsEvidence     Boolean           @default(false)
  notes             String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  knowledgeSource   KnowledgeSource?  @relation(fields: [knowledgeSourceId], references: [id])
}

model GeneratedArtifact {
  id                    String         @id @default(cuid())
  workspaceId            String
  promptRunId            String?
  cvDraftId              String?
  coverLetterDraftId      String?
  type                  ArtifactType
  format                ArtifactFormat
  origin                ArtifactOrigin
  canonicalFileName      String
  humanReadableFileName String?
  relativePath          String
  absolutePath          String?
  contentHash           String?
  sizeBytes             Int?
  isLatest              Boolean        @default(true)
  isInternal            Boolean        @default(true)
  version               Int            @default(1)
  mimeType              String?
  previewText           String?
  errorMessage          String?
  sourceImportedPath     String?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  workspace             ApplicationWorkspace @relation(fields: [workspaceId], references: [id])
  promptRun             PromptRun?           @relation(fields: [promptRunId], references: [id])
  cvDraft               CvDraft?             @relation(fields: [cvDraftId], references: [id])
  coverLetterDraft       CoverLetterDraft?     @relation(fields: [coverLetterDraftId], references: [id])
}

model CvDraft {
  id                    String       @id @default(cuid())
  workspaceId            String
  promptRunId            String?
  version               Int          @default(1)
  status                String
  headline              String?
  summaryPreview        String?
  topSkills             Json?
  selectedProjects       Json?
  evidenceSummary       Json?
  overclaimingWarnings   Json?
  openEvidenceQuestions Json?
  outputTarget          OutputFormat @default(pdf)
  approvedAt            DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  workspace             ApplicationWorkspace @relation(fields: [workspaceId], references: [id])
  artifacts             GeneratedArtifact[]
}

model CoverLetterDraft {
  id             String   @id @default(cuid())
  workspaceId     String
  promptRunId     String?
  cvDraftId       String?
  version        Int      @default(1)
  status         String
  letterType     String
  summaryPreview String?
  approvedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  workspace      ApplicationWorkspace @relation(fields: [workspaceId], references: [id])
  artifacts      GeneratedArtifact[]
}

model PromptRunKnowledgeSource {
  id                String @id @default(cuid())
  promptRunId        String
  knowledgeSourceId   String
  sourceHashAtRun     String
  includedReason      String?
  createdAt          DateTime @default(now())

  promptRun          PromptRun      @relation(fields: [promptRunId], references: [id])
  knowledgeSource     KnowledgeSource @relation(fields: [knowledgeSourceId], references: [id])

  @@unique([promptRunId, knowledgeSourceId])
}
```

## 19. MVP Domain Slice

To avoid overbuilding, the first implementation can use this minimum domain slice:

```text
Company
JobVacancy
ApplicationWorkspace
GeneratedArtifact
KnowledgeSource
PromptTemplate
PromptRun
AiRun
EvidenceItem
CvDraft
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
export_running
cv_pdf_generated
failed
```

MVP required artifacts:

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

MVP required prompt templates:

```text
prompt_1_vacancy_analysis
prompt_2_targeted_cv_content
```

MVP optional / P1 artifacts:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
05_final_check.md
05_final_check.json
```

Phase 2 artifacts:

```text
cover_letter.md
cover_letter.pdf
recruiter_message.md
application_email.md
```

## 20. Domain Lifecycle Examples

### 20.1 Apply flow

```text
Company created
JobVacancy created
ApplicationWorkspace created with status source_saved
GeneratedArtifact created for 00_vacancy_source.txt
PromptRun created for Prompt 1
AiRun completed
GeneratedArtifact created for 01_vacancy_analysis.md/json
Workspace status -> paused_after_analysis
User approves apply
Workspace status -> cv_generation_running
PromptRun created for Prompt 2
AiRun completed
GeneratedArtifact created for 02_targeted_cv_content.md/json
CvDraft created
Workspace status -> paused_after_cv_draft
User approves export
GeneratedArtifact created for 04_cv_export.html/pdf
Workspace status -> cv_pdf_generated
```

### 20.2 Maybe flow

```text
Prompt 1 returns decision maybe
Workspace status -> paused_after_analysis
User reviews blockers and missing evidence
User either pauses or explicitly proceeds
If proceeds, decision becomes manual_override_apply or approved maybe
Prompt 2 runs only after explicit approval
```

### 20.3 Skip flow

```text
Prompt 1 returns decision skip
GeneratedArtifact created for 01_vacancy_analysis.md/json
GeneratedArtifact created for 01_skip_reason.md/json
Workspace currentDecision = skip
Workspace isSkipped = true
Workspace status = skipped
Pipeline stops
```

If user overrides:

```text
User chooses Override and Continue
Workspace decision -> manual_override_apply
Decision event should be logged
Prompt 2 may run
```

### 20.4 Import legacy flow, P1 optional

```text
System scans Company/YYYY.MM.DD folder
Detects legacy vacancy txt, targeted CV md, CV PDF or skip file
Creates Company, JobVacancy and ApplicationWorkspace
Creates GeneratedArtifact records with origin imported_legacy
Preserves original imported file names
Optionally copies vacancy text to canonical 00_vacancy_source.txt
User confirms or edits detected metadata
```

## 21. Open Modeling Questions

These can be decided during implementation:

1. Should `Company` and `JobVacancy` be separate from day one or embedded into `ApplicationWorkspace` for the first migration?
2. Should `PromptTemplateVersion` be a separate table immediately or should `PromptTemplate.version` be enough for MVP?
3. Should `ReviewDecision` / `WorkspaceDecisionEvent` be implemented from day one or added after the first MVP?
4. Should generated artifact versioning create new files every time or allow overwrite in early MVP?
5. Should source knowledge files be copied into app storage or referenced by external path?
6. Should raw AI request/response payloads be stored as files or only hashes and summarized metadata?
7. Should `EvidenceItem` be manually curated first or generated from knowledge files later?
8. Should `CvDraft.status` become a strict enum after workflow stabilizes?
9. Should workspace slug length be capped with automatic shortening or require user correction?
10. Should import legacy folders create canonical copies of files or only register original paths?

## 22. Implementation Recommendation

Recommended first Prisma migration:

```text
Company
JobVacancy
ApplicationWorkspace
GeneratedArtifact
KnowledgeSource
EvidenceItem
PromptTemplate
PromptRun
AiRun
CvDraft
PromptRunKnowledgeSource
```

Delay these until needed:

```text
CoverLetterDraft
WorkspaceDecisionEvent
WorkspaceNote
QueueJob
RejectionAnalysis
ExportTemplate
```

Reason:

- The first MVP must produce a real PDF CV and skip artifacts.
- Cover letters, queues, robust import and rejection tracking are useful but not blockers.
- The model should support artifact-first workflow immediately.
- Anti-overclaiming guard needs at least basic `EvidenceItem` support from the start.
