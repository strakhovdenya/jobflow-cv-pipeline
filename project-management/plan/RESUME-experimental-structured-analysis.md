# Resume: experimental structured vacancy analysis (suspended research)

**Single starting point for any coding agent (Claude Code, Codex or another authorized agent) resuming the suspended ADR-046 research.**
- It points to the authoritative documents rather than repeating them. When this file and an authoritative document disagree, the authoritative document wins.
- It does not depend on any earlier chat session.

| Authority | Document |
|---|---|
| Binding decisions | `project-management/DECISIONS.md` → ADR-046 and its amendments, the latest being **2026-11-27, ISSUE-718: T7 outcome REVISE, temporary suspension** |
| T7 results and findings | `project-management/analysis-experimental-analysis-pilot.md` (historical record, never edited) |
| Frozen T7 references and method | `project-management/evaluation/experimental-analysis-pilot/references.md` + `references.sha256` |
| Roadmap | `project-management/plan/PLAN-experimental-structured-analysis.md` (see its status update) |
| Product requirements | `project-management/prd/PRD-experimental-structured-analysis.md` |
| Tracking | epic issue #711 (open) |

---

## A. Current state (at suspension, 2026-11-27)

- **Status: temporarily suspended** by the owner on 2026-11-27. Claude Code access was ending for an indefinite period. Research resumes only on an explicit owner decision.
- **T7 outcome: REVISE.** Neither strategy `b` nor `c` met the ADR-046 item 6 minimum bar, so no strategy was selected, promoted or frozen.
- **Legacy pipeline:** the default for every new workspace and fully supported. Its maintenance is not blocked by this suspension.
- **Experimental strategies `b`, `c`:**
  - still implemented and selectable only through a source fork (web "Compare strategies");
  - **not to be used for real applications** while suspended;
  - main limitations: frequent contract-validation failures (section B) and a decision policy that turned acceptable advisory decisions into skips.
- **Blocked:** Gate A (T8), Phase 2, Phase 3. No paid evaluation without a separate owner approval.
- **Versions on `main` at suspension:**

  | Item | Version |
  |---|---|
  | Policy | `DECISION_POLICY_VERSION = 'adr-046@2026-11-26'` |
  | Contracts (`01a`, `01b`, `01c`) | major 1 |
  | Templates | `analysis_x1`, `analysis_x2`, `analysis_b` v1 |
  | Legacy templates | `prompt_1` v13, `prompt_2` v15, `prompt_3` v11, `prompt_5` v1, `cover_letter` v6, `skip_reason` v2 |
- **Commits:**
  - the application commit of the T7 pilot is `ff05eebc87c537e18b569e87cae6b2fd581e48b2`; all code locations below refer to it;
  - latest verified `main`: check `git log origin/main -1`. At suspension it was `ff05eeb` plus the merge of the T7 PR once merged.
- **Issues and PRs:**

  | Task | Issue | PR |
  |---|---|---|
  | T1 | #712 | #721 (merged) |
  | T2 | #713 | #722 (merged) |
  | T3 | #714 | #723 (merged) |
  | T4 | #715 | #724 (merged) |
  | T5 | #716 | #725 (merged) |
  | T6 | #717 | #726 (merged) |
  | T7 | #718 | #727 (report + ADR-046 amendment) |
| Handover documentation | #728 | this document, with the plan and PRD status blocks |
  | Epic tracker | #711 | — |

- **Outstanding PRs at suspension:** #727 (T7) and the #728 documentation PR, until merged. Dependabot PRs are unrelated.
- **Next authorized action:** none. The next *proposed* action is the owner's specification review of **R1** (section C).

## B. Confirmed findings and hypotheses (details: T7 report, sections 5–9)

**Confirmed (stored data and code at `ff05eeb`):**
- **Failed-stage observability gaps.**
  - On a validation failure the runner saves the `AiRun` without usage and without the raw answer (only `responseHash`): `apps/api/src/pipeline/analysis/experimental-analysis.service.ts` around lines 786–818. `usage` is in scope but not passed to `saveFailed`.
  - `lastStepErrorMessage` is capped at 500 characters.
  - Consequence: the cost of 7 billed calls is unknown, and **the original failed provider responses were not retained**.
- **Judgement evidence-reference contradiction (5 of 7 failures, B and C).**
  - `cited_ids` must be in the citable set: `apps/api/src/pipeline/structured-analysis/fit-assessment.schema.ts`, `checkCitations` (around 458–471) and the set built in `checkCoverage` (around 326) and `citableIdsOf` (around 559).
  - Only evidence refs already used in coverage are citable, as the template also says (`apps/api/prisma/prompts/structured-analysis/fit-assessment.txt` line 88).
  - `product_evidence_strong` (line 95) judges evidence that usually supports no requirement, so the model cited valid but unmapped catalog sections.
