# JobFlow CV Pipeline — User Flows

## 1. Purpose

This document describes the main user flows for **JobFlow CV Pipeline**.

The goal is to define the most convenient workflow for the first usable MVP and the improved workflow after adding queues/background processing.

The product must support a real job-search process:

```text
vacancy source -> vacancy analysis -> Apply / Maybe / Skip decision -> targeted CV content -> review -> physical CV PDF -> optional cover letter -> application tracking
```

The project must always optimize for two outcomes:

1. Faster and safer job applications.
2. Honest, evidence-based CV generation without unsupported claims.

## 2. Core UX Principle

The system should not behave like a fully automatic black-box CV generator.

The correct UX is **AI-assisted, human-reviewed, artifact-first**.

That means:

- AI can analyze, draft, check and export.
- The user must be able to pause, review, edit, approve, skip or restart.
- Every important step must save an artifact.
- Every artifact must be linked to a workspace, prompt version and source files.
- Physical CV output should be generated as **PDF by default**.
- HTML and JSON export should be optional formats.
- If Prompt 1 decides `skip`, the system must generate a skip-reason file and stop the CV generation pipeline unless the user manually overrides the decision.

## 3. Main Domain Object: Application Workspace

Every job opportunity is represented as an **Application Workspace**.

A workspace contains:

- company;
- role title;
- vacancy source;
- date;
- source URL if available;
- decision: `apply`, `maybe`, `skip`;
- current pipeline status;
- prompt runs;
- source files used;
- generated artifacts;
- user review decisions;
- notes;
- application status.

Example workspace states:

| Workspace | State | Existing artifacts |
|---|---|---|
| Action1 | CV PDF generated | vacancy txt, targeted CV content md, CV PDF |
| Amach | CV PDF + cover letter generated | vacancy txt, targeted CV content md, CV PDF, cover letter PDF |
| AppsFlyer | Vacancy saved only | vacancy txt |
| Broadvoice | Skipped after analysis | vacancy txt, skip reason md/json |

## 4. Key Statuses

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

Recommended decision values:

```text
apply
maybe
skip
manual_override_apply
manual_override_maybe
manual_override_skip
```

Recommended user review states:

```text
pending_review
approved
edited
rejected
overridden
```

## 5. MVP Stage 1 — Without Queues

### 5.1 Goal of Stage 1

Stage 1 should be the fastest path to a useful tool.

It does not need Redis/BullMQ yet.

The first valuable MVP is:

```text
Create workspace manually -> run Prompt 1 -> review decision -> generate targeted CV -> export PDF
```

Backend operations can initially run synchronously or as simple request/response operations, as long as all outputs are saved.

### 5.2 Stage 1 Main Flow — New Vacancy to PDF

#### Step 1 — Create Workspace

Required manual input fields:

- company name;
- vacancy / role title;
- multi-line vacancy text.

Optional input fields:

- source URL;
- date, defaulting to current date;
- language hint, with auto-detect later.

Alternative input options after the manual path exists:

- upload `.txt` vacancy file;
- import vacancy from existing local folder.

User action:

```text
Create New Workspace
```

System creates:

```text
ApplicationWorkspace
00_vacancy_source.txt
```

System stores in PostgreSQL:

- company_name_original;
- company_slug;
- role_title_original;
- role_slug;
- date;
- vacancy source path;
- initial status: `source_saved`;
- source hash;
- created timestamp.

User sees:

- company preview;
- role title preview;
- generated company_slug and role_slug;
- vacancy preview;
- editable metadata;
- input quality checkpoint;
- button: `Run Vacancy Analysis`.

Pause point:

```text
Status: source_saved
User can stop here and return later.
```

#### Step 2 — Run Prompt 1: Vacancy Analysis

User action:

```text
Run Analysis
```

System uses:

- vacancy source;
- active Prompt 1 template;
- relevant source knowledge files;
- current profile and safety rules.

System generates:

```text
01_vacancy_analysis.json
01_vacancy_analysis.md
```

Output must include:

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
- summary for the user;
- next recommended action.

System status:

```text
analysis_ready
paused_after_analysis
```

This is the first mandatory human review checkpoint.

### 5.3 Decision Gate After Prompt 1

After Prompt 1, the system must pause and show a decision screen.

This screen is critical.

The user should not automatically continue to CV generation without reviewing the result.

The decision screen should show:

- score;
- `apply / maybe / skip`;
- top 3 reasons;
- blockers;
- missing evidence;
- German language risk;
- commercial vs personal experience risks;
- recommended next action;
- generated analysis artifacts;
- buttons for user decision.

#### If Decision = Apply

System shows:

```text
Decision: APPLY
Recommended: continue to targeted CV generation.
```

User options:

1. `Approve and Generate CV`
2. `Edit Analysis`
3. `Change to Maybe`
4. `Change to Skip`
5. `Pause`

