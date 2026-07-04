import { renderCvTemplate, applyCorrectionsToCvContent } from './cv-template-renderer';
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
        linkedin: 'https://linkedin.com/in/denis-strakhov-9b5820a7',
        github: 'https://github.com/strakhovdenya',
      },
      location: 'Cologne, Germany',
      work_authorization: 'Eligible to work in Germany',
    },
    headline: 'Backend Developer | Node.js | TypeScript | REST APIs',
    summary: ['Experienced backend developer specialising in Node.js and TypeScript.'],
    top_skills: ['Node.js', 'TypeScript', 'PostgreSQL'],
    current_work_block: {
      include: true,
      safe_label: 'Current Independent Work & Portfolio Projects',
      role_line: 'Freelance Software Development & Backend Portfolio Projects',
      dates: 'May 2025 - Present',
      location: 'Cologne, Germany | Remote',
      stable_intro: 'Active software development after relocating from Ukraine to Germany.',
      bullets: [
        { text: 'Built JobFlow CV Pipeline — a NestJS/TypeScript backend project.', priority: 'high' },
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
          { text: 'Built and maintained Node.js/TypeScript backend services.', priority: 'high' },
          { text: 'Implemented Azure Functions for serverless processing.', priority: 'medium' },
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
        bullets: [{ text: 'Built FastAPI/PostgreSQL personal project.', priority: 'high' }],
        tech_stack: ['Python', 'FastAPI'],
      },
      {
        title: 'Old Side Project',
        project_type: 'personal_project',
        include: false,
        safe_label: 'Personal Project',
        relevance_reason: 'Not relevant',
        display_priority: 'low',
        bullets: [{ text: 'This should not appear in rendered output.', priority: 'low' }],
        tech_stack: [],
      },
    ],
    education: [
      { institution: 'KPI', degree: 'BSc Computer Science', dates: '2014 - 2018' },
    ],
    certifications: [],
    languages: [
      { language: 'English', level: 'B2' },
      { language: 'German', level: 'A2', notes: 'Risk: limited professional German' },
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
      expect(html).toContain('Backend Developer | Node.js | TypeScript | REST APIs');
    });

    it('renders ATS contact line with Phone, Email, LinkedIn, GitHub', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Phone: +49 111 222 3333');
      expect(html).toContain('Email: denys@example.com');
      expect(html).toContain('LinkedIn: https://linkedin.com/in/denis-strakhov-9b5820a7');
      expect(html).toContain('GitHub: https://github.com/strakhovdenya');
    });

    it('renders Summary section', () => {
      const html = renderCvTemplate(makeContent());
      expect(html).toContain('Experienced backend developer specialising in Node.js');
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
      expect(html).toContain('Built and maintained Node.js/TypeScript backend services.');
      expect(html).toContain('Implemented Azure Functions for serverless processing.');
      expect(html).toContain('Built JobFlow CV Pipeline — a NestJS/TypeScript backend project.');
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
        certifications: [{ name: 'AZ-204', issuer: 'Microsoft', priority: 'high' }],
      });
      const html = renderCvTemplate(content);
      expect(html).toContain('Certifications');
      expect(html).toContain('AZ-204');
    });

    it('does not render Volunteering section when volunteering array is empty', () => {
      const content = makeContent({ volunteering: [] });
      const html = renderCvTemplate(content);
      expect(html).not.toContain('Volunteering');
    });

    it('renders Volunteering when present', () => {
      const content = makeContent({
        volunteering: [{ description: 'Helped at local coding school.', organization: 'CoderDojo' }],
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
        suggested_text: 'Improved intro sentence.',
        severity: 'suggestion',
        reason: 'More precise',
      },
    ];
    const result = applyCorrectionsToCvContent(content, corrections);
    expect(result.current_work_block.stable_intro).toBe('Improved intro sentence.');
  });

  it('does not mutate the original content', () => {
    const content = makeContent();
    const originalHeadline = content.headline;
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        suggested_text: 'Different Headline',
        severity: 'suggestion',
        reason: 'Test immutability',
      },
    ];
    applyCorrectionsToCvContent(content, corrections);
    expect(content.headline).toBe(originalHeadline);
  });
});

// ─── renderCvTemplate with Prompt 3 corrections ───────────────────────────────

describe('renderCvTemplate with Prompt 3 corrections', () => {
  it('renders corrected headline when correction is provided', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        suggested_text: 'Senior Backend Developer | Node.js | TypeScript',
        severity: 'suggestion',
        reason: 'Better seniority signal',
      },
    ];
    const html = renderCvTemplate(content, corrections);
    expect(html).toContain('Senior Backend Developer | Node.js | TypeScript');
    expect(html).not.toContain('Backend Developer | Node.js | TypeScript | REST APIs');
  });

  it('renders correctly with empty corrections array (no changes)', () => {
    const content = makeContent();
    const html = renderCvTemplate(content, []);
    expect(html).toContain('Backend Developer | Node.js | TypeScript | REST APIs');
    expect(html).toContain('EPAM Systems');
  });

  it('renders correctly when no corrections provided', () => {
    const content = makeContent();
    const html = renderCvTemplate(content);
    expect(html).toContain('Backend Developer | Node.js | TypeScript | REST APIs');
  });
});
