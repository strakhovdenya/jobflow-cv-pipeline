import {
  CareerRegistryError,
  extractRegistryBlock,
  normalizeRegistryName,
  parseCareerRegistries,
  parseCredentialRegistry,
  parsePortfolioRegistry,
  stripRegistryBlocks,
} from './career-registry.parser';

type Entry = Record<string, unknown>;

const project = (overrides: Entry = {}): Entry => ({
  id: 'alpha-tool',
  title: 'Alpha Tool',
  status: 'active',
  cvEligible: true,
  portfolioPriority: 'primary',
  placement: 'selected_projects',
  evidenceClass: 'personal_verified',
  repositoryUrl: 'https://example.test/alpha-tool',
  lastVerifiedAt: '2026-01-15',
  ...overrides,
});

const credential = (overrides: Entry = {}): Entry => ({
  id: 'sample-badge',
  title: 'Sample Skill Badge',
  issuer: 'Sample Issuer',
  type: 'skill_badge',
  status: 'earned',
  cvEligible: true,
  evidenceClass: 'training_verified',
  issued: '2026-01',
  ...overrides,
});

const fence = (blockType: string, body: string): string =>
  ['```json ' + blockType, body, '```'].join('\n');

const portfolioSource = (projects: Entry[]): string =>
  [
    '# Synthetic project inventory',
    '',
    fence(
      'portfolio-registry',
      JSON.stringify({ schema: 'portfolio-registry/v1', projects }, null, 2),
    ),
    '',
    'Prose after the registry.',
  ].join('\n');

const credentialSource = (credentials: Entry[]): string =>
  fence(
    'credential-registry',
    JSON.stringify({ schema: 'credential-registry/v1', credentials }, null, 2),
  );

const expectRegistryError = (
  action: () => unknown,
  blockType: string,
  reason: RegExp,
): void => {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CareerRegistryError);
  const error = caught as CareerRegistryError;
  expect(error.blockType).toBe(blockType);
  expect(error.message).toContain(blockType);
  expect(error.reason).toMatch(reason);
};

