---
name: task-lifecycle
description: Mandatory lifecycle for implementing, closing, committing, pushing, and opening PRs for repository tasks. Load for implementation work, after plan approval, before branch creation, and again before task closure/commit.
---

# Task Lifecycle — JobFlow CV Pipeline

This skill is the authoritative procedural workflow for taking one implementation task from approval to PR. The root `CLAUDE.md` contains the always-on policy and routes here; do not duplicate this procedure back into the root file.

## Core rules

- Work on one task at a time. Do not choose the next task automatically.
- GitHub Issues are the execution source of truth (ADR-030).
- Do not silently change product scope.
- Keep changes small and reviewable.
- If the task cannot be completed safely, comment `BLOCKED: <reason>` on the active Issue and stop. Do not close it and do not invent a workaround.

## 1. Plan first

Before code changes, present a written plan covering files, approach, and risks. Wait for explicit user approval (`go`, `approved`, or equivalent).

For an urgent hotfix the plan may be one or two lines, but Issue-first, Branch-first, Acceptance Criteria, Test Requirement, and closure verification still apply.

## 2. Issue first

Before the first implementation Write/Edit:

1. Ensure a fully-specced GitHub Issue exists. Do not implement against a title-only issue.
2. For an ad-hoc task, search existing issues first; do not create a duplicate.
3. Use the issue format defined by `.claude/skills/issues/SKILL.md`.
4. Every active task Issue must be on the `JobFlow CV Pipeline` GitHub Project. Standalone issues need no milestone; epic-derived issues use their phase milestone.
5. Treat the Issue body as the implementation contract: Context, Affects, Docs to Read, Key Invariants, Acceptance Criteria, Test Requirement, Definition of Done, Dependencies.

If a state-machine transition table is present in the Issue's Key Invariants, use it directly. Do not derive a different transition table from older docs. If it conflicts with referenced documentation, stop and ask.

## 3. Branch first

Immediately after plan approval and Issue confirmation:

1. Check `git status` and `git branch --show-current`.
2. Do not carry unrelated dirty state onto a new task branch.
3. Start from an up-to-date `main` unless this is an ADR-025 epic sub-task that intentionally targets an epic base branch.
4. Name normal task branches `task/ISSUE-<n>-short-description`.
5. Set the Issue's GitHub Project status to **In Progress** as soon as the branch is created.

Project IDs currently used by the repository:

```text
project: PVT_kwHOAfTJXM4Bg0i5
Status field: PVTSSF_lAHOAfTJXM4Bg0i5zhfypqs
In Progress option: 47fc9ee4
```

Resolve the project item id with `gh project item-list 1 --owner strakhovdenya --format json`, then update it with `gh project item-edit`.

### Epic base branches / stacked work

For a multi-task epic, follow ADR-025. The base branch is `task/ISSUE-<tracking-issue-n>-<epic-short-name>-base`, where the tracking issue number is resolved from the Issues created for the epic.

Before opening sub-task PRs into an epic base branch, ensure that base branch has the same required-status-check protection as `main`.

Before starting the next dependent sub-task, check whether the immediately preceding PR into the epic base is still open. If it is, ask whether to wait or intentionally proceed in parallel; do not silently branch around a pending dependency.

## 4. Scope discipline during implementation

When new work surfaces mid-task:

- If it is required for the active Issue's Acceptance Criteria to be true, fix it in the current task and explain the extra change in the PR.
- If it is unrelated, do not mix it into the current change. Create a separate fully-specced Issue, add it to the Project, tell the user, and continue the active task unless the user explicitly asks to bundle it.

For architecture changes, update the relevant documentation in the same change. Architecture includes module/service boundaries, dependency direction, HTTP endpoints/data flow, state transitions, and new binding decisions. Update whichever source is authoritative: affected app `CLAUDE.md`, relevant `docs/*.md`, and/or `project-management/DECISIONS.md`.

Do not move P1/P2 scope into MVP unless explicitly requested. If documentation outside the active task needs unrelated changes, propose them rather than silently expanding scope.

## 5. Verification and closure gate

The closure checklist is a **hard gate**. Do not commit until every applicable item is verified.

Before commit:

- All Acceptance Criteria in the Issue body are actually satisfied and their checkboxes are marked `[x]`.
- If implementation diverged materially from the Issue's original approach, add an Issue comment explaining what changed and why.
- Post test evidence to the Issue: commands run, result, and concrete evidence. `project-management/TEST_LOG.md` is frozen (ADR-035).
- Verify the implementation against the metaskills loaded before coding.
- Ensure architecture documentation is current when the change is architectural.
- Ensure the eventual PR body will include `Closes #<n>`; do not manually close the Issue before merge.
- State which Issue(s), if any, are now unblocked/open next. Do not start them automatically.

Immediately before `git commit`, show explicit closure status to the user as ✅/❌ lines.

Then ask two separate questions and wait for explicit answers:

1. Run `/code-review` against the working diff first?
2. Does root `README.md` need updating for this task?

Only run documentation-writer/edit root README when the user answers yes.

The repository's `scripts/git-closure-gate-hook.js` independently prompts on `git commit`/`git push`. That hook is a backstop, not a replacement for this lifecycle.

## 6. Git / PR order

After closure is satisfied:

1. `git add <files>`
2. `git commit -m "<type>: ISSUE-<n> ..."` using the appropriate conventional-commit type.
3. `git push -u origin <branch-name>`
4. `gh pr create ... --body "Closes #<n> ..."` against the intended base.
5. Stop completely. Do not select or start the next task.

Never create the PR before pushing the branch.

## Hotfixes

Urgency may compress planning, but not traceability or verification:

- create/complete the Issue immediately if it did not exist;
- branch from `main`;
- keep real Acceptance Criteria and Test Requirement;
- run the same closure gate before commit.
