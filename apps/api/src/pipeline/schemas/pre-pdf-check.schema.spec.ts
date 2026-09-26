import { Logger } from '@nestjs/common';
import {
  CORRECTABLE_FIELD_PATH_PATTERN,
  isCorrectableFieldPath,
  validatePrePdfCheckJson,
} from './pre-pdf-check.schema';

describe('validatePrePdfCheckJson', () => {
  const validOutput = {
    schema_version: '1.0',
    workspace_id: 'ws-1',
    readiness: 'ready_with_minor_edits',
    corrections: [
      {
        field_path: 'headline',
        suggested_text: 'Updated headline',
        severity: 'warning',
        reason: 'Better phrasing',
      },
    ],
    quality_score: 85,
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

  it('rejects missing readiness', () => {
    const { readiness: _r, ...rest } = validOutput;
    const result = validatePrePdfCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/readiness/);
  });

  it('rejects invalid readiness value', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({ ...validOutput, readiness: 'sort_of_ready' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/readiness/);
  });

  it('rejects missing export_blocked', () => {
    const { export_blocked: _eb, ...rest } = validOutput;
    const result = validatePrePdfCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/export_blocked/);
  });

  it('accepts a valid quality_score', () => {
    const result = validatePrePdfCheckJson(JSON.stringify(validOutput));
    expect(result.success).toBe(true);
    expect(result.data?.quality_score).toBe(85);
  });

  it('rejects missing quality_score', () => {
    const { quality_score: _qs, ...rest } = validOutput;
    const result = validatePrePdfCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quality_score/i);
  });

  it('rejects non-numeric quality_score', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({ ...validOutput, quality_score: 'excellent' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quality_score/i);
  });

  it('rejects correction item missing suggested_text', () => {
    const bad = {
      ...validOutput,
      corrections: [
        { field_path: 'headline', severity: 'warning', reason: 'r' },
      ],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(bad));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/suggested_text/);
  });

  it('silently drops a correction whose suggested_text is identical to original_text, as if the model found nothing to fix', () => {
    const input = {
      ...validOutput,
      corrections: [
        {
          field_path: 'current_work_block.bullets[1].text',
          original_text: 'Same text.',
          suggested_text: 'Same text.',
          severity: 'warning',
          reason: '[BOP:listed] no-op correction',
        },
      ],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(input));
    expect(result.success).toBe(true);
    expect(result.data!.corrections).toHaveLength(0);
  });

  it('keeps other corrections in the array while dropping only the no-op one', () => {
    const input = {
      ...validOutput,
      corrections: [
        {
          field_path: 'headline',
          original_text: 'Old headline',
          suggested_text: 'New headline',
          severity: 'warning',
          reason: 'r',
        },
        {
          field_path: 'current_work_block.bullets[1].text',
          original_text: 'Same text.',
          suggested_text: 'Same text.',
          severity: 'warning',
          reason: '[BOP:listed] no-op correction',
        },
      ],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(input));
    expect(result.success).toBe(true);
    expect(result.data!.corrections).toHaveLength(1);
    expect(result.data!.corrections[0].field_path).toBe('headline');
  });

  it('accepts a correction with no original_text field', () => {
    const ok = {
      ...validOutput,
      corrections: [
        {
          field_path: 'headline',
          suggested_text: 'Updated headline',
          severity: 'warning',
          reason: 'r',
        },
      ],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(ok));
    expect(result.success).toBe(true);
  });

  it('accepts a correction where original_text differs from suggested_text', () => {
    const ok = {
      ...validOutput,
      corrections: [
        {
          field_path: 'headline',
          original_text: 'Old headline',
          suggested_text: 'Updated headline',
          severity: 'warning',
          reason: 'r',
        },
      ],
    };
    const result = validatePrePdfCheckJson(JSON.stringify(ok));
    expect(result.success).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = validatePrePdfCheckJson('bad json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });
});

describe('correctable field_path grammar (ISSUE-492)', () => {
  it.each([
    'headline',
    'summary[0]',
    'top_skills[12]',
    'certifications[1]',
    'current_work_block.safe_label',
    'current_work_block.role_line',
    'current_work_block.dates',
    'current_work_block.location',
    'current_work_block.stable_intro',
    'current_work_block.bullets[0].text',
    'current_work_block.tech_stack[3]',
    'experience[0].company',
    'experience[2].role',
    'experience[0].dates',
    'experience[1].bullets[4].text',
    'experience[0].tech_stack[0]',
    'selected_projects[0].title',
    'selected_projects[0].safe_label',
    'selected_projects[1].bullets[0].text',
    'selected_projects[0].tech_stack[2]',
  ])('accepts %s', (fieldPath) => {
    expect(isCorrectableFieldPath(fieldPath)).toBe(true);
  });

  it.each([
    '__proto__.x',
    'constructor.prototype.x',
    'summary.__proto__',
    'candidate.name',
    'candidate.contact.email',
    'links[0].url',
    'education[0].degree',
    'languages[0].level',
    'volunteering[0].description',
    'rendering_hints.max_pages',
    'summary',
    'experience[0].bullets',
    'experience[0]',
    'current_work_block.bullets[0]',
    'current_work_block.include',
    'experience[0].experience_type',
    'experience[0].bullets[0].priority',
    'selected_projects[0].include',
    'summary[-1]',
    'summary[0].text',
    'headline ',
    'headline\n',
    '',
  ])('rejects %j', (fieldPath) => {
    expect(isCorrectableFieldPath(fieldPath)).toBe(false);
  });

  it('exports the same grammar as a pattern string for the strict JSON schema', () => {
    const re = new RegExp(CORRECTABLE_FIELD_PATH_PATTERN);
    expect(re.test('experience[0].bullets[1].text')).toBe(true);
    expect(re.test('candidate.name')).toBe(false);
    expect(CORRECTABLE_FIELD_PATH_PATTERN).not.toMatch(/\(\?:|\\d/);
  });
});

describe('validatePrePdfCheckJson — corrections outside the grammar', () => {
  const base = {
    schema_version: '1.0',
    workspace_id: 'ws-1',
    readiness: 'ready_with_minor_edits',
    quality_score: 80,
    export_blocked: false,
    overall_notes: 'notes',
  };
  const correction = (fieldPath: string) => ({
    field_path: fieldPath,
    suggested_text: 'x',
    severity: 'warning',
    reason: 'r',
  });
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('drops the out-of-grammar correction, keeps the valid one and stays successful', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({
        ...base,
        corrections: [correction('headline'), correction('candidate.name')],
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data!.corrections).toHaveLength(1);
    expect(result.data!.corrections[0].field_path).toBe('headline');
    expect(result.rejectedFieldPaths).toEqual(['candidate.name']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('"candidate.name"');
  });

  it('drops prototype paths without polluting Object.prototype', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({
        ...base,
        corrections: [correction('__proto__.x'), correction('summary')],
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data!.corrections).toEqual([]);
    expect(result.rejectedFieldPaths).toEqual(['__proto__.x', 'summary']);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('reports no rejected paths when every correction is in the grammar', () => {
    const result = validatePrePdfCheckJson(
      JSON.stringify({ ...base, corrections: [correction('summary[0]')] }),
    );
    expect(result.rejectedFieldPaths).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
