# JobFlow CV Pipeline — Artifact Storage

## 1. Purpose

This document defines how **JobFlow CV Pipeline** stores physical files, generated artifacts, imported legacy files and PostgreSQL metadata.

The application is artifact-first. Every important pipeline step must produce a saved artifact or update metadata that makes the workflow reproducible.

Core storage rule:

```text
PostgreSQL stores metadata, relationships, statuses, hashes and audit information.
Filesystem storage stores physical content and generated files.
```

The two layers must always be connected through `GeneratedArtifact` records.

## 2. Alignment With Existing Project Decisions

This document follows the current project rules:

- Manual workspace creation is the first MVP path.
- Existing folder import is P1 optional; robust import is later.
- `00_vacancy_source.txt` is the canonical internal vacancy source file.
- New workspace folders and human-readable export names use underscore-based naming.
- Legacy/manual names are supported during import only.
- Internal artifact names are short, stable and step-based.
- Human-readable download/export names may include `company_slug` and `role_slug`.
- `company_slug` may preserve meaningful numbers.
- `role_slug` allows English letters, Unicode Cyrillic letters and underscores.
- Prompt 1 always ends with a human review gate.
- `apply` and `maybe` continue only after explicit user approval.
- `skip` creates canonical skip artifacts and stops the pipeline by default.
- PDF is the default physical CV export.
- HTML and JSON are optional user-facing export formats.
- Markdown is primarily an internal editable artifact and may also be downloadable.
- Internal JSON artifacts are required for reproducibility.
- AI usage and token data must be stored when provider data is available.

## 3. Storage Responsibilities

### 3.1 Filesystem Storage

Filesystem storage is responsible for physical content:

- original vacancy text;
- vacancy analysis Markdown / JSON;
- skip reason Markdown / JSON;
- targeted CV content Markdown / JSON;
- optional pre-PDF check Markdown / JSON;
- generated HTML preview;
- generated PDF CV;
- optional generated CV JSON export;
- optional final check Markdown / JSON;
- optional cover letter Markdown / PDF;
- optional recruiter message / application email;
- imported legacy artifacts;
- optional screenshots or PDF previews later.

Filesystem files must be usable outside the application.

### 3.2 PostgreSQL Metadata

PostgreSQL is responsible for structured state:

- workspace identity;
- company and role metadata;
- original and normalized names;
- storage root and workspace path;
- pipeline status;
- decision status;
- prompt template version;
- prompt run input/output metadata;
- AI provider/model/token usage/cost estimate;
- generated artifact metadata;
- content hashes;
- latest version markers;
- legacy import metadata;
- user review status;
- evidence guard results;
- manual overrides;
- timestamps and audit history.

PostgreSQL should not store large generated documents as primary content. It may store short summaries, structured JSON snapshots or parsed metadata when useful, but the physical artifact should live on the filesystem.

## 4. Storage Root

The storage root must be configurable.

Recommended local development default:

```text
storage/applications/
```

Example full path:

```text
storage/applications/2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
```

The application should not hardcode the Windows legacy folder as the only storage root. Existing folders such as:

```text
D:\infa\Documents\jobs for analys\2026
```

are import sources, not necessarily the internal storage root.

## 5. Workspace Folder Structure

### 5.1 New Workspace Folder Format

Newly generated workspace folders must use underscore-based naming:

```text
<YYYY_MM_DD>_<company_slug>_<role_slug>/
```

Example:

```text
storage/applications/
  2026_06_23_Action1_Backend_Developer_Node_js_JavaScript_TypeScript/
```

Skipped workspace example:

```text
storage/applications/
  2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
```

### 5.2 Canonical Workspace Contents