If user approves:

```text
status -> cv_generation_running
```

If user pauses:

```text
status -> paused_after_analysis
```

#### If Decision = Maybe

System shows:

```text
Decision: MAYBE
Recommended: manual review before spending time on CV.
```

The system should not automatically continue.

User must choose:

1. `Proceed Anyway`
2. `Save as Maybe and Pause`
3. `Change to Apply`
4. `Change to Skip`
5. `Add Evidence / Notes`

Useful summary for Maybe:

- what would make this worth applying;
- what must be checked manually;
- whether missing evidence can be safely handled;
- whether German/English risk is acceptable;
- whether the role is too senior, too frontend-heavy, too DevOps-heavy, or too AI-heavy.

If user chooses `Save as Maybe and Pause`:

```text
status -> paused_after_analysis
decision -> maybe
```

If user chooses `Proceed Anyway`:

```text
decision -> manual_override_apply
status -> cv_generation_running
```

#### If Decision = Skip

System shows:

```text
Decision: SKIP
Recommended: do not generate targeted CV.
```

System must automatically create canonical internal skip artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

The system may also generate a human-readable download/export skip artifact:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

The skip file should include:

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

The Broadvoice skip file is the reference pattern.

After creating skip artifacts:

```text
status -> skipped
pipeline stops
```

User options:

1. `Archive`
2. `Reopen`
3. `Override and Continue`
4. `Edit Skip Reason`
5. `Add Notes`

If user chooses `Override and Continue`:

```text
decision -> manual_override_apply
status -> cv_generation_running
```

The override should be logged.

### 5.4 Step 3 — Generate Targeted CV Content

This step should run only after:

- `apply` approved by user;
- or `maybe` manually approved;
- or `skip` manually overridden.

User action:

```text
Generate Targeted CV Content
```

System uses:

- vacancy source;
- Prompt 1 analysis;
- active Prompt 2 template;
- source knowledge base;
- CV format rules;
- evidence bank;
- tech stack safety rules;
- selected output target, default: `PDF`.

System generates:

```text
02_targeted_cv_content.json
02_targeted_cv_content.md
```

Output must include:

- metadata;
- target CV strategy;
- role-specific headline;
- top skills;
- summary;
- experience bullets;
- selected projects if relevant;
- certifications selection;
- evidence table;
- overclaiming check;
- risks;
- open evidence questions;
- PDF readiness notes.

System status:

```text
cv_draft_ready
paused_after_cv_draft
```

This is the second mandatory human review checkpoint.

### 5.5 CV Draft Review Gate

The user sees:

- generated CV content;
- selected headline;
- top skills;
- summary;
- EPAM bullets;
- Factor-IT bullets;
- selected projects;
- certifications;
- evidence table;
- overclaiming warnings;
- layout risk;
- open questions.

User options:

1. `Approve for PDF Export`
2. `Run Optional Pre-PDF Check`
3. `Edit CV Draft`
4. `Regenerate with Notes`
5. `Change Output Format`
6. `Pause`
7. `Mark as Not Worth Applying`

If user pauses:

```text
status -> paused_after_cv_draft
```

If user marks as not worth applying:

```text
status -> skipped
generate/update skip reason file
```

### 5.6 Step 4 — Optional Pre-PDF Check

User action:

```text
Run Pre-PDF Check
```

This step is P1 / MVP Optional. It is recommended for safer real applications, but it should not block the first usable MVP if Prompt 2 evidence guard and PDF export already work.

System uses:

- targeted CV content;
- vacancy analysis;
- CV format rules;
- source evidence;
- output format target.

System generates:

