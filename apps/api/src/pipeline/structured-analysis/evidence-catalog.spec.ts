import {
  Credential,
  CredentialStatus,
  CredentialType,
  PortfolioProject,
} from '../../evidence/career-registry.parser';
import {
  EvidenceCatalog,
  buildEvidenceCatalog,
  parseEvidenceReference,
  resolveEvidenceReference,
} from './evidence-catalog';

const SNAPSHOT = 'snapshot-a';

const project = (
  id: string,
  title: string,
  overrides: Partial<PortfolioProject> = {},
): PortfolioProject => ({
  id,
  title,
  aliases: [],
  status: 'active',
  cvEligible: true,
  portfolioPriority: 'primary',
  placement: 'selected_projects',
  evidenceClass: 'personal_verified',
  repositoryUrl: null,
  lastVerifiedAt: '2026-01-01',
  verifiedCommit: null,
  deployment: null,
  roleFamilies: ['backend_node'],
  techStack: [],
  allowedWording: [],
  prohibitedClaims: [],
  ...overrides,
});

const credential = (
  id: string,
  type: CredentialType,
  status: CredentialStatus,
  cvEligible: boolean,
): Credential => ({
  id,
  title: id,
  aliases: [],
  issuer: 'Example Issuer',
  type,
  status,
  cvEligible,
  evidenceClass: 'training_verified',
  issued: null,
  credentialId: null,
  verificationUrl: null,
  skills: [],
  roleFamilies: [],
  aiCategory: null,
});

const CAREER_CASES = [
  '# Sample file',
  'Intro text.',
  '# Case P1 — Alpha Service',
  '## Short summary',
  'Text.',
  '## Verified facts (file / commit)',
  '',
  '| Fact | Where |',
  '|---|---|',
  '| First fact | file-a |',
  '| Second fact | file-b |',
  '| Third fact | file-c |',
  '',
  '## Safe wording',
  '| Not a fact table | x |',
  '# Case P2 — Beta Tool',
  '## Short summary',
  'No facts table here.',
  '# Case P3 — Unlisted Portfolio Item',
  '## Verified facts',
  '| Fact | Where |',
  '|---|---|',
  '| Fact | file |',
  '# Case 1 — Example commercial integration',
  '## 1. Case status',
  '## 2. Context',
  '### 2.1 Detail',
  '## 3. Result',
  '# Case 11 — Gamma Archive (secondary, not CV eligible)',
  '## 1. Case status',
  '# Cross-case notes',
  '## 9. Not a case section',
].join('\n');

const buildFixtureCatalog = (): EvidenceCatalog =>
  buildEvidenceCatalog({
    snapshotId: SNAPSHOT,
    careerCasesText: CAREER_CASES,
    projects: [
      project('alpha-service', 'Alpha Service', {
        allowedWording: ['First wording', 'Second wording'],
      }),
      project('beta-tool', 'Beta Tool Project', { aliases: ['Beta Tool'] }),
      project('gamma-archive', 'Gamma Archive', {
        status: 'archived',
        cvEligible: false,
        allowedWording: ['Old wording'],
      }),
      project('delta-draft', 'Delta Draft', {
        cvEligible: false,
        evidenceClass: 'needs_evidence',
      }),
    ],
    credentials: [
      credential('badge-one', 'skill_badge', 'earned', true),
      credential('lab-one', 'lab', 'completed', false),
      credential('course-one', 'course_completion', 'completed', false),
      credential('course-two', 'course_completion', 'in_progress', false),
      credential('path-one', 'learning_path', 'completed', false),
      credential('assessment-one', 'assessment', 'completed', false),
    ],
  });

const keysOf = (catalog: EvidenceCatalog, container: string): string[] =>
  [...catalog.entries.values()]
    .filter((entry) => entry.container === container)
    .map((entry) => entry.key);

const entryOf = (catalog: EvidenceCatalog, key: string) => {
  const entry = catalog.entries.get(key);
  if (!entry) throw new Error(`no catalog entry ${key}`);
  return entry;
};

