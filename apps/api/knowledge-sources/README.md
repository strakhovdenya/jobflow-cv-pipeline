# knowledge-sources/

Content files used as prompt context for the AI pipeline (Prompt 1 / Prompt 2 / etc.).

## Git strategy

All files under `knowledge-sources/` are committed to the repository. This is a private
repo, and reproducibility of the pipeline (same inputs → same prompt context) is prioritized
over keeping these files out of version control. `.gitignore` is not modified for this
directory — nothing here is excluded.

## Structure

- `candidate-profile/` — no content yet (manual developer work, out of scope for TASK-037C-0)
- `evidence/` — no content yet (manual developer work, out of scope for TASK-037C-0)
- `cv-rules/` — no content yet (manual developer work, out of scope for TASK-037C-0)
- `certifications/` — no content yet (manual developer work, out of scope for TASK-037C-0)
- `layout/` — no content yet (manual developer work, out of scope for TASK-037C-0)
- `prompts/` — prompt template source content (see below)

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
