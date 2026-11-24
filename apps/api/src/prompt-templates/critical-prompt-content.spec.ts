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
import { parsePortfolioRegistry } from '../evidence/career-registry.parser';
import { containsRegistryName } from '../evidence/registry-compliance';

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

it('active prompt versions are prompt_1 v13, prompt_2 v11 and prompt_3 v9', () => {
  const activeVersions = ['prompt_1', 'prompt_2', 'prompt_3'].map((step) =>
    promptTemplates
      .filter((t) => t.step === step && t.isActive)
      .map((t) => t.version),
  );
  expect(activeVersions).toEqual([[13], [11], [9]]);
  const activeFiles = ['prompt_1', 'prompt_2', 'prompt_3'].map(
    (step) =>
      promptTemplates.find((t) => t.step === step && t.isActive)!.content,
  );
  expect(activeFiles).toEqual([
    readPromptFile('prompt1_v13.txt'),
    readPromptFile('prompt2_v11.txt'),
    readPromptFile('prompt3_v9.txt'),
  ]);
  for (const [step, version] of [
    ['prompt_1', 12],
    ['prompt_2', 10],
    ['prompt_3', 8],
  ] as const) {
    const previous = promptTemplates.find(
      (t) => t.step === step && t.version === version,
    );
    expect(previous).toBeDefined();
    expect(previous!.isActive).toBe(false);
  }
});

// The active project_inventory source (TASK-A). TASK-E (#690) moves the active source list
// into src/knowledge-sources/active-knowledge-sources.ts; until then the path is named here.
const ACTIVE_PROJECT_INVENTORY = path.join(
  __dirname,
  '../../knowledge-sources/evidence/Project_Inventory_RU_v0_8_portfolio_refresh.md',
);

it('active prompts name no registry project other than the current work project', () => {
  const registry = parsePortfolioRegistry(
    fs.readFileSync(ACTIVE_PROJECT_INVENTORY, 'utf-8'),
  );
  const forbiddenNames = registry.projects
    .filter((project) => project.placement !== 'current_work_block')
    .flatMap((project) => [project.title, ...project.aliases]);
  expect(forbiddenNames.length).toBeGreaterThan(0);

  for (const step of ['prompt_1', 'prompt_2', 'prompt_3']) {
    const content = activeContent(step);
    const named = forbiddenNames.filter((name) =>
      containsRegistryName(content, name),
    );
    expect({ step, named }).toEqual({ step, named: [] });
  }
});

it('active prompt_2 is v11 and cover_letter is v4', () => {
  const activeVersions = ['prompt_2', 'cover_letter'].map((step) =>
    promptTemplates
      .filter((t) => t.step === step && t.isActive)
      .map((t) => t.version),
  );
  expect(activeVersions).toEqual([[11], [4]]);
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
    expect(mode).toContain(
      'the AI-assisted engineering project entry counted among them when it is selected',
    );
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

  it('chooses the Summary variant and the third current-work bullet from the active sources', () => {
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
    const block = section(
      content,
      'CURRENT-WORK BLOCK (MANDATORY — STABLE FRAME, SELECTED CONTENT)',
    );
    expect(block).toContain(
      '**3. One concrete fact chosen for the vacancy (medium priority).**',
    );
    expect(block).toContain('third-bullet table in the `cv_rules` source');
    expect(block).toContain('**This bullet is replaced, never dropped.**');
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
      'Do not include the AI-assisted engineering project or any other project whose `roleFamilies` are AI families only',
    );
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

  it('prompt_2 v11 is the only active version and v10 is inactive', () => {
    const prompt2 = promptTemplates.filter((t) => t.step === 'prompt_2');
    const active = prompt2.filter((t) => t.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].version).toBe(11);
    expect(active[0].id).toBe('seed-prompt-2-targeted-cv-content-v11');
    expect(active[0].content).toBe(readPromptFile('prompt2_v11.txt'));
    const v10 = prompt2.find((t) => t.version === 10);
    expect(v10).toBeDefined();
    expect(v10!.isActive).toBe(false);
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
      'What is a duplicate is the same achievement, capability or mechanism told twice — not the same project named twice.',
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

  it('cover_letter active version is v4', () => {
    const activeVersions = promptTemplates
      .filter((t) => t.step === 'cover_letter' && t.isActive)
      .map((t) => t.version);
    expect(activeVersions).toEqual([4]);
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
    expect(mode).toContain(
      'JobFlow and its AI-assisted development process are one project',
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
