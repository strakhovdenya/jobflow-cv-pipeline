## AI-Assisted Software Factory

Besides the JobFlow CV product itself, this repository is a working experiment in building a
small **AI-assisted software factory**: a process in which AI agents take part in the whole path
from task definition to independent acceptance verification.

The goal is not to let an LLM develop the project freely. The design is built on the opposite idea:

> **AI does bounded reasoning and implementation. Deterministic software owns state,
> permissions, Git operations, CI gates and the final acceptance decision.**

```
idea → PRD → plan → GitHub Issue (executable spec) → skills & rules → isolated implementation agent
     → independent self-review → Pull Request → CI + CodeQL → Acceptance Verifier → human merge
```

Scale today: ~480 commits, ~300 PRs, 130+ issues, 41 architecture decision records.

### 1. Tasks are executable contracts

`prd → plan → issues` are three project skills that turn an idea into GitHub Issues. An issue is a
full spec: context, affected files, docs to read, key invariants, acceptance criteria, test
requirements, definition of done and dependencies.

- Before an issue is written, the skill **cross-checks the proposed task against the actual code**,
  not only against the plan.
- **Ambiguity is resolved before autonomy starts.** If there are several valid approaches, the human
  owner chooses one. The choice is recorded in the issue as a resolved decision, so an autonomous
  agent never decides product or architecture questions silently.
- Owner-only manual checks live in a separate section that is not gated by the verifier.

### 2. Project knowledge lives in the repository, not in the model

Engineering rules are kept in `CLAUDE.md`, ADRs and reusable skills. They are enforced by hooks,
not only described in text:

- a **skill gate** blocks the first code edit until the skills required for that app are loaded;
- a **commit/push gate** forces the Task Closure Checklist to be shown to a human;
- **lint and typecheck hooks** run after every edit, scoped to the right app.

Skills are installed automatically by `postinstall` on any machine, in CI and in agent clones.
Model capability comes from the LLM. Engineering policy comes from the repository.

### 3. Ralph: a deterministic controller around a constrained agent

`node .claude/ralph/run.js` picks the next ready issue (respecting `dependsOn`), prepares a fresh
`git clone`, installs dependencies, runs a coding agent and opens a PR.

> **The agent edits code. The controller owns the lifecycle.**

The agent has no `git` or `gh` access. It cannot commit, push, open PRs or touch issues. It ends
with one of three verdicts: `DONE`, `BLOCKED` or `BLOCKED-PROMPT-CHANGE`. Everything else is
ordinary controller code. This boundary came from real failures: the first version (worktrees plus
an agent running git itself) failed three live runs and was rebuilt rather than patched.

After `DONE`, and before a PR exists, the controller runs:

1. an **independent read-only reviewer** (a separate session, no shared memory, no write access)
   that compares the diff with the issue;
2. a bounded fix-and-review loop (up to 2 cycles);
3. a code-review pass;
4. an **independent final gate** (`tsc`, `lint`, `test`, `build`), regardless of what the agent claimed;
5. lockfile sync, because the agent cannot run `npm install` and `npm ci` would fail in CI.

The agent is expected to **stop instead of inventing decisions**: on a contradiction inside an
issue, on a missing input path, on a needed human decision, or when a protected prompt or
knowledge source would have to change. Blocked issues get a label and are not silently retried.
File deletion is done through a marker (`DEL_RALPH`) that the controller acts on, so the agent
never needs delete permissions.

### 4. Real failures became system constraints

Green tests turned out not to mean a correct implementation. Manual review of real runs found, for
example:

- a `toContain` regression test on a whole prompt file that stayed green after the behaviour it
  guarded was removed;
- data copied by hand instead of removing the real obstacle;
- logic verified only on invented fixtures although real files were available;
- an agent silently substituting synthetic data for a path that did not exist;
- a passing change that violated an explicit "do not mutate real data" invariant.

Each finding was turned into a rule. The agent must break what a substring assertion is meant to
catch and see it fail, run logic on real repository data, refuse silent substitution, and report
how each acceptance criterion was actually met. The orchestrator's README reads as an incident log.

### 5. Acceptance Verifier: does the PR solve the task we asked for?

CI answers whether the code builds and passes tests. The verifier answers whether the PR satisfies
its issue. It runs after CI and CodeQL, even when they are red, so one failure does not hide
diagnostics from another.

A **different model** (OpenAI Codex, version pinned, action pinned by SHA) reads the issue, the diff
and the checkout in a read-only sandbox. It judges every acceptance criterion, definition-of-done
item and test requirement as `PASS`, `FAIL` or `UNVERIFIABLE`. It also reports test tampering,
files outside the issue's scope and touched risk zones (auth, secrets, CI, migrations, filesystem
and shell sinks, state machine, dependencies).

**The model does not decide the outcome.** It returns JSON that matches a strict schema, and there
is no verdict field in that schema.

- Every `PASS` must cite `{path, line, quote}`. Deterministic code checks that the file, the line and
  the quoted text really exist. One false reference fails the whole review.
- `acceptance-verdict.js` computes the verdict. It is `PASS` only if all criteria pass, no test
  tampering is found, CI data was collected, no CI check or status failed and the required CodeQL
  check succeeded. Invalid input always means `FAIL` (fail closed).
- **A PR cannot rewrite its own verifier.** Prompt, schema and verdict script come from the default
  branch. The PR is only data. The API key exists only in the job that calls the model. The job
  that writes to the PR has no key.
- **Stale results are discarded.** The verifier compares the PR head with the commit that triggered
  the run and cancels obsolete runs, so a result always belongs to the exact code being accepted.
- Everything the model reads (issue text, diff, comments) is declared to be data, never instructions.

### 6. Trust chain

```
Human intent & decisions
  → Issue authoring (scope, invariants, acceptance criteria)
  → Repository skills, rules and hooks
  → Ralph controller (lifecycle, isolation, permissions)
  → Implementation agent (bounded workspace, no git)
  → Read-only review agent
  → Pull Request (auditable boundary)
  → CI + CodeQL (deterministic checks)
  → Acceptance Verifier (semantic check, evidence validated by code)
  → Human merge
```

### 7. What is deliberately not automated

This is not a fully autonomous factory yet.

- Planning, the choice between approaches and the **merge** stay with a human.
- The verifier is advisory until it has enough real-world history. Making it required is a
  repository variable plus a branch-protection setting, not a code change.
- The skill gate does not see edits made through shell commands. This limit is documented.
- The next step is a guarded auto-merge: CI, CodeQL and Verifier all green for the current head
  commit, re-checked right before merging, with an opt-out label for sensitive PRs.

### Why it matters

The interesting part is not that an LLM writes code. It is the **system around the agents**: specs
as contracts, repository-held knowledge, minimal permissions, implementation separated from review,
AI evidence validated by ordinary code, stale-result handling and an escalation path to a human. The
result is closer to a small software production control system than to a coding assistant.

> **Use probabilistic models where semantic reasoning helps. Use deterministic software wherever
> authority, state, security boundaries and acceptance can be made explicit.**
