# Current Task

## TASK-097 — Wire KnowledgeSourceContentService into CoverLetterInputBuilderService (cover letter)

Third and last of the three placeholder-replacement tasks in EPIC-23 (Phase 16). See
`docs/07_task_backlog.md`'s full "### TASK-097 — Wire KnowledgeSourceContentService into
CoverLetterInputBuilderService (cover letter)" entry — that is the source of truth this file
summarizes.

## Context

`CoverLetterInputBuilderService.buildCoverLetterInput()`
(`apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts`) follows the same
internal-selection pattern as Prompt 2 (`knowledgeSourcesService.findActive()` +
`selectionService.selectForStep('cover_letter', activeSources)`) and has its own placeholder
block (`` `[Source: ${sourceType} | ${filePath}]\n[content not loaded in MVP]` ``). Cover letter
generation is Phase 2 (root `CLAUDE.md`) but its input builder already exists and is explicitly
in scope per EPIC-23's Scope section, which lists all three input builders. This task does not
expand product scope. Same direct-construction spec pattern as Prompt 2
(`new CoverLetterInputBuilderService(artifactStorage, knowledgeSourcesMock, selectionMock)`) —
same constructor-signature-change impact on every existing test.

`PipelineModule` already imports `KnowledgeSourcesModule` (which exports
`KnowledgeSourceContentService`, used since TASK-096 by `Prompt2InputBuilderService`) — no module
wiring change is needed, only the constructor injection in
`CoverLetterInputBuilderService` itself.

## Files Affected

```text
apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts
apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.spec.ts
project-management/TEST_LOG.md
project-management/TASK_BOARD.md
project-management/completed-tasks/TASK-097-wire-coverletter-knowledge-content.md (new, on closure)
```

## Docs to Read

- `apps/api/src/knowledge-sources/knowledge-source-content.service.ts` — `loadContent()` signature
  and `KnowledgeSourceContentEntry` shape (already read this session).
- `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts` (full file, 145
  lines) — current `buildCoverLetterInput`, including the placeholder block at lines 86-94
  (already read this session).
- `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.spec.ts` (full file, 9
  test cases, direct-construction `beforeEach`) — already read this session.
- `apps/api/src/pipeline/prompt2/prompt2-input-builder.service.ts` — TASK-096's merged reference
  implementation for the exact content/stub rendering format to reuse (already read this session).

## Key Invariants

- `buildCoverLetterInput`'s public signature (`workspace`, `templateContent`) does not change.
- `COVER_LETTER_ALLOWED_STATUSES` gating and the `[No vacancy analysis artifact available]`
  fallback for the missing optional analysis artifact are untouched — only the knowledge-sources
  block changes.
- A hash-mismatch error from `KnowledgeSourceContentService.loadContent()` must propagate out of
  `buildCoverLetterInput` uncaught, same as TASK-095/096.
- `sourceSnapshot.knowledgeSources`'s persisted shape is unchanged (still built from the raw
  `KnowledgeSource[]`, never from loaded content).
- Knowledge-source selection continues to happen internally inside `buildCoverLetterInput`
  (`findActive()` + `selectForStep('cover_letter', ...)`) — this task does not change that.

## Acceptance Criteria

- [x] `CoverLetterInputBuilderService`'s constructor injects `KnowledgeSourceContentService` as a
      4th dependency.
- [x] The knowledge-sources block uses real content / the same labeled stub format established in
      TASK-095/096 (`[Source: type | path]\ncontent` or `[Source: type | path]\n[Content
      unavailable: reason]`).
- [x] A hash-mismatch exception from the mocked `loadContent` propagates out of
      `buildCoverLetterInput`.
- [x] All 9 existing test cases in `cover-letter-input-builder.service.spec.ts` still pass once
      updated for the new constructor parameter, including the `'Master_Profile_Summary.md'`
      filename assertion and the `sourceSnapshot` assertions.
