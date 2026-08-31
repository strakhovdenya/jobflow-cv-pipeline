import {
  extractBannedClaimsFromText,
  extractCanonicalNamesFromText,
  extractRulesFromKnowledgeSources,
  isSpecificEnoughClaimFragment,
} from './cv-quality-knowledge-parser';

describe('extractBannedClaimsFromText', () => {
  it('returns empty array for text with no banned sections', () => {
    const text = 'Some text\nWith no special sections\n- bullet';
    expect(extractBannedClaimsFromText(text)).toEqual([]);
  });

  it('extracts bullets after "Do not claim:" header', () => {
    const text = [
      '### Safety rules',
      '',
      'Do not claim:',
      '',
      '- ML/MLOps/model training',
      '- implemented Redis/BullMQ migration until it is actually implemented',
      '- full-time freelance employment unless confirmed',
      '',
      '## Next section',
    ].join('\n');

    const result = extractBannedClaimsFromText(text);
    expect(result).toContain('ML/MLOps/model training');
    expect(result).toContain(
      'implemented Redis/BullMQ migration until it is actually implemented',
    );
    expect(result).toContain('full-time freelance employment unless confirmed');
  });

  it('extracts bullets after "What not to quantify" header', () => {
    const text = [
      '### What not to quantify',
      '',
      '- Exact cost savings.',
      '- Exact ProductsUp business revenue impact.',
      '',
      '## Other',
    ].join('\n');

    const result = extractBannedClaimsFromText(text);
    expect(result).toContain('Exact cost savings.');
    expect(result).toContain('Exact ProductsUp business revenue impact.');
  });

  it('extracts bullets after "What not to overclaim" header', () => {
    const text = [
      '## 23. What not to overclaim',
      '',
      '- Do not say you were the sole architect.',
      '- Do not claim exact failure-rate improvements.',
      '',
    ].join('\n');

    const result = extractBannedClaimsFromText(text);
    expect(result.some((c) => c.includes('sole architect'))).toBe(true);
    expect(result.some((c) => c.includes('failure-rate improvements'))).toBe(
      true,
    );
  });

  it('extracts inline "do not claim X" phrases', () => {
    const text =
      '- Redis/BullMQ queue migration is a future design target only; do not claim implemented Redis/BullMQ unless confirmed later.';

    const result = extractBannedClaimsFromText(text);
    expect(result.some((c) => c.includes('Redis/BullMQ'))).toBe(true);
  });

  it('stops collecting bullets when a new section heading is encountered', () => {
    const text = [
      'Do not claim:',
      '- item one',
      '## New Section',
      '- should not be included',
    ].join('\n');

    const result = extractBannedClaimsFromText(text);
    expect(result).toContain('item one');
    expect(result).not.toContain('should not be included');
  });

  it('deduplicates identical claims from the same text', () => {
    const text = [
      'Do not claim:',
      '- ML/MLOps/model training',
      '',
      'What not to overclaim',
      '- ML/MLOps/model training',
    ].join('\n');

    const result = extractBannedClaimsFromText(text);
    expect(result.filter((c) => c === 'ML/MLOps/model training').length).toBe(
      1,
    );
  });
});

describe('isSpecificEnoughClaimFragment', () => {
  it('accepts multi-word phrases', () => {
    expect(isSpecificEnoughClaimFragment('sole architecture ownership')).toBe(
      true,
    );
  });

  it('accepts single words containing a digit', () => {
    expect(isSpecificEnoughClaimFragment('v2 migration')).toBe(true);
  });

  it('accepts single ALL-CAPS acronym words', () => {
    expect(isSpecificEnoughClaimFragment('MLOps')).toBe(true);
  });

  it('accepts single PascalCase compound words', () => {
    expect(isSpecificEnoughClaimFragment('CommerceTools')).toBe(true);
  });

  it('rejects generic single lowercase English words', () => {
    // Found live against the real knowledge-source corpus: "externally"
    // split out of a longer "do not claim ... enterprise/client adoption
    // externally" sentence and would false-positive on any CV bullet
    // mentioning ordinary external collaboration.
    expect(isSpecificEnoughClaimFragment('externally')).toBe(false);
  });

  it('rejects generic single capitalized English words', () => {
    expect(isSpecificEnoughClaimFragment('Backend')).toBe(false);
  });
});

