## cello_20260718

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | accepted exception (manual: apply, AI: maybe/72) | match | match | match | match | match (see Round 2) | Legitimate risk-tolerance difference, cross-validated against an independent live web run (`apply/87`) — see ISSUE-214 for full rubric-gap investigation. Content-level: same positioning and same 3 supporting arguments (EPAM/ProductsUp/CommerceTools), same risk-mitigation framing. ISSUE-238 later found the "match" verdict on Experience was assessed against a `.md` artifact silently missing the mandatory Current Independent Work block (see Round 2). |
| 2 | prompt_1 v10 / prompt_2 (unmodified — code fix, not a prompt edit) | accepted exception (manual: apply, AI: maybe/94) | match | match | match | match | match | ISSUE-238 root-cause finding: `TargetedCvContentBlock.current_work_block` (required schema field) was correctly populated by the AI in Round 1's JSON (JobFlow, HEY ALTER! volunteering, Python/FastAPI) but `Prompt2Service.buildMarkdown()` never rendered it — a code bug, not a prompt or Phase-16 evidence-wiring issue (final PDF export via `prompt2-to-cv-content.mapper.ts` was already correct). Fixed in `prompt2.service.ts`, workspace regenerated via real Prompt 2 call (`AI_PROVIDER=openai`); `.md` now includes the block, matching manual-cv.md's mandatory content. |

## Prompt 3 — Pre-PDF Check (ISSUE-249, 2026-08-24)

Real Prompt 3 run (`AI_PROVIDER=openai`, `prompt_3` v2/`prompt3_v2.txt`) against the approved
`02_targeted_cv_content.json`, compared to `manual-cv.md`'s "Version 2 — Pre-PDF Check and EGZ
Update" section, per `docs/10_calibration_and_parity.md` §5.2.

**Pre-existing blocker fixed first (in this same branch — see `bjak_20260717/comparison.md`'s Prompt 3
section for the full writeup): `OpenAiProvider` switched to strict `json_schema` response format**
after every real Prompt 3 call (9/9 attempts across both golden cases) previously returned valid
JSON missing the required `quality_score` field under loose `json_object` mode.

