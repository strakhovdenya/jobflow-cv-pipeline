import { EvidenceItem } from '@prisma/client';
import {
  TargetedCvBullet,
  TargetedCvContentOutput,
} from '../pipeline/schemas/targeted-cv-content.schema';
import { evidenceItems as seededEvidenceItems } from '../../prisma/seed';
import { EvidenceGuardService } from './evidence-guard.service';

// Minimal TargetedCvContentOutput factory — only sets fields the guard reads.
// All other required fields carry neutral values to avoid triggering patterns.
function makeOutput(overrides: {
  positioning?: string;
  mainAngle?: string;
  headline?: string;
  summary?: string[];
  topSkills?: string[];
  experienceBullets?: string[];
  experienceTech?: string[];
  experienceCompany?: string;
  projectBullets?: string[];
  projectTech?: string[];
  evidenceTable?: {
    claim: string;
    support: string | null;
    source: string | null;
    status: string;
  }[];
  manualNoteForcedClaims?: { location: string; text: string }[];
}): TargetedCvContentOutput {
  return {
    schema_version: '1.0',
    step: 'prompt_2_targeted_cv_content',
    workspace_id: 'ws-test',
    decision_context: {
      prompt_1_decision: 'apply',
      user_approval: true,
      override: false,
    },
    target_strategy: {
      positioning: overrides.positioning ?? 'Backend Developer',
      main_angle: overrides.mainAngle ?? 'Node.js backend development.',
      risk_mitigation: [],
    },
    cv_content: {
      headline: overrides.headline ?? 'Backend Developer',
      summary: overrides.summary ?? ['Experienced backend developer.'],
      top_skills: overrides.topSkills ?? ['Node.js', 'TypeScript'],
      current_work_block: {
        include: true,
        safe_label: 'Current Independent Work & Portfolio Projects',
        role_line: 'Freelance Software Development & Portfolio Projects',
        dates: 'May 2025 - Present',
        stable_intro:
          'Continued backend development after relocating to Germany.',
        bullets: [],
        tech_stack: ['NestJS', 'TypeScript'],
      },
      experience: [
        {
          company: overrides.experienceCompany ?? 'EPAM Systems',
          role: 'Developer',
          dates: '2021-2025',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: (
            overrides.experienceBullets ?? ['Built Node.js services.']
          ).map((text): TargetedCvBullet => ({
            text,
            priority: 'high',
            evidence_source: null,
            risk_level: null,
          })),
          tech_stack: overrides.experienceTech ?? ['Node.js', 'TypeScript'],
        },
      ],
      selected_projects: [
        {
          title: 'Portfolio Project',
          project_type: 'personal_project',
          include: true,
          safe_label: 'Personal Project',
          relevance_reason: 'Relevant',
          display_priority: 'high',
          bullets: (overrides.projectBullets ?? []).map(
            (text): TargetedCvBullet => ({
              text,
              priority: 'medium',
              evidence_source: null,
              risk_level: null,
            }),
          ),
          tech_stack: overrides.projectTech ?? [],
        },
      ],
      certifications: [],
      rendering_hints: {
        density: 'normal',
        target_pages: 2,
        max_pages: 3,
        strong_match_allows_page_3: false,
        optional_sections_to_hide_first: [],
      },
    },
    quality_score: 80,
    requirement_coverage: [],
    evidence_table: overrides.evidenceTable ?? [],
    overclaiming_check: {
      critical_issues: [],
      warnings: [],
      needs_evidence: [],
    },
    pdf_readiness_notes: {
      estimated_page_count: 2,
      layout_risks: [],
      recommended_next_step: 'Review and export.',
    },
    manual_note_forced_claims: overrides.manualNoteForcedClaims ?? [],
  };
}

