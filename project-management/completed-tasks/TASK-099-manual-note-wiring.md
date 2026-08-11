# Current Task

## TASK-099 — Wire manualNote into Prompt 1 / Prompt 2 / cover-letter input builders

**Status:** DONE (2026-08-11)
**Branch:** `task/TASK-099-manual-note-wiring`

### Context

TASK-098 added `ApplicationWorkspace.manualNote` and the endpoint to append to it, but nothing
reads it yet. This task threads it through all three input builders in one bundled task — unlike
the knowledge-source content work (TASK-095/096/097, three separate tasks because each builder has
genuinely different selection/regenerate logic), this is a small, uniform change: add one optional
field to each builder's workspace-context interface, pass `workspace.manualNote` from each calling
`*Service`, and conditionally append one labeled block to `inputContext` — the same shape change
repeated identically three times, not three distinct problems.

All three call sites (`Prompt1Service.runAnalysis`, `Prompt2Service.generateCvContent`,
`CoverLetterService.generateCoverLetter`) already fetch the full `ApplicationWorkspace` row via
`prisma.applicationWorkspace.findUnique(...)` before constructing their builder's context object
inline field-by-field — `workspace.manualNote` is already available on that fetched row with no
`include` change needed (it's a plain scalar column, not a relation).

### Files Affected

```text
apps/api/src/pipeline/prompt-input-builder.service.ts                     (WorkspaceInputContext + buildPrompt1Input)
apps/api/src/pipeline/prompt-input-builder.service.spec.ts
apps/api/src/pipeline/prompt1/prompt1.service.ts                          (pass workspace.manualNote)
apps/api/src/pipeline/prompt1/prompt1.service.spec.ts
apps/api/src/pipeline/prompt2/prompt2-input-builder.service.ts            (Prompt2WorkspaceContext + buildPrompt2Input)
apps/api/src/pipeline/prompt2/prompt2-input-builder.service.spec.ts
apps/api/src/pipeline/prompt2/prompt2.service.ts                          (pass workspace.manualNote)
apps/api/src/pipeline/prompt2/prompt2.service.spec.ts
apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts  (CoverLetterWorkspaceContext + buildCoverLetterInput)
apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.spec.ts
apps/api/src/pipeline/cover-letter/cover-letter.service.ts                (pass workspace.manualNote)
apps/api/src/pipeline/cover-letter/cover-letter.service.spec.ts
```

### Docs to Read

- `apps/api/src/pipeline/prompt1/prompt1.service.ts` lines 54-90 — confirms `workspace` (the full
  Prisma row) is already fetched before the builder call; `manualNote` needs no new `include`.
- `apps/api/src/pipeline/prompt2/prompt2.service.ts` lines 46-82, and
  `apps/api/src/pipeline/cover-letter/cover-letter.service.ts` lines 47-78 — same pattern, two more
  call sites.
- `apps/api/src/pipeline/prompt2/prompt2-input-builder.service.ts` lines 107-129 — the existing
  `regenerateBlock` conditional-array-push pattern (`isRegenerate ? [...] : []`) — reuse this same
  style for the new conditional manual-note block rather than inventing a different idiom.
- The three builders' current `inputContext` array-join structure
  (`prompt-input-builder.service.ts:67-77`, `prompt2-input-builder.service.ts:131-145`,
  `cover-letter-input-builder.service.ts:96-112`) — match the existing section-header style
  (`=== MANUAL NOTE ===`).

### Key Invariants

- `manualNote` is optional everywhere (`string | null | undefined`) — a workspace with no note
  attached yet must render exactly as it does today (no empty `=== MANUAL NOTE ===` header with
  nothing under it).
- Do not change TASK-098's append-only semantics — this task only *reads* `manualNote` as
  already-assembled text; it does not reformat or truncate it.
- Add `manualNote` to each workspace-context interface, not as a new positional parameter —
  `Prompt2InputBuilderService.buildPrompt2Input` already has a `regenerateNotes` optional
  positional parameter, and a second same-typed (`string | undefined`) positional parameter next
  to it would be easy to swap by mistake at call sites. Threading it through the context object
  instead is additive/non-breaking and matches how every other piece of workspace metadata
  (`companyNameOriginal`, `roleSlug`, etc.) already flows into these builders.
- This task does not modify `manualNote`'s own storage/append logic (TASK-098) or add any new
  endpoint.

### Acceptance Criteria

- [x] `WorkspaceInputContext`, `Prompt2WorkspaceContext`, and `CoverLetterWorkspaceContext` each
      gain an optional `manualNote?: string | null` field.
- [x] `Prompt1Service.runAnalysis`, `Prompt2Service.generateCvContent`,
      `CoverLetterService.generateCoverLetter` each pass `workspace.manualNote` into their
      respective builder call.
- [x] When `manualNote` is present (non-null, non-empty), each builder's `inputContext` includes a
      `=== MANUAL NOTE ===` section containing the full note text.
- [x] When `manualNote` is absent, `inputContext` is byte-for-byte identical to today's output (no
      empty section, no extra blank lines) — verified by an explicit regression test per builder.

### Test Requirement

- Each of the three `*-input-builder.service.spec.ts` files gains two new tests: one asserting the
  `=== MANUAL NOTE ===` block appears with the right content when `manualNote` is set, one
  asserting no such block appears when it's absent (and that all pre-existing tests, which don't
  set `manualNote`, continue passing unmodified).
- Each of the three `*.service.spec.ts` files (`prompt1.service.spec.ts`, `prompt2.service.spec.ts`,
  `cover-letter.service.spec.ts`) gains a test asserting `workspace.manualNote` from the mocked
  Prisma fetch is passed through to the builder call.

### Done Definition

`npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/api) all green. A manual end-to-end check
(fake AI provider): attach a manual note via TASK-098's endpoint, then run Prompt 1, Prompt 2, and
cover-letter generation on the same workspace, confirming the note text appears in each step's
persisted prompt input (visible via the stored `PromptRun`/inspecting the AI provider call in the
fake provider's captured input, since raw prompt input itself is not written to an artifact file).

### Dependencies

TASK-098 (`manualNote` field + endpoint) — merged (PR #185). Independent of the
TASK-094/095/096/097 knowledge-source-content track.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-099 ..."`
3. `git push -u origin task/TASK-099-manual-note-wiring`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.
