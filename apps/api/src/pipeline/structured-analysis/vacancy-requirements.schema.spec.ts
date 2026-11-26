import {
  VACANCY_REQUIREMENTS_ARTIFACT,
  VacancyRequirements,
  checkContractVersion,
  contractMajorOf,
  factApplies,
  isVacancyQuote,
  validateVacancyRequirements,
} from './vacancy-requirements.schema';

const VACANCY = [
  'Backend Engineer, Senior level.',
  'Required:   production experience with',
  '   Node.js and TypeScript.',
  'Nice to have: GraphQL.',
  'Fluent German for client workshops is required.',
  'Equivalent experience is accepted.',
].join('\n');

const valid = (): VacancyRequirements => ({
  contract_version: '1.0',
  seniority: { level: 'senior', quote: 'Senior level' },
  requirements: [
    {
      id: 'R1',
      kind: 'must_have',
      text: 'Node.js and TypeScript',
      quote: 'production experience with Node.js and TypeScript',
    },
    { id: 'R2', kind: 'nice_to_have', text: 'GraphQL', quote: 'GraphQL' },
  ],
  facts: [
    {
      id: 'F1',
      type: 'equivalent_experience_accepted',
      quote: 'Equivalent experience is accepted',
      requirement_ids: ['R1'],
    },
  ],
  languages: [
    {
      id: 'L1',
      language: 'german',
      level: 'fluent',
      need: 'mandatory',
      usage: 'external',
      quote: 'Fluent German for client workshops is required',
    },
  ],
  hidden_role_logic: ['Client-facing integration work'],
});

const errorsOf = (raw: unknown): string[] => {
  const result = validateVacancyRequirements(raw, VACANCY);
  return result.success ? [] : result.errors;
};

describe('01a vacancy requirements contract', () => {
  it('fixes the canonical artifact name', () => {
    expect(VACANCY_REQUIREMENTS_ARTIFACT).toBe('01a_vacancy_requirements.json');
  });

  it('accepts a valid contract', () => {
    const result = validateVacancyRequirements(valid(), VACANCY);
    expect(result).toEqual({ success: true, data: valid() });
  });

  it('rejects a quote that is not a vacancy substring', () => {
    const raw = valid();
    raw.requirements[1].quote = 'GraphQL federation';
    expect(errorsOf(raw)).toEqual([
      'requirement R2: quote is not a substring of the vacancy text',
    ]);

    const fact = valid();
    fact.facts[0].quote = 'Equivalent experience is welcome';
    expect(errorsOf(fact)).toEqual([
      'fact F1: quote is not a substring of the vacancy text',
    ]);

    const empty = valid();
    empty.requirements[0].quote = '   ';
    expect(errorsOf(empty)).toEqual([
      'requirement R1: quote is not a substring of the vacancy text',
    ]);
  });

  it('accepts a quote that differs only in whitespace', () => {
    const raw = valid();
    raw.requirements[0].quote =
      '  production   experience\twith\nNode.js  and TypeScript ';
    expect(errorsOf(raw)).toEqual([]);
    expect(isVacancyQuote('Node.js\n\nand   TypeScript', VACANCY)).toBe(true);
    // Whitespace is the only tolerance: case and punctuation still count.
    expect(isVacancyQuote('node.js and typescript', VACANCY)).toBe(false);
  });

  it('rejects an unknown contract major version', () => {
    for (const version of ['2.0', '0.9']) {
      expect(errorsOf({ ...valid(), contract_version: version })).toEqual([
        `unknown contract major version ${contractMajorOf(version)} (expected 1)`,
      ]);
    }
    for (const version of ['1', 'v1.0', 1, undefined]) {
      expect(errorsOf({ ...valid(), contract_version: version })).toEqual([
        'contract_version must be "<major>.<minor>"',
      ]);
    }
    expect(errorsOf({ ...valid(), contract_version: '1.7' })).toEqual([]);
    expect(checkContractVersion('3.1', 3)).toBeNull();
  });

  it('rejects unknown enum values, duplicate ids and dangling ids', () => {
    const raw = valid() as unknown as Record<string, any>;
    raw.requirements[1].kind = 'mandatory';
    raw.requirements.push({ ...raw.requirements[0] });
    raw.facts[0].type = 'remote_first';
    raw.facts[0].requirement_ids = ['R9'];
    raw.languages[0].usage = 'sometimes';
    raw.seniority = { level: 'principal', quote: 'Senior level' };
    expect(errorsOf(raw)).toEqual([
      'seniority must be an object with a known level',
      'requirement R2: unknown kind mandatory',
      'requirement R1: duplicate id',
      'fact F1: unknown type remote_first',
      'fact F1: unknown requirement id R9',
      'language requirement L1: unknown usage sometimes',
    ]);
  });

  it('rejects malformed lists and items', () => {
    expect(errorsOf(null)).toEqual(['01a must be a JSON object']);
    const raw = valid() as unknown as Record<string, any>;
    raw.requirements = [{ kind: 'must_have' }];
    raw.facts = 'none';
    raw.languages = [{ id: 'L1', language: 'german' }];
    raw.hidden_role_logic = [1];
    expect(errorsOf(raw)).toEqual([
      'requirements[0]: object with a valid id expected',
      'facts must be an array',
      'language requirement L1: unknown level undefined',
      'language requirement L1: unknown need undefined',
      'language requirement L1: unknown usage undefined',
      'language requirement L1: quote must be a string',
      'hidden_role_logic must be a string array',
    ]);
  });

  it('allows a missing seniority quote only for an unspecified level', () => {
    const unspecified = valid();
    unspecified.seniority = { level: 'unspecified', quote: null };
    expect(errorsOf(unspecified)).toEqual([]);
    const missing = valid();
    missing.seniority = { level: 'senior', quote: null };
    expect(errorsOf(missing)).toEqual(['seniority: quote must be a string']);
  });

  it('applies a fact to the requirements it names, or to all when it names none', () => {
    const raw = valid();
    expect(factApplies(raw, 'equivalent_experience_accepted', 'R1')).toBe(true);
    expect(factApplies(raw, 'equivalent_experience_accepted', 'R2')).toBe(
      false,
    );
    expect(factApplies(raw, 'equivalent_experience_accepted', null)).toBe(
      false,
    );
    raw.facts[0].requirement_ids = [];
    expect(factApplies(raw, 'equivalent_experience_accepted', 'R2')).toBe(true);
    expect(factApplies(raw, 'agency_listing', 'R1')).toBe(false);
  });
});