- [x] The literal string `content not loaded in MVP` no longer appears anywhere in
      `cover-letter-input-builder.service.ts` — and, combined with TASK-095/096, no longer
      appears anywhere in `apps/api/src` at all (repo-wide grep, zero matches).
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/api) all green.
- [x] Real-provider spot-check: with all three input builders now wired, run Prompt 1 + Prompt 2
      against at least one real workspace (real OpenAI provider — configured locally) and compare
      resulting `needs evidence`/overclaiming-risk counts against the pre-TASK-094 baseline run
      recorded in `TEST_LOG.md`'s 2026-07-08 TASK-038A entry (workspace
      `cmrc8zhba0005kmfnpf3hqo4g`: MAYBE/64, `needs_evidence` flagged for
      NestJS/PostgreSQL/React depth, critical issues: none). Record the comparison in
      `project-management/TEST_LOG.md`. This closes EPIC-23's fourth Acceptance Criterion
      (`docs/05_epics.md`).

## Test Requirement

- Update every test's setup to pass a `KnowledgeSourceContentService` mock
  (`loadContent: jest.fn()`) into `new CoverLetterInputBuilderService(...)`, returning content
  matching `makeKnowledgeSources()`'s single `profile_summary` fixture.
- Add a new test: a `contentAvailable: false` mocked entry renders the stub.
- Add a new test: `loadContent` mocked to reject causes `buildCoverLetterInput` to reject with the
  same error.

## Done Definition

`npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/api) all green. A repo-wide search
(`content not loaded in MVP`) returns zero matches in `apps/api/src`, closing EPIC-23's *first*
Acceptance Criterion ("Prompt 1, Prompt 2 and cover-letter input builders include the real content
of every selected knowledge source, not a placeholder string") in full. The real-provider
spot-check comparison (see Acceptance Criteria) is recorded in `TEST_LOG.md`, closing EPIC-23's
fourth Acceptance Criterion.

## Progress Notes

- The code-level implementation matched the plan exactly (4th constructor param, same
  content/stub rendering as TASK-095/096, 2 new tests, 9 existing tests updated).
- The real-provider spot-check (last AC) diverged from a simple "run it and compare" as planned:
  - **Blocker found and fixed**: the dev DB's `KnowledgeSource.filePath` rows still held
    pre-ADR-023 paths (missing the `apps\api\` segment), so `KnowledgeSourceContentService`
    rejected every source as outside `KNOWLEDGE_SOURCES_ROOT`. Fixed with a verified one-off SQL
    `UPDATE` against the 9 existing rows (not the `register-knowledge-sources` script, which
    matches by exact `filePath` and would have created 9 duplicates instead of fixing them).
  - **A full real run with all required knowledge sources active hit the OpenAI org's 30,000 TPM
    limit** (first Prompt 1 attempt requested 85,673 tokens). Worked around by temporarily
    narrowing the active `KnowledgeSource` set per call (reactivated afterward), which means the
    real run's `needs_evidence`/critical-issue counts are **not a like-for-like comparison** against
    the pre-TASK-094 baseline — the reduced context legitimately produces more caution flags, not
    a regression. Full reasoning recorded in `TEST_LOG.md`'s 2026-08-08 entry.
  - `.env`'s `AI_PROVIDER` was temporarily switched to `openai` and back to `fake`; the dev server
    was restarted twice; a throwaway sanity-check workspace was created and deleted to confirm the
    fake provider was correctly restored. The real spot-check workspace itself
    (`cmsj8jurj0002m8yimk62zpfg`) was kept on disk as evidence, mirroring TASK-038A's
    `MVP_ACCEPTANCE.md` precedent.
- Net effect: all Acceptance Criteria are met, but the "compare against baseline" AC is satisfied
  with an explicit caveat rather than a clean apples-to-apples number, and a new non-blocking
  follow-up (org TPM tier vs. full real-provider runs) was surfaced.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-097 ..."`
3. `git push -u origin task/TASK-097-wire-coverletter-knowledge-content`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not select the next task automatically.