A full workspace may contain:

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
submitted_files.json
application_note.md
```

Not every workspace will contain every file.

Examples:

- a `source_saved` workspace may contain only `00_vacancy_source.txt`;
- a skipped workspace may contain only vacancy source, analysis and skip reason artifacts;
- a first usable MVP workspace may contain vacancy source, analysis, targeted CV content and PDF export;
- a later completed application workspace may also contain final check, cover letter and submitted files metadata.

## 6. Canonical Internal Artifact Names

Canonical internal artifact names are stable, short and step-based.

They are optimized for backend logic, tests, reproducibility and predictable artifact lookup.

| Pipeline step | Artifact type | Canonical internal file |
|---|---|---|
| Input | Original vacancy source | `00_vacancy_source.txt` |
| Prompt 1 | Vacancy analysis Markdown | `01_vacancy_analysis.md` |
| Prompt 1 | Vacancy analysis JSON | `01_vacancy_analysis.json` |
| Prompt 1 Skip | Skip reason Markdown | `01_skip_reason.md` |
| Prompt 1 Skip | Skip reason JSON | `01_skip_reason.json` |
| Prompt 2 | Targeted CV content Markdown | `02_targeted_cv_content.md` |
| Prompt 2 | Targeted CV content JSON | `02_targeted_cv_content.json` |
| Prompt 3 optional | Pre-PDF check Markdown | `03_pre_pdf_check.md` |
| Prompt 3 optional | Pre-PDF check JSON | `03_pre_pdf_check.json` |
| Step 4 | CV HTML preview/export | `04_cv_export.html` |
| Step 4 | CV PDF export | `04_cv_export.pdf` |
| Step 4 optional | CV JSON export | `04_cv_export.json` |
| Step 4 optional | CV Markdown export | `04_cv_export.md` |
| Prompt 5 optional | Final check Markdown | `05_final_check.md` |
| Prompt 5 optional | Final check JSON | `05_final_check.json` |
| Cover letter Phase 2 | Cover letter Markdown | `cover_letter.md` |
| Cover letter Phase 2 | Cover letter PDF | `cover_letter.pdf` |
| Recruiter message Phase 2 | Recruiter message | `recruiter_message.md` |
| Application tracking later | Application email | `application_email.md` |
| Application tracking later | Submitted files metadata | `submitted_files.json` |

When Prompt 3 artifacts exist, `04_cv_export.*` artifacts must record them as source/context artifacts. If Prompt 3 artifacts do not exist, no pre-PDF source link is required.

## 7. Human-Readable Download and Export Names

Internal artifact names and downloaded file names are different concerns.

Internal names should stay stable. Download/export names may include company and role context.

### 7.1 CV Download Name

Recommended pattern:

```text
Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
```

Example:

```text
Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf
```

### 7.2 Cover Letter Download Name

Recommended pattern:

```text
Denys_Strakhov_<company_slug>_<role_slug>_Cover_Letter.pdf
```

Example:

```text
Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf
```

### 7.3 Skip Reason Download Name

Recommended pattern:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

Example:

```text
SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

Skip reason language defaults to Russian for personal review.

### 7.4 Vacancy Source Download Name

Internal canonical file:

```text
00_vacancy_source.txt
```

Optional human-readable export/download name:

```text
<company_slug>_<role_slug>.txt
```

Example:

```text
Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
```

## 8. Slug Normalization Rules

### 8.1 Company Slug

Company names may contain meaningful numbers. The company slug may preserve numbers.

Allowed characters:

```text
English letters
Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Numbers
Underscore
```

Recommended normalization:

1. Preserve `company_name_original` separately.
2. Trim leading and trailing whitespace.
3. Replace whitespace and separators with `_`.
4. Remove unsupported characters.
5. Collapse repeated underscores.
6. Remove leading and trailing underscores.
7. Preserve meaningful numbers.
8. Preserve original case unless the implementation later chooses a consistent lower-case policy.

Examples:

| Original company name | Company slug |
|---|---|
| `Action1` | `Action1` |
| `CHECK24 Vergleichsportal` | `CHECK24_Vergleichsportal` |
| `Omega CRM, A Merkle Company` | `Omega_CRM_A_Merkle_Company` |
| `IT-компанія ДП ІНФОТЕХ` | `IT_компанія_ДП_ІНФОТЕХ` |

Implementation note:

```text
Use Unicode script matching for Cyrillic letters, for example \p{Script=Cyrillic}, instead of only [А-Яа-яЁё].
```

### 8.2 Role Slug

The role slug is stricter than company slug.

Allowed characters:

```text
English letters
Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Underscore
```

Current rule: numbers are removed or converted through separator handling for role slugs. The original role title is always preserved separately, so no user-facing information is lost.

Recommended normalization:

1. Preserve `role_title_original` separately.
2. Trim leading and trailing whitespace.
3. Replace every whitespace character with `_`.
4. Replace every non-letter separator or special character with `_`.
5. Keep only English letters, Unicode Cyrillic letters and underscores.
6. Collapse repeated underscores.
7. Remove leading and trailing underscores.
8. Preserve original case unless the implementation later chooses a consistent lower-case policy.

Examples:

| Original role title | Role slug |
|---|---|
| `Backend Developer Node.js JavaScript TypeScript` | `Backend_Developer_Node_js_JavaScript_TypeScript` |
| `Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS` | `Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS` |
| `Senior Backend Engineer (Node.js, AWS, DynamoDB)` | `Senior_Backend_Engineer_Node_js_AWS_DynamoDB` |
| `Middle/Senior Full Stack Developer — Logistics Domain` | `Middle_Senior_Full_Stack_Developer_Logistics_Domain` |
| `Разработчик Node.js / Backend Developer` | `Разработчик_Node_js_Backend_Developer` |
| `C#/.NET Backend Engineer` | `C_NET_Backend_Engineer` |

Repeated underscores are collapsed for readability. This does not cause information loss because original metadata is stored separately.

## 9. Generated Artifact Types

Recommended `GeneratedArtifact.type` values:

```text
vacancy_source
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
submitted_files_json
application_note_md
imported_legacy_file
error_log
```

These values may evolve, but the first implementation should avoid overly generic types such as `file` only. The artifact type must tell the system what the file represents.

## 10. PostgreSQL Metadata Model for Artifacts

### 10.1 GeneratedArtifact Fields

Recommended fields:

```text
id
workspace_id
prompt_run_id optional
cv_draft_id optional
cover_letter_draft_id optional
artifact_type
canonical_file_name
relative_path
absolute_path optional
storage_root
mime_type
file_extension
content_hash
file_size_bytes optional
output_format optional
is_latest
version
created_at
updated_at
created_by
source_kind
legacy_original_file_name optional
legacy_original_path optional
download_file_name optional
status
error_message optional
metadata_json optional
```

### 10.2 Field Meaning

| Field | Meaning |
|---|---|
| `workspace_id` | Owner workspace. Required. |
| `prompt_run_id` | Prompt run that produced the artifact, if applicable. |
| `artifact_type` | Semantic file type. |
| `canonical_file_name` | Stable internal file name, e.g. `04_cv_export.pdf`. |
| `relative_path` | Path relative to storage root. |
| `absolute_path` | Optional local absolute path for local app use. |
| `storage_root` | Root configured at generation/import time. |
| `content_hash` | Hash for deduplication and reproducibility. |
| `is_latest` | Marks latest artifact of this type for the workspace. |
| `version` | Artifact version number. |
| `source_kind` | `generated`, `uploaded`, `imported_legacy`, `manual_edit`, `system`. |
| `download_file_name` | Human-readable name used when downloading/exporting. |
| `metadata_json` | Extra step-specific metadata. |

### 10.3 Artifact Status Values

Recommended artifact statuses:

```text
created
ready
superseded
failed
missing_on_disk
imported
archived
```

### 10.4 Source Kind Values

Recommended source kinds:

```text
generated
uploaded
pasted
imported_legacy
manual_edit
system
```

## 11. Workspace Metadata Relevant to Storage

`ApplicationWorkspace` should store enough storage metadata to locate and manage files.

Recommended fields:

```text
id
company_id
job_vacancy_id
workspace_slug
workspace_folder_name
storage_root
relative_folder_path
absolute_folder_path optional
company_name_original
company_slug
role_title_original
role_slug
source_url optional
source_language optional
status
decision
created_at
updated_at
import_source_path optional
import_status optional
```

The workspace must preserve original company name, original role title and original vacancy text. Slugs are for safe paths and file names only.

## 12. PromptRun, AiRun and Storage Links

Every AI-generated artifact should be traceable to:

```text
PromptTemplate version
PromptRun
AiRun
source files used
input hash
output hash
GeneratedArtifact records
AI usage metadata
```

### 12.1 PromptRun Storage Fields

Recommended storage-related fields:

```text
id
workspace_id
prompt_template_id
prompt_template_version
pipeline_step
input_hash
source_files_hash
output_hash
status
created_artifact_ids
created_at
completed_at
```

### 12.2 AiRun Usage Fields

Recommended fields:

```text
id
prompt_run_id
provider
model
status
input_tokens
output_tokens
total_tokens
cached_input_tokens optional
reasoning_tokens optional
usage_raw_json optional
cost_estimate optional
cost_currency optional
pricing_config_version optional
started_at
completed_at
error_message optional
```

Token and cost fields should be stored if provider data is available. Cost estimate must not be treated as business-critical truth because pricing can change.

## 13. Knowledge Source Storage

