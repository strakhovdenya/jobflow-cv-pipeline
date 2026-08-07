# Current Task

## TASK-095 — Wire KnowledgeSourceContentService into PromptInputBuilderService (Prompt 1)

**Status:** DONE
**Branch:** `task/TASK-095-wire-prompt1-knowledge-content`
**Epic:** EPIC-23 (Phase 16), second task — see `docs/07_task_backlog.md`.

### Context

`PromptInputBuilderService.buildPrompt1Input()` (`prompt-input-builder.service.ts:57-65`)
currently builds each knowledge source's block as `[Source: ${sourceType} | ${filePath}]\n[content
not loaded in MVP]`. This task replaces that with real content loaded via TASK-094's
`KnowledgeSourceContentService`, injected into this service. `Prompt1Service` (the sole caller,
`prompt1.service.ts:71-90`) already performs `selectionService.selectForStep('prompt_1',
activeSources)` itself and passes the resulting filtered `KnowledgeSource[]` into
`buildPrompt1Input()` — this task does not touch `Prompt1Service` or change `buildPrompt1Input`'s
public signature.

### Files Affected

```text
apps/api/src/pipeline/prompt-input-builder.service.ts
apps/api/src/pipeline/prompt-input-builder.service.spec.ts
```

### Docs to Read

- `apps/api/src/knowledge-sources/knowledge-source-content.service.ts` (TASK-094, merged) — exact
  `loadContent()` signature and the `KnowledgeSourceContentEntry` shape
  (`contentAvailable: true/false`, `content`/`unavailableReason`).
- `apps/api/src/pipeline/prompt-input-builder.service.ts` lines 34-84 — the full current
  `buildPrompt1Input`, including the exact placeholder block being replaced.
- `apps/api/src/pipeline/prompt1/prompt1.service.ts` lines 71-90 — confirms selection happens in
  the caller before `buildPrompt1Input` is invoked; the `knowledgeSources` parameter is already the
  filtered list, unchanged by this task.
- `apps/api/src/knowledge-sources/knowledge-sources.module.ts` and
  `apps/api/src/pipeline/pipeline.module.ts` lines 8, 33 — confirms `KnowledgeSourcesModule` is
  already imported by `PipelineModule`, so `KnowledgeSourceContentService` becomes injectable here
  once TASK-094 exports it — no module-file changes expected in this task.
- `apps/api/src/pipeline/prompt-input-builder.service.spec.ts` — full existing spec, to see which
  tests assert on the placeholder/metadata block and need updating vs. which are unaffected
  (workspace metadata, vacancy text, promptText passthrough, sourceSnapshot shape).

### Key Invariants

- `buildPrompt1Input`'s public signature (`workspace`, `templateContent`, `knowledgeSources`) does
  not change — `Prompt1Service` is unaffected.
- The `[No active knowledge sources available]` fallback for an empty `knowledgeSources` array is
  unchanged.
- A hash-mismatch error thrown by `KnowledgeSourceContentService.loadContent()` must propagate out
  of `buildPrompt1Input` uncaught — Prompt 1 analysis must fail loudly on stale/tampered content,
  not silently degrade to placeholder text (mirrors this epic's AC: a mismatch must be "surfaced,
  not silently ignored").
- `sourceSnapshot`'s persisted JSON shape (`id`/`filePath`/`sourceType`/`contentHash`/
  `versionLabel`) is unchanged — do not embed the loaded file content into the DB-persisted
  snapshot; content only lives in the ephemeral `inputContext` string sent to the AI provider,
  keeping `PromptRun` rows small.

### Acceptance Criteria

- [x] `PromptInputBuilderService`'s constructor injects `KnowledgeSourceContentService`.
- [x] `buildPrompt1Input` calls `loadContent(knowledgeSources)` once and, for each entry with
      `contentAvailable: true`, embeds its real `content` in the `=== KNOWLEDGE SOURCES ===` block in
      place of `[content not loaded in MVP]`.
- [x] For an entry with `contentAvailable: false` (the binary/PDF case), embeds a clearly-labeled stub
      referencing `unavailableReason` instead of either the old placeholder or raw content.
- [x] A hash-mismatch exception thrown by the mocked `loadContent` in a test propagates out of
      `buildPrompt1Input` (i.e. the call rejects) rather than being swallowed.
- [x] An empty `knowledgeSources` array still renders `[No active knowledge sources available]` and
      does not error.
- [x] The literal string `content not loaded in MVP` no longer appears anywhere in
      `prompt-input-builder.service.ts`.

### Test Requirement

- Update `prompt-input-builder.service.spec.ts`: add a `KnowledgeSourceContentService` mock
  provider to the existing `TestingModule` (mirroring how `ArtifactStorageService` is already
  mocked there).
- Update the existing `'includes knowledge source metadata in inputContext'` test (or split into a
  new test) to assert the block contains the mocked real `content` string, not just
  `sourceType`/`filePath`.
- Add a new test: a `contentAvailable: false` mocked entry renders its `unavailableReason` stub,
  not raw/garbled content.
- Add a new test: `loadContent` mocked to reject (simulating a hash mismatch) causes
  `buildPrompt1Input` to reject with the same error.
- Existing tests for workspace metadata, vacancy text, `promptText` passthrough, `sourceSnapshot`
  shape, and the empty-array placeholder must all continue passing unmodified in behavior (only the
  mock setup changes).

### Done Definition

`npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/api) all green. `content not loaded in MVP`
no longer appears in `prompt-input-builder.service.ts`. `Prompt1Service`'s own spec
(`prompt1.service.spec.ts`) still passes unmodified, since it mocks `PromptInputBuilderService` as
a whole and never exercises its internals.

**Dependencies:** TASK-094 (`KnowledgeSourceContentService`) must be merged first — already merged
(PR #171).

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-095 ..."`
3. `git push -u origin task/TASK-095-wire-prompt1-knowledge-content`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not select the next task automatically.

### Progress Notes

Implementation matched this spec exactly — no divergence. `buildPrompt1Input` now calls
`await this.knowledgeSourceContent.loadContent(knowledgeSources)` inside the existing ternary
(only when `knowledgeSources.length > 0`), maps each returned entry to either
`[Source: type | path]\ncontent` (available) or `[Source: type | path]\n[Content unavailable:
reason]` (unavailable), and joins with `\n\n` — identical structure to the placeholder it
replaced. `sourceSnapshot` continues to be built from the raw `knowledgeSources` parameter, never
touching the loaded-content entries. Verified: apps/api full suite 668/668 (3 new tests in
`prompt-input-builder.service.spec.ts`), `tsc --noEmit`/`lint` clean, `content not loaded in MVP`
grep-clean in the target file.
