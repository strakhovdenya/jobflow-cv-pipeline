/**
 * Regression guard for safety-critical PromptTemplate content.
 *
 * Checks that the active template for each pipeline step still contains the
 * keywords / output-contract clauses that enforce anti-overclaiming, apply/maybe/skip
 * decisions, and the skip-artifact pipeline stop. No DB, no AI provider — imports
 * `promptTemplates` directly from prisma/seed.ts (the same array `prisma db seed`
 * upserts into Postgres), so this test always sees exactly the content the real
 * pipeline would load — no separately hand-maintained copy to keep in sync.
 * `main()`'s DB-writing side effect only runs when seed.ts is executed directly
 * (guarded by `require.main === module`), not on import.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promptTemplates } from '../../prisma/seed';
import { FAKE_PROMPT2_JSON } from '../ai/providers/fake.provider';
import { CvQualityGuardService } from '../eval/cv-quality-guard.service';
import {
  Credential,
  parseCredentialRegistry,
  parsePortfolioRegistry,
  stripRegistryBlocks,
} from '../evidence/career-registry.parser';
import { containsRegistryName } from '../evidence/registry-compliance';
import { ACTIVE_KNOWLEDGE_SOURCES } from '../knowledge-sources/active-knowledge-sources';
import type { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';

const readPromptFile = (fileName: string): string =>
  fs.readFileSync(
    path.join(__dirname, '../../prisma/prompts', fileName),
    'utf-8',
  );

/**
 * Returns the content of the single active template for a step.
 * Throws (loud fail, not silent skip) when no active entry exists, or when
 * more than one does — either is a real data integrity problem in seed.ts.
 */
function activeContent(step: string): string {
  const active = promptTemplates.filter((t) => t.step === step && t.isActive);
  if (active.length === 0) {
    throw new Error(
      `No active PromptTemplate for step "${step}" in prisma/seed.ts.`,
    );
  }
  if (active.length > 1) {
    throw new Error(
      `Multiple active PromptTemplate rows for step "${step}" in prisma/seed.ts — expected exactly one.`,
    );
  }
  return active[0].content;
}

/**
 * Returns the body of a `=== <title> ===` section, up to the next section
 * header. Throws when the section is missing, so a renamed or dropped section
 * fails loudly instead of letting a whole-file search pass by accident.
 */
function section(content: string, title: string): string {
  const header = `=== ${title} ===`;
  const start = content.indexOf(header);
  if (start === -1) {
    throw new Error(`Section "${header}" not found in the active template.`);
  }
  const bodyStart = start + header.length;
  const next = content.indexOf('\n=== ', bodyStart);
  return content.slice(bodyStart, next === -1 ? undefined : next);
}

const KNOWLEDGE_SOURCE_TYPES = [
  'master_cv',
  'profile_summary',
  'tech_stack',
  'project_inventory',
  'career_cases',
  'cv_rules',
];

// A versioned knowledge-source file name such as `Name_RU_v0_6_x.md` or
// `Name_RU_EN_2026-06.md`.
const VERSIONED_SOURCE_FILE_NAME =
  /\b[A-Z][A-Za-z_]*_(?:v\d+_\d+|\d{4}-\d{2})\w*\.md\b/;

const ACTIVE_STEPS = ['prompt_1', 'prompt_2', 'prompt_3', 'cover_letter'];

it('active prompt versions are prompt_1 v13, prompt_2 v14, prompt_3 v11 and cover_letter v6', () => {
  const activeVersions = ACTIVE_STEPS.map((step) =>
    promptTemplates
      .filter((t) => t.step === step && t.isActive)
      .map((t) => t.version),
  );
  expect(activeVersions).toEqual([[13], [14], [11], [6]]);
  const activeFiles = ACTIVE_STEPS.map(
    (step) =>
      promptTemplates.find((t) => t.step === step && t.isActive)!.content,
  );
  expect(activeFiles).toEqual([
    readPromptFile('prompt1_v13.txt'),
    readPromptFile('prompt2_v14.txt'),
    readPromptFile('prompt3_v11.txt'),
    readPromptFile('cover_letter_v6.txt'),
  ]);
  // The former checks that prompt_2 v10 and prompt_3 v8 are inactive are not repeated here:
  // the one-active-version tests cover every non-active version of a step.
  const previousPrompt1 = promptTemplates.find(
    (t) => t.step === 'prompt_1' && t.version === 12,
  );
  expect(previousPrompt1).toBeDefined();
  expect(previousPrompt1!.isActive).toBe(false);
});

it('previous prompt_2 v13, prompt_3 v10 and cover_letter v5 stay seeded and inactive', () => {
  for (const [step, version, fileName] of [
    ['prompt_2', 13, 'prompt2_v13.txt'],
    ['prompt_2', 12, 'prompt2_v12.txt'],
    ['prompt_3', 10, 'prompt3_v10.txt'],
    ['cover_letter', 5, 'cover_letter_v5.txt'],
    ['prompt_2', 11, 'prompt2_v11.txt'],
    ['prompt_3', 9, 'prompt3_v9.txt'],
    ['cover_letter', 4, 'cover_letter_v4.txt'],
  ] as const) {
    const previous = promptTemplates.find(
      (t) => t.step === step && t.version === version,
    );
    expect(previous).toBeDefined();
    expect(previous!.isActive).toBe(false);
    expect(previous!.content).toBe(readPromptFile(fileName));
  }
});

// The active source of a type, taken from the one list of active sources (ISSUE-690).
const activeSourcePath = (sourceType: string): string => {
  const entries = ACTIVE_KNOWLEDGE_SOURCES.filter(
    (entry) => entry.sourceType === sourceType,
  );
  if (entries.length !== 1) {
    throw new Error(
      `Expected exactly one active ${sourceType} source, found ${entries.length}.`,
    );
  }
  return path.join(
    __dirname,
    '../../knowledge-sources',
    entries[0].relativePath,
  );
};

const activeProjectInventoryPath = (): string =>
  activeSourcePath('project_inventory');

const readActiveCvRules = (): string =>
  fs.readFileSync(activeSourcePath('cv_rules'), 'utf-8');

it('active prompts and the cover letter name no registry project other than the current work project', () => {
  const registry = parsePortfolioRegistry(
    fs.readFileSync(activeProjectInventoryPath(), 'utf-8'),
  );
  const forbiddenNames = registry.projects
    .filter((project) => project.placement !== 'current_work_block')
    .flatMap((project) => [project.title, ...project.aliases]);
  expect(forbiddenNames.length).toBeGreaterThan(0);

  for (const step of ACTIVE_STEPS) {
    const content = activeContent(step);
    const named = forbiddenNames.filter((name) =>
      containsRegistryName(content, name),
    );
    expect({ step, named }).toEqual({ step, named: [] });
  }
});

it('active prompt_2 is v14 and cover_letter is v6', () => {
  const activeVersions = ['prompt_2', 'cover_letter'].map((step) =>
    promptTemplates
      .filter((t) => t.step === step && t.isActive)
      .map((t) => t.version),
  );
  expect(activeVersions).toEqual([[14], [6]]);
});

