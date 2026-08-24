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
    isActive: true,
    description:
      'Targeted CV content generation: Anti-Overclaiming Rules verification (ISSUE-201) — names MCP/Claude Code explicitly alongside the existing AI/RAG/FastAPI personal-only guardrails (root CLAUDE.md lists them by name; v3 only covered them via a generic "AI" catch-all), per docs/10_calibration_and_parity.md §2.7.',
    content: readPromptFile('prompt2_v4.txt'),
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
    isActive: true,
    description:
      'Pre-PDF safety check: convergence-diagnosis fixes for two prompt-following gaps found in the golden-dataset comparison (ISSUE-249/#250, docs/10_calibration_and_parity.md §5.2) — both confirmed as prompt-wording issues, not code/evidence bugs. (1) field_path rule now explicitly calls out that the input JSON is wrapped in a top-level "cv_content" key but field_path must never include that prefix, with an explicit WRONG/RIGHT example (bjak_20260717 used "cv_content.headline", which silently no-ops against the unwrapped CvContent renderer contract). (2) §6 BOP check now requires a literal, exhaustive substring scan across all text fields (explicitly naming current_work_block.stable_intro) and requires a correction to remove ALL of the 16 known patterns present in its own sentence, not just one (both golden cases left some flagged patterns verbatim inside their own suggested_text).',
    content: readPromptFile('prompt3_v3.txt'),
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
