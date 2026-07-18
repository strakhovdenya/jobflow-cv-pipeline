# JobFlow CV Pipeline — AI Output Calibration & Manual Parity Testing

## 1. Purpose

This document defines the methodology for two related, sequential activities:

- **Calibration** (Phase 17 / EPIC-24) — tuning `PromptTemplate` content for Prompt 1 and Prompt 2
  so AI-produced output converges with what the project owner currently produces manually for the
  same vacancy.
- **Manual parity testing** (Phase 18 / EPIC-25) — after calibration, a formal manual QA pass
  confirming the pipeline generalizes to *new* real vacancies, not just the golden set it was
  tuned against.

Both depend on Phase 16 (EPIC-23) first closing the knowledge-source-content and manual-note gaps
described below — calibrating prompt wording against a model that never receives real source
content cannot converge on anything meaningful.

## 2. Why Calibration Is Needed (Background)

The manual workflow this product replaces (`docs/00_product_vision_updated_consistent.md` §2)
happens inside the ChatGPT **web app**, one AI chat session per vacancy. A real transcript of a
full session (Prompt 1 → Prompt 2 → Prompt 3 → PDF, reviewed while planning this phase) surfaced
concrete properties of that manual flow the automated pipeline does not yet replicate:

1. **Real source content is visible to the model.** In the manual chat, the user's master CV,
   project inventory, tech stack matrix etc. are part of what the model can draw on. In the
   current pipeline, `PromptInputBuilderService` (Prompt 1), `Prompt2InputBuilderService` and
   `CoverLetterInputBuilderService` all substitute the literal placeholder string
   `[content not loaded in MVP]` for every knowledge source instead of its real content — a gap
   tracked since TASK-037B and never closed (TASK-037C-0/037C only registered file *metadata* in
   PostgreSQL). Phase 16 closes this.
2. **Ad hoc human clarifications carry forward.** In the manual chat, the user can type a
   correction or instruction mid-flow ("no commercial AWS experience, remove that", "add this
   project") and the chat's own memory carries it into later steps. The pipeline already carries
   forward each step's *own* output (`Prompt2InputBuilderService` includes the full
   `01_vacancy_analysis` artifact as `=== PROMPT 1 ANALYSIS ===`), but has no field for a
   human-authored note. Phase 16 adds this as a single accumulating per-workspace field — not a
   full multi-turn chat system.
3. **Every step self-scores its own output.** The transcript showed each of Prompt 1, Prompt 2
   and Prompt 3 ending with an "Output Quality Score" — a weighted rubric out of 100, a verdict,
   and a proceed yes/no. `FinalCheckOutput` (Prompt 5) already has an equivalent `quality_score`
   field; `VacancyAnalysis` (Prompt 1) and `TargetedCvContentOutput` (Prompt 2) do not. Phase 16
   adds it to both.
4. **The prompt wording itself does not exist yet.** `prisma/seed.ts` marks every seeded
   `PromptTemplate` as placeholder content pending prompt-engineering review — none contain real,
   refined wording. The project owner already has manually-refined, heavily-iterated prompt text
   for each step (the same text used to produce the reviewed transcript). Phase 17 imports and
   adapts that text rather than writing prompt wording from scratch.