it('prompt_3 has exactly one active version in prisma/seed.ts', () => {
  for (const step of ['prompt_1', 'prompt_2', 'prompt_3']) {
    const activeEntries = promptTemplates.filter(
      (t) => t.step === step && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  }
});

it('prompt_1 and prompt_2 active templates name knowledge sources by sourceType', () => {
  for (const step of ['prompt_1', 'prompt_2']) {
    const content = activeContent(step);
    expect(content).toContain('[Source: <sourceType> | <filePath>]');
    for (const sourceType of KNOWLEDGE_SOURCE_TYPES) {
      // Each sourceType appears as a role-list entry: `<sourceType>` — <role>
      expect(content).toMatch(new RegExp(`\`${sourceType}\` — \\S`));
    }
    expect(content).not.toMatch(VERSIONED_SOURCE_FILE_NAME);
  }
});

// ---------------------------------------------------------------------------
// Canonical stable intro of the current-work block (ISSUE-701). Its only source is the
// "Stable block template" of the active cv_rules; the prompts, the fake Prompt 2 answer and
// the eval guard are checked against it, never against a literal kept in this file.
// ---------------------------------------------------------------------------

const STABLE_BLOCK_HEADING = '### Stable block template';
const DATES_LINE = /\b\d{4}\s*[–-]\s*Present\b/;
const QUOTED_STABLE_INTRO = /^- `stable_intro`: "(.+)"\s*$/gm;

// The line after the dates line inside the fenced template of the "Stable block template"
// section. Throws instead of returning an empty string, so a renamed section or a reshaped
// template cannot make the consistency checks pass on nothing.
const extractCanonicalIntro = (rulesText: string): string => {
  const start = rulesText.indexOf(STABLE_BLOCK_HEADING);
  if (start === -1) {
    throw new Error(`cv_rules has no "${STABLE_BLOCK_HEADING}" section.`);
  }
  const nextHeading = rulesText.indexOf('\n#', start + 1);
  const fenceStart = rulesText.indexOf('```', start);
  const bodyStart = rulesText.indexOf('\n', fenceStart) + 1;
  const fenceEnd = rulesText.indexOf('```', bodyStart);
  const insideSection = nextHeading === -1 || fenceStart < nextHeading;
  if (fenceStart === -1 || fenceEnd === -1 || !insideSection) {
    throw new Error(`"${STABLE_BLOCK_HEADING}" has no fenced template.`);
  }
  const lines = rulesText
    .slice(bodyStart, fenceEnd)
    .split('\n')
    .map((line) => line.trim());
  const datesIndex = lines.findIndex((line) => DATES_LINE.test(line));
  if (datesIndex === -1) {
    throw new Error(`"${STABLE_BLOCK_HEADING}" has no dates line.`);
  }
  const intro = lines.slice(datesIndex + 1).find((line) => line !== '');
  if (intro === undefined || intro.startsWith('- ')) {
    throw new Error(
      `"${STABLE_BLOCK_HEADING}" has no intro line after the dates line.`,
    );
  }
  return intro;
};

// The value of the one `- \`stable_intro\`: "..."` line of a prompt template.
const quotedStableIntro = (promptText: string): string => {
  const matches = Array.from(promptText.matchAll(QUOTED_STABLE_INTRO));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one stable_intro value line, found ${matches.length}.`,
    );
  }
  return matches[0][1];
};

// The names of the prompts whose stated stable_intro differs from the cv_rules canonical.
const findIntroMismatches = (
  rulesText: string,
  prompts: ReadonlyArray<{ name: string; text: string }>,
): string[] => {
  const canonical = extractCanonicalIntro(rulesText);
  return prompts
    .filter((prompt) => quotedStableIntro(prompt.text) !== canonical)
    .map((prompt) => prompt.name);
};

const BOP_SECTION_HEADING = '## 6. BOP natural public-CV style check';
const NUMBERED_PATTERN_LINE = /^\d+\. ((?:`[^`]+`(?: \/ )?)+)(.*)$/gm;
const BACKTICKED = /`([^`]+)`/g;
const AUDIT_VOCABULARY_LINE = '**Audit-vocabulary rule';

const backticked = (text: string): string[] =>
  Array.from(text.matchAll(BACKTICKED), (match) => match[1]);

const bopSection = (prompt3: string): string => {
  const start = prompt3.indexOf(BOP_SECTION_HEADING);
  const end = prompt3.indexOf('\n### 6.1', start);
  if (start === -1 || end === -1) {
    throw new Error(`"${BOP_SECTION_HEADING}" not found in prompt_3.`);
  }
  return prompt3.slice(start, end);
};

interface ListedPattern {
  phrases: string[];
  headlineOnly: boolean;
}

// The numbered BOP patterns of prompt_3 section 6, read from the template.
const listedBopPatterns = (prompt3: string): ListedPattern[] =>
  Array.from(bopSection(prompt3).matchAll(NUMBERED_PATTERN_LINE), (match) => ({
    phrases: backticked(match[1]),
    headlineOnly: match[2].includes('in the headline'),
  }));

// The audit-vocabulary list of prompt_3 section 6, read from the template.
const listedAuditWords = (prompt3: string): string[] => {
  const line = bopSection(prompt3)
    .split('\n')
    .find((text) => text.startsWith(AUDIT_VOCABULARY_LINE));
  if (line === undefined) {
    throw new Error('prompt_3 section 6 has no audit-vocabulary rule.');
  }
  return backticked(line);
};

// The listed phrases a text contains, case-insensitively — the literal scan of section 6.
const findListedPhrases = (
  text: string,
  phrases: readonly string[],
): string[] => {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
};

const STABLE_INTRO_FIELD = 'current_work_block.stable_intro';

const stableIntroViolations = (intro: string) => {
  const output: TargetedCvContentOutput = structuredClone(FAKE_PROMPT2_JSON);
  output.cv_content.current_work_block.stable_intro = intro;
  return new CvQualityGuardService()
    .check(output)
    .violations.filter((violation) => violation.field === STABLE_INTRO_FIELD);
};

const SYNTHETIC_RULES = (intro: string): string =>
  [
    '## 8. Sample block',
    '',
    STABLE_BLOCK_HEADING,
    '',
    '```text',
    'SAMPLE SECTION TITLE',
    'Sample role line',
    'Jan 2030 – Present · Sample City · Remote',
    '',
    intro,
    '',
    '- Sample first bullet.',
    '```',
    '',
    '### Next section',
  ].join('\n');

const SYNTHETIC_PROMPT = (intro: string): string =>
  [
    'Stable elements:',
    '- `safe_label`: "Sample"',
    `- \`stable_intro\`: "${intro}"`,
  ].join('\n');

describe('canonical stable intro', () => {
  it('canonical intro extraction returns the line after the dates line', () => {
    const intro = 'Sample intro line about a sample period.';
    const extracted = extractCanonicalIntro(SYNTHETIC_RULES(intro));
    expect(extracted).toBe(intro);
    expect(extracted).not.toMatch(DATES_LINE);
    expect(extracted.startsWith('- ')).toBe(false);
  });

  it('canonical intro extraction fails when cv_rules has no stable block template', () => {
    const withoutBlock = SYNTHETIC_RULES('Sample intro.').replace(
      STABLE_BLOCK_HEADING,
      '### Other template',
    );
    expect(() => extractCanonicalIntro(withoutBlock)).toThrow(
      STABLE_BLOCK_HEADING,
    );
    expect(() => extractCanonicalIntro('')).toThrow();
    const bulletAfterDates = SYNTHETIC_RULES('- Sample bullet in place.');
    expect(() => extractCanonicalIntro(bulletAfterDates)).toThrow(
      'no intro line after the dates line',
    );
  });

  it('the canonical intro comparison reports a differing prompt intro', () => {
    const rules = SYNTHETIC_RULES('Sample canonical intro.');
    expect(
      findIntroMismatches(rules, [
        { name: 'same', text: SYNTHETIC_PROMPT('Sample canonical intro.') },
        { name: 'differing', text: SYNTHETIC_PROMPT('Sample older intro.') },
      ]),
    ).toEqual(['differing']);
    expect(() =>
      findIntroMismatches(rules, [{ name: 'none', text: 'No value line.' }]),
    ).toThrow('found 0');
  });

  it('the canonical stable intro is identical in cv_rules, prompt_2 and prompt_3', () => {
    const rules = readActiveCvRules();
    expect(extractCanonicalIntro(rules).length).toBeGreaterThan(0);
    expect(
      findIntroMismatches(rules, [
        { name: 'prompt_2', text: activeContent('prompt_2') },
        { name: 'prompt_3', text: activeContent('prompt_3') },
      ]),
    ).toEqual([]);
  });

  it('the BOP pattern scan finds a listed pattern in a synthetic intro', () => {
    const prompt3 = activeContent('prompt_3');
    const phrases = [
      ...listedBopPatterns(prompt3).flatMap((pattern) => pattern.phrases),
      ...listedAuditWords(prompt3),
    ];
    expect(phrases.length).toBeGreaterThan(16);
    for (const phrase of phrases) {
      const intro = `Sample intro line, ${phrase.toUpperCase()}, sample end.`;
      expect(findListedPhrases(intro, phrases)).toContain(phrase);
    }
    expect(findListedPhrases('Sample neutral intro.', phrases)).toEqual([]);
  });

  it('the canonical stable intro contains no BOP pattern or audit word of prompt_3', () => {
    const prompt3 = activeContent('prompt_3');
    const patterns = listedBopPatterns(prompt3);
    const auditWords = listedAuditWords(prompt3);
    expect(patterns).toHaveLength(16);
    expect(auditWords.length).toBeGreaterThan(0);
    const canonical = extractCanonicalIntro(readActiveCvRules());
    expect(
      findListedPhrases(canonical, [
        ...patterns.flatMap((pattern) => pattern.phrases),
        ...auditWords,
      ]),
    ).toEqual([]);
  });

  it('the eval guard reports a listed pattern placed in the stable intro', () => {
    const prompt3 = activeContent('prompt_3');
    const phrases = [
      ...listedBopPatterns(prompt3)
        .filter((pattern) => !pattern.headlineOnly)
        .flatMap((pattern) => pattern.phrases),
      ...listedAuditWords(prompt3),
    ];
    expect(phrases.length).toBeGreaterThan(0);
    const missed = phrases.filter(
      (phrase) =>
        stableIntroViolations(`Sample intro line about ${phrase} here.`)
          .length === 0,
    );
    expect(missed).toEqual([]);
  });

  it('the eval guard reports no violation for the canonical stable intro', () => {
    const canonical = extractCanonicalIntro(readActiveCvRules());
    expect(stableIntroViolations(canonical)).toEqual([]);
  });

  it('the fake Prompt 2 answer uses the canonical stable intro', () => {
    expect(FAKE_PROMPT2_JSON.cv_content.current_work_block.stable_intro).toBe(
      extractCanonicalIntro(readActiveCvRules()),
    );
  });
});

