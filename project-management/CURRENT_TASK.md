# Current Task

No active task.

**TASK-094** (Add KnowledgeSourceContentService: real content loading with hash verification,
first task of EPIC-23/Phase 16) is DONE (2026-08-07) — see
`project-management/completed-tasks/TASK-094-knowledge-source-content-service.md` and the
2026-08-07 `TEST_LOG.md` entry. New `KnowledgeSourceContentService` reads real `.md`/`.txt`
knowledge-source content from a new required `KNOWLEDGE_SOURCES_ROOT` env var (independent root
from `STORAGE_ROOT`), verifies it against `KnowledgeSource.contentHash`, and returns a
metadata-only stub for binary (`.pdf`) sources. Foundation only — nothing calls it yet.

No further task selected — per Operating Rules, task selection is not automatic. Recommended
next: **TASK-095** (wire `KnowledgeSourceContentService` into `PromptInputBuilderService` for
Prompt 1), the first of three downstream consumer tasks (TASK-095/096/097) that TASK-094
unblocked. See `project-management/TASK_BOARD.md`'s "Current Focus" section for the full picture.
