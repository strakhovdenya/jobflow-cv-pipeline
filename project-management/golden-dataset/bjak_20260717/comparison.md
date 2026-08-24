## bjak_20260717

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | yes (maybe/68) | match | match | match | match | match | Same "backend-focused Full Stack Engineer" angle; same 3 career cases (ProductsUp, Amplience, CommerceTools); same needs_evidence and remove flags. AI's Selected Projects picks AI Job Assistant/Email Camp instead of manual's JobFlow-centered block — attributed at the time to a schema-driven structural difference. ISSUE-238 found this attribution was wrong (see Round 2). |
| 2 | prompt_1 v10 / prompt_2 (unmodified — code fix, not a prompt edit) | yes (maybe/94) | match | match | match | match | match | ISSUE-238 root-cause finding: Round 1's "Selected Projects instead of Current Independent Work block" was **not** a schema limitation — `TargetedCvContentBlock.current_work_block` is a required schema field and the AI populated it correctly (JobFlow, HEY ALTER! volunteering, Python/FastAPI) in every round-1 case's `02_targeted_cv_content.json`, but `Prompt2Service.buildMarkdown()` never rendered it into the `.md` artifact — a code bug, not a prompt or Phase-16 evidence-wiring issue (final PDF export was unaffected; `prompt2-to-cv-content.mapper.ts` already read this field correctly). Fixed in `prompt2.service.ts`, workspace regenerated via real Prompt 2 call (`AI_PROVIDER=openai`) on the fix; `.md` now renders "Current Independent Work & Portfolio Projects" with JobFlow + HEY, ALTER! bullets, matching manual-cv.md. |

## Prompt 3 — Pre-PDF Check (ISSUE-249, 2026-08-24)

Real Prompt 3 run (`AI_PROVIDER=openai`, `prompt_3` v2/`prompt3_v2.txt`) against the approved
`02_targeted_cv_content.json`, compared to `manual-cv.md`'s "Version 2 — EGZ Added + Final Pre-PDF
Check" section, per `docs/10_calibration_and_parity.md` §5.2.

**Pre-existing blocker fixed first (in this same branch, per CLAUDE.md's mid-task-work rule — required
for this issue's own AC to be true):** every real Prompt 3 call (9/9 attempts across both golden
cases, before the fix) returned syntactically valid JSON that was missing the required
`quality_score` field, because `OpenAiProvider` used loose `response_format: json_object` (no schema
enforcement). Switched `OpenAiProvider`/`Prompt3Service` to OpenAI's strict `json_schema` response
format (all fields required, `additionalProperties: false`) — 2/2 runs succeeded immediately after.
See PR for the code diff; no other prompt step's call path was touched.

| Criterion (§5.2) | Result | Note |
|---|---|---|
| 1. `field_path` validity | **FAIL** | All 4 of the AI's `corrections` used a `cv_content.` prefix (e.g. `cv_content.headline`, `cv_content.current_work_block.role_line`) that does not exist on `CvContent` (the real renderer contract has `headline`, `current_work_block`, ... at the top level, no `cv_content` wrapper). `setByPath` (`cv-template-renderer.ts`) silently no-ops on an unresolvable path, so **none of the 4 corrections were applied to `04_cv_export.html`** — confirmed directly: the exported HTML still reads "Full Stack Engineer", not the suggested "Full-stack Engineer". |
| 2. No invented facts | PASS | All 4 `suggested_text` values are wording-only edits (headline casing, "Freelance"→"Independent" framing, bullet trimming, "cache updates"→"relevant cache updates"); none introduce a claim, metric, employer or technology absent from the input CV content. |
| 3. BOP-check catches known patterns (§5.2.1 method) | **FAIL** | Of the 16 patterns, 7 are present in the pre-correction `02_targeted_cv_content.json` input (`continued active software development`, `structured upskilling`, `evidence-based claim validation`, `human-in-the-loop AI workflow concepts`, `artifact traceability`, `backend HTML-to-PDF export without AI token usage`, `maintained/contributed`); **0 of 7 caught** in the post-correction exported text (mechanically grepped per §5.2.1). Direct cause: the one correction that did target the phrase containing 2 of these patterns (`current_work_block.bullets[1].text`) never applied, per criterion 1's field_path bug — and even in its own (unapplied) `suggested_text`, only 1 of the 3 patterns present in that sentence was actually rewritten (`backend HTML-to-PDF export without AI token usage` dropped; `human-in-the-loop AI workflow concepts` and `artifact traceability` kept verbatim). The other 4 patterns (in `current_work_block.stable_intro`) were never flagged by any correction at all — no correction entry references that field. |
| 4. `readiness` vs. human's actual call | PASS | AI: `ready_with_minor_edits`, `quality_score` 94, `export_blocked: false`. Human (manual-cv.md "Version 2"): "Ready for PDF after the mandatory EGZ replacements above" / "Proceed to PDF: yes after mandatory EGZ edits" — same shape (ready pending named wording edits, no critical blocker on either side). Match. |

