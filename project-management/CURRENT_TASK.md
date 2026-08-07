# Current Task

No active task.

**TASK-095** (Wire `KnowledgeSourceContentService` into `PromptInputBuilderService` for Prompt 1,
second task of EPIC-23/Phase 16) is DONE (2026-08-07) — see
`project-management/completed-tasks/TASK-095-wire-prompt1-knowledge-content.md` and the
2026-08-07 `TEST_LOG.md` entry. `buildPrompt1Input` now embeds real knowledge-source content
(`contentAvailable: true`) or a labeled `unavailableReason` stub (`contentAvailable: false`)
instead of the `[content not loaded in MVP]` placeholder; a hash-mismatch rejection from
`loadContent()` propagates uncaught. `buildPrompt1Input`'s public signature, `Prompt1Service`, and
`sourceSnapshot`'s persisted shape are all unchanged.

No further task selected — per Operating Rules, task selection is not automatic. Recommended
next: **TASK-096** (wire `KnowledgeSourceContentService` into `Prompt2InputBuilderService` for
Prompt 2) — same content/stub rendering approach as TASK-095, but selection happens internally in
that service and its spec constructs the class directly (not via a `TestingModule`), so all 11
existing tests need their instantiation updated for the new 4th constructor param. See
`project-management/TASK_BOARD.md`'s "Current Focus" section for the full picture.
