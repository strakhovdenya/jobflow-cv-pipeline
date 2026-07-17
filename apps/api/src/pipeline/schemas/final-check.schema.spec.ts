import { FinalCheckOutput, validateFinalCheckJson } from './final-check.schema';

describe('validateFinalCheckJson', () => {
  const validOutput: FinalCheckOutput = {
    schema_version: '1.0',
    workspace_id: 'ws-1',
    final_decision: 'ready_to_send',
    quality_score: 92,
    page_count: 2,
    missing_sections: [],
    formatting_issues: [],
    overclaiming_issues: [],
    broken_links: [],
    warnings: ['Manual visual check still recommended before sending.'],
    final_checklist: {
      pdf_opens: true,
      content_matches_vacancy: true,
      no_unsupported_claims: true,
      contact_info_present: true,
      ready_to_apply: true,
    },
  };

  it('accepts a valid FinalCheckOutput', () => {
    const result = validateFinalCheckJson(JSON.stringify(validOutput));
    expect(result.success).toBe(true);
    expect(result.data!.final_decision).toBe('ready_to_send');
    expect(result.data!.final_checklist.pdf_opens).toBe(true);
  });

  it('accepts each valid final_decision value', () => {
    for (const decision of ['ready_to_send', 'needs_edit', 'do_not_send']) {
      const result = validateFinalCheckJson(
        JSON.stringify({ ...validOutput, final_decision: decision }),
      );
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid JSON', () => {
    const result = validateFinalCheckJson('not json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects a non-object root value', () => {
    const result = validateFinalCheckJson(JSON.stringify(['a', 'b']));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must be an object/);
  });

  it('rejects missing schema_version', () => {
    const { schema_version: _sv, ...rest } = validOutput;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/schema_version/);
  });

  it('rejects missing workspace_id', () => {
    const { workspace_id: _wid, ...rest } = validOutput;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/workspace_id/);
  });

  it('rejects an invalid final_decision value', () => {
    const result = validateFinalCheckJson(
      JSON.stringify({ ...validOutput, final_decision: 'maybe_send' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/final_decision/);
  });

  it('rejects missing quality_score', () => {
    const { quality_score: _qs, ...rest } = validOutput;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quality_score/);
  });

  it('rejects a non-numeric quality_score', () => {
    const result = validateFinalCheckJson(
      JSON.stringify({ ...validOutput, quality_score: 'high' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quality_score/);
  });

  it('rejects missing page_count', () => {
    const { page_count: _pc, ...rest } = validOutput;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/page_count/);
  });

  it.each([
    'missing_sections',
    'formatting_issues',
    'overclaiming_issues',
    'broken_links',
    'warnings',
  ])('rejects missing string array field: %s', (field) => {
    const { [field]: _omit, ...rest } = validOutput as unknown as Record<
      string,
      unknown
    >;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(new RegExp(field));
  });

  it('rejects a string array field containing a non-string element', () => {
    const result = validateFinalCheckJson(
      JSON.stringify({ ...validOutput, warnings: ['ok', 42] }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/warnings/);
  });

  it('rejects missing final_checklist', () => {
    const { final_checklist: _fc, ...rest } = validOutput;
    const result = validateFinalCheckJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/final_checklist/);
  });

  it.each([
    'pdf_opens',
    'content_matches_vacancy',
    'no_unsupported_claims',
    'contact_info_present',
    'ready_to_apply',
  ])('rejects final_checklist missing boolean field: %s', (field) => {
    const checklist = { ...validOutput.final_checklist } as Record<
      string,
      unknown
    >;
    delete checklist[field];
    const result = validateFinalCheckJson(
      JSON.stringify({ ...validOutput, final_checklist: checklist }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(new RegExp(`final_checklist\\.${field}`));
  });

  it('accepts empty string arrays', () => {
    const result = validateFinalCheckJson(
      JSON.stringify({
        ...validOutput,
        missing_sections: [],
        formatting_issues: [],
        overclaiming_issues: [],
        broken_links: [],
        warnings: [],
      }),
    );
    expect(result.success).toBe(true);
  });
});