| Criterion (§5.2) | Result | Note |
|---|---|---|
| 1. `field_path` validity | PASS | All 6 of the AI's `corrections` use paths that resolve directly on `CvContent` (`summary[2]`, `current_work_block.bullets[1].text`, `current_work_block.stable_intro`, `experience[0].bullets[1].text`, `experience[0].bullets[5].text`, `experience[0].bullets[6].text`) — unlike `bjak_20260717`'s run, no `cv_content.` prefix bug here; confirmed the corrections actually applied by diffing `04_cv_export.html` against the pre-correction JSON. |
| 2. No invented facts | PASS | All 6 `suggested_text` values are wording/framing edits (explicit "personal portfolio work" framing, bullet trimming, "freelance"→"independent", ownership softening "contributing to" vs. implied sole ownership); none introduce a claim, metric, employer or technology absent from the input CV content. |
| 3. BOP-check catches known patterns (§5.2.1 method) | **FAIL** | Of the 16 patterns, the same 7 are present in the input as `bjak_20260717` (identical `current_work_block.stable_intro`/JobFlow-bullet wording in both cases' approved CV content); **only 1 of 7 caught** (`backend HTML-to-PDF export without AI token usage` — successfully removed from `current_work_block.bullets[1].text` since, unlike bjak, this correction's field_path was valid and did apply). The other 6 (`continued active software development`, `structured upskilling`, `evidence-based claim validation`, `human-in-the-loop AI workflow concepts`, `artifact traceability`, `maintained/contributed`) remain in the exported text: the `current_work_block.stable_intro` correction (#6) touched the exact sentence containing `continued active software development` and `structured upskilling` but only changed "freelance"→"independent", leaving both flagged patterns verbatim; `maintained/contributed` sits in `experience[0].bullets[1].text` (correction #3 present) but was likewise left verbatim in `suggested_text` itself, not just unapplied. |
| 4. `readiness` vs. human's actual call | PASS | AI: `ready_with_minor_edits`, `quality_score` 94, `export_blocked: false`. Human (manual-cv.md "Version 2"): "Ready for PDF after these minor EGZ wording updates" — same shape (ready pending named wording edits, no critical blocker). Match. |

**Convergence verdict (Round 1): not met**, same as `bjak_20260717`. Criteria 1, 2 and 4 converge here (field_path
validity passes in this case, isolating the bjak failure as case-specific rather than universal); but
criterion 3 fails identically in both cases — the BOP-check reliably *identifies* problematic phrasing
as worth correcting in the same sentence, but does not reliably apply the prompt's own recommended
replacement for every pattern it touches, and misses some patterns' sentences entirely. This is a
`PromptTemplate` prompt-following quality issue, not a schema/rendering bug — feeds into Phase 11
(#250), not fixed here.

## Round 2 — Prompt 3 re-run after `prompt3_v3.txt` (ISSUE-250, 2026-08-24)

Diagnosis and `prompt3_v3.txt` fix shared with `bjak_20260717` — see that case's `comparison.md` for
the full root-cause writeup (field_path prefix confirmed as a genuine input/prompt-example
contradiction in `Prompt3InputBuilderService`/`prompt3_v2.txt`; BOP-check exhaustiveness confirmed
as a prompt-following gap, not missing evidence — the patterns were present in Round 1's input).

### Re-run (`AI_PROVIDER=openai`, `pre_pdf_check_ready` → re-ran `run-pre-pdf-check` → `export-cv`)

| Criterion (§5.2) | Result | Note |
|---|---|---|
| 1. `field_path` validity | PASS | All 5 corrections use unprefixed paths (`current_work_block.stable_intro`, `current_work_block.bullets[1].text`, `experience[0].bullets[1].text`, `experience[0].bullets[5].text`, `experience[0].tech_stack[13]`) — same as Round 1, confirmed applied by diffing `04_cv_export.html`. |
| 2. No invented facts | PASS | All 5 `suggested_text` values remain wording/framing edits, including `tech_stack[13]`'s `"GraphQL"` → `"GraphQL (BFF/frontend boundary)"` — a scope clarification already supported by the same bullet's own text, not a new claim. |
| 3. BOP-check catches known patterns (§5.2.1 method) | **PASS** | Mechanically grepped all 16 patterns against the pre-correction input and the post-correction exported HTML: **7 of 7 applicable patterns caught** (same 7 as `bjak_20260717`, identical `current_work_block` content) — up from 1 of 7 in Round 1. All removed from `04_cv_export.html`. |
| 4. `readiness` vs. human's actual call | PASS | AI: `not_ready` (quality_score 95, export_blocked true), same `critical`-severity trigger on `maintained/contributed` as `bjak_20260717` (pre-existing rule, unchanged by this round). Human (manual-cv.md "Version 2"): "Ready for PDF after these minor EGZ wording updates" / "Proceed to PDF: yes after minor edits" — human also did not ship as-is. Neither of §5.2 criterion 4's explicit disqualifying conditions applies (human did not ship essentially as-is; human's correction, while called "minor," was not itself the trigger for the AI's `not_ready` — the AI's own `maintained/contributed` rule was). Both sides agree corrections were required before export. |

**Convergence verdict (Round 2): reached.** All 4 criteria now pass, matching `bjak_20260717`. No
further `prompt_3` iteration required for `cello_20260718`.

## Round 3 — `prompt3_v4.txt` self-consistency and safety hardening (ISSUE-250, 2026-08-24, same session)

Diagnosis and `prompt3_v4.txt` fix shared with `bjak_20260717` — see that case's `comparison.md`
for the full writeup (field-overwrite semantics, `field_path` scoping, structural-vs-wording
findings, `readiness`/`severity` self-consistency bug and fix, severity semantics redefinition).

### Re-run (`AI_PROVIDER=openai`, port 3099, `pre_pdf_check_ready` → `run-pre-pdf-check` → `export-cv`)

| Check | Result |
|---|---|
| `readiness` vs. severities | **Consistent** — `ready_with_minor_edits`, all 3 corrections `warning`, matches formula |
| `field_path` validity | All 3 unprefixed, all scalar prose fields |
| `maintained/contributed` correction severity | `warning` |
| Corrections applied without truncation | Length ratio 0.85–1.06 across all 3 corrections |
| BOP-check (§5.2.1 mechanical grep, 16 patterns) | **7 of 7** applicable patterns caught (unchanged from Round 2) |
| Duplicate `field_path` | None |
| §6.1 / §7 findings | None — manually re-read the full CV content; same true-negative read as `bjak_20260717` |

**Convergence verdict (Round 3): still reached**, matching `bjak_20260717`.