describe('extractCanonicalNamesFromText', () => {
  it('returns empty array for plain text with no technical tokens', () => {
    expect(
      extractCanonicalNamesFromText('plain text without any tech names'),
    ).toEqual([]);
  });

  it('detects ALL-CAPS acronyms in plain prose (no backticks required)', () => {
    // Real corpus data (ISSUE-282 finding): canonical names like GZIP never
    // actually appear backtick-wrapped in the knowledge base — only in
    // plain prose and markdown tables. A backtick-only extraction strategy
    // would never catch this, which is exactly what happened before this fix.
    const text = 'Generated CSV/GZIP files were usually tens of MB.';
    expect(extractCanonicalNamesFromText(text)).toContain('GZIP');
  });

  it('detects PascalCase compound names in plain prose', () => {
    const text =
      'Integrated CommerceTools product data into ProductsUp enrichment flows using NestJS services.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).toContain('CommerceTools');
    expect(result).toContain('ProductsUp');
    expect(result).toContain('NestJS');
  });

  it('skips purely lowercase words', () => {
    const text = 'node, npm and git are common tools.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).not.toContain('node');
    expect(result).not.toContain('npm');
    expect(result).not.toContain('git');
  });

  it('skips plain capitalized words with no internal case transition and no digits', () => {
    // These have exactly the shape of an ordinary capitalized English word
    // (e.g. a sentence-initial word, a person's name, a contact-field
    // label) — not a technical proper noun. Real-corpus finding: without
    // this exclusion, extraction pulled in the candidate's own first name
    // and contact labels ("Phone", "Email") as spurious "canonical names".
    const text = 'Denis. Phone: some number. Backend developer.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).not.toContain('Denis');
    expect(result).not.toContain('Phone');
    expect(result).not.toContain('Backend');
  });

  it('skips tokens on lines that look like filenames or template placeholders', () => {
    // Real-corpus finding: without this line-level filter, extraction
    // pulled in whole markdown filenames and a SKIP_<Company>_<Role>
    // template placeholder as "canonical names".
    const text = [
      'See Master_CV_RU_v0_6_current_work_sync.md for details.',
      'Use SKIP_<Company>_<Role>_reason_RU.md as the naming template.',
    ].join('\n');
    const result = extractCanonicalNamesFromText(text);
    expect(result).toEqual([]);
  });

  it('skips tokens that start with a digit', () => {
    const text = 'Version 2CoolThing or 2024Report are not tech names.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).not.toContain('2CoolThing');
    expect(result).not.toContain('2024Report');
  });

  it('deduplicates the same name appearing multiple times within one text', () => {
    const text = 'NestJS is great. Later, NestJS is used again.';
    const result = extractCanonicalNamesFromText(text);
    expect(result.filter((n) => n === 'NestJS').length).toBe(1);
  });
});

describe('extractRulesFromKnowledgeSources', () => {
  it('returns empty rules for empty input', () => {
    expect(extractRulesFromKnowledgeSources([])).toEqual({
      bannedClaims: [],
      canonicalNames: [],
    });
  });

  it('merges banned claims from multiple texts', () => {
    const text1 = ['Do not claim:', '- ML/MLOps/model training', ''].join('\n');
    const text2 = 'Do not claim exact revenue figures unless confirmed.';

    const result = extractRulesFromKnowledgeSources([text1, text2]);
    expect(result.bannedClaims).toContain('ML/MLOps/model training');
  });

  it('deduplicates identical banned claims across multiple texts', () => {
    const text1 = 'Do not claim:\n- sole architecture ownership';
    const text2 = 'Do not claim:\n- sole architecture ownership';

    const result = extractRulesFromKnowledgeSources([text1, text2]);
    expect(
      result.bannedClaims.filter((c) => c === 'sole architecture ownership')
        .length,
    ).toBe(1);
  });

  it('excludes a canonical name mentioned fewer than 3 times across the corpus', () => {
    // A single one-off mention (e.g. an internal code identifier or a
    // rarely-referenced term) is not reliable evidence of a real
    // "canonical spelling" convention the CV must follow.
    const text1 = 'The CommerceTools integration was built first.';
    const text2 = 'Some other file mentioning OneOffTerm once.';

    const result = extractRulesFromKnowledgeSources([text1, text2]);
    expect(result.canonicalNames).not.toContain('OneOffTerm');
  });

  it('includes a canonical name mentioned at least 3 times across the corpus', () => {
    const text1 = 'CommerceTools enrichment step one.';
    const text2 = 'CommerceTools enrichment step two.';
    const text3 = 'CommerceTools enrichment step three.';

    const result = extractRulesFromKnowledgeSources([text1, text2, text3]);
    expect(result.canonicalNames).toContain('CommerceTools');
  });

  it('resolves the majority casing when a name appears inconsistently', () => {
    const text1 = 'NestJS backend step one.';
    const text2 = 'NestJS backend step two.';
    const text3 = 'NestJs backend step three (inconsistent casing).';

    const result = extractRulesFromKnowledgeSources([text1, text2, text3]);
    expect(result.canonicalNames).toContain('NestJS');
    expect(result.canonicalNames).not.toContain('NestJs');
  });
});
