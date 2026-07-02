# JobFlow CV Pipeline — Requirements

## 1. Purpose

This document defines functional, non-functional, MVP, later-stage and out-of-scope requirements for **JobFlow CV Pipeline**.

JobFlow CV Pipeline is a backend-first application for creating application workspaces, optionally importing existing job application folders, running AI-assisted vacancy analysis, generating evidence-based targeted CV content, and exporting physical CV files for real applications. Cover letter generation is part of the broader product vision, but it is not required for the first usable MVP.

The requirements in this document are based on the current product vision and user flows, including the latest consistency decisions:

- Prompt 1 must always end with a human review gate.
- `apply` and `maybe` must not continue automatically without user approval.
- `skip` must generate a skip artifact and stop the CV generation pipeline by default.
- PDF is the default CV export format.
- HTML and JSON are optional export formats.
- Markdown is an internal editable artifact and may also be downloadable.
- New files/folders must use underscore-based naming.
- Legacy/manual names are supported during import only.
- `00_vacancy_source.txt` is the canonical internal vacancy source file.
- Internal artifact names must be short and stable.
- Human-readable download/export names may include `company_slug` and `role_slug`.
- `company_slug` and `role_slug` have different normalization rules.

## 2. Product Scope Summary

### 2.1 Core Product Goal

The core product goal is:

```text
Vacancy source -> AI-assisted vacancy analysis -> human decision gate -> targeted CV content -> PDF export by default
```

For skipped vacancies:

```text
Vacancy source -> AI-assisted vacancy analysis -> skip reason artifact -> stop pipeline by default
```

### 2.2 Primary User

The primary user is Denys Strakhov, a backend-focused TypeScript developer applying for Backend Developer, Software Engineer and Backend-focused Fullstack Developer roles in Germany or remote EU.

### 2.3 Primary Workflow Type

The system must be:

```text
AI-assisted, human-reviewed, artifact-first
```

It must automate repetitive work but preserve human decision points where automation could waste time or create unsafe CV claims.

Internal JSON artifacts for prompt outputs are required for reproducibility. User-facing CV JSON export is optional.

## 3. Definitions

### 3.1 Application Workspace

An **Application Workspace** represents one job opportunity for one company and role.

A workspace contains:

- company metadata;
- role metadata;
- vacancy source;
- analysis result;
- decision: `apply`, `maybe`, `skip`, or manual override;
- prompt runs;
- AI runs;
- generated artifacts;
- review states;
- application status;
- notes.

### 3.2 Source Knowledge Base

The **Source Knowledge Base** contains stable candidate facts, experience evidence, tech stack classification, CV generation rules, certifications and layout references.

Source files are not random prompt attachments. They are the evidence and safety layer of the system.

### 3.3 Prompt Template

A **Prompt Template** is a versioned instruction used by an AI step, such as Prompt 1 vacancy analysis or Prompt 2 targeted CV generation.

Prompt templates must not be silently overwritten.

### 3.4 Prompt Run

A **Prompt Run** is one execution of a prompt template against a workspace and a set of input files.

A prompt run must store:

- prompt template version;
- input snapshot;
- source files used;
- output artifacts;
- status;
- timestamps;
- errors if any.

### 3.5 AI Run

An **AI Run** is the provider/model-level execution behind a prompt run.

An AI run must store:

- provider;
- model;
- input/output metadata;
- token/cost metadata if available;
- status;
- error information.

### 3.6 Generated Artifact

A **Generated Artifact** is any file produced or imported by the system.

Examples:

- vacancy source;
- vacancy analysis Markdown/JSON;
- skip reason Markdown/JSON;
- targeted CV Markdown/JSON;
- pre-PDF check Markdown/JSON;
- CV HTML/PDF/JSON;
- final check Markdown/JSON;
- cover letter Markdown/PDF;
- recruiter message Markdown.

## 4. Functional Requirements

## 4.1 Workspace Creation Requirements

### FR-001 — Create Application Workspace Manually

The system must allow the user to create a new Application Workspace manually.

Required user inputs:

```text
company_name_original
role_title_original
vacancy_text
```

Optional user inputs:

```text
source_url
application_date
language
notes
```

The UI/API must not merge company name, role title and vacancy text into one field.

### FR-002 — Separate Company Name Input

The system must collect the company name separately from the vacancy title and vacancy text.

The original company name must be preserved for display and prompt context.

Examples:

```text
Action1
Amach
AppsFlyer
Broadvoice
CHECK24 Vergleichsportal
Omega CRM, A Merkle Company
```