5. **The manual prompts assume the ChatGPT web app's environment, not a bare API call.** The web
   app gives a prompt implicit capabilities an API-based call does not automatically have — e.g.
   its own browsing feature (used in the reviewed transcript to verify a real employer via a
   LinkedIn lookup), its file-attachment handling, and its session memory. Some of these map
   cleanly onto mechanisms this pipeline already has or Phase 16 adds (attachments → knowledge
   source content wiring; session memory for the human's own input → the manual note); others
   (e.g. live browsing) do not have an equivalent yet. Phase 17's prompt-import step must audit
   each imported prompt for this kind of web-app-specific assumption and, for anything not already
   covered, reword the instruction with an explicit fallback (e.g. `needs_verification`, the same
   pattern already used for `needs_evidence`) rather than silently dropping it or having the model
   guess. Whether it is worth building a dedicated capability to close a specific gap found this
   way is a decision to make once the real prompt files reveal what is actually needed — not
   something to design blind ahead of time.

Points 1–3 are prerequisites (Phase 16) — calibrating prompt wording against a model that never
receives real source content, or that lacks the same self-assessment signal the manual flow
already has, cannot converge on anything meaningful. Points 4–5 are the actual work of Phase 17.

## 3. Golden Dataset

### 3.1 Source

Built from real, already-completed application folders — the same ones referenced in
`docs/00_product_vision_updated_consistent.md` §3 (`Action1/`, `Amach/`, etc.). A usable golden
case needs, at minimum:

- the original vacancy text (already exists as the folder's `.txt` source file);
- the manually-produced targeted CV content for that vacancy (the manually-written
  `03_targeted_CV_content_*.md` or equivalent);
- for skip cases: the manually-written skip reason, if one exists.

Folders with only a vacancy text file and no manual CV output yet (e.g. an application still in
progress) are not usable as golden cases — there is nothing to compare against.

### 3.2 Recording

Each golden case should record, at minimum:

```text
- workspace slug or folder reference
- vacancy source text (path or copy)
- manual decision (apply / maybe / skip) as it was actually made at the time, if known
- manual targeted CV content (or skip reason) actually produced
- date added to the golden set
```

Where the golden set is physically stored (a `knowledge-sources/`-adjacent folder, a
`project-management/` file, or workspace records created specifically for calibration) is an
implementation decision for Phase 17 — this document defines what must be captured, not the
storage mechanism.

## 4. Comparison Method

**Do not compare with a literal text diff.** Exact wording will never match between a human and an
AI, and is not the goal — evidence-grounded substance is.

### 4.1 Decision-level comparison (Prompt 1)

- Does the AI's apply/maybe/skip recommendation match the decision the project owner actually
  made for that vacancy?
- If not: is the mismatch a reasoning gap (AI missed something a human caught) or a legitimate
  difference in risk tolerance? Record which.

### 4.2 Content-level comparison (Prompt 2)

Compare section by section, not as one block:

| Section | What to check |
|---|---|
| Headline / positioning | Same overall angle, not necessarily same words |
| Summary | Same key claims emphasized |
| Top skills | Same core skills surfaced, in roughly the same priority |
| Experience bullets | Same achievements/responsibilities represented; no invented ones |
| Evidence table / `needs evidence` flags | AI does not flag things the human evidence set actually supports (a sign source content isn't reaching the model), and does not overclaim things the human draft doesn't claim |

### 4.3 Recording a comparison result

For each golden case, record: decision match (yes/no + note), and a short per-section verdict
(match / partial / mismatch + note) for the CV content. Keep this alongside the golden case data
(§3.2).

## 5. Convergence Criteria (Phase 17 Done Criteria)

Calibration is "done enough" for Phase 17 when, across the full golden set:

- Decision-level matches for all cases, or every mismatch is explicitly reviewed and accepted with
  a documented reason (not silently ignored).
- No section-level "mismatch" verdicts caused by missing evidence/source content (that would
  indicate Phase 16 wasn't actually fixed, not a prompt-wording problem).
- Remaining section-level "partial" verdicts are limited to stylistic differences, not missing or
  invented substance.

If convergence isn't reached, iterate on the relevant `PromptTemplate` (new version, per
`CLAUDE.md`'s Prompt Pipeline Rules — never silently overwrite a version) and re-run the golden
set.

The self-assessment `quality_score` added to `VacancyAnalysis`/`TargetedCvContentOutput` in
Phase 16 (§2 point 3) is a secondary signal, not a substitute for the manual comparison above — a
high self-reported score does not mean the output matches the manual baseline, only that the
model considers its own output internally consistent. Use it to spot-check for cases where a low
self-score correlates with a real mismatch, not as the pass/fail criterion itself.

## 6. Manual Parity Testing (Phase 18)

Once Phase 17's convergence criteria are met, run the same comparison method (§4) against a small
number of **new** real vacancies — ones not in the golden set, ideally processed for the first
time going forward. This checks generalization, not just golden-set overfitting.

Record each parity-test pass in `project-management/TEST_LOG.md`, same as any other manual test
(see the TASK-005/TASK-059 persistence-check entries for the expected level of detail: what was
run, what was compared, and the result).

If a parity-test case reveals a real mismatch, treat it as a regression: either fix it (new
`PromptTemplate` version, back to Phase 17) or explicitly document it as an accepted limitation —
do not silently let it pass.

## 7. Out of Scope (for this first pass)

- Automatic/AI-graded comparison (LLM-as-judge). Comparison in Phase 17/18 is manual.
- Calibrating Prompt 3 (pre-PDF check) or Prompt 5 (final check) — only Prompt 1/Prompt 2 are in
  scope until core parity is reached.
- A full multi-turn conversation system replacing the single manual-note field from Phase 16.