- **Language-risk reference mismatch (3 of 7).**
  - `risk.requirement_ids` must be `01a.requirements` ids (`checkRisks`, around 376–417); `01a.languages` ids are excluded.
  - The template (`fit-assessment.txt` lines 65–67) gives a language risk no way to reference its language requirement.
- **Enum validation failure (1 of 7).**
  - X1 wrote `spanish`; the enum is `german | english | other` (`vacancy-requirements.schema.ts` line 33, check at 242).
  - The template is explicit (`requirements-extraction.txt` line 55).
  - The stages request `json_object`, not `json_schema` (`experimental-analysis.service.ts` around 508; the provider supports `json_schema`, `apps/api/src/ai/providers/openai.provider.ts` around 109).
- **H5 interpretation.**
  - H5 `requires_overstretch` decided 4 of the 6 completed experimental analyses. In 3 of them the advisory decision was inside the acceptable set.
  - The recorded reasons read "claiming unmet requirements would overstate" instead of "the CV must overstretch to look relevant".
  - Code: `apps/api/src/pipeline/structured-analysis/decision-policy.ts` (row H5, around 550; hard constraints around 576); template definition `fit-assessment.txt` line 90; ADR-046 Appendix row H5.
- **Risk stacking.** S1 stacking turned one maybe (score 76) into skip; legacy reads the same rubric holistically. This is a calibration question, not a defect.
- **Candidate language list.** One run treated an absent language as `undetermined` instead of `incompatible`. The constants block does not say its language list is exhaustive.
- **Interrupted pilot.**
  - 19 of 36 analyses ran; #20–#36 never started (owner-approved early stop).
  - C completed 1 analysis, which is **insufficient for any B/C selection**.
  - The 6 of 6 correct advisory decisions are a promising but **limited** observation.
  - Unknown-cost calls are estimates, **not confirmed or invoiced charges**.

**Hypotheses (not confirmed):**
- contract complexity (many cross-references, all-or-nothing validation) raises failure rates;
- X2 is more exposed to the language-id pattern because it receives `01a`;
- the H5 template wording causes the broad reading.

**Rule for future work:** fixtures rebuilt to reproduce these failures are *reconstructions*, not original provider responses, and must be labelled as such.

## C. Proposed remediation roadmap (provisional; nothing authorized)

Full objectives and proposed acceptance conditions: T7 report, section 10. **No R-issue exists yet.** Create each only after an owner specification review, with the `issues` and `task-lifecycle` skills.

| Package | Priority | Depends on | Purpose |
|---|---|---|---|
| **R1** Failed-stage observability | P0 | — | usage independent of validation; raw failed answer in protected local storage (never Git or logs); complete structured errors; correct `PromptRun`/`AiRun` links; no double counting; unknown-usage semantics kept |
| **R2** Contract reliability | P0 | R1 | snapshot-bound judgement evidence refs with eligibility, displayability and integrity checks; language refs in risks; exhaustive candidate language list; closed enums; evaluate schema-enforced output. Valid refs accepted, invalid or fabricated still rejected |
| **R3** Decision-policy refinement | P0 | R2 | clarify H5 (ordinary gaps are not overstretch; genuine overstretch still enforced); review S1 stacking against caps and hard constraints. H5 is not assumed to be removed or weakened; binding changes via an ADR-046 amendment and a new policy version |
| **R4** Reliability smoke | — | R1–R3 | about 12 calls at then-current prices, separate budget approval; vacancies, strategies, completion rate, correctness, clear-cut eligibility, integrity, observability and stop rules defined first. Passing selects nothing |
| Repeat T7 | — | R4 reviewed | new isolated batch; separate approval; original T7 kept; original or newly reviewed references hashed before execution; ADR selection rule; Gate A only after a selection and owner authorization |

**Deferred ideas (not authorized):**
- a stateless AI execution service (for example Google Cloud Run) with a remote AI execution adapter;
- Terraform-managed cloud infrastructure;
- multi-provider evaluation;
- schema-enforced output beyond R2.

Cloud deployment stays deferred until the analysis is reliable.

