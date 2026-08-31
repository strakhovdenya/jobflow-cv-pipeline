/**
 * Regression guard for safety-critical PromptTemplate content.
 *
 * Checks that the active template for each pipeline step still contains the
 * keywords / output-contract clauses that enforce anti-overclaiming, apply/maybe/skip
 * decisions, and the skip-artifact pipeline stop. No DB, no AI provider — reads the
 * same prompt files the seed populates from.
 *
 * When prisma/seed.ts promotes a new version to isActive, mirror the change in
 * TEMPLATE_REGISTRY below so this guard continues testing the live content.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Slim registry mirrored from prisma/seed.ts promptTemplates.
 * Contains only the fields needed for active-content lookup.
 * Keep step + isActive + fileName in sync with seed.ts.
 */
const TEMPLATE_REGISTRY: {
  step: string;
  isActive: boolean;
  fileName: string;
}[] = [
  // prompt_1 — vacancy analysis
  { step: 'prompt_1', isActive: false, fileName: 'prompt1.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v2.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v3.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v4.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v5.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v6.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v7.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v8.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v9.txt' },
  { step: 'prompt_1', isActive: false, fileName: 'prompt1_v10.txt' },
  { step: 'prompt_1', isActive: true, fileName: 'prompt1_v11.txt' },
  // prompt_2 — targeted CV content
  { step: 'prompt_2', isActive: false, fileName: 'prompt2.txt' },
  { step: 'prompt_2', isActive: false, fileName: 'prompt2_v2.txt' },
  { step: 'prompt_2', isActive: false, fileName: 'prompt2_v3.txt' },
  { step: 'prompt_2', isActive: false, fileName: 'prompt2_v4.txt' },
  { step: 'prompt_2', isActive: false, fileName: 'prompt2_v5.txt' },
  { step: 'prompt_2', isActive: false, fileName: 'prompt2_v6.txt' },
  { step: 'prompt_2', isActive: true, fileName: 'prompt2_v7.txt' },
  // skip_reason — structured skip reasoning
  { step: 'skip_reason', isActive: false, fileName: 'skip_reason.txt' },
  { step: 'skip_reason', isActive: true, fileName: 'skip_reason_v2.txt' },
];

const PROMPTS_DIR = path.resolve(__dirname, '../../prisma/prompts');

/**
 * Reads the content of the active template for a step.
 * Throws (loud fail, not silent skip) when no active entry exists in TEMPLATE_REGISTRY.
 */
function activeContent(step: string): string {
  const entry = TEMPLATE_REGISTRY.find((t) => t.step === step && t.isActive);
  if (!entry) {
    throw new Error(
      `No active PromptTemplate for step "${step}" in TEMPLATE_REGISTRY. ` +
        `Sync this file with prisma/seed.ts when a new version is activated.`,
    );
  }
  return fs.readFileSync(path.join(PROMPTS_DIR, entry.fileName), 'utf-8');
}

// ---------------------------------------------------------------------------
// prompt_1 — vacancy analysis
// ---------------------------------------------------------------------------
describe('prompt_1 active template', () => {
  let content: string;

  beforeAll(() => {
    // Throws (fail, not skip) if no active entry — satisfies AC #4
    content = activeContent('prompt_1');
  });

  it('has exactly one active version in TEMPLATE_REGISTRY', () => {
    const activeEntries = TEMPLATE_REGISTRY.filter(
      (t) => t.step === 'prompt_1' && t.isActive,
    );
    expect(activeEntries).toHaveLength(1);
  });

  it('declares "decision" as a required output field', () => {
    expect(content).toContain('"decision"');
  });

  it('requires apply/maybe/skip as the full set of allowed decision values', () => {
    // All three values must appear in the output contract
    expect(content).toContain('"apply"');
    expect(content).toContain('"maybe"');
    expect(content).toContain('"skip"');
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

  it('has exactly one active version in TEMPLATE_REGISTRY', () => {
    const activeEntries = TEMPLATE_REGISTRY.filter(
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
});

// ---------------------------------------------------------------------------
// skip_reason — stop/artifact step, not a pipeline continuation
// ---------------------------------------------------------------------------
describe('skip_reason active template', () => {
  let content: string;

  beforeAll(() => {
    content = activeContent('skip_reason');
  });

  it('has exactly one active version in TEMPLATE_REGISTRY', () => {
    const activeEntries = TEMPLATE_REGISTRY.filter(
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
