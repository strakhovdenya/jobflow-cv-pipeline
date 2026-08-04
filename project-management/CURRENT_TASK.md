# Current Task

No active task.

**TASK-090** (close open Dependabot security alerts: apps/web next+sharp, apps/api
ip-address+fast-uri) is DONE (2026-08-04) — see
`project-management/completed-tasks/TASK-090-security-alert-cleanup.md` and the 2026-08-04
`TEST_LOG.md` entry. Bumped `apps/web`'s `next` to 16.3.0 (also resolving `sharp` to 0.35.3),
`apps/api`'s `fast-uri` override to `^4.1.2` and added an `ip-address` override at `^10.4.0`, and
flipped CI's `dependabot-gate` `apps/web` step back to blocking. One acceptance criterion — the
post-merge live Dependabot alert re-check confirming alerts #27–#36/#39–#41 actually close — is
intentionally left unchecked until after this task's PR merges to `main` (alerts only reflect the
default branch's last scan; this is documented in the archived task file, not an open gap).
**Explicit exception sign-off (project owner, 2026-08-04):** this one AC is structurally
unverifiable before merge — the alert can't close until the fix is already on `main`, the exact
chicken-and-egg problem this task exists to fix (see `docs/07_task_backlog.md` TASK-090's own
Context section) — so closing this task `DONE` with that single box left `[ ]` is an accepted,
one-time exception to CLAUDE.md's Task Closure Checklist "hard gate" wording, not an oversight.
Raised by a same-session `/code-review` pass; confirmed by the project owner rather than silently
merged past.

Recommended next: the **TASK-073 epic's single final PR** from `task/TASK-073-redesign-base` into
`main` (per ADR-025) — no further sub-task work remains. Awaiting explicit user go-ahead before
opening it. (Unrelated to TASK-090, which branched directly off `main`.)
