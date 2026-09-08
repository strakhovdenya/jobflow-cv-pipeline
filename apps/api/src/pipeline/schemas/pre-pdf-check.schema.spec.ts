import { validatePrePdfCheckJson } from './pre-pdf-check.schema';

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