```text
03_pre_pdf_check.json
03_pre_pdf_check.md
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

Once this artifact exists, its recommendations become part of the export context. The next export step must make them available for reading and must treat them as mandatory vacancy-specific guidance. If this optional step was not run, the export step must not require these recommendations.

System status:

```text
pre_pdf_check_ready
paused_before_export
```

This is the third review checkpoint.

### 5.7 Pre-Export Review Gate

User options:

1. `Apply Safe Fixes`
2. `Edit Manually`
3. `Export PDF`
4. `Export HTML`
5. `Export JSON`
6. `Pause`
7. `Go Back to CV Draft`

Default export action:

```text
Export PDF
```

PDF is the default because the practical goal is to send a physical CV file to employers.

HTML and JSON are optional:

- HTML is useful for preview, debugging and later PDF generation.
- JSON is useful for reproducibility, automated tests and later frontend rendering.

### 5.8 Step 5 — Export CV

Default user action:

```text
Export PDF
```

System generates:

```text
04_cv_export.html
04_cv_export.pdf
```

Before rendering, the system checks whether `03_pre_pdf_check.md/json` exists. If it exists, the export step must read and account for the recommendations from Prompt 3. These recommendations are more specific than generic export instructions because they refer to the current CV draft. If no Prompt 3 artifact exists, this check is skipped.

Optional formats:

```text
04_cv_export.json
04_cv_export.md
```

System stores:

- file path;
- artifact type;
- content hash;
- generation timestamp;
- source prompt run ID;
- output format;
- latest version flag.

System status:

```text
cv_pdf_generated
```

If export fails:

```text
status -> failed
error saved to artifact/export log
```

User options after export:

1. `Open PDF`
2. `Download PDF`
3. `Run Final Check`
4. `Generate Cover Letter`
5. `Regenerate`
6. `Pause`

### 5.9 Step 6 — Optional Final Check

User action:

```text
Run Final Check
```

This step is optional for MVP. It should not block the first usable flow if PDF export already works.

System generates:

```text
05_final_check.json
05_final_check.md
```

Output must include:

- final quality score;
- page count;
- missing sections;
- overclaiming issues;
- broken formatting notes;
- final decision: `ready_to_send`, `needs_edit`, or `do_not_send`;
- final checklist.

System status:

```text
final_check_ready
```

User options:

1. `Mark Ready to Apply`
2. `Edit and Re-export`
3. `Generate Cover Letter`
4. `Pause`
5. `Archive`

### 5.10 Step 7 — Optional Cover Letter / Recruiter Message, Phase 2 Candidate

Cover letter generation is optional and can be implemented after the first usable MVP. It is important because some existing workflows already include cover letter PDFs.

User action:

```text
Generate Cover Letter
```

System uses:

- vacancy source;
- vacancy analysis;
- targeted CV content;
- source profile;
- role-specific risks;
- cover letter prompt template.

System generates:

```text
cover_letter.md
cover_letter.pdf
```

Optional:

```text
recruiter_message.md
application_email.md
```

System status:

```text
cover_letter_generated
```

User options:

1. `Download Cover Letter PDF`
2. `Copy Recruiter Message`
3. `Mark Applied`
4. `Pause`

### 5.11 Step 8 — Mark as Applied

User action:

```text
Mark Applied
```

System stores:

- application date;
- applied via: company website / LinkedIn / recruiter / email / other;
- files used;
- notes;
- status: `applied`.

Optional artifacts:

```text
application_note.md
submitted_files.json
```

## 6. MVP Stage 1 — Recommended Screen Flow

The most convenient first-stage UI should have the following screens:

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

### Workspace Overview Screen

Should show:

- company;
- role;
- current status;
- decision;
- score;
- next recommended action;
- existing artifacts;
- warnings;
- buttons.

Example:

```text
Company: Broadvoice
Role: Full-Stack Engineer with AI background
Decision: SKIP
Score: 49/100
Status: skipped
Next action: Archive or override manually
Artifacts:
- 00_vacancy_source.txt
- 01_skip_reason.md
- SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

### Analysis Screen

Should show:

- must-have / nice-to-have / wishlist;
- hidden role logic;
- mismatch summary;
- apply/maybe/skip decision;
- decision buttons;
- skip generation preview if decision is skip.

### CV Draft Screen

Should show:

- left-column CV sections;
- main-column CV sections;
- evidence table;
- warnings;
- output format selector;
- approval buttons.

### Artifact Screen

Should show all files:

- vacancy source;
- analysis md/json;
- targeted CV md/json;
- pre-PDF check md/json;
- CV PDF/HTML/JSON;
- cover letter PDF/MD;
- final check md/json;
- skip reason files.

User actions:

- preview;
- download;
- copy path;
- mark latest;
- regenerate;
- compare versions later.

## 7. Stage 2 — After Adding Queues

### 7.1 Goal of Stage 2

Stage 2 adds production-style backend workflow processing.

Use:

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

The user flow should remain similar, but long-running operations should become asynchronous.

### 7.2 What Changes After Queues

Before queues:

```text
User clicks Run Analysis -> request waits -> result returns
```

After queues:

```text
User clicks Run Analysis -> background job created -> user sees status -> result appears when ready
```

This improves reliability and prepares the project for production-style workflow.

### 7.3 Queue-Based Flow

User action:

```text
Run Prompt 1 Analysis
```

System creates:

```text
AiRun
QueueJob
PromptRun
```

Job status:

```text
pending
running
completed
failed
retrying
cancelled
```

User sees:

- progress state;
- current step;
- start time;
- retry count;
- provider/model;
- estimated cost if available;
- logs/errors;
- cancel button.

When job completes:

- artifacts are saved;
- workspace status changes;
- user review gate opens.

### 7.4 Queue Types

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

### 7.5 Queue-Based Pause Points

Even with queues, the system must pause after important steps.

Mandatory pause points:

| Step | Pause required? | Reason |
|---|---:|---|
| After workspace creation | Optional | User may only want to save source |
| After Prompt 1 analysis | Yes | Apply / Maybe / Skip decision must be reviewed |
| After Skip decision | Yes | Pipeline stops unless manually overridden |
| After Maybe decision | Yes | User must decide whether to spend time on CV |
| After targeted CV draft | Yes | CV content must be checked before export |
| After pre-PDF check | Yes | User must approve export |
| After PDF export | Optional | User may download or run final check |
| After final check | Yes | User decides whether to send |
| After cover letter | Optional | User may mark applied |

### 7.6 Queue Failure Flow

If a job fails:

System should save:

```text
error message
stack trace if safe
provider response if available
input snapshot
prompt version
retry count
failed timestamp
```

User options:

1. `Retry`
2. `Retry with Same Input`
3. `Edit Input and Retry`
4. `Switch Provider`
5. `Mark Failed and Pause`
6. `Skip Workspace`

A failed queue job must not destroy previous artifacts.

### 7.7 Idempotency

Every run should have an idempotency key based on:

```text
workspace_id
step
prompt_template_version
input_hash
source_files_hash
output_format
```

If the same input is run again, the system can:

- reuse existing output;
- create a new version;
- ask user what to do.

User choice:

```text
Use existing result
Create new version
Cancel
```

## 8. File Loading and Access Flows

File access is a core part of the product.

The system must support:

1. importing existing company folders;
2. creating new workspace folders;
3. reading source knowledge files;
4. writing generated artifacts;
5. downloading generated files;
6. tracking file metadata in PostgreSQL.

### 8.1 Import Existing Job Application Folders

User action:

```text
Import Existing Folder
```

Input:

```text
D:\infa\Documents\jobs for analys\2026
```

System scans legacy/manual folder structures such as:

```text
Company/
  YYYY.MM.DD/
    *.txt
    03_targeted_CV_content_*.md
    *_CV.pdf
    *_Cover_Letter.pdf
    SKIP_*.md
```

This import flow is useful for migration and compatibility. It is not required for the first usable MVP if manual workspace creation is already available.

System detects:

- company;
- date;
- role;
- vacancy source file;
- targeted CV content;
- CV PDF;
- cover letter PDF;
- skip reason;
- current status.

System creates:

```text
ApplicationWorkspace records
GeneratedArtifact records
```

User sees import preview before confirming:

```text
Found 3 workspaces:
- Action1: CV PDF generated
- Amach: CV PDF + cover letter generated
- AppsFlyer: vacancy only
```

User options:

1. `Import All`
2. `Select Workspaces`
3. `Fix Metadata`
4. `Skip Duplicates`
5. `Cancel`

### 8.2 Import Source Knowledge Files

User action:

```text
Import Knowledge Sources
```

System imports:

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

System stores:

- file path;
- file type;
- content hash;
- version;
- active/inactive status;
- last imported timestamp.

User can choose which sources are used for each prompt step.

### 8.3 Create New Workspace Folder

When a new workspace is created, the system should create a folder automatically.

Recommended folder format for newly generated workspaces:

```text
storage/applications/2026_06_24_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS/
```

Legacy imported folders may contain hyphens, lowercase names or older naming conventions. Newly generated folders and files must use the current underscore-based naming convention.

For compatibility with the current manual structure, the system may also support:

```text
Company/YYYY.MM.DD/
```

The application should keep a configurable storage root.

### 8.4 Artifact Download Flow

Every artifact should have:

- preview;
- download;
- file path copy;
- open folder action if local app supports it;
- latest version marker;
- generated by prompt run;
- created timestamp.

Physical CV export defaults to PDF.

Optional formats:

```text
PDF
HTML
JSON
Markdown
DOCX later
```

## 9. Important User Flows Beyond CV Generation

### 9.1 Prompt Template Management

User should be able to:

- create prompt template;
- edit prompt template;
- version prompt template;
- activate/deactivate prompt version;
- see which workspaces used which prompt version.

Flow:

```text
Open Prompt Templates
Select Prompt 1
Edit
Save as new version
Mark active
```

The system should never silently overwrite old prompt versions.

### 9.2 Source Evidence Review

User should be able to inspect which source files were used for a generated CV.

For each PromptRun, show:

```text
source files used
content hashes
prompt version
input snapshot
output artifact
```

This is important for reproducibility and anti-overclaiming.

### 9.3 Evidence Guard Flow

When generated CV content contains unsupported claims, the system should flag them.

Examples:

- AI/LLM as commercial production experience;
- NestJS as commercial EPAM production stack;
- Docker as production ownership;
- Kubernetes as real production experience;
- AWS/DynamoDB/MySQL without evidence;
- fluent English or professional German if not supported.

User options:

1. `Remove Claim`
2. `Rephrase Safely`
3. `Mark needs evidence`
4. `Add Evidence`
5. `Override Manually`

