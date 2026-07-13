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

  it('rejects invalid JSON', () => {
    const result = validatePrePdfCheckJson('bad json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });
});
