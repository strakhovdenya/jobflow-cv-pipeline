# Verifier golden cases

A golden case freezes the inputs of one already-investigated PR so the current
Acceptance Verifier prompt/schema/model pin (`.github/verifier/prompt.md`,
`schema.json`, ADR-041/042) can be replayed against it by hand
(`.github/workflows/acceptance-verifier-eval.yml`, `workflow_dispatch` only —
this is never run automatically on every PR). It answers: did the wording
change that just landed quietly turn a known regression into a false `PASS`?

Every case is a subdirectory named after the PR number it replays
(`.github/verifier/golden/<pr>/`), holding exactly three files:

- `case.json` — the case's identity and expected verdict:

  ```json
  {
    "pr": 434,
    "base_sha": "<40 hex>",
    "head_sha": "<40 hex>",
    "expected": "PASS or FAIL",
    "reason": "non-empty string"
  }
  ```

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
checks, allowed models, and — for a `v2`-format issue — the issue-lint spec
and Affects scope), and writes the reconciled verdict as that case's result.

## Metrics (`scripts/verifier-eval.js`)

`node scripts/verifier-eval.js <cases-dir> <results-dir>` compares each
case's `expected` verdict against the reconciled `actual` verdict written for
it. It reports, per case, `<case> | <expected> | <actual>`, then:

- **false PASS** (expected `FAIL`, actual `PASS`) — the main metric
  (ADR-042): a wording change silently let a known regression through.
- **false FAIL** — counted and shown, but not the main metric; a currently
  empty category in this initial set (all three seed cases expect `FAIL`,
  per Issue #483's scope decision — see the ADR-042 amendment).
- **run failures** — a case whose actual-result file is missing or malformed
  (JSON that doesn't parse, or an `actual` value other than `PASS`/`FAIL`);
  counted separately from both, since it means the case could not be judged
  at all, not that it passed or failed. A reconciled `NEEDS_HUMAN` (the two
  runs disagreed on that case) falls into this category too — it means the
  case needs a look, not that it definitively matched or missed `expected`.