describe('evidence catalog (ADR-046 item 7)', () => {
  it('derives item keys from verified facts rows and allowed wording', () => {
    const catalog = buildFixtureCatalog();
    expect(keysOf(catalog, 'project:alpha-service')).toEqual([
      'project:alpha-service',
      'project:alpha-service#wording-1',
      'project:alpha-service#wording-2',
      'project:alpha-service#fact-1',
      'project:alpha-service#fact-2',
      'project:alpha-service#fact-3',
    ]);
    // Commercial and other career cases: case level plus numbered sections only.
    expect(keysOf(catalog, 'case:1')).toEqual([
      'case:1',
      'case:1#section-1',
      'case:1#section-2',
      'case:1#section-3',
    ]);
    expect(catalog.snapshotId).toBe(SNAPSHOT);
    for (const key of [
      'project:alpha-service#fact-2',
      'project:alpha-service#wording-1',
      'case:1#section-3',
    ]) {
      expect(resolveEvidenceReference(catalog, key, SNAPSHOT)).toEqual({
        resolved: true,
        entry: entryOf(catalog, key),
      });
    }
    // A heading that is not a case never yields keys, and a case outside the
    // registry with the portfolio prefix is not evidence.
    expect(catalog.entries.has('case:1#section-9')).toBe(false);
    expect(
      [...catalog.entries.keys()].some((key) => key.includes('unlisted')),
    ).toBe(false);
    expect(catalog.entries.has('case:p3')).toBe(false);
  });

  it('records provenance only where the source structure fixes it', () => {
    const catalog = buildFixtureCatalog();
    expect(entryOf(catalog, 'project:alpha-service#fact-1').provenance).toBe(
      'personal',
    );
    expect(entryOf(catalog, 'credential:badge-one').provenance).toBe(
      'training',
    );
    expect(entryOf(catalog, 'case:1#section-2').provenance).toBeNull();
  });

  it('marks non-eligible entries as not displayable', () => {
    const catalog = buildFixtureCatalog();
    const flags = (key: string) => {
      const entry = entryOf(catalog, key);
      return {
        key,
        assessable: entry.assessable,
        displayable: entry.displayable,
        provenance: entry.provenance,
      };
    };
    expect(
      [
        'credential:lab-one',
        'credential:course-one',
        'project:gamma-archive',
        'project:gamma-archive#wording-1',
        'project:delta-draft',
        'credential:course-two',
        'credential:path-one',
        'credential:assessment-one',
        'credential:badge-one',
        'project:alpha-service#fact-1',
      ].map(flags),
    ).toEqual([
      // a completed non-eligible credential still supports a requirement as training
      {
        key: 'credential:lab-one',
        assessable: true,
        displayable: false,
        provenance: 'training',
      },
      {
        key: 'credential:course-one',
        assessable: true,
        displayable: false,
        provenance: 'training',
      },
      // a non-eligible project (archived, or still needing evidence) supports nothing
      {
        key: 'project:gamma-archive',
        assessable: false,
        displayable: false,
        provenance: 'personal',
      },
      {
        key: 'project:gamma-archive#wording-1',
        assessable: false,
        displayable: false,
        provenance: 'personal',
      },
      {
        key: 'project:delta-draft',
        assessable: false,
        displayable: false,
        provenance: 'personal',
      },
      // an in-progress item, a learning path and an assessment support nothing
      {
        key: 'credential:course-two',
        assessable: false,
        displayable: false,
        provenance: 'training',
      },
      {
        key: 'credential:path-one',
        assessable: false,
        displayable: false,
        provenance: 'training',
      },
      {
        key: 'credential:assessment-one',
        assessable: false,
        displayable: false,
        provenance: 'training',
      },
      // eligible entries are displayable
      {
        key: 'credential:badge-one',
        assessable: true,
        displayable: true,
        provenance: 'training',
      },
      {
        key: 'project:alpha-service#fact-1',
        assessable: true,
        displayable: true,
        provenance: 'personal',
      },
    ]);
    // A case resolved to a non-eligible registry entry takes the entry's flags.
    expect(keysOf(catalog, 'project:gamma-archive')).toEqual([
      'project:gamma-archive',
      'project:gamma-archive#wording-1',
    ]);
    expect(catalog.entries.has('case:11')).toBe(false);
  });

  it('rejects an item key without its snapshot', () => {
    const catalog = buildFixtureCatalog();
    const key = 'project:alpha-service#fact-1';
    for (const missing of [null, undefined, '']) {
      const resolution = resolveEvidenceReference(catalog, key, missing);
      expect(resolution).toEqual({
        resolved: false,
        reason: `reference ${key} has no snapshot id`,
      });
    }
    expect(resolveEvidenceReference(catalog, key, 'snapshot-b')).toEqual({
      resolved: false,
      reason: `reference ${key} is recorded for snapshot snapshot-b, not ${SNAPSHOT}`,
    });
    expect(
      resolveEvidenceReference(
        catalog,
        'project:alpha-service#fact-9',
        SNAPSHOT,
      ).resolved,
    ).toBe(false);
  });

  it('falls back to a case-level key without a facts table', () => {
    const catalog = buildFixtureCatalog();
    // The case resolves to its registry entry through an alias and has no facts table.
    expect(keysOf(catalog, 'project:beta-tool')).toEqual(['project:beta-tool']);
    const withoutCases = buildEvidenceCatalog({
      snapshotId: SNAPSHOT,
      careerCasesText: '',
      projects: [project('beta-tool', 'Beta Tool')],
      credentials: [],
    });
    expect([...withoutCases.entries.keys()]).toEqual(['project:beta-tool']);

    // A numbered case that resolves to a registry entry is processed as that entry:
    // without a facts table it adds nothing beyond the case level and throws nothing.
    const resolved = () =>
      buildEvidenceCatalog({
        snapshotId: SNAPSHOT,
        careerCasesText: '# Case 5 — Beta Tool\n## 1. Context\n## 2. Result\n',
        projects: [
          project('beta-tool', 'Beta Tool Project', { aliases: ['Beta Tool'] }),
        ],
        credentials: [],
      });
    expect(resolved).not.toThrow();
    expect([...resolved().entries.keys()]).toEqual(['project:beta-tool']);

    // The same case without a registry match keeps its own case and section keys,
    // which shows the empty result above comes from the resolution.
    const unresolved = buildEvidenceCatalog({
      snapshotId: SNAPSHOT,
      careerCasesText: '# Case 5 — Beta Tool\n## 1. Context\n## 2. Result\n',
      projects: [],
      credentials: [],
    });
    expect([...unresolved.entries.keys()]).toEqual([
      'case:5',
      'case:5#section-1',
      'case:5#section-2',
    ]);
  });

  it('parses the reference grammar', () => {
    expect(parseEvidenceReference('project:alpha-service#fact-2')).toEqual({
      kind: 'project',
      container: 'alpha-service',
      item: 'fact-2',
    });
    expect(parseEvidenceReference('case:1')).toEqual({
      kind: 'case',
      container: '1',
      item: null,
    });
    for (const invalid of [
      'alpha-service',
      'repository:alpha',
      'project:Alpha',
      'project:alpha#',
      'manual_note:1',
    ]) {
      expect({ invalid, parsed: parseEvidenceReference(invalid) }).toEqual({
        invalid,
        parsed: null,
      });
    }
  });

  it('numbers the facts of two cases of one project without collisions', () => {
    const catalog = buildEvidenceCatalog({
      snapshotId: SNAPSHOT,
      careerCasesText: [
        '# Case P1 — Alpha Service',
        '## Verified facts',
        '| Fact | Where |',
        '|---|---|',
        '| One | a |',
        '# Case P2 — Alpha Service',
        '## Verified facts',
        '| Fact | Where |',
        '|---|---|',
        '| Two | b |',
      ].join('\n'),
      projects: [project('alpha-service', 'Alpha Service')],
      credentials: [],
    });
    expect(keysOf(catalog, 'project:alpha-service')).toEqual([
      'project:alpha-service',
      'project:alpha-service#fact-1',
      'project:alpha-service#fact-2',
    ]);
  });
});
