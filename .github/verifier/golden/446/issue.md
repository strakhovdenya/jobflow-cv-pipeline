# Refactor root CLAUDE.md into always-on policy and task-specific skills

## Context

The root `CLAUDE.md` has grown into a mix of always-on repository policy, product invariants, architecture reference material, and procedural task lifecycle checklists. Because the file is loaded into every Claude Code session, task-specific procedures consume context even when irrelevant.

The goal is **not line-count reduction**. The goal is a clearer responsibility split:

- `CLAUDE.md` = constitution + router: always-on invariants, source-of-truth hierarchy, safety boundaries, and pointers to conditional procedures.
- skills = procedural/task-specific instructions loaded when relevant.
- docs/ADRs/app-level CLAUDE files = detailed system knowledge.
- hooks = deterministic enforcement for requirements that must not depend on model memory.

## Affects

- `CLAUDE.md`
- `.claude/skills/task-lifecycle/SKILL.md` (new)
- `.claude/skills/epic-discovery/SKILL.md` (new)
- `.github/workflows/acceptance-verifier.yml` and `project-management/DECISIONS.md` (ADR-041 amendment): bounded verifier attempts with a lower-effort retry, bundled at the owner's request after the verifier hung on this PR
- `scripts/git-closure-gate-hook.spec.js` (new: automated tests for the closure gate)
- `scripts/git-closure-gate-hook.js` (existing closure gate, extended — not duplicated — to require `task-lifecycle` to be loaded before commit/push)
- `.claude/skills/issues/SKILL.md`, `.claude/skills/prd/SKILL.md`, `.claude/skills/plan/SKILL.md`, `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` (pointer fixes; the `issues` skill additionally gets the verifier-checkable criteria guidance from #447, bundled here at the owner's request)

## Key Invariants

- Preserve behavior and safety intent; this is an information-architecture refactor, not a relaxation of workflow.
- Security rules remain always-on in root CLAUDE.md.
- Core product/architecture invariants remain always-on; detailed data-flow documentation should be routed to authoritative docs rather than duplicated.
- Required metaskills must remain discoverable and mandatory from root; installation/update implementation detail may be routed elsewhere.
- Task lifecycle remains mandatory. Moving procedural details to a skill must not make closure/commit requirements optional.
- Do not create a second hook: enforcement of the lifecycle at commit/push is done by extending the existing git closure gate. `task-lifecycle` is deliberately not added to the generic Write|Edit skill gate.
- `task-lifecycle` is loaded only at lifecycle boundaries (approved plan → implementation; implementation done → closure/commit/PR), never for research/explanation/planning-only work, and never inside Ralph's nested coding agents (the Ralph controller owns their Git/GitHub lifecycle).
- Keep app-specific rules in `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md`.

## Acceptance Criteria

- [x] Root `CLAUDE.md` clearly acts as an always-on constitution/router rather than a full procedural handbook.
- [x] Epic/phase discovery procedure is moved to a dedicated `epic-discovery` skill with clear trigger guidance.
- [x] Plan/issue/branch/closure/Git-PR procedural workflow is moved coherently to a dedicated `task-lifecycle` skill.
- [x] Root retains concise mandatory routing to `task-lifecycle` so the workflow is not silently optional.
- [x] Security rules and critical cross-cutting product invariants remain always-on.
- [x] Detailed Data Flow duplication is removed or reduced in favor of the authoritative architecture documentation without losing critical invariants.
- [x] Metaskills section retains mandatory skill-loading policy while avoiding unrelated installation/update mechanics in every session where practical.
- [x] Context-management guidance remains concise; agent-specific operational quirks belong with the relevant agent instructions where appropriate.
- [x] No workflow requirement is lost during the move; duplicated copies are removed so each rule has one authoritative home.
- [x] No new hook entry is added to `.claude/settings.json`; the existing closure gate script is extended instead.
- [x] `task-lifecycle` states its activation boundaries (when to load / when not to, incl. Ralph), and root `CLAUDE.md` routing matches them.
- [x] The existing git closure gate blocks commit/push until `task-lifecycle` was loaded in the session, then still asks the human to confirm closure; other Bash commands pass through untouched.
- [x] `.claude/skills/issues/SKILL.md` documents how to write verifier-checkable criteria (process claims, search criteria for removals, named tests for script behaviour, example-based "unaffected" criteria, updating Affects mid-task) — scope of #447, bundled.
- [x] `acceptance-verifier.yml` runs the verifier as attempt 1 (`effort: high`) and, if it failed, timed out or left an invalid `verdict.json`, as attempt 2 (`effort: medium`), each `continue-on-error` with `timeout-minutes: 6`; `Verifier diagnostics` writes attempt outcomes to the job summary; ADR-041 documents this.
- [x] No pointer in skills, `apps/*/CLAUDE.md` or root `CLAUDE.md` refers to a root section that no longer exists (e.g. Operating Rules, GitHub Issue Authoring Rules, Finding Epics and Phases, Task Closure Checklist).

## Test Requirement

Documentation/configuration refactor. Verify by reviewing the resulting routing graph and searching for each moved hard requirement to ensure it has exactly one authoritative procedural home plus any required root pointer. Inspect existing hook configuration/scripts to confirm lifecycle enforcement remains compatible. Exercise `scripts/git-closure-gate-hook.js` with synthetic stdin: non-git command → no output/exit 0; commit or push without the skill marker → exit 2; with the `task-lifecycle` marker → `permissionDecision: ask`. Grep for dangling references to removed root sections.

## Definition of Done

- Root `CLAUDE.md` is materially easier to scan and contains primarily always-on guidance.
- New skills have valid project skill structure/frontmatter and clear activation descriptions.
- Existing workflow semantics are preserved.
- Diff contains no unrelated product/code changes.