### FR-003 — Separate Role Title Input

The system must collect the vacancy / role title separately from the vacancy text.

The original role title must be preserved for display and prompt context.

Examples:

```text
Backend Developer Node.js JavaScript TypeScript
Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS
Senior Backend Engineer (Node.js, AWS, DynamoDB)
Middle/Senior Full Stack Developer — Logistics Domain
```

### FR-004 — Multi-line Vacancy Text Input

The system must support vacancy text as a multi-line text input.

The vacancy text may be in different languages and must be preserved exactly as submitted, except for normal file encoding handling.

Rules:

- preserve line breaks;
- preserve bullets and formatting where possible;
- preserve punctuation and special characters;
- preserve original language;
- store as UTF-8;
- generate a content hash for duplicate detection.

Sanitization must not be applied to the vacancy source content. Sanitization applies only to generated filenames and slugs.

### FR-005 — Workspace Preview Before Creation

Before creating a workspace, the system must show a preview:

- company name;
- role title;
- generated `company_slug`;
- generated `role_slug`;
- generated workspace folder name;
- generated canonical vacancy file name;
- vacancy text preview.

User options:

```text
Create Workspace
Edit Company
Edit Role Title
Edit Vacancy Text
Cancel
```

### FR-006 — Canonical Vacancy Source File

For newly created workspaces, the canonical internal vacancy source file must be:

```text
00_vacancy_source.txt
```

Imported legacy vacancy files may keep their original names as imported artifacts, but the system should register them as vacancy source artifacts and may optionally copy them to `00_vacancy_source.txt`.

## 4.2 Slug and Naming Requirements

### FR-007 — Company Slug Normalization

The system must generate a `company_slug` from the original company name.

Allowed characters for `company_slug`:

```text
English letters: A-Z, a-z
Cyrillic letters: any Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Numbers: 0-9
Underscore: _
```

Reason: company names may contain meaningful numbers, such as `Action1` or `CHECK24`.

Recommended algorithm:

1. Trim leading and trailing whitespace.
2. Replace whitespace with `_`.
3. Replace separators and special characters with `_`.
4. Keep only English letters, Unicode Cyrillic letters, numbers and underscores.
5. Collapse repeated underscores into one `_`.
6. Remove leading/trailing underscores.
7. Preserve original case unless a later implementation decision changes casing consistently.

Implementation note: use Unicode script matching for Cyrillic letters, such as `\p{Script=Cyrillic}`, instead of only `[А-Яа-яЁё]`, because real company names may contain Ukrainian Cyrillic characters.

### FR-008 — Role Slug Normalization

The system must generate a `role_slug` from the original role title.

Allowed characters for `role_slug`:

```text
English letters: A-Z, a-z
Cyrillic letters: any Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Underscore: _
```

Numbers and other characters must be removed or converted according to the normalization rules.

Recommended algorithm:

1. Take the original vacancy / role title.
2. Trim leading and trailing whitespace.
3. Replace every whitespace character with `_`.
4. Replace every non-letter separator or special character with `_`.
5. Keep only English letters, Unicode Cyrillic letters and underscores.
6. Collapse repeated underscores into a single `_`.
7. Remove leading and trailing underscores.
8. Preserve the original letter case unless a later implementation decision chooses lower case consistently.

Repeated underscores are collapsed for readability. This does not cause information loss because the original role title is always stored separately.

Implementation note: use Unicode script matching for Cyrillic letters, such as `\p{Script=Cyrillic}`, instead of only `[А-Яа-яЁё]`.

Examples:

| Original role title | Normalized role slug |
|---|---|
| `Backend Developer Node.js JavaScript TypeScript` | `Backend_Developer_Node_js_JavaScript_TypeScript` |
| `Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS` | `Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS` |
| `Senior Backend Engineer (Node.js, AWS, DynamoDB)` | `Senior_Backend_Engineer_Node_js_AWS_DynamoDB` |
| `Middle/Senior Full Stack Developer — Logistics Domain` | `Middle_Senior_Full_Stack_Developer_Logistics_Domain` |
| `Разработчик Node.js / Backend Developer` | `Разработчик_Node_js_Backend_Developer` |
| `C#/.NET Backend Engineer` | `C_NET_Backend_Engineer` |

### FR-009 — New Workspace Folder Naming

Newly generated workspace folders must use underscore-based naming.

Recommended format:

```text
storage/applications/<YYYY_MM_DD>_<company_slug>_<role_slug>/
```

