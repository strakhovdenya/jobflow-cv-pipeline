# knowledge-sources/

Content files used as prompt context for the AI pipeline (Prompt 1 / Prompt 2 / etc.).

## Git strategy

All files under `knowledge-sources/` are committed to the repository. This is a private
repo, and reproducibility of the pipeline (same inputs → same prompt context) is prioritized
over keeping these files out of version control. `.gitignore` is not modified for this
directory — nothing here is excluded.

## Structure

Active sources, as registered by `scripts/register-knowledge-sources.ts` (`SOURCES`):

| File | `sourceType` | `versionLabel` |
|---|---|---|
| `candidate-profile/Master_CV_RU_v0_8_portfolio_refresh.md` | `master_cv` | `v0_8_portfolio_refresh` |
| `candidate-profile/Master_Profile_Summary_RU_v0_8_portfolio_refresh.md` | `profile_summary` | `v0_8_portfolio_refresh` |
| `candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md` | `linkedin_source_decision` | `v0_3_current_work_sync` |
| `evidence/Project_Inventory_RU_v0_8_portfolio_refresh.md` | `project_inventory` | `v0_8_portfolio_refresh` |
| `evidence/Career_Case_Deep_Dives_RU_v0_9_portfolio_refresh.md` | `career_cases` | `v0_9_portfolio_refresh` |
| `evidence/Tech_Stack_Matrix_RU_v2_5_portfolio_refresh.md` | `tech_stack` | `v2_5_portfolio_refresh` |
| `cv-rules/CV_Format_Rules_EN_v0_6_portfolio_refresh.md` | `cv_rules` | `v0_6_portfolio_refresh` |
| `certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-11.md` | `certifications` | `2026-11` |
| `layout/CV_Layout_Reference_EN_2026-06.pdf` | `layout` | `2026-06` |

Folders:

- `candidate-profile/` — stable candidate facts and positioning (master CV, profile summary, LinkedIn source decision). The active profile summary holds the three English Summary variants (A — general backend, B — backend-focused full-stack, C — AI-assisted engineering / developer productivity), the rule for choosing one by vacancy and the order of AI evidence
- `evidence/` — evidence used against overclaiming (project inventory, career case deep dives, tech stack matrix). The active tech stack matrix classifies every skill as commercial, personal (project) or training (credential) and keeps the three AI categories apart: A — AI-assisted Software Engineering, B — AI Integration & Agent Workflow Engineering, C — Agent Development Training. The active project inventory holds the `portfolio-registry` block (strict JSON, contract `portfolio-registry/v1` in `project-management/plan/PLAN-career-evidence-refresh.md`): the only list of projects allowed in a CV (`cvEligible`) and of archived projects that must not appear in one
- `cv-rules/` — CV structure and wording rules: the Summary/headline stop-list, the Current Independent Work block (stable header and intro, vacancy-chosen third bullet), vacancy-aware selection of projects and certifications from the two registries (`cvEligible`, `placement`, `roleFamilies`, rule "coverage, not topic") and the expected selection per vacancy family
- `certifications/` — certificate inventory. The active inventory holds the `credential-registry` block (strict JSON, contract `credential-registry/v1` in the same plan): every credential with its type (`skill_badge`, `course_completion`, `lab`, `learning_path`, …), status and `cvEligible`; labs, learning paths and unfinished items are never shown in a CV
- `layout/` — visual CV layout reference (PDF)
- `prompts/` — prompt template source content (see below)

Older versions (`*_v0_6_current_work_sync.md`, `Master_CV_RU_v0_7_*`, `Master_Profile_Summary_RU_v0_7_*`, `Project_Inventory_RU_v0_7_*`, `Career_Case_Deep_Dives_RU_v0_7_*`, `Career_Case_Deep_Dives_RU_v0_8_*`, `Tech_Stack_Matrix_RU_v2_3_*`, `Tech_Stack_Matrix_RU_v2_4_*`, `LinkedIn_Certifications_Inventory_RU_EN_2026-06.md`, `CV_Format_Rules_EN_v0_3_*`, `CV_Format_Rules_EN_v0_4_*`, `CV_Format_Rules_EN_v0_5_*`) stay on disk unchanged: snapshots of past prompt runs refer to them. A new version is a new file, never an in-place edit.

### Registration

`npm run register-knowledge-sources` (in `apps/api`) calls `registerKnowledgeSources()` from `src/knowledge-sources/knowledge-source-registration.ts`. It checks that every listed file exists before writing anything, then in one transaction creates or updates the listed records (matched by file path, with a fresh content hash) and sets `isActive: false` on every other active record. Records are never deleted. After a run exactly the listed files are active, so every source type has one active version.

## prompts/

Six files are required by TASK-037C (knowledge source registration, a separate task):

- `prompt_1_vacancy_analysis.md`
- `prompt_2_targeted_cv_content.md`
- `prompt_2_1_cover_letter.md`
- `prompt_3_pre_pdf_check.md`
- `prompt_4_pdf_export_rules.md`
- `prompt_5_final_check.md`

Two additional files are renamed/placed here for later use only. They are **not** wired
into TASK-037C registration, `Prompt2InputBuilder`, or any pipeline logic in this session:

- `prompt_4_1_optional_html.md` — future-scope material
- `prompt_6_recruiter_message.md` — future-scope material (recruiter message, Phase 10/11,
  TASK-048–051 per `docs/07_task_backlog.md`)

Cover letter generation (`prompt_2_1_cover_letter.md`) is Phase 2 per
`docs/07_task_backlog.md` §1 and is likewise not consumed by TASK-037C.
