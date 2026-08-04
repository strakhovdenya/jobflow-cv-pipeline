# Current Task

No active task.

**TASK-090** (close open Dependabot security alerts: apps/web next+sharp, apps/api
ip-address+fast-uri) is DONE (2026-08-04, merged via PR #160) — see
`project-management/completed-tasks/TASK-090-security-alert-cleanup.md` and the 2026-08-04
`TEST_LOG.md` entry. Bumped `apps/web`'s `next` to 16.3.0 (also resolving `sharp` to 0.35.3),
`apps/api`'s `fast-uri` override to `^4.1.2` and added an `ip-address` override at `^10.4.0`, and
flipped CI's `dependabot-gate` `apps/web` step back to blocking. Post-merge re-check confirmed all
13 targeted alerts (#27–#36, #39–#41) now `fixed` — fully closed, no open items remain from this
task. That same re-check surfaced 6 new alerts (postcss/undici) not present before the merge —
filed as **TASK-092** (see `docs/07_task_backlog.md`) rather than fixed inline.

Recommended next: the **TASK-073 epic's single final PR** from `task/TASK-073-redesign-base` into
`main` (per ADR-025) — no further sub-task work remains. Awaiting explicit user go-ahead before
opening it. TASK-092 is also available whenever the project owner wants to pick it up. (Both
unrelated to TASK-090, which branched directly off `main`.)
