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
