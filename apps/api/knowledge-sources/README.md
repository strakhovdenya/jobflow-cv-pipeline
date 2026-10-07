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
| `candidate-profile/Master_CV_RU_v0_7_ai_factory_sync.md` | `master_cv` | `v0_7_ai_factory_sync` |
| `candidate-profile/Master_Profile_Summary_RU_v0_7_ai_factory_sync.md` | `profile_summary` | `v0_7_ai_factory_sync` |
| `candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md` | `linkedin_source_decision` | `v0_3_current_work_sync` |
| `evidence/Project_Inventory_RU_v0_7_ai_factory_sync.md` | `project_inventory` | `v0_7_ai_factory_sync` |
| `evidence/Career_Case_Deep_Dives_RU_v0_7_ai_factory_sync.md` | `career_cases` | `v0_7_ai_factory_sync` |
| `evidence/Tech_Stack_Matrix_RU_v2_4_ai_factory_sync.md` | `tech_stack` | `v2_4_ai_factory_sync` |
| `cv-rules/CV_Format_Rules_EN_v0_4_ai_factory_sync.md` | `cv_rules` | `v0_4_ai_factory_sync` |
| `certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-06.md` | `certifications` | `2026-06` |
| `layout/CV_Layout_Reference_EN_2026-06.pdf` | `layout` | `2026-06` |

Folders:

- `candidate-profile/` — stable candidate facts and positioning (master CV, profile summary, LinkedIn source decision)
- `evidence/` — evidence used against overclaiming (project inventory, career case deep dives, tech stack matrix)
- `cv-rules/` — CV structure, wording rules and the vacancy-to-evidence mapping (including vacancies that mention AI)
- `certifications/` — certificate inventory
- `layout/` — visual CV layout reference (PDF)
- `prompts/` — prompt template source content (see below)

Older versions (`*_v0_6_current_work_sync.md`, `Tech_Stack_Matrix_RU_v2_3_*`, `CV_Format_Rules_EN_v0_3_*`) stay on disk unchanged: snapshots of past prompt runs refer to them. A new version is a new file, never an in-place edit.

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
