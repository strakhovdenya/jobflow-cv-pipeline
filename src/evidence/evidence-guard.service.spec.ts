import { EvidenceItem } from '@prisma/client';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
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
  projectBullets?: string[];
  projectTech?: string[];
  evidenceTable?: {
    claim: string;
    support: string | null;
    source: string | null;
    status: string;
  }[];
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
          company: 'EPAM Systems',
          role: 'Developer',
          dates: '2021-2025',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: (
            overrides.experienceBullets ?? ['Built Node.js services.']
          ).map((text) => ({
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
          bullets: (overrides.projectBullets ?? []).map((text) => ({
            text,
            priority: 'medium',
            evidence_source: null,
            risk_level: null,
          })),
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
  };
}

function makeEvidenceItem(
  claimArea: string,
  category = 'allowed',
): EvidenceItem {
  return {
    id: `ev-${claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    claimArea,
    category,
    description: `Evidence for ${claimArea}`,
    notes: null,
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
});
