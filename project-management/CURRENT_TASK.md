# Current Task

## TASK-PH-021 — Wrap unguarded vacancy-source reads in try/catch across prompt2 and cover-letter input builders

User-selected 2026-07-15 (Phase PH-2 — Production Hardening Follow-ups).

## Status

DONE (closed 2026-07-15).

## Context

Discovered during code review of TASK-049 (PR #83). Both
`src/pipeline/prompt2/prompt2-input-builder.service.ts` (`buildPrompt2Input`) and
`src/pipeline/cover-letter/cover-letter-input-builder.service.ts` (`buildCoverLetterInput`) read
`00_vacancy_source.txt` via a bare `await this.artifactStorage.readFile(vacancySourcePath)` with no
`try/catch`, while every other artifact read in those same files is wrapped and rethrows
`BadRequestException`. A missing/moved vacancy source file currently produces an unhandled 500
instead of a controlled 400. The gap was pre-existing in `prompt2-input-builder.service.ts`; TASK-049
copied the same unwrapped pattern into the new cover-letter builder rather than introducing it fresh.

## Docs to Read

- `src/pipeline/prompt2/prompt2-input-builder.service.ts` — `buildPrompt2Input()`.
- `src/pipeline/cover-letter/cover-letter-input-builder.service.ts` — `buildCoverLetterInput()`, and
  its existing wrap style for the `02_targeted_cv_content.json` read (the pattern to mirror).

## Key Invariants

- No change to the happy path — only the missing-file error path changes from an unhandled 500 to a
  controlled `BadRequestException` (400).
- Error message style mirrors each file's existing wrapped-read messages.

## Acceptance Criteria

- [x] `prompt2-input-builder.service.ts`'s vacancy-source read wrapped in try/catch, rethrows
      `BadRequestException('Vacancy source artifact not found (00_vacancy_source.txt).')`.
- [x] `cover-letter-input-builder.service.ts`'s vacancy-source read wrapped identically.
- [x] New test in `prompt2-input-builder.service.spec.ts`: missing `00_vacancy_source.txt` throws
      `BadRequestException` specifically (not just a generic throw).
- [x] New test in `cover-letter-input-builder.service.spec.ts`: same assertion.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated.
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-021 ..."`
3. `git push -u origin task/TASK-PH-021-vacancy-source-read-error-handling`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