function makeEvidenceItem(
  claimArea: string,
  category = 'allowed',
  employers: string[] = [],
): EvidenceItem {
  return {
    id: `ev-${claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    claimArea,
    category,
    description: `Evidence for ${claimArea}`,
    notes: null,
    employers,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('EvidenceGuardService', () => {
  let service: EvidenceGuardService;

  beforeEach(() => {
    service = new EvidenceGuardService();
  });

  // ─── Clean input ─────────────────────────────────────────────────────────────

  it('returns empty result for clean output with no risky patterns', () => {
    const output = makeOutput({});
    const result = service.checkOutput(output, [
      makeEvidenceItem('Node.js'),
      makeEvidenceItem('TypeScript'),
    ]);
    expect(result.critical_issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.needs_evidence).toHaveLength(0);
  });

  // ─── warnings always [] ───────────────────────────────────────────────────────

  it('always returns empty warnings array regardless of input', () => {
    const output = makeOutput({
      headline: 'Kubernetes production experience required',
    });
    const result = service.checkOutput(output, []);
    expect(result.warnings).toEqual([]);
  });

  // ─── 17 Critical pattern tests ────────────────────────────────────────────────

  it('pattern 1: flags commercial AI/RAG production experience', () => {
    const output = makeOutput({
      positioning: 'Commercial AI production experience in RAG systems.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial AI/RAG production experience is not supported by evidence',
    );
  });

  it('pattern 2: flags commercial NestJS production experience', () => {
    const output = makeOutput({
      positioning: 'Commercial NestJS production backend developer.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial NestJS production experience is not supported',
    );
  });

  it('pattern 3: flags commercial NestJS EPAM production stack', () => {
    const output = makeOutput({
      mainAngle: 'NestJS EPAM production stack for microservices.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial NestJS EPAM production stack claim is not supported',
    );
  });

  it('pattern 4: flags commercial JobFlow production experience', () => {
    const output = makeOutput({
      headline: 'Commercial JobFlow production pipeline engineer.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial JobFlow/OpenAI production experience is not supported',
    );
  });

  it('pattern 4b: flags commercial OpenAI production experience', () => {
    const output = makeOutput({
      headline: 'Commercial OpenAI production integration specialist.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial JobFlow/OpenAI production experience is not supported',
    );
  });

  it('pattern 5: flags commercial MCP production experience', () => {
    const output = makeOutput({
      summary: ['Commercial MCP production experience at scale.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Commercial MCP production experience is not supported',
    );
  });

  it('pattern 6: flags Docker production ownership', () => {
    const output = makeOutput({
      experienceBullets: [
        'Responsible for Docker production ownership on AWS.',
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Docker production ownership is not supported by evidence',
    );
  });

  it('pattern 7: flags Kubernetes production experience', () => {
    const output = makeOutput({
      experienceBullets: ['Kubernetes production cluster management.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Kubernetes production experience is not supported',
    );
  });

  it('pattern 8: flags AWS production experience', () => {
    const output = makeOutput({
      experienceBullets: ['AWS production deployment and operations.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'AWS production experience is not supported without evidence',
    );
  });

  it('pattern 9: flags Kafka production experience', () => {
    const output = makeOutput({
      experienceBullets: ['Kafka production event streaming architecture.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Kafka production experience is not supported',
    );
  });

  it('pattern 10: flags AI Engineer job title', () => {
    const output = makeOutput({
      headline: 'AI Engineer | NestJS | TypeScript',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'AI Engineer as a job title or role claim is not supported',
    );
  });

  it('pattern 11: flags LLM platform engineer claim', () => {
    const output = makeOutput({
      positioning: 'LLM platform engineer with production experience.',
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'LLM platform engineer claim is not supported',
    );
  });

  it('pattern 12: flags production Claude Code automation', () => {
    const output = makeOutput({
      experienceBullets: [
        'Built production Claude Code automation workflows for CI/CD.',
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Production Claude Code automation is not supported',
    );
  });

  it('pattern 13: flags agentic AI production experience', () => {
    const output = makeOutput({
      summary: ['Agentic AI production pipelines and tooling.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Agentic AI production experience is not supported',
    );
  });

  it('pattern 13: does not flag production-style agentic AI workflow wording', () => {
    const output = makeOutput({
      projectBullets: [
        'Designed a production-style agentic AI workflow with a sandboxed coding agent.',
        'Applied production-grade design to an agentic AI pipeline in a personal project.',
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).not.toContain(
      'Agentic AI production experience is not supported',
    );
  });

  it('pattern 13: does not flag non-commercial agentic AI framing', () => {
    const output = makeOutput({
      projectBullets: [
        'Built an agentic AI workflow with a sandboxed coding agent in a non-commercial personal project.',
        'Agentic AI workflow, not commercial.',
        'Designed a production–grade agentic AI review loop.',
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).not.toContain(
      'Agentic AI production experience is not supported',
    );
  });

  it('pattern 12: does not flag production-style Claude Code automation wording', () => {
    const output = makeOutput({
      projectBullets: [
        'Designed a production-style Claude Code automation loop driving a sandboxed agent.',
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).not.toContain(
      'Production Claude Code automation is not supported',
    );
  });

  it('pattern 13: still flags production agentic AI experience after narrowing', () => {
    const output = makeOutput({
      summary: ['Built production agentic AI systems for enterprise clients.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Agentic AI production experience is not supported',
    );
  });

  it('pattern 13: flags commercial agentic AI experience', () => {
    const output = makeOutput({
      experienceBullets: ['Delivered commercial agentic AI solutions.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Agentic AI production experience is not supported',
    );
  });

  it('pattern 14: flags fluent English claim', () => {
    const output = makeOutput({
      summary: ['Fluent English speaker and writer.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Fluent English claim requires explicit evidence',
    );
  });

  it('pattern 15: flags professional German claim', () => {
    const output = makeOutput({
      summary: ['Professional German communication skills.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'Professional German claim requires explicit evidence',
    );
  });

  it('pattern 16: flags DynamoDB production experience', () => {
    const output = makeOutput({
      experienceBullets: ['DynamoDB production data modeling and scaling.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'DynamoDB production experience is not supported without evidence',
    );
  });

  it('pattern 17: flags MySQL production experience', () => {
    const output = makeOutput({
      experienceBullets: ['MySQL production database administration.'],
    });
    const result = service.checkOutput(output, []);
    expect(result.critical_issues).toContain(
      'MySQL production experience is not supported without evidence',
    );
  });

  // ─── Conservative rule ────────────────────────────────────────────────────────

  it('conservative: Kubernetes pattern flagged as critical even when EvidenceItem exists', () => {
    const output = makeOutput({
      experienceBullets: ['Kubernetes production cluster management.'],
    });
    const evidenceItems = [makeEvidenceItem('Kubernetes', 'risky')];
    const result = service.checkOutput(output, evidenceItems);
    expect(result.critical_issues).toContain(
      'Kubernetes production experience is not supported',
    );
  });

  // ─── Deduplication ───────────────────────────────────────────────────────────

  it('deduplicates: same pattern matched in headline and bullet returns one critical_issues entry', () => {
    const output = makeOutput({
      headline: 'Kubernetes production engineer',
      experienceBullets: [
        'Kubernetes production cluster setup and management.',
      ],
    });
    const result = service.checkOutput(output, []);
    const count = result.critical_issues.filter(
      (m) => m === 'Kubernetes production experience is not supported',
    ).length;
    expect(count).toBe(1);
  });

  // ─── needs_evidence: source 1 (evidence_table) ───────────────────────────────

  it('needs_evidence: includes claim from evidence_table with status "needs evidence"', () => {
    const output = makeOutput({
      evidenceTable: [
        {
          claim: 'AWS production experience',
          support: null,
          source: null,
          status: 'needs evidence',
        },
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.needs_evidence).toContain('AWS production experience');
  });

  it('needs_evidence: does not include evidence_table entries with status "supported"', () => {
    const output = makeOutput({
      evidenceTable: [
        {
          claim: 'Node.js backend',
          support: 'EPAM projects',
          source: 'Tech_Stack_Matrix.md',
          status: 'supported',
        },
      ],
    });
    const result = service.checkOutput(output, [makeEvidenceItem('Node.js')]);
    expect(result.needs_evidence).not.toContain('Node.js backend');
  });

  it('needs_evidence (ADR-034): does not include evidence_table entries with status "user-forced, unverified"', () => {
    const output = makeOutput({
      evidenceTable: [
        {
          claim: 'EGZ integration experience',
          support: null,
          source: 'manual note',
          status: 'user-forced, unverified',
        },
      ],
    });
    const result = service.checkOutput(
      output,
      [],
      [{ text: 'EGZ integration experience' }],
    );
    expect(result.needs_evidence).not.toContain('EGZ integration experience');
  });

  describe('forced markers vs workspace manual notes (ADR-034)', () => {
    const CLAIM = 'EGZ integration experience';

    function makeForcedOutput(claim = CLAIM): TargetedCvContentOutput {
      const output = makeOutput({
        experienceBullets: [claim],
        evidenceTable: [
          {
            claim,
            support: null,
            source: 'manual note',
            status: 'user-forced, unverified',
          },
        ],
        manualNoteForcedClaims: [
          { location: 'cv_content.experience[0].bullets[0]', text: claim },
        ],
      });
      output.cv_content.experience[0].bullets[0].user_forced = true;
      return output;
    }

    it('keeps forced marker when a manual note matches the claim', () => {
      const output = makeForcedOutput();

      const result = service.checkOutput(output, [], [{ text: CLAIM }]);

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(true);
      expect(output.evidence_table[0].status).toBe('user-forced, unverified');
      expect(output.manual_note_forced_claims).toHaveLength(1);
      expect(result.needs_evidence).not.toContain(CLAIM);
    });

    it('strips forced marker when no manual note matches the claim', () => {
      const output = makeForcedOutput();

      const result = service.checkOutput(
        output,
        [],
        [{ text: 'Unrelated recruiter remark' }],
      );

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(
        undefined,
      );
      expect(output.evidence_table[0].status).toBe('needs evidence');
      expect(output.manual_note_forced_claims).toEqual([]);
      expect(result.needs_evidence).toContain(CLAIM);
    });

    it('strips forced markers when the workspace has no manual notes', () => {
      const output = makeForcedOutput();

      const result = service.checkOutput(output, []);

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(
        undefined,
      );
      expect(output.manual_note_forced_claims).toEqual([]);
      expect(result.needs_evidence).toContain(CLAIM);
    });

    it('matches manual note ignoring case and whitespace', () => {
      const output = makeForcedOutput('EGZ   integration\nexperience');

      service.checkOutput(
        output,
        [],
        [{ text: '  egz Integration Experience ' }],
      );

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(true);
    });

    it('keeps forced marker when the note contains the claim key phrase', () => {
      const output = makeForcedOutput('EGZ');

      const result = service.checkOutput(
        output,
        [],
        [{ text: 'EGZ добавляй в CV как опыт интеграции' }],
      );

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(true);
      expect(result.needs_evidence).not.toContain('EGZ');
    });

    it('never matches an empty forced claim', () => {
      const output = makeForcedOutput('   ');

      service.checkOutput(output, [], [{ text: 'any note' }, { text: '' }]);

      expect(output.cv_content.experience[0].bullets[0].user_forced).toBe(
        undefined,
      );
      expect(output.manual_note_forced_claims).toEqual([]);
    });

    it('strips forced marker from a project bullet too', () => {
      const output = makeOutput({ projectBullets: ['5 years of AWS'] });
      output.cv_content.selected_projects[0].bullets[0].user_forced = true;

      const result = service.checkOutput(output, [], []);

      expect(
        output.cv_content.selected_projects[0].bullets[0].user_forced,
      ).toBe(undefined);
      expect(result.needs_evidence).toContain('5 years of AWS');
    });
  });

  // ─── needs_evidence: source 2 (tech with no EvidenceItem) ────────────────────

  it('needs_evidence: tech skill with no matching EvidenceItem is added', () => {
    const output = makeOutput({ topSkills: ['DynamoDB'] });
    const result = service.checkOutput(output, [makeEvidenceItem('Node.js')]);
    expect(result.needs_evidence).toContain('DynamoDB');
  });

  it('needs_evidence: tech skill with matching EvidenceItem claimArea is NOT added', () => {
    const output = makeOutput({ topSkills: ['Node.js'] });
    const result = service.checkOutput(output, [makeEvidenceItem('Node.js')]);
    expect(result.needs_evidence).not.toContain('Node.js');
  });

  it('needs_evidence: an unsupported EvidenceItem does not count as support', () => {
    const output = makeOutput({ topSkills: ['Kubernetes'] });
    const result = service.checkOutput(output, [
      makeEvidenceItem('Kubernetes', 'unsupported'),
    ]);
    expect(result.needs_evidence).toContain('Kubernetes');
  });

  it('needs_evidence: allowed and risky EvidenceItems still count as support', () => {
    const output = makeOutput({
      topSkills: ['Node.js', 'NestJS'],
      experienceTech: ['Node.js'],
    });
    const result = service.checkOutput(output, [
      makeEvidenceItem('Node.js', 'allowed'),
      makeEvidenceItem('NestJS', 'risky'),
    ]);
    expect(result.needs_evidence).toEqual([]);
  });

  it('needs_evidence (ADR-034): a tech skill named in manual_note_forced_claims is NOT flagged', () => {
    const output = makeOutput({
      topSkills: ['EGZ'],
      manualNoteForcedClaims: [
        { location: 'cv_content.top_skills[2]', text: 'EGZ добавляй' },
      ],
    });
    const result = service.checkOutput(
      output,
      [makeEvidenceItem('Node.js')],
      [{ text: 'EGZ добавляй' }],
    );
    expect(result.needs_evidence).not.toContain('EGZ');
  });

  it('needs_evidence (ADR-034): an unrelated tech skill is still flagged even when a manual note exists', () => {
    const output = makeOutput({
      topSkills: ['EGZ', 'DynamoDB'],
      manualNoteForcedClaims: [
        { location: 'cv_content.top_skills[2]', text: 'EGZ добавляй' },
      ],
    });
    const result = service.checkOutput(
      output,
      [makeEvidenceItem('Node.js')],
      [{ text: 'EGZ добавляй' }],
    );
    expect(result.needs_evidence).not.toContain('EGZ');
    expect(result.needs_evidence).toContain('DynamoDB');
  });

  it('needs_evidence (ADR-034): a short skill name is not falsely exempted by matching a substring inside an unrelated forced word (e.g. "Go" inside "MongoDB")', () => {
    const output = makeOutput({
      topSkills: ['Go'],
      manualNoteForcedClaims: [
        {
          location: 'cv_content.top_skills[3]',
          text: 'please add MongoDB support',
        },
      ],
    });
    const result = service.checkOutput(output, [makeEvidenceItem('Node.js')]);
    expect(result.needs_evidence).toContain('Go');
  });

  it('needs_evidence (ADR-034): a genuinely forced skill still matches as a whole word inside a longer forced note', () => {
    const output = makeOutput({
      topSkills: ['MongoDB'],
      manualNoteForcedClaims: [
        {
          location: 'cv_content.top_skills[3]',
          text: 'please add MongoDB support',
        },
      ],
    });
    const result = service.checkOutput(
      output,
      [makeEvidenceItem('Node.js')],
      [{ text: 'please add MongoDB support' }],
    );
    expect(result.needs_evidence).not.toContain('MongoDB');
  });

  it('needs_evidence (ADR-034): an empty-string skill name is never treated as forced, even with a forced signal present', () => {
    const output = makeOutput({
      topSkills: [''],
      manualNoteForcedClaims: [
        {
          location: 'cv_content.top_skills[3]',
          text: 'please add something',
        },
      ],
    });
    const result = service.checkOutput(output, []);
    expect(result.needs_evidence).toContain('');
  });

  it('needs_evidence (ADR-034): a skill with symbol edges (e.g. "C++") falls back to substring matching, not word-boundary regex', () => {
    const output = makeOutput({
      topSkills: ['C++'],
      manualNoteForcedClaims: [
        {
          location: 'cv_content.top_skills[3]',
          text: 'please add C++ support',
        },
      ],
    });
    const result = service.checkOutput(
      output,
      [makeEvidenceItem('Node.js')],
      [{ text: 'please add C++ support' }],
    );
    expect(result.needs_evidence).not.toContain('C++');
  });

  // ─── needs_evidence: source 3 (experience tech_stack per employer) ───────────

  describe('per-entry employer scope', () => {
    const EPAM = 'EPAM Systems';
    const FACTOR_IT = 'Factor–IT';

    it('per-entry: flags a tech_stack name scoped to another employer', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: FACTOR_IT,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [EPAM]),
      ]);
      expect(result.needs_evidence).toContain(`React (${FACTOR_IT})`);
    });

    it('per-entry: does not flag a tech_stack name scoped to the same employer', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: EPAM,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [EPAM]),
      ]);
      expect(result.needs_evidence).toEqual([]);
    });

    it('per-entry: any listed employer counts as support', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: FACTOR_IT,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [EPAM, FACTOR_IT]),
      ]);
      expect(result.needs_evidence).toEqual([]);
    });

    it('per-entry: matches employer names ignoring case and surrounding whitespace', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: EPAM,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [' epam systems ']),
      ]);
      expect(result.needs_evidence).toEqual([]);
    });

    it('per-entry: an unscoped EvidenceItem supports every employer', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: FACTOR_IT,
        experienceTech: ['PostgreSQL'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('PostgreSQL', 'allowed', []),
      ]);
      expect(result.needs_evidence).toEqual([]);
    });

    it('per-entry: employer scope does not apply to top_skills and projects', () => {
      const output = makeOutput({
        topSkills: ['React'],
        experienceTech: [],
        projectTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [EPAM]),
      ]);
      expect(result.needs_evidence).toEqual([]);
    });

    it('per-entry: a name in top_skills is still flagged in another employer entry', () => {
      const output = makeOutput({
        topSkills: ['React'],
        experienceCompany: FACTOR_IT,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'risky', [EPAM]),
      ]);
      expect(result.needs_evidence).toEqual([`React (${FACTOR_IT})`]);
    });

    it('per-entry: an unsupported scoped EvidenceItem does not count as support', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: EPAM,
        experienceTech: ['React'],
      });
      const result = service.checkOutput(output, [
        makeEvidenceItem('React', 'unsupported', [EPAM]),
      ]);
      expect(result.needs_evidence).toContain(`React (${EPAM})`);
    });

    it('per-entry (ADR-034): a forced tech_stack name is not flagged for another employer', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: FACTOR_IT,
        experienceTech: ['React'],
        manualNoteForcedClaims: [
          {
            location: 'cv_content.experience[0].tech_stack[0]',
            text: 'add React to Factor–IT',
          },
        ],
      });
      const result = service.checkOutput(
        output,
        [makeEvidenceItem('React', 'risky', [EPAM])],
        [{ text: 'add React to Factor–IT' }],
      );
      expect(result.needs_evidence).toEqual([]);
    });
  });

  // ─── False-positive test ─────────────────────────────────────────────────────

  it('false-positive check: text about Kubernetes documentation for learning does NOT trigger pattern 7', () => {
    // Pattern 7: /Kubernetes.{0,30}production|production.{0,30}Kubernetes/i
    // This text has "Kubernetes" and "production" but separated by >30 chars,
    // and the production mention refers to the environment context, not experience.
    const output = makeOutput({
      experienceBullets: [
        'Production environment uses Kubernetes documentation for learning purposes only.',
      ],
    });
    const result = service.checkOutput(output, []);
    // NOTE: If this assertion fails, the pattern is a false positive.
    // DO NOT change the pattern silently — report to user for decision.
    expect(result.critical_issues).not.toContain(
      'Kubernetes production experience is not supported',
    );
  });

  // ─── Seeded EvidenceItem rows (prisma/seed.ts) ───────────────────────────────

  describe('seeded evidence items', () => {
    const seeded = seededEvidenceItems.map((item) =>
      makeEvidenceItem(item.claimArea, item.category, item.employers ?? []),
    );

    it('seeded evidence items cover Redis and the EPAM commercial stack', () => {
      const skills = [
        'Redis',
        'Cosmos DB',
        'Azure Blob Storage',
        'CommerceTools',
        'Amplience',
        'ProductsUp Stream API',
        'Azure Durable Functions',
        'Terraform',
      ];
      const output = makeOutput({ topSkills: skills, experienceTech: skills });
      const result = service.checkOutput(output, seeded);
      expect(result.needs_evidence).toEqual([]);
    });

    it('seeded evidence items cover the personal GitHub and JSON Schema skills', () => {
      const skills = ['GitHub Actions', 'GitHub Issues', 'JSON Schema', 'Git'];
      const output = makeOutput({ topSkills: skills, projectTech: skills });
      const result = service.checkOutput(output, seeded);
      expect(result.needs_evidence).toEqual([]);
    });

    it('seeded evidence items still flag unsupported skills', () => {
      const skills = [
        'Kubernetes',
        'AWS',
        'Express',
        'MongoDB',
        'OpenAI Codex',
      ];
      const output = makeOutput({ topSkills: skills });
      const result = service.checkOutput(output, seeded);
      expect(result.needs_evidence).toEqual(expect.arrayContaining(skills));
    });

    const EPAM_FRONTEND_STACK = ['React', 'Next.js', 'GraphQL'];

    it('seeded data: flags EPAM-only frontend stack in a Factor–IT entry', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: 'Factor–IT',
        experienceTech: EPAM_FRONTEND_STACK,
      });
      const result = service.checkOutput(output, seeded);
      expect(result.needs_evidence).toEqual(
        expect.arrayContaining(
          EPAM_FRONTEND_STACK.map((tech) => `${tech} (Factor–IT)`),
        ),
      );
    });

    it('seeded data: does not flag EPAM frontend stack in the EPAM entry', () => {
      const output = makeOutput({
        topSkills: [],
        experienceCompany: 'EPAM Systems',
        experienceTech: EPAM_FRONTEND_STACK,
      });
      const result = service.checkOutput(output, seeded);
      expect(result.needs_evidence).toEqual([]);
    });

    it('seeded evidence items have unique claim areas and a valid category', () => {
      const claimAreas = seededEvidenceItems.map((item) => item.claimArea);
      expect(new Set(claimAreas).size).toBe(claimAreas.length);
      for (const item of seededEvidenceItems) {
        expect(['allowed', 'risky', 'unsupported']).toContain(item.category);
      }
    });
  });
});