Example:

```text
storage/applications/2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
```

Legacy imported folders may contain hyphens, lowercase names or older naming conventions. Newly generated folders and files must use the current underscore-based naming convention.

### FR-010 — Internal Artifact Naming

Internal artifact files inside a workspace should use stable step-based names.

Examples:

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

Internal artifact names should not depend on company or role names. This keeps backend logic and tests simple.

### FR-011 — Download/Export Filename Naming

Human-readable download/export names may include `company_slug` and `role_slug`.

Examples:

```text
Denys_Strakhov_Action1_Backend_Developer_CV.pdf
Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf
SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

The system must distinguish between:

```text
internal artifact name
human-readable download/export filename
```

### FR-012 — Legacy Naming Compatibility

The system must support importing legacy/manual artifact names such as:

```text
03_targeted_CV_content_Action1_Backend_Developer.md
Denys_Strakhov_Action1_Backend_Developer_CV.pdf
SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

Legacy manual workflow may contain files named `03_targeted_CV_content_*`. In the new application pipeline, Prompt 2 output is stored canonically as:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

## 4.3 Import Existing Folders Requirements

These requirements describe the import capability. Basic import with manual metadata correction is MVP Optional / P1; robust import across many folders is Later Scope. Manual workspace creation is the MVP Required path.

### FR-013 — Import Existing Job Application Root

The system should allow importing an existing root folder containing company folders after the first manual-workspace MVP path is available.

Example root:

```text
D:\infa\Documents\jobs for analys\2026
```

Expected structure:

```text
Company/
  YYYY.MM.DD/
    *.txt
    03_targeted_CV_content_*.md
    *_CV.pdf
    *_Cover_Letter.pdf
    SKIP_*.md
```

### FR-014 — Detect Existing Workspace States

During import, the system must detect workspace state from existing artifacts.

Examples:

| Folder example | Detected state |
|---|---|
| vacancy txt only | `source_saved` |
| vacancy txt + targeted CV md | `cv_draft_ready` or `cv_content_imported` |
| vacancy txt + CV PDF | `cv_pdf_generated` |
| vacancy txt + CV PDF + cover letter PDF | `cover_letter_generated` |
| vacancy txt + skip file | `skipped` |

### FR-015 — Import Preview

Before importing, the system must show an import preview.

Preview must include:

- detected company;
- detected date;
- detected role;
- detected artifacts;
- inferred status;
- possible conflicts;
- duplicate warnings;
- uncertain metadata warnings.

User options:

```text
Import All
Select Workspaces
Fix Metadata
Skip Duplicates
Cancel
```

### FR-016 — Metadata Confirmation for Uncertain Import

If company or role inference is uncertain, the system must ask the user to confirm or edit metadata.

User options:

```text
Accept Detected Metadata
Edit Company Name
Edit Role Title
Regenerate Slug
Skip This Workspace
```

### FR-017 — Import Legacy Artifacts Without Data Loss

The system must not delete, rename or modify existing files during import by default.

It must store metadata references to imported files and optionally copy them into the new canonical workspace structure if the user requests it.

## 4.4 Source Knowledge Base Requirements

### FR-018 — Import Source Knowledge Files

The system must support importing source knowledge files such as:

```text
Master_CV_RU_v0_6_current_work_sync.md
Master_Profile_Summary_RU_v0_6_current_work_sync.md
Tech_Stack_Matrix_RU_v2_3_current_work_sync.md
Project_Inventory_RU_v0_6_current_work_sync.md
Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md
CV_Format_Rules_EN_v0_3_current_work_sync.md
LinkedIn_Certifications_Inventory_RU_EN_2026-06.md
CV_Layout_Reference_EN_2026-06.pdf
LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md
```

### FR-019 — Store Knowledge Source Metadata

For each knowledge source, the system must store:

- source ID;
- source type;
- title;
- file path;
- content hash;
- version;
- language;
- active/inactive status;
- last imported timestamp.

### FR-020 — Select Knowledge Sources Per Prompt Step

The system must support selecting which source files are used for each prompt step.

Examples:

- Prompt 1: profile summary, tech stack matrix, project inventory, CV rules.
- Prompt 2: master CV, career case deep dives, tech stack matrix, CV format rules, certifications.
- Prompt 3: targeted CV content, CV rules, tech stack matrix, evidence sources.
- Prompt 5: generated artifacts, CV format rules, final check rules.

### FR-021 — Source Evidence Traceability