// ---------------------------------------------------------------------------
// prompt_1 — vacancy analysis
// ---------------------------------------------------------------------------
describe('prompt_1 active template', () => {
  let content: string;

  beforeAll(() => {
    // Throws (fail, not skip) if no active entry — satisfies AC #4
    content = activeContent('prompt_1');
  });

  it('has exactly one active version in prisma/seed.ts', () => {
    const activeEntries = promptTemplates.filter(
      (t) => t.step === 'prompt_1' && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  });

  it('declares "decision" as a required output field', () => {
    expect(content).toContain('"decision"');
  });

  it('requires apply/maybe/skip as the full set of allowed decision values', () => {
    // Anchored to the "decision": <type> declaration itself, not a loose
    // substring search over the whole file — "apply"/"maybe"/"skip" also
    // appear repeatedly in unrelated prose elsewhere in this prompt (e.g.
    // "cap the decision at maybe", "use skip for..."), so a plain
    // content.toContain() check would still pass even if the schema's
    // decision union were narrowed or the field removed entirely. Verified
    // live: this exact regression (replacing the union with a bare `string`
    // type) made the old toContain-based version of this test a false
    // negative — 11/11 still green with no enum left to enforce it.
    const decisionFieldMatch = content.match(/"decision":\s*(.+)/);
    expect(decisionFieldMatch).not.toBeNull();
    const decisionType = decisionFieldMatch![1];
    expect(decisionType).toContain('"apply"');
    expect(decisionType).toContain('"maybe"');
    expect(decisionType).toContain('"skip"');
  });

  it('counts personal AI evidence for AI requirements', () => {
    const aiSection = section(
      content,
      'PERSONAL AI EVIDENCE FOR AI REQUIREMENTS',
    );
    expect(aiSection).toContain(
      '**The vacancy accepts non-commercial experience**',
    );
    expect(aiSection).toContain(
      'Personal AI evidence counts for such a requirement',
    );
    expect(aiSection).toContain(
      'never `"weak"` merely because the work was personal',
    );
    expect(aiSection).toContain('standard backend role');
  });

  it('does not count personal AI work for commercial-only AI requirements', () => {
    const aiSection = section(
      content,
      'PERSONAL AI EVIDENCE FOR AI REQUIREMENTS',
    );
    expect(aiSection).toContain(
      '**The vacancy explicitly requires commercial or production AI experience**',
    );
    expect(aiSection).toContain(
      'Personal AI work is not full coverage of that requirement',
    );
    expect(aiSection).toContain('`match_level` at most `"partial"`');
  });

  it('counts only cvEligible registry entries as project and credential evidence', () => {
    const registry = section(content, 'CAREER REGISTRY');
    expect(registry).toContain('`portfolio-registry` in `project_inventory`');
    expect(registry).toContain('`credential-registry` in `certifications`');
    expect(registry).toContain('`cvEligible` is the only permission');
    expect(registry).toContain('is not evidence for any requirement');
    expect(registry).toContain('name only a `cvEligible` entry');
    expect(registry).toContain(
      'may still support a requirement as hands-on training',
    );
    expect(registry).toContain(
      'a learning path, an assessment or an in-progress item supports nothing',
    );
    const aiSection = section(
      content,
      'PERSONAL AI EVIDENCE FOR AI REQUIREMENTS',
    );
    expect(aiSection).toContain(
      'an AI project the registry excludes is not evidence for any AI requirement',
    );
  });

  it('keeps MCP and Claude Code non-commercial', () => {
    expect(content).toContain(
      '- MCP / Claude Code — personal/portfolio work only, never commercial production experience.',
    );
    expect(content).toContain(
      'MCP and Claude Code remain personal/portfolio work in both cases — never commercial experience',
    );
    expect(content).toContain(
      'Never present personal AI/RAG/FastAPI/MCP/Claude Code exposure as commercial production experience.',
    );
  });
});

// ---------------------------------------------------------------------------
// prompt_2 — targeted CV content (anti-overclaiming guard)
// ---------------------------------------------------------------------------
describe('prompt_2 active template', () => {
  let content: string;

  beforeAll(() => {
    content = activeContent('prompt_2');
  });

  it('has exactly one active version in prisma/seed.ts', () => {
    const activeEntries = promptTemplates.filter(
      (t) => t.step === 'prompt_2' && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  });

  it('distinguishes commercial from personal experience in the output contract', () => {
    // experience_type must offer both values — removing either signals a regression
    expect(content).toContain('"commercial"');
    expect(content).toContain('"personal"');
  });

  it('includes the "needs evidence" status for unsupported claims', () => {
    // evidence_table and overclaiming_check both reference this concept
    expect(content).toContain('needs evidence');
  });

  it('includes an overclaiming_check output field', () => {
    expect(content).toContain('overclaiming_check');
  });

  it('instructs the model never to invent commercial experience', () => {
    // Core anti-overclaiming rule — must survive any version bump
    expect(content).toMatch(/[Nn]ever invent/);
  });

  it('takes selected projects and credentials only from the career registries', () => {
    const registry = section(
      content,
      'CAREER REGISTRY (PROJECTS AND CREDENTIALS)',
    );
    expect(registry).toContain('**`cvEligible` is the only permission.**');
    expect(registry).toContain('**`portfolioPriority` is visibility only.**');
    expect(registry).toContain('**`placement` is the CV section.**');
    expect(registry).toContain('**`roleFamilies` is relevance.**');
    expect(registry).toContain(
      'For a project this holds for its `title` and every one of its `aliases`.',
    );
    expect(registry).toContain(
      'It never brings back an entry the registry lists with `cvEligible: false`',
    );
    const projects = section(content, 'SELECTED PROJECTS');
    expect(registry).toContain('**No implemented RAG or Python AI project.**');
    expect(registry).toContain('This outranks the `cv_rules` line format');
    expect(projects).toContain(
      '**Candidates come only from the `portfolio-registry` block**',
    );
    expect(projects).toContain('`title` is the registry `title`, exactly');
    expect(projects).toContain('`project_type: "personal_project"`');
    expect(projects).toContain('`safe_label: "Personal Project"`');
    expect(projects).toContain(
      'the registry entry with `placement: current_work_block` — belongs to `current_work_block`',
    );
    const summary = section(
      content,
      'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS',
    );
    expect(summary).toContain(
      'candidates are only the `cvEligible: true` entries of the `credential-registry` block',
    );
    expect(summary).toContain(
      '`title` is the registry `title` or alias verbatim, nothing appended',
    );
  });

  it('selects projects by evidence, not by a fixed family template or quota', () => {
    const projects = section(content, 'SELECTED PROJECTS');
    expect(projects).toContain(
      "A vacancy's families are every family any of its requirements belongs to",
    );
    expect(projects).toContain(
      'is the default starting point, not a fixed template',
    );
    expect(projects).toContain(
      'Projects that share technologies are not alternatives to each other',
    );
    expect(projects).toContain(
      'The number of entries follows the evidence, not a quota',
    );
    expect(projects).toContain(
      'never at the cost of a requirement-covering commercial bullet or past `max_pages`',
    );
    expect(projects).toContain('that the CV does not yet cover sufficiently');
    expect(projects).toContain(
      'Repeating a technology the CV already shows, with nothing new about how it was used, is not such a dimension.',
    );
    expect(projects).toContain(
      '**What counts as duplication is the same achievement told twice, not the same project named twice.**',
    );
  });

  it('keeps AI-assisted development and LLM integration evidence apart', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('carries this request instead (never both)');
    // The cap of two AI projects was removed in v12 (ISSUE-696): the count follows the
    // inclusion test.
    expect(mode).toContain('there is no separate cap');
    expect(mode).toContain(
      'LLM or AI API integration leads with the JobFlow AI-integration facet',
    );
    const summary = section(
      content,
      'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS',
    );
    expect(summary).toContain(
      'the Summary never lists every AI tool, project and credential',
    );
    expect(summary).toContain(
      'this output has no field for it, so never move those tools into `top_skills`',
    );
  });

  it('never lets a manual note bring back an excluded registry entry', () => {
    const manualNote = section(
      content,
      'MANUAL NOTE: FORCED INCLUSION EXCEPTION (ADR-034)',
    );
    expect(manualNote).toContain(
      'One limit outranks it: a project or credential the career registry lists with `cvEligible: false` is never brought back by a manual note',
    );
    expect(content).toContain(
      'except a project or credential the career registry excludes, which a manual note cannot force',
    );
    expect(content).not.toContain('Built a RAG service');
  });

  it('leaves registry_violations and registry_snapshot to the deterministic guard', () => {
    const contract = section(content, 'OUTPUT CONTRACT — READ FIRST');
    expect(contract).toContain(
      '`overclaiming_check.registry_violations` and `overclaiming_check.registry_snapshot` are not part of your answer',
    );
    expect(contract).toContain('Do not output either field.');
  });

  it('chooses the Summary variant from the active sources', () => {
    const summary = section(
      content,
      'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS',
    );
    expect(summary).toContain(
      "**Start from the Summary variant the `profile_summary` source provides for this vacancy's family**",
    );
    expect(summary).toContain(
      '**The first sentence is about commercial experience**',
    );
    expect(summary).toContain('`cv_rules` stop-list');
  });

  it('prompt_2 builds the current-work block from JobFlow, a portfolio overview and an optional evidence bullet', () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain(
      '(2) JobFlow — always, exactly one bullet; (3) the portfolio overview — always; (4) one additional piece of evidence — optional, at most one, only when it covers a vacancy requirement',
    );
    expect(block).toContain(
      'Three is a complete block: never fill it with a filler bullet — a repeated fact, a generic course added only for the count, or a second JobFlow bullet.',
    );
    expect(block).toContain(
      '**3. Portfolio overview (mandatory, medium priority).**',
    );
    expect(block).toContain('by kind, never by name, and carries 1–2 facets');
    expect(block).toContain(
      'It never repeats the mechanism, figure or feature of a `selected_projects[]` entry',
    );
    expect(block).toContain('It is never a second JobFlow bullet.');
    expect(block).toContain(
      '**4. Additional evidence (optional, at most one).**',
    );
    expect(block).toContain(
      'never restates a `selected_projects[]` entry and is never a second JobFlow bullet',
    );
    expect(block).toContain(
      'Merging frees a slot, and it is never refilled with another JobFlow facet.',
    );
  });

  it('prompt_2 treats roleFamilies and the cv_rules exclusions as defaults the inclusion test can override', () => {
    const registry = section(
      content,
      'CAREER REGISTRY (PROJECTS AND CREDENTIALS)',
    );
    expect(registry).toContain('It is the default, not a filter');
    expect(registry).toContain(
      'is still a candidate when the inclusion test in SELECTED PROJECTS names a vacancy requirement it raises',
    );
    expect(registry).toContain(
      'Record that requirement as the reason in `target_strategy.main_angle`.',
    );
    const projects = section(content, 'SELECTED PROJECTS');
    expect(projects).toContain(
      'Its "Not by default" column lists projects left out unless the inclusion test names a vacancy requirement they raise',
    );
    expect(projects).toContain(
      'with the reason in `target_strategy.main_angle`',
    );
    expect(projects).toContain(
      'its `roleFamilies` say where it is relevant by default',
    );
  });

  it('prompt_2 chooses AI-assisted engineering evidence by the kind and weight of the AI request', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      '**The weight decides how much; the kind of request decides which fact**',
    );
    expect(mode).toContain(
      'The weight follows how important AI-assisted development is in this vacancy — a `must_have`, a key responsibility — not the job title',
    );
    expect(mode).toContain(
      "In a standard backend or full-stack role where AI-assisted development is a key responsibility the weight is Core all the same: the Summary stays the role family's variant A or B and carries one full AI sentence",
    );
    const plus = mode
      .split('\n')
      .find((line) => line.startsWith('- **Plus** — '));
    expect(plus).toBeDefined();
    expect(plus).toContain(
      'by default the AI-assisted engineering project entry as a single bullet with `display_priority: "show_if_space"`',
    );
    expect(plus).toContain(
      'as long as it displaces no requirement-covering commercial bullet and the CV stays within `max_pages`',
    );
    expect(plus).toContain('never two bullets at this weight');
    // The Plus default is the AI-tools case; LLM integration and agent frameworks follow
    // their own request kind.
    expect(plus).toContain(
      'For an **AI tools / AI in development** request (AI coding assistants, AI-assisted development, AI-generated code) that clause names Claude Code and OpenAI Codex',
    );
    expect(plus).toContain(
      'the AI-assisted engineering project entry is not the default there',
    );
    expect(mode).toContain('not because of a `roleFamilies` value');
    expect(mode).toContain(
      'it is added for this request only when the vacancy also asks for coding agents, agent orchestration or AI tooling',
    );
    const rendering = section(content, 'RENDERING HINTS AND PDF READINESS');
    expect(rendering).toContain(
      'This rule applies only when that detailed entry is actually in the CV',
    );
    for (const kind of [
      '*using AI assistants*',
      '*quality and review of AI-generated code*',
      '*AI-assisted delivery workflow or developer productivity*',
      '*coding-agent tooling and AI developer platforms*',
      '- **Agent frameworks / ADK**',
    ]) {
      expect(mode).toContain(kind);
    }
  });

  it('prompt_2 allows the AI-assisted engineering project for a developer-tooling requirement without an AI mention', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**Developer tooling without an AI mention.**');
    expect(mode).toContain(
      'only when the vacancy asks for building developer tooling, CI/CD automation or quality gates, and the commercial experience does not cover that requirement',
    );
    // Exactly the three requirements of AC-10 / INV-13 open the exception.
    expect(mode).not.toContain('reusable Node.js packages, and');
    expect(mode).toContain('Then it is one compact bullet about the tooling');
    expect(mode).toContain(
      'The Summary still carries no AI clause, `certifications` no AI credential and the portfolio overview no AI facet.',
    );
    expect(mode).toContain(
      'A plain "experience with CI/CD" request does not open this exception',
    );
    const projects = section(content, 'SELECTED PROJECTS');
    expect(projects).toContain(
      'for a vacancy without an AI mention, only under the developer-tooling exception there',
    );
  });

  it('prompt_2 keeps the certification title as the registry identity and leaves issuer, type and year to the export', () => {
    const registry = section(
      content,
      'CAREER REGISTRY (PROJECTS AND CREDENTIALS)',
    );
    expect(registry).toContain(
      'with nothing added — no issuer, year, credential type or description in that field',
    );
    expect(registry).toContain(
      '**the export adds the issuer, the type label and the year itself, from the registry snapshot of this draft**',
    );
    const summary = section(
      content,
      'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS',
    );
    expect(summary).toContain(
      'the export prints each included credential with its issuer, type label and year from the registry snapshot',
    );
  });

  it('includes personal AI evidence when a backend vacancy mentions AI', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      'A standard backend vacancy where AI appears only in nice-to-have or in responsibilities',
    );
    expect(mode).toContain('still turns the mode on');
    expect(mode).toContain('**AI tools / AI in development**');
    expect(mode).toContain('**LLM / AI API integration**');
    expect(mode).toContain('**RAG / agents / vector search**');
  });

  it('has an AI-assisted engineering facet', () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain('- **AI-assisted engineering** — ');
    expect(block).toContain('- **Background jobs for AI steps** — ');
  });

  it('keeps AI projects out when the vacancy does not mention AI', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      '**Mode off: no AI mention anywhere in the vacancy.**',
    );
    expect(mode).toContain(
      'Do not include the AI-assisted engineering project either, with one narrow exception.',
    );
    expect(mode).toContain('the portfolio overview carries no AI facet');
    expect(mode).toContain(
      'The Summary carries no AI-assisted development clause',
    );
  });

  it('prompt_2 scales AI depth by how much the vacancy weighs AI', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**Decide the AI weight before writing anything.**');
    expect(mode).toContain('There is no fixed number of AI bullets');
    expect(mode).toContain('- **Core** — ');
    expect(mode).toContain('- **Plus** — ');
    expect(mode).toContain('- **Not mentioned** — ');
  });

  it('prompt_2 keeps the factory entry compact when AI is only a plus', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    const plus = mode
      .split('\n')
      .find((line) => line.startsWith('- **Plus** — '));
    expect(plus).toBeDefined();
    expect(plus).toContain(
      'the AI-assisted engineering project entry as a single bullet',
    );
    expect(plus).toContain('No tooling mechanisms');
    expect(plus).toContain('otherwise no AI project entry');
  });

  it('prompt_2 puts an AI line in the summary only when the vacancy mentions AI', () => {
    const summary = section(
      content,
      'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS',
    );
    expect(summary).toContain(
      '**The AI-assisted development line follows the AI weight.**',
    );
    expect(summary).toContain(
      'where AI is not mentioned, the Summary carries no AI clause',
    );
    expect(summary).toContain(
      'never takes the place of the commercial experience',
    );
  });

  it('prompt_2 gives Summary, current work and projects different AI roles', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      '**Each section has its own job — one AI fact, one place.**',
    );
    expect(mode).toContain('is not repeated in another');
    expect(mode).toContain(
      'JobFlow is the application; the AI-assisted engineering project is the delivery workflow it is developed with',
    );
  });

  it('prompt_2 leads AI evidence with employer-relevant proof', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      '**Lead with what an employer checks, not with how the tooling works.**',
    );
    expect(mode).toContain(
      'AI-generated changes that passed tests but violated requirements',
    );
    expect(mode).toContain(
      'use them only when the vacancy is about AI tooling itself',
    );
    expect(mode).toContain(
      'Ralph, an agent loop that takes a ready issue to a pull request',
    );
    expect(mode).toContain(
      'The AI-assisted engineering project entry does not carry this fact',
    );
    expect(mode).toContain(
      'whose `roleFamilies` include both `ai_assisted_engineering` and `developer_productivity`',
    );
    expect(mode).toContain(
      "never as a part of JobFlow's own pipeline, and never merged into the JobFlow bullet",
    );
  });

  it('prompt_2 has a review dashboard facet', () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain('- **Review dashboard** — a Next.js dashboard');
  });

  it('prompt_2 does not present the dashboard as financial dashboard experience', () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    const facet = block
      .split('\n')
      .find((line) => line.startsWith('- **Review dashboard** — '));
    expect(facet).toBeDefined();
    expect(facet).toContain(
      'never present it as financial dashboards, charts, data visualisation or large data tables',
    );
  });

  it('still forbids presenting personal AI work as commercial', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      'Personal AI work is never presented as commercial or production experience',
    );
    expect(mode).toContain('AI Engineer');
    expect(content).toContain(
      'Personal AI/RAG/FastAPI/OpenAI exposure is never presented as commercial production experience.',
    );
    expect(mode).toContain('productivity and speed-up figures');
  });

  it('prompt_2 v14 is the only active version and v13 is inactive', () => {
    const prompt2 = promptTemplates.filter((t) => t.step === 'prompt_2');
    const active = prompt2.filter((t) => t.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].version).toBe(14);
    expect(active[0].id).toBe('seed-prompt-2-targeted-cv-content-v14');
    expect(active[0].content).toBe(readPromptFile('prompt2_v14.txt'));
    for (const version of [13, 12, 11]) {
      const previous = prompt2.find((t) => t.version === version);
      expect(previous).toBeDefined();
      expect(previous!.isActive).toBe(false);
    }
  });

  it('prompt_2 keeps a confirmed scale number when its case is used', () => {
    const experience = section(content, 'PROFESSIONAL EXPERIENCE');
    expect(experience).toContain(
      '**Keep the confirmed scale of a case you use.**',
    );
    expect(experience).toContain(
      'the bullet keeps that number, verbatim as the evidence gives it',
    );
    expect(experience).toContain('This is not permission to add a figure');
  });

  it('prompt_2 does not let AI evidence displace a requirement-covering commercial bullet', () => {
    const experience = section(content, 'PROFESSIONAL EXPERIENCE');
    expect(experience).toContain(
      '**AI evidence never displaces a requirement-covering commercial bullet.**',
    );
    expect(experience).toContain(
      'When a commercial bullet is the only place the CV covers a vacancy requirement',
    );
    expect(experience).toContain('it stays, whatever the AI weight');
  });

  it('prompt_2 resolves AI-core overflow with a third page, not by cutting commercial bullets', () => {
    const rendering = section(content, 'RENDERING HINTS AND PDF READINESS');
    expect(rendering).toContain(
      '**When AI is core and the CV does not fit, use the third page — do not cut commercial experience.**',
    );
    expect(rendering).toContain(
      'set `max_pages: 3` and `strong_match_allows_page_3: true`',
    );
    expect(rendering).toContain('do not cut or thin commercial bullets');
  });

  it('prompt_2 still never exceeds max_pages', () => {
    const rendering = section(content, 'RENDERING HINTS AND PDF READINESS');
    expect(rendering).toContain('Exceeding `max_pages` is never acceptable.');
  });

  it('prompt_2 still gives the AI-assisted engineering project two bullets when AI is core', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    const core = mode
      .split('\n')
      .find((line) => line.startsWith('- **Core** — '));
    expect(core).toBeDefined();
    expect(core).toContain(
      'the AI-assisted engineering project entry with two bullets of proof (its detailed wording) and `display_priority: "must_show"`',
    );
  });

  it("prompt_2 scopes the current-work tech_stack to the block's bullets and vacancy-named JobFlow technologies", () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain(
      '**The technology line: `current_work_block.tech_stack`.**',
    );
    expect(block).toContain(
      'it is a composite entry for the period, not the stack of one project',
    );
    expect(block).toContain(
      "- the technologies the block's bullets name — the Node.js and React of the independent-work bullet, the technologies of the JobFlow facets you selected",
    );
    expect(block).toContain(
      "- plus every technology of the JobFlow registry entry's `techStack` that the vacancy names",
    );
    expect(block).toContain(
      "It is never the whole JobFlow `techStack`: a JobFlow technology that neither the block's bullets nor the vacancy name stays out.",
    );
    expect(block).toContain(
      'It never merges the stacks of the applications the overview represents, of applications left unselected or of `selected_projects[]` entries.',
    );
    expect(block).toContain(
      'One label per technology, without a version number and without a parenthetical detail that only tells projects apart',
    );
    expect(block).toContain(
      "AI technologies — an LLM API, a coding assistant — appear only when the block's bullets name them",
    );
    expect(block).toContain('There is no numeric limit');
  });

  it('prompt_2 keeps the general tech_stack rules for employer and project entries', () => {
    const selection = section(
      content,
      'CONTENT SELECTION — YOU DECIDE, NOT THE RENDERER',
    );
    expect(selection).toContain('**Scope of "this entry\'s evidence".**');
    expect(selection).toContain(
      'For each `experience[]` and each `selected_projects[]` entry it is the evidence of that employer or that project, and the rules below apply to those entries unchanged.',
    );
    expect(selection).toContain(
      'The traceability gate, mandatory inclusion, "never remove" and the ordering rule apply to that list inside this scope',
    );
    expect(selection).toContain(
      "**Every name in an entry's `tech_stack` must be traceable to that entry's own evidence.**",
    );
    expect(selection).toContain(
      '**Inclusion is mandatory wherever the evidence supports it.**',
    );
    expect(selection).toContain(
      '**Never remove an evidence-backed technology merely because the vacancy did not name it.**',
    );
    expect(selection).toContain(
      '**Order these lists by vacancy relevance, since you may not shorten them.**',
    );
  });

  it('prompt_2 keeps a material evidence restriction in a tech_stack label', () => {
    const selection = section(
      content,
      'CONTENT SELECTION — YOU DECIDE, NOT THE RENDERER',
    );
    expect(selection).toContain(
      '**A material restriction travels with the name.**',
    );
    expect(selection).toContain(
      "the label in this entry's `tech_stack` carries that restriction in the evidence's own words, or the technology is left out of this entry",
    );
    expect(selection).toContain('This outranks mandatory inclusion below');
  });

  it('prompt_2 limits the canonical-term exception to version-free current-work labels', () => {
    const sources = section(content, 'EVIDENCE SOURCE RULES');
    expect(sources).toContain(
      '**One narrow exception, for `current_work_block.tech_stack` only:**',
    );
    expect(sources).toContain(
      'there a label may omit only a version number and a parenthetical detail that only tells projects apart',
    );
    expect(sources).toContain(
      'The name itself is still written as the evidence writes it; substituting another technology, shortening or expanding the name, and losing a material restriction the evidence places on it stay forbidden there too.',
    );
    expect(sources).toContain(
      'In every other field, including every other `tech_stack[]`, this rule applies unchanged.',
    );
  });

  it('prompt_2 orders a selected project tech_stack by vacancy relevance, not registry order', () => {
    const projects = section(content, 'SELECTED PROJECTS');
    expect(projects).toContain(
      '- `tech_stack`: its composition is what the registry `techStack` and the sources place in this project, minus only what a higher rule excludes',
    );
    expect(projects).toContain(
      'the per-entry traceability and attribution rules, a material evidence restriction (both in CONTENT SELECTION) and AI positioning',
    );
    expect(projects).toContain(
      'Those rules outrank keeping the composition complete; vacancy relevance by itself removes nothing — no relevance filter and no numeric limit.',
    );
    expect(projects).toContain(
      "Its order follows the ordering rule in CONTENT SELECTION: the registry's order is not an order of relevance",
    );
  });

  it('prompt_2 keeps AI tools out of a selected project tech_stack when the vacancy has no AI mention', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    const modeOff = mode
      .split('\n')
      .find((line) =>
        line.startsWith('**Mode off: no AI mention anywhere in the vacancy.**'),
      );
    expect(modeOff).toBeDefined();
    expect(modeOff).toContain(
      "**In such a vacancy the AI tools of a `selected_projects[]` entry's registry `techStack` — a coding assistant, an LLM API — stay out of that entry's `tech_stack`:**",
    );
    expect(modeOff).toContain(
      'AI positioning outranks keeping that list complete',
    );
    const projects = section(content, 'SELECTED PROJECTS');
    expect(projects).toContain(
      "in a vacancy without an AI mention the entry's AI tools stay out",
    );
  });

  it('prompt_2 and cv_rules derive the public-deployment fact from the represented registry entries', () => {
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain(
      'public deployment (only when at least one application the overview represents has `deployment.kind: public` in its registry entry; singular or plural, and any number, follow those entries)',
    );
    expect(block).toContain(
      'Every statement is true of the applications the overview represents **after** you chose `selected_projects[]`',
    );
    expect(block).toContain(
      'is taken from the `deployment.kind` of the registry entries that remain',
    );
    const rules = readActiveCvRules();
    expect(rules).toContain(
      '- public deployment — only when at least one application the overview represents has `deployment.kind: public` in its registry entry; singular or plural, and any number, follow those entries;',
    );
    expect(rules).toContain(
      'Every statement is true of the applications the overview represents **after** the Selected Projects choice',
    );
    expect(rules).toContain(
      'is taken from the registry entries that remain (`deployment.kind`)',
    );
    expect(rules).not.toContain(
      'two of the applications are publicly available',
    );
    expect(rules).not.toContain('two of them publicly available');
  });

  it('cites filePath from the source header instead of hardcoded file names', () => {
    const sources = section(content, 'EVIDENCE SOURCE RULES');
    expect(sources).toContain('[Source: <sourceType> | <filePath>]');
    expect(sources).toContain(
      'quote the `filePath` exactly as it appears in that source',
    );
    expect(content).not.toMatch(VERSIONED_SOURCE_FILE_NAME);
  });
});