describe('career-registry.parser', () => {
  describe('portfolio-registry', () => {
    it('parses a valid portfolio registry block', () => {
      const registry = parsePortfolioRegistry(
        portfolioSource([
          project({
            aliases: ['alpha-tool'],
            verifiedCommit: 'abc1234',
            deployment: { kind: 'package', url: null },
            roleFamilies: ['backend_node', 'ai_integration'],
            techStack: ['Node.js'],
          }),
          project({
            id: 'beta-service',
            title: 'Beta Service',
            placement: 'current_work_block',
          }),
          project({
            id: 'gamma-archive',
            title: 'Gamma Archive',
            status: 'archived',
            cvEligible: false,
            portfolioPriority: 'none',
            placement: 'none',
            repositoryUrl: null,
          }),
        ]),
      );

      expect(registry.schema).toBe('portfolio-registry/v1');
      expect(registry.projects).toHaveLength(3);
      expect(registry.projects[0]).toEqual({
        id: 'alpha-tool',
        title: 'Alpha Tool',
        aliases: ['alpha-tool'],
        status: 'active',
        cvEligible: true,
        portfolioPriority: 'primary',
        placement: 'selected_projects',
        evidenceClass: 'personal_verified',
        repositoryUrl: 'https://example.test/alpha-tool',
        lastVerifiedAt: '2026-01-15',
        verifiedCommit: 'abc1234',
        deployment: { kind: 'package', url: null },
        roleFamilies: ['backend_node', 'ai_integration'],
        techStack: ['Node.js'],
        allowedWording: [],
        prohibitedClaims: [],
      });
      expect(registry.projects[1].placement).toBe('current_work_block');
      expect(registry.projects[2]).toMatchObject({
        status: 'archived',
        cvEligible: false,
        repositoryUrl: null,
        aliases: [],
        deployment: null,
        verifiedCommit: null,
      });
    });

    it('accepts CRLF line endings around the block', () => {
      const source = portfolioSource([project()]).replace(/\n/g, '\r\n');
      expect(parsePortfolioRegistry(source).projects).toHaveLength(1);
    });

    it('rejects an archived project marked cvEligible', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project({
                status: 'archived',
                cvEligible: true,
                portfolioPriority: 'none',
                placement: 'selected_projects',
              }),
            ]),
          ),
        'portfolio-registry',
        /archived project must have cvEligible: false/,
      );
    });

    it('rejects an archived project with a placement or priority', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project({
                status: 'archived',
                cvEligible: false,
                portfolioPriority: 'primary',
                placement: 'none',
              }),
            ]),
          ),
        'portfolio-registry',
        /archived project/,
      );
    });

    it('rejects a needs_evidence project marked cvEligible', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([project({ evidenceClass: 'needs_evidence' })]),
          ),
        'portfolio-registry',
        /needs_evidence project cannot be cvEligible/,
      );
    });

    it('rejects a cvEligible project without a placement', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([project({ placement: 'none' })]),
          ),
        'portfolio-registry',
        /placement other than none/,
      );
    });

    it('rejects a private single-owner deployment with a URL', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project({
                deployment: {
                  kind: 'private_single_owner',
                  url: 'https://example.test/app',
                },
              }),
            ]),
          ),
        'portfolio-registry',
        /private_single_owner deployment must have url: null/,
      );
    });

    it('rejects two projects placed in the current work block', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project({ placement: 'current_work_block' }),
              project({
                id: 'beta-service',
                title: 'Beta Service',
                placement: 'current_work_block',
              }),
            ]),
          ),
        'portfolio-registry',
        /at most one project/,
      );
    });

    it('rejects a duplicate normalized title or alias', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project(),
              project({ id: 'alpha-copy', title: '  ALPHA   tool ' }),
            ]),
          ),
        'portfolio-registry',
        /duplicate normalized title or alias/,
      );
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([
              project({ aliases: ['Shared Name'] }),
              project({
                id: 'beta-service',
                title: 'Beta Service',
                aliases: ['shared  name'],
              }),
            ]),
          ),
        'portfolio-registry',
        /duplicate normalized title or alias/,
      );
    });

    it('rejects a duplicate id', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            portfolioSource([project(), project({ title: 'Other Title' })]),
          ),
        'portfolio-registry',
        /duplicate id "alpha-tool"/,
      );
    });

    it('rejects a source without a registry block', () => {
      expectRegistryError(
        () => parsePortfolioRegistry('# Inventory\n\nNo registry here.\n'),
        'portfolio-registry',
        /no registry block found/,
      );
    });

    it('rejects two registry blocks of one type', () => {
      const block = portfolioSource([project()]);
      expectRegistryError(
        () => parsePortfolioRegistry(`${block}\n\n${block}`),
        'portfolio-registry',
        /exactly one registry block, found 2/,
      );
    });

    it('rejects an unclosed registry block', () => {
      expectRegistryError(
        () => parsePortfolioRegistry('```json portfolio-registry\n{}\n'),
        'portfolio-registry',
        /not closed/,
      );
    });

    it('rejects malformed JSON in a registry block', () => {
      const trailingComma = fence(
        'portfolio-registry',
        '{ "schema": "portfolio-registry/v1", "projects": [], }',
      );
      expectRegistryError(
        () => parsePortfolioRegistry(trailingComma),
        'portfolio-registry',
        /malformed JSON/,
      );
      const withComment = fence(
        'credential-registry',
        '{ // comment\n "schema": "credential-registry/v1", "credentials": [] }',
      );
      expectRegistryError(
        () => parseCredentialRegistry(withComment),
        'credential-registry',
        /malformed JSON/,
      );
    });

    it('rejects a wrong schema version and unknown fields', () => {
      expectRegistryError(
        () =>
          parsePortfolioRegistry(
            fence(
              'portfolio-registry',
              JSON.stringify({ schema: 'portfolio-registry/v2', projects: [] }),
            ),
          ),
        'portfolio-registry',
        /"schema" must be "portfolio-registry\/v1"/,
      );
      expectRegistryError(
        () => parsePortfolioRegistry(portfolioSource([project({ score: 10 })])),
        'portfolio-registry',
        /unknown field "score"/,
      );
    });

    it.each([
      [
        'a missing title',
        { title: undefined },
        /"title" must be a non-empty string/,
      ],
      ['a non-kebab id', { id: 'Alpha_Tool' }, /"id" must be kebab-case/],
      ['an unknown status', { status: 'paused' }, /"status" must be one of/],
      [
        'a non-boolean cvEligible',
        { cvEligible: 'yes' },
        /"cvEligible" must be a boolean/,
      ],
      [
        'an unknown role family',
        { roleFamilies: ['gaming'] },
        /"roleFamilies" contains "gaming"/,
      ],
      [
        'a non-https repository URL',
        { repositoryUrl: 'http://example.test' },
        /https:\/\/ URL or null/,
      ],
      [
        'a missing repository URL',
        { repositoryUrl: undefined },
        /"repositoryUrl" is required/,
      ],
      [
        'an impossible date',
        { lastVerifiedAt: '2026-02-30' },
        /not a calendar date/,
      ],
      ['a non-string alias', { aliases: [1] }, /"aliases" must be an array/],
    ])('rejects %s', (_label, overrides, reason) => {
      const entry = project(overrides as Entry);
      for (const key of Object.keys(overrides)) {
        if ((overrides as Entry)[key] === undefined) delete entry[key];
      }
      expectRegistryError(
        () => parsePortfolioRegistry(portfolioSource([entry])),
        'portfolio-registry',
        reason,
      );
    });
  });

  describe('credential-registry', () => {
    it('parses a valid credential registry block', () => {
      const registry = parseCredentialRegistry(
        credentialSource([
          credential({
            aliases: ['Sample Badge'],
            credentialId: null,
            verificationUrl: null,
            skills: ['Agents'],
            roleFamilies: ['ai_integration'],
            aiCategory: 'agent_training',
          }),
          credential({
            id: 'sample-lab',
            title: 'Sample Lab',
            type: 'lab',
            status: 'completed',
            cvEligible: false,
          }),
        ]),
      );
      expect(registry.credentials).toHaveLength(2);
      expect(registry.credentials[0]).toEqual({
        id: 'sample-badge',
        title: 'Sample Skill Badge',
        aliases: ['Sample Badge'],
        issuer: 'Sample Issuer',
        type: 'skill_badge',
        status: 'earned',
        cvEligible: true,
        evidenceClass: 'training_verified',
        issued: '2026-01',
        credentialId: null,
        verificationUrl: null,
        skills: ['Agents'],
        roleFamilies: ['ai_integration'],
        aiCategory: 'agent_training',
      });
      expect(registry.credentials[1].aiCategory).toBeNull();
    });

    it('rejects a lab credential marked cvEligible', () => {
      expectRegistryError(
        () =>
          parseCredentialRegistry(
            credentialSource([
              credential({ type: 'lab', status: 'completed' }),
            ]),
          ),
        'credential-registry',
        /lab credential cannot be cvEligible/,
      );
    });

    it.each([
      [
        'a learning path',
        { type: 'learning_path' },
        /learning_path credential/,
      ],
      ['an assessment', { type: 'assessment' }, /assessment credential/],
      [
        'an in-progress credential',
        { status: 'in_progress' },
        /in_progress credential/,
      ],
      [
        'a needs_evidence credential',
        { evidenceClass: 'needs_evidence' },
        /needs_evidence credential/,
      ],
    ])('rejects %s marked cvEligible', (_label, overrides, reason) => {
      expectRegistryError(
        () =>
          parseCredentialRegistry(credentialSource([credential(overrides)])),
        'credential-registry',
        reason,
      );
    });

    it('rejects an invalid issued month and a missing issuer', () => {
      expectRegistryError(
        () =>
          parseCredentialRegistry(
            credentialSource([credential({ issued: '2026-13' })]),
          ),
        'credential-registry',
        /"issued" must be YYYY-MM or null/,
      );
      const withoutIssuer = credential();
      delete withoutIssuer['issuer'];
      expectRegistryError(
        () => parseCredentialRegistry(credentialSource([withoutIssuer])),
        'credential-registry',
        /"issuer" must be a non-empty string/,
      );
    });

    it('rejects a duplicate normalized credential title', () => {
      expectRegistryError(
        () =>
          parseCredentialRegistry(
            credentialSource([
              credential(),
              credential({ id: 'sample-copy', title: 'sample skill badge' }),
            ]),
          ),
        'credential-registry',
        /duplicate normalized title or alias/,
      );
    });
  });

  describe('parseCareerRegistries', () => {
    const sources = [
      { sourceType: 'master_cv', content: '# CV' },
      {
        sourceType: 'project_inventory',
        content: portfolioSource([project()]),
      },
      {
        sourceType: 'certifications',
        content: credentialSource([credential()]),
      },
    ];

    it('parses both registries from the loaded source texts', () => {
      const registries = parseCareerRegistries(sources);
      expect(registries.portfolio.projects[0].id).toBe('alpha-tool');
      expect(registries.credentials.credentials[0].id).toBe('sample-badge');
    });

    it('rejects a missing certifications source', () => {
      expectRegistryError(
        () =>
          parseCareerRegistries(
            sources.filter((source) => source.sourceType !== 'certifications'),
          ),
        'credential-registry',
        /exactly one active "certifications" knowledge source, found 0/,
      );
    });

    it('rejects two active project inventories and unreadable content', () => {
      expectRegistryError(
        () => parseCareerRegistries([...sources, sources[1]]),
        'portfolio-registry',
        /found 2/,
      );
      expectRegistryError(
        () =>
          parseCareerRegistries([
            { sourceType: 'project_inventory', content: null },
            sources[2],
          ]),
        'portfolio-registry',
        /no readable text/,
      );
    });

    it('ignores a registry block of the other type in a source', () => {
      const mixed = `${credentialSource([credential()])}\n\n${portfolioSource([project()])}`;
      expect(extractRegistryBlock(mixed, 'portfolio-registry')).toContain(
        'portfolio-registry/v1',
      );
    });
  });

  describe('stripRegistryBlocks', () => {
    const FENCE = '```';

    it('removes registry blocks and keeps the surrounding text', () => {
      const text = [
        'Intro line',
        `${FENCE}json portfolio-registry`,
        '{ "inside": "portfolio body" }',
        FENCE,
        'Between line',
        `${FENCE}json credential-registry`,
        '{ "inside": "credential body" }',
        FENCE,
        'Outro line',
      ].join('\n');

      const stripped = stripRegistryBlocks(text);

      expect(stripped).toBe('Intro line\nBetween line\nOutro line');
      expect(stripped).not.toContain('json portfolio-registry');
      expect(stripped).not.toContain('json credential-registry');
      expect(stripped).not.toContain('body');
    });

    it('strips a block from CRLF text and a block that ends the text without a line break', () => {
      const text = [
        'Intro line',
        `${FENCE}json portfolio-registry`,
        '{}',
        FENCE,
        'Between line',
        `${FENCE}json credential-registry`,
        '{}',
        FENCE,
      ].join('\r\n');

      expect(stripRegistryBlocks(text)).toBe('Intro line\r\nBetween line\r\n');
    });

    it('rejects an unclosed registry block when stripping registry blocks', () => {
      const text = ['Intro', `${FENCE}json credential-registry`, '{}'].join(
        '\n',
      );

      expectRegistryError(
        () => stripRegistryBlocks(text),
        'credential-registry',
        /not closed/,
      );
    });

    it('returns text without registry blocks unchanged', () => {
      const text = 'First line\r\nSecond line\n\nThird line\n';

      expect(stripRegistryBlocks(text)).toBe(text);
    });

    it('keeps fenced blocks that are not registry blocks', () => {
      const text = [
        'Intro',
        `${FENCE}json`,
        '{ "plain": true }',
        FENCE,
        `${FENCE}json portfolio-registry-draft`,
        '{ "draft": true }',
        FENCE,
        'Outro',
      ].join('\n');

      expect(stripRegistryBlocks(text)).toBe(text);
    });
  });

  describe('normalizeRegistryName', () => {
    it('applies NFKC, lowercase, collapsed whitespace and trim', () => {
      expect(normalizeRegistryName('  Ｆｕｌｌ Width\n\tName ')).toBe(
        'full width name',
      );
    });
  });
});