Every Prompt Run must store which source files were used.

Stored metadata:

- source file IDs;
- source file hashes;
- source versions;
- selected excerpts or input snapshot where applicable.

## 4.5 Prompt Template and Versioning Requirements

### FR-022 — Store Prompt Templates

The system must store prompt templates for:

```text
Prompt 1 — Vacancy Analysis
Prompt 2 — Targeted CV Content
Prompt 3 — Pre-PDF Check
Prompt 5 — Final Check
Prompt 2.1 — Cover Letter / Recruiter Message
Skip Reason Generation
Rejection Analysis later
```

Step 4 document export is deterministic and must not be stored as an AI prompt template. It should use Document Export Service templates/configuration, not a PromptTemplate/AiRun.

### FR-023 — Version Prompt Templates

Prompt templates must be versioned.

The system must never silently overwrite old prompt versions.

Each template version must store:

- prompt template ID;
- step;
- version;
- title;
- content;
- input contract;
- output contract;
- active/inactive flag;
- created timestamp.

### FR-024 — Track Prompt Version Usage

Every Prompt Run must record the exact prompt template version used.

The user must be able to see which workspaces used which prompt version.

### FR-025 — Prompt Template Activation

The user must be able to activate or deactivate prompt template versions.

Only one active version per prompt step should be used by default, unless the user explicitly selects another version.

## 4.6 Prompt Run and AI Run Requirements

### FR-026 — Create Prompt Run

The system must create a Prompt Run for each AI-assisted pipeline step.

Prompt Run fields must include:

- workspace ID;
- prompt template ID;
- prompt template version;
- step;
- input snapshot;
- source files used;
- output artifact IDs;
- status;
- timestamps;
- error message if failed.

### FR-027 — Create AI Run

The system must create an AI Run for each provider/model call.

AI Run fields should include:

- prompt run ID;
- provider;
- model;
- request metadata;
- response metadata;
- token usage if available;
- estimated cost if available;
- status;
- error message if failed;
- timestamps.

### FR-028 — Input Snapshot

The system must store an input snapshot for reproducibility.

The input snapshot should include:

- workspace metadata;
- vacancy source hash;
- selected source knowledge file hashes;
- prompt template version;
- user notes included in the run;
- output format if relevant.

### FR-029 — Manual Review Gate After Prompt 1

After Prompt 1, the system must always pause and show a human review gate.

The system must not automatically continue to Prompt 2.

Decision behavior:

```text
apply -> recommended continue, but requires user approval
maybe -> pause by default, requires explicit approval to continue
skip -> generate skip artifact and stop by default
```

### FR-030 — Manual Override Logging

If the user overrides a decision, the system must log the override.

Examples:

```text
manual_override_apply
manual_override_maybe
manual_override_skip
```

Override log should store:

- previous decision;
- new decision;
- user note if provided;
- timestamp.

## 4.7 Vacancy Analysis Requirements

### FR-031 — Prompt 1 Vacancy Analysis Output

Prompt 1 must produce:

- must-have requirements;
- nice-to-have requirements;
- wishlist requirements;
- hidden role logic;
- tech stack match;
- gaps;
- language risk;
- German language risk separately where relevant;
- location/remote risk;
- evidence risks;
- final score;
- decision: `apply`, `maybe`, or `skip`;
- summary for the user;
- next recommended action.

Expected artifacts:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

### FR-032 — Apply Decision Handling

If Prompt 1 recommends `apply`, the system must show:

- score;
- top reasons to apply;
- risks;
- missing evidence if any;
- recommended next step.

User options:

```text
Approve and Generate CV
Edit Analysis
Change to Maybe
Change to Skip
Pause
```

### FR-033 — Maybe Decision Handling

If Prompt 1 recommends `maybe`, the system must pause by default.

User options:

```text
Proceed Anyway
Save as Maybe and Pause
Change to Apply
Change to Skip
Add Evidence / Notes
```

### FR-034 — Skip Decision Handling

If Prompt 1 recommends `skip`, the system must generate skip artifacts and stop the CV pipeline by default.

Canonical internal skip artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

Human-readable exported skip filename may be:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

Skip reason language defaults to Russian for personal review.

Skip artifacts must include:

- date analyzed;
- company;
- role;
- location/remote if known;
- core stack;
- final score;
- decision: `SKIP`;
- main skip reason;
- key mismatches;
- evidence from profile;
- risks if applying anyway;
- useful keywords to track later;
- future reconsideration condition.

