# Current Task

No active task.

**TASK-096** (Wire `KnowledgeSourceContentService` into `Prompt2InputBuilderService` for Prompt 2,
third task of EPIC-23/Phase 16) is DONE (2026-08-07) — see
`project-management/completed-tasks/TASK-096-wire-prompt2-knowledge-content.md` and the
2026-08-07 `TEST_LOG.md` entry. `buildPrompt2Input` now embeds real knowledge-source content
(`contentAvailable: true`) or a labeled `unavailableReason` stub (`contentAvailable: false`)
instead of the `[content not loaded in MVP]` placeholder; a hash-mismatch rejection from
`loadContent()` propagates uncaught. `buildPrompt2Input`'s public signature, the regenerate-notes
block (ADR-029), and `sourceSnapshot`'s persisted shape are all unchanged.

No further task selected — per Operating Rules, task selection is not automatic. Recommended
next: **TASK-097** (wire `KnowledgeSourceContentService` into `CoverLetterInputBuilderService` for
the cover letter input builder) — same internal-selection/direct-construction pattern as Prompt 2;
last of the three placeholder-replacement tasks, closes this epic's first AC in full once merged.
See `project-management/TASK_BOARD.md`'s "Current Focus" section for the full picture.