// ---------------------------------------------------------------------------
// prompt_3 — pre-PDF check
// ---------------------------------------------------------------------------
describe('prompt_3 active template', () => {
  let content: string;

  beforeAll(() => {
    content = activeContent('prompt_3');
  });

  it('accepts evidenced BullMQ and the AI-assisted engineering project', () => {
    expect(content).toContain(
      'The JobFlow BullMQ/Redis queue for AI steps is implemented',
    );
    expect(content).toContain(
      'One kind of entry is deliberately NOT a JobFlow duplicate: an AI-assisted engineering project',
    );
    expect(content).toContain(
      'Do not flag either as unconfirmed, as not implemented',
    );
  });

  it('prompt_3 checks the portfolio overview and the optional evidence bullet', () => {
    const context = section(content, 'CURRENT-WORK CONTEXT (persistent)');
    expect(context).toContain('a mandatory **portfolio overview**');
    expect(context).toContain(
      'at most one optional **additional piece of evidence**',
    );
    expect(context).toContain(
      'Three bullets are a complete block — never ask for a filler bullet',
    );
    expect(content).toContain('- a portfolio overview bullet is present:');
    expect(content).toContain(
      '- the optional additional-evidence bullet, when present, covers a vacancy requirement',
    );
    expect(content).toContain(
      '- the bullets adapted to the vacancy are the JobFlow bullet, the portfolio overview and the additional-evidence bullet;',
    );
    expect(content).toContain(
      'The same achievement — the same mechanism, figure or feature — must be described in exactly one section of the CV.',
    );
    expect(content).toContain(
      '**emit a correction that narrows the text of that current-work bullet**',
    );
    expect(content).toContain('never correct the project entry instead');
  });

  it('reports not_ready while the draft carries registry violations', () => {
    const contract = section(content, 'OUTPUT CONTRACT — READ FIRST');
    expect(contract).toContain(
      'when the CV content\'s `overclaiming_check.registry_violations` is not empty, "readiness" is "not_ready" and "export_blocked" is true',
    );
    expect(contract).toContain('Never add a correction to reach that verdict.');
  });

  it('flags implemented RAG claims and allows high-level portfolio references', () => {
    expect(content).toContain(
      'no project the candidate may show in a CV implements these',
    );
    expect(content).toContain('is a finding even when the vacancy asks for AI');
    expect(content).toContain(
      'Duplication is a fact told twice, not the same project named twice.',
    );
  });

  it('never lets a correction introduce a project or credential name', () => {
    const contract = section(content, 'OUTPUT CONTRACT — READ FIRST');
    expect(contract).toContain(
      '**A correction never introduces a project or credential name.**',
    );
    expect(contract).toContain(
      'Never rename a `selected_projects[].title` or a `certifications[]` entry to a different project or credential',
    );
    expect(contract).toContain(
      'the export stays blocked until the CV draft is regenerated',
    );
  });

  it('prompt_3 keeps the current-work frame fields fixed and states the canonical stable intro', () => {
    const contract = section(content, 'OUTPUT CONTRACT — READ FIRST');
    expect(contract).toContain(
      "**The current-work block's frame fields are fixed by design and are corrected only for a factual or safety error.**",
    );
    expect(contract).toContain(
      "Nothing else is a reason to correct them: not reading as generated, defensive, repetitive, formal or improvable, not a phrase from section 6's lists, and not an older form of the block quoted in a knowledge source.",
    );
    expect(contract).toContain(
      "Section 6's literal scan and sections 6.1, 6.2 and 7 do not apply to them.",
    );
    const context = section(content, 'CURRENT-WORK CONTEXT (persistent)');
    expect(quotedStableIntro(context)).toBe(
      extractCanonicalIntro(readActiveCvRules()),
    );
    expect(context).toContain(
      'such quotations are outdated, and the canonical values above are the ones in force',
    );
    expect(context).toContain(
      'Never correct a frame field toward a quoted older form.',
    );
    const bop = bopSection(content);
    expect(bop).toContain(
      "The current-work block's frame fields (`safe_label`, `role_line`, `dates`, `location`, `stable_intro`) are outside this scan",
    );
    // Pattern 4 stays listed for every other field.
    expect(listedBopPatterns(content)[3].phrases).toEqual([
      'continued active software development',
    ]);
  });

  it('prompt_3 accepts a version-free current-work tech_stack label', () => {
    expect(content).toContain(
      '**A version-free label in `current_work_block.tech_stack` is not a canonical-term finding.**',
    );
    expect(content).toContain(
      'Do not flag such a label for the missing version or detail, and do not suggest restoring it.',
    );
    expect(content).toContain(
      'a substituted technology, a shortened or expanded name and a lost material restriction the evidence places on a technology are corrected as normal',
    );
    expect(content).toContain(
      '- Docker — does it read as a production DevOps skill?',
    );
  });

  it('prompt_2 and prompt_3 treat a shared practice of the represented applications as no duplicate', () => {
    const definition =
      'A duplicate is the same achievement of the same project: the same mechanism, figure or feature.';
    const sharedPractice =
      'A shared practice or technology that is true of the applications the overview represents — automated tests and CI, TypeScript, PostgreSQL — is not a duplicate, even when a selected project shows it too';
    const overview = section(
      activeContent('prompt_2'),
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(overview).toContain(definition);
    expect(overview).toContain(sharedPractice);
    const duplication = content.slice(
      content.indexOf('## 0.1 Cross-section content duplication'),
      content.indexOf('## 0.2 Intra-entry redundancy'),
    );
    expect(duplication).toContain(definition);
    expect(duplication).toContain(sharedPractice);
    expect(duplication).toContain(
      'When it is unclear which application a fact belongs to, do not correct the text: write it in "overall_notes"',
    );
  });

  it('still flags commercial AI claims', () => {
    expect(content).toContain(
      'wording that presents this work as commercial or production experience',
    );
    expect(content).toContain('even when the vacancy asks for "AI tools"');
    expect(content).toContain(
      "A vacancy's appetite for AI never turns personal AI work into commercial evidence.",
    );
  });
});

// ---------------------------------------------------------------------------
// cover_letter — personal AI evidence in the letter
// ---------------------------------------------------------------------------
describe('cover_letter active template', () => {
  let content: string;

  beforeAll(() => {
    content = activeContent('cover_letter');
  });

  it('cover_letter active version is v6', () => {
    const activeVersions = promptTemplates
      .filter((t) => t.step === 'cover_letter' && t.isActive)
      .map((t) => t.version);
    expect(activeVersions).toEqual([6]);
  });

  it('cover_letter has exactly one active version in prisma/seed.ts', () => {
    const activeEntries = promptTemplates.filter(
      (t) => t.step === 'cover_letter' && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  });

  it('cover_letter active template describes personal AI work when the vacancy mentions AI', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**Mode on: the vacancy mentions AI anywhere.**');
    expect(mode).toContain(
      'A standard backend vacancy where AI appears only in nice-to-have or in responsibilities',
    );
    expect(mode).toContain('still turns the mode on');
    expect(mode).toContain(
      'the letter must describe the personal AI work that fits the vacancy',
    );
    expect(mode).toContain('mark it plainly as personal/portfolio work');
    expect(mode).toContain('it adds to the commercial backend experience');
  });

  it('cover_letter scales the AI paragraph and leads with employer-relevant proof', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('- **AI is core** — ');
    expect(mode).toContain('Give it its own paragraph');
    expect(mode).toContain(
      '**Lead with what an employer checks, not with how the tooling works.**',
    );
    expect(mode).toContain(
      'AI-generated changes that passed tests but violated requirements',
    );
    // v5 (ISSUE-696): the delivery workflow is a separate package, not part of JobFlow.
    expect(mode).toContain(
      'a separate, versioned package in its own repository, which JobFlow is developed with',
    );
  });

  it('cover_letter keeps AI brief when it is only a plus', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    const plus = mode
      .split('\n')
      .find((line) => line.startsWith('- **AI is a plus** — '));
    expect(plus).toBeDefined();
    expect(plus).toContain('one or two concrete sentences');
    expect(plus).toContain('not a separate developed paragraph');
  });

  it('cover_letter active template maps the kind of AI ask to evidence', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**AI tools / AI in development**');
    expect(mode).toContain('**LLM / AI API integration**');
    expect(mode).toContain('**RAG / agents / vector search**');
  });

  it('cover_letter active template does not centre the letter on AI when the vacancy has no AI mention', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      '**Mode off: no AI mention anywhere in the vacancy.**',
    );
    expect(mode).toContain(
      'Do not build a paragraph around AI experience and do not list AI projects as a selling point',
    );
  });

  it('cover_letter active template keeps personal AI work non-commercial', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**Personal is not commercial.**');
    expect(mode).toContain(
      'Never present it as commercial or production experience',
    );
    expect(mode).toContain('AI Engineer or LLM Platform Engineer');
  });

  it('cover_letter active template does not invent AI evidence the sources lack', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('**Never invent AI evidence.**');
    expect(mode).toContain('do not write it into the letter');
    expect(mode).toContain('status `"needs evidence"`');
  });

  it('cover_letter names projects and credentials only from the exported CV', () => {
    const names = section(content, 'NAMES IN THE LETTER');
    expect(names).toContain(
      '**The letter names a project or a credential only when the EXPORTED CV names it**',
    );
    expect(names).toContain(
      'never named in the letter, and never a registry entry with `cvEligible: false`',
    );
    expect(names).toContain(
      'Facts from the sources about a project the EXPORTED CV does not name are not used either',
    );
    const input = section(content, 'INPUT YOU WILL RECEIVE');
    expect(input).toContain('`=== EXPORTED CV (...) ===`');
    expect(input).toContain(
      'It is the source of truth for every claim and every name in the letter.',
    );
  });

  it('cover_letter keeps coding-agent development, API integration, the agent Git boundary and the skill badge as the sources state them', () => {
    const mode = section(content, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain(
      'Claude Code and OpenAI Codex are used to *develop* the software; the OpenAI API runs *inside* JobFlow.',
    );
    expect(mode).toContain(
      "a separate, versioned package in its own repository, which JobFlow is developed with, never a part of JobFlow's pipeline",
    );
    expect(mode).toContain(
      'the agent may read repository state (`git status`, `git diff`, `git log`, and `git show` on review passes) but cannot commit, push or call the GitHub CLI',
    );
    expect(mode).toContain(
      '**The weight decides how much; the kind of request decides which fact.**',
    );
    expect(mode).toContain('not the job title');
    expect(mode).toContain(
      'the badge is always a skill badge, never a certification',
    );
    const core = mode
      .split('\n')
      .find((line) => line.startsWith('- **AI is core** — '));
    expect(core).toBeDefined();
    expect(core).toContain(
      'three or four sentences of proof chosen by the kind of request',
    );
    expect(core).toContain(
      'For LLM / AI API integration: what the integration in JobFlow does',
    );
    expect(mode).toContain('no project the candidate shows implements these');
  });

  it('cover_letter never lets a manual note add a project or credential name the exported CV lacks', () => {
    expect(content).toContain(
      '**One limit outranks it: a manual note never adds a project or credential name the EXPORTED CV lacks**',
    );
    expect(content).toContain(
      'leave the name out of the letter and record the request in `risks`',
    );
    expect(content).toContain(
      'the rest of the note\'s content stays forced and marked "user-forced, unverified"',
    );
  });

  it('cover_letter treats draft coverage and evidence notes as context, not as claims', () => {
    const notes = section(content, 'DRAFT NOTES ARE CONTEXT, NOT CLAIMS');
    expect(notes).toContain('Use them as context only');
    expect(notes).toContain(
      'They never permit a claim: a claim the EXPORTED CV omits, or states differently because the pre-PDF check corrected it, does not return through these notes.',
    );
    expect(notes).toContain('the EXPORTED CV wins');
  });

  it('cover_letter chooses the letter language by priority and reports it as an ISO 639-1 code', () => {
    const rule = content
      .split('\n')
      .find((line) => line.startsWith('- **Letter language.**'));
    expect(rule).toBeDefined();
    const priorities = [
      '(1) the language the employer explicitly asks applications to be written in',
      '(2) English, when the vacancy explicitly names English as the working language',
      '(3) otherwise the language the vacancy is written in',
      '(4) English, when the choice is still ambiguous',
    ].map((item) => rule!.indexOf(item));
    expect(priorities.every((index) => index !== -1)).toBe(true);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
    expect(rule).toContain(
      'the letter never states or implies a level of that language above the level the EXPORTED CV or the sources confirm',
    );
    expect(rule).toContain(
      '"language" is the ISO 639-1 code of the language the letter is actually written in',
    );
    expect(rule).toContain('never a language name');
    const contract = section(content, 'OUTPUT CONTRACT — READ FIRST');
    expect(contract).toContain('"language": string,');
  });

  it('cover_letter active template keeps the ADR-034 manual-note rule', () => {
    expect(content).toContain('**Exception (ADR-034):**');
    expect(content).toContain('"user-forced, unverified"');
    expect(content).toContain('manual_note_forced_claims');
  });

  it('cover_letter active template names knowledge sources by sourceType', () => {
    const sources = section(content, 'EVIDENCE SOURCE RULES');
    expect(sources).toContain('[Source: <sourceType> | <filePath>]');
    for (const sourceType of [
      'profile_summary',
      'cv_rules',
      'career_cases',
      'tech_stack',
      'project_inventory',
    ]) {
      expect(sources).toContain(`\`${sourceType}\` — `);
    }
    expect(content).not.toMatch(VERSIONED_SOURCE_FILE_NAME);
  });
});

