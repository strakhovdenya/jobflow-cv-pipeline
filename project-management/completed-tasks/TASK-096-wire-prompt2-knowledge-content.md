# Current Task

## TASK-096 — Wire KnowledgeSourceContentService into Prompt2InputBuilderService (Prompt 2)

**Status:** DONE
**Branch:** `task/TASK-096-wire-prompt2-knowledge-content`
**Epic:** EPIC-23 (Phase 16), third task — see `docs/07_task_backlog.md`.

### Context

Unlike Prompt 1, `Prompt2InputBuilderService.buildPrompt2Input()`
(`prompt2-input-builder.service.ts`) performs knowledge-source selection **internally**
(`knowledgeSourcesService.findActive()` then `selectionService.selectForStep('prompt_2',
activeSources)`, lines 91-95) rather than receiving an already-filtered list from its caller. The
placeholder block being replaced is at lines 97-105
(`` `[Source: ${sourceType} | ${filePath}]\n[content not loaded in MVP]` ``). This service also has
the regenerate-notes logic (TASK-029/ADR-029) that appends a `PREVIOUS CV DRAFT`/`USER FEEDBACK FOR
REGENERATION` block — this task must not disturb that logic or its existing tests' behavior, only
the knowledge-sources block.

`Prompt2InputBuilderService`'s existing spec constructs the service directly
(`new Prompt2InputBuilderService(artifactStorage, knowledgeSourcesMock, selectionMock)`, not via a
Nest `TestingModule`) — adding a 4th constructor parameter means every existing test in that file
needs its instantiation updated, not just new tests added.

### Files Affected

```text
apps/api/src/pipeline/prompt2/prompt2-input-builder.service.ts
apps/api/src/pipeline/prompt2/prompt2-input-builder.service.spec.ts
```

### Docs to Read

- `apps/api/src/knowledge-sources/knowledge-source-content.service.ts` (from TASK-094) — exact
  `loadContent()` signature and `KnowledgeSourceContentEntry` shape.
- `apps/api/src/pipeline/prompt2/prompt2-input-builder.service.ts` lines 39-168 — full current
  `buildPrompt2Input`, including the exact placeholder block (97-105) and the regenerate-block
  logic (107-129) that must stay untouched and keep working after the constructor gains a new
  dependency.
- `apps/api/src/pipeline/prompt2/prompt2-input-builder.service.spec.ts` — full existing spec (11
  test cases); note the direct `new Prompt2InputBuilderService(...)` construction pattern (not a
  `TestingModule`) that every test relies on via `beforeEach`.
- TASK-095's merged diff to `prompt-input-builder.service.ts` — reuse the same
  content-vs-`contentAvailable`-stub rendering approach for consistency between Prompt 1 and Prompt
  2's knowledge-source blocks, rather than inventing a second wording/format.
- `apps/api/src/knowledge-sources/knowledge-sources.module.ts` and
  `apps/api/src/pipeline/pipeline.module.ts` — confirms `KnowledgeSourcesModule` already exports
  `KnowledgeSourceContentService` and is already imported by `PipelineModule` — no module-file
  changes expected in this task.

### Key Invariants

- `buildPrompt2Input`'s public signature (`workspace`, `templateContent`, `templateVersion`,
  `regenerateNotes?`) does not change.
- The regenerate-notes block (`PREVIOUS CV DRAFT` / `USER FEEDBACK FOR REGENERATION`) and its
  existing status-based gating (`ALLOWED_STATUSES`, `isRegenerate`) are untouched by this task —
  only the knowledge-sources block changes.
- A hash-mismatch error from `KnowledgeSourceContentService.loadContent()` must propagate out of
  `buildPrompt2Input` uncaught, same as TASK-095's Prompt 1 behavior.
- `sourceSnapshot.knowledgeSources`' persisted shape (`id`/`filePath`/`sourceType`/`contentHash`/
  `versionLabel`) is unchanged — do not add loaded content to it.
- Do not change `ALLOWED_STATUSES` or any status-gate behavior — this task only replaces the
  placeholder content string.

### Acceptance Criteria

- [x] `Prompt2InputBuilderService`'s constructor injects `KnowledgeSourceContentService` as a 4th
      dependency.
- [x] The knowledge-sources block uses real content for `contentAvailable: true` entries and the
      same labeled stub format TASK-095 established for `contentAvailable: false` entries
      (binary/PDF case).
- [x] A hash-mismatch exception from the mocked `loadContent` propagates out of
      `buildPrompt2Input`.
- [x] All 11 existing test cases in `prompt2-input-builder.service.spec.ts` still pass once updated
      for the new constructor parameter — in particular the regenerate-notes tests
      (`'allows regenerating from %s...'`, `'regenerates without notes...'`,
      `'does not include the regenerate blocks on a first-time generation...'`) must show
      unchanged behavior.
- [x] The literal string `content not loaded in MVP` no longer appears anywhere in
      `prompt2-input-builder.service.ts`.

### Test Requirement

- Update every test's setup in `prompt2-input-builder.service.spec.ts` to pass a
  `KnowledgeSourceContentService` mock into `new Prompt2InputBuilderService(...)`, returning
  content matching `makeKnowledgeSources()`'s single `master_cv` fixture (so the existing
  `'Master_CV_RU.md'` assertion at line 111 keeps passing with real content, not just the filename
  reference).
- Add a new test: a `contentAvailable: false` mocked entry renders the stub, not raw content.
- Add a new test: `loadContent` mocked to reject causes `buildPrompt2Input` to reject with the same
  error.

### Done Definition

`npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/api) all green, including
`prompt2.service.spec.ts` (which mocks `Prompt2InputBuilderService` as a whole and should be
unaffected) and `evidence-guard.service.spec.ts` (unaffected — operates on Prompt 2's *output*
schema, not its input builder).

**Dependencies:** TASK-094 must be merged first (already merged, PR #171). Should follow TASK-095
(not strictly required, but keeps the placeholder/stub wording consistent across both input
builders without a later rename) — TASK-095 already merged.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-096 ..."`
3. `git push -u origin task/TASK-096-wire-prompt2-knowledge-content`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

### Progress Notes

Implementation matched this spec exactly — no divergence. `buildPrompt2Input` now calls
`await this.knowledgeSourceContent.loadContent(knowledgeSources)` inside the existing ternary
(only when `knowledgeSources.length > 0`), mapping each returned entry to either
`[Source: type | path]\ncontent` (available) or `[Source: type | path]\n[Content unavailable:
reason]` (unavailable), joined with `\n\n` — identical structure and wording to TASK-095's Prompt 1
implementation. `sourceSnapshot` continues to be built from the raw `knowledgeSources` parameter
(unchanged shape), never touching the loaded-content entries. The regenerate-notes block
(`PREVIOUS CV DRAFT`/`USER FEEDBACK FOR REGENERATION`) and `ALLOWED_STATUSES` gating were not
touched. No `*.module.ts` changes were needed — `KnowledgeSourcesModule` already exported
`KnowledgeSourceContentService` and `PipelineModule` already imported `KnowledgeSourcesModule`.
Verified: apps/api full suite 670/670 (13 tests in `prompt2-input-builder.service.spec.ts`, up
from 11 — 2 new tests for the stub-rendering and hash-mismatch-propagation cases), `tsc --noEmit`/
`lint` clean, `content not loaded in MVP` grep-clean in the target file.