Knowledge sources are the evidence layer of the system.

They may be stored by reference to external files or copied into controlled project storage.

### 13.1 Recommended MVP Approach

For MVP, store references and content hashes:

```text
KnowledgeSource
  -> original_file_path
  -> file_name
  -> source_type
  -> content_hash
  -> active/inactive
  -> imported_at
```

This is simpler and avoids duplicating large files too early.

### 13.2 Later Approach

Later, the system may copy active knowledge sources into internal storage:

```text
storage/knowledge-sources/
  Master_CV_RU_v0_3_final.md
  Master_Profile_Summary_RU.md
  Tech_Stack_Matrix_RU_v2_0.md
  Career_Case_Deep_Dives_RU_v0_3_resolved.md
  CV_Format_Rules_EN.md
```

### 13.3 Knowledge Source Types

Recommended source types:

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

## 14. Import Rules for Existing Folders

Existing folder import is P1 optional. Robust import is later.

The import flow should not silently mutate files. It should scan, detect, preview and ask the user to confirm or correct metadata.

### 14.1 Legacy Root Example

Existing manual folder root:

```text
D:\infa\Documents\jobs for analys\2026
```

Typical structure:

```text
Company/
  YYYY.MM.DD/
    *.txt
    03_targeted_CV_content_*.md
    *_CV.pdf
    *_Cover_Letter.pdf
    SKIP_*.md
```

### 14.2 Example: Action1

Legacy folder:

```text
Action1/
  2026.06.23/
    Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
    03_targeted_CV_content_Action1_Backend_Developer.md
    Denys_Strakhov_Action1_Backend_Developer_CV.pdf
```

Detected state:

```text
cv_pdf_generated
```

Detected artifacts:

```text
vacancy_source
legacy_targeted_cv_content_md
legacy_cv_pdf
```

Suggested metadata:

```text
company_name_original = Action1
company_slug = Action1
role_title_original = Backend Developer Node.js JavaScript TypeScript
role_slug = Backend_Developer_Node_js_JavaScript_TypeScript
legacy_date = 2026-06-23
```

Important note:

```text
03_targeted_CV_content_* is a legacy manual workflow name.
New generated Prompt 2 output should use 02_targeted_cv_content.md/json.
```

### 14.3 Example: Amach

Legacy folder:

```text
Amach/
  2026.06.23/
    Amach_Full_Stack_Developer.txt
    03_targeted_CV_content_Amach_Full_Stack_Developer.md
    Denys_Strakhov_Amach_Full_Stack_Developer_CV.pdf
    Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf
```

Detected state:

```text
cover_letter_generated
```

Detected artifacts:

```text
vacancy_source
legacy_targeted_cv_content_md
legacy_cv_pdf
legacy_cover_letter_pdf
```

Suggested metadata:

```text
company_name_original = Amach
company_slug = Amach
role_title_original = Full Stack Developer
role_slug = Full_Stack_Developer
legacy_date = 2026-06-23
```

### 14.4 Example: AppsFlyer

Legacy folder:

```text
AppsFlyer/
  2026.06.23/
    AppsFlyer_Backend_Engineer.txt
```

Detected state:

```text
source_saved
```

Detected artifacts:

```text
vacancy_source
```

Suggested metadata:

```text
company_name_original = AppsFlyer
company_slug = AppsFlyer
role_title_original = Backend Engineer
role_slug = Backend_Engineer
legacy_date = 2026-06-23
```

### 14.5 Example: Broadvoice Skip

Legacy folder example:

