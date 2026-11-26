# PRD: Experimental Structured Vacancy Analysis and Evidence-Map CV Generation (next to the unchanged legacy pipeline)

**Date**: 2026-11-26
**Status**: Approved by the owner 2026-11-26 (revision 3: focused corrections after approval — legacy reference after #709, stage identity, comparison conditions, factor methodology, integration order; ADR-046 amendment of 2026-11-26)
**Affected part of the project**: `apps/api` (primary), `apps/web` (policy-result display, fork action, comparison view); PostgreSQL (strategy and fork columns); filesystem artifacts (`01a`–`01c`, `02a`); `docs/`.
**Related issue/backlog item**: epic tracker #711, tasks #712–#718; architecture proposal #707 (closed by PR #708, `67be0fe`); binding decision **ADR-046** (`project-management/DECISIONS.md`). Evidence base: #690 (validation protocol, Baselines A–C), #702 (Baseline D), #704 / PR #706 (credential registry refresh). Plan: `project-management/plan/PLAN-experimental-structured-analysis.md`.

## Goal

Build, next to the unchanged legacy pipeline, the smallest experimental pipeline that makes the vacancy decision explainable and stable and keeps relevant evidence in the generated CV: structured requirements, one shared evidence map, a deterministic decision policy and map-aware Prompt 2. Then decide by measurement (pilot, Gate A, Gate B) whether any of it should ever replace the legacy path. Legacy stays the default and unchanged throughout; promotion and legacy retirement are separate later owner decisions.

## Context and Project Alignment

**Problem (observed; ADR-046 Reason).** Baseline D (#702) showed two Prompt 1 flips on almost identical inputs (S3 skip 67 / maybe 68; S1 skip 61 / maybe 71) and the loss of a relevant portfolio achievement in Prompt 2 (S4, Cards authentication). No stored output shows which factor caused either: requirements have no ids, risk labels are free text, sub-scores are not output, evidence is cited by file. 91–95 % of input tokens are billed as cache writes. A step cannot be repeated on the same vacancy without a new workspace with a modified company name.

**Not yet known, therefore measured rather than assumed:** which mechanism caused the flips; whether the map fixes the evidence loss; whether smaller contexts improve quality; whether B (one structured analysis call) is as good as C (vacancy-only extraction X1 + candidate-aware assessment X2).

**Layers touched** (root `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`, `docs/04_architecture.md`):
- `apps/api/src/pipeline/` — analysis selector (Phase 1) and generation selector (Phase 2), the strategy boundary; stage runner; policy function; projection; checks.
- `apps/api/src/queue/workers/ai-step.worker.ts` — only the targets of the `prompt_1` (Phase 1) and `prompt_2` (Phase 2) handlers change to the selectors; job names, job ids and routing stay; the worker reads no strategy.
- `apps/api/src/workspaces/` — fork action, workspace detail fields; `apps/api/src/knowledge-sources/` — source groups for the new stages, snapshot comparison; `apps/api/src/ai/` — fake answers for the new stages, output caps, provider-neutral cache-read/write usage and the pricing table for the comparison summary; `apps/api/src/config/env.validation.ts` — per-stage output caps.
- Prisma: `ApplicationWorkspace` gains `analysisStrategy`, a fork link, a comparison group and an experiment context profile (Phase 1) and `generationStrategy` (Phase 2) — migrations. `PromptTemplate` rows for the new stage keys — seed. `PromptRun.promptStep` and `PromptTemplate.step` are strings (`schema.prisma:138,177`), so stage keys need no enum migration; the in-flight unique index is per workspace + step, so several stage keys coexist.

**Contracts that must stay compatible.** `01_vacancy_analysis.json` and `02_targeted_cv_content.json` keep the legacy shape. Prompt 3, Prompt 5, cover letter, skip reason, export, evidence guard, registry snapshot and review gates read only those shapes. New data lives in `01a`–`01c` and `02a` (ADR-046 item 15). `validateVacancyAnalysisJson` does not reject extra fields, so the "legacy shape only" rule needs its own key-set assertion.

**Related ADRs.** ADR-046 is the authoritative foundation: every requirement below traces to its numbered items. Also relevant:
- ADR-004 (human gate);
- ADR-006 (artifact list — extended);
- ADR-012 (export creates no `AiRun`);
- ADR-026 (Prompt 3 gate);
- ADR-027 (`originalDecision` — partly superseded by ADR-046 item 4 for non-legacy workspaces);
- ADR-032 / ADR-033 / ADR-034;
- ADR-036 amendment (download names);
- ADR-037 (stale Prompt 3 invalidation);
- ADR-038 (status machine, in-flight index, `StepFailureService`);
- ADR-040 (queue, no paid retries, per-step caps);
- ADR-043 (changeability).

**Stage identity (ADR-046 item 13 as amended 2026-11-26).** Each stage's identity (`inputHash`) covers exactly the inputs that materially affect that stage. Every stage includes: the template content hash, the contract major version, the provider and model identity, and the material request settings (output cap, response format). Beyond that:
- X1 (vacancy-only): the vacancy hash and the hash of its `cv_rules` AI-weight excerpt. A change of candidate sources or notes therefore keeps X1 reusable.
- X2 and the B stage: the vacancy hash, the `01a` hash (C only), the source snapshot, the catalog hash, the manual notes, the candidate-constant block and the context profile.
- P2-mapped (Phase 2): the `01*` hashes, snapshot, notes, candidate-constant block and context profile.

**Recovery reuse vs fresh runs.** Reuse is recovery only. Within one workspace, after a failed attempt and before a completed analysis, a stage whose identity, registered artifact and file hash all match is not re-run. Nothing is reused across workspaces implicitly. Every evaluation repetition is its own fork and therefore a fresh run. The one explicit carry-over is a frozen `01a` that the owner requests at fork time for factor runs: copied with its identity, verified, and shown in the comparison summary.

**Policy authority.** The decision-policy Appendix of ADR-046 in `project-management/DECISIONS.md` is the only authoritative policy specification, together with its later amendments. The PRD, plan, issues and code refer to its row ids (V, H1–H7, B1–B4, C1–C5, S1–S2, F) and do not copy the table. The policy version in code names the ADR-046 state it implements; a rule change is an amendment plus a new policy version.

## Dependencies

- ADR-046 / #707 — **DONE** (PR #708 merged 2026-11-26).
- #704 / PR #706 (credential registry refresh) — **DONE** (`33b5ded`).
- #709 / PR #710 (credential output integrity: `prompt_2` v15, `cv_rules` v0_10, deterministic credential deduplication in the effective content, selection warnings) — **DONE** (`b07908a`). The legacy reference is the state after #709 (ADR-046 amendment 2026-11-26). The #704 and #709 source and prompt changes make Baselines C and D historical references, not controls. The experiment runs its own legacy arm (ADR-046 item 11).
- #702 Baseline D, the #690 protocol and the frozen requirement lists for S1–S5 — **DONE** (inputs to the reference lists).
- Pilot references — **not started**; part of T7, not a blocker for the implementation issues. The agent drafts them from the original vacancy texts, the verified candidate evidence, the frozen #702 requirement lists and the #690 protocol: acceptable decisions, expected uncertainty flags, requirements, expected evidence, critical items. The owner reviews and approves them. They are committed with their SHA-256 before any experimental run and are never derived from experimental output.
- Phase 2 depends on the Gate A outcome; Phase 3 on Gate B (ADR-046 item 16).

## User Scenarios

- **Fork.** The owner forks a workspace from its source with analysis strategy `b` or `c`. The result is a new workspace with byte-identical vacancy text, the same company and role values, and copied manual notes. Nothing runs until the owner starts it, and the dialog shows how many paid calls a run will make.
- **Experimental analysis.** The owner runs the experimental analysis. The workspace reaches `paused_after_analysis` with a legacy-shaped `01` and the policy decision. The page shows the deciding rule, open questions and the `borderline` / manual-review flags, and the advisory model decision as a separate row.
- **Failed run.** An analysis run fails after X1 succeeded. The workspace rolls back to `source_saved` and the analysis card names the failed stage. The next owner-started run reuses the verified X1 artifact without a second paid X1 call.
- **Sources changed.** The active knowledge sources change after an experimental analysis. The workspace shows that the analysis used older sources and offers a source fork (a paid re-assessment). A Prompt 3 or cover-letter run on the old workspace is refused before any paid call.
- **Comparison.** The owner opens the comparison summary of Legacy / B / C forks. It shows whether the inputs were equal (vacancy hash, company and role, notes, snapshot, model). Side by side it shows decisions, flags, input tokens, cache-read and cache-write tokens, output tokens, latency, call counts and a labelled cost estimate.
- **Map-aware generation (Phase 2).** After Gate A, the owner runs map-aware generation on a frozen experimental analysis. The result is a legacy-shaped `02` plus `02a`. Draft review and the comparison summary show reference errors and potential evidence losses as findings. Export is not newly blocked.
- **Gates.** At each gate the owner decides from the reports: select B or C, proceed to Phase 2, proceed to Phase 3, or propose promotion. Or stops, leaving legacy untouched.

## In Scope

**Phase 1 — experimental analysis and comparison infrastructure** (ADR-046 items 1–8, 10, 13, 15, 16):
1. **Deterministic core, no provider calls.**
   - Contracts and validators for `01a`/`01b`/`01c` with a contract major version.
   - The evidence catalog from the pinned snapshot, with item keys per item 7.
   - The versioned decision-policy function implementing the ADR-046 Appendix (authoritative; referenced by row id, not copied) and its rule order, trace, `manual_review_required`, `borderline` with the deciding rule, and shadow sub-scores (observational only).
   - The projection to the legacy `01`.
2. **Analysis strategies `legacy | b | c`.**
   - An analysis selector inside `pipeline/` that has the existing Prompt 1 path as its legacy implementation, with legacy input unchanged.
   - One stage runner shared by `b` and `c`: X1 (C only), X2, or the B stage.
   - Per-stage `inputHash` as read above.
   - Reuse only of a completed stage `PromptRun` whose artifact is registered and whose file hash matches.
   - On failure, rollback to `source_saved` through `StepFailureService` with step `prompt_1` and a message naming the stage, so the existing analysis card shows it.
   - No automatic paid retry.
   - New source groups for the stages (X1: only the `cv_rules` AI-weight excerpt).
   - Fake-provider answers for the stages, output caps for the stage keys, and the candidate-constant block with its consistency spec.
   - X2 records the source snapshot and catalog hash.
   - An experiment context profile per workspace: layout `single | boundary` and source set `full | assessment`, default `single`/`full`.
     - The default reproduces the legacy request layout (template in the system message, everything else in the user message) and the legacy Prompt 1 source set. Architecture comparisons against legacy therefore differ only by architecture, and B and C run under identical conditions.
     - `boundary` (template and stable source pack in the system message, vacancy-specific content in the user message) fits the existing two-argument `AiProvider.complete()`.
     - `boundary` and `assessment` are used only for the Gate A factor measurements.
3. **Experimental templates.**
   - Authored once as shared fragments and composed at seed time: the X1 instructions, X2, and B = X2 + X1 instructions. This is A0 inside the experimental path: no CV-rendering note, no restated candidate constants, no project names.
   - Seed rows for the new stage keys only.
   - Canonical artifact names and download names fixed (ADR-036 amendment).
   - Documentation updated.
4. **Downstream integrity.**
   - For a workspace with a pinned snapshot, the Prompt 3 and cover-letter builders refuse a source mismatch before `PromptRun` creation and before any provider call.
   - The workspace detail exposes whether the active source set differs from the pinned one.
   - Legacy-invariance specs cover every legacy step.
5. **Workspace source fork and the read-only comparison summary.**
   - The source fork creates a new `JobVacancy` with byte-identical `00`, copies the company and role values with a slug discriminator, and copies `ManualNote` rows. It enqueues nothing.
   - At the owner's explicit request, the fork carries over a frozen `01a` (C only) for factor runs.
   - The comparison summary reads the cache-write tokens from the stored usage JSON through a provider-neutral mapping in `src/ai/`.
   - The workspace detail exposes the strategy, the policy fields read from `01c` and the advisory decision.
6. **Web.**
   - "Recommendation (policy)" label and an advisory row for non-legacy workspaces.
   - Flags, deciding rule and open questions.
   - A "sources changed" notice with the source-fork offer.
   - Fork dialog with expected paid calls; comparison summary view.
7. **Pilot and Gate A** (paid, each separately approved): Legacy / B / C pilot → B-or-C amendment → Gate A.
   - The freeze of the rejected value is procedural: the amendment records it, no further forks use it and its templates are not developed further. Existing workspaces stay readable. No code change.
   - Gate A runs the analysis comparison, then the factor measurements by the methodology below.

**Phase 2 — evidence-map-driven generation** (after Gate A; ADR-046 items 9, 15):
- `generationStrategy` (`legacy | mapped`) with the generation selector and both implementations. `mapped` requires a non-legacy analysis.
- The analysis fork: frozen `01*` and snapshot, approval not copied. Its creation status is decided in the Phase 2 issue against `workspace-status.service.ts`.
- P2-mapped as one call inside the `prompt_2` job, loading exactly the pinned snapshot.
- `02a`: requirement ids, bullet-level references, and additions / replacements / omissions with reasons.
- Reference-integrity checks after generation, and effective-content checks after Prompt 3. Findings appear in draft review and in the comparison summary.
- ADR-033, ADR-034 and ADR-037 behaviour kept.
- Web display of the findings.
- Gate B.

**Phase 3 — conditional optimisation and promotion** (after Gate B; ADR-046 items 12–14): adopt only the context reductions and layout changes the measurements supported; one source resolver with enforced pinning for every input builder; final evaluation; promotion proposal. This scope is deliberately not more specific than the evidence allows. Each item becomes an issue only after Gate B.

## Out of Scope

- Any change to legacy templates, active knowledge sources, legacy behaviour or legacy input bytes (ADR-046 item 1). Changing the default strategy. Promoting or retiring any pipeline (separate owner decisions and a new ADR).
- A Prompt 2 planner/writer split (D, deferred to Gate B). One call per concern (E). Shadow runs inside one workspace.
- Vector stores, embeddings, RAG, extra retrieval calls, a workflow engine or agent framework. A separate evidence database. Explicit achievement anchors in the sources (a new source version and a separate owner decision).
- The Responses API. Changing the `AiProvider` interface signature.
- New export blockers. Automatic paid regeneration. A new workspace status or queue. Any automatic enqueue of the second pipeline.
- Changing Prompt 3, Prompt 5 or the cover letter beyond the mismatch stop. Adopting shadow sub-scores into the decision (needs Gate A evidence and an amendment).
- Rewriting historical workspaces, artifacts, source versions, prompt versions or Baselines A–D.

## Key Invariants

- **Variation points.**
  - (1) The analysis strategy `legacy | b | c` (Phase 1) and the generation strategy `legacy | mapped` (Phase 2) change through their selectors in `apps/api/src/pipeline/`. Each selector arrives with both of its implementations in the same task (ADR-043). B and C share the stage runner and differ only by X1.
  - (2) The decision policy is a pure versioned function. A rule change is a new policy version, never an edit of a consumer.
  - (3) The experiment context profile changes the X2 layout and source set without touching the runner's callers.
- The legacy reference is the state after #709 (ADR-046 amendment 2026-11-26).
  - Templates: `prompt_1` v13, `prompt_2` v15, `prompt_3` v11, `prompt_5` v1, `cover_letter` v6, `skip_reason` v2.
  - Active sources: `cv_rules` v0_10_credential_output, `master_cv` and `profile_summary` v0_8_portfolio_refresh, `project_inventory` v0_8_portfolio_refresh, `career_cases` v0_9_portfolio_refresh, `tech_stack` v2_6_credential_refresh, `certifications` 2026-11_credential_refresh, `linkedin_source_decision` v0_3, `layout` 2026-06.
  - The #709 credential deduplication of the effective content and its selection warnings.
- `cv_rules` v0_10 is part of the complete input of Prompt 1, Prompt 2 and the cover letter. The cover-letter input also changes through the deduplicated effective content. The invariance specs therefore fix the complete input, not only the template.
- The template and the complete model input of every legacy step stay byte-identical for a legacy workspace. The invariance spec exists before any shared code is changed.
- `AiStepWorker`, `WorkspacesController` and `ReviewGatesService` do not branch on strategy values. The worker maps each step to one handler. The controller only passes or exposes the values. Queue job names, job ids, step endpoints and review gates stay.
- Prompt 3, Prompt 5, cover letter and skip reason read only the legacy `01`/`02` shapes. `01a`–`01c` and `02a` are read only by experimental stages, checks, the workspace detail mapping and the comparison summary.
- The policy decision is deterministic. The model's decision is advisory and never a policy input. The human gate and audited overrides are unchanged. `originalDecision` is written once, by the analysis, and no gate, override or downstream step reads it.
- No stage runs automatically after a fork. Both pipelines run on one vacancy only through an explicit owner action. No automatic retry after a paid call. No exactly-once billing claim.
- Model calls go only through `AiProvider`. Provider usage mapping and pricing stay in `apps/api/src/ai/`. Each stage key has its own output cap. The stages run inside the existing `prompt_1`/`prompt_2` jobs and the `analysis_running` claim. Status writes go only through `WorkspaceStatusService.transition()`, and failures through `StepFailureService`.
- ADR-034 forced items stay `user-forced, unverified`, are excluded from every policy count and never re-enable a `cvEligible: false` entry. No experimental template, policy or check names a specific project or credential. No unit test calls a real provider.
- Evidence references are valid only with their recorded snapshot. Deterministic reference checks are never reported as proof of semantic support.
- Each paid evaluation stage needs an owner approval of execution and budget, recorded as an owner comment on the stage's issue before its first paid call. No code task has a paid call in its acceptance.

## Technical Constraints

- Prisma migrations only for the workspace columns. PostgreSQL holds metadata, the filesystem holds artifacts under `STORAGE_ROOT`, with containment checked in the sink. `writeFile` is not atomic, hence reuse is verified by file hash.
- `apps/api/prisma/prompts/` and `apps/api/knowledge-sources/` are protected paths (`.factory/profile.json`). Template work is a separate, human-implemented task (label `ralph-needs-prompt-change`). Code tasks stay Ralph-eligible.
- Every new endpoint gets `@ApiOperation` and every new or changed DTO field an `@ApiProperty` (ADR-019). Every new source file has a same-named spec. Unit tests use fakes only.
- Changing a policy rule, adding a stage or choosing B vs C must not require edits to unrelated orchestration or domain modules.
- Cost reporting keeps three figures apart: measured provider usage (`AiRun` and its usage JSON), the list-price estimate, and the invoiced amount (not available to the application).

## Acceptance Criteria

*Phase 1 — infrastructure (verifiable without paid calls)*
- [ ] **Determinism.** Given identical structured analysis input, the policy function returns an identical decision and trace.
- [ ] **Policy table coverage.** Every ADR-046 Appendix row (V, H1–H7, B1–B4, C1–C5, S1–S2, F) has table-driven tests for its trigger, its named exception and its precedence in the rule order.
- [ ] **Policy rejections.** The policy rejects a cause counted in two categories and a second downgrade for the same combination.
- [ ] **Manual-note items.** Manual-note forced items change no policy count.
- [ ] **Undetermined conditions.** Given an `undetermined` eligibility condition, no risk or weight is added. For work authorisation, remote eligibility/location or a mandatory language, `manual_review_required` is set. The decision is never rewritten.
- [ ] **Borderline flag.** `borderline` is set:
  - within 3 points of 55/65/75;
  - when a judgement-based hard constraint or a strategic exception decided the outcome;
  - when the advisory decision differs.
- [ ] **Deciding rule.** The trace always names the deciding rule.
- [ ] **Projection.** The projection of `01a`–`01c` passes `validateVacancyAnalysisJson` and keeps `wishlist`, `hidden_role_logic` and `manual_note_forced_claims`. A key-set assertion shows it holds no field outside the legacy schema.
- [ ] **Contract validators.** The validators reject:
  - a quote that is not a substring of the vacancy;
  - an unknown enum value;
  - an unresolved reference, or a non-displayable entry offered for display;
  - missing requirement coverage;
  - an unknown contract major version.
- [ ] **B and C runs.** With the fake provider, `b` and `c` run on one stage runner and produce equal-shaped `01b`/`01c`. C makes two provider calls, B makes one.
- [ ] **Recovery after a failed X2.** Given X1 completed and X2 failed:
  - the workspace is back at `source_saved`;
  - `lastStepErrorStep` is `prompt_1` and the message names X2;
  - the next run makes exactly one provider call.
- [ ] **Reuse rules.**
  - A stage is not reused when its artifact hash, its own identity (template, contract major version, model identity, request settings, its material inputs, context profile) or its workspace differs.
  - X1 is reused after a change of candidate sources or notes.
  - Two forks of one source never reuse each other's stage results, unless the owner requested the frozen `01a` carry-over.
- [ ] **Legacy defaults and invariance.**
  - A new workspace defaults to `legacy`.
  - For a legacy workspace, specs show the template and complete input context of Prompt 1, Prompt 2, Prompt 3, Prompt 5, skip reason and cover letter are unchanged.
  - For an experimental workspace, the Prompt 3, Prompt 5, cover-letter and skip-reason input contexts contain no `01a`–`01c`/`02a` content.
- [ ] **No strategy branching.** The worker has one handler per step and does not read the strategy. `ReviewGatesService` has no reference to strategy values.
- [ ] **No names in experimental artifacts.** The experimental templates and the policy module contain no title of any registry project or credential (spec over the real files).
- [ ] **Downstream mismatch stop.** Given a workspace with a pinned snapshot whose selected sources differ by id or content hash, the Prompt 3 and cover-letter steps refuse with a readable reason before `PromptRun` creation and before any provider call. A legacy workspace and a matching snapshot are unaffected.
- [ ] **Sources-changed flag.** The workspace detail reports `sources changed since analysis` when the active set differs from the pinned snapshot.
- [ ] **Candidate constants.** A spec over the real active sources fails when they state different language levels, location or work authorisation than `CANDIDATE_PROFILE_CONFIG`. The stage block contains no contact data.
- [ ] **Source fork.**
  - Creates a new `JobVacancy` with `00` byte-identical (hash asserted).
  - Keeps the company and role values, with a slug discriminator.
  - Copies the manual notes.
  - Records the fork link and comparison group.
  - Enqueues no job.
  - A fork of an archived workspace, or with an unknown strategy value, is rejected.
- [ ] **Comparison summary.**
  - Flags any difference in vacancy hash, company and role, notes, snapshot or model.
  - Reports input, cache-read, cache-write and output tokens, latency, call count and an estimate labelled as such.
  - A workspace outside the group is not included.
- [ ] **Web: policy display.** A non-legacy workspace shows "Recommendation (policy)" with the advisory decision as a separate row, the flags, the deciding rule and open questions. A legacy workspace renders as before.
- [ ] **Web: fork dialog.** The fork dialog shows the expected paid calls for the chosen strategy, and the comparison view shows the input-equality flags.
- [ ] **Documentation.** The new artifact names are in root `CLAUDE.md` and `docs/04_architecture.md`. Every new endpoint and DTO field is annotated.
- [ ] **Pilot.**
  - The owner references are committed before any run, and the owner's approval comment exists before the first paid call.
  - The report gives, per vacancy: requirement completeness and precision against the reference, decision correctness and stability, cross-run matching, map recall, tokens and latency.
  - The ADR-046 item 6 minimum bar and selection rule are applied.
  - The owner's outcome (B, C, or revise/stop) is recorded as an ADR-046 amendment.
- [ ] **Gate A.**
  - Legacy vs the chosen arm on 6–8 vacancies × 5 runs.
  - The within-vacancy score spread and the `borderline` flag rate on clear-cut vacancies are reported.
  - The layout and source-subset factors are reported separately from the architecture comparison, by the factor methodology below, for whichever arm was chosen.
  - Pass/no-pass is stated against the analysis-side ADR-046 item 14 thresholds.
  - The owner records the Phase 2 decision, and any re-set of the borderline margin, as an ADR amendment.

*Phase 2 — generation (after Gate A)*
- [ ] **P2-mapped run.** Runs as one call within the `prompt_2` job, on exactly the pinned snapshot. Writes a legacy-shaped `02` and `02a`. Its draft passes the existing evidence guard and export gate unchanged. A legacy-generation workspace is unchanged.
- [ ] **Evidence-loss findings.** A finding is produced in draft review and in the comparison summary:
  - given a must-have with a displayable candidate that is neither shown nor omitted with a reason;
  - given a Prompt 3 correction that removes the only cited evidence of a must-have (checked on the effective content).

  No finding blocks export or triggers a paid regeneration.
- [ ] **Reference integrity.** A reference to a missing id, an unresolved path or a non-displayable entry is a reference-integrity error. P2 additions are validated and counted as map-recall misses.
- [ ] **Regenerate and field separation.** Regenerating after Prompt 3 invalidates stale Prompt 3 artifacts (ADR-037). The public/internal field separation of ADR-033 holds.
- [ ] **Web findings display.** Draft review shows the findings with the severities of ADR-046 item 9.
- [ ] **Gate B.**
  - Per frozen analysis, 3 legacy-P2 and 3 P2-mapped runs, each followed by Prompt 3.
  - Judged on the effective exported content with the owner's blind review.
  - The owner records the Phase 3 decision.

*Phase 3 — conditional*
- [ ] **Adoption and promotion report.**
  - Each adopted context or layout change is backed by a stated Gate A/B measurement.
  - One source resolver serves every input builder before any promotion proposal.
  - The final report evaluates every ADR-046 item 14 condition separately.

*Documentation (every phase)*
- [ ] **Docs in the shipping change.** `docs/04_architecture.md`, `docs/08_ai_pipeline.md` and the app `CLAUDE.md` files reflect the shipped behaviour in the same change that ships it. The B/C outcome and any change of a provisional number are recorded as ADR-046 amendments.

## Test Requirement (Sketch)

- **Unit tests with fakes:**
  - policy table, validators, catalog keys, projection;
  - stage runner reuse and recovery, selectors;
  - fork, comparison summary, snapshot mismatch stop;
  - Phase 2 checks.

  Every source file has its same-named spec.
- **Specs over real files:**
  - legacy input/template invariance for all six legacy steps;
  - candidate-constant consistency;
  - no names in the experimental templates and the policy.
- **Deterministic recovery test** with the fake provider.
- **e2e** (real Postgres/Redis in CI): the fork endpoint and the experimental `prompt_1` job path with the fake provider.
- **Web view-model/component tests** for the label/rows, fork dialog and comparison view.
- **Paid evaluation:** manual, owner-approved and reported outside CI. It is never an acceptance gate of a code task.

## Evaluation Methodology, Budget and Gates

- **Controls.**
  - All arms of a comparison run on one commit, one pinned snapshot, one template set and one model/provider configuration. They are interleaved in one time window, through forks of one workspace per vacancy.
  - Baselines A–D are historical references (regression classes, the #690 §2 must-keep list), never controls. Post-#704 legacy runs count as the reference only under the ADR-046 item 11 condition.
  - A source version used in a comparison is activated once, before the stage starts.
- **Independent dimensions (never compensated by one another):**
  - decision correctness against the acceptable set;
  - stability against the arm's modal decision, with differing runs flagged `borderline`;
  - requirement completeness and precision;
  - cross-run requirement matching by quote spans;
  - evidence preservation (critical items zero-tolerance);
  - map recall;
  - safety (registry violations, unsupported claims, AI in a no-AI vacancy);
  - context (input tokens);
  - latency and call count.
- **Context vs cost.** These are reported separately:
  - input-token reduction (a context claim);
  - cache read/write tokens and billed savings (a cost claim, never a context claim);
  - output tokens, latency, call count.
- **Comparison conditions.** The pilot and the Gate A architecture comparison run B and C with the default context profile `single`/`full`. That reproduces the legacy request layout and the legacy Prompt 1 source set, so legacy inputs stay untouched and the architecture is the only difference.
- **Factor methodology (Gate A, after the architecture comparison).** The two factors are measured separately from the architecture and from each other, each against the `single`/`full` runs of the chosen arm already made in Gate A.
  - *Input tokens* are a deterministic function of the request. One call per factor profile per vacancy measures them. The token difference of a subset is also visible in the request before any call.
  - *Cache behaviour (layout `boundary`).* Two consecutive calls with the same profile on the same vacancy, inside the cache lifetime, show cache reads and writes. This is done on two vacancies.
  - *Quality neutrality (source set `assessment`).* Repeated runs of the chosen arm with the subset profile are compared on the Gate A metrics.
  - *If C is chosen,* X1 stays frozen through the explicit `01a` carry-over, so only X2 varies.
  - *If B is chosen,* there is no separable stage. The whole B call is re-run per profile, and the comparison is reported per vacancy as a distribution, with the larger run-to-run variance stated.
  - No additional pipeline or strategy value is built for these measurements.
- **Pilot.** S1, S3, S4 and Jobgether (#707 §11) × 3 runs × Legacy / B / C = 36 runs = 48 calls ≈ **$0.7**.
- **Gate A.** Legacy vs the chosen arm, 6–8 vacancies × 5 runs = 30–40 legacy calls plus 30–40 B calls (B chosen) or 60–80 C calls (C chosen; X1 is ≈ 5K input). Factor calls: ≈ 12 — two vacancies × two `boundary` calls, plus four vacancies × two `assessment` runs.
  - B chosen: ≈ 72–92 calls ≈ **$1.25–1.6**.
  - C chosen: ≈ 102–132 calls ≈ **$1.25–1.65**.
  - Basis, cold, list price: legacy Prompt 1 ≈ $0.017; B ≈ $0.018; C ≈ $0.019 per run (X1 ≈ $0.002); X2 alone ≈ $0.017. The ADR estimate was ≈ $1.1–1.4.
- **Gate B.** S1–S5, one frozen analysis each, then 3 legacy-P2 + 3 P2-mapped runs, each with Prompt 3. That is ≈ 65–70 calls ≈ **$1.2**.
- **Total.** Planned ≈ **$3.0–3.5** (recomputed with the Gate A counts above: ≈ $3.1–3.6). A ceiling including one re-run of an invalidated stage, ≈ **$7**, is a proposal for the owner's per-stage approvals, not an ADR figure. Nothing is authorised by this PRD.
- **Gate outcomes.**
  - Pilot: B, C, or revise/stop.
  - Gate A: Phase 2, iterate, or stop.
  - Gate B: Phase 3, keep the experimental analysis only, or stop.
  - Promotion: a proposal against ADR-046 item 14, decided by the owner in a new ADR.

## Rollback and Recovery

- **Rollback.** Stop creating experimental forks. Legacy is the default and unchanged; experimental workspaces stay readable. The new columns default to legacy values, so no destructive migration is needed.
- **Failed step.** A failed experimental step rolls back to its entry status with a readable reason. Re-runs are owner-started only. Completed, hash-verified stages are reused.
- **Sources changed.** The workspace shows it and offers a source fork as the paid re-assessment, so no new transition is needed. The downstream mismatch stop refuses before any paid call.
- **Stated limits.**
  - A process dying after the provider answered but before `AiRun` is saved can cost one repeated paid call.
  - In C, between X1 completion and the X2 `PromptRun` creation, no stage run is in flight. Only the queue's duplicate-job 409 and the `analysis_running` claim protect that window. The Phase 1 issue verifies this, and adds a test if needed.

## Risks and Limitations

- **Variable judgements.** Upstream model judgements remain variable although aggregation is deterministic. This is measured and flagged, not hidden.
- **Policy settings are initial.** Thresholds and discretionary rules are experimental starting values, not validated career decisions. Correctness against acceptable sets checks that the policy does not systematically reject reasonable opportunities.
- **Small samples.** Runs of one vacancy are not independent, so results are reported per vacancy, and deterministic tests carry the hard evidence.
- **Double maintenance.** Two pipelines mean double maintenance. This is time-boxed by the gates, and the arm the pilot rejects is frozen procedurally.
- **Integration on `main`.** The experimental code reaches `main` task by task. This is safe because legacy stays the default and is guarded by the invariance specs, and an experimental workspace can only be created through the fork. The first experimental workspaces are created in the pilot, after the web display (T6) is merged.
- **Human-implemented templates.** Template work is human-implemented (protected paths), which is a scheduling risk for the critical path.
- **C latency.** C adds a call (+15–30 s estimated), which the pilot must justify.
- **Cache evidence.** Cache behaviour on Chat Completions for this model is undocumented. Layout effects stay hypotheses until Gate A.
- **Owner time.** The owner's reference lists, approvals and blind reviews are on the critical path.
- **Phase 3 detail.** Phase 3 is deliberately unspecified beyond ADR-046.

## Open Questions

None block approval. Decisions derived from ADR-046, conventions and code are listed in the plan ("Decisions taken"). Owner actions, not questions:
1. Write and commit the pilot reference lists.
2. Approve each paid stage and its budget when it is reached.
3. Record the B/C outcome.

## Documentation to Update

- Root `CLAUDE.md`: the canonical artifact list, and a key invariant on strategy selection.
- `docs/04_architecture.md`: modules, data flow, fork and summary endpoints, artifacts.
- `docs/08_ai_pipeline.md`: stages, contracts, policy.
- `docs/03_domain_model.md`: new workspace fields, and the analysis-fork creation status in Phase 2.
- `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md`.
- `project-management/DECISIONS.md`: amendments only. A new ADR only for promotion or retirement.

## Proposed Subtask Breakdown

1. Deterministic analysis core (Phase 1, pure code).
2. Analysis strategies and the stage runner (Phase 1, code; Ralph-eligible).
3. Experimental templates, seed and documentation (Phase 1, protected paths; human).
4. Downstream source-mismatch stop and the sources-changed flag (Phase 1).
5. Workspace source fork, comparison summary and workspace detail fields (Phase 1).
6. Web display, fork dialog and comparison view (Phase 1, `apps/web`).
7. Pilot and B/C decision; Gate A (paid evaluations; reports only).
8. Generation strategy, analysis fork, P2-mapped, `02a` and checks; web findings; Gate B (Phase 2, after Gate A).
9. Conditional optimisation and promotion (Phase 3, after Gate B; issues created only then).

Integration: no long-lived epic base branch. Ralph opens a task's PR against the default branch, or against the task branch of a dependency that is not yet merged (dark-factory `ralph/README.md`, "Base"). It cannot target an epic base branch, so a base branch would make the code tasks Ralph-ineligible. Tasks therefore integrate into `main` in dependency order, stacked on an unmerged dependency where needed. An epic tracker issue records the order and closes Phase 1 after the pilot decision.

## Влияние на конечный автомат

No new status, transition or queue in Phase 1. The experimental analysis reuses the Prompt 1 path (ADR-038 and its ISSUE-307 amendment):

| Action | Precondition | Field A after | Field B after | Status after |
|---|---|---|---|---|
| Run experimental analysis | `source_saved`, or a dead `analysis_running` | stage artifacts and `PromptRun`s | `currentDecision`/`originalDecision` = policy result, `score` | `analysis_running` → `paused_after_analysis` |
| Experimental analysis fails (X1, X2 or validation) | `analysis_running` | `lastStepErrorStep = prompt_1`, the message names the stage | verified stages stay reusable | rolled back to `source_saved` |
| Source fork | source workspace not archived | new `JobVacancy` + workspace, strategies set | approval and decisions not copied | new workspace at `source_saved` (default on creation, not a transition) |

Phase 2 adds the analysis fork (a workspace holding a frozen, approved-later analysis). Its creation status and the copied decision fields are fixed in the Phase 2 issue against `TRANSITIONS`. If they conflict, that issue stops and asks (root `CLAUDE.md`).

## Влияние на модель данных

`ApplicationWorkspace` (Phase 1 migration):
- `analysisStrategy` (`legacy | b | c`, default `legacy`);
- the context profile (`single | boundary`, `full | assessment`, defaults `single` / `full`; relevant only for non-legacy analysis);
- nullable `forkedFromWorkspaceId` and `comparisonGroupId`.

Phase 2 migration: `generationStrategy` (`legacy | mapped`, default `legacy`).

Other changes:
- A fork creates its own `JobVacancy` row (`jobVacancyId` is unique per workspace) and its own `ManualNote` rows.
- New `PromptTemplate` rows for the stage keys (seed). The stage keys are `PromptRun.promptStep` strings.
- New canonical artifacts `01a`–`01c` (Phase 1) and `02a` (Phase 2), registered through the artifact service, with download names per the ADR-036 amendment.

## API-поверхность

- Phase 1: one new workspace endpoint, the source fork, and one read-only comparison-summary endpoint. Both get `@ApiOperation` and annotated DTOs (ADR-019).
- `GET /workspaces/:id` exposes:
  - the strategy and the context profile;
  - the policy result fields from `01c`: advisory decision, `borderline`, `manual_review_required`, deciding rule, open questions;
  - the sources-changed flag.
- Phase 2: the fork accepts an analysis start stage and a generation strategy.
- Existing step endpoints, job ids, the `202` + `jobId` contract and the review-gate endpoints are unchanged.