// ---------------------------------------------------------------------------
// skip_reason — stop/artifact step, not a pipeline continuation
// ---------------------------------------------------------------------------
describe('skip_reason active template', () => {
  let content: string;

  beforeAll(() => {
    content = activeContent('skip_reason');
  });

  it('has exactly one active version in prisma/seed.ts', () => {
    const activeEntries = promptTemplates.filter(
      (t) => t.step === 'skip_reason' && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  });

  it('hardcodes "decision" as "skip" in the output contract', () => {
    // The skip_reason step always produces decision = "skip" — never any other value
    expect(content).toContain('"decision": "skip"');
  });

  it('explicitly states the decision is not reconsidered — this is a stop step', () => {
    // Guards against accidentally turning the skip step into a reconsideration flow
    expect(content).toContain('do not reconsider');
  });
});

// ---------------------------------------------------------------------------
// Credential selection (ISSUE-704). The one policy lives in cv_rules section 9.6; prompt_2
// points to it, names no registry credential and keeps the AI-weight limits; the active
// certifications inventory and tech_stack keep the safe usage of the Google Cloud badges. These
// checks prove the instructions and data are present and consistent, not how a model selects.
// ---------------------------------------------------------------------------

// The body of a markdown section, from its heading line to the next heading of the same or a
// higher level. Throws when the heading is missing, so a renamed section fails loudly.
const markdownSection = (text: string, heading: string): string => {
  const normalized = text.replace(/\r\n/g, '\n');
  const start = normalized.indexOf(`\n${heading}\n`);
  if (start === -1) {
    throw new Error(`Section "${heading}" not found.`);
  }
  const level = heading.indexOf(' ');
  const body = normalized.slice(start + heading.length + 2);
  const next = body.search(new RegExp(`\\n#{1,${level}} `));
  return next === -1 ? body : body.slice(0, next);
};

// The part of a text between two markers; throws when either is missing.
const between = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  if (start === -1 || end === -1) {
    throw new Error(`"${from}" … "${to}" not found.`);
  }
  return text.slice(start, end);
};

