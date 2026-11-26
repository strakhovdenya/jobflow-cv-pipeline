# Plan: Experimental Structured Vacancy Analysis and Evidence-Map CV Generation

**PRD:** `project-management/prd/PRD-experimental-structured-analysis.md`
**Date:** 2026-11-26 (revision 3)
**Status:** Approved by the owner 2026-11-26. Revision 3 holds the focused corrections made after approval:
- the legacy reference after #709;
- stage identity and recovery reuse;
- comparison conditions and factor methodology;
- integration order and no base branch;
- the procedural strategy freeze.

Issues: epic tracker #711; T1 #712, T2 #713, T3 #714, T4 #715, T5 #716, T6 #717, T7 #718 (milestones "experimental-structured-analysis · Phase 1–3"). T8–T13 are not created yet.
**Foundation:** ADR-046 (`project-management/DECISIONS.md`). ADR-046 Phase 0 is done (#707, PR #708). Mapping to the ADR-046 roadmap: ADR Phase 1 = plan Phases 1–3; ADR Phase 2 = plan Phases 4–6; ADR Phase 3 = plan Phase 7.

Plan phases are split by app (api / web) and by evaluation boundary, as the plan skill requires. Tests for changed code live in the same task. Paid evaluation tasks produce reports only. Each one needs an owner approval comment on its issue before the first paid call (ADR-046 item 11). No code task has a paid call in its acceptance criteria.

**Legacy reference.** The state after #709 (ADR-046 amendment 2026-11-26):
- templates: `prompt_1` v13, `prompt_2` v15, `prompt_3` v11, `prompt_5` v1, `cover_letter` v6, `skip_reason` v2;
- the active sources listed in the PRD, `cv_rules` v0_10 among them;
- the #709 credential deduplication of the effective content.

T2's first step fixes this reference in invariance specs over the complete inputs.

**Policy authority.** The ADR-046 Appendix (with its amendments) is the only policy specification; tasks reference its row ids and never copy the table.

**Issue creation policy.** After plan approval, issues are created for plan Phases 1–3 only: T1–T6, the pilot T7 and an epic tracker. The Gate A issue (T8) is created after the B/C amendment. Phases 4–7 depend on the Gate A / Gate B outcomes. Their issues are created after the corresponding owner decision, from the evidence available then. They are listed here to fix boundaries and dependencies, not to pre-specify details.

**Protected paths and executors.** `apps/api/prisma/prompts/` and `apps/api/knowledge-sources/` are protected (`.factory/profile.json`).
- Interactive Claude Code: T3 (templates and seed) and T7 (paid evaluation with owner decisions), later the template part of T9 and the gate tasks.
- Ralph-eligible: T1, T2, T4, T5, T6.

## Implementation Phases

### Phase 1: Experimental analysis infrastructure (api)
**Goal:** An owner-started run of analysis strategy `b` or `c` produces three things: a legacy-shaped `01`, a deterministic policy decision with its trace, and the stage artifacts. The run is safe, reproducible and comparable through forks, and legacy is provably unchanged. Working result: everything runs end to end with the fake provider, with no paid call.
**Affects:**
- apps/api: `src/pipeline/`, `src/queue/workers/ai-step.worker.ts` (handler target only), `src/knowledge-sources/`, `src/workspaces/`, `src/ai/`, `src/config/env.validation.ts`, `src/artifacts/`.
- PostgreSQL: one Prisma migration.
- `prisma/prompts/` and seed: T3 only.
- Filesystem artifacts; `docs/`; root and app `CLAUDE.md`.

**Tasks:**
- [ ] **T1 — Deterministic analysis core (pure code).**
  - Contracts and validators for `01a`/`01b`/`01c`: contract major version, quote-substring check, enums, reference and coverage rules.
  - The evidence catalog: item keys per ADR-046 item 7.
  - The versioned policy function implementing the ADR-046 Appendix (by row id, not copied) and its order: trace with the deciding rule, `manual_review_required`, `borderline`, observational shadow sub-scores. It rejects a cause counted in two categories and a second downgrade for the same combination. Forced items are excluded from every count.
  - The projection to the legacy `01`, with a key-set assertion.
  - Scope limits: no provider, no database, no endpoint, no edit of an existing service. Table-driven tests cover every ADR-046 Appendix row.
  - Boundary: a new module under `src/pipeline/` with a narrow public contract (ADR-017/043).
- [ ] **T2 — Analysis strategies and the stage runner (code).** The steps below run in this order.
  - **Legacy invariance first.** On unchanged code, add the specs asserting that the template and the complete input context of all six legacy steps are byte-identical for a legacy workspace. This happens before any shared code changes (ADR-046 item 1).
  - **Migration.** `analysisStrategy`, the context profile (default `single`/`full`, the legacy request layout and Prompt 1 source set), `forkedFromWorkspaceId`, `comparisonGroupId`, all defaulting to legacy values.
  - **Selector.** An analysis selector in `pipeline/` with two implementations: legacy, the existing `Prompt1Service` path with unchanged input, and experimental. The worker's `prompt_1` handler targets the selector and reads no strategy.
  - **Stage runner** shared by `b`/`c`:
    - stage-keyed `PromptRun`s inside the `prompt_1` job and the `analysis_running` claim;
    - per-stage identity: template, contract major version, model identity, request settings, material inputs and the context profile, per the PRD "Stage identity". X1 has no candidate inputs;
    - recovery reuse only: within one workspace, after a failed attempt and before a completed analysis. No implicit reuse across workspaces;
    - on failure, rollback to `source_saved` through `StepFailureService` with step `prompt_1` and the stage named in the message;
    - X2 records the snapshot and catalog hash.
  - **Stage supporting code.**
    - `STEP_SOURCE_GROUPS` entries for the stage keys; X1 gets the `cv_rules` excerpt only.
    - Fake-provider answers for X1/X2/B.
    - Output caps in `OPENAI_STEP_MAX_OUTPUT_TOKENS`.
    - The candidate-constant block from `CANDIDATE_PROFILE_CONFIG`, with a consistency spec over the real active sources.
    - The two context-profile implementations: layout `single | boundary` inside the existing two-argument `complete()`, and source set `full | assessment`.
  - **Tests.**
    - Recovery: X2 fails after X1, and the next run makes exactly one provider call.
    - The worker reads no strategy.
    - Experimental workspaces' downstream inputs contain no `01a`–`01c`.
    - Specs use test templates. The real templates arrive in T3.
- [ ] **T3 — Experimental templates, seed and documentation (human, protected paths).**
  - X1, X2 and B templates, authored once as shared fragments and composed at seed time (A0 inside the experimental path): no CV-rendering note, no restated candidate constants, no project or credential name. A spec over the real templates checks the registry titles.
  - Seed rows for the stage keys only; legacy rows untouched.
  - Canonical artifact names for `01a`–`01c` and download names (ADR-036 amendment).
  - Root `CLAUDE.md` artifact list and invariant; `docs/04_architecture.md`, `docs/08_ai_pipeline.md`, `docs/03_domain_model.md`, `apps/api/CLAUDE.md`.
  - An e2e of the experimental `prompt_1` job path with the fake provider.
- [ ] **T4 — Downstream source-mismatch stop and sources-changed flag.**
  - For a workspace with a pinned snapshot, the Prompt 3 and cover-letter steps compare their selected sources (id and content hash, per the `STEP_SOURCE_GROUPS` types) with the pinned ones. On a mismatch they refuse with a readable reason before `PromptRun` creation and before the provider call.
  - Legacy workspaces and matching snapshots are unaffected.
  - The workspace detail gains the sources-changed flag.
  - Kept separate from T2 because it edits shared legacy input builders, under the T2 invariance specs; this isolates legacy-regression risk and keeps it independently revertible.
- [ ] **T5 — Source fork, comparison summary and workspace detail fields.**
  - **Fork endpoint (source fork only).**
    - Creates a new `JobVacancy`; `00` is byte-identical with the hash asserted.
    - Keeps company and role values, with a slug discriminator.
    - Copies the `ManualNote` rows.
    - Records the strategy, context profile, fork link and comparison group.
    - Carries over a frozen `01a` with its identity only on explicit request (C only, factor runs).
    - Enqueues nothing.
    - Is idempotent by an optional client request key (unique per source), so a resubmitted comparison never creates a second fork.
    - Rejects an archived source or an unknown value.
  - **Read-only comparison summary.**
    - Input-equality flags.
    - Input, cache-read, cache-write and output tokens, through a provider-neutral mapping of the stored usage JSON in `src/ai/`.
    - Latency and call count.
    - An estimate from a pricing table in `src/ai/`, labelled as an estimate.
    - Per member, the source included: status, active job state and last step error.
  - **`GET /workspaces/:id` fields:** strategy, context profile, and the policy fields read from `01c` (advisory decision, flags, deciding rule, open questions).
  - Swagger annotations and an e2e of the fork.

**Done when:** closes the PRD Phase 1 ACs, by task:

| PRD AC | Closed by |
|---|---|
| Determinism; Policy table coverage; Policy rejections; Manual-note items; Undetermined conditions; Borderline flag; Deciding rule; Projection; Contract validators | T1 |
| B and C runs; Recovery after a failed X2; Reuse rules; Legacy defaults and invariance; No strategy branching; Candidate constants | T2 |
| No names in experimental artifacts; the artifact-name part of Documentation | T3 |
| Downstream mismatch stop; Sources-changed flag | T4 |
| Source fork; Comparison summary; the annotation part of Documentation | T5 |

Order:
- **Development.** T1 → T2, then T3, T4 and T5 can be developed in parallel. T3 touches templates, seed and docs. T4 touches the Prompt 3 and cover-letter input builders. T5 touches the fork, the summary and `src/ai/` usage/pricing.
- **Integration into `main`** is sequential where files overlap:
  1. T3. It owns the artifact-name sections of root `CLAUDE.md` and `docs/04_architecture.md`.
  2. T4. It adds the sources-changed field to the workspace detail mapping in `workspaces.controller.ts` / `workspaces.service.ts`.
  3. T5. It adds the remaining detail fields to the same mapping and its endpoint sections to `docs/04_architecture.md`, rebased on T4.
- T6 depends on T4 and T5 merged.
- T3 is needed before any real (non-fake) run.

### Phase 2: Experimental analysis display (web)
**Goal:** In the dashboard, the owner sees the policy result and the advisory decision, can compare any combination of Legacy, B and C with one confirmation that states the workspaces and paid calls first, and can follow and review the comparison.
**Affects:** apps/web: pipeline view model, workspace page, compare dialog, comparison view.
**Tasks:**
- [ ] **T6 — Web: policy display, compare-strategies dialog, comparison view.**
  - "Recommendation (policy)" label and the advisory row, flags, deciding rule and open questions for non-legacy workspaces. Legacy rendering stays unchanged.
  - The sources-changed notice with the source-fork offer.
  - The "Compare strategies" dialog: any combination of Legacy, B and C, with the number of workspaces and total expected paid calls shown before one confirmation. It then forks each strategy with its own request key and starts each fork through the existing run-analysis endpoint. Rows are independent, nothing is preselected and nothing retries automatically.
  - The comparison view, refreshing while jobs are active: per-member status, policy and advisory decisions, flags, input-equality flags, usage and estimate, failures with one explicit retry action, and a link to each workspace. It has no approve or generate action.
  - View-model and component tests.

**Done when:** closes the PRD ACs "Web: policy display" and "Web: compare dialog". Depends on T4 and T5. It must merge before the pilot (T7) creates the first experimental workspace, so the dashboard never shows a policy result under the legacy "AI recommendation" label (ADR-046 item 4).

### Phase 3: Pilot and Gate A (paid evaluation, owner-approved)
**Goal:** A measured, owner-recorded choice between B and C, then a go/no-go for evidence-map generation.
**Affects:**
- Evaluation reports in `project-management/` (no CV text).
- Owner reference lists committed before the runs.
- Owner comments on the issues; dated ADR-046 amendments.
- Git-ignored local validation storage and the database rows of the evaluation workspaces.
- No application code.

**Tasks:**
- [ ] **T7 — Controlled pilot (Legacy / B / C) and B-or-C decision.**
  - **References first.**
    - The agent drafts the reference lists for S1, S3, S4 and Jobgether from the original vacancy texts, the verified candidate evidence, the frozen #702 requirement lists and the #690 protocol: acceptable decisions, expected uncertainty flags, requirements, expected evidence, critical items.
    - The owner reviews and approves them.
    - They are committed with their SHA-256 before any experimental run, and never derived from experimental output.
  - **Approval comment** before the first paid call (≈ $0.7, 48 calls).
  - Runs: S1, S3, S4 and Jobgether (#707 §11) × 3 runs × 3 arms, on one commit, snapshot, template set and model, interleaved.
  - Report: per vacancy, against the item 6 minimum bar and selection rule.
  - The owner records B, C or revise/stop as an ADR-046 amendment. The freeze of the other value is procedural: the amendment states it, no later fork uses it and its templates are not developed further. Existing workspaces stay readable. There is no code change.
- [ ] **T8 — Gate A: comparative analysis validation.**
  - Approval comment first. Estimate: B chosen ≈ 72–92 calls ≈ $1.25–1.6; C chosen ≈ 102–132 calls ≈ $1.25–1.65.
  - Legacy vs the chosen arm on 6–8 vacancies × 5 runs, including one clear apply from the re-labelled golden dataset and the ambiguous location and language cases. The report gives the within-vacancy score spread and the `borderline` flag rate on clear-cut vacancies.
  - Then the layout and source-subset factors, by the PRD factor methodology for the chosen arm. For C, X2 runs on a frozen `01a` carried over at fork time. For B, whole-call repeats per profile are reported as per-vacancy distributions. Factor results are reported separately from the architecture comparison and from each other; input-token and cache effects are reported separately. Shadow sub-scores are reported observationally.
  - Report against the analysis-side item 14 thresholds. The owner records the Phase 4 decision and any re-set of provisional numbers as amendments.

**Done when:** closes the PRD ACs "Pilot" (T7) and "Gate A" (T8), and the amendment part of "Docs in the shipping change". Depends on T1–T5 (T6 recommended). A stop here leaves legacy untouched.

### Phase 4: Evidence-map-driven CV generation (api) — conditional on Gate A
**Goal:** Map-aware Prompt 2 as one call on the pinned snapshot, with `02a` and non-blocking evidence-preservation findings. Legacy generation stays untouched.
**Affects:** apps/api (generation selector in `src/pipeline/`, worker `prompt_2` handler target, workspaces fork, checks, artifacts), Prisma migration, `prisma/prompts/` + seed (human part), `docs/`.
**Tasks:**
- [ ] **T9 — Generation strategy, analysis fork and P2-mapped with `02a`.**
  - `generationStrategy` (`legacy | mapped`) with the generation selector and both implementations.
  - The analysis fork; its creation status is fixed against `TRANSITIONS`, and the issue stops and asks if they conflict.
  - P2-mapped loading exactly the pinned snapshot; legacy-shaped `02` plus `02a`.
  - Reference-integrity validation as a step failure.
  - ADR-033, ADR-034 and ADR-037 behaviour preserved.
  - The template part is human-implemented. It is split out if the issue judges the task too large. Details come from Gate A evidence.
- [ ] **T10 — Evidence-preservation checks.**
  - Must-have-without-shown-candidate findings after generation.
  - Only-cited-evidence-removed findings on the effective content after Prompt 3.
  - Findings in the draft-review payload and the comparison summary.
  - Never blocking, never triggering regeneration.
  - Kept separate from T9 because the checks are the Gate B measurement instrument and must be verifiable independently of the generator they measure.

**Done when:** closes the PRD Phase 2 ACs "P2-mapped run", "Reference integrity", "Regenerate and field separation" (T9) and "Evidence-loss findings" (T10).

### Phase 5: Display of generation findings (web) — conditional on Phase 4
**Goal:** Draft review shows reference errors, potential evidence losses and documented substitutions with the item 9 severities.
**Affects:** apps/web.
**Tasks:**
- [ ] **T11 — Web: draft-review findings display.**

**Done when:** closes the PRD AC "Web findings display". Depends on T10.

### Phase 6: Gate B (paid evaluation, owner-approved) — conditional on Phases 4–5
**Goal:** A measured go/no-go for Phase 7.
**Affects:** evaluation report, owner comments, ADR-046 amendment; no application code.
**Tasks:**
- [ ] **T12 — Gate B: comparative generation validation.**
  - Approval comment first (≈ $1.2).
  - Per S1–S5, one frozen experimental analysis, then 3 legacy-P2 and 3 P2-mapped runs, each with Prompt 3.
  - Judged on the effective exported content: preservation, coverage, recall, findings, registry violations, unsupported claims, AI in a no-AI vacancy, credential relevance, Prompt 3 corrections by class, tokens, latency. Plus the owner's blind review.
  - The owner records the Phase 7 decision.

**Done when:** closes the PRD AC "Gate B".

### Phase 7: Conditional optimisation and promotion — conditional on Gate B
**Goal:** Adopt only the context and layout changes the measurements supported, enforce downstream pinning, and put a promotion proposal to the owner.
**Affects:** to be determined from the Gate A/B evidence. Candidates are named in ADR-046 items 12–14: source subsets in input builders, message-boundary layout, one source resolver, final evaluation.
**Tasks:**
- [ ] **T13 — Phase 7 tracker issue.** Created after Gate B. It lists the adoption candidates the data supported, and each becomes its own issue then. The tracker implements nothing and closes no AC itself.

**Done when:** the issues listed by T13 together close the PRD AC "Adoption and promotion report". Promotion and legacy retirement need a separate owner decision and a new ADR.

Integration branch: none.
- Ralph opens PRs only against the default branch or an unmerged dependency's task branch (dark-factory `ralph/README.md`, "Base"), so an epic base branch would make the Ralph-eligible tasks ineligible.
- Tasks integrate into `main` in the dependency order above. Ralph stacks a task on its dependency's branch while that dependency is unmerged.
- This is safe because legacy is the default and is guarded by T2's invariance specs, and an experimental workspace exists only through the fork.
- The pilot runs on one `main` commit after T1–T6 are merged.
- The epic tracker issue records the order and closes after the B/C amendment.

## Decisions taken

These were derived from ADR-046, repository conventions and code; they are not owner questions.

- **Task count: 12 tasks, the epic tracker and the Phase 7 tracker. 8 issues at approval (the epic tracker and T1–T7), T8 after the B/C amendment.** The plan does not create one task per prompt, schema or service. Separate tasks exist only where they isolate legacy risk (T4), protected-path work (T3), a measurement instrument (T10), an app boundary (T6, T11) or a gate (T7, T8, T12).
- **Each stage's identity covers the inputs that materially affect it.** This includes model identity, request settings and the context profile (ADR-046 amendment 2026-11-26). X1 stays reusable as item 13 states. Reuse is recovery-only; evaluation repetitions are fresh forks.
- **The default context profile is `single`/`full`.** Experimental arms then use the legacy request layout and the legacy Prompt 1 source set, so the pilot and the Gate A architecture comparison are not confounded by layout or source subset. `boundary` and `assessment` are Gate A factors.
- **The strategy freeze after the pilot is procedural** (an ADR amendment), with no code change.
- **The generation strategy and the analysis fork move to Phase 4.** In Phase 1 no fork could accept `mapped` without a generation selector. The analysis-fork status question is decided where it is first needed.
- **Re-assessment after a source change is a source fork**, not a new status transition.
- **Multi-strategy comparison is orchestrated by the web app** (T6): per strategy a fork, then the existing run-analysis call. It needs no batch endpoint. Duplicate paid runs are prevented by fork idempotency (T5) and by the existing queue duplicate check and Prompt 1 status precondition. The queue runs up to three AI jobs concurrently.
- **The message-boundary layout fits the existing `AiProvider.complete(prompt, inputContext)`.** The template and stable sources go in the system message and the dynamic content in the user message, so the provider interface stays unchanged.
- **A stage failure is recorded as step `prompt_1` with the stage named in the message.** The existing error lists and web mapping work unchanged.
- **The context profile ships in Phase 1.** Gate A needs its two implementations, and it costs little.
- **Budget.** Pilot ≈ $0.7 (48 calls). Gate A ≈ $1.25–1.6 if B is chosen, ≈ $1.25–1.65 if C is chosen. Gate B ≈ $1.2. Planned ≈ $3.0–3.5 (recomputed ≈ $3.1–3.6). The ≈ $7 reserve is an estimate, not authorised spending. Each stage is approved separately.

## Dependencies and sequence

```
T1 → T2 ─┬→ T3 ──────────────┐
          ├→ T4 → T5 → T6 ────┴→ T7 pilot (references → approval → runs) → B/C amendment → T8 Gate A → [owner: Phase 4?]
          (T3, T4, T5 developed in parallel; integrated in the order T3, T4, T5)
[Phase 4] T9 → T10 → T11 (web) → T12 Gate B → [owner: Phase 7?] → T13 tracker → its issues
```
