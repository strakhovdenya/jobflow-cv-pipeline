import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function readPromptFile(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', fileName), 'utf-8');
}

const evidenceItems = [
  {
    claimArea: 'Node.js',
    category: 'allowed',
    description:
      'Commercial Node.js backend experience at EPAM — well-evidenced by career case deep dives.',
    notes: 'Strong commercial evidence across multiple EPAM projects.',
  },
  {
    claimArea: 'TypeScript',
    category: 'allowed',
    description:
      'Commercial TypeScript development at EPAM — strong evidence across backend and serverless projects.',
    notes: null,
  },
  {
    claimArea: 'Azure Functions',
    category: 'allowed',
    description:
      'Commercial Azure serverless workflows at EPAM: Durable Functions, long-running processes, e-commerce integrations.',
    notes:
      'CommerceTools, Amplience, ProductsUp integrations documented in career cases.',
  },
  {
    claimArea: 'PostgreSQL',
    category: 'allowed',
    description:
      'Commercial PostgreSQL usage at Factor-IT and EPAM — strong foundation documented in career cases.',
    notes: null,
  },
  {
    claimArea: 'NestJS',
    category: 'risky',
    description:
      'NestJS used in personal projects (JobFlow CV Pipeline) and study, not in commercial EPAM production stack.',
    notes:
      'Do not present as commercial core skill without adding evidence from future commercial work.',
  },
  {
    claimArea: 'Docker',
    category: 'risky',
    description:
      'Docker used for local development and deployments. Do not claim production platform ownership without evidence.',
    notes:
      'Safe to mention as tooling; unsafe to claim as DevOps/production ownership.',
  },
  {
    claimArea: 'AI/RAG',
    category: 'risky',
    description:
      'AI/RAG/FastAPI/MCP experience is personal project and coursework work, not commercial production. Do not claim AI Engineer or LLM platform engineer title.',
    notes:
      'JobFlow CV Pipeline and MCP experiments are portfolio projects. Commercial AI production experience needs evidence.',
  },
  {
    claimArea: 'Kubernetes',
    category: 'unsupported',
    description:
      'Kubernetes exposure is basic training only. Needs commercial evidence before claiming production experience.',
    notes: 'Mark as needs evidence in any CV claim.',
  },
  {
    claimArea: 'AWS',
    category: 'unsupported',
    description:
      'No commercial AWS production evidence. DynamoDB, AWS Lambda and other AWS production claims need evidence.',
    notes:
      'Safe to mention AWS awareness; unsafe to claim production ownership.',
  },
];