```text
Broadvoice/
  2026.06.24/
    Broadvoice_Software_Engineer_ReactJS_TypeScript_NodeJS.txt
    SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

Detected state:

```text
skipped
```

Detected artifacts:

```text
vacancy_source
legacy_skip_reason_md
```

Suggested metadata:

```text
company_name_original = Broadvoice
company_slug = Broadvoice
role_title_original = Software Engineer ReactJS TypeScript NodeJS or Full Stack Engineer AI CCaaS
role_slug = Software_Engineer_ReactJS_TypeScript_NodeJS
legacy_date = 2026-06-24
```

Because the vacancy file role and skip file role may not fully match, the import preview must ask the user to confirm the final role title.

## 15. Import Detection Rules

### 15.1 Company Detection

The parent folder name is the primary company candidate.

Example:

```text
Action1/2026.06.23/...
```

Detected company:

```text
Action1
```

If a file name starts with a different company-like prefix, the system should show a warning and ask for confirmation.

### 15.2 Date Detection

Date folder format:

```text
YYYY.MM.DD
```

Example:

```text
2026.06.23 -> 2026-06-23
```

If date cannot be parsed, use import timestamp and mark `legacy_date_confidence = low`.

### 15.3 Vacancy Source Detection

Candidate vacancy files:

```text
*.txt
```

Prefer `.txt` files that:

- include the company name;
- include role-like words;
- are not prompt files;
- are not generated notes;
- are not rejection files.

If multiple `.txt` files exist, ask the user to choose.

### 15.4 Targeted CV Content Detection

Legacy targeted CV Markdown pattern:

```text
03_targeted_CV_content_*.md
```

Map to artifact type:

```text
legacy_targeted_cv_content_md
```

Do not rename during import unless the user chooses to copy into canonical storage.

### 15.5 CV PDF Detection

Patterns:

```text
*_CV.pdf
Denys_Strakhov_*_CV.pdf
```

Map to artifact type:

```text
legacy_cv_pdf
```

### 15.6 Cover Letter Detection

Patterns:

```text
*_Cover_Letter.pdf
cover_letter.pdf
```

Map to artifact type:

```text
legacy_cover_letter_pdf
```

### 15.7 Skip Reason Detection

Patterns:

```text
SKIP_*.md
SKIP_*.txt
```

Map to artifact type:

```text
legacy_skip_reason_md
```

If a skip file exists, workspace status should be suggested as:

```text
skipped
```

### 15.8 Status Detection Priority

If multiple artifacts exist, detect status using this priority:

```text
skip reason exists -> skipped
cover letter PDF exists -> cover_letter_generated
CV PDF exists -> cv_pdf_generated
targeted CV content exists -> cv_draft_ready
vacancy source exists -> source_saved
otherwise -> import_needs_review
```

Skip reason has highest priority because a skipped workspace should not continue through CV generation unless manually overridden.

## 16. Import Preview

Before importing, the user must see a preview.

Preview fields:

```text
company_name_original
company_slug
role_title_original
role_slug
legacy_date
source files detected
artifacts detected
suggested workspace status
confidence level
warnings
```

User options:

```text
Import All
Select Workspaces
Edit Company Name
Edit Role Title
Regenerate Slug
Choose Vacancy Source File
Skip This Workspace
Cancel Import
```

Import must not silently overwrite existing workspaces.

## 17. Import Modes

### 17.1 Reference-Only Import

The system stores original file paths and metadata, but does not copy files into internal storage.

Pros:

- fast;
- minimal disk duplication;
- good for first import prototype.

Cons:

- legacy files may move or be deleted;
- harder to guarantee reproducibility.

### 17.2 Copy-Into-Storage Import

The system copies legacy files into the new workspace folder.

Example target:

```text
storage/applications/2026_06_23_Action1_Backend_Developer_Node_js_JavaScript_TypeScript/imported/
  Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
  03_targeted_CV_content_Action1_Backend_Developer.md
  Denys_Strakhov_Action1_Backend_Developer_CV.pdf
```

It may also create canonical copies:

```text
00_vacancy_source.txt
```

Recommended P1 behavior:

```text
Copy imported vacancy source to 00_vacancy_source.txt.
Keep other legacy files under imported/ and register them as GeneratedArtifact records.
```

## 18. New Workspace Creation Storage Flow

Manual workspace creation is the primary MVP path.

Input fields:

```text
company_name_original
role_title_original
vacancy_text
source_url optional
date optional, default current date
```

System generates:

```text
company_slug
role_slug
workspace_slug
workspace_folder_path
```

Then creates:

```text
storage/applications/<workspace_slug>/
  00_vacancy_source.txt
```

Then stores PostgreSQL metadata:

```text
ApplicationWorkspace
Company
JobVacancy
GeneratedArtifact(vacancy_source)
```

The user must see an input quality checkpoint before Prompt 1 runs.

## 19. AI Pipeline Storage Flow

### 19.1 Prompt 1 — Vacancy Analysis

Creates:

```text
01_vacancy_analysis.md
01_vacancy_analysis.json
```

Stores:

```text
PromptRun
AiRun
GeneratedArtifact records
AI usage fields if available
```

Then pauses at human review gate.

### 19.2 Skip Path

If Prompt 1 decision is `skip`, create:

```text
01_skip_reason.md
01_skip_reason.json
```

Set workspace:

```text
status = skipped
decision = skip
```

Do not create:

```text
02_targeted_cv_content.md
04_cv_export.pdf
cover_letter.pdf
```

unless the user explicitly overrides.

### 19.3 Apply / Maybe Path

After explicit user approval, Prompt 2 creates:

```text
02_targeted_cv_content.md
02_targeted_cv_content.json
```

Then the first MVP may export PDF directly after CV draft review.

### 19.4 PDF Export

Default export creates:

```text
04_cv_export.html
04_cv_export.pdf
```

Before export, the system checks for:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
```

