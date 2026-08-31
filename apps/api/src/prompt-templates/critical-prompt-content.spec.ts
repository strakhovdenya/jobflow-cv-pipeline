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

import { promptTemplates } from '../../prisma/seed';

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
