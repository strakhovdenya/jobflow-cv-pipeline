import {
  validateCvContentJson,
  CvContent,
} from './cv-content.schema';
import { validatePrePdfCheckJson } from './pre-pdf-check.schema';

function rec(v: unknown): Record<string, unknown> {
  return v as Record<string, unknown>;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMinimalCvContent(): CvContent {
  return {
    candidate: {
      name: 'Denys Strakhov',
      contact: { email: 'test@example.com' },
      location: 'Cologne, Germany',
      work_authorization: 'Eligible to work in Germany',
    },
    headline: 'Backend Developer | Node.js | TypeScript',
    summary: ['Experienced backend developer.'],
    top_skills: ['Node.js', 'TypeScript'],
    current_work_block: {
      include: true,
      safe_label: 'Current Independent Work & Portfolio Projects',
      role_line: 'Freelance Software Development & Backend Portfolio Projects',
      dates: 'May 2025 - Present',
      stable_intro: 'Active software development after relocation to Germany.',
      bullets: [{ text: 'Built JobFlow CV Pipeline.', priority: 'high' }],
      tech_stack: ['NestJS', 'TypeScript'],
    },
    experience: [
      {
        company: 'EPAM Systems',
        role: 'Backend Developer',
        dates: 'Nov 2021 - May 2025',
        experience_type: 'commercial',
        can_split_across_pages: true,
        bullets: [{ text: 'Built Node.js services.', priority: 'high' }],
        tech_stack: ['Node.js'],
      },
    ],
    selected_projects: [],
    education: [
      { institution: 'KPI', degree: 'BSc Computer Science', dates: '2014 - 2018' },
    ],
    certifications: [],
    languages: [{ language: 'English', level: 'B2' }],
    links: [],
    volunteering: [],
    rendering_hints: {
      density: 'normal',
      target_pages: 2,
      max_pages: 3,
      strong_match_allows_page_3: false,
      optional_sections_to_hide_first: [],
    },
  };
}

// ─── validateCvContentJson ────────────────────────────────────────────────────

describe('validateCvContentJson', () => {
  it('accepts a valid minimal CvContent', () => {
    const result = validateCvContentJson(
      JSON.stringify(makeMinimalCvContent()),
    );
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.candidate.name).toBe('Denys Strakhov');
  });

  it('accepts empty optional arrays (selected_projects, certifications, links, volunteering)', () => {
    const content = makeMinimalCvContent();
    content.selected_projects = [];
    content.certifications = [];
    content.links = [];
    content.volunteering = [];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = validateCvContentJson('{not json}');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects missing candidate', () => {
    const content = rec(makeMinimalCvContent());
    delete content['candidate'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/candidate/);
  });

  it('rejects missing candidate.name', () => {
    const content = makeMinimalCvContent();
    rec(content.candidate)['name'] = undefined;
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/candidate\.name/);
  });

  it('rejects missing candidate.work_authorization', () => {
    const content = makeMinimalCvContent();
    rec(content.candidate)['work_authorization'] = undefined;
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/work_authorization/);
  });

  it('rejects missing headline', () => {
    const content = rec(makeMinimalCvContent());
    delete content['headline'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/headline/);
  });

  it('rejects missing current_work_block', () => {
    const content = rec(makeMinimalCvContent());
    delete content['current_work_block'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/current_work_block/);
  });

  it('rejects current_work_block missing include field', () => {
    const content = makeMinimalCvContent();
    rec(content.current_work_block)['include'] = undefined;
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/current_work_block\.include/);
  });

  it('rejects current_work_block missing stable_intro', () => {
    const content = makeMinimalCvContent();
    rec(content.current_work_block)['stable_intro'] = undefined;
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stable_intro/);
  });

  it('rejects missing experience array', () => {
    const content = rec(makeMinimalCvContent());
    delete content['experience'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/experience/);
  });

  it('rejects missing education array', () => {
    const content = rec(makeMinimalCvContent());
    delete content['education'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/education/);
  });

  it('rejects missing languages array', () => {
    const content = rec(makeMinimalCvContent());
    delete content['languages'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/languages/);
  });

  it('rejects missing rendering_hints', () => {
    const content = rec(makeMinimalCvContent());
    delete content['rendering_hints'];
    const result = validateCvContentJson(JSON.stringify(content));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/rendering_hints/);
  });
});

// ─── validatePrePdfCheckJson ──────────────────────────────────────────────────

describe('validatePrePdfCheckJson', () => {
  const validOutput = {
    schema_version: '1.0',
    workspace_id: 'ws-1',
    corrections: [
      {
        field_path: 'headline',
        suggested_text: 'Updated headline',
        severity: 'warning',
        reason: 'Better phrasing',
      },
    ],
    export_blocked: false,
    overall_notes: 'Minor improvements suggested.',
  };

  it('accepts a valid PrePdfCheckOutput', () => {
    const result = validatePrePdfCheckJson(JSON.stringify(validOutput));
    expect(result.success).toBe(true);
    expect(result.data!.corrections).toHaveLength(1);
    expect(result.data!.corrections[0].field_path).toBe('headline');
  });

  it('accepts empty corrections array', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({ ...validOutput, corrections: [] }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects missing schema_version', () => {
    const { schema_version: _sv, ...rest } = validOutput;
    const result = validatePrePdfCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/schema_version/);
  });

  it('rejects missing export_blocked', () => {
    const { export_blocked: _eb, ...rest } = validOutput;
    const result = validatePrePdfCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/export_blocked/);
  });

  it('rejects correction item missing suggested_text', () => {
    const bad = {
      ...validOutput,
      corrections: [{ field_path: 'headline', severity: 'warning', reason: 'r' }],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/suggested_text/);
  });

  it('rejects invalid JSON', () => {
    const result = validatePrePdfCheckJson('bad json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });
});
