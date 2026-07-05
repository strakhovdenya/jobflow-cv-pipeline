# Architecture Decisions

This file records decisions that should not be rediscovered or re-debated during implementation.

## ADR-001 — Backend-first MVP

Status: `Accepted`

Decision:
The first usable MVP is backend-first with NestJS, PostgreSQL, Prisma and filesystem artifacts.

Reason:
Keeps the project aligned with Backend Developer / Software Engineer portfolio value.

## ADR-002 — PostgreSQL metadata + filesystem artifacts

Status: `Accepted`

Decision:
PostgreSQL stores metadata/state. Filesystem stores physical artifacts such as vacancy text, Markdown, JSON, HTML and PDF.

Reason:
Keeps generated files usable outside the app while preserving structured state.

## ADR-003 — PDF is default CV export

Status: `Accepted`

Decision:
The default physical CV export format is PDF. HTML/JSON/Markdown are optional.

Reason:
PDF is the practical format used for real applications.

## ADR-004 — Prompt 1 requires human review gate

Status: `Accepted`

Decision:
After Prompt 1, the system always pauses for Apply/Maybe/Skip review.

Reason:
Prevents wasting time and prevents unsafe automation.

## ADR-005 — Skip stops pipeline by default

Status: `Accepted`

Decision:
A skip decision creates `01_skip_reason.md/json` and stops CV generation unless manually overridden.

Reason:
Skipped vacancies still become useful evidence without generating unnecessary CVs.

## ADR-006 — Canonical internal artifact names

Status: `Accepted`

Decision:
Internal files use stable step-based names such as `00_vacancy_source.txt`, `02_targeted_cv_content.md`, `04_cv_export.pdf`. Download names may include company and role slugs.

Reason:
Simplifies backend logic and tests while preserving human-readable exports.

## ADR-007 — PostgreSQL Docker volume must persist data

Status: `Accepted`

Decision:
Local PostgreSQL must use a named Docker volume and must survive container restart, Docker Desktop restart and `docker compose down`. `docker compose down -v` is destructive.

Reason:
Prevents local data loss during development.

## ADR-008 — Unit tests required for deterministic MVP logic

Status: `Accepted`

Decision:
P0 deterministic business logic must have unit tests: slug normalization, workspace validation, artifact naming, skip handling, approval gates and anti-overclaiming guard.

Reason:
Keeps the MVP reliable before adding real AI and queues.

## ADR-009 — Prompt 3 and Prompt 5 are optional quality steps

Status: `Accepted`

Decision:
Pre-PDF check and final check are P1/MVP optional, not first usable MVP blockers.

Reason:
Allows reaching physical PDF output faster while preserving safety roadmap.

## ADR-010 — Cover letter is Phase 2

Status: `Accepted`

Decision:
Cover letter/recruiter message generation is part of product vision but not required for first usable MVP.

Reason:
Keeps MVP focused on targeted CV PDF and skip handling.

## ADR-011 — Import existing folders is P1 optional

Status: `Accepted`

Decision:
Manual workspace creation is the primary MVP path. Basic import is P1 optional; robust import is later.

Reason:
Avoids blocking the MVP on legacy folder edge cases.

## ADR-012 — Step 4 is deterministic document export

Status: `Accepted`

Decision:
Step 4 document export is not an AI prompt. It must not use PromptTemplate and must not create an AiRun. It reads approved `02_targeted_cv_content.json` and existing `03_pre_pdf_check.md/json` when present.

Reason:
Keeps PDF generation deterministic and separates document rendering from AI-assisted steps.

## ADR-013 — Unicode Cyrillic slug support

Status: `Accepted`

Decision:
Slug normalization must support Unicode Cyrillic letters, including Russian and Ukrainian Cyrillic characters.

Reason:
Real folder/company names include Cyrillic/Ukrainian characters.

## ADR-014 — Git branching strategy

Status: `Accepted`

Decision:
- `main` — стабильная ветка, только завершённые задачи (статус DONE).
- `task/TASK-XXX-short-description` — отдельная ветка на каждую задачу.
- Merge в main только после того как acceptance criteria выполнены и тесты прошли.
- Прямые коммиты в main запрещены кроме первоначального бутстрапа.

Reason:
Позволяет откатиться к рабочему состоянию если Claude Code сделал что-то лишнее.
Чистая история коммитов важна для портфолио.

## ADR-015 — canProceedToPrompt2 checks status, not reviewState

Status: `Accepted`

Decision:
The gate that allows Prompt 2 to run checks `workspace.status === cv_generation_running`,
not `workspace.reviewState === approved`.

Reason:
`reviewState = approved` is set by ReviewGatesService but `status = cv_generation_running`
is the canonical pipeline signal consumed by all other services. Checking status keeps
the gate consistent with the state machine in docs/03_domain_model.md §8.6.
Source: derived and confirmed during TASK-028 implementation.

## ADR-017 — NestJS module boundary rules

Status: `Accepted`

Decision:

**1. Root module (AppModule) imports only top-level feature modules.**
AppModule should contain only: the shared infrastructure module that needs global registration (e.g. `PrismaModule`) and the feature modules whose HTTP controllers it registers. Any module that AppModule's own providers do not inject should be moved to the feature module that actually needs it.

*Example*: in TASK-035C, `AppModule` had 7 redundant imports — none of them were injected by `AppController` or `AppService`. Each was already imported by the sub-module that needed it.

**2. Each module imports its own dependencies directly.**
NestJS module exports are not transitive. A module can only see providers that are explicitly listed in the `exports` array of an imported module. No module should rely on a parent or sibling module to supply a dependency indirectly.

**3. Exports must be intentional and minimal.**
Only add a provider to `exports: []` when another module is expected to inject it. Do not export everything by default.

**4. Orphaned module files must not exist.**
A `*.module.ts` file that no other module imports (and is not `AppModule` itself) is dead code and a latent double-registration risk. Either wire it up or delete it.

*Example*: `skip-reason.module.ts` existed alongside `pipeline.module.ts` which already registered `SkipReasonService`. The file was deleted in TASK-035C.

**5. `@Global()` modules need only one import site.**
Once a `@Global()` module is imported (typically in `AppModule`), its exported providers are available everywhere in the application. Repeating the import in other modules is harmless self-documentation but adds no DI value. Do not add or remove such imports as part of unrelated tasks.

**6. Split a module only when the split reduces real complexity.**
If candidate sub-modules would share most of the same imports, the split adds boilerplate without benefit. A valid reason to split: a new service has zero dependency overlap with the existing module, or unit test isolation is actively blocked. Otherwise keep the module together and document why in the task that introduces the new service.

Reason:
Architectural audit after TASK-035B revealed concrete violations of NestJS module boundary best practices. The rules above are derived from those findings and apply to all future modules added to the project.

Source: TASK-035C audit findings.

## ADR-018 — current_work_block was designed in TASK-032 spec but omitted from implementation

Status: `Accepted`

Decision:
`current_work_block` is part of the `Prompt2CvContent` contract as specified in `docs/08_ai_pipeline.md §10.4` and required by `CvContent` (the renderer input contract). It was not added to `Prompt2CvContent` or `FAKE_PROMPT2_JSON` during TASK-032 implementation. TASK-032A adds it as a schema-only fix without retroactively changing any other TASK-032 acceptance criteria.

`Prompt2CurrentWorkBlock` mirrors `CvCurrentWorkBlock` with `priority: string` (not a union) consistent with the loose-typing pattern used elsewhere in prompt2.schema.ts. The `purpose` field present in the docs JSON example is intentionally omitted from the TypeScript type — it is an AI-internal annotation not consumed by the renderer.

Reason:
The gap was discovered during TASK-035 implementation review. Fixing it in isolation (TASK-032A) keeps TASK-032 history clean and avoids mixing a schema fix into the renderer task.

Source: TASK-032A gap analysis.

## ADR-016 — change_to_skip keeps status at paused_after_analysis until artifacts exist

Status: `Accepted`

Decision:
The `change_to_skip` review action sets `currentDecision = skip` and `reviewState = overridden`
but leaves `status = paused_after_analysis`. The transition to `status = skipped` happens
only when skip artifacts (01_skip_reason.md/json) are physically created (TASK-029).

Reason:
Status `skipped` implies artifacts exist on disk. Setting it before artifact creation
leaves the workspace in an inconsistent state. Two-step approach: decision first (TASK-028),
artifacts + final status transition second (TASK-029).
Source: derived and confirmed during TASK-028 implementation.