import { Logger } from '@nestjs/common';
import {
  renderCvTemplate,
  applyCorrectionsToCvContent,
} from './cv-template-renderer';
import { mapPrompt2OutputToCvContent } from './prompt2-to-cv-content.mapper';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import { CvContent } from '../pipeline/schemas/cv-content.schema';
import { PrePdfCheckCorrection } from '../pipeline/schemas/pre-pdf-check.schema';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeContent(overrides: Partial<CvContent> = {}): CvContent {
  return {
    candidate: {
      name: 'Denys Strakhov',
      contact: {
        phone: '+49 111 222 3333',
        email: 'denys@example.com',
        linkedin: 'https://linkedin.com/in/denys-strakhov',
        github: 'https://github.com/strakhovdenya',
      },
      location: 'Cologne, Germany',
      work_authorization: 'Eligible to work in Germany',
    },
    headline: 'Backend Developer | Node.js | TypeScript | REST APIs',
    summary: [
      'Experienced backend developer specialising in Node.js and TypeScript.',
    ],
    top_skills: ['Node.js', 'TypeScript', 'PostgreSQL'],
    current_work_block: {
      include: true,
      safe_label: 'Current Independent Work & Portfolio Projects',
      role_line: 'Freelance Software Development & Backend Portfolio Projects',
      dates: 'May 2025 - Present',
      location: 'Cologne, Germany | Remote',
      stable_intro:
        'Active software development after relocating from Ukraine to Germany.',
      bullets: [
        {
          text: 'Built JobFlow CV Pipeline — a NestJS/TypeScript backend project.',
          priority: 'high',
        },
      ],
      tech_stack: ['NestJS', 'TypeScript', 'PostgreSQL', 'Docker'],
    },
    experience: [
      {
        company: 'EPAM Systems',
        role: 'Backend-focused Fullstack Developer',
        dates: 'Nov 2021 - May 2025',
        context: 'E-commerce / Azure serverless / integrations',
        experience_type: 'commercial',
        can_split_across_pages: true,
        bullets: [
          {
            text: 'Built and maintained Node.js/TypeScript backend services.',
            priority: 'high',
          },
          {
            text: 'Implemented Azure Functions for serverless processing.',
            priority: 'medium',
          },
        ],
        tech_stack: ['Node.js', 'TypeScript', 'Azure'],
      },
    ],
    selected_projects: [
      {
        title: 'AI Job Assistant',
        project_type: 'personal_project',
        include: true,
        safe_label: 'Personal Project',
        relevance_reason: 'AI/FastAPI relevance',
        display_priority: 'medium',
        bullets: [
          {
            text: 'Built FastAPI/PostgreSQL personal project.',
            priority: 'high',
          },
        ],
        tech_stack: ['Python', 'FastAPI'],
      },
      {
        title: 'Old Side Project',
        project_type: 'personal_project',
        include: false,
        safe_label: 'Personal Project',
        relevance_reason: 'Not relevant',
        display_priority: 'low',
        bullets: [
          {
            text: 'This should not appear in rendered output.',
            priority: 'low',
          },
        ],
        tech_stack: [],
      },
    ],
    education: [
      {
        institution: 'KPI',
        degree: 'BSc Computer Science',
        dates: '2014 - 2018',
      },
    ],
    certifications: [],
    languages: [
      { language: 'English', level: 'B2' },
      {
        language: 'German',
        level: 'A2',
        notes: 'Risk: limited professional German',
      },
    ],
    links: [],
    volunteering: [],
    rendering_hints: {
      density: 'normal',
      target_pages: 2,
      max_pages: 3,
      strong_match_allows_page_3: false,
      optional_sections_to_hide_first: [],
    },
    ...overrides,
  };
}

// ─── renderCvTemplate ─────────────────────────────────────────────────────────

describe('renderCvTemplate', () => {
  describe('required sections', () => {
    it('renders candidate name and headline', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Denys Strakhov');
      expect(html).toContain(
        'Backend Developer | Node.js | TypeScript | REST APIs',
      );
    });

    it('renders ATS contact line with Phone, Email, LinkedIn, GitHub', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Phone: +49 111 222 3333');
      expect(html).toContain('Email: denys@example.com');
      expect(html).toContain(
        'LinkedIn: https://linkedin.com/in/denys-strakhov',
      );
      expect(html).toContain('GitHub: https://github.com/strakhovdenya');
    });

    it('renders Summary section', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain(
        'Experienced backend developer specialising in Node.js',
      );
    });

    it('renders Professional Experience section', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Professional Experience');
      expect(html).toContain('EPAM Systems');
      expect(html).toContain('Backend-focused Fullstack Developer');
    });

    it('renders Education section', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Education');
      expect(html).toContain('KPI');
      expect(html).toContain('BSc Computer Science');
    });

    it('renders Languages in left column', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Languages');
      expect(html).toContain('English');
      expect(html).toContain('German');
    });
  });

  describe('current_work_block ordering', () => {
    it('renders Current Work Block before Professional Experience', () => {
      const html = renderCvTemplate(makeContent());
      const cwbPos = html.indexOf('Current Independent Work');
      const expPos = html.indexOf('Professional Experience');
      expect(cwbPos).toBeGreaterThan(-1);
      expect(expPos).toBeGreaterThan(-1);
      expect(cwbPos).toBeLessThan(expPos);
    });

    it('does not render Current Work Block section when include is false', () => {
      const content = makeContent();
      content.current_work_block.include = false;
      const html = renderCvTemplate(content);
      expect(html).not.toContain('Current Independent Work');
      expect(html).not.toContain('Freelance Software Development');
    });
  });

  describe('bullets rendered as-is from Prompt 2', () => {
    it('renders exact bullet text without modification', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain(
        'Built and maintained Node.js/TypeScript backend services.',
      );
      expect(html).toContain(
        'Implemented Azure Functions for serverless processing.',
      );
      expect(html).toContain(
        'Built JobFlow CV Pipeline — a NestJS/TypeScript backend project.',
      );
    });
  });

  describe('optional sections', () => {
    it('does not render Selected Projects section when all projects have include: false', () => {
      const content = makeContent();
      content.selected_projects = content.selected_projects.map((p) => ({
        ...p,
        include: false,
      }));
      const html = renderCvTemplate(content);
      expect(html).not.toContain('Selected Projects');
      expect(html).not.toContain('This should not appear');
    });

    it('renders only projects with include: true', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('AI Job Assistant');
      expect(html).not.toContain('Old Side Project');
      expect(html).not.toContain('This should not appear in rendered output');
    });

    it('does not render Certifications section when certifications array is empty', () => {
      const content = makeContent({ certifications: [] });
      const html = renderCvTemplate(content);
      expect(html).not.toContain('Certifications');
    });

    it('renders Certifications when present', () => {
      const content = makeContent({
        certifications: [
          { name: 'AZ-204', issuer: 'Microsoft', priority: 'high' },
        ],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain('Certifications');
      expect(html).toContain('AZ-204');
    });

    it('renders certification issuer, type label and year', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'Sample Agent Badge',
            issuer: 'Sample Issuer',
            kind: 'skill badge',
            date: '2026',
            priority: 'medium',
          },
        ],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain(
        '<div class="cert-item">Sample Agent Badge &mdash; Sample Issuer skill badge<span class="cert-date">2026</span></div>',
      );
    });

    it('renders only the certification name when it has no metadata', () => {
      const content = makeContent({
        certifications: [{ name: 'Sample Local Course', priority: 'medium' }],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain(
        '<div class="cert-item">Sample Local Course</div>',
      );
      expect(html).not.toContain('<span class="cert-date">');
    });

    it('escapes certification issuer in HTML', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'Sample Agent Badge',
            issuer: '<b>Sample Issuer</b>',
            kind: 'skill badge',
            date: '2026',
            priority: 'medium',
          },
        ],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain('&lt;b&gt;Sample Issuer&lt;/b&gt; skill badge');
      expect(html).not.toContain('<b>Sample Issuer</b>');
    });

    it('does not render Volunteering section when volunteering array is empty', () => {
      const content = makeContent({ volunteering: [] });
      const html = renderCvTemplate(content);
      expect(html).not.toContain('Volunteering');
    });

    it('renders Volunteering when present', () => {
      const content = makeContent({
        volunteering: [
          {
            description: 'Helped at local coding school.',
            organization: 'CoderDojo',
          },
        ],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain('Volunteering');
      expect(html).toContain('Helped at local coding school.');
    });

    it('does not render Links section when links array is empty', () => {
      const html = renderCvTemplate(makeContent({ links: [] }));
      expect(html).not.toContain('>Links<');
    });
  });
});

// ─── applyCorrectionsToCvContent ──────────────────────────────────────────────

describe('applyCorrectionsToCvContent', () => {
  it('applies top-level string correction (headline)', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        original_text: 'Backend Developer | Node.js | TypeScript | REST APIs',
        suggested_text: 'Corrected Headline',
        severity: 'suggestion',
        reason: 'More specific',
      },
    ];
    const result = applyCorrectionsToCvContent(content, corrections);
    expect(result.headline).toBe('Corrected Headline');
  });

  it('applies array element correction (summary[0])', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'summary[0]',
        original_text:
          'Experienced backend developer specialising in Node.js and TypeScript.',
        suggested_text: 'Updated summary line.',
        severity: 'suggestion',
        reason: 'Clearer phrasing',
      },
    ];
    const result = applyCorrectionsToCvContent(content, corrections);
    expect(result.summary[0]).toBe('Updated summary line.');
  });

  it('applies nested correction (current_work_block.stable_intro)', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'current_work_block.stable_intro',
        original_text:
          'Active software development after relocating from Ukraine to Germany.',
        suggested_text: 'Improved intro sentence.',
        severity: 'suggestion',
        reason: 'More precise',
      },
    ];
    const result = applyCorrectionsToCvContent(content, corrections);
    expect(result.current_work_block.stable_intro).toBe(
      'Improved intro sentence.',
    );
  });

  it('does not mutate the original content', () => {
    const content = makeContent();
    const originalHeadline = content.headline;
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        original_text: 'Backend Developer | Node.js | TypeScript | REST APIs',
        suggested_text: 'Different Headline',
        severity: 'suggestion',
        reason: 'Test immutability',
      },
    ];
    applyCorrectionsToCvContent(content, corrections);
    expect(content.headline).toBe(originalHeadline);
  });
});

// ─── applyCorrectionsToCvContent: field_path allowlist (ISSUE-492) ────────────

const correction = (
  fieldPath: string,
  originalText: string | null = null,
): PrePdfCheckCorrection => ({
  field_path: fieldPath,
  original_text: originalText,
  suggested_text: 'CORRECTED',
  severity: 'warning',
  reason: 'test',
});