Overrides must be logged.

### 9.4 Application Tracking Flow

After sending application, user should be able to track:

```text
applied
recruiter_contacted
interview
test_task
rejected
offer
archived
```

For rejection:

- paste rejection text;
- generate rejection analysis;
- save rejection file;
- extract learning points;
- update future CV rules if needed.

### 9.5 Reuse Previous Application Flow

User may want to reuse a previous CV as a starting point.

Flow:

```text
Select old workspace
Clone CV strategy
Apply to new vacancy
Run fresh evidence check
Generate new CV
```

The system must never blindly reuse old CV content without checking against the new vacancy.

### 9.6 Manual Notes Flow

Every workspace should support notes:

- recruiter notes;
- evidence questions;
- interview preparation;
- salary notes;
- location/remote notes;
- why applied;
- why skipped.

Notes should not be mixed into generated CV unless explicitly selected.

### 9.7 Compare Versions Flow

Later feature.

User can compare:

- CV draft v1 vs v2;
- PDF v1 vs v2;
- analysis from different models;
- Prompt 2 output from different prompt versions.

This is useful but not MVP-critical.

## 10. Recommended First-Stage UX

The most convenient first-stage flow should be:

```text
1. Create workspace manually, or optionally import workspace
2. Save vacancy
3. Run Prompt 1
4. Pause and review Apply / Maybe / Skip
5. If Skip -> generate skip file and stop
6. If Maybe -> pause until user approves
7. If Apply -> generate targeted CV content
8. Pause and review CV draft
9. Optionally run pre-PDF check
10. Pause and approve export
11. Export PDF by default
12. Optionally run final check
13. Download PDF
14. Optionally generate cover letter
15. Mark applied
```

This gives control without slowing the process too much.

## 11. Recommended Second-Stage UX With Queues

After adding queues:

```text
1. Create workspace manually, or optionally import workspace
2. Click Run Analysis
3. Background job starts
4. User can leave page
5. When done, workspace status becomes analysis_ready
6. User reviews Apply / Maybe / Skip
7. User approves next step
8. CV generation runs in background
9. User reviews CV draft
10. Optional pre-PDF check runs in background if enabled
11. User approves export
12. PDF export runs in background
13. User downloads result
```

The key UX rule remains the same:

```text
Queues automate execution, not decision-making.
```

The system should still pause at human decision gates.

## 12. Human Review Checkpoints

Mandatory human review checkpoints:

### Checkpoint 1 — After Prompt 1

Question:

```text
Is this vacancy worth applying to?
```

Possible outcomes:

```text
Apply -> continue
Maybe -> pause
Skip -> generate skip file and stop
Manual override -> continue with warning
```

### Checkpoint 2 — After Prompt 2

Question:

```text
Is this CV content accurate, safe and relevant?
```

Possible outcomes:

```text
Approve
Edit
Regenerate
Pause
Skip
```

### Checkpoint 3 — After Prompt 3

Question:

```text
Is it safe to generate the final CV file?
```

Possible outcomes:

```text
Apply fixes
Export PDF
Export HTML
Export JSON
Pause
```

### Checkpoint 4 — After PDF Export

Question:

```text
Is the physical file usable?
```

Possible outcomes:

```text
Run final check
Download
Regenerate
Generate cover letter
Pause
```

### Checkpoint 5 — After Final Check

Question:

```text
Can I send this application?
```

Possible outcomes:

```text
Ready to apply
Needs edit
Do not send
```

## 13. Default Output Format Rules

Default CV output:

```text
PDF
```

Optional user-facing export:

```text
HTML
JSON
Markdown as downloadable draft
DOCX later
```

Internal editable artifact:

```text
Markdown
```

Rules:

- PDF is default because it is the practical file used for job applications.
- HTML is useful for preview and PDF rendering.
- JSON is useful for structured data, reproducibility and future frontend rendering.
- Markdown is primarily an internal editable artifact and may also be downloadable for manual editing and Git history.
- DOCX can be added later if needed.

The user should be able to choose output format before export, but if no format is selected, the system should generate PDF.

## 14. Skip Flow Requirements

Skip is not a dead end without artifact.

If the system decides `skip`, it must create a skip file.

Recommended canonical internal skip artifacts:

```text
01_skip_reason.md
01_skip_reason.json
```

Recommended human-readable export/download skip artifact:

```text
SKIP_<company_slug>_<role_slug>_reason_RU.md
```

Skip reason language defaults to Russian for personal review. The exported human-readable file may include a language suffix.

Skip file content should include:

```text
Date analyzed
Company
Role
Location / remote
Core stack
Final score
Decision: SKIP
Main skip reason
Key mismatches
Evidence from my profile
Risks if applying anyway
Useful keywords to track later
Future reconsideration condition
```

After skip:

```text
status -> skipped
pipeline stops
```

User may override, but override must be explicit and logged.

## 15. Failure and Recovery Flows

### AI Provider Failure

If OpenAI/Anthropic call fails:

User sees:

- provider;
- model;
- step;
- error;
- retry count;
- input hash;
- prompt version.

User options:

```text
Retry
Switch provider
Edit input and retry
Save failed result
Pause
```

### PDF Export Failure

If PDF export fails:

User sees:

- HTML preview if generated;
- export error;
- CSS/template error if available;
- file path issue if relevant.

User options:

```text
Retry PDF export
Export HTML only
Export JSON only
Edit template
Pause
```

### File Access Failure

If file cannot be read or written:

User sees:

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

### Unsupported Claim Failure

If evidence guard finds critical unsupported claims:

User sees:

- claim;
- source/evidence status;
- risk level;
- suggested safe wording.

User options:

```text
Remove
Rephrase
Mark needs evidence
Override
```

## 16. MVP Done Criteria for User Flows

The MVP user flow is complete when:

- user can create a workspace from vacancy text;
- user can run Prompt 1 and review Apply / Maybe / Skip;
- system creates skip file if decision is Skip;
- user can approve Apply/Maybe to continue;
- user can generate targeted CV content;
- user can pause after CV draft;
- user can export CV as PDF by default;
- system saves generated files to filesystem;
- system stores metadata in PostgreSQL;
- user can download the generated PDF;
- user can see workspace status and artifacts.

## 17. Open Product Questions

These should be decided during requirements or implementation:

1. Should Stage 1 have a frontend dashboard immediately, or should Swagger/API be enough first?
2. Should the system support direct editing of Markdown inside UI in MVP?
3. Should skip JSON be required from the start or added after markdown skip files?
4. Should final PDF check use PDF text extraction, screenshot/visual validation, or only generated content validation in MVP?
5. Should source knowledge files be copied into project storage or referenced by external path?
6. Should application folders follow the current `Company/YYYY.MM.DD/` structure or a new slug-based structure?
7. Should PDF template match the current CV layout exactly from MVP, or can it start as a simple clean layout?
8. Should cover letter generation be included in MVP or Phase 2?
9. Should generated artifacts be versioned from day one?
10. Should user overrides require notes?

## 18. Final Product Flow Summary

The ideal long-term flow:

```text
Import or create workspace
  -> Save vacancy source
  -> Run AI vacancy analysis
  -> Pause for Apply / Maybe / Skip review
    -> Skip: create skip file and stop
    -> Maybe: pause until user approves
    -> Apply: continue
  -> Generate targeted CV content
  -> Pause for CV evidence review
  -> Optionally run pre-PDF check
  -> Pause for export approval
  -> Export PDF by default
  -> Optionally run final check
  -> Download CV PDF
  -> Optional cover letter PDF
  -> Mark applied
  -> Track response / rejection / next action
```

The key rule:

```text
The system should automate repetitive work, but preserve human decision points where wrong automation could waste time or create unsafe CV claims.
```


## 19. Update v2 — Required Workspace Input and Role Title Normalization

This section extends the Stage 1 and Stage 2 user flows without removing any previous flow requirements.

The application must collect company information, vacancy title information, and vacancy text as separate inputs. This is important because the company name and the vacancy title are used for workspace metadata, folder naming, artifact naming, search, status tracking, and generated document names.

### 19.1 Required Inputs for New Workspace Creation

When the user creates a new workspace manually, the UI must show separate fields:

```text
Company name
Vacancy / role title
Vacancy text
Source URL optional
Date optional, default: current date
Language optional, auto-detect later
```

The fields must not be merged into one free-text input.

#### Company Name

The company name is entered separately and stored as original user-provided metadata.

Examples:

```text
Action1
Amach
AppsFlyer
Broadvoice
CHECK24 Vergleichsportal
Omega CRM, A Merkle Company
```

The original company name should be preserved for display.

A normalized company slug may be generated separately for folder/file names, but the display name must remain unchanged.

#### Vacancy / Role Title

The vacancy title is entered separately from the vacancy text.

Examples:

```text
Backend Developer Node.js JavaScript TypeScript
Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS
Senior Backend Engineer (Node.js, AWS, DynamoDB)
Middle/Senior Full Stack Developer — Logistics Domain
```

The original role title must be preserved for display and prompt context.

The system must also generate a normalized role slug for filesystem-safe artifact names.

#### Vacancy Text

The vacancy text is uploaded or pasted as a multi-line text field.

The vacancy text may be in different languages and must be preserved exactly as submitted, except for normal file encoding handling.

Examples of valid vacancy text input:

```text
English job description
German job description
Mixed English/German job description
Russian notes added by the user
Multi-line copied vacancy from LinkedIn, company website, Wellfound, Otta, Instaffo, etc.
```

