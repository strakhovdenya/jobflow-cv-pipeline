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

Scale today: ~480 commits, ~300 PRs, 130+ issues, 43 architecture decision records.

The issue spec itself and the verifier that checks it are now also built against each other, not
only against the product: the issue contract makes the spec side machine-checkable, and a matching
set of deterministic checks (§5) makes most of the verifier side auditable rather than
model-judged. See ADR-041/ADR-042 for the full, dated history of that evolution.

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

The hooks and the base skills/agents come from the installed `dark-factory` package (§8): its
`postinstall` lays the skill copies out on any machine, in CI and in agent clones.
Model capability comes from the LLM. Engineering policy comes from the repository.

### 3. Ralph: a deterministic controller around a constrained agent

`node node_modules/dark-factory/ralph/run.js` (the installed package, §8) picks the next ready issue (respecting `dependsOn`), prepares a fresh
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
- The verdict module of the pinned package (`verifier/verdict.js`) computes the verdict. It is `PASS` only if all criteria pass, no test
  tampering is found, CI data was collected, no CI check or status failed and the required CodeQL
  check succeeded. Invalid input always means `FAIL` (fail closed).
- **A PR cannot rewrite its own verifier.** Prompt, schema and verdict script come from the default
  branch. The PR is only data. The API key exists only in the job that calls the model. The job
  that writes to the PR has no key.
- **Stale results are discarded.** The verifier compares the PR head with the commit that triggered
  the run and cancels obsolete runs, so a result always belongs to the exact code being accepted.
- Everything the model reads (issue text, diff, comments) is declared to be data, never instructions.
- `node node_modules/dark-factory/verifier/metrics.js --pr <n> --context <name>` (or `--prs <n1,n2,...>`) reads the current
  verifier comment and commit statuses through the GitHub API on demand, printing the verdict, round
  count and `UNVERIFIABLE` share for one PR or a distribution across several; it keeps no metrics
  file or storage of its own.

The issue itself is machine-checkable before any model call happens. The package's
`verifier/issue-contract.json`/`.md` (plus the project overlay
`.github/verifier/issue-contract.overlay.json`) define the issue body's grammar (required sections,
`AC`/`DOD`/`TR`/`INV` item IDs, item types); the package's `verifier/issue-lint.js` classifies a body as `v2` (fully checked against the
contract) or `legacy` (accepted as-is, a transition fallback), and the verifier runs this linter as
a preflight — an invalid `v2` spec fails closed without spending a model call.

Once an issue's spec is approved (`spec-approved` label, limited to trusted owners), a bot comment
freezes a hash of its body; the verifier fails if the body changes afterward without re-approval, so
an implementer cannot quietly loosen the criteria they are judged against.

