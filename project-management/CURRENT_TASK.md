# Current Task

## TASK-049 — Implement cover letter generation step

User-selected 2026-07-15 (Phase 10 continuation — Cover Letter & Recruiter Message).

## Status

DONE (closed 2026-07-15).

## Context

TASK-048 added the `CoverLetterDraft` Prisma model and `CoverLetterDraftsService.create()`
(service-only, no controller). This task adds the actual AI generation step: a new
`CoverLetterInputBuilderService`/`CoverLetterService` pair under `src/pipeline/cover-letter/`,
following the same shape as `Prompt5Service`/`Prompt5InputBuilderService` (input builder guards
workspace status, orchestrator runs PromptRun/AiRun lifecycle, writes artifacts, transitions
workspace status, then registers a `CoverLetterDraft` row via `CoverLetterDraftsService.create()`).

**Scope decisions confirmed with user before implementation:**
- **HTTP endpoint**: included now — `POST /workspaces/:id/generate-cover-letter`, added directly to
  `WorkspacesController` (matching the existing pattern for Prompt 1/2/3/5, which live in
  `WorkspacesController` rather than per-step controllers).
- **PDF export**: deferred. This task writes `cover_letter.md`/`cover_letter.json` only.
  `cover_letter.pdf` requires an intermediate HTML artifact not in the canonical artifact list
  (CLAUDE.md Artifact Rules) — that naming question is left for a follow-up task.
- **Workspace status gate/transition**: precondition is `workspace.status` in
  `[cv_pdf_generated, final_check_ready]`; on success, transitions to `cover_letter_generated`
  via `WorkspaceStatusService.assertValidTransition()` (new transitions added to
  `WorkspaceStatusService.TRANSITIONS`, unlike Prompt3/5 which set status directly without going
  through that service).

## Docs to Read

- `docs/08_ai_pipeline.md` section 15 (`## 15. Cover Letter / Recruiter Message Step, Phase 2`,
  run conditions/inputs/JSON output/safety checks/status transition).
- `src/pipeline/prompt5/prompt5.service.ts` and `prompt5-input-builder.service.ts` — the closest
  existing pattern (optional step, guards a specific workspace status, writes md+json, transitions
  status on success only, keeps status unchanged on failure).
- `src/cover-letters/cover-letter-drafts.service.ts` `create()` — the existing TASK-048 service this
  task calls after a successful generation.
- `src/workspaces/workspace-status.service.ts` `TRANSITIONS` map — the transitions this task adds to.

## Key Invariants

- `cover_letter.pdf` is out of scope this task (see Context above).
- Failure paths (AI provider error or JSON validation failure) leave `workspace.status` unchanged
  and do not create a `CoverLetterDraft` row — mirrors Prompt 5's failure handling.
- `CoverLetterDraftsService.create()` is called only after a successful generation, linking
  `promptRunId` for audit trail (TASK-048's loose-scalar-FK pattern).

## State Machine

| Action | Precondition | `status` after | Notes |
|---|---|---|---|
| `generateCoverLetter()` called, workspace found, `status` in `[cv_pdf_generated, final_check_ready]`, AI + JSON validation succeed | workspace exists | `cover_letter_generated` | `CoverLetterDraft` row created, artifacts registered |
| `generateCoverLetter()` called, `status` not in `[cv_pdf_generated, final_check_ready]` | workspace exists | unchanged | Throws `BadRequestException`, no artifacts written |
| `generateCoverLetter()` called, AI provider error or JSON validation failure | workspace exists | unchanged | `cover_letter.md` still written (raw fallback) when validation fails; no `CoverLetterDraft` row |
| `generateCoverLetter()` called, workspace not found | — | — | Throws `NotFoundException` |

## Acceptance Criteria

- [x] `cover-letter.schema.ts` + `validateCoverLetterJson()` added, matching docs §15.4 JSON shape.
- [x] `CoverLetterInputBuilderService.buildCoverLetterInput()` guards workspace status
      (`cv_pdf_generated`/`final_check_ready`), reads `00_vacancy_source.txt`,
      `01_vacancy_analysis.json` (optional), `02_targeted_cv_content.json` (required), and
      `profile_summary`/`cv_rules` knowledge sources via a new `cover_letter` step group in
      `KnowledgeSourceSelectionService`.
- [x] `CoverLetterService.generateCoverLetter()` runs the full PromptRun/AiRun lifecycle, writes
      `cover_letter.md`/`cover_letter.json`, transitions workspace status to
      `cover_letter_generated` on success, and creates a `CoverLetterDraft` row.
- [x] `POST /workspaces/:id/generate-cover-letter` endpoint added to `WorkspacesController`,
      Swagger-documented (`@ApiOperation`).
- [x] `FakeAiProvider` gained a `cover_letter` step fixture (`FAKE_COVER_LETTER_JSON`).
- [x] `prisma/prompts/cover_letter.txt` placeholder + active `cover_letter` `PromptTemplate` seeded
      in `prisma/seed.ts`.
- [x] Service tests: success path, invalid-JSON path, AI-provider-failure path, workspace-not-found,
      missing-template (mirrors `prompt5.service.spec.ts` coverage).
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green.
- [x] Manual smoke test: full HTTP flow driven end-to-end with fake provider through
      `generate-cover-letter`, confirmed `cover_letter.md`/`.json` on disk and workspace status
      `cover_letter_generated`.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated.
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-049 ..."`
3. `git push -u origin task/TASK-049-cover-letter-generation-step`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
