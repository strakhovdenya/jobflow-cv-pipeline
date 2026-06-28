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