# Current Task

No active task.

**TASK-097** (Wire `KnowledgeSourceContentService` into `CoverLetterInputBuilderService` for the
cover letter input builder, last task of EPIC-23/Phase 16's placeholder-replacement track) is DONE
(2026-08-08) — see `project-management/completed-tasks/TASK-097-wire-coverletter-knowledge-content.md`
and the 2026-08-08 `TEST_LOG.md` entry. `buildCoverLetterInput` now embeds real knowledge-source
content (`contentAvailable: true`) or a labeled `unavailableReason` stub (`contentAvailable: false`)
instead of the `[content not loaded in MVP]` placeholder; a hash-mismatch rejection from
`loadContent()` propagates uncaught. `buildCoverLetterInput`'s public signature and `sourceSnapshot`'s
persisted shape are unchanged. `content not loaded in MVP` no longer appears anywhere in
`apps/api/src` (repo-wide grep), closing EPIC-23's first Acceptance Criterion in full.

Also completed the deferred real-provider spot-check (EPIC-23's fourth Acceptance Criterion): found
and fixed stale pre-monorepo-move `KnowledgeSource.filePath` rows in the dev DB, then ran real
OpenAI Prompt 1 + Prompt 2 against a live workspace, confirming real content loading (5x/3.4x token
increases vs. the placeholder-era baseline) but hitting the org's 30,000 TPM tier limit — worked
around by temporarily narrowing the active knowledge-source set per call. The resulting
`needs_evidence`/critical-issue counts are not a like-for-like comparison against the pre-TASK-094
baseline as a result; full reasoning is in `TEST_LOG.md`'s 2026-08-08 entry, and the TPM limit is
tracked as a non-blocking follow-up, not a defect.

No further task selected — per Operating Rules, task selection is not automatic. Recommended
next: **TASK-098** (add `ApplicationWorkspace.manualNote` field and
`POST /workspaces/:id/manual-note` endpoint) — independent of TASK-094/095/096/097, first task of
EPIC-23's second track (manual note injection). See `project-management/TASK_BOARD.md`'s "Current
Focus" section for the full picture.