// The credential names (titles and aliases) a text names as a whole phrase — the scan behind
// "credential selection rules and prompt_2 name no registry credential".
const findCredentialNames = (
  text: string,
  credentials: readonly Pick<Credential, 'title' | 'aliases'>[],
): string[] =>
  credentials
    .flatMap((credential) => [credential.title, ...credential.aliases])
    .filter((name) => containsRegistryName(text, name));

const readActiveSource = (sourceType: string): string =>
  fs.readFileSync(activeSourcePath(sourceType), 'utf-8');

const activeCredentials = (): Credential[] =>
  parseCredentialRegistry(readActiveSource('certifications')).credentials;

const credentialNamed = (id: string): Credential => {
  const entry = activeCredentials().find((credential) => credential.id === id);
  if (entry === undefined) throw new Error(`No active credential "${id}".`);
  return entry;
};

const RULES_REGISTRY_FIELDS = '### 9.2 Registry fields';
const RULES_AI_WEIGHT = '### 9.3 AI-assisted engineering: weight and kind';
const RULES_EXPECTED_SELECTION = '### 9.4 Expected selection by vacancy';
const RULES_CERTIFICATIONS = '### 9.6 Certifications';
const PROMPT_2_CERTIFICATIONS_SECTION =
  'TARGET STRATEGY, HEADLINE, SUMMARY, TOP SKILLS';