const promptTemplates = [
  {
    id: 'seed-prompt-1-vacancy-analysis-v1',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 1,
    isActive: false,
    description:
      'Vacancy analysis: must-have/nice-to-have/wishlist, hidden role logic, risks and apply/maybe/skip decision.',
    content: readPromptFile('prompt1.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v2',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 2,
    isActive: false,
    description:
      'Vacancy analysis: adds quality_score self-assessment and reflects that knowledge sources are now inlined when selected (TASK-100).',
    content: readPromptFile('prompt1_v2.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v3',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 3,
    isActive: false,
    description:
      'Vacancy analysis: adapted from the manually-refined ChatGPT-web-app prompt text (scoring rubric, German language gate, risk stacking, hidden role logic, decision rules, overclaiming guardrails), reworded for the stateless JSON-contract pipeline per docs/10_calibration_and_parity.md §2.2 (ISSUE-195).',
    content: readPromptFile('prompt1_v3.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v4',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 4,
    isActive: false,
    description:
      'Vacancy analysis: Anti-Overclaiming Rules verification (ISSUE-196) — names MCP/Claude Code explicitly alongside the existing AI/RAG/FastAPI personal-only guardrails (root CLAUDE.md lists them by name; v3 only covered them via a generic "AI" catch-all), per docs/10_calibration_and_parity.md §2.3.',
    content: readPromptFile('prompt1_v4.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v5',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 5,
    isActive: false,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214) — three reasoning-gap fixes found in ISSUE-207's decision-level comparison: (1) agency/intermediary listings (\"on behalf of a partner company\") now count as an added medium risk toward Risk Stacking; (2) a must_have that is the vacancy's core/defining ask with personal_only or needs_evidence status is weighted independently, generally capping the decision at maybe/skip rather than being diluted as one risk among many; (3) language risk must only be asserted when actually stated in the vacancy text, not inferred. Superseded by v6 same day: live re-run of jobgether_20260625 against this version still hallucinated a German-language blocker for a Netherlands-based vacancy with no German requirement at all, showing this version's language-risk guardrail (3) was not strong enough.",
    content: readPromptFile('prompt1_v5.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v6',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 6,
    isActive: false,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214), same-day follow-up to v5 — strengthens the language-risk guardrail after v5's live jobgether_20260625 re-run hallucinated a German-language blocker for a vacancy with no German requirement at all (Netherlands-based, only English required). Explicitly names this candidate's Germany/remote-EU target market as NOT a reason to assume a German requirement, gives non-German-market examples, and requires language_risk.risk_level = \"low\" with a no-requirement-stated note when the vacancy is silent on German. Carries forward v5's other two fixes (agency/intermediary risk, core must-have with personal-only evidence) unchanged. Superseded by v7 same day: live re-run of jobgether_20260625 against this version reached decision-level match (maybe/65 vs. manual maybe) but diagnostic comparison against the original apply/76 run revealed the match/miss was driven by incomplete must_have enumeration (PostgreSQL/MongoDB/Redis and microservices requirements silently dropped from the must_have array across both runs, causing score instability), not by the agency-risk rule this version added (which never fired in the model's output) — the underlying reasoning gap this version was meant to fix is not confirmed solved.",
    content: readPromptFile('prompt1_v6.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v7',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 7,
    isActive: false,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214), same-day follow-up to v6 — adds a completeness requirement to the Evidence Mapping section: must_have/nice_to_have must include an entry for every requirement the vacancy text presents as mandatory/secondary, even when the match is weak or missing, instead of silently dropping stated requirements (found via a direct diff of jobgether_20260625's original apply/76 run vs. v6's maybe/65 re-run: both omitted PostgreSQL/MongoDB/Redis and microservices — explicit vacancy requirements — from the structured must_have array, letting real risk disappear from scoring rather than being captured). Carries forward v5/v6's three prior fixes unchanged (agency/intermediary risk, core must-have with personal-only evidence, language-risk hallucination guard). Superseded by v8 same day: switching AI_PROVIDER to gpt-5.6-luna (config change, not a prompt edit) plus a KnowledgeSourceSelectionService fix (adding master_cv to prompt_1's required sources) together resolved onlymonster_20260804, but surfaced a new mismatch on cello_20260718 (apply/75 on gpt-4o-mini regressed to maybe/71 on Luna) — diagnosed as the Early-stage-startup rule not accounting for vacancies that explicitly lower their own evidence bar.",
    content: readPromptFile('prompt1_v7.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v8',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 8,
    isActive: false,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214), same-day follow-up to v7 — adds an exception to the Early-stage-startup/product-engineer rule: when the vacancy text itself explicitly lowers its own evidence bar (e.g. \"you don't need years, just built something real\", \"we don't expect you to know everything on day one\", ramp-up/mentorship framing, enthusiasm valued over track record), weight missing direct product/customer-ownership evidence less strictly, since the vacancy is not evaluating against the senior-level product-ownership bar the general rule assumes. Found via cello_20260625's manual-cv.md metadata: the human's own manual Prompt 1 run scored this case 82/100 (APPLY) while flagging the exact same \"needs evidence\" product-ownership gaps our automated runs use to justify capping at maybe — the human's implicit reasoning credited the vacancy's own junior-friendly framing, which the prompt's general rule did not previously account for. Superseded by v9 same day: live re-run of cello_20260718 against this version showed the qualitative exception was applied (visible in reasoning) but only moved the score from 71 to 70 — insufficient to flip maybe to apply. A fresh live re-run of the same vacancy through the real ChatGPT web app (project owner, same session) scored it 87/100 APPLY and explicitly credited Seniority fit 16/17 for the vacancy's ramp-up-friendly framing — revealing the actual gap was in the numeric Seniority fit scoring rubric, not the qualitative risk-weighting rule this version edited.",
    content: readPromptFile('prompt1_v8.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v9',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 9,
    isActive: false,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214), same-day follow-up to v8 — adds an explicit rule to the Seniority fit scoring line (0-17): when the vacancy itself explicitly signals no strict seniority requirement (ramp-up-friendly wording, \"you don't need years\", mentorship/growth framing), score Seniority fit near the top of the range for any candidate at or above the implied experience floor. Found by comparing cello_20260718's v8 automated re-run (maybe/70) against a fresh live ChatGPT-web-app run of the same vacancy done by the project owner in the same session (apply/87) — the web run explicitly scored Seniority fit 16/17 for exactly this reason, while the prompt's Seniority fit rubric line had no guidance for ramp-up-friendly vacancies at all (only Mid/Senior/Lead cases), so the automated run had no basis to credit it. Carries forward v8's qualitative Early-stage-startup exception unchanged. Superseded by v10 same day: live re-run of cello_20260718 against this version only moved score 70→72 (still maybe, still short of the web run's 87). Category-by-category comparison against the web run's explicit rubric breakdown (22/14/6/16/15/14=87) found the same underlying gaps (NestJS/Python/AWS personal_only, startup-ownership needs_evidence) were being subtracted from BOTH Tech Stack Match and Evidence Quality — a structural double-count this version did not address.",
    content: readPromptFile('prompt1_v9.txt'),
  },
  {
    id: 'seed-prompt-1-vacancy-analysis-v10',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 10,
    isActive: true,
    description:
      "Vacancy analysis: calibration round 1 (ISSUE-214), same-day follow-up to v9 — adds a general anti-double-counting rule to the Scoring Rubric: the same underlying gap (missing/personal-only skill, unrequired nice-to-have, a risk already reduced by an explicit vacancy-stated tolerance) must only reduce the ONE scoring category it most directly affects, not be subtracted again from Evidence quality (or any other category) for the same gap. This is a general rubric principle, not vacancy-specific — found via cello_20260718's category-by-category gap analysis (v9 run vs. a fresh live ChatGPT-web-app run of the same vacancy) but phrased to apply to any case where a gap is being counted more than once across categories. Carries forward v8/v9's prior fixes unchanged.",
    content: readPromptFile('prompt1_v10.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v1',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 1,
    isActive: false,
    description:
      'Targeted CV content generation: evidence-based CV draft adapted to the vacancy without inventing experience.',
    content: readPromptFile('prompt2.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v2',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 2,
    isActive: false,
    description:
      'Targeted CV content generation: adds quality_score self-assessment and reflects that knowledge sources are now inlined when selected (TASK-100).',
    content: readPromptFile('prompt2_v2.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v3',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 3,
    isActive: false,
    description:
      'Targeted CV content generation: adapted from the manually-refined ChatGPT-web-app prompt text (named impact-case examples for EPAM bullets, explicit "3 strongest arguments" framing), reworded for the stateless JSON-contract pipeline per docs/10_calibration_and_parity.md §2.5 (ISSUE-200). v2 already resolved the file-creation/attached-files/visual-reference gaps found in the source text; v3 folds in the remaining evidence-grounding substance.',
    content: readPromptFile('prompt2_v3.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v4',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 4,
    isActive: false,
    description:
      'Targeted CV content generation: Anti-Overclaiming Rules verification (ISSUE-201) — names MCP/Claude Code explicitly alongside the existing AI/RAG/FastAPI personal-only guardrails (root CLAUDE.md lists them by name; v3 only covered them via a generic "AI" catch-all), per docs/10_calibration_and_parity.md §2.7.',
    content: readPromptFile('prompt2_v4.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v5',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 5,
    isActive: false,
    description:
      'Targeted CV content generation: removes the stale BOP jargon Prompt 3 had to correct on every run (ISSUE-263) and forbids duplicating current-work content into selected_projects (ISSUE-264) — both found in the EPIC-25 Galaktica real-world parity pass (project-management/analysis-galaktica-real-world-cv-quality.md §C1/§C2). (1) The hard-coded JobFlow bullet template no longer contains any of the 16 BOP patterns listed in prompt3 §6: v4 line 77 carried four of them verbatim ("evidence-based claim validation", "human-in-the-loop AI workflow concepts", "artifact traceability", "backend HTML-to-PDF export without AI token usage"), so the pipeline paid an AI correction to clean up its own template text on every single run; rewritten using prompt3\'s own recommended replacements. Two further hits found by scanning the whole file against the same list were fixed in the same pass (scope extension agreed with the project owner, beyond ISSUE-263\'s stated AC, which named only the JobFlow bullet): the `stable_intro` (patterns 4 "continued active software development" + 5 "structured upskilling"), which is emitted verbatim into every CV and which prompt3 §6 explicitly names as a known hotspot for exactly those two, and the EPAM instruction line (pattern 3 "commercial production evidence"). v5 scans clean against all 16 patterns; v4 had 7 hits. (2) SELECTED PROJECTS gains an explicit hard rule against re-listing JobFlow (or any other current_work_block item) as a selected_projects entry, states that an empty selected_projects array is the correct outcome when JobFlow is the only project that would fit, and clarifies that the schema\'s project_type "current_work_project" enum value is not a licence to duplicate — v4 only said JobFlow "remains the primary current portfolio signal" when weighing *other* projects, never that JobFlow itself must not also appear there.',
    content: readPromptFile('prompt2_v5.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v6',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 6,
    isActive: true,
    description:
      "Targeted CV content generation: fixes the vacancy-specific evidence-ranking gap found in Round 2 of the EPIC-25 Galaktica real-world QA pass (ISSUE-278, project-management/analysis-galaktica-real-world-cv-quality.md 'Round 2 (2026-08-25)' §G1/G2/G3/G5/G6/G8). Round 1's factual-safety defects were all fixed by v5; what remained was a content-selection defect — the prompt prescribed vacancy-independent fixed text, so evidence was never actually projected onto a given vacancy's own requirements. (1) G1: new required `requirement_coverage` output field (requirement/priority/evidence_selected/shown_in/strength/reason_if_not_shown per vacancy requirement), listed before `cv_content` in the contract and documented as a planning step done BEFORE any bullet is written — following prompt3's established order-encodes-reasoning-sequence precedent. Its ranking rule: a must_have with confirmed evidence may only go unshown by losing space to another *requirement*, never to a bullet covering nothing the vacancy asked for. Internal/diagnostic only, never rendered. (2) G2: the current-work block's JobFlow bullet changes from near-literal prescribed text to a stable framing plus an inventory of the project's eight real facets (backend architecture, relational data layer, workflow/state machine, AI-behind-abstraction, safety checks, deterministic document generation, async processing, testing/delivery), with instructions to select 2-4 by the active vacancy's must_have/nice_to_have and lead with the facet the vacancy asked for — v5 dictated the facet in the prompt, so a multi-faceted project always surfaced the same one regardless of vacancy. (3) G3: the summary's location/work-authorization line becomes conditional on it actually being a decision factor (judged from Prompt 1's location_risk and on-site/hybrid/work-permit signals) instead of unconditional — on a remote role with low location_risk it spent one of five summary lines answering a question nobody asked. (4) G5: new verbatim-canonical-term rule in EVIDENCE SOURCE RULES — a technology/product/format name reused from evidence must match it exactly, since a near-synonym or sibling-technology substitution changes what the CV claims (mirrored by a new prompt3_v6 §2.1 check). (5) G6: SELECTED PROJECTS inclusion changes from a fixed topic list to a four-part coverage test relative to requirements not already covered, with commercial evidence explicitly outranking a personal project on the same requirement. (6) G8: headline token selection is now tied to the top-ranked requirements in `requirement_coverage` rather than the candidate's general strengths. Also adds a standing INTERNAL REASONING NEVER BECOMES PUBLIC CV TEXT section (the generator-side half of G4/ADR-033) and a one-case-one-bullet rule in PROFESSIONAL EXPERIENCE (the generator-side half of G7). A Round 3 review of this version's own live output added five further vacancy-agnostic ranking rules, all fixing classes of miss observed in that run rather than any one vacancy: (a) the facet inventory now names the concrete technology behind each facet (the async facet was written abstractly as 'queue-based background job handling', so a requirement naming the queue library literally could not be matched to it) plus an explicit instruction to match facets by technology name and to name that technology in the bullet text; (b) a direct-evidence-outranks-adjacent-evidence rule in REQUIREMENT COVERAGE — reaching past available direct evidence to mark a requirement 'transferable' via a neighbouring technology silently converts a demonstrable requirement into an apparent gap, which is exactly what happened to the queue requirement in the Round 3 run; (c) a new rule governing `tech_stack` arrays, previously unregulated entirely — they are printed, reader-scanned fields and must be selected by requirement relevance per entry (a vacancy-named technology the entry confirms must appear; unrequested ones are trimmed), not inventoried; (d) a keep-the-outcome rule in PROFESSIONAL EXPERIENCE — when a case's evidence states a confirmed quantified result and its technical detail competes with that result for the same sentence, the result wins (the Round 3 run dropped two evidence-confirmed impact figures in favour of component enumeration); (e) a G8 refinement telling the headline and top_skills to carry the vacancy's own framing of a kind of work rather than the generic category it belongs to, explicitly subordinated to the G5 verbatim rule so the two cannot conflict. Per the established discipline, prompt2_v5.txt is left on disk and deactivated, never overwritten.",
    content: readPromptFile('prompt2_v6.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v1',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 1,
    isActive: false,
    description:
      'Optional pre-PDF safety check: flags risky/overclaiming wording in the approved CV draft and suggests corrections. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('prompt3.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v2',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 2,
    isActive: false,
    description:
      "Pre-PDF safety check: adapted from the manually-refined ChatGPT-web-app prompt text (!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt), reworded for the stateless JSON-contract pipeline per docs/10_calibration_and_parity.md §2.8 (ISSUE-247) — current-work preamble preserved, source-file versioning meta-instruction dropped, Sources/evidence checks reworded onto the CV content's own evidence_table/overclaiming_check fields. Adds a quality_score self-assessment field, matching the prompt1/prompt2/prompt5 pattern (TASK-100).",
    content: readPromptFile('prompt3_v2.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v3',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 3,
    isActive: false,
    description:
      'Pre-PDF safety check: convergence-diagnosis fixes for two prompt-following gaps found in the golden-dataset comparison (ISSUE-249/#250, docs/10_calibration_and_parity.md §5.2) — both confirmed as prompt-wording issues, not code/evidence bugs. (1) field_path rule now explicitly calls out that the input JSON is wrapped in a top-level "cv_content" key but field_path must never include that prefix, with an explicit WRONG/RIGHT example (bjak_20260717 used "cv_content.headline", which silently no-ops against the unwrapped CvContent renderer contract). (2) §6 BOP check now requires a literal, exhaustive substring scan across all text fields (explicitly naming current_work_block.stable_intro) and requires a correction to remove ALL of the 16 known patterns present in its own sentence, not just one (both golden cases left some flagged patterns verbatim inside their own suggested_text).',
    content: readPromptFile('prompt3_v3.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v4',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 4,
    isActive: false,
    description:
      'Pre-PDF safety check: widens the wording check beyond the fixed 16-pattern list, which by construction only caught phrasing already seen in earlier drafts. Adds (1) section 6.1 — a judgement pass over the same fields for unlisted AI-audit/unnatural wording (feature-label dumps, meta-commentary, safety/audit register, machine-shaped constructions, concept-noun stacking), with guardrails so it does not become rewriting-to-taste and never alone forces not_ready; (2) section 7 — a style/voice consistency check (person, tense, voice, register, intra-section parallelism) scoped explicitly to prose fields only, forbidding third-person or named references to the candidate and preserving all facts/metrics/ownership boundaries; (3) mandatory "[BOP:listed]"/"[BOP:unlisted]"/"[STYLE]"/"[CHECK]" tags at the start of every correction\'s reason, so finding categories stay machine-distinguishable for later harvesting into the pattern list without adding a schema field. Also hardens the correction contract itself, since more finding categories mean more writes into the same fields: suggested_text is now stated to be a FULL field replacement (setByPath overwrites the whole value — a fragment would silently truncate the bullet, and both v3 wording and the Russian section-8 text previously invited exactly that), field_path is restricted to the fields that are both present in the input and printed in the CV (analysis-only and control/enum fields are named and excluded), duplicate corrections for one field_path are forbidden because the later one silently discards the earlier, and no-op corrections (suggested_text identical to original_text, observed once in the v3 cello run) are forbidden. Section 6\'s audit-vocabulary rule is named as an explicit second list of that section, tagged [BOP:listed] at critical severity, resolving a contradiction with 6.1\'s suggestion-by-default guidance. The 16-pattern literal scan from v3 is unchanged and remains the mechanically-verifiable floor (docs/10_calibration_and_parity.md §5.2.1).',
    content: readPromptFile('prompt3_v4.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v5',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 5,
    isActive: false,
    description:
      "Pre-PDF safety check: closes two Prompt 3 coverage gaps found live on the EPIC-25 Galaktica real-world parity pass, and translates the whole file to English (project-management/analysis-galaktica-real-world-cv-quality.md §C3/§D1/§D2). (1) ISSUE-267: section 6.1 gains a cross-section repeated-wording pass — the same disclaimer ('...; this is portfolio work, not commercial production.') appeared three times across different fields in the Galaktica run, each grammatically distinct so §6's literal scan and a per-sentence §6.1 reading both missed it; the new pass reads the prose fields together, flags a caveat/qualifier/meta-statement repeated across two or more fields (suggestion at 2 occurrences, warning at 3+), keeps it in the one field where it is load-bearing, and emits [BOP:unlisted] corrections removing it from the rest. (2) ISSUE-268: new section 0.1 checks current_work_block bullets against every selected_projects entry for the same project/work described twice (the Galaktica run had JobFlow duplicated into both) — this is structural, not a wording fix, so per the existing corrections-vs-overall_notes split (section 5's rule) it is never emitted as a correction, only as a concrete overall_notes instruction to set the duplicate selected_projects entry's include to false. Both additions are cross-referenced into the [BOP:unlisted]/[CHECK] tag list, the array-target rule in the output contract, and the quality_score rubric's fifth criterion. (3) ISSUE-277: all Russian text (54 of prompt3_v4.txt's lines — the current-work preamble and the section 0/1-8 checklists) is translated to English; this is a pure translation carried out in the same version bump as (1)/(2) rather than a separate one, with no change to the meaning of any check. prompt1_v*.txt and prompt2_v4.txt/prompt2_v5.txt are unaffected — out of scope for ISSUE-277.",
    content: readPromptFile('prompt3_v5.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v6',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 6,
    isActive: true,
    description:
      "Pre-PDF safety check: adds the three checker-side gaps found in Round 2 of the EPIC-25 Galaktica real-world QA pass (ISSUE-278, project-management/analysis-galaktica-real-world-cv-quality.md 'Round 2 (2026-08-25)' §G4/G5/G7), paired with the generator-side fixes in prompt2_v6.txt. (1) G4: new section 6.2 — a named check for self-disqualifying/gap-disclosure sentences inside public cv_content fields (a sentence whose function is to state what the candidate does NOT have, as opposed to describing what work IS). This is the same failure class as Round 1's leaked `see language risk notes`, recurring in a subtler form, so it is fixed as a general rule rather than another one-off patch — see ADR-033. Gets its own \"[LEAK]\" tag so it stays machine-distinguishable from §6/6.1 BOP findings, and an explicit boundary against §6.1: 6.1 protects a caveat that keeps an adjacent claim honest (one occurrence must survive), 6.2 removes a disclosure attached to no claim (nothing overclaims once it is gone); the disambiguating test is what breaks if the sentence is deleted. Reports as a correction when the disclosure is a clause inside a field carrying real content, and as an overall_notes instruction when it is the entire field value (overwriting that would require inventing replacement content). Severity is capped at warning, matching §6's tier. (2) G5: new section 2.1 — canonical technical names (technologies, libraries, frameworks, protocols, products, standards, data/file formats) must match the inlined evidence verbatim; flags sibling-technology, over-generic, expanded/contracted and more-familiar-alternative substitutions as factual-accuracy findings, since a substituted name claims experience the candidate does not have. This is the one check permitted to introduce a term not already in the CV, so the output contract's \"never introduce a technology not already present\" rule gains an explicit narrow carve-out for it; the check is skipped and reported as skipped when the knowledge sources are not inlined. (3) G7: new section 0.2 — intra-entry redundancy, extending §0.1's cross-section duplication check to within a single experience/project entry (two bullets describing one case from two angles when one vacancy-relevant angle would do, costing a slot an uncovered requirement could have used). Structural like §0.1, so it routes to overall_notes and never to corrections. Also: §1 now verifies prompt2_v6's new `requirement_coverage` map against the CV actually given rather than trusting it (and the field is added to the analysis-only off-limits list), §4's work-authorization check becomes conditional to match prompt2_v6's G3 change so the absence of that line on a remote role is no longer flagged, §0 and the current-work preamble note that which JobFlow facets the bullet highlights is deliberately vacancy-dependent (G2) and must not be flagged for differing between drafts, and the quality_score rubric's criteria 1/2/4/5 are updated to cover the new passes. A Round 3 review of this version's own live output added one further check: new section 1.1 (named-technology coverage) asks, per technology the vacancy names, whether that name appears anywhere a reader would see it, and reports when evidence for it exists but the CV never mentions it — explicitly naming the two shapes that make this easy to miss (a requirement covered as 'transferable' through a different technology while direct evidence exists, and a tech_stack crowded with unrequested technologies while omitting the requested one). It is the checker-side mirror of prompt2_v6's direct-evidence-outranks-adjacent rule; like §0.1/§0.2 it routes to overall_notes only, since adding a name to a field is not a text replacement and inserting a technology is what the output contract forbids outside §2.1. Per the established discipline, prompt3_v5.txt is left on disk and deactivated, never overwritten.",
    content: readPromptFile('prompt3_v6.txt'),
  },
  {
    id: 'seed-prompt-5-final-check-v1',
    promptKey: 'prompt_5_final_check',
    step: 'prompt_5',
    version: 1,
    isActive: true,
    description:
      'Optional final check on the fully exported CV output before sending: flags missing sections, formatting issues, surviving overclaiming risks and broken links. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('prompt5.txt'),
  },
  {
    id: 'seed-skip-reason-v1',
    promptKey: 'skip_reason',
    step: 'skip_reason',
    version: 1,
    isActive: true,
    description:
      'Structured skip reason generation for vacancies decided as skip. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('skip_reason.txt'),
  },
  {
    id: 'seed-cover-letter-v1',
    promptKey: 'cover_letter_generation',
    step: 'cover_letter',
    version: 1,
    isActive: true,
    description:
      'Targeted cover letter generation aligned with the vacancy and the approved targeted CV content. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('cover_letter.txt'),
  },
];

async function main() {
  console.log('Seeding EvidenceItem records...');

  for (const item of evidenceItems) {
    await prisma.evidenceItem.upsert({
      where: {
        id: `seed-${item.claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      },
      update: {
        category: item.category,
        description: item.description,
        notes: item.notes,
      },
      create: {
        id: `seed-${item.claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        claimArea: item.claimArea,
        category: item.category,
        description: item.description,
        notes: item.notes,
      },
    });
  }

  console.log(`Seeded ${evidenceItems.length} EvidenceItem records.`);

  console.log('Seeding PromptTemplate records...');

  for (const template of promptTemplates) {
    await prisma.promptTemplate.upsert({
      where: { id: template.id },
      update: {
        content: template.content,
        description: template.description,
        isActive: template.isActive,
      },
      create: {
        id: template.id,
        promptKey: template.promptKey,
        step: template.step,
        version: template.version,
        content: template.content,
        description: template.description,
        isActive: template.isActive,
      },
    });
  }

  console.log(`Seeded ${promptTemplates.length} PromptTemplate records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
