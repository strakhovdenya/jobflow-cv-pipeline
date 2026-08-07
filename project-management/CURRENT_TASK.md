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

**Scope note (2026-08-07, same PR #171):** after TASK-094 closed, the project owner explicitly
asked to also fix a newly-surfaced Dependabot alert (`js-yaml` quadratic-CPU DoS, CVE-2026-59870,
`apps/web/package-lock.json`, GHSA-5p4m-2wfm-xmqj) in this same PR rather than as a separate task,
despite this being unrelated `apps/web`-only scope (normally TASK-090/092/093 precedent). Pinned
via `apps/web/package.json`'s existing `overrides` block (`"js-yaml": "^4.3.1"`, the first patched
version — affected range was `>=4.0.0 <4.3.1`, a transitive dev dependency via
`eslint@9.39.5 → @eslint/eslintrc → js-yaml`). `npm audit --omit=dev --audit-level=high` now 0
vulnerabilities; `apps/web` `tsc --noEmit`/`lint`/`test` (223/223)/`build` all clean.
