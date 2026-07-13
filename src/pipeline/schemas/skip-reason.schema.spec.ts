import { validateSkipReasonJson } from './skip-reason.schema';

describe('validateSkipReasonJson', () => {
  const validOutput = {
    schema_version: '1.0',
    step: 'skip_reason',
    decision: 'skip',
    score: 35,
    company: 'Fake Company',
    role: 'Backend Developer',
    location_remote: 'remote, Germany preferred',
    core_stack: ['Node.js', 'TypeScript', 'Kafka', 'Kubernetes'],
    main_skip_reason:
      'Production Kafka and Kubernetes are must-haves with no supporting evidence.',
    key_mismatches: [
      'Kafka: needs evidence.',
      'Kubernetes: basic exposure only.',
    ],
    evidence_from_profile: [
      'Strong commercial Node.js/TypeScript backend experience.',
    ],
    risks_if_applying_anyway: [
      'CV would need to overemphasise personal project exposure as production experience.',
    ],
    useful_keywords_to_track_later: ['Kafka', 'Kubernetes'],
    future_reconsideration_condition:
      'Consider if Kafka/Kubernetes become nice-to-have instead of must-have.',
  };

  it('accepts a valid SkipReasonAnalysis', () => {
    const result = validateSkipReasonJson(JSON.stringify(validOutput));
    expect(result.success).toBe(true);
    expect(result.data!.company).toBe('Fake Company');
    expect(result.data!.core_stack).toContain('Kafka');
  });

  it('rejects invalid JSON', () => {
    const result = validateSkipReasonJson('not json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/);
  });

  it('rejects a non-object root value', () => {
    const result = validateSkipReasonJson(JSON.stringify(['a', 'b']));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must be an object/);
  });

  it.each([
    'schema_version',
    'step',
    'company',
    'role',
    'location_remote',
    'main_skip_reason',
    'future_reconsideration_condition',
  ])('rejects missing string field: %s', (field) => {
    const { [field]: _omit, ...rest } = validOutput as Record<string, unknown>;
    const result = validateSkipReasonJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(new RegExp(field));
  });

  it('rejects decision values other than "skip"', () => {
    const result = validateSkipReasonJson(
      JSON.stringify({ ...validOutput, decision: 'apply' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/decision/);
  });

  it('rejects missing score', () => {
    const { score: _score, ...rest } = validOutput;
    const result = validateSkipReasonJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/score/);
  });

  it('rejects a non-integer score', () => {
    const result = validateSkipReasonJson(
      JSON.stringify({ ...validOutput, score: 35.5 }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/score/);
  });

  it.each([
    'core_stack',
    'key_mismatches',
    'evidence_from_profile',
    'risks_if_applying_anyway',
    'useful_keywords_to_track_later',
  ])('rejects missing string array field: %s', (field) => {
    const { [field]: _omit, ...rest } = validOutput as Record<string, unknown>;
    const result = validateSkipReasonJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(new RegExp(field));
  });

  it('rejects a string array field containing a non-string element', () => {
    const result = validateSkipReasonJson(
      JSON.stringify({ ...validOutput, core_stack: ['Node.js', 42] }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/core_stack/);
  });

  it('accepts empty string arrays', () => {
    const result = validateSkipReasonJson(
      JSON.stringify({
        ...validOutput,
        core_stack: [],
        key_mismatches: [],
        evidence_from_profile: [],
        risks_if_applying_anyway: [],
        useful_keywords_to_track_later: [],
      }),
    );
    expect(result.success).toBe(true);
  });
});