The system must not sanitize or rewrite the vacancy text when saving `00_vacancy_source.txt`.

Sanitization applies only to filesystem-safe generated names, not to the vacancy source content.

### 19.2 Role Title Normalization Rules

The system must generate a normalized role slug from the vacancy / role title.

Purpose of the role slug:

- workspace folder names;
- vacancy source file names;
- targeted CV file names;
- skip reason file names;
- generated PDF names;
- search and duplicate detection.

The normalized role slug must be derived from the original role title, but it must be safe for filenames.

#### Allowed Characters

The role slug may contain only:

```text
English letters: A-Z, a-z
Cyrillic letters: any Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Underscore: _
```

Numbers and other characters should be removed or converted according to the normalization rules below.

#### Normalization Algorithm

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

This keeps role names readable while removing unsafe filesystem characters.

#### Examples

| Original role title | Normalized role slug |
|---|---|
| `Backend Developer Node.js JavaScript TypeScript` | `Backend_Developer_Node_js_JavaScript_TypeScript` |
| `Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS` | `Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS` |
| `Senior Backend Engineer (Node.js, AWS, DynamoDB)` | `Senior_Backend_Engineer_Node_js_AWS_DynamoDB` |
| `Middle/Senior Full Stack Developer — Logistics Domain` | `Middle_Senior_Full_Stack_Developer_Logistics_Domain` |
| `Разработчик Node.js / Backend Developer` | `Разработчик_Node_js_Backend_Developer` |
| `C#/.NET Backend Engineer` | `C_NET_Backend_Engineer` |

Implementation note:

- If the user later decides that numbers should be allowed, the rule can be changed. For the current specification, the role slug allows English letters, Unicode Cyrillic letters and underscores only.
- The original title must always be stored separately, so no information is lost from the user-facing metadata.

### 19.2A Company Slug Normalization Rules

Company slug and role slug may use different normalization rules.

Company names often contain meaningful numbers, for example:

```text
Action1
CHECK24
Omega CRM
```

Therefore, the company slug may contain:

```text
English letters: A-Z, a-z
Cyrillic letters: any Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters
Numbers: 0-9
Underscore: _
```

Company slug normalization should:

1. Preserve the original company name separately for display and prompt context.
2. Replace whitespace and separators with `_`.
3. Remove unsupported characters.
4. Collapse repeated underscores.
5. Remove leading and trailing underscores.
6. Preserve meaningful numbers in company names.

Examples:

| Original company name | Company slug |
|---|---|
| `Action1` | `Action1` |
| `CHECK24 Vergleichsportal` | `CHECK24_Vergleichsportal` |
| `Omega CRM, A Merkle Company` | `Omega_CRM_A_Merkle_Company` |
| `IT-компанія ДП ІНФОТЕХ` | `IT_компанія_ДП_ІНФОТЕХ` |

### 19.3 Workspace Creation Flow — Updated Input Contract

This section extends `5.2 Stage 1 Main Flow — New Vacancy to PDF`.

#### Step 1 — Create Workspace, Updated

Input options:

- enter company name separately;
- enter vacancy / role title separately;
- paste vacancy text as a multi-line text field;
- upload `.txt` vacancy file as an alternative to pasted vacancy text;
- import vacancy from existing local folder;
- optionally add source URL manually.

Required fields for manual workspace creation:

```text
company_name_original
role_title_original
vacancy_text
```

Generated fields:

```text
company_slug
role_slug
workspace_slug
vacancy_source_file_name
```

Recommended generated names:

```text
workspace_slug = <date>_<company_slug>_<role_slug>

canonical_vacancy_source_file_name = 00_vacancy_source.txt
canonical_targeted_cv_content_file_name = 02_targeted_cv_content.md
canonical_cv_pdf_file_name = 04_cv_export.pdf
canonical_cover_letter_pdf_file_name = cover_letter.pdf
canonical_skip_reason_file_name = 01_skip_reason.md

download_cv_pdf_file_name = Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf
download_cover_letter_pdf_file_name = Denys_Strakhov_<company_slug>_<role_slug>_Cover_Letter.pdf
download_skip_reason_file_name = SKIP_<company_slug>_<role_slug>_reason_RU.md
```

The UI must show a preview before creating the workspace:

```text
Company: Broadvoice
Role title: Full-Stack Engineer with AI background / Software Engineer ReactJS TypeScript NodeJS
Generated role slug: Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS
Vacancy text: multi-line preview
Generated canonical vacancy file: 00_vacancy_source.txt
Download/export vacancy file name if needed: Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS.txt
```

User options at preview stage:

1. `Create Workspace`
2. `Edit Company`
3. `Edit Role Title`
4. `Edit Vacancy Text`
5. `Cancel`

System creates after confirmation:

```text
ApplicationWorkspace
00_vacancy_source.txt
```