If these artifacts exist, their recommendations must be read and treated as source/context for the generated `04_cv_export.*` artifacts. If they do not exist, export proceeds without them.

Optional user-facing exports:

```text
04_cv_export.json
04_cv_export.md
```

Workspace status becomes:

```text
cv_pdf_generated
```

### 19.5 Optional Prompt 3 and Prompt 5

Prompt 3 is P1 / MVP Optional:

```text
03_pre_pdf_check.md
03_pre_pdf_check.json
```

Prompt 5 is optional:

```text
05_final_check.md
05_final_check.json
```

### 19.6 Phase 2 Cover Letter

Cover letter creates:

```text
cover_letter.md
cover_letter.pdf
```

Workspace status may become:

```text
cover_letter_generated
```

## 20. Versioning Rules

Generated artifacts may be regenerated.

The system must not silently overwrite the only copy of an artifact.

Recommended MVP approach:

- keep canonical file as latest version;
- mark previous artifacts as `superseded` in PostgreSQL;
- optionally move previous files to a `versions/` subfolder.

Recommended later approach:

```text
versions/
  02_targeted_cv_content.v1.md
  02_targeted_cv_content.v2.md
  04_cv_export.v1.pdf
  04_cv_export.v2.pdf
```

Metadata must track:

```text
version
is_latest
superseded_by_artifact_id
created_at
prompt_run_id
input_hash
source_files_hash
```

## 21. Hashing and Reproducibility

Every important file should have a content hash.

Recommended hash fields:

```text
vacancy_text_hash
source_files_hash
prompt_input_hash
prompt_output_hash
artifact_content_hash
```

Purpose:

- duplicate detection;
- idempotency;
- reproducibility;
- import safety;
- change detection;
- avoiding unnecessary AI re-runs.

Hash algorithm:

```text
SHA-256
```

## 22. Duplicate Handling

Possible duplicates:

- same company + role + date;
- same vacancy text hash;
- same workspace slug;
- same imported legacy file path;
- same generated download name.

Recommended behavior:

```text
If workspace folder already exists:
  offer to open existing workspace
  or create new version
  or edit metadata/slug
```

For imported folders:

```text
If legacy path already imported:
  skip duplicate by default
  allow re-import if user confirms
```

## 23. Missing File Handling

If PostgreSQL metadata points to a missing file:

```text
GeneratedArtifact.status = missing_on_disk
```

User options:

```text
Locate file
Restore from version
Regenerate artifact
Mark archived
Remove metadata link
```

The system must not crash when artifacts are missing.

## 24. File Access Failure Handling

If file read/write fails, show:

```text
path
operation
error message
permission issue if detected
suggested recovery action
```

User options:

```text
Choose another folder
Create missing directory
Rename file
Retry
Skip file
Cancel import
```

Failures should be saved as an `error_log` artifact or structured error metadata when useful.

## 25. Security and Safety Notes

The project is a local personal tool, not a public SaaS MVP.

Still, storage should avoid unsafe behavior:

- never write outside configured storage root unless importing with explicit user-selected source path;
- validate generated paths;
- prevent path traversal through user-provided company or role names;
- preserve original vacancy text exactly, but never use it directly as a filename;
- never include secrets or API keys in generated artifacts;
- avoid storing full AI provider raw responses if they contain sensitive data unless needed for debugging;
- store token usage and safe response metadata separately from large raw payloads.

## 26. MVP Storage Requirements

MVP storage is complete when:

- manual workspace creation creates a folder under `storage/applications/`;
- the user enters company, role and multi-line vacancy text separately;
- the original vacancy text is saved as `00_vacancy_source.txt`;
- original and normalized metadata are stored in PostgreSQL;
- Prompt 1 creates `01_vacancy_analysis.md/json`;
- skip decision creates `01_skip_reason.md/json` and stops the pipeline;
- approved apply/maybe creates `02_targeted_cv_content.md/json`;
- PDF export creates `04_cv_export.html` and `04_cv_export.pdf` by default;
- every created file has a `GeneratedArtifact` record;
- every artifact has a content hash;
- download names can be generated from `company_slug` and `role_slug`;
- missing file errors are handled gracefully.

