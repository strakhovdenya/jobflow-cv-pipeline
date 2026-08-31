import {
  extractBannedClaimsFromText,
  extractCanonicalNamesFromText,
  extractRulesFromKnowledgeSources,
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

describe('extractCanonicalNamesFromText', () => {
  it('returns empty array when no backtick names present', () => {
    expect(
      extractCanonicalNamesFromText('plain text without backticks'),
    ).toEqual([]);
  });

  it('extracts proper-case backtick-wrapped names', () => {
    const text =
      'Use `GZIP` for output. Also use `CommerceTools` as source of truth. See `BullMQ` for queue.';

    const result = extractCanonicalNamesFromText(text);
    expect(result).toContain('GZIP');
    expect(result).toContain('CommerceTools');
    expect(result).toContain('BullMQ');
  });

  it('skips purely lowercase backtick tokens', () => {
    const text = '`node`, `npm`, `git` are tools.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).not.toContain('node');
    expect(result).not.toContain('npm');
    expect(result).not.toContain('git');
  });

  it('skips names that start with a digit', () => {
    const text = 'Version `v2.3` or `2024-01` are not tech names.';
    const result = extractCanonicalNamesFromText(text);
    expect(result).not.toContain('v2.3');
    expect(result).not.toContain('2024-01');
  });

  it('deduplicates the same name appearing multiple times', () => {
    const text = '`NestJS` and then `NestJS` again.';
    const result = extractCanonicalNamesFromText(text);
    expect(result.filter((n) => n === 'NestJS').length).toBe(1);
  });

  it('accepts mixed-case names with letters and symbols', () => {
    const text = '`TypeScript`, `Node.js`, `Azure/AD`';
    const result = extractCanonicalNamesFromText(text);
    expect(result).toContain('TypeScript');
    expect(result).toContain('Node.js');
  });
});

describe('extractRulesFromKnowledgeSources', () => {
  it('returns empty rules for empty input', () => {
    expect(extractRulesFromKnowledgeSources([])).toEqual({
      bannedClaims: [],
      canonicalNames: [],
    });
  });

  it('merges results from multiple texts', () => {
    const text1 = ['Do not claim:', '- ML/MLOps/model training', ''].join('\n');
    const text2 = 'Use `GZIP` not ZIP. See also `CommerceTools`.';

    const result = extractRulesFromKnowledgeSources([text1, text2]);
    expect(result.bannedClaims).toContain('ML/MLOps/model training');
    expect(result.canonicalNames).toContain('GZIP');
    expect(result.canonicalNames).toContain('CommerceTools');
  });

  it('deduplicates across multiple texts', () => {
    const text1 = 'Do not claim:\n- sole architecture ownership\n\n`GZIP`';
    const text2 = 'Do not claim:\n- sole architecture ownership\n\n`GZIP`';

    const result = extractRulesFromKnowledgeSources([text1, text2]);
    expect(
      result.bannedClaims.filter((c) => c === 'sole architecture ownership')
        .length,
    ).toBe(1);
    expect(result.canonicalNames.filter((n) => n === 'GZIP').length).toBe(1);
  });
});