## 4.8 Targeted CV Generation Requirements

### FR-035 — Prompt 2 Execution Conditions

Prompt 2 must run only when:

- Prompt 1 decision is `apply` and the user approves;
- or Prompt 1 decision is `maybe` and the user explicitly approves;
- or Prompt 1 decision is `skip` and the user explicitly overrides.

### FR-036 — Prompt 2 Output

Prompt 2 must generate evidence-based targeted CV content.

Expected artifacts:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

Output must include:

- metadata;
- target CV strategy;
- role-specific headline;
- top skills;
- summary;
- experience bullets;
- current independent work block when needed to close the post-EPAM timeline gap;
- selected projects if relevant;
- certifications selection;
- evidence table;
- overclaiming check;
- risks;
- open evidence questions;
- PDF readiness notes.

### FR-037 — CV Draft Review Gate

After Prompt 2, the system must pause for user review.

User options:

```text
Approve for Pre-PDF Check
Edit CV Draft
Regenerate with Notes
Change Output Format
Pause
Mark as Not Worth Applying
```

If the user marks the vacancy as not worth applying, the system must generate or update a skip reason artifact.

## 4.9 Anti-Overclaiming Guard Requirements

### FR-038 — Detect Unsupported Claims

The system must detect or flag unsupported claims in generated CV content.

Examples of risky claims:

- commercial AI/LLM production experience when only personal/project evidence exists;
- NestJS as commercial EPAM production stack;
- Docker as production platform ownership;
- Kubernetes as production experience;
- AWS/DynamoDB/MySQL without evidence;
- fluent English or professional German without support;
- DevOps ownership when evidence only supports collaboration;
- GraphQL platform ownership when evidence only supports working changes.

### FR-039 — Claim Safety Classification

Generated claims should be classified as:

```text
confirmed
cautious
needs_evidence
remove
```

### FR-040 — User Actions for Unsupported Claims

When unsupported claims are detected, user options must include:

```text
Remove Claim
Rephrase Safely
Mark needs evidence
Add Evidence
Override Manually
```

Manual overrides must be logged.

### FR-041 — Commercial vs Personal Experience Separation

The system must clearly separate:

- commercial production experience;
- working commercial experience;
- personal project experience;
- coursework/training exposure;
- basic exposure.

The current-work block is separate from commercial experience. It can close the May 2025–Present timeline gap and include small independent work, JobFlow CV Pipeline, upskilling and volunteering, but it must not make JobFlow, NestJS, Python/FastAPI or OpenAI API look like commercial production experience.

This separation must affect CV generation and warnings.

## 4.10 Pre-PDF Check Requirements

### FR-042 — Prompt 3 Pre-PDF Check

Prompt 3 must review generated CV content before export.