Legacy imported names such as `Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt` are supported during import, but new workspaces should use `00_vacancy_source.txt` as the canonical internal artifact.

System stores in PostgreSQL:

```text
company_name_original
company_slug
role_title_original
role_slug
vacancy_text_path
vacancy_text_hash
source_url optional
created_at
initial_status = source_saved
```

### 19.4 Multi-line Vacancy Text Handling

Vacancy text must be treated as content, not as filename input.

Rules:

- Preserve line breaks.
- Preserve original language.
- Preserve bullets and formatting where possible.
- Preserve special characters inside the saved vacancy text.
- Do not remove punctuation from vacancy text.
- Do not normalize vacancy text into a slug.
- Store vacancy text as UTF-8.
- Generate a content hash for duplicate detection.

The system may later create a cleaned text version for AI processing, but the original vacancy source must remain unchanged.

Recommended artifacts:

```text
00_vacancy_source.txt          # original pasted/uploaded vacancy text
00_vacancy_source.cleaned.txt  # optional later normalized AI-processing version
```

### 19.5 Import Existing Folders — Updated Detection Rules

This section extends `8.1 Import Existing Job Application Folders`.

When importing existing folders, the system should infer:

```text
company_name_original
role_title_original
company_slug
role_slug
vacancy_source_file
existing_artifacts
workspace_status
```

From examples:

```text
Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
```

The system can infer:

```text
company_name_original = Action1
role_title_original = Backend Developer Node.js JavaScript TypeScript
role_slug = Backend_Developer_Node_js_JavaScript_TypeScript
```

When inference is uncertain, the import preview must ask the user to confirm or edit metadata.

User options:

1. `Accept Detected Metadata`
2. `Edit Company Name`
3. `Edit Role Title`
4. `Regenerate Slug`
5. `Skip This Workspace`

### 19.6 File Naming Rules for Artifacts

The application must distinguish between **canonical internal artifact names** and **human-readable download/export names**.

This is important because backend logic, tests and artifact lookup are simpler when internal files have stable names, while downloaded files should still be readable and useful for real job applications.

#### Canonical Internal Artifact Names

Internal artifact files inside the workspace should use stable step-based names.

Recommended internal names:

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

#### Human-Readable Download / Export Names

Download/export names may include `company_slug` and `role_slug`.

Examples:

```text
Denys_Strakhov_Action1_Backend_Developer_Node_js_JavaScript_TypeScript_CV.pdf
Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf
SKIP_Broadvoice_Full_Stack_Engineer_with_AI_background_Software_Engineer_ReactJS_TypeScript_NodeJS_reason_RU.md
```

#### Legacy Manual Workflow Names

For compatibility with the current manual process, the system must support existing names such as:

```text
Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt
03_targeted_CV_content_Action1_Backend_Developer.md
Denys_Strakhov_Action1_Backend_Developer_CV.pdf
SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md
```

Legacy manual workflow may contain files named `03_targeted_CV_content_*`. In the new application pipeline, Prompt 2 output is stored canonically as `02_targeted_cv_content.md/json`.

Legacy imported folders may contain hyphens, lowercase names or older naming conventions. Newly generated folders and files must use the current underscore-based naming convention for workspace slugs and human-readable export names.

### 19.7 User Review Points Related to Input Quality

Before Prompt 1 runs, the system should show an input quality checkpoint.

The user should confirm:

- company name is correct;
- role title is correct;
- generated role slug is acceptable;
- vacancy text is complete;
- vacancy language looks correct;
- source URL is added if available.

User options:

1. `Run Analysis`
2. `Edit Input`
3. `Save and Pause`
4. `Cancel Workspace`

This avoids running AI analysis on incomplete or incorrectly named input.

### 19.8 Validation Errors

Possible validation errors:

| Problem | System behavior |
|---|---|
| Company name is empty | Block workspace creation |
| Role title is empty | Block workspace creation |
| Vacancy text is empty | Block workspace creation unless importing source file |
| Role slug becomes empty after normalization | Ask user to provide a simpler English/Russian title |
| Generated file name is too long | Ask user to shorten role title or use shorter manual slug |
| Workspace folder already exists | Offer to open existing workspace or create new version |
| Vacancy text encoding cannot be read | Ask user to choose encoding or paste text manually |

### 19.9 Updated MVP Done Criteria

The MVP user flow is complete only when:

- user can enter company name separately;
- user can enter vacancy / role title separately;
- user can paste or upload multi-line vacancy text;
- system preserves original vacancy text;
- system generates a safe normalized role slug;
- system previews generated file names before workspace creation;
- system stores original and normalized metadata in PostgreSQL;
- generated artifacts use safe filenames;
- existing folder import can detect or ask for company and role metadata.

These requirements extend the previous MVP done criteria without removing any existing requirements.
