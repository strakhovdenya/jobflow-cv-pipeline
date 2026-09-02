import { renderAtsCvTemplate } from './ats-cv-template-renderer';
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

// ─── renderAtsCvTemplate ───────────────────────────────────────────────────────

describe('renderAtsCvTemplate', () => {
  // §3 Rules 1-2: Single-column layout, no ATS-hostile elements
  describe('layout — single-column, no ATS-hostile elements (rules 1-2)', () => {
    it('does not use CSS float, column-count, or multi-column grid', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).not.toContain('float:');
      expect(html).not.toContain('column-count');
      expect(html).not.toContain('grid-template-columns');
    });

    it('does not use <table>, <aside>, or absolute/fixed positioning', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).not.toContain('<table');
      expect(html).not.toContain('<aside');
      expect(html).not.toContain('position:absolute');
      expect(html).not.toContain('position:fixed');
    });
  });

  // §3 Rule 3 / Rule 23: Section order (top-to-bottom = reading order)
  describe('section order — top-to-bottom reading flow (rules 3, 23)', () => {
    it('renders all sections in correct top-to-bottom order', () => {
      const content = makeContent({
        certifications: [{ name: 'AZ-204', priority: 'high' }],
      });
      const html = renderAtsCvTemplate(content);

      const idx = {
        name: html.indexOf('<h1>Denys Strakhov'),
        headline: html.indexOf('class="headline"'),
        contact: html.indexOf('class="contact-block"'),
        summary: html.indexOf('<h2>Summary</h2>'),
        currentWork: html.indexOf('Current Independent Work'),
        experience: html.indexOf('<h2>Professional Experience</h2>'),
        education: html.indexOf('<h2>Education</h2>'),
        topSkills: html.indexOf('<h2>Top Skills</h2>'),
        languages: html.indexOf('<h2>Languages</h2>'),
        certifications: html.indexOf('<h2>Certifications</h2>'),
        selectedProjects: html.indexOf('<h2>Selected Projects</h2>'),
      };

      expect(idx.name).toBeGreaterThan(-1);
      expect(idx.name).toBeLessThan(idx.headline);
      expect(idx.headline).toBeLessThan(idx.contact);
      expect(idx.contact).toBeLessThan(idx.summary);
      expect(idx.summary).toBeLessThan(idx.currentWork);
      expect(idx.currentWork).toBeLessThan(idx.experience);
      expect(idx.experience).toBeLessThan(idx.education);
      expect(idx.education).toBeLessThan(idx.topSkills);
      expect(idx.topSkills).toBeLessThan(idx.languages);
      expect(idx.languages).toBeLessThan(idx.certifications);
      expect(idx.certifications).toBeLessThan(idx.selectedProjects);
    });
  });

  // §3 Rule 4: Contact block between Headline and Summary
  describe('contact block placement — between headline and summary (rule 4)', () => {
    it('renders contact block between headline and Summary heading', () => {
      const html = renderAtsCvTemplate(makeContent());
      const headlinePos = html.indexOf('class="headline"');
      const contactPos = html.indexOf('class="contact-block"');
      const summaryPos = html.indexOf('<h2>Summary</h2>');
      expect(headlinePos).toBeGreaterThan(-1);
      expect(contactPos).toBeGreaterThan(headlinePos);
      expect(summaryPos).toBeGreaterThan(contactPos);
    });
  });

  // §3 Rule 5: Contact block content — Phone, Email, LinkedIn, GitHub
  describe('contact block content (rule 5)', () => {
    it('renders Phone, Email, LinkedIn and GitHub in the contact block', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('Phone:');
      expect(html).toContain('+49 111 222 3333');
      expect(html).toContain('Email:');
      expect(html).toContain('denys@example.com');
      expect(html).toContain('LinkedIn:');
      expect(html).toContain('https://linkedin.com/in/denys-strakhov');
      expect(html).toContain('GitHub:');
      expect(html).toContain('https://github.com/strakhovdenya');
    });
  });

  // §3 Rule 6: Contact block preferred format with pipe separators
  describe('contact block format — pipe-separated labels (rule 6)', () => {
    it('uses pipe separators between contact fields', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('Phone: +49 111 222 3333 | Email:');
      expect(html).toContain('| LinkedIn:');
      expect(html).toContain('| GitHub:');
    });
  });

  // §3 Rule 7: LinkedIn URL — no www.
  describe('LinkedIn URL format — no www. prefix (rule 7)', () => {
    it('renders LinkedIn URL as https://linkedin.com/in/... without www.', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('https://linkedin.com/in/denys-strakhov');
      expect(html).not.toContain('www.linkedin.com');
    });
  });

  // §3 Rule 8: GitHub URL — full URL visible
  describe('GitHub URL format — full URL visible (rule 8)', () => {
    it('renders GitHub URL as https://github.com/... in full', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('https://github.com/strakhovdenya');
    });
  });

  // §3 Rule 9: Hyperlinks clickable with visible URL text
  describe('hyperlinks — clickable with visible URL text (rule 9)', () => {
    it('renders LinkedIn as <a> with matching href and visible URL text', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        '<a href="https://linkedin.com/in/denys-strakhov">https://linkedin.com/in/denys-strakhov</a>',
      );
    });

    it('renders GitHub as <a> with matching href and visible URL text', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        '<a href="https://github.com/strakhovdenya">https://github.com/strakhovdenya</a>',
      );
    });

    it('renders email as mailto: <a> with visible address text', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        '<a href="mailto:denys@example.com">denys@example.com</a>',
      );
    });
  });

  // §3 Rule 10: stable_intro as prose, not as a bullet item
  describe('current work block — stable_intro as prose without bullet prefix (rule 10)', () => {
    it('renders stable_intro inside .stable-intro element, not as <li>', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('class="stable-intro"');
      expect(html).toContain(
        'Active software development after relocating from Ukraine to Germany.',
      );
      // stable_intro must not be a list item
      expect(html).not.toContain(
        '<li>Active software development after relocating',
      );
    });

    it('renders current work bullets as separate <li> items', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        '<li>Built JobFlow CV Pipeline — a NestJS/TypeScript backend project.</li>',
      );
    });

    it('omits current work block entirely when include is false', () => {
      const content = makeContent();
      content.current_work_block.include = false;
      const html = renderAtsCvTemplate(content);
      expect(html).not.toContain('Current Independent Work');
      expect(html).not.toContain('Freelance Software Development');
    });
  });

  // §3 Rule 13: Typography — body 10-12pt, minimum 9.5pt
  describe('typography — font sizes 10-12pt, minimum 9.5pt (rule 13)', () => {
    it('uses 11pt as body font size', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('font-size:11pt');
    });

    it('minimum font size in CSS is 9.5pt (tech-line)', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('font-size:9.5pt');
    });

    it('does not use font sizes below 9.5pt', () => {
      const html = renderAtsCvTemplate(makeContent());
      // Extract all font-size declarations and verify none go below 9.5pt
      const fontSizeMatches = html.matchAll(/font-size:([\d.]+)pt/g);
      for (const match of fontSizeMatches) {
        expect(parseFloat(match[1])).toBeGreaterThanOrEqual(9.5);
      }
    });
  });

  // §3 Rule 14: Heading style — plain h2 elements
  describe('heading style — plain text h2 elements (rule 14)', () => {
    it('uses <h2> elements for all section headings', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('<h2>Summary</h2>');
      expect(html).toContain('<h2>Professional Experience</h2>');
      expect(html).toContain('<h2>Education</h2>');
      expect(html).toContain('<h2>Top Skills</h2>');
      expect(html).toContain('<h2>Languages</h2>');
    });

    it('does not use images or graphical replacements for headings', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).not.toContain('<img');
    });
  });

  // §3 Rule 16: Page size A4
  describe('A4 page size (rule 16)', () => {
    it('includes @page rule specifying A4 size', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('@page{size:A4');
    });
  });

  // §3 Rule 18: No orphan section headings — page-break-after:avoid on h2
  describe('no orphan headings — page-break-after:avoid (rule 18)', () => {
    it('applies page-break-after:avoid to h2 in CSS', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('page-break-after:avoid');
    });
  });

  // §3 Rule 19: No text clipping — break-inside:avoid on content blocks
  describe('no text clipping — break-inside:avoid on content blocks (rule 19)', () => {
    it('applies break-inside:avoid to content blocks in CSS', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('break-inside:avoid');
    });
  });

  // §3 Rule 22: No decorative images
  describe('no decorative images (rule 22)', () => {
    it('does not render any <img> elements', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).not.toContain('<img');
    });
  });

  // §3 Rule 25: Skills as pipe-separated line
  describe('skills — pipe-separated inline rendering (rule 25)', () => {
    it('renders top_skills joined with " | " pipe separators', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('Node.js | TypeScript | PostgreSQL');
    });

    it('renders skills in a skills-line paragraph element', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('class="skills-line"');
    });
  });

  // Density hints — CSS class mapping
  describe('density hints CSS class mapping', () => {
    it('applies density-normal class to <body> for default density', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('class="density-normal"');
    });

    it('applies density-compact class to <body> for compact density', () => {
      const html = renderAtsCvTemplate(
        makeContent({
          rendering_hints: {
            density: 'compact',
            target_pages: 2,
            max_pages: 2,
            strong_match_allows_page_3: false,
            optional_sections_to_hide_first: [],
          },
        }),
      );
      expect(html).toContain('class="density-compact"');
    });

    it('applies density-extended class to <body> for extended density', () => {
      const html = renderAtsCvTemplate(
        makeContent({
          rendering_hints: {
            density: 'extended',
            target_pages: 2,
            max_pages: 3,
            strong_match_allows_page_3: false,
            optional_sections_to_hide_first: [],
          },
        }),
      );
      expect(html).toContain('class="density-extended"');
    });

    it('CSS defines distinct compact spacing rules', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('.density-compact .block');
    });

    it('CSS defines distinct extended spacing rules', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('.density-extended .block');
    });
  });

  // Certifications — name only, no issuer or date (ISSUE-311)
  describe('certifications — renders name only, omits issuer and date (ISSUE-311)', () => {
    it('renders certification name', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'AZ-204',
            issuer: 'Microsoft',
            date: '2024-01',
            priority: 'high',
          },
        ],
      });
      const html = renderAtsCvTemplate(content);
      expect(html).toContain('AZ-204');
    });

    it('does not render certification issuer', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'AZ-204',
            issuer: 'Microsoft',
            date: '2024-01',
            priority: 'high',
          },
        ],
      });
      const html = renderAtsCvTemplate(content);
      expect(html).not.toContain('Microsoft');
    });

    it('does not render certification date', () => {
      const content = makeContent({
        certifications: [
          {
            name: 'AZ-204',
            issuer: 'Microsoft',
            date: '2024-01',
            priority: 'high',
          },
        ],
      });
      const html = renderAtsCvTemplate(content);
      expect(html).not.toContain('2024-01');
    });

    it('does not render Certifications section when array is empty', () => {
      const html = renderAtsCvTemplate(makeContent({ certifications: [] }));
      expect(html).not.toContain('<h2>Certifications</h2>');
    });

    it('renders Certifications section heading when certifications are present', () => {
      const content = makeContent({
        certifications: [{ name: 'AZ-204', priority: 'high' }],
      });
      const html = renderAtsCvTemplate(content);
      expect(html).toContain('<h2>Certifications</h2>');
      expect(html).toContain('AZ-204');
    });
  });

  // Optional sections
  describe('optional sections', () => {
    it('renders only projects with include: true', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('AI Job Assistant');
      expect(html).not.toContain('Old Side Project');
      expect(html).not.toContain('This should not appear in rendered output');
    });

    it('omits Selected Projects section when all projects have include: false', () => {
      const content = makeContent();
      content.selected_projects = content.selected_projects.map((p) => ({
        ...p,
        include: false,
      }));
      const html = renderAtsCvTemplate(content);
      expect(html).not.toContain('<h2>Selected Projects</h2>');
      expect(html).not.toContain('This should not appear');
    });

    it('does not render Volunteering section when volunteering array is empty', () => {
      const html = renderAtsCvTemplate(makeContent({ volunteering: [] }));
      expect(html).not.toContain('<h2>Volunteering</h2>');
    });

    it('renders Volunteering section when present', () => {
      const content = makeContent({
        volunteering: [
          {
            description: 'Helped at local coding school.',
            organization: 'CoderDojo',
          },
        ],
      });
      const html = renderAtsCvTemplate(content);
      expect(html).toContain('<h2>Volunteering</h2>');
      expect(html).toContain('Helped at local coding school.');
    });

    it('does not render Links section when links array is empty', () => {
      const html = renderAtsCvTemplate(makeContent({ links: [] }));
      expect(html).not.toContain('<h2>Links</h2>');
    });
  });

  // Candidate name and basic content
  describe('required content', () => {
    it('renders candidate name', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('Denys Strakhov');
    });

    it('renders headline', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        'Backend Developer | Node.js | TypeScript | REST APIs',
      );
    });

    it('renders summary lines', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain(
        'Experienced backend developer specialising in Node.js and TypeScript.',
      );
    });

    it('renders Professional Experience section with company and role', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('EPAM Systems');
      expect(html).toContain('Backend-focused Fullstack Developer');
    });

    it('renders Education section', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('<h2>Education</h2>');
      expect(html).toContain('KPI');
      expect(html).toContain('BSc Computer Science');
    });

    it('renders Languages section', () => {
      const html = renderAtsCvTemplate(makeContent());
      expect(html).toContain('<h2>Languages</h2>');
      expect(html).toContain('English');
      expect(html).toContain('German');
    });
  });
});

