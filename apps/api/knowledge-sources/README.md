# knowledge-sources/

Content files used as prompt context for the AI pipeline (Prompt 1 / Prompt 2 / etc.).

## Git strategy

All files under `knowledge-sources/` are committed to the repository. This is a private
repo, and reproducibility of the pipeline (same inputs → same prompt context) is prioritized
over keeping these files out of version control. `.gitignore` is not modified for this
directory — nothing here is excluded.

## Structure

The list of active files is `ACTIVE_KNOWLEDGE_SOURCES` in
`src/knowledge-sources/active-knowledge-sources.ts` — the only place that names them. Each entry
gives the path relative to this folder, the `sourceType` and the `versionLabel`. The registration
script activates exactly this list, and the unit tests read the real files through it
(`src/knowledge-sources/active-knowledge-sources.spec.ts`: every file exists, one entry per
`sourceType`, every required type of every pipeline step is listed, both registries parse,
archived project names appear in prompt-bound sources only inside the registry block, and those
sources refer to no file version outside the list).

One file per `sourceType`:

| `sourceType` | Folder | Content |
|---|---|---|
| `master_cv` | `candidate-profile/` | master CV |
| `profile_summary` | `candidate-profile/` | profile summary and Summary variants |
| `linkedin_source_decision` | `candidate-profile/` | LinkedIn source decision (not passed to any pipeline step) |
| `project_inventory` | `evidence/` | project inventory with the `portfolio-registry` block |
| `career_cases` | `evidence/` | career case deep dives |
| `tech_stack` | `evidence/` | tech stack matrix |
| `cv_rules` | `cv-rules/` | CV format rules |
| `certifications` | `certifications/` | certificate inventory with the `credential-registry` block |
| `layout` | `layout/` | CV layout reference (PDF) |

Folders:

- `candidate-profile/` — stable candidate facts and positioning (master CV, profile summary, LinkedIn source decision). The active profile summary holds the three English Summary variants (A — general backend, B — backend-focused full-stack, C — AI-assisted engineering / developer productivity), the rule for choosing one by vacancy and the order of AI evidence
- `evidence/` — evidence used against overclaiming (project inventory, career case deep dives, tech stack matrix). The active tech stack matrix classifies every skill as commercial, personal (project) or training (credential) and keeps the three AI categories apart: A — AI-assisted Software Engineering, B — AI Integration & Agent Workflow Engineering, C — Agent Development Training. The active project inventory holds the `portfolio-registry` block (strict JSON, contract `portfolio-registry/v1` in `project-management/plan/PLAN-career-evidence-refresh.md`): the only list of projects allowed in a CV (`cvEligible`) and of archived projects that must not appear in one
- `cv-rules/` — CV structure and wording rules: the Summary/headline stop-list, the Current Independent Work block (stable header and intro, one JobFlow bullet, a mandatory portfolio overview with facets chosen for the vacancy, at most one additional piece of evidence), vacancy-aware selection of projects and certifications from the two registries (`cvEligible` and `placement` as hard limits, `roleFamilies` and the expected selection per vacancy as defaults the inclusion test can override, rule "coverage, not topic"), AI-assisted engineering evidence chosen by the kind of the AI request and sized by its weight, and certifications as bare registry titles to which the export adds issuer, type and year
- `certifications/` — certificate inventory. The active inventory holds the `credential-registry` block (strict JSON, contract `credential-registry/v1` in the same plan): every credential with its type (`skill_badge`, `course_completion`, `lab`, `learning_path`, …), status and `cvEligible`; labs, learning paths and unfinished items are never shown in a CV
- `layout/` — visual CV layout reference (PDF)
- `prompts/` — prompt template source content (see below)

Files that `ACTIVE_KNOWLEDGE_SOURCES` does not list are older versions. They stay on disk unchanged: snapshots of past prompt runs refer to them. A new version is a new file, never an in-place edit; activating it means changing its entry in the list and running the registration.

### Registration

`npm run register-knowledge-sources` (in `apps/api`) passes `ACTIVE_KNOWLEDGE_SOURCES` to `registerKnowledgeSources()` from `src/knowledge-sources/knowledge-source-registration.ts`. Before writing anything it rejects a list that repeats a `sourceType` (`findDuplicateSourceTypes`; two active files of one type would both reach the prompts) and checks that every listed file exists; then in one transaction creates or updates the listed records (matched by file path, with a fresh content hash) and sets `isActive: false` on every other active record. Records are never deleted. A rejected list leaves the database unchanged. After a run exactly the listed files are active, so every source type has one active version.

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