describe('applyCorrectionsToCvContent — field_path allowlist', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Every correction this block skips must be skipped by the field_path guard itself, not
    // by the later original_text check (ISSUE-699), so the guard tests still prove the guard.
    for (const args of warnSpy.mock.calls as unknown[][]) {
      expect(String(args[0])).toContain(
        'is not an existing correctable text field',
      );
    }
    warnSpy.mockRestore();
  });

  const read = (content: CvContent, fieldPath: string): unknown =>
    fieldPath
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .reduce<unknown>(
        (node, key) => (node as Record<string, unknown>)[key],
        content,
      );

  it.each([
    'headline',
    'summary[0]',
    'top_skills[1]',
    'current_work_block.safe_label',
    'current_work_block.role_line',
    'current_work_block.dates',
    'current_work_block.location',
    'current_work_block.stable_intro',
    'current_work_block.bullets[0].text',
    'current_work_block.tech_stack[2]',
    'experience[0].company',
    'experience[0].role',
    'experience[0].dates',
    'experience[0].bullets[1].text',
    'experience[0].tech_stack[0]',
    'selected_projects[0].title',
    'selected_projects[0].safe_label',
    'selected_projects[0].bullets[0].text',
    'selected_projects[0].tech_stack[1]',
  ])('applies a correction to %s', (fieldPath) => {
    const content = makeContent();
    const result = applyCorrectionsToCvContent(content, [
      correction(fieldPath, read(content, fieldPath) as string),
    ]);
    expect(read(result, fieldPath)).toBe('CORRECTED');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips certifications[i]: the CV entry is an object, a string never replaces it', () => {
    const content = makeContent({
      certifications: [{ name: 'AWS Cloud Practitioner', priority: 'medium' }],
    });
    const result = applyCorrectionsToCvContent(content, [
      correction('certifications[0]'),
    ]);
    expect(result.certifications[0]).toEqual({
      name: 'AWS Cloud Practitioner',
      priority: 'medium',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  describe('certifications[i] addresses the Prompt 2 entry index', () => {
    const mappedCertifications = (
      titles: Array<[string, boolean]>,
    ): CvContent['certifications'] =>
      mapPrompt2OutputToCvContent(
        {
          cv_content: {
            current_work_block: { bullets: [] },
            experience: [],
            selected_projects: [],
            rendering_hints: {},
            certifications: titles.map(([title, include]) => ({
              title,
              include,
              reason: 'test',
            })),
          },
        } as unknown as TargetedCvContentOutput,
        CANDIDATE_PROFILE_CONFIG,
      ).certifications;

    const names = (content: CvContent): string[] =>
      content.certifications.map((item) => item.name);

    const mixed = (): CvContent =>
      makeContent({
        certifications: mappedCertifications([
          ['Cert A', true],
          ['Cert B', false],
          ['Cert C', true],
        ]),
      });

    it('applies certifications correction by Prompt 2 index', () => {
      const result = applyCorrectionsToCvContent(mixed(), [
        correction('certifications[2]', 'Cert C'),
      ]);
      expect(names(result)).toEqual(['Cert A', 'CORRECTED']);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('skips certifications correction for excluded entry', () => {
      const content = mixed();
      const result = applyCorrectionsToCvContent(content, [
        correction('certifications[1]'),
      ]);
      expect(result).toEqual(content);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('"certifications[1]"');
    });

    it('skips certifications correction for missing index', () => {
      const content = mixed();
      const result = applyCorrectionsToCvContent(content, [
        correction('certifications[3]'),
        correction('certifications[5]'),
      ]);
      expect(result).toEqual(content);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0][0]).toContain('"certifications[3]"');
      expect(warnSpy.mock.calls[1][0]).toContain('"certifications[5]"');
    });

    it('changes only certification name', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'Cert A',
            issuer: 'Issuer A',
            date: '2024-01',
            priority: 'high',
            source_index: 0,
          },
        ],
      });
      const result = applyCorrectionsToCvContent(content, [
        correction('certifications[0]', 'Cert A'),
      ]);
      expect(result.certifications).toEqual([
        {
          name: 'CORRECTED',
          issuer: 'Issuer A',
          date: '2024-01',
          priority: 'high',
          source_index: 0,
        },
      ]);
    });

    it('still rejects non-leaf certifications path', () => {
      const content = mixed();
      const result = applyCorrectionsToCvContent(content, [
        correction('certifications[0].name'),
      ]);
      expect(result).toEqual(content);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  it.each(['__proto__.x', 'constructor.prototype.x', 'summary.__proto__'])(
    'does not pollute Object.prototype through %s',
    (fieldPath) => {
      const content = makeContent();
      const result = applyCorrectionsToCvContent(content, [
        correction(fieldPath),
      ]);
      expect(({} as Record<string, unknown>).x).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'x')).toBe(
        false,
      );
      expect(result).toEqual(content);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['candidate.contact.email', (c: CvContent) => c.candidate.contact.email],
    ['links[0].url', (c: CvContent) => c.links[0].url],
    ['candidate.name', (c: CvContent) => c.candidate.name],
    [
      'rendering_hints.max_pages',
      (c: CvContent) => c.rendering_hints.max_pages,
    ],
  ])('does not change %s', (fieldPath, pick) => {
    const content = makeContent({
      links: [{ label: 'GitHub', url: 'https://github.com/strakhovdenya' }],
    });
    const result = applyCorrectionsToCvContent(content, [
      correction(fieldPath),
    ]);
    expect(pick(result)).toEqual(pick(content));
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an array', 'summary'],
    ['an array of bullets', 'experience[0].bullets'],
    ['an object', 'experience[0]'],
    ['a missing index', 'summary[99]'],
    ['a missing bullet', 'experience[0].bullets[5].text'],
    ['a missing experience item', 'experience[3].role'],
  ])('does not write to %s (%s)', (_label, fieldPath) => {
    const content = makeContent();
    const result = applyCorrectionsToCvContent(content, [
      correction(fieldPath),
    ]);
    expect(result).toEqual(content);
    expect(result.summary).toHaveLength(content.summary.length);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not write to a leaf that is not a string', () => {
    const content = makeContent();
    (content.summary as unknown[])[0] = 42;
    const result = applyCorrectionsToCvContent(content, [
      correction('summary[0]'),
    ]);
    expect(result.summary[0]).toBe(42);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns once per skipped correction with its field_path and still applies the valid ones', () => {
    const result = applyCorrectionsToCvContent(makeContent(), [
      correction('candidate.name'),
      correction(
        'headline',
        'Backend Developer | Node.js | TypeScript | REST APIs',
      ),
      correction('summary[99]'),
    ]);
    expect(result.headline).toBe('CORRECTED');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('"candidate.name"');
    expect(warnSpy.mock.calls[1][0]).toContain('"summary[99]"');
  });
});