**Convergence verdict (Round 1): not met.** Criteria 2 and 4 converge; criteria 1 and 3 do not — both are
concrete, reproducible defects (invalid `field_path` prefix; BOP-check identifying but not always
correcting known patterns, and missing some patterns entirely) rather than a stylistic difference.
Feeds directly into Phase 11 (#250) diagnosis/iteration — not fixed here, per this issue's scope
(field_path/BOP-check prompt-following quality is a `PromptTemplate` wording problem, distinct from
the `quality_score`-omission schema-enforcement bug fixed above).

## Round 2 — Prompt 3 re-run after `prompt3_v3.txt` (ISSUE-250, 2026-08-24)

### Diagnosis (per #238 precedent — code vs. evidence vs. prompt, confirmed before editing anything)

Both Round 1 failures were confirmed as `PromptTemplate` wording issues, not code bugs or missing
evidence — by reading the actual code paths, not assuming:

- **Criterion 1 (`field_path` prefix):** `Prompt3InputBuilderService.buildPrompt3Input()`
  (`apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts:97-98`) dumps the raw
  `02_targeted_cv_content.json` verbatim into the model's input. That JSON's real top-level shape
  (`targeted-cv-content.schema.ts:99`) is `{ cv_content: { headline, current_work_block, ... } }` —
  a genuine `cv_content` wrapper. `prompt3_v2.txt`'s own field_path examples were unprefixed,
  matching the renderer's separately-mapped `CvContent` contract (`cv-template-renderer.ts`) that
  the model never sees — a real contradiction in the prompt text between what it shows the model
  and what it tells the model to write. bjak's Round 1 run copied the literal input structure;
  cello's Round 1 run (same ambiguous prompt) happened to guess right — a probabilistic
  instruction-following gap, not a deterministic defect. No rendering or evidence-wiring bug
  involved.
- **Criterion 3 (BOP-check exhaustiveness):** the 7 known patterns were confirmed present in the
  actual input JSON reaching the model (Round 1 evidence), ruling out a Phase 16 evidence-wiring
  gap. `prompt3_v2.txt` §6 told the model to check for the 16 patterns and emit one correction per
  detected phrase, but never required a correction to remove **every** pattern present in the same
  sentence, nor explicitly named `current_work_block.stable_intro` as a field to scan — Round 1's
  own correction touched the right sentence but left some flagged patterns untouched inside its own
  `suggested_text`.

### Fix — `prompt3_v3.txt` (new `PromptTemplate` version, `v2` kept inactive, not overwritten)

Two targeted edits, no other prompt content changed:
1. Field_path rule now explicitly states the input JSON is wrapped in a top-level `cv_content` key
   but `field_path` must never include that prefix, with an explicit WRONG/RIGHT example pair.
2. §6 now requires a literal, exhaustive substring scan across all text fields (explicitly naming
   `current_work_block.stable_intro`) and requires a correction to remove **all** of the 16 known
   patterns present in its own sentence, not just one.

### Re-run (`AI_PROVIDER=openai`, `pre_pdf_check_ready` → re-ran `run-pre-pdf-check` → `export-cv`)

| Criterion (§5.2) | Result | Note |
|---|---|---|
| 1. `field_path` validity | **PASS** | All 3 corrections use unprefixed paths (`current_work_block.stable_intro`, `current_work_block.bullets[1].text`, `experience[0].bullets[3].text`) — confirmed applied by diffing `04_cv_export.html` against the pre-correction JSON (old "Continued active software development"/"structured upskilling"/"maintained/contributed" wording gone, new wording present). |
| 2. No invented facts | PASS | All 3 `suggested_text` values remain wording-only edits (stable_intro rewording, JobFlow bullet BOP-phrase removal, "maintained/contributed" → "later supported its maintenance with the team"); no new claim/metric/employer/technology introduced. |
| 3. BOP-check catches known patterns (§5.2.1 method) | **PASS** | Mechanically grepped all 16 patterns against the pre-correction input and the post-correction exported HTML: **7 of 7 applicable patterns caught** (`continued active software development`, `structured upskilling`, `evidence-based claim validation`, `human-in-the-loop AI workflow concepts`, `artifact traceability`, `backend HTML-to-PDF export without AI token usage`, `maintained/contributed`) — none remain in `04_cv_export.html`. |
| 4. `readiness` vs. human's actual call | PASS | AI: `not_ready` (quality_score 96, export_blocked true), driven by a `critical`-severity correction on the `maintained/contributed` phrase — a rule already present in `prompt3_v2.txt` (unchanged by this round's edits) that requires `critical` severity for that exact phrase. Human (manual-cv.md "Version 2"): "Ready for PDF after the mandatory EGZ replacements above" / "Proceed to PDF: yes after mandatory EGZ edits" — i.e. the human also did not ship as-is, but made a named mandatory correction first. §5.2 criterion 4's explicit bar (`not_ready` only disqualified if the human shipped essentially as-is; `ready` only disqualified if the human made a critical safety-level correction by hand) is not violated either way — both sides agree corrections were required before export. |