Expected artifacts:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
```

Output must include:

- critical issues;
- minor issues;
- overclaiming risks;
- unsupported technologies;
- summary length risk;
- page count risk;
- recommended edits;
- final readiness: `ready`, `ready_with_minor_edits`, or `not_ready`.

Prompt 3 recommendations are optional for MVP because Prompt 3 itself is P1 / MVP Optional. However, once `03_pre_pdf_check.md/json` exists for a workspace, those recommendations become mandatory input for the next export step. They must be treated as vacancy-specific, CV-specific guidance and must take precedence over generic export/prompt instructions for Step 4.

### FR-043 — Pre-Export Review Gate

After Prompt 3, the system must pause before export.

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

Default export action must be `Export PDF`.

## 4.11 Export Requirements

### FR-044 — PDF Default Export

The system must generate PDF by default when exporting a CV.

Default internal artifacts:

```text
04_cv_export.html
04_cv_export.pdf
```

HTML may be generated as an intermediate artifact for PDF rendering.

If `03_pre_pdf_check.md/json` exists, PDF export must read it before rendering and must apply or preserve its recommendations. If Prompt 3 was not run, export must proceed from the approved `02_targeted_cv_content.json` without requiring pre-PDF recommendations.

### FR-045 — Optional Export Formats

The system must optionally support:

```text
HTML
JSON
Markdown as downloadable draft
```

Later:

```text
DOCX
```

Format purposes:

| Format | Purpose | Required for MVP |
|---|---|---:|
| PDF | Main physical CV file for applications | Yes |
| HTML | Preview/layout/PDF rendering | Yes, if used by PDF renderer |
| JSON | Structured data / future template rendering | Optional |
| Markdown | Internal editable draft, optional download | Yes as internal draft |
| DOCX | Future employer/platform compatibility | No |

### FR-046 — Export Metadata

Every exported artifact must store:

- file path;
- artifact type;
- content hash;
- generation timestamp;
- prompt run ID;
- output format;
- latest version flag.

### FR-047 — Export Failure Handling

If PDF export fails, the system must preserve previous artifacts and show:

- export error;
- HTML preview if available;
- file path issue if relevant;
- template/CSS error if available.

User options:

```text
Retry PDF export
Export HTML only
Export JSON only
Edit template
Pause
```

## 4.12 Final Check Requirements

### FR-048 — Optional Final Check

Final Check is MVP optional.

When implemented, Prompt 5 must generate:

```text
05_final_check.md
05_final_check.json
```

Output must include:

- final quality score;
- page count;
- missing sections;
- overclaiming issues;
- broken formatting notes;
- final decision: `ready_to_send`, `needs_edit`, or `do_not_send`;
- final checklist.

Prompt 5 must not run for skipped vacancies unless the user explicitly asks for a skip-file review.

## 4.13 Cover Letter Requirements

### FR-049 — Optional Cover Letter Generation

Cover letter generation is optional and may be implemented after the first MVP.

When implemented, the system must generate:

```text
cover_letter.md
cover_letter.pdf
```

Optional:

```text
recruiter_message.md
application_email.md
```

Cover letter generation should usually run after a CV draft or final CV exists, unless the user explicitly requests a cover letter without CV generation.

## 4.14 Artifact Management Requirements

### FR-050 — Artifact Registry

The system must maintain an artifact registry in PostgreSQL.

Artifact metadata must include:

- artifact ID;
- workspace ID;
- artifact type;
- internal file name;
- file path;
- download filename if different;
- content hash;
- prompt run ID if generated;
- import source if imported;
- output format;
- latest version flag;
- created timestamp.

### FR-051 — Artifact Access

The user must be able to:

- preview artifact;
- download artifact;
- copy file path;
- mark latest version;
- regenerate where applicable;
- inspect generating prompt run.

### FR-052 — Artifact Versioning

The system should support artifact versions.

At minimum, it must not destroy previous generated artifacts when regenerating.

## 4.15 PostgreSQL Metadata Requirements

### FR-053 — Store Workspace Metadata in PostgreSQL

PostgreSQL must store workspace metadata, including:

- company name original;
- company slug;
- role title original;
- role slug;
- workspace slug;
- status;
- decision;
- review state;
- source URL;
- created date;
- updated date;
- application status.

### FR-054 — Store File Metadata in PostgreSQL

PostgreSQL must store file metadata, but physical files must be stored on filesystem.

### FR-055 — Store Prompt and AI Metadata in PostgreSQL

PostgreSQL must store:

- prompt templates;
- prompt versions;
- prompt runs;
- AI runs;
- source file usage;
- generated artifacts;
- user review decisions;
- manual overrides.

## 4.16 Filesystem Storage Requirements

### FR-056 — Filesystem as Physical Artifact Storage

The filesystem must store physical files.

Examples:

- `.txt` vacancy files;
- `.md` draft files;
- `.json` structured outputs;
- `.html` preview/export files;
- `.pdf` CV and cover letter files.

### FR-057 — Configurable Storage Root

The storage root must be configurable.

Example:

```text
storage/applications/
```

The system may later support external/local roots such as:

```text
D:\infa\Documents\jobs for analys\2026
```

### FR-058 — File Access Error Handling

If file access fails, the system must show:

- path;
- permission issue;
- missing directory;
- invalid file name;
- duplicate file warning.

User options:

```text
Choose another folder
Create missing directory
Rename file
Skip file
Cancel import
```

## 4.17 Application Tracking Requirements

### FR-059 — Track Application Status

The system should support application status tracking.

Recommended statuses:

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

### FR-060 — Mark as Applied

The user should be able to mark a workspace as applied.

Stored fields:

- applied date;
- applied via;
- files used;
- notes;
- status: `applied`.

## 5. Non-Functional Requirements

### NFR-001 — Backend-First Architecture

The project must be backend-first.

Frontend/dashboard can be added later, but backend domain model, API, storage and artifact generation must be designed first.

### NFR-002 — Reproducibility

Every generated output must be reproducible as much as possible.

The system must store:

- prompt version;
- input snapshot;
- source file versions/hashes;
- AI provider/model;
- generated artifacts.

### NFR-003 — Auditability

The system must preserve:

- decision history;
- manual overrides;
- prompt versions;
- artifact versions;
- source files used.

### NFR-004 — Human-in-the-Loop Safety

The system must pause at mandatory review gates:

- after Prompt 1;
- after Prompt 2;
- after Prompt 3;
- after final check when implemented.

### NFR-005 — No Data Loss on Regeneration

Regeneration must not delete previous artifacts by default.

### NFR-006 — Local-First Development

The application must run locally with Docker Compose and PostgreSQL.

### NFR-007 — File Safety

Generated filenames must be filesystem-safe.

The system must prevent invalid names, excessively long names and accidental overwrites.

### NFR-008 — Evidence Safety

The system must prioritize evidence-based claims over persuasive but unsupported wording.

Unsupported claims must be removed, rephrased safely or marked as `needs evidence`.

### NFR-009 — Performance for MVP

MVP does not need high throughput.

It should be optimized for correctness, traceability and artifact safety.

### NFR-010 — Later Async Reliability

After queues are added, long-running steps should support:

- retry;
- failed-job tracking;
- cancellation;
- resume;
- idempotency keys.

### NFR-011 — Testability

Core services must be testable.

At minimum, tests should cover:

- slug normalization;
- workspace creation;
- artifact naming;
- decision gate behavior;
- skip pipeline stopping;
- prompt template versioning;
- artifact registry behavior;
- anti-overclaiming guard helpers where deterministic.

### NFR-012 — Documentation

The project must include documentation for:

- product vision;
- requirements;
- user flows;
- domain model;
- architecture;
- AI pipeline;
- artifact storage;
- task backlog;
- Claude Code workflow.

## 6. MVP Requirements

## 6.1 MVP Required

The first usable MVP must include:

1. Manual workspace creation.
2. Separate company name input.
3. Separate role title input.
4. Multi-line vacancy text input.
5. Company slug generation.
6. Role slug generation.
7. Workspace preview before creation.
8. Canonical `00_vacancy_source.txt` creation.
9. PostgreSQL metadata storage.
10. Filesystem artifact storage.
11. Source knowledge file metadata.
12. Prompt template storage and versioning.
13. Prompt 1 vacancy analysis.
14. Human review gate after Prompt 1.
15. `apply / maybe / skip` decision handling.
16. Skip artifact generation for skipped vacancies.
17. Pipeline stop by default for skipped vacancies.
18. Prompt 2 targeted CV content generation after approval.
19. CV draft review gate.
20. Input quality checkpoint before Prompt 1.
21. PDF export by default.
22. HTML artifact if required for PDF rendering.
23. Markdown internal draft artifacts.
24. Internal JSON artifacts for prompt outputs.
25. Artifact registry.
26. Artifact download.
27. Basic anti-overclaiming guard rules.
28. Basic workspace status tracking.

## 6.2 MVP Optional

The following are useful but not mandatory for the first usable MVP:

- Prompt 3 pre-PDF check.
- Pre-export review gate.
- Prompt 5 final check.
- User-facing CV JSON export.
- Cover letter generation.
- Basic existing folder import with preview and manual metadata correction.
- Application tracking beyond basic statuses.
- Artifact version comparison.
- Frontend dashboard if Swagger/API workflow is enough initially.

## 6.3 MVP Done Criteria

The MVP is complete when:

- user can create a workspace from separate company, role and vacancy text inputs;
- system generates safe slugs and previews filenames;
- vacancy source is saved as `00_vacancy_source.txt`;
- workspace metadata is stored in PostgreSQL;
- user can run Prompt 1;
- system pauses after Prompt 1;
- user can approve `apply`, pause `maybe`, or accept `skip`;
- skip generates `01_skip_reason.md/json` and stops the pipeline;
- approved apply/maybe generates targeted CV content;
- generated CV content is saved as Markdown and JSON;
- user can export PDF by default;
- generated PDF is saved on filesystem;
- generated artifacts are registered in PostgreSQL;
- user can download the PDF;
- unsupported claims are at least partially flagged or avoided.

## 7. Later Requirements

## 7.1 Existing Folder Import — Robust Version

Later, the import feature should support robust detection across many existing company folders, including:

- multiple dates per company;
- duplicate roles;
- old naming conventions;
- skip files;
- cover letter files;
- partial workspaces;
- conflicting metadata.

## 7.2 Redis/BullMQ Async Processing

Later, the system should use:

```text
Redis
BullMQ
Worker process
Job status tracking
Retries
Failed job handling
Idempotency keys
Cancellation
Resume
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

