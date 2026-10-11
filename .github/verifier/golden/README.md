# Verifier golden cases

A golden case freezes the inputs of one already-investigated PR so the current
Acceptance Verifier prompt/schema/model pin (`.github/verifier/prompt.md`,
`schema.json`, ADR-041/042) can be replayed against it by hand
(`.github/workflows/acceptance-verifier-eval.yml`, `workflow_dispatch` only —
this is never run automatically on every PR). It answers: did the wording
change that just landed quietly turn a known regression into a false `PASS`?

Every case is a subdirectory named after the PR number it replays
(`.github/verifier/golden/<pr>/`), holding three required files and, optionally,
the mutation and frozen-fixture files described below:

- `case.json` — the case's identity and expected verdict:

  ```json
  {
    "pr": 434,
    "base_sha": "<40 hex>",
    "head_sha": "<40 hex>",
    "expected": "PASS or FAIL",
    "expected_criterion_id": "issue item ID, or null",
    "expected_reason_code": "reason code, or null",
    "reason": "non-empty string"
  }
  ```

  `expected_reason_code` and `expected_criterion_id` say *why* a `FAIL` case
  must fail. The code is one of the closed list of reason codes the verifier
  exports (`REASON_CODES` in `scripts/acceptance-verdict/result.js`), as it
  appears in the verifier's `result.json`. `expected_criterion_id` is the ID of
  the issue item the reason is about (for example `AC-3`), or `null` for a rule
  that has no ID (a failed CI check) and for a legacy issue, whose items have
  no IDs. A `PASS` case sets both to `null`: its reasons are not checked. A
  case without `expected_reason_code`, with a code outside the list or with a
  `PASS` case that sets either field is invalid and is counted as a run
  failure.

  `reason` explains, in one or two sentences, what the case actually tests
  — the specific defect or check that must still be caught (or, for a
  `PASS` case, what must still be recognized as correct).
- `issue.md` — the GitHub Issue body exactly as the real verifier run saw
  it. It is the issue title as a top-level heading, a blank line, then the
  issue body — the same shape `acceptance-verifier.yml`'s `Collect inputs`
  step writes to `.verifier/issue.md`.
- `ci.json` — the frozen CI snapshot for `head_sha`, in the same shape that
  step writes to `.verifier/ci.json`:

  ```json
  {
    "head_sha": "<40 hex>",
    "ci_workflow_conclusion": "success or failure",
    "checks": [{ "name": "...", "status": "...", "conclusion": "..." }],
    "statuses": [{ "name": "...", "state": "..." }]
  }
  ```

### Optional files

- `mutation.patch` — a unified diff that turns a correct PR into a
  deliberately corrupted one (see "Mutation cases").