**Convergence verdict (Round 2): reached.** All 4 criteria now pass. No further `prompt_3`
iteration required for `bjak_20260717`.

## Round 3 — `prompt3_v4.txt` self-consistency and safety hardening (ISSUE-250, 2026-08-24, same session)

Round 2 already reached §5.2 convergence; this round is not driven by a new golden-dataset gap but
by an unprompted deep re-read of `prompt3_v3.txt` requested directly ("проанализируй его хорошо на
предмет требований"), which surfaced defects that Round 2's four §5.2 criteria do not check for
because they are about internal self-consistency of the AI's own output contract, not about
comparison to `manual-cv.md`.

### Findings and fixes

1. **Field-overwrite semantics were never stated.** `setByPath` (`cv-template-renderer.ts`)
   overwrites a field's ENTIRE value; nothing in `prompt3_v3.txt` said so, and §8's Russian text
   ("меняй только затронутый фрагмент") actively suggested returning only the changed fragment —
   which would have silently truncated a CV sentence if the model had ever taken it literally. Fixed
   by stating the full-overwrite contract explicitly in the OUTPUT CONTRACT and rewording §8.
2. **`field_path` was not scoped to fields that exist in the input AND render.** Nothing stopped a
   correction targeting `evidence_table`/`overclaiming_check` (present in the input, invisible in
   the rendered CV — silently discarded) or an array itself (e.g. `"summary"` instead of
   `"summary[2]"` — would have wiped the whole list). Fixed with an explicit correctable-field list
   cross-checked against `cv-template-renderer.ts`'s Handlebars template, and an explicit rule
   against targeting arrays/nonexistent indices.
3. **Sections 0 and 5 ask about bullet counts, ordering and page-fit — none of which "corrections"
   can express** (it can only replace text, never add/remove/reorder). Nothing said so; a model
   trying to honor those checks via `corrections` would have produced a structurally broken CV.
   Fixed by scoping "corrections" to rewording only and redirecting structural findings to
   `overall_notes`.
4. **`readiness`/`severity` self-consistency bug — found live on this exact case.** The v4 first
   draft (before this round's fixes) returned `corrections[0].severity: "critical"` (on
   `summary[3]`, an `evidence`-audit-vocabulary match) together with top-level
   `readiness: "ready_with_minor_edits"` — directly violating the contract's own readiness rule.
   Root cause confirmed in code, not assumed: `PRE_PDF_CHECK_JSON_SCHEMA`
   (`prompt3.service.ts`) declared `readiness` BEFORE `corrections`; OpenAI's strict `json_schema`
   mode generates fields in declaration order, so the model had to commit to a verdict before
   enumerating its own findings. Fixed in two parts: (a) code — reordered the schema so
   `corrections` is generated first, `readiness` second; (b) prompt — restated `readiness` as a
   mechanical function of the emitted severities (not a judgement call), and reworded the OUTPUT
   CONTRACT template to match the new field order.
5. **Severity semantics redefined.** `prompt3_v3.txt`'s audit-vocabulary rule required `critical`
   for `maintained/contributed` and similar wording — a rule inherited from the original manual
   ChatGPT-web-app workflow, where "don't approve the PDF" was the only way to force human
   intervention (no automatic correction application existed there). In this pipeline, corrections
   are applied automatically before export, so the phrase never reaches the PDF regardless of its
   severity — confirmed directly (see Evidence below). Kept as user-decided: `severity` now means
   "what survives your own correction," not "how bad the original wording was";
   `critical`/`not_ready` is reserved for problems rewording cannot fix. Audit-vocabulary items
   downgraded to `warning`, resolving Round 2's unresolved observation that both golden cases always
   landed on `not_ready` regardless of how minor the human considered their own edits.

### Re-run (`AI_PROVIDER=openai`, port 3099, `pre_pdf_check_ready` → `run-pre-pdf-check` → `export-cv`)

| Check | Result |
|---|---|
| `readiness` vs. severities (formula: critical → not_ready, else any correction → ready_with_minor_edits, else ready) | **Consistent** — `ready_with_minor_edits`, all 5 corrections `warning`, matches formula exactly |
| `field_path` validity (no `cv_content.` prefix, no array/control-field targets) | All 5 unprefixed, all point at scalar prose fields |
| `maintained/contributed` correction severity | `warning` (was inconsistently critical-by-formula-violation in the first v4 draft) |
| Corrections applied without truncation | Verified by length ratio: `suggested_text`/`original_text` between 0.86–1.16 across all 5 corrections — none shortened by dropping content |
| BOP-check (§5.2.1 mechanical grep, 16 patterns) | **7 of 7** applicable patterns caught in exported `04_cv_export.html` (unchanged from Round 2) |
| Duplicate `field_path` | None |
| "Evidence Guard" (legitimate component name containing "evidence") | Correctly left untouched — the audit-vocabulary rule distinguished jargon from a real proper noun |
| §6.1 (`[BOP:unlisted]`) / §7 (`[STYLE]`) findings | None in either case — manually re-read the full CV content field-by-field; consistent past tense, active voice, no third person, no obvious unlisted AI-jargon shape. Read as a genuine true negative for this golden case, not a skipped check; ADR note below records that this dataset does not exercise a true-positive case for either. |

No regression on any Round 2 criterion. `readiness`/`severity` self-consistency verified directly
against the raw `03_pre_pdf_check.json`, not inferred.

**Convergence verdict (Round 3): still reached**, with an added self-consistency guarantee that
Round 2 did not check for. `prompt_3` now stands at v4 (v1/v2/v3 inactive, none overwritten).