## 27. P1 Storage Requirements

P1 storage should add:

- basic existing folder import with preview and manual metadata correction;
- import support for Action1, Amach, AppsFlyer and Broadvoice-like folders;
- copied or referenced legacy artifact metadata;
- Prompt 3 artifacts;
- Prompt 5 artifacts;
- better artifact versioning;
- optional JSON/Markdown user-facing exports;
- AI usage summaries at workspace level.

## 28. Later Storage Requirements

Later storage may add:

- robust bulk import;
- duplicate detection across all historical workspaces;
- version comparison;
- PDF visual preview screenshots;
- DOCX export;
- Next.js dashboard artifact browser;
- Redis/BullMQ job logs linked to artifacts;
- monthly AI usage/cost reports;
- local MCP-style file tooling;
- cloud backup if needed.

## 29. Recommended Folder Examples

### 29.1 First Usable MVP Apply Workspace

```text
storage/applications/
  2026_06_23_Action1_Backend_Developer_Node_js_JavaScript_TypeScript/
    00_vacancy_source.txt
    01_vacancy_analysis.md
    01_vacancy_analysis.json
    02_targeted_cv_content.md
    02_targeted_cv_content.json
    04_cv_export.html
    04_cv_export.pdf
```

### 29.2 Skipped Workspace

```text
storage/applications/
  2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
    00_vacancy_source.txt
    01_vacancy_analysis.md
    01_vacancy_analysis.json
    01_skip_reason.md
    01_skip_reason.json
```

### 29.3 Phase 2 Full Workspace

```text
storage/applications/
  2026_06_23_Amach_Full_Stack_Developer/
    00_vacancy_source.txt
    01_vacancy_analysis.md
    01_vacancy_analysis.json
    02_targeted_cv_content.md
    02_targeted_cv_content.json
    03_pre_pdf_check.md
    03_pre_pdf_check.json
    04_cv_export.html
    04_cv_export.pdf
    05_final_check.md
    05_final_check.json
    cover_letter.md
    cover_letter.pdf
    submitted_files.json
```

### 29.4 Imported Legacy Workspace With Imported Folder

```text
storage/applications/
  2026_06_23_Action1_Backend_Developer_Node_js_JavaScript_TypeScript/
    00_vacancy_source.txt
    imported/
      Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
      03_targeted_CV_content_Action1_Backend_Developer.md
      Denys_Strakhov_Action1_Backend_Developer_CV.pdf
```

## 30. Implementation Notes for Prisma

Recommended indexes:

```text
ApplicationWorkspace.workspace_slug unique
ApplicationWorkspace.company_slug
ApplicationWorkspace.role_slug
ApplicationWorkspace.status
ApplicationWorkspace.decision
GeneratedArtifact.workspace_id
GeneratedArtifact.artifact_type
GeneratedArtifact.content_hash
GeneratedArtifact.is_latest
GeneratedArtifact.relative_path
PromptRun.workspace_id
PromptRun.pipeline_step
AiRun.prompt_run_id
KnowledgeSource.content_hash
```

Recommended uniqueness constraints:

```text
workspace_slug unique
(workspace_id, artifact_type, version) unique
(workspace_id, artifact_type, is_latest) partial unique where is_latest = true, if supported
legacy_original_path unique nullable for imported files
```

If partial unique indexes are inconvenient in Prisma, enforce latest-artifact logic in application service code.

## 31. Summary

Artifact storage must make the pipeline reproducible and practical.

The most important rule:

```text
Use stable canonical internal names for backend reliability, and generate human-readable download names for real job applications.
```

The first usable storage milestone is:

```text
manual workspace -> 00_vacancy_source.txt -> 01_vacancy_analysis.md/json -> 02_targeted_cv_content.md/json -> 04_cv_export.pdf
```

The first useful skip milestone is:

```text
manual workspace -> 00_vacancy_source.txt -> 01_vacancy_analysis.md/json -> 01_skip_reason.md/json
```

Existing folders like Action1, Amach and AppsFlyer should be supported through import preview and metadata correction, but they should not define the canonical storage design for new workspaces.