- `approval.json` — frozen spec approval for a `v2`-format issue, in the shape
  `scripts/spec-hash.js check` writes to `spec-approval.json` (`approved_hash`,
  `current_hash`); the eval passes it to the verdict script as `--approval`.
  Without the file the approval check is not applied at all (the verdict
  script's behavior when `--approval` is omitted), so existing cases keep their
  verdicts. A case that must be judged as an approved `v2` spec ships the file;
  `approved_hash: null` gives `spec not approved`, a changed hash gives `spec
  changed after approval`.
- `exceptions.json` — frozen authorized exceptions:

  ```json
  { "manual_verified": false, "test_removal_approved": false }
  ```

  A missing file or a missing key means the exception is not granted. The
  file is reviewed in the PR that adds the case and read from the default
  branch, which replaces the live label-and-owner check of the real verifier.

The eval reads approval and exceptions only from the case directory; it never
calls the GitHub API for them, so the same case gives the same verdict twice.

`head_sha`/`base_sha` are real commits reachable from `main`'s history (the
PR's own merge brought them in) — the eval workflow checks out `head_sha` as
data, the same way `acceptance-verifier.yml`'s `Verify` job does, to give the
model the real diff/code to read. `ci.json`, by contrast, is a **frozen
snapshot, not necessarily today's live GitHub state**: GitHub's own
check-runs/statuses for a commit reflect the *latest* rerun, so a check that
failed when the original verifier run actually happened can show as green
today (rerun after the fix landed, or scheduled reruns). Reconstruct `ci.json`
to represent the state the case is about — do not simply re-fetch the commit's
current check-runs and assume they still show the original failure.

## Adding a new case

1. Confirm the PR being replayed had a materially interesting verifier
   verdict — a documented false `PASS`/false `FAIL`, or (for a future `PASS`
   case) a correct `PASS` on a tricky input worth guarding as a regression
   test in its own right.
2. Resolve `base_sha`/`head_sha` (`gh pr view <n> --json baseRefOid,headRefOid`)
   and confirm both are reachable in this repo's history
   (`git cat-file -t <sha>` reports `commit`).
3. Build `issue.md` from the linked Issue's title/body in the same shape as
   `Collect inputs` (`gh issue view <n> --json title,body --jq '"# " + .title
   + "\n\n" + .body'`).
4. Build `ci.json`. Use the commit's real check-runs
   (`gh api repos/<owner>/<repo>/commits/<head_sha>/check-runs`) as a
   starting point, then correct any entry whose current conclusion no longer
   matches the state the case is about (see the note above).
5. Write `case.json` with `expected` and a `reason` that names the specific
   defect or correctness call the case exercises.
6. `scripts/verifier-eval.spec.js`'s own tests use synthetic fixtures, not
   this directory, so a new case needs no spec-file change. Re-run
   `npm run test:scripts` and, when practical, `workflow_dispatch` the eval
   workflow itself to confirm the new case's actual verdict matches
   `expected` before relying on it as a regression guard.

## Mutation cases

A case with `mutation.patch` replays a corrupted version of a correct PR.
`head_sha` stays the real commit of that PR; the patch is applied on top of it
by `scripts/golden-mutation.js` in each verify job:

- The patch is applied as data (`git apply` on a scratch index and on the
  checked-out worktree). Nothing from the mutated tree or from the patch is
  executed, and the PR's CI is not re-run: `ci.json` stays a frozen snapshot of
  the real `head_sha`.
- The diff and file list are rebuilt from the merge base of `base_sha` and
  `head_sha` to the mutated tree. The tampering scan, the Affects scope and the
  spec lint are then computed from them. Cases without `mutation.patch` keep the
  plain `git diff base...head` inputs.
- `mutation.json` (in the uploaded `.verifier/` artifact) records `head_sha`,
  `base_sha`, the sha256 of the patch and the resulting `tree_sha` as separate
  fields. `provenance.json` keeps the real `head_sha`; a synthetic tree is never
  presented as a commit.
- A patch that is empty, is not a unified diff, changes nothing or does not
  apply to `head_sha` is a **run failure**: the script exits non-zero with
  `run failure: <reason>`, writes no diff or file list, and the case leaves no
  result artifact, so `verifier-eval.js` counts it as a run failure, not as a
  `PASS` or `FAIL`.

## How the eval workflow computes each case's actual verdict

`acceptance-verifier-eval.yml` replays the same two-run pipeline the real
verifier uses (ADR-042, ISSUE-482 amendment): a first Codex run, then always a
second Codex run in a separate job (`drop-sudo` can only run once per job),
both against the case's own frozen `issue.md`/`ci.json`/diff. Unlike the real
verifier — which only re-runs when the first run's FAIL is entirely model
judgement — every golden case always gets a second run; the case set is small
and run infrequently, so the extra cost buys a stronger check (both runs must
agree) rather than a cost-matched replica of the real skip heuristic. A
`summarize` job reconciles both runs with `scripts/acceptance-verdict.js`
(the same function the real verifier's `Report` job uses) using the case's
own frozen deterministic inputs (CI, tampering scan, provenance, required
checks, allowed models, the case's frozen `approval.json`/`exceptions.json`, and — for a `v2`-format issue — the issue-lint spec
and Affects scope), and writes the reconciled verdict as that case's result.

## Metrics (`scripts/verifier-eval.js`)

`node scripts/verifier-eval.js <cases-dir> <results-dir>` compares each
case's `expected` verdict and expected reason against the reconciled result
written for it (`{ "actual": "PASS or FAIL", "reasons": [{ "code", "id" }] }`,
the `reasons` taken from the verifier's `result.json`). It reports, per case,
`<case> | <expected> | <actual> | <expected reason> | <actual reasons>`
(a reason is `code#id`, or just `code` when it has no ID), then the counters
below. Each case falls into exactly one category: matched, false PASS, false
FAIL, run failure or reason mismatch.

- **false PASS** (expected `FAIL`, actual `PASS`) — the main metric
  (ADR-042): a wording change silently let a known regression through.
- **false FAIL** — counted and shown, but not the main metric; a `PASS` case
  that the verifier failed.
- **reason mismatches** — expected `FAIL`, actual `FAIL`, but none of the
  actual reasons has both the expected code and the expected ID. The verifier
  failed the case for some other reason, so the defect the case exists to catch
  was not seen. A `FAIL` case is counted as caught only when such a reason is
  among the actual ones; other reasons next to it do not matter. A `PASS` case
  never counts as a reason mismatch.
- **run failures** — a case that could not be judged at all: its
  actual-result file is missing or malformed (JSON that doesn't parse, an
  `actual` value other than `PASS`/`FAIL`, or no `reasons` list), or its
  `case.json` has no valid reason expectation. A reconciled `NEEDS_HUMAN` (the
  two runs disagreed on that case) falls into this category too — it means the
  case needs a look, not that it definitively matched or missed `expected`.

The exit code is non-zero for any false PASS, run failure or reason mismatch,
and zero when every case matched (a false FAIL alone does not change it).