Queues automate execution, not decision-making. Human review gates remain mandatory.

## 7.3 Queue Idempotency

Each queue job should use an idempotency key based on:

```text
workspace_id
step
prompt_template_version
input_hash
source_files_hash
output_format
```

## 7.4 Next.js Dashboard

Later, a Next.js dashboard should provide convenient UI for:

- workspace list;
- workspace details;
- analysis review;
- CV draft review;
- artifact preview/download;
- prompt template management;
- source knowledge management;
- application tracking.

## 7.5 Cover Letter and Recruiter Message

Later, the system should generate:

- cover letter Markdown/PDF;
- recruiter message Markdown;
- application email Markdown.

## 7.6 Final PDF Check

Later or MVP optional, the system should support final check after PDF generation.

Possible strategies:

- generated content validation;
- PDF text extraction;
- screenshot/visual validation later.

## 7.7 DOCX Export

DOCX export can be added later if needed for application platforms or recruiters.

## 7.8 Rejection Analysis

Later, the system should support rejection analysis:

- paste rejection text;
- generate rejection analysis;
- save rejection artifact;
- extract learning points;
- update future CV strategy notes.

## 7.9 Version Comparison

Later, the system should support comparison of:

- analysis versions;
- CV draft versions;
- PDF versions;
- prompt versions;
- model outputs.