A growing share of what the model used to judge is now computed by deterministic code instead:
which files are in scope (from the issue's own `## Affects`), whether required CI checks actually
ran and passed, and a diff-level scan for test tampering (skip markers, disabled CI steps, lowered
thresholds, a net loss of assertion lines). When the only remaining failure reasons are the model's
own judgement, a second independent model run is triggered; if the two runs disagree, the verdict
is `NEEDS_HUMAN` rather than a silent pick between them. Every rendered verdict also carries a
provenance block (commit, issue-body hash, model, Codex version) and the model itself is checked
against a trusted allowlist, so which exact verifier version and model judged a given PR is always
visible, not just asserted. See ADR-042 for the full mechanism-by-mechanism record.

### 6. Trust chain

```
Human intent & decisions
  → Issue authoring (scope, invariants, acceptance criteria)
  → Owner approval freezes the spec (`spec-approved` label + body hash)
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
- Replaying the verifier's golden case set of known-defect PRs (the package's `verifier/eval/verifier-eval.js`, run by the
  `acceptance-verifier-eval.yml` wrapper) is a
  manual, on-demand check the owner runs before merging a verifier prompt/schema/model-pin change —
  it is not run automatically on every PR.

### 8. Jobflow on the installed factory package

The factory code no longer lives in this repository. It is the
[`strakhovdenya/dark-factory`](https://github.com/strakhovdenya/dark-factory) package, connected in
#656; #657 removed the former local copies (`.claude/ralph/`, `scripts/acceptance-verdict/`,
`scripts/calibration-judge/`, the hook scripts, the issue linter and their tests). Paths to those
copies in older ADRs, PRDs, plans and golden cases are historical. The decision record is ADR-045;
the general rules are in the release's own docs (`node_modules/dark-factory/README.md`,
[`docs/connecting-a-project.md`](https://github.com/strakhovdenya/dark-factory/blob/v0.1.1/docs/connecting-a-project.md),
[`docs/upgrading.md`](https://github.com/strakhovdenya/dark-factory/blob/v0.1.1/docs/upgrading.md),
`ralph/README.md`, `hooks/README.md`).

| What | Where |
|---|---|
| Release pin | `dark-factory` `github:strakhovdenya/dark-factory#v0.1.1` in the root `package.json`, resolved in `package-lock.json` to commit `868074315f67e0806e0bd2c0ef173dcd32b529eb` |
| Project profile | `.factory/profile.json`: apps, install/gate commands, `skillRules`, `protectedPaths`, `branchTemplate`, sandbox, Ralph/Judge switches |
| Trusted configs (read from the default branch) | `.github/verifier/` (`required-checks.json`, `owners.json`, `allowed-models.json`, `risk-zones.json`, `tampering-scan.json`, `factory-separation.json`, `issue-contract.overlay.json`, `golden/`), `.github/calibration/` (`taxonomy.json`, `allowed-models.json`) |
| Reusable workflows (called at the same full commit) | wrappers `acceptance-verifier.yml`, `spec-approval.yml`, `calibration-judge.yml`, `acceptance-verifier-eval.yml`, and the `factory-separation-core` job of `ci.yml` |
| Hooks | `.claude/settings.json` calls `node_modules/dark-factory/hooks/` (gates fail closed with exit 2; marker, lint and typecheck never block) |
| Base skills and agents | gitignored copies laid out by the package setup; project skills stay tracked in `.claude/skills/` |

**Factory separation.** The `factory-separation-core` job (`Factory separation core`) calls the
reusable `factory-separation.yml` of the release on pull requests only; it reads the side patterns,
`owners.json` and the `package.json` pin from the default branch, and its check run is named
`Factory separation core / Factory separation`. The ordinary `factory-separation` job keeps the
public check name `Factory separation` (required checks, repository rules, golden CI snapshots): it
needs the core job, runs `if: always()` on pull requests and succeeds only when the core result is
exactly `success` — `failure`, `cancelled`, `skipped` or anything else fails it. CodeQL keeps
waiting for this job.

**Install and check.** `npm ci` at the repository root installs the pinned release and its
postinstall lays out the base skill/agent copies; after `npm install --ignore-scripts` run
`node node_modules/dark-factory/bin/setup.js --consumer-root .`. Neither changes tracked files.
`node node_modules/dark-factory/bin/doctor.js doctor` (`npx factory doctor`) reads the connection —
profile, trusted configs, wrappers and their pin, hooks, setup, labels/secrets through `gh` — and
must exit 0; a `gh` failure means that part could not be checked, not that it is missing. Doctor
does not prove a live Ralph run.

**Recovery.** The Bash gate fails closed: with `node_modules/dark-factory` missing or broken, every
Bash call in Claude Code is blocked, `npm install` included. Repair it from an ordinary terminal
outside Claude Code (`npm ci` at the root, or roll the pin back as the release's `upgrading.md`
describes), then return to the session. Do not weaken the hook entries to get unstuck. A newer
release is taken only by moving the pin (`package.json`, lock and every wrapper SHA together).

**Personal Ralph config.** The run config is personal and stays out of Git: `.ralph/config.json`
(ignored by `.ralph/`). To migrate from the removed local controller, copy the old
`.claude/ralph/config.json` and keep only the personal fields — `issues` (queue with
`dependsOn`), `agentModel`, `maxIterations`, `maxTurns`, `reviewMaxTurns` and, if wanted, the
budgets `agentTimeoutMinutes`, `taskMaxMinutes`, `taskMaxUsd` and `runsRoot`. Drop
`branchPrefix` (rejected: branches come from the profile's `branchTemplate`) and `sandbox` (it is
in the profile now); the old `config.example.json` is gone. `runsRoot` (default `.ralph-runs` in
the repository) must resolve outside the operator's home directory. The old
`.claude/ralph/config.json`/`state.json` and the session logs under `.ralph-runs/` are not deleted by
the migration and stay ignored; remove
them by hand once no longer needed, never with a cleanup of the whole `.claude/` directory.
Start a run with `node node_modules/dark-factory/ralph/run.js [--config <file>] [--max-iterations <n>]`.

**Live confirmation is still pending.** The implementation of the connection is complete, but a
live Ralph run of the installed release (pinned `claude` CLI, hooks and sandbox) is not confirmed
here. Its single confirmation is strakhovdenya/dark-factory#48, which also counts for Jobflow; the
before/after verdict comparison is #658.

### Why it matters

The interesting part is not that an LLM writes code. It is the **system around the agents**: specs
as contracts, repository-held knowledge, minimal permissions, implementation separated from review,
AI evidence validated by ordinary code, stale-result handling and an escalation path to a human. The
result is closer to a small software production control system than to a coding assistant.

> **Use probabilistic models where semantic reasoning helps. Use deterministic software wherever
> authority, state, security boundaries and acceptance can be made explicit.**