// ─── applyCorrectionsToCvContent: original_text must equal the field (B1) ─────

describe('applyCorrectionsToCvContent — original_text must equal the field', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const fix = (
    fieldPath: string,
    originalText: string | null | undefined,
    suggestedText: string,
  ): PrePdfCheckCorrection => ({
    field_path: fieldPath,
    ...(originalText === undefined ? {} : { original_text: originalText }),
    suggested_text: suggestedText,
    severity: 'warning',
    reason: 'test',
  });

  const syntheticContent = (): CvContent =>
    makeContent({
      headline: 'Headline A',
      summary: ['Summary sentence A.', 'Summary sentence B.'],
      current_work_block: {
        include: true,
        safe_label: 'Label A',
        role_line: 'Role line A',
        dates: 'Dates A',
        location: 'Location A',
        stable_intro: 'Intro sentence A.',
        bullets: [{ text: 'Block bullet A.', priority: 'high' }],
        tech_stack: ['Tool X'],
      },
      experience: [
        {
          company: 'Company A',
          role: 'Role A',
          dates: 'Dates B',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: [
            { text: 'Bullet A.', priority: 'high' },
            { text: 'Bullet B.', priority: 'medium' },
          ],
          tech_stack: ['Tool A', 'Tool B', 'Tool C'],
        },
      ],
      selected_projects: [
        {
          title: 'Project A',
          project_type: 'personal_project',
          include: true,
          safe_label: 'Project label A',
          relevance_reason: 'test',
          display_priority: 'medium',
          bullets: [{ text: 'Project bullet A.', priority: 'high' }],
          tech_stack: ['Tool D'],
        },
      ],
      certifications: mapPrompt2OutputToCvContent(
        {
          cv_content: {
            current_work_block: { bullets: [] },
            experience: [],
            selected_projects: [],
            rendering_hints: {},
            certifications: [
              { title: 'Credential A', include: true, reason: 'test' },
              { title: 'Credential B', include: false, reason: 'test' },
              { title: 'Credential C', include: true, reason: 'test' },
            ],
          },
        } as unknown as TargetedCvContentOutput,
        CANDIDATE_PROFILE_CONFIG,
      ).certifications,
    });

  const warnings = (): string[] =>
    warnSpy.mock.calls.map((args: unknown[]) => String(args[0]));

  it('applies a correction whose original_text equals the current value at field_path', () => {
    const result = applyCorrectionsToCvContent(syntheticContent(), [
      fix('headline', 'Headline A', 'Headline A2'),
      fix('summary[1]', 'Summary sentence B.', 'Summary sentence B2.'),
      fix('current_work_block.stable_intro', 'Intro sentence A.', 'Intro 2.'),
      fix('experience[0].tech_stack[2]', 'Tool C', 'Tool C (qualified)'),
      fix(
        'selected_projects[0].bullets[0].text',
        'Project bullet A.',
        'Project bullet A2.',
      ),
    ]);

    expect(result.headline).toBe('Headline A2');
    expect(result.summary).toEqual([
      'Summary sentence A.',
      'Summary sentence B2.',
    ]);
    expect(result.current_work_block.stable_intro).toBe('Intro 2.');
    expect(result.experience[0].tech_stack).toEqual([
      'Tool A',
      'Tool B',
      'Tool C (qualified)',
    ]);
    expect(result.selected_projects[0].bullets[0].text).toBe(
      'Project bullet A2.',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips an off-by-one tech_stack correction and leaves both elements unchanged', () => {
    const content = syntheticContent();
    const result = applyCorrectionsToCvContent(content, [
      fix('experience[0].tech_stack[1]', 'Tool C', 'Tool C (qualified)'),
    ]);

    expect(result.experience[0].tech_stack).toEqual([
      'Tool A',
      'Tool B',
      'Tool C',
    ]);
    expect(result).toEqual(content);
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('"experience[0].tech_stack[1]"');
    expect(warnings()[0]).toContain('does not equal the current value');
  });

  it('skips an off-by-one bullet correction and leaves both bullets unchanged', () => {
    const content = syntheticContent();
    const result = applyCorrectionsToCvContent(content, [
      fix('experience[0].bullets[0].text', 'Bullet B.', 'Bullet B2.'),
    ]);

    expect(result.experience[0].bullets.map((bullet) => bullet.text)).toEqual([
      'Bullet A.',
      'Bullet B.',
    ]);
    expect(result).toEqual(content);
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('"experience[0].bullets[0].text"');
  });

  it('skips a correction whose original_text is null, missing or empty', () => {
    const content = syntheticContent();
    const result = applyCorrectionsToCvContent(content, [
      fix('headline', null, 'Headline from null'),
      fix('summary[0]', undefined, 'Summary from missing'),
      fix('experience[0].role', '', 'Role from empty'),
    ]);

    expect(result).toEqual(content);
    expect(warnings()).toHaveLength(3);
    expect(warnings()[0]).toContain('"headline"');
    expect(warnings()[1]).toContain('"summary[0]"');
    expect(warnings()[2]).toContain('"experience[0].role"');
    for (const warning of warnings()) {
      expect(warning).toContain('has no non-empty string original_text');
    }
  });

  it('skips a correction whose original_text differs only in whitespace or case', () => {
    const content = syntheticContent();
    const result = applyCorrectionsToCvContent(content, [
      fix('summary[0]', 'Summary  sentence A. ', 'Summary from whitespace'),
      fix('experience[0].company', 'company a', 'Company from case'),
    ]);

    expect(result).toEqual(content);
    expect(warnings()).toHaveLength(2);
  });

  it('renames a certification found by source_index when original_text equals its name', () => {
    const content = syntheticContent();
    expect(content.certifications.map((item) => item.source_index)).toEqual([
      0, 2,
    ]);

    const result = applyCorrectionsToCvContent(content, [
      fix('certifications[2]', 'Credential C', 'Credential C2'),
    ]);

    expect(result.certifications.map((item) => item.name)).toEqual([
      'Credential A',
      'Credential C2',
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips and warns about a certification correction whose original_text does not equal the entry found by source_index', () => {
    const content = syntheticContent();
    const result = applyCorrectionsToCvContent(content, [
      fix('certifications[2]', 'Credential A', 'Credential A2'),
    ]);

    expect(result.certifications).toEqual(content.certifications);
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('"certifications[2]"');
  });

  it('applies the first of two corrections to the same field and skips the second with a warning', () => {
    const result = applyCorrectionsToCvContent(syntheticContent(), [
      fix('headline', 'Headline A', 'Headline first'),
      fix('headline', 'Headline A', 'Headline second'),
    ]);

    expect(result.headline).toBe('Headline first');
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('"headline"');
    expect(warnings()[0]).toContain('already changed');
  });

  it('skips a second correction whose original_text equals the result of the first', () => {
    const result = applyCorrectionsToCvContent(syntheticContent(), [
      fix('experience[0].tech_stack[2]', 'Tool C', 'Tool C (first)'),
      fix('experience[0].tech_stack[2]', 'Tool C (first)', 'Tool C (second)'),
    ]);

    expect(result.experience[0].tech_stack[2]).toBe('Tool C (first)');
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('already changed');
  });

  it('treats differently spelled indexes of one field as the same field', () => {
    const result = applyCorrectionsToCvContent(syntheticContent(), [
      fix('summary[0]', 'Summary sentence A.', 'Summary first.'),
      fix('summary[00]', 'Summary first.', 'Summary second.'),
    ]);

    expect(result.summary[0]).toBe('Summary first.');
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]).toContain('"summary[00]"');
  });

  it('applies the matching corrections of a list in which another correction is skipped, without throwing or mutating the input', () => {
    const content = syntheticContent();
    const before = JSON.parse(JSON.stringify(content)) as CvContent;
    let result: CvContent | undefined;

    expect(() => {
      result = applyCorrectionsToCvContent(content, [
        fix('experience[0].tech_stack[0]', 'Tool B', 'Tool B2'),
        fix('experience[0].bullets[1].text', 'Bullet B.', 'Bullet B2.'),
      ]);
    }).not.toThrow();

    expect(result?.experience[0].tech_stack).toEqual([
      'Tool A',
      'Tool B',
      'Tool C',
    ]);
    expect(result?.experience[0].bullets[1].text).toBe('Bullet B2.');
    expect(content).toEqual(before);
    expect(warnings()).toHaveLength(1);
  });

  it('logs a skipped correction by field_path and never logs original_text, suggested_text or the field value', () => {
    applyCorrectionsToCvContent(syntheticContent(), [
      fix('experience[0].tech_stack[1]', 'Tool C', 'Suggested value Q'),
    ]);

    expect(warnings()).toHaveLength(1);
    const warning = warnings()[0];
    expect(warning).toContain('"experience[0].tech_stack[1]"');
    expect(warning).not.toContain('Tool C');
    expect(warning).not.toContain('Suggested value Q');
    expect(warning).not.toContain('Tool B');
  });
});

// ─── renderCvTemplate with Prompt 3 corrections ───────────────────────────────

describe('renderCvTemplate with Prompt 3 corrections', () => {
  // The renderer takes no corrections: the export applies them first (effective-cv-content.ts).
  it('renders the content corrected by applyCorrectionsToCvContent', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        original_text: 'Backend Developer | Node.js | TypeScript | REST APIs',
        suggested_text: 'Senior Backend Developer | Node.js | TypeScript',
        severity: 'suggestion',
        reason: 'Better seniority signal',
      },
    ];
    const html = renderCvTemplate(
      applyCorrectionsToCvContent(content, corrections),
    );
    expect(html).toContain('Senior Backend Developer | Node.js | TypeScript');
    expect(html).not.toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );

    // An empty corrections list changes nothing.
    const unchanged = renderCvTemplate(
      applyCorrectionsToCvContent(content, []),
    );
    expect(unchanged).toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );
    expect(unchanged).toContain('EPAM Systems');
  });

  it('renders correctly when no corrections provided', () => {
    const content = makeContent();
    const html = renderCvTemplate(content);
    expect(html).toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );
  });
});