**Unrelated maintenance:** the Next.js security warning seen on 2026-11-27 (`apps/web`, 16.4.3; Dependabot PR #684 proposes 16.4.5) needs independent CVE and version verification as normal maintenance. It is not part of this research.

## D. Experimental data and reproducibility

| Item | Location / value |
|---|---|
| Pilot database | `jobflow_test_t7_p1` in container `jobflow_postgres` (localhost:5433): 40 workspaces, 24 `PromptRun`, 24 `AiRun`, 80 artifacts |
| Pilot queue prefix | Redis `test_t7_p1:*` (no queued or active jobs at suspension) |
| Pilot storage root | `apps/api/storage/TEST_T7_P1_storage/` (git-ignored, 40 workspace folders) |
| Pilot worktree | `D:\projects_js\jobflow-t7-pilot`, detached at `ff05eeb`; its git-ignored `apps/api/.env` holds pilot keys and is never committed |
| Pilot processes | API :3100, web :3101 and runner all **stopped** |
| Cleanup manifest | `apps/api/storage/experimental-analysis-pilot/manifest/TEST_T7_P1.manifest.json` (every record id, path and hash; incidents; owner decisions) |
| Independent evidence archive | `apps/api/storage/experimental-analysis-pilot/evidence/`: copies of all 40 workspaces' files and a database export (`db/*.json`); `SHA256SUMS.txt`, 87 files, verified OK on 2026-11-27 |
| Evaluation data | `apps/api/storage/experimental-analysis-pilot/evaluation/` (`runs.json`, `aggregate.json`, `adjudication.json`, report copy); `SHA256SUMS-evaluation.txt` verified OK |
| Scripts | `apps/api/storage/experimental-analysis-pilot/scripts/`: `evaluate.js`, `aggregate.js` (offline), `env-guard.js`, `export-evidence.js`, `legacy-input-equivalence.js`, `run-pilot.js` (**paid; never run without owner approval**) |
| Frozen references | commit `bfce3cf`, sha256 `3dfca38508772f49395a4a2e02e62a35719563cecce14e86bd5dbd0a4eaf1a54` |
| Application commit of the pilot | `ff05eebc87c537e18b569e87cae6b2fd581e48b2` |
| Known missing artifacts | raw failed provider answers (never stored); usage of 7 failed calls (never stored); planned analyses #20–#36 (never started) |

All of this is **local and git-ignored**: it exists only on the owner's machine. Private evidence (vacancy texts, model outputs, CV-related data, keys) must never be committed.

**Offline re-evaluation:** `cd apps/api/storage/experimental-analysis-pilot/scripts && node evaluate.js && node aggregate.js`. This reads the manifest and the pilot storage and makes no provider call.

**Integrity check:**
```
cd apps/api/storage/experimental-analysis-pilot/evidence && sha256sum -c SHA256SUMS.txt
cd .. && sha256sum -c evaluation/SHA256SUMS-evaluation.txt
```

**Restore without the pilot database** (not executed). The evidence archive is enough for re-evaluation:
1. Recreate a fresh, empty, separately named database.
2. Import `evidence/db/*.json`, or point the scripts at `evidence/workspaces/` instead of the pilot storage.
3. Never restore into the working database `jobflow_cv`.

**Cleanup:** the T7 report, section 15; it needs a separate owner authorization.

## E. Resume procedure (numbered checklist)

1. Read this file completely.
2. Read ADR-046 in `project-management/DECISIONS.md` with all its amendments, especially 2026-11-26 (ISSUE-711) and 2026-11-27 (ISSUE-718).
3. Read the T7 report and the frozen references, including Part B (method) and Part C (conditions).
4. Inspect current `main`, epic #711 and its latest status comment, and any open issues or PRs of the epic. Confirm the T7 PR and the resume-document PR are merged; if not, ask the owner.
5. Verify the preserved evidence with the two checksum commands in section D. If the local archive is missing (another machine), say so; do not reconstruct results from memory.
6. Check what changed during the suspension:
   - `git log ff05eeb..origin/main -- apps/api/src/pipeline apps/api/src/ai apps/api/prisma/prompts apps/api/knowledge-sources`;
   - active templates and sources (`seed.ts`, `active-knowledge-sources.ts`);
   - provider, model and prices (`apps/api/src/ai/pricing.ts`; re-verify the provider's price page).
7. Reassess R1–R3 against the current code. Update the code locations, because the line numbers above refer to `ff05eeb`.
8. Prepare the next narrow task specification (normally **R1**) as a GitHub issue draft. Use the `issues` skill: v2 body, `issue-lint --require-v2`, independent draft review.
9. Wait for the owner's review, `spec-approved` and explicit authorization before any implementation. Use the `task-lifecycle` skill for the branch, PR and closure.
10. Obtain a separate owner approval of execution and budget, recorded on the stage's issue, before **every** paid evaluation (R4, a repeated pilot, Gate A). Never run `run-pilot.js` or any provider call without it.

Ready-to-use prompt for a future agent:

> Resume the suspended ADR-046 experimental structured analysis research in jobflow-cv-pipeline. Start with `project-management/plan/RESUME-experimental-structured-analysis.md` and follow its section E checklist exactly. Do not implement anything and make no paid provider call; prepare the R1 (failed-stage observability) issue specification for my review and stop.