// ─── renderAtsCvTemplate with Prompt 3 corrections ────────────────────────────

describe('renderAtsCvTemplate with Prompt 3 corrections', () => {
  it('applies field-level correction to headline', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'headline',
        suggested_text: 'Senior Backend Developer | Node.js | TypeScript',
        severity: 'suggestion',
        reason: 'Better seniority signal',
      },
    ];
    const html = renderAtsCvTemplate(content, corrections);
    expect(html).toContain('Senior Backend Developer | Node.js | TypeScript');
    expect(html).not.toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );
  });

  it('applies nested correction to current_work_block.stable_intro', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'current_work_block.stable_intro',
        suggested_text: 'Improved intro sentence.',
        severity: 'suggestion',
        reason: 'More precise',
      },
    ];
    const html = renderAtsCvTemplate(content, corrections);
    expect(html).toContain('Improved intro sentence.');
    expect(html).not.toContain(
      'Active software development after relocating from Ukraine to Germany.',
    );
  });

  it('applies array element correction to summary[0]', () => {
    const content = makeContent();
    const corrections: PrePdfCheckCorrection[] = [
      {
        field_path: 'summary[0]',
        suggested_text: 'Updated summary line.',
        severity: 'suggestion',
        reason: 'Clearer phrasing',
      },
    ];
    const html = renderAtsCvTemplate(content, corrections);
    expect(html).toContain('Updated summary line.');
    expect(html).not.toContain(
      'Experienced backend developer specialising in Node.js',
    );
  });

  it('does not mutate the original content object', () => {
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
    renderAtsCvTemplate(content, corrections);
    expect(content.headline).toBe(originalHeadline);
  });

  it('renders unchanged when corrections array is empty', () => {
    const content = makeContent();
    const html = renderAtsCvTemplate(content, []);
    expect(html).toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );
    expect(html).toContain('EPAM Systems');
  });

  it('renders correctly when no corrections argument is provided', () => {
    const content = makeContent();
    const html = renderAtsCvTemplate(content);
    expect(html).toContain(
      'Backend Developer | Node.js | TypeScript | REST APIs',
    );
  });
});