## 8. Out of Scope

The following are out of scope for early MVP:

- multi-user authentication;
- public SaaS deployment;
- complex role-based access control;
- automatic job scraping;
- automatic application submission;
- full ATS replacement;
- production-grade cloud deployment;
- advanced vector search / RAG unless clearly justified later;
- automatic sending of CVs or cover letters without human review;
- pretending personal AI/MCP/FastAPI experience is commercial production experience;
- replacing human review of CV content;
- supporting every possible document template from day one.

## 9. Requirement Priorities

### P0 — Must Have for MVP

- ApplicationWorkspace creation.
- Separate company / role / vacancy text input.
- Slug normalization.
- Canonical vacancy source artifact.
- PostgreSQL metadata.
- Filesystem artifact storage.
- Prompt template versioning.
- Prompt 1 analysis.
- Input quality checkpoint before Prompt 1.
- Human decision gate.
- Skip handling.
- Prompt 2 targeted CV content after approval.
- PDF export by default.
- Artifact registry and download.
- Basic anti-overclaiming guard.

### P1 — Should Have Soon

- Prompt 3 pre-PDF check.
- Pre-export review gate.
- Knowledge source selection per prompt.
- Basic existing folder import with preview and manual metadata correction.
- User-facing CV JSON export.
- Final check.

### P2 — Later

- Redis/BullMQ queues.
- Next.js dashboard.
- Cover letter generation.
- DOCX export.
- Robust existing folder import.
- Rejection analysis.
- Version comparison.
- Advanced artifact diffing.

## 10. Open Questions

1. Should the first MVP use Swagger/API only, or should a minimal frontend dashboard be included immediately?
2. Should existing folder import be part of MVP required or MVP optional?
3. Should JSON output be required from day one for Prompt 1 and Prompt 2, or can Markdown come first?
4. Should source knowledge files be copied into project storage or referenced by external path?
5. Should generated artifact versions be physically stored in versioned subfolders or managed by filename suffixes?
6. Should user overrides require a note?
7. Should final check use generated content only in MVP or attempt PDF-level validation?
8. Should cover letter generation be Phase 2 or part of MVP if a job requires it?
9. Should the role slug continue removing numbers, or should numbers be allowed later for roles like `C#`, `.NET 8`, `Node 20`?
10. Should company slugs preserve punctuation-like brand identity, or only preserve letters/numbers/underscores?

## 11. Final Requirement Summary

JobFlow CV Pipeline must become a reproducible, evidence-based, backend-first CV production system.

The key system responsibilities are:

```text
Import/save vacancy data
Create ApplicationWorkspace
Use source knowledge base
Run versioned prompts
Store PromptRuns and AiRuns
Pause at human review gates
Generate skip artifacts for skipped vacancies
Generate targeted CV content for approved vacancies
Protect against unsupported claims
Export PDF by default
Store physical files on filesystem
Store metadata in PostgreSQL
Keep artifacts auditable and downloadable
```

The key product rule:

```text
Automate repetitive work, but preserve human decision points where wrong automation could waste time or create unsafe CV claims.
```
