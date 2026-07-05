import { validatePrompt2Json } from './prompt2.schema';

function makeValidOutput(overrides: Record<string, unknown> = {}): object {
  return {
    schema_version: '1.0',
    step: 'prompt_2_targeted_cv_content',
    workspace_id: 'ws-test-1',
    decision_context: {
      prompt_1_decision: 'apply',
      user_approval: true,
      override: false,
    },
    target_strategy: {
      positioning: 'Backend TypeScript Developer',
      main_angle: 'Commercial Node.js/TypeScript backend experience.',
      risk_mitigation: ['Do not overclaim NestJS as commercial core skill.'],
    },
    cv_content: {
      headline: 'Backend Developer | Node.js | TypeScript',
      summary: ['Strong backend developer with commercial Node.js experience.'],
      top_skills: ['Node.js', 'TypeScript', 'PostgreSQL'],
      current_work_block: {
        include: true,
        safe_label: 'Current Independent Work & Portfolio Projects',
        role_line: 'Freelance Software Development & Portfolio Projects',
        dates: 'May 2025 - Present',
        stable_intro: 'Continued backend development after relocating to Germany.',
        bullets: [
          {
            text: 'Built NestJS/TypeScript portfolio project for CV generation.',
            priority: 'high',
            evidence_source: 'Project_Inventory.md',
            risk_level: 'low',
          },
        ],
        tech_stack: ['NestJS', 'TypeScript', 'PostgreSQL'],
      },
      experience: [
        {
          company: 'EPAM Systems',
          role: 'Backend Developer',
          dates: 'Nov 2021 - Apr 2025',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: [
            {
              text: 'Built Node.js microservices for e-commerce integrations.',
              priority: 'high',
              evidence_source: 'Career_Case_Deep_Dives.md',
              risk_level: 'low',
            },
          ],
          tech_stack: ['Node.js', 'TypeScript'],
        },
      ],
      selected_projects: [],
      certifications: [],
      rendering_hints: {
        density: 'normal',
        target_pages: 2,
        max_pages: 3,
        strong_match_allows_page_3: false,
        optional_sections_to_hide_first: [],
      },
    },
    evidence_table: [
      {
        claim: 'Commercial Node.js experience',
        support: 'EPAM backend services',
        source: 'Tech_Stack_Matrix.md',
        status: 'supported',
      },
    ],
    overclaiming_check: {
      critical_issues: [],
      warnings: [],
      needs_evidence: [],
    },
    pdf_readiness_notes: {
      estimated_page_count: 2,
      layout_risks: [],
      recommended_next_step: 'Review and export PDF.',
    },
    ...overrides,
  };
}

describe('validatePrompt2Json', () => {
  it('accepts valid JSON with 1 bullet per experience item', () => {
    const result = validatePrompt2Json(JSON.stringify(makeValidOutput()));
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('accepts variable bullet counts — 3 bullets per experience item', () => {
    const output = makeValidOutput();
    const cv = (output as Record<string, unknown>)['cv_content'] as Record<
      string,
      unknown
    >;
    const exp = cv['experience'] as Record<string, unknown>[];
    exp[0]['bullets'] = [
      { text: 'Bullet 1.', priority: 'high', evidence_source: 'source.md' },
      { text: 'Bullet 2.', priority: 'medium', evidence_source: 'source.md' },
      { text: 'Bullet 3.', priority: 'low', evidence_source: 'source.md' },
    ];

    const result = validatePrompt2Json(JSON.stringify(output));
    expect(result.success).toBe(true);
    const expItem = result.data!.cv_content.experience[0];
    expect(expItem.bullets).toHaveLength(3);
  });

  it('accepts selected_projects with all required fields', () => {
    const output = makeValidOutput();
    const cv = (output as Record<string, unknown>)['cv_content'] as Record<
      string,
      unknown
    >;
    cv['selected_projects'] = [
      {
        title: 'AI Job Assistant',
        project_type: 'current_personal_project',
        include: true,
        safe_label: 'Current Personal Project',
        relevance_reason: 'Relevant for AI-assisted workflow roles.',
        display_priority: 'high',
        bullets: [
          {
            text: 'Built backend workflow for CV generation.',
            priority: 'high',
            evidence_source: 'Project_Inventory.md',
          },
        ],
        tech_stack: ['TypeScript', 'NestJS', 'PostgreSQL'],
      },
    ];

    const result = validatePrompt2Json(JSON.stringify(output));
    expect(result.success).toBe(true);

    const project = result.data!.cv_content.selected_projects[0];
    expect(project.include).toBe(true);
    expect(project.project_type).toBe('current_personal_project');
    expect(project.relevance_reason).toBeDefined();
    expect(project.display_priority).toBe('high');
    expect(project.safe_label).toBe('Current Personal Project');
    expect(project.bullets).toHaveLength(1);
    expect(project.tech_stack).toContain('NestJS');
  });

  it('personal/current projects are stored separately from commercial experience', () => {
    const output = makeValidOutput();
    const cv = (output as Record<string, unknown>)['cv_content'] as Record<
      string,
      unknown
    >;
    cv['selected_projects'] = [
      {
        title: 'Personal Project',
        project_type: 'current_personal_project',
        include: true,
        safe_label: 'Current Personal Project',
        relevance_reason: 'Relevant.',
        display_priority: 'high',
        bullets: [{ text: 'Built something.', priority: 'high' }],
        tech_stack: ['TypeScript'],
      },
    ];

    const result = validatePrompt2Json(JSON.stringify(output));
    expect(result.success).toBe(true);

    const experienceTypes = result.data!.cv_content.experience.map(
      (e) => e.experience_type,
    );
    const projectTypes = result.data!.cv_content.selected_projects.map(
      (p) => p.project_type,
    );

    expect(experienceTypes).toContain('commercial');
    expect(experienceTypes).not.toContain('current_personal_project');
    expect(projectTypes).toContain('current_personal_project');
    expect(projectTypes).not.toContain('commercial');
  });

  it('accepts valid current_work_block with all required fields', () => {
    const result = validatePrompt2Json(JSON.stringify(makeValidOutput()));
    expect(result.success).toBe(true);
    const cwb = result.data!.cv_content.current_work_block;
    expect(cwb.include).toBe(true);
    expect(cwb.safe_label).toBe('Current Independent Work & Portfolio Projects');
    expect(cwb.bullets).toHaveLength(1);
    expect(cwb.tech_stack).toContain('NestJS');
  });

  it('rejects missing current_work_block', () => {
    const output = makeValidOutput() as Record<string, unknown>;
    const cv = output['cv_content'] as Record<string, unknown>;
    delete cv['current_work_block'];
    const result = validatePrompt2Json(JSON.stringify(output));
    expect(result.success).toBe(false);
    expect(result.error).toContain('current_work_block');
  });

  it('returns error when cv_content is missing', () => {
    const output = makeValidOutput();
    delete (output as Record<string, unknown>)['cv_content'];

    const result = validatePrompt2Json(JSON.stringify(output));
    expect(result.success).toBe(false);
    expect(result.error).toContain('cv_content');
  });

  it('returns error for invalid (non-JSON) input', () => {
    const result = validatePrompt2Json('this is not json at all');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });
});
