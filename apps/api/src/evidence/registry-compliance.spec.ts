import type { CvContent } from '../pipeline/schemas/cv-content.schema';
import type { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import type { CareerRegistries } from './career-registry.parser';
import {
  MAX_SELECTED_CREDENTIALS,
  REGISTRY_SNAPSHOT_SCHEMA,
  RegistryCheckInput,
  RegistrySnapshot,
  buildRegistrySnapshot,
  containsRegistryName,
  credentialIdentity,
  findCredentialSelectionFindings,
  findRegistryViolations,
  findSnapshotCredential,
  findUnregisteredInclusions,
  formatCredentialSelectionFinding,
  formatRegistryViolation,
  parseRegistrySnapshot,
  registryInputFromCvContent,
  registryInputFromPrompt2,
} from './registry-compliance';

const ARCHIVED_TITLE = 'Gamma Archive';
const ARCHIVED_ALIAS = 'gamma-legacy';

function makeRegistries(): CareerRegistries {
  const baseProject = {
    aliases: [] as string[],
    status: 'active' as const,
    cvEligible: true,
    portfolioPriority: 'primary' as const,
    placement: 'selected_projects' as const,
    evidenceClass: 'personal_verified' as const,
    repositoryUrl: null,
    lastVerifiedAt: '2026-01-15',
    verifiedCommit: null,
    deployment: null,
    roleFamilies: [],
    techStack: [],
    allowedWording: [],
    prohibitedClaims: [],
  };
  const baseCredential = {
    aliases: [] as string[],
    issuer: 'Sample Issuer',
    type: 'skill_badge' as const,
    status: 'earned' as const,
    cvEligible: true,
    evidenceClass: 'training_verified' as const,
    issued: '2026-01',
    credentialId: null,
    verificationUrl: null,
    skills: [],
    roleFamilies: [],
    aiCategory: null,
  };
  return {
    portfolio: {
      schema: 'portfolio-registry/v1',
      projects: [
        {
          ...baseProject,
          id: 'alpha-tool',
          title: 'Alpha Tool',
          aliases: ['alpha-kit'],
        },
        {
          ...baseProject,
          id: 'beta-service',
          title: 'Beta Service',
          placement: 'current_work_block',
        },
        {
          ...baseProject,
          id: 'gamma-archive',
          title: ARCHIVED_TITLE,
          aliases: [ARCHIVED_ALIAS],
          status: 'archived',
          cvEligible: false,
          portfolioPriority: 'none',
          placement: 'none',
        },
        {
          ...baseProject,
          id: 'delta-draft',
          title: 'Delta Draft',
          cvEligible: false,
          portfolioPriority: 'secondary',
          placement: 'none',
          evidenceClass: 'needs_evidence',
        },
      ],
    },
    credentials: {
      schema: 'credential-registry/v1',
      credentials: [
        {
          ...baseCredential,
          id: 'sample-badge',
          title: 'Sample Skill Badge',
          aliases: ['Sample Badge'],
        },
        {
          ...baseCredential,
          id: 'sample-lab',
          title: 'Sample Lab',
          type: 'lab',
          status: 'completed',
          cvEligible: false,
        },
      ],
    },
  };
}

function makeInput(
  overrides: Partial<RegistryCheckInput> = {},
): RegistryCheckInput {
  return {
    publicTexts: [{ fieldPath: 'summary[0]', text: 'Backend developer.' }],
    includedProjects: [],
    includedCredentials: [],
    ...overrides,
  };
}

function makeCvContent(): CvContent {
  const bullet = (text: string) => ({ text, priority: 'high' as const });
  return {
    candidate: {
      name: 'Static Candidate',
      contact: {},
      location: 'Somewhere',
      work_authorization: 'Authorized',
    },
    headline: 'Backend Developer',
    summary: ['Summary sentence.'],
    top_skills: ['Node.js'],
    current_work_block: {
      include: true,
      safe_label: 'Current Work',
      role_line: 'Independent Work',
      dates: '2025 - Present',
      location: 'City',
      stable_intro: 'Intro.',
      bullets: [bullet('Built Beta Service.')],
      tech_stack: ['TypeScript'],
    },
    experience: [
      {
        company: 'Sample Corp',
        role: 'Developer',
        dates: '2020 - 2024',
        experience_type: 'commercial',
        can_split_across_pages: true,
        bullets: [bullet('Built APIs.')],
        tech_stack: ['Node.js'],
      },
    ],
    selected_projects: [
      {
        title: 'Alpha Tool',
        project_type: 'personal_project',
        include: true,
        safe_label: 'Personal Project',
        relevance_reason: 'Relevant.',
        display_priority: 'high',
        bullets: [bullet('Built Alpha Tool.')],
        tech_stack: ['Node.js'],
      },
      {
        title: ARCHIVED_TITLE,
        project_type: 'personal_project',
        include: false,
        safe_label: 'Personal Project',
        relevance_reason: 'Hidden.',
        display_priority: 'low',
        bullets: [bullet(`Built ${ARCHIVED_TITLE}.`)],
        tech_stack: [],
      },
    ],
    education: [],
    certifications: [
      { name: 'Sample Skill Badge', priority: 'medium', source_index: 2 },
    ],
    languages: [],
    links: [],
    volunteering: [],
    rendering_hints: {
      density: 'normal',
      target_pages: 2,
      max_pages: 3,
      strong_match_allows_page_3: false,
      optional_sections_to_hide_first: [],
    },
  };
}

describe('registry-compliance', () => {
  const registries = makeRegistries();
  const snapshot = buildRegistrySnapshot(registries);

  describe('buildRegistrySnapshot', () => {
    it('keeps the fields the rules need and the accepted forced names', () => {
      const withForced = buildRegistrySnapshot(registries, {
        projects: ['Side Project'],
        credentials: ['Local Course'],
      });
      expect(withForced.schema).toBe(REGISTRY_SNAPSHOT_SCHEMA);
      expect(withForced.projects).toContainEqual({
        title: ARCHIVED_TITLE,
        aliases: [ARCHIVED_ALIAS],
        status: 'archived',
        cvEligible: false,
        placement: 'none',
      });
      expect(withForced.credentials).toContainEqual({
        title: 'Sample Lab',
        aliases: [],
        type: 'lab',
        status: 'completed',
        cvEligible: false,
        issuer: 'Sample Issuer',
        issued: '2026-01',
      });
      expect(withForced.acceptedForced).toEqual({
        projects: ['Side Project'],
        credentials: ['Local Course'],
      });
      expect(snapshot.acceptedForced).toEqual({
        projects: [],
        credentials: [],
      });
    });

    it('builds a registry-snapshot/v2 with credential issuer and issue date', () => {
      expect(snapshot.schema).toBe('registry-snapshot/v2');
      expect(snapshot.credentials).toContainEqual({
        title: 'Sample Skill Badge',
        aliases: ['Sample Badge'],
        type: 'skill_badge',
        status: 'earned',
        cvEligible: true,
        issuer: 'Sample Issuer',
        issued: '2026-01',
      });
      for (const credential of snapshot.credentials) {
        expect(credential.issuer).toBe('Sample Issuer');
        expect(credential.issued).toBe('2026-01');
      }
    });

    it('keeps a null issue date in a registry-snapshot/v2 credential', () => {
      const undated = makeRegistries();
      undated.credentials.credentials[0] = {
        ...undated.credentials.credentials[0],
        issuer: 'Undated Issuer',
        issued: null,
      };
      const built = buildRegistrySnapshot(undated);
      expect(built.schema).toBe('registry-snapshot/v2');
      expect(built.credentials[0]).toMatchObject({
        title: 'Sample Skill Badge',
        issuer: 'Undated Issuer',
        issued: null,
      });
      const stored = JSON.parse(JSON.stringify(built)) as unknown;
      expect(parseRegistrySnapshot(stored)?.credentials[0].issued).toBeNull();
    });
  });

  describe('findSnapshotCredential', () => {
    it('finds a snapshot credential by normalized title or alias', () => {
      expect(findSnapshotCredential(snapshot, 'Sample Skill Badge')).toEqual(
        expect.objectContaining({ title: 'Sample Skill Badge' }),
      );
      expect(findSnapshotCredential(snapshot, '  sample   SKILL badge ')).toBe(
        findSnapshotCredential(snapshot, 'Sample Skill Badge'),
      );
      expect(findSnapshotCredential(snapshot, 'sample badge')?.title).toBe(
        'Sample Skill Badge',
      );
      expect(findSnapshotCredential(snapshot, 'Sample Lab')?.cvEligible).toBe(
        false,
      );
    });

    it('finds no snapshot credential for a name that matches no title or alias', () => {
      expect(findSnapshotCredential(snapshot, 'Unlisted Course')).toBe(
        undefined,
      );
      expect(findSnapshotCredential(snapshot, 'Sample Skill')).toBe(undefined);
    });
  });

  describe('findRegistryViolations', () => {
    it('reports an archived name with its field path', () => {
      const violations = findRegistryViolations(
        makeInput({
          publicTexts: [
            {
              fieldPath: 'summary[1]',
              text: `Maintained the ${ARCHIVED_TITLE.toUpperCase()} app.`,
            },
            { fieldPath: 'top_skills[0]', text: `${ARCHIVED_ALIAS} tooling` },
          ],
        }),
        snapshot,
      );
      expect(violations).toEqual([
        {
          fieldPath: 'summary[1]',
          message: `names archived project "${ARCHIVED_TITLE}"`,
        },
        {
          fieldPath: 'top_skills[0]',
          message: `names archived project "${ARCHIVED_TITLE}"`,
        },
      ]);
      expect(formatRegistryViolation(violations[0])).toBe(
        `summary[1]: names archived project "${ARCHIVED_TITLE}"`,
      );
    });

    it('reports a non-archived excluded project named in text but not a credential title', () => {
      const violations = findRegistryViolations(
        makeInput({
          publicTexts: [
            {
              fieldPath: 'summary[0]',
              text: 'Built Delta Draft as a prototype.',
            },
            {
              fieldPath: 'current_work_block.bullets[2].text',
              text: 'Completed Sample Lab exercises on agent tooling.',
            },
            { fieldPath: 'top_skills[0]', text: 'Alpha Tool' },
          ],
        }),
        snapshot,
      );
      expect(violations).toEqual([
        {
          fieldPath: 'summary[0]',
          message: 'names excluded project "Delta Draft" (cvEligible: false)',
        },
      ]);
    });

    it('does not match an archived name inside a longer word', () => {
      const violations = findRegistryViolations(
        makeInput({
          publicTexts: [
            {
              fieldPath: 'summary[0]',
              text: `${ARCHIVED_TITLE}s and ${ARCHIVED_ALIAS}2`,
            },
          ],
        }),
        snapshot,
      );
      expect(violations).toEqual([]);
    });

    it('accepts an included project matching an eligible alias', () => {
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: '  ALPHA-kit ' },
          ],
        }),
        snapshot,
      );
      expect(violations).toEqual([]);
    });

    it('reports an included archived, not-eligible or current-work project', () => {
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: ARCHIVED_TITLE },
            { fieldPath: 'selected_projects[1].title', text: 'Delta Draft' },
            { fieldPath: 'selected_projects[2].title', text: 'Beta Service' },
          ],
        }),
        snapshot,
      );
      expect(violations.map(formatRegistryViolation)).toEqual([
        `selected_projects[0].title: project "${ARCHIVED_TITLE}" is excluded by the portfolio registry (status: archived, cvEligible: false)`,
        'selected_projects[1].title: project "Delta Draft" is excluded by the portfolio registry (status: active, cvEligible: false)',
        'selected_projects[2].title: project "Beta Service" has placement "current_work_block" in the portfolio registry and must not be listed in selected_projects',
      ]);
    });

    it('reports an unregistered name not accepted through the manual note', () => {
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: 'Side Project' },
          ],
          includedCredentials: [
            { fieldPath: 'certifications[3]', text: 'Local Course' },
          ],
        }),
        snapshot,
      );
      expect(violations.map(formatRegistryViolation)).toEqual([
        'selected_projects[0].title: project "Side Project" is not in the portfolio registry and no workspace manual note backs it',
        'certifications[3]: credential "Local Course" is not in the credential registry and no workspace manual note backs it',
      ]);
    });

    it('accepts an unregistered name accepted through the manual note', () => {
      const withForced = buildRegistrySnapshot(registries, {
        projects: ['Side Project'],
        credentials: ['Local Course'],
      });
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: 'side  project' },
          ],
          includedCredentials: [
            { fieldPath: 'certifications[3]', text: 'Local Course' },
          ],
        }),
        withForced,
      );
      expect(violations).toEqual([]);
    });

    it('never lets an accepted forced name lift a registry exclusion', () => {
      const tampered = buildRegistrySnapshot(registries, {
        projects: [ARCHIVED_TITLE],
        credentials: ['Sample Lab'],
      });
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: ARCHIVED_TITLE },
          ],
          includedCredentials: [
            { fieldPath: 'certifications[0]', text: 'Sample Lab' },
          ],
        }),
        tampered,
      );
      expect(violations.map((violation) => violation.fieldPath)).toEqual([
        'selected_projects[0].title',
        'certifications[0]',
      ]);
    });

    it('reports an ineligible credential and accepts an eligible alias', () => {
      const violations = findRegistryViolations(
        makeInput({
          includedCredentials: [
            { fieldPath: 'certifications[0]', text: 'sample badge' },
            { fieldPath: 'certifications[1]', text: 'Sample Lab' },
          ],
        }),
        snapshot,
      );
      expect(violations.map(formatRegistryViolation)).toEqual([
        'certifications[1]: credential "Sample Lab" is not CV-eligible in the credential registry (type: lab, status: completed)',
      ]);
    });

    it('reports an archived project named inside an unregistered project title', () => {
      const violations = findRegistryViolations(
        makeInput({
          includedProjects: [
            {
              fieldPath: 'selected_projects[0].title',
              text: `${ARCHIVED_TITLE} Reloaded`,
            },
          ],
          publicTexts: [
            {
              fieldPath: 'selected_projects[0].title',
              text: `${ARCHIVED_TITLE} Reloaded`,
            },
          ],
        }),
        buildRegistrySnapshot(registries, {
          projects: [`${ARCHIVED_TITLE} Reloaded`],
          credentials: [],
        }),
      );
      expect(violations).toEqual([
        {
          fieldPath: 'selected_projects[0].title',
          message: `names archived project "${ARCHIVED_TITLE}"`,
        },
      ]);
    });
  });

  describe('credential selection findings', () => {
    const COURSES = [
      'Sample Course One',
      'Sample Course Two',
      'Sample Course Three',
      'Sample Course Four',
      'Sample Course Five',
    ];

    // The fixture snapshot plus five eligible courses, so up to seven credentials resolve.
    const wideSnapshot: RegistrySnapshot = {
      ...snapshot,
      credentials: [
        ...snapshot.credentials,
        ...COURSES.map((title) => ({
          title,
          aliases: [],
          type: 'course_completion' as const,
          status: 'completed' as const,
          cvEligible: true,
          issuer: 'Sample Issuer',
          issued: '2026-01',
        })),
      ],
    };

    // A Prompt 2 draft whose only certification rows are the given ones.
    const makeDraft = (
      certifications: { title: string; include: boolean }[],
    ): TargetedCvContentOutput => {
      const content = makeCvContent();
      return {
        cv_content: {
          headline: content.headline,
          summary: content.summary,
          top_skills: content.top_skills,
          current_work_block: content.current_work_block,
          experience: content.experience,
          selected_projects: content.selected_projects,
          certifications: certifications.map((item) => ({
            ...item,
            reason: 'Synthetic reason.',
          })),
          rendering_hints: content.rendering_hints,
        },
      } as unknown as TargetedCvContentOutput;
    };

    const included = (title: string) => ({ title, include: true });
    const excluded = (title: string) => ({ title, include: false });

    const findings = (draft: TargetedCvContentOutput, from = wideSnapshot) =>
      findCredentialSelectionFindings(draft, from).map(
        formatCredentialSelectionFinding,
      );

    it('reports a credential included more than once with both field paths', () => {
      const draft = makeDraft([
        included('Sample Skill Badge'),
        included(COURSES[0]),
        included('sample skill badge '),
      ]);

      expect(findings(draft)).toEqual([
        'certifications[0], certifications[2]: credential "Sample Skill Badge" is included 2 times; the export keeps only the first row',
      ]);
      // A repeated eligible credential is no registry violation.
      expect(
        findRegistryViolations(registryInputFromPrompt2(draft), wideSnapshot),
      ).toEqual([]);
    });

    it('warns when more than five distinct credentials are included', () => {
      const draft = makeDraft([
        included('Sample Skill Badge'),
        ...COURSES.map(included),
      ]);
      const rowsBefore = JSON.stringify(draft.cv_content.certifications);

      expect(findings(draft)).toEqual([
        'certifications: 6 distinct credentials are included, more than 5; none was removed — review the selection',
      ]);
      expect(MAX_SELECTED_CREDENTIALS).toBe(5);
      // No credential is removed from the draft or from what the guard checks.
      expect(JSON.stringify(draft.cv_content.certifications)).toBe(rowsBefore);
      expect(
        registryInputFromPrompt2(draft).includedCredentials.map(
          (field) => field.text,
        ),
      ).toEqual(['Sample Skill Badge', ...COURSES]);
    });

    it('reports a credential both included and excluded', () => {
      const draft = makeDraft([
        included('Sample Badge'),
        excluded(COURSES[0]),
        excluded('Sample Skill Badge'),
      ]);

      expect(findings(draft)).toEqual([
        'certifications[0], certifications[2]: credential "Sample Badge" is both included (certifications[0]) and excluded (certifications[2])',
      ]);
    });

    it('does not report a credential decided once', () => {
      const draft = makeDraft([
        included('Sample Skill Badge'),
        excluded(COURSES[0]),
        included(COURSES[1]),
        included(COURSES[2]),
      ]);

      expect(findings(draft)).toEqual([]);
    });

    it('still reports an ineligible credential that is repeated', () => {
      const draft = makeDraft([
        included('Sample Lab'),
        included('Sample Skill Badge'),
        included('Sample Lab'),
      ]);

      expect(
        findRegistryViolations(registryInputFromPrompt2(draft), snapshot).map(
          formatRegistryViolation,
        ),
      ).toEqual([
        'certifications[0]: credential "Sample Lab" is not CV-eligible in the credential registry (type: lab, status: completed)',
        'certifications[2]: credential "Sample Lab" is not CV-eligible in the credential registry (type: lab, status: completed)',
      ]);
      // The repeat is a warning on top, never a replacement of the violation.
      expect(findings(draft, snapshot)).toEqual([
        'certifications[0], certifications[2]: credential "Sample Lab" is included 2 times; the export keeps only the first row',
      ]);
    });

    it('counts distinct credentials after identity resolution', () => {
      // Nine raw included rows, five distinct credentials (one by title and alias).
      const nineRows = makeDraft([
        included(COURSES[0]),
        included('Sample Skill Badge'),
        included(COURSES[1]),
        included(COURSES[2]),
        included(COURSES[3]),
        included(COURSES[1]),
        included('Sample Badge'),
        included(COURSES[0]),
        included(COURSES[3].toUpperCase()),
      ]);
      const nineRowFindings = findings(nineRows);
      expect(nineRowFindings).toHaveLength(4);
      expect(
        nineRowFindings.filter((finding) =>
          finding.includes('distinct credentials are included'),
        ),
      ).toEqual([]);

      const twoRelevant = makeDraft([
        included('Sample Skill Badge'),
        included(COURSES[0]),
        excluded(COURSES[1]),
      ]);
      expect(findings(twoRelevant)).toEqual([]);
    });

    it('does not report repeated excluded rows', () => {
      const draft = makeDraft([
        excluded(COURSES[0]),
        included('Sample Skill Badge'),
        excluded(COURSES[0]),
        excluded('Sample Lab'),
        excluded('sample lab'),
      ]);

      expect(findings(draft)).toEqual([]);
    });

    it('gives a title and its alias one identity and an unregistered name its own', () => {
      expect(credentialIdentity(snapshot, 'Sample Badge')).toBe(
        credentialIdentity(snapshot, ' sample skill BADGE'),
      );
      expect(credentialIdentity(snapshot, 'Local Course')).toBe(
        credentialIdentity(null, 'local  course'),
      );
      expect(credentialIdentity(snapshot, 'Local Course')).not.toBe(
        credentialIdentity(snapshot, 'Sample Lab'),
      );
      // Without a snapshot a title and its alias are two names.
      expect(credentialIdentity(null, 'Sample Badge')).not.toBe(
        credentialIdentity(null, 'Sample Skill Badge'),
      );
    });

    it('ignores rows without a usable title', () => {
      const draft = makeDraft([included(COURSES[0])]);
      draft.cv_content.certifications.push(
        'not an object',
        { title: 7, include: true },
        { title: '  ', include: true },
        { title: '', include: true },
      );

      expect(findings(draft)).toEqual([]);
    });
  });

  describe('findUnregisteredInclusions', () => {
    it('lists included names that match no registry entry', () => {
      const result = findUnregisteredInclusions(
        makeInput({
          includedProjects: [
            { fieldPath: 'selected_projects[0].title', text: 'Alpha Tool' },
            { fieldPath: 'selected_projects[1].title', text: 'Side Project' },
          ],
          includedCredentials: [
            { fieldPath: 'certifications[0]', text: 'Sample Lab' },
            { fieldPath: 'certifications[1]', text: 'Local Course' },
          ],
        }),
        snapshot,
      );
      expect(result.projects.map((field) => field.text)).toEqual([
        'Side Project',
      ]);
      expect(result.credentials.map((field) => field.text)).toEqual([
        'Local Course',
      ]);
    });
  });

  describe('field extraction', () => {
    it('collects rendered fields of effective content, skipping excluded projects', () => {
      const input = registryInputFromCvContent(makeCvContent());
      const paths = input.publicTexts.map((field) => field.fieldPath);
      expect(paths).toEqual([
        'headline',
        'summary[0]',
        'top_skills[0]',
        'current_work_block.safe_label',
        'current_work_block.role_line',
        'current_work_block.dates',
        'current_work_block.location',
        'current_work_block.stable_intro',
        'current_work_block.bullets[0].text',
        'current_work_block.tech_stack[0]',
        'experience[0].company',
        'experience[0].role',
        'experience[0].dates',
        'experience[0].bullets[0].text',
        'experience[0].tech_stack[0]',
        'selected_projects[0].title',
        'selected_projects[0].safe_label',
        'selected_projects[0].bullets[0].text',
        'selected_projects[0].tech_stack[0]',
        'certifications[2]',
      ]);
      expect(input.includedProjects).toEqual([
        { fieldPath: 'selected_projects[0].title', text: 'Alpha Tool' },
      ]);
      expect(input.includedCredentials).toEqual([
        { fieldPath: 'certifications[2]', text: 'Sample Skill Badge' },
      ]);
      expect(findRegistryViolations(input, snapshot)).toEqual([]);
    });

    it('skips a current work block that is not included', () => {
      const content = makeCvContent();
      content.current_work_block.include = false;
      content.current_work_block.stable_intro = `Mentions ${ARCHIVED_TITLE}.`;
      const input = registryInputFromCvContent(content);
      expect(
        input.publicTexts.some((field) =>
          field.fieldPath.startsWith('current_work_block'),
        ),
      ).toBe(false);
    });

    it('extracts the same paths from a Prompt 2 draft, using the Prompt 2 certification index', () => {
      const content = makeCvContent();
      const draft = {
        cv_content: {
          headline: content.headline,
          summary: content.summary,
          top_skills: content.top_skills,
          current_work_block: content.current_work_block,
          experience: content.experience,
          selected_projects: content.selected_projects,
          certifications: [
            { title: 'Sample Lab', include: false },
            'not an object',
            { title: 'Sample Skill Badge', include: true },
          ],
          rendering_hints: content.rendering_hints,
        },
      } as unknown as TargetedCvContentOutput;
      expect(registryInputFromPrompt2(draft)).toEqual(
        registryInputFromCvContent(content),
      );
    });
  });

  describe('containsRegistryName', () => {
    it('matches case-insensitively at Unicode word boundaries only', () => {
      expect(containsRegistryName('Built ALPHA tool.', 'Alpha Tool')).toBe(
        true,
      );
      expect(containsRegistryName('Built Alpha Toolkit.', 'Alpha Tool')).toBe(
        false,
      );
      expect(containsRegistryName('Проект Альфа-Тул', 'альфа-тул')).toBe(true);
      expect(containsRegistryName('ПроектАльфа-Тул', 'альфа-тул')).toBe(false);
      expect(containsRegistryName('a_b (c)', 'b (c)')).toBe(false);
      expect(containsRegistryName('a.b (c)', 'b (c)')).toBe(true);
      expect(containsRegistryName('x b (c)', 'b (c)')).toBe(true);
      expect(containsRegistryName('anything', '   ')).toBe(false);
    });
  });

  describe('parseRegistrySnapshot', () => {
    // A v1 snapshot as the guard stored it before credential metadata existed.
    const toV1 = (value: RegistrySnapshot) => ({
      ...value,
      schema: 'registry-snapshot/v1',
      credentials: value.credentials.map((credential) => ({
        title: credential.title,
        aliases: credential.aliases,
        type: credential.type,
        status: credential.status,
        cvEligible: credential.cvEligible,
      })),
    });

    it('reads back a stored snapshot', () => {
      const stored = JSON.parse(JSON.stringify(snapshot)) as unknown;
      expect(parseRegistrySnapshot(stored)).toEqual(snapshot);
    });

    it('reads a registry-snapshot/v1 without credential metadata', () => {
      const stored = JSON.parse(JSON.stringify(toV1(snapshot))) as unknown;
      const parsed = parseRegistrySnapshot(stored);
      expect(parsed?.schema).toBe('registry-snapshot/v1');
      expect(parsed?.credentials).toHaveLength(snapshot.credentials.length);
      for (const credential of parsed?.credentials ?? []) {
        expect(credential).not.toHaveProperty('issuer');
        expect(credential).not.toHaveProperty('issued');
      }
      expect(parsed?.projects).toEqual(snapshot.projects);
    });

    it('rejects a registry-snapshot/v1 that carries v2 credential keys', () => {
      expect(
        parseRegistrySnapshot({ ...snapshot, schema: 'registry-snapshot/v1' }),
      ).toBeNull();
    });

    it('rejects a registry-snapshot/v2 credential without issuer or with a malformed issue date', () => {
      const [first, ...rest] = snapshot.credentials;
      const withCredential = (credential: unknown) => ({
        ...snapshot,
        credentials: [credential, ...rest],
      });
      const withoutIssuer = { ...first } as Record<string, unknown>;
      delete withoutIssuer['issuer'];

      expect(parseRegistrySnapshot(withCredential(withoutIssuer))).toBeNull();
      expect(
        parseRegistrySnapshot(withCredential({ ...first, issuer: '  ' })),
      ).toBeNull();
      expect(
        parseRegistrySnapshot(withCredential({ ...first, issuer: null })),
      ).toBeNull();
      for (const issued of ['2026-13', '2026-1', '2026-01-15', 202601]) {
        expect(
          parseRegistrySnapshot(withCredential({ ...first, issued })),
        ).toBeNull();
      }
      // An invalid v2 snapshot is not read as v1 either.
      expect(
        parseRegistrySnapshot(
          withCredential({
            title: first.title,
            aliases: first.aliases,
            type: first.type,
            status: first.status,
            cvEligible: first.cvEligible,
          }),
        ),
      ).toBeNull();
    });

    it.each([
      ['a missing snapshot', undefined],
      ['a non-object', 'snapshot'],
      ['a wrong schema', { ...snapshot, schema: 'registry-snapshot/v0' }],
      ['an extra top-level field', { ...snapshot, extra: true }],
      ['a missing acceptedForced', { ...snapshot, acceptedForced: undefined }],
      [
        'an unknown project status',
        {
          ...snapshot,
          projects: [{ ...snapshot.projects[0], status: 'paused' }],
        },
      ],
      [
        'a non-boolean credential cvEligible',
        {
          ...snapshot,
          credentials: [{ ...snapshot.credentials[0], cvEligible: 'true' }],
        },
      ],
      [
        'duplicate normalized names',
        {
          ...snapshot,
          projects: [
            snapshot.projects[0],
            { ...snapshot.projects[0], aliases: [] },
          ],
        },
      ],
    ])('returns null for %s', (_label, value) => {
      expect(parseRegistrySnapshot(value)).toBeNull();
    });
  });
});