describe('credential selection policy', () => {
  let rules: string;
  let certificationRules: string;
  let prompt2: string;

  beforeAll(() => {
    rules = readActiveCvRules();
    certificationRules = markdownSection(rules, RULES_CERTIFICATIONS);
    prompt2 = activeContent('prompt_2');
  });

  it('cv_rules selects credentials by their semantic relevance to the whole vacancy', () => {
    expect(certificationRules).toContain(
      "Judge every `cvEligible` credential against the whole vacancy and against the candidate's evidence",
    );
    expect(certificationRules).toContain(
      'must-have and nice-to-have requirements, responsibilities, the technical ecosystem, infrastructure and deployment, engineering practices, the hidden role logic of the Prompt 1 analysis, competencies the described work reasonably implies, and transferable knowledge',
    );
    for (const level of [
      '- **Direct** — it covers a competence or technology the vacancy names explicitly.',
      '- **Functional** — it supports a duty the vacancy describes, even though the vacancy does not name the technology.',
      '- **Contextual** — it is a useful supporting competence in the technical environment the vacancy describes.',
      '- **Unrelated** — it has no connection to this vacancy; it is not shown.',
    ]) {
      expect(certificationRules).toContain(level);
    }
    expect(certificationRules).toContain(
      'The levels are a way of reasoning, not a field and not a numeric score.',
    );
    expect(certificationRules).toContain(
      "The job title, the vacancy family, the credential's `roleFamilies` and word matches do not decide the choice, and no fixed list of credentials per vacancy category does either",
    );
    expect(certificationRules).toContain(
      'A competence the vacancy only implies is never written as an employer requirement, and a technology is never written as one the employer uses unless the vacancy says so',
    );
  });

  it('cv_rules ranks credentials by relevance, evidence, complement, assessment, redundancy and recency', () => {
    const criteria = [
      '1. **Semantic relevance**',
      '2. **Strength of evidence**',
      '3. **Complement to commercial and project experience**',
      '4. **Practical assessment and level**',
      '5. **No redundancy**',
      '6. **Recency**',
    ];
    const positions = criteria.map((criterion) =>
      certificationRules.indexOf(criterion),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(certificationRules).toContain(
      'Keep **3–5 entries, fewer when fewer are relevant**',
    );
    expect(certificationRules).toContain(
      'At comparable relevance a skill badge is preferred over a course, but a more relevant course is preferred over a less relevant skill badge.',
    );
    expect(certificationRules).toContain(
      'There is no hierarchy by issuer, type or level alone',
    );
    expect(certificationRules).toContain(
      'Training never displaces commercial or project evidence',
    );
  });

  it('cv_rules and prompt_2 limit only credentials with an aiCategory by the AI weight', () => {
    for (const statement of [
      'An **AI credential** is a `cvEligible` entry with an `aiCategory`.',
      '- Not mentioned (Off): no AI credential.',
      '- Plus: at most one AI credential.',
      '- Core: several AI credentials, by relevance.',
      'A credential without an `aiCategory` is not limited by the AI weight',
    ]) {
      expect(certificationRules).toContain(statement);
    }
    const certifications = section(prompt2, PROMPT_2_CERTIFICATIONS_SECTION);
    for (const statement of [
      '**An AI credential is a `cvEligible` entry with an `aiCategory`, and only AI credentials are limited by the AI weight:**',
      'where AI is core include several by relevance',
      'where AI is only a plus include at most one AI credential, and where AI is not mentioned none',
      'A credential without an `aiCategory` is not limited by the AI weight',
    ]) {
      expect(certifications).toContain(statement);
    }
  });

  it('cv_rules distinguishes kinds of AI credentials by their registry skills', () => {
    const aiWeight = markdownSection(rules, RULES_AI_WEIGHT);
    expect(aiWeight).toContain(
      '| Agent development (agent frameworks, ADK, multi-agent architecture, agent interoperability and orchestration, tool integration, authentication and deployment of agents) | agent-development skill badges chosen by their registry `skills`',
    );
    expect(aiWeight).toContain(
      '— AI-assisted coding | Dark Factory: scoped GitHub Issues',
    );
    for (const kind of [
      '- AI-assisted coding — ',
      '- LLM integration — ',
      '- agent development — ',
      '- multi-agent architecture — ',
      '- agent interoperability and orchestration — ',
      '- tool integration, authentication and deployment of agents;',
      '- general AI training — ',
    ]) {
      expect(certificationRules).toContain(kind);
    }
    expect(certificationRules).toContain(
      'choose a credential by what its registry `skills` cover',
    );
    expect(certificationRules).toContain(
      'For a vacancy about AI-assisted coding only, agent-development training never comes before the coding-agent evidence (the AI-assisted engineering project) and the AI-tooling credentials',
    );
    expect(certificationRules).toContain(
      'Two agent-development credentials are shown only when each covers its own part of the request',
    );
  });

  it('cv_rules considers infrastructure credentials from the infrastructure context of the vacancy', () => {
    expect(certificationRules).toContain(
      'An infrastructure or IaC credential is considered from the infrastructure duties and context of the vacancy: IaC, cloud infrastructure, provisioning, CI/CD, deployment automation, environment configuration, reliability and scalability, work with DevOps, platform engineering — whatever the job title and without the exact keyword.',
    );
    expect(certificationRules).toContain(
      'An incidental mention of CI/CD or the cloud does not open it on its own',
    );
    expect(certificationRules).toContain(
      'Its priority rises when the candidate has commercial experience in the same skill',
    );
    expect(certificationRules).toContain(
      'Keep transferable knowledge of the tool apart from experience with a specific cloud',
    );
  });

  it('cv_rules illustrates six vacancy patterns for credential selection', () => {
    const patterns = between(
      certificationRules,
      '**Illustrative vacancy patterns.**',
      '**Print format.**',
    );
    expect(patterns).toContain('they are not templates and do not prove');
    const starts = [
      '1. Backend with cloud deployments, CI/CD and collaboration with an infrastructure team, without the word Terraform → ',
      '2. Terraform or IaC named explicitly → ',
      '3. Backend without infrastructure work and without AI → ',
      '4. AI-assisted coding without agent development → ',
      '5. Agent or multi-agent development → ',
      '6. Cloud infrastructure together with agent development → ',
    ];
    const listed = patterns.split('\n').filter((line) => /^\d+\. /.test(line));
    expect(listed).toHaveLength(starts.length);
    for (const [index, start] of starts.entries()) {
      expect(listed[index].startsWith(start)).toBe(true);
    }
  });

  it('the credential name scan reports a registry title written in rules text', () => {
    const credentials = [
      { title: 'Sample Cloud Skill Badge', aliases: ['Sample Cloud Badge'] },
      { title: 'Sample Testing Course', aliases: [] },
    ];
    const text =
      'Prefer the sample cloud skill badge for cloud work; a Sample Cloud Badges list does not count.';

    expect(findCredentialNames(text, credentials)).toEqual([
      'Sample Cloud Skill Badge',
    ]);
  });

  it('credential selection rules and prompt_2 name no registry credential', () => {
    const eligible = activeCredentials().filter(
      (credential) => credential.cvEligible,
    );
    expect(eligible.length).toBeGreaterThan(0);
    const texts = [
      {
        where: RULES_EXPECTED_SELECTION,
        text: markdownSection(rules, RULES_EXPECTED_SELECTION),
      },
      { where: RULES_CERTIFICATIONS, text: certificationRules },
      { where: 'prompt_2', text: prompt2 },
    ];
    const named = texts.map(({ where, text }) => ({
      where,
      names: findCredentialNames(text, eligible),
    }));
    expect(named).toEqual(texts.map(({ where }) => ({ where, names: [] })));
  });

  it('cv_rules and prompt_2 treat credential roleFamilies as a supporting signal', () => {
    const registryFields = markdownSection(rules, RULES_REGISTRY_FIELDS);
    expect(registryFields).toContain(
      "its `roleFamilies` is a supporting signal, not a filter — it never decides selection, and a credential outside the vacancy's families is selected when its semantic relevance supports it",
    );
    expect(certificationRules).toContain(
      "`roleFamilies` is a supporting signal, not a filter: a credential outside the vacancy's families is selected when its semantic relevance supports it",
    );
    expect(section(prompt2, PROMPT_2_CERTIFICATIONS_SECTION)).toContain(
      "A credential's `roleFamilies` is a supporting signal, not a filter: a credential outside the vacancy's families is still included when its semantic relevance supports it.",
    );
  });

  it('prompt_2 still allows no AI credential when the vacancy has no AI mention', () => {
    expect(section(prompt2, PROMPT_2_CERTIFICATIONS_SECTION)).toContain(
      'where AI is not mentioned none',
    );
    const mode = section(prompt2, 'AI-MENTIONING VACANCY MODE');
    expect(mode).toContain('Do not include AI credentials');
    expect(mode).toContain(
      'The Summary still carries no AI clause, `certifications` no AI credential and the portfolio overview no AI facet.',
    );
  });

  it('active tech_stack keeps commercial Terraform apart from Google Cloud training', () => {
    const techStack = readActiveSource('tech_stack');
    const rows = techStack.split(/\r?\n/);
    const terraformTitle = credentialNamed(
      'gc-terraform-build-infrastructure',
    ).title;
    const terraformRow = rows.find((row) =>
      row.startsWith('| Terraform | EPAM: resource and module changes'),
    );
    expect(terraformRow).toBeDefined();
    expect(terraformRow).toContain('commercial working; not DevOps ownership');
    expect(terraformRow).toContain(terraformTitle);
    const cloudRows = rows.filter((row) =>
      row.startsWith('| Google Cloud (GCP) |'),
    );
    expect(cloudRows.length).toBeGreaterThan(0);
    for (const row of cloudRows) {
      expect(row.toLowerCase()).toContain('training only');
    }
    expect(
      cloudRows.some(
        (row) =>
          row.startsWith('| Google Cloud (GCP) | — |') &&
          row.includes('no commercial Google Cloud experience'),
      ),
    ).toBe(true);
    expect(techStack).toContain(
      'The Agent-to-Agent (A2A) protocol, MCP through ADK and Agent Engine deployment',
    );
    expect(techStack).toContain(
      'are category C training: none of them is production deployment of agents, production ownership of an agent system or commercial AI work.',
    );
    expect(techStack).toContain(
      'It is not a HashiCorp certification, not commercial Google Cloud (GCP) experience and not DevOps ownership',
    );
    expect(techStack).toContain(
      'never claim model training, fine-tuning, pretraining or tokenization work',
    );
  });

  it('active certifications inventory states the safe usage of every Google Cloud skill badge', () => {
    const inventory = readActiveSource('certifications');
    const prose = stripRegistryBlocks(inventory);
    const lines = prose.split(/\r?\n/);
    expect(prose).toContain(
      'Every `skill_badge` entry is always called a **skill badge**. It is never called a professional certification or a certificate',
    );

    const badges = activeCredentials().filter(
      (credential) =>
        credential.type === 'skill_badge' && credential.cvEligible,
    );
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      const names = [badge.title, ...badge.aliases];
      const naming = lines.filter((line) =>
        names.some((name) => containsRegistryName(line, name)),
      );
      const calledCertification = naming.filter((line) =>
        line.toLowerCase().includes('professional certification'),
      );
      expect({ id: badge.id, calledCertification }).toEqual({
        id: badge.id,
        calledCertification: [],
      });
      const listed = lines.find(
        (line) =>
          line.startsWith(`| ${badge.title}`) &&
          line.includes('| skill badge | earned |'),
      );
      expect({ id: badge.id, listed: listed !== undefined }).toEqual({
        id: badge.id,
        listed: true,
      });
    }

    const safeUsage = (id: string): string => {
      const title = credentialNamed(id).title;
      const row = lines.find((line) =>
        line.startsWith(`| ${title} (Google Cloud skill badge) |`),
      );
      if (row === undefined) throw new Error(`No safe-usage row for "${id}".`);
      return row;
    };
    const adk = safeUsage('gc-adk-engineer-ai-agents');
    expect(adk).toContain('Agent-development **training**');
    expect(adk).toContain('not production deployment of agents');
    expect(adk).toContain(
      'never model training, fine-tuning, pretraining or tokenization work',
    );
    const multiAgent = safeUsage('gc-deploy-multi-agent-architectures');
    expect(multiAgent).toContain('Agent-development **training**');
    expect(multiAgent).toContain(
      'not production deployment of agents and not production ownership of agent systems',
    );
    const terraform = safeUsage('gc-terraform-build-infrastructure');
    expect(terraform).toContain('Infrastructure **training**');
    expect(terraform).toContain(
      'Not a HashiCorp certification, not commercial Google Cloud (GCP) experience and not DevOps ownership',
    );
  });
});
