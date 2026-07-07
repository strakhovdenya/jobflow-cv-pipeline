import * as fs from 'fs';
import * as path from 'path';

// These are the exact files prisma/seed.ts loads as the active Prompt 1 / Prompt 2
// template content (see prisma/seed.ts readPromptFile()). Testing the files directly
// verifies the content-selection contract without requiring a live database.
const prompt1Content = fs.readFileSync(
  path.join(__dirname, '../../prisma/prompts/prompt1.txt'),
  'utf-8',
);
const prompt2Content = fs.readFileSync(
  path.join(__dirname, '../../prisma/prompts/prompt2.txt'),
  'utf-8',
);

describe('Prompt 1 template content contract', () => {
  it('is non-empty and requires strict JSON-only output', () => {
    expect(prompt1Content.length).toBeGreaterThan(0);
    expect(prompt1Content).toMatch(/Return ONLY one JSON object/i);
  });

  it('requires the exact Prompt1Analysis field names', () => {
    for (const field of [
      '"decision"',
      '"score"',
      '"must_have"',
      '"nice_to_have"',
      '"wishlist"',
      '"hidden_role_logic"',
      '"tech_stack_match"',
      '"language_risk"',
      '"location_risk"',
      '"evidence_risks"',
      '"top_reasons"',
      '"recommended_next_action"',
      '"manual_review_required"',
    ]) {
      expect(prompt1Content).toContain(field);
    }
  });

  it('marks unsupported claims as needs evidence instead of inventing them', () => {
    expect(prompt1Content).toMatch(/needs evidence/i);
    expect(prompt1Content).toMatch(/never invent/i);
  });
});

describe('Prompt 2 template content contract (docs/08_ai_pipeline.md §10.8)', () => {
  it('is non-empty and requires strict JSON-only output', () => {
    expect(prompt2Content.length).toBeGreaterThan(0);
    expect(prompt2Content).toMatch(/Return ONLY one JSON object/i);
  });

  it('1. instructs the AI to decide bullet count and exact bullet wording per vacancy', () => {
    expect(prompt2Content).toMatch(/bullet count and exact bullet wording/i);
  });

  it('2. requires evidence-based bullets only', () => {
    expect(prompt2Content).toMatch(/evidence_source/);
    expect(prompt2Content).toMatch(/Never invent commercial experience/i);
  });

  it('3. requires the current-work block for external CV outputs to close the post-employment gap', () => {
    expect(prompt2Content).toMatch(
      /current_work_block\.include.*must be `true`/i,
    );
    expect(prompt2Content).toMatch(/post-employment timeline gap/i);
  });

  it('4. instructs inclusion of current/personal projects when relevant', () => {
    expect(prompt2Content).toMatch(/SELECTED PROJECTS/);
    expect(prompt2Content).toMatch(/strengthens role fit/i);
  });

  it('5. requires current-work and personal projects to be labeled separately from commercial experience', () => {
    expect(prompt2Content).toMatch(
      /"experience_type": "commercial" \| "personal"/,
    );
    expect(prompt2Content).toMatch(/never as commercial production/i);
  });

  it('6. requires selected projects to carry include/relevance_reason/project_type fields', () => {
    expect(prompt2Content).toMatch(/"project_type"/);
    expect(prompt2Content).toMatch(/"include": boolean/);
    expect(prompt2Content).toMatch(/"relevance_reason"/);
  });

  it('7. requires rendering hints and priorities for sections and bullets', () => {
    expect(prompt2Content).toMatch(/"rendering_hints"/);
    expect(prompt2Content).toMatch(/"priority": "high" \| "medium" \| "low"/);
  });

  it('8. instructs avoiding fixed bullet counts unless explicitly requested', () => {
    expect(prompt2Content).toMatch(/Avoid a fixed bullet count/i);
  });

  it('9. instructs never moving current-work or personal projects into commercial employment history', () => {
    expect(prompt2Content).toMatch(
      /never merged into the Python\/FastAPI bullet/i,
    );
    expect(prompt2Content).toMatch(/dominate over the current-work block/i);
  });

  it('10. instructs marking unsupported claims as needs evidence instead of inventing support', () => {
    expect(prompt2Content).toMatch(/needs evidence/i);
    expect(prompt2Content).toMatch(/needs_evidence/);
  });

  it('states the renderer must not invent, rewrite or reinterpret content', () => {
    expect(prompt2Content).toMatch(
      /renderer must not invent, rewrite or reinterpret/i,
    );
  });

  it('anchors the real employment history so the AI has concrete facts to work from (knowledge source content is not loaded in MVP)', () => {
    expect(prompt2Content).toMatch(/EPAM Systems/);
    expect(prompt2Content).toMatch(/Factor–IT/);
    expect(prompt2Content).toMatch(/CHI Software/);
  });

  it('anchors the real personal projects available for selection', () => {
    expect(prompt2Content).toMatch(/AI Job Assistant/);
    expect(prompt2Content).toMatch(/Email Camp/);
  });

  it('preserves the exact JobFlow current-work bullet detail from the source draft', () => {
    expect(prompt2Content).toMatch(
      /Evidence Guard, prompt versioning, artifact traceability/,
    );
  });

  it('preserves the exact stable_intro wording from the source draft (not the docs example variant)', () => {
    expect(prompt2Content).toMatch(
      /structured upskilling, and local volunteering/,
    );
  });

  it('names knowledge sources with their designated roles', () => {
    expect(prompt2Content).toMatch(
      /Tech_Stack_Matrix_RU_v2_3_current_work_sync\.md/,
    );
    expect(prompt2Content).toMatch(/Master_CV_RU_v0_6_current_work_sync\.md/);
  });
});
