# Current Task

## TASK-PH-020 — Fix cover letter draft creation failure handling and missing subject in markdown

User-selected 2026-07-15 (Phase PH-2 — Production Hardening Follow-ups).

## Status

DONE (closed 2026-07-15).

## Context

Discovered during code review of TASK-049 (PR #83, `src/pipeline/cover-letter/cover-letter.service.ts`).
Two correctness bugs:

1. `CoverLetterService.generateCoverLetter()` calls `coverLetterDraftsService.create(...)` with no
   `try/catch`, *after* `workspace.status` has already been persisted to `cover_letter_generated`
   and after `PromptRun`/`AiRun` have already been marked complete. If `create()` throws (workspace
   deleted mid-request, transient DB error), the exception propagates uncaught to the HTTP caller —
   but `cover_letter.md`/`.json` are already written+registered and `workspace.status` is already
   `cover_letter_generated`, with no `CoverLetterDraft` row created. A retry via the same endpoint
   then also fails: `CoverLetterInputBuilderService` only allows `workspace.status` in
   `[cv_pdf_generated, final_check_ready]`, so the workspace is permanently stuck.
2. `buildMarkdown()` never renders `data.subject` into `cover_letter.md` — only `greeting`/
   `body_paragraphs`/`closing` are used. `subject: string | null` is a real schema field a real AI
   provider can populate; it silently disappears from the human-readable `.md` artifact (still
   present in `.json`). `FAKE_COVER_LETTER_JSON` always sets `subject: null`, so this has zero test
   coverage today.

**Approach decided (per backlog's "confirm in CURRENT_TASK.md" instruction):** reorder +
try/catch (not status-rollback). Move `coverLetterDraftsService.create()` to run *before* the
`workspaceStatusService.assertValidTransition()` + `prisma.applicationWorkspace.update()` status
flip, and wrap it in try/catch returning a structured failure result (mirroring the existing
provider-error/validation-failure return shape) instead of letting it propagate. At the point
`create()` runs, `workspace.status` is still `cv_pdf_generated`/`final_check_ready` (never
`skipped`), so `CoverLetterDraftsService.create()`'s own skip-guard cannot spuriously fire — only
genuine failures (workspace deleted, DB error) throw. `PromptRun`/`AiRun` remain
`completed`/`success` (the AI generation genuinely succeeded; only draft-linking bookkeeping
failed). Net effect: on this failure, `workspace.status` never changes, so a client can retry
`POST .../generate-cover-letter` cleanly (a new `PromptRun` is created on retry — acceptable,
matches how other steps behave on retry).

## Docs to Read

- `src/pipeline/cover-letter/cover-letter.service.ts` — full file, especially the tail of
  `generateCoverLetter()` (status transition + draft creation) and `buildMarkdown()`.
- `src/cover-letters/cover-letter-drafts.service.ts` `create()` — confirms the only throw paths are
  `NotFoundException` (workspace not found) and the `skipped`-status `BadRequestException` (which
  cannot fire here given the reordering).
- `src/pipeline/prompt5/prompt5.service.ts` — existing provider-error/validation-failure return
  shape this task's new failure path should mirror.

## Key Invariants

- `PromptRun`/`AiRun` must NOT be marked failed by a draft-creation failure — the AI generation and
  artifact writes genuinely succeeded; only report `success: false` in the returned result.
- `workspace.status` must remain unchanged on draft-creation failure, so retry via the same endpoint
  works without a manual override.
- The no-subject markdown output must stay byte-identical to today's output (existing tests should
  not need updating for that case).

## State Machine

| Action | Precondition | `workspace.status` after | Notes |
|---|---|---|---|
| `generateCoverLetter()`, AI + validation succeed, `coverLetterDraftsService.create()` succeeds | `status` in `[cv_pdf_generated, final_check_ready]` | `cover_letter_generated` | Unchanged from today |
| `generateCoverLetter()`, AI + validation succeed, `coverLetterDraftsService.create()` throws | `status` in `[cv_pdf_generated, final_check_ready]` | unchanged (stays `cv_pdf_generated`/`final_check_ready`) | **New**: `success: false` returned, no exception propagates, retry-safe |

## Acceptance Criteria

- [x] `coverLetterDraftsService.create()` call moved before the `workspace.status` transition in
      `generateCoverLetter()`.
- [x] The call is wrapped in try/catch; on failure, returns `{ success: false, promptRunId, aiRunId,
      workspaceStatus: <unchanged>, validationError: <message> }` instead of throwing.
- [x] `buildMarkdown()` renders a `**Subject:** <value>` line (placement: right after the title, before
      the greeting) when `data.subject` is non-null; renders nothing extra when `null`.
- [x] New test: draft-creation failure path — asserts `success: false`, `workspaceStatus` unchanged,
      no exception thrown, `promptRuns.complete`/`aiRuns.saveSuccess` still called (AI step itself
      succeeded).
- [x] New test: non-null `subject` renders into the markdown output (built inline in the test).
- [x] Existing tests (including the no-subject markdown case) still pass unmodified.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated.
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-020 ..."`
3. `git push -u origin task/TASK-PH-020-cover-letter-draft-failure-handling`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
