import {
  CoverLetterOutput,
  validateCoverLetterJson,
} from './cover-letter.schema';

describe('validateCoverLetterJson', () => {
  const validOutput: CoverLetterOutput = {
    schema_version: '1.0',
    step: 'cover_letter_generation',
    document_type: 'cover_letter',
    language: 'en',
    company: 'Amach',
    role: 'Full Stack Developer',
    subject: null,
    cover_letter: {
      greeting: 'Dear Hiring Team,',
      body_paragraphs: [
        'I am applying for the Full Stack Developer role at Amach.',
      ],
      closing: 'Kind regards,\nDenys Strakhov',
    },
    evidence_alignment: [
      {
        vacancy_requirement: 'TypeScript/Node.js fullstack development',
        profile_evidence:
          'Commercial Node.js/TypeScript and React/Next.js contribution at EPAM',
        status: 'supported',
      },
    ],
    risks: [],
    output_files: ['cover_letter.md'],
  };

  it('accepts a valid CoverLetterOutput', () => {
    const result = validateCoverLetterJson(JSON.stringify(validOutput));
    expect(result.success).toBe(true);
    expect(result.data!.cover_letter.greeting).toBe('Dear Hiring Team,');
    expect(result.data!.evidence_alignment[0].status).toBe('supported');
  });

  it('accepts a string subject', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, subject: 'Application for Role' }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = validateCoverLetterJson('not json');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects a non-object root value', () => {
    const result = validateCoverLetterJson(JSON.stringify(['a', 'b']));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must be an object/);
  });

  it.each([
    'schema_version',
    'step',
    'document_type',
    'language',
    'company',
    'role',
  ])('rejects missing string field: %s', (field) => {
    const { [field]: _omit, ...rest } = validOutput as unknown as Record<
      string,
      unknown
    >;
    const result = validateCoverLetterJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(new RegExp(field));
  });

  it('rejects an invalid subject type', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, subject: 42 }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/subject/);
  });

  it('rejects missing cover_letter', () => {
    const { cover_letter: _cl, ...rest } = validOutput;
    const result = validateCoverLetterJson(JSON.stringify(rest));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cover_letter/);
  });

  it('rejects cover_letter missing greeting', () => {
    const { greeting: _g, ...restCl } = validOutput.cover_letter;
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, cover_letter: restCl }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cover_letter\.greeting/);
  });

  it('rejects empty body_paragraphs', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({
        ...validOutput,
        cover_letter: { ...validOutput.cover_letter, body_paragraphs: [] },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/body_paragraphs must not be empty/);
  });

  it('rejects a body_paragraphs entry that is not a string', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({
        ...validOutput,
        cover_letter: {
          ...validOutput.cover_letter,
          body_paragraphs: ['ok', 42],
        },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/body_paragraphs/);
  });

  it('rejects cover_letter missing closing', () => {
    const { closing: _c, ...restCl } = validOutput.cover_letter;
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, cover_letter: restCl }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cover_letter\.closing/);
  });

  it('rejects a non-array evidence_alignment', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, evidence_alignment: 'nope' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/evidence_alignment/);
  });

  it('rejects an evidence_alignment entry missing vacancy_requirement', () => {
    const { vacancy_requirement: _vr, ...restEntry } =
      validOutput.evidence_alignment[0];
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, evidence_alignment: [restEntry] }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(
      /evidence_alignment\[0\]\.vacancy_requirement/,
    );
  });

  it('accepts a null profile_evidence', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({
        ...validOutput,
        evidence_alignment: [
          { ...validOutput.evidence_alignment[0], profile_evidence: null },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects an invalid evidence_alignment status value', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({
        ...validOutput,
        evidence_alignment: [
          { ...validOutput.evidence_alignment[0], status: 'maybe' },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/evidence_alignment\[0\]\.status/);
  });

  it('rejects a non-array risks field', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, risks: 'none' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/risks/);
  });

  it('rejects a non-array output_files field', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, output_files: 'none' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/output_files/);
  });

  it('accepts empty risks array', () => {
    const result = validateCoverLetterJson(
      JSON.stringify({ ...validOutput, risks: [] }),
    );
    expect(result.success).toBe(true);
  });
});
