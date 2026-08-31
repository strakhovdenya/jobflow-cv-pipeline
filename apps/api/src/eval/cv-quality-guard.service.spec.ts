import * as fs from 'fs';
import * as path from 'path';

import {
  TargetedCvContentOutput,
  TargetedCvCurrentWorkBlock,
  TargetedCvExperienceItem,
} from '../pipeline/schemas/targeted-cv-content.schema';
import {
  CvQualityGuardService,
  CvQualityReport,
  CvViolation,
} from './cv-quality-guard.service';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeBullets(texts: string[]) {
  return texts.map((text) => ({ text, priority: 'medium' }));
}

function makeCwb(
  bulletTexts: string[],
  overrides: Partial<TargetedCvCurrentWorkBlock> = {},
): TargetedCvCurrentWorkBlock {
  return {
    include: true,
    safe_label: 'Current Independent Work & Portfolio Projects',
    role_line: 'Freelance Software Development & Portfolio Projects',
    dates: 'May 2025 – Present',
    stable_intro: 'Continued backend work after relocating to Germany.',
    bullets: makeBullets(bulletTexts),
    tech_stack: ['NestJS', 'TypeScript'],
    ...overrides,
  };
}

function makeEpam(bulletTexts: string[]): TargetedCvExperienceItem {
  return {
    company: 'EPAM Systems',
    role: 'Software Engineer',
    dates: 'Sep 2021 – May 2025',
    experience_type: 'commercial',
    can_split_across_pages: true,
    bullets: makeBullets(bulletTexts),
    tech_stack: ['Node.js', 'TypeScript', 'Azure'],
  };
}

function makeFactorIt(bulletTexts: string[]): TargetedCvExperienceItem {
  return {
    company: 'Factor–IT',
    role: 'PHP Backend Developer',
    dates: 'Dec 2016 – Jun 2021',
    experience_type: 'commercial',
    can_split_across_pages: true,
    bullets: makeBullets(bulletTexts),
    tech_stack: ['PHP', 'PostgreSQL'],
  };
}

function makeChi(bulletTexts: string[]): TargetedCvExperienceItem {
  return {
    company: 'CHI Software',
    role: 'Node.js Developer Intern',
    dates: 'Jul 2021 – Oct 2021',
    experience_type: 'commercial',
    can_split_across_pages: false,
    bullets: makeBullets(bulletTexts),
    tech_stack: ['Node.js'],
  };
}

function makeOutput(
  overrides: {
    headline?: string;
    summary?: string[];
    topSkills?: string[];
    cwbBullets?: string[];
    cwb?: TargetedCvCurrentWorkBlock;
    experience?: TargetedCvExperienceItem[];
    requirementCoverage?: TargetedCvContentOutput['requirement_coverage'];
    manualNoteForcedClaims?: { location: string; text: string }[];
  } = {},
): TargetedCvContentOutput {
  const epam6Bullets = [
    'Built backend API integrations.',
    'Maintained production workflows.',
    'Debugged production issues.',
    'Wrote unit tests.',
    'Collaborated with frontend team.',
    'Supported data migration tasks.',
  ];
  const factor4Bullets = [
    'Developed financial backend logic.',
    'Maintained PostgreSQL databases.',
    'Wrote backend unit tests.',
    'Improved data integrity.',
  ];
  const chi1Bullet = ['Completed Node.js internship tasks.'];

  const defaultCwbBullets = [
    'Built JobFlow CV Pipeline — a personal NestJS backend project for AI-assisted CV generation.',
    'Continued Python/FastAPI backend learning through personal projects.',
    'Volunteered as IT Technician at HEY, ALTER! Köln e.V.',
    'Supported small Node.js/React improvements on an independent basis.',
  ];

  const defaultExp = [
    makeEpam(epam6Bullets),
    makeFactorIt(factor4Bullets),
    makeChi(chi1Bullet),
  ];

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
      positioning: 'Backend Developer',
      main_angle: 'Node.js backend development.',
      risk_mitigation: [],
    },
    requirement_coverage: overrides.requirementCoverage ?? [],
    cv_content: {
      headline:
        overrides.headline ??
        'Backend Developer | Node.js · TypeScript · Azure',
      summary: overrides.summary ?? [
        'Backend-focused Software Engineer with strong commercial Node.js/TypeScript experience.',
      ],
      top_skills: overrides.topSkills ?? ['Node.js', 'TypeScript', 'Azure'],
      current_work_block:
        overrides.cwb ?? makeCwb(overrides.cwbBullets ?? defaultCwbBullets),
      experience: overrides.experience ?? defaultExp,
      selected_projects: [],
      certifications: [],
      rendering_hints: {
        density: 'comfortable',
        target_pages: 2,
        max_pages: 2,
        strong_match_allows_page_3: false,
        optional_sections_to_hide_first: [],
      },
    },
    quality_score: 80,
    evidence_table: [],
    overclaiming_check: {
      critical_issues: [],
      warnings: [],
      needs_evidence: [],
    },
    pdf_readiness_notes: {
      estimated_page_count: 2,
      layout_risks: [],
      recommended_next_step: 'export',
    },
    manual_note_forced_claims: overrides.manualNoteForcedClaims ?? [],
  };
}

// ─── Service setup ────────────────────────────────────────────────────────────

describe('CvQualityGuardService', () => {
  let service: CvQualityGuardService;

  beforeEach(() => {
    service = new CvQualityGuardService();
  });

  // ── AC #1: BOP patterns ────────────────────────────────────────────────────

  describe('AC#1 BOP patterns', () => {
    it('passes when no BOP pattern is present', () => {
      const report = service.check(makeOutput());
      const bop = report.violations.filter((v) => v.type === 'bop_pattern');
      expect(bop).toHaveLength(0);
    });

    it('flags "structured upskilling" in a summary line', () => {
      const output = makeOutput({
        summary: ['Continued structured upskilling in backend technologies.'],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('structured upskilling')),
      ).toBe(true);
    });

    it('flags "maintained/contributed" in an experience bullet', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Built backend services.',
            'Debugged production issues.',
            'Supported the team.',
            'Wrote unit tests.',
            'maintained/contributed to legacy services.',
            'Improved data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('maintained/contributed')),
      ).toBe(true);
    });

    it('flags "artifact traceability" in a current_work_block bullet', () => {
      const output = makeOutput({
        cwbBullets: [
          'Built JobFlow — personal NestJS project with artifact traceability and prompt versioning.',
          'Continued Python/FastAPI backend learning.',
          'Volunteered as IT Technician at HEY, ALTER!',
          'Supported small Node.js/React improvements.',
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('artifact traceability')),
      ).toBe(true);
    });

    it('flags "Backend Debugging" only in headline, not in body', () => {
      const outputHeadline = makeOutput({
        headline: 'Backend Debugging | Node.js · TypeScript',
      });
      const violationsHeadline = service
        .check(outputHeadline)
        .violations.filter(
          (v) =>
            v.type === 'bop_pattern' && v.detail.includes('Backend Debugging'),
        );
      expect(violationsHeadline.length).toBeGreaterThan(0);

      // Same phrase in a body field — should NOT trigger the headline-only pattern.
      const outputBody = makeOutput({
        summary: ['Expert in Backend Debugging and production tracing.'],
      });
      const violationsBody = service
        .check(outputBody)
        .violations.filter(
          (v) =>
            v.type === 'bop_pattern' &&
            v.rule.includes('headline only') &&
            v.detail.includes('Backend Debugging'),
        );
      expect(violationsBody).toHaveLength(0);
    });

    it('flags audit-vocabulary word "exposure" in a bullet', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Built backend services.',
            'Gained exposure to serverless patterns.',
            'Debugged production issues.',
            'Wrote unit tests.',
            'Improved data integrity.',
            'Supported migrations.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(violations.some((v) => v.detail.includes('exposure'))).toBe(true);
    });

    it('flags "personal/portfolio" slash-pair in a bullet', () => {
      const output = makeOutput({
        summary: [
          'Strong backend skills backed by personal/portfolio projects.',
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('personal/portfolio')),
      ).toBe(true);
    });

    it('flags "AI Tooling Projects" in the headline', () => {
      const output = makeOutput({
        headline: 'Backend Developer | AI Tooling Projects',
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('AI Tooling Projects')),
      ).toBe(true);
    });

    it('flags "PR-based code review" in a bullet', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Built APIs.',
            'PR-based code review was part of the workflow.',
            'Debugged issues.',
            'Wrote tests.',
            'Maintained services.',
            'Supported data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'bop_pattern');
      expect(
        violations.some((v) => v.detail.includes('PR-based code review')),
      ).toBe(true);
    });
  });

  // ── AC #2: Banned claims from knowledge sources ────────────────────────────

  describe('AC#2 banned claims from knowledge sources', () => {
    const knowledgeSource = [
      'Do not claim:\n',
      '- ML/MLOps/model training\n',
      '- implemented Redis/BullMQ migration until it is actually implemented\n',
      '- sole architecture ownership\n',
    ].join('');

    it('passes when CV contains none of the banned claims', () => {
      const report = service.check(makeOutput(), [knowledgeSource]);
      const banned = report.violations.filter((v) => v.type === 'banned_claim');
      expect(banned).toHaveLength(0);
    });

    it('flags "ML/MLOps" claim in a summary line', () => {
      const output = makeOutput({
        summary: ['Experienced in ML/MLOps workflows and backend development.'],
      });
      const report = service.check(output, [knowledgeSource]);
      const banned = report.violations.filter((v) => v.type === 'banned_claim');
      expect(banned.some((v) => v.rule.includes('ML/MLOps'))).toBe(true);
    });

    it('flags "model training" split from slash-list', () => {
      const output = makeOutput({
        summary: ['Applied model training techniques in production pipelines.'],
      });
      const report = service.check(output, [knowledgeSource]);
      const banned = report.violations.filter((v) => v.type === 'banned_claim');
      expect(banned.some((v) => v.detail.includes('model training'))).toBe(
        true,
      );
    });

    it('does not run banned-claims check when no knowledge sources provided', () => {
      const output = makeOutput({
        summary: ['ML/MLOps and model training in production.'],
      });
      const report = service.check(output);
      const banned = report.violations.filter((v) => v.type === 'banned_claim');
      expect(banned).toHaveLength(0);
    });
  });

  // ── AC #3: Canonical names ─────────────────────────────────────────────────

  describe('AC#3 canonical names', () => {
    const knowledgeSource =
      'Use `GZIP` for the output. Also `CommerceTools` is the source.';

    it('passes when CV uses canonical capitalisation', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Processed GZIP output files in a data pipeline.',
            'Used CommerceTools as a source of truth.',
            'Built backend services.',
            'Wrote unit tests.',
            'Debugged production issues.',
            'Improved data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const report = service.check(output, [knowledgeSource]);
      const canonical = report.violations.filter(
        (v) => v.type === 'canonical_name',
      );
      expect(canonical).toHaveLength(0);
    });

    it('flags wrong capitalisation of "GZIP"', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Processed Gzip output files in a data pipeline.',
            'Built backend integrations.',
            'Debugged production issues.',
            'Wrote unit tests.',
            'Supported migrations.',
            'Maintained data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const report = service.check(output, [knowledgeSource]);
      const canonical = report.violations.filter(
        (v) => v.type === 'canonical_name',
      );
      expect(canonical.some((v) => v.detail.includes('GZIP'))).toBe(true);
    });

    it('flags wrong capitalisation of "CommerceTools"', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Used Commercetools as a product data source.',
            'Built backend integrations.',
            'Debugged production issues.',
            'Wrote unit tests.',
            'Supported migrations.',
            'Maintained data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const report = service.check(output, [knowledgeSource]);
      const canonical = report.violations.filter(
        (v) => v.type === 'canonical_name',
      );
      expect(canonical.some((v) => v.detail.includes('CommerceTools'))).toBe(
        true,
      );
    });

    it('does not run canonical-name check when no knowledge sources provided', () => {
      const output = makeOutput({
        experience: [
          makeEpam([
            'Used Commercetools as product data source.',
            'Built backend integrations.',
            'Debugged production issues.',
            'Wrote unit tests.',
            'Supported migrations.',
            'Maintained data integrity.',
          ]),
          makeFactorIt([
            'Backend logic.',
            'Database migrations.',
            'PostgreSQL queries.',
            'Data integrity.',
          ]),
          makeChi(['Node.js internship.']),
        ],
      });
      const report = service.check(output);
      const canonical = report.violations.filter(
        (v) => v.type === 'canonical_name',
      );
      expect(canonical).toHaveLength(0);
    });
  });

  // ── AC #4: Structural invariants ──────────────────────────────────────────

  describe('AC#4 structural invariants', () => {
    describe('current_work_block bullet count', () => {
      it('passes with 4 bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Built JobFlow — personal NestJS project for AI-assisted CV generation.',
            'Continued Python/FastAPI learning through personal projects.',
            'Volunteered at HEY, ALTER! Köln e.V.',
            'Supported small Node.js/React improvements on an independent basis.',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter((v) => v.type === 'structural');
        expect(
          violations.some((v) =>
            v.rule.includes('current_work_block bullet count'),
          ),
        ).toBe(false);
      });

      it('passes with 5 bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Built JobFlow — personal NestJS project for AI-assisted CV generation.',
            'Continued Python/FastAPI learning through personal projects.',
            'Volunteered at HEY, ALTER! Köln e.V.',
            'Supported small Node.js/React improvements on an independent basis.',
            'Explored LangGraph basics in a personal learning project.',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter((v) => v.type === 'structural');
        expect(
          violations.some((v) =>
            v.rule.includes('current_work_block bullet count'),
          ),
        ).toBe(false);
      });

      it('flags fewer than 4 bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Built JobFlow — personal NestJS project.',
            'Continued learning.',
            'Volunteered.',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter((v) => v.type === 'structural');
        expect(
          violations.some((v) =>
            v.rule.includes('current_work_block bullet count'),
          ),
        ).toBe(true);
      });

      it('flags more than 5 bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Built JobFlow.',
            'Python/FastAPI learning.',
            'Volunteered.',
            'Small freelance tasks.',
            'Extra bullet A.',
            'Extra bullet B.',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter((v) => v.type === 'structural');
        expect(
          violations.some((v) =>
            v.rule.includes('current_work_block bullet count'),
          ),
        ).toBe(true);
      });
    });

    describe('JobFlow bullet count in current_work_block', () => {
      it('passes with exactly one JobFlow bullet', () => {
        const output = makeOutput();
        const violations = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.rule.includes('JobFlow bullet'),
          );
        expect(violations).toHaveLength(0);
      });

      it('flags zero JobFlow bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Continued Python/FastAPI learning.',
            'Volunteered at HEY, ALTER!',
            'Supported small freelance tasks.',
            'Explored LangGraph basics.',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.rule.includes('JobFlow bullet'),
          );
        expect(violations).toHaveLength(1);
      });

      it('flags two JobFlow bullets', () => {
        const output = makeOutput({
          cwbBullets: [
            'Built JobFlow — personal NestJS project for AI-assisted CV generation.',
            'Extended JobFlow with prompt versioning and artifact traceability features.',
            'Continued Python/FastAPI learning.',
            'Volunteered at HEY, ALTER!',
          ],
        });
        const violations = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.rule.includes('JobFlow bullet'),
          );
        expect(violations).toHaveLength(1);
      });
    });

    describe('EPAM bullet count', () => {
      it('passes with 6 bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.field.includes('experience[0]'),
          );
        expect(v).toHaveLength(0);
      });

      it('passes with 8 bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.field.includes('experience[0]'),
          );
        expect(v).toHaveLength(0);
      });

      it('flags fewer than 6 EPAM bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('EPAM'),
          );
        expect(v.length).toBeGreaterThan(0);
      });

      it('flags more than 8 EPAM bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('EPAM'),
          );
        expect(v.length).toBeGreaterThan(0);
      });
    });

    describe('Factor-IT bullet count', () => {
      it('passes with 3 bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('Factor'),
          );
        expect(v).toHaveLength(0);
      });

      it('passes with 5 bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('Factor'),
          );
        expect(v).toHaveLength(0);
      });

      it('flags fewer than 3 Factor-IT bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('Factor'),
          );
        expect(v.length).toBeGreaterThan(0);
      });

      it('flags more than 5 Factor-IT bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('Factor'),
          );
        expect(v.length).toBeGreaterThan(0);
      });
    });

    describe('CHI Software bullet count', () => {
      it('passes with 1 bullet', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('CHI'),
          );
        expect(v).toHaveLength(0);
      });

      it('passes with 2 bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b', 'b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('CHI'),
          );
        expect(v).toHaveLength(0);
      });

      it('flags more than 2 CHI bullets', () => {
        const output = makeOutput({
          experience: [
            makeEpam(['b', 'b', 'b', 'b', 'b', 'b']),
            makeFactorIt(['b', 'b', 'b', 'b']),
            makeChi(['b', 'b', 'b']),
          ],
        });
        const v = service
          .check(output)
          .violations.filter(
            (v) => v.type === 'structural' && v.detail.includes('CHI'),
          );
        expect(v.length).toBeGreaterThan(0);
      });
    });
  });

  // ── AC #5: Internal consistency ───────────────────────────────────────────

  describe('AC#5 internal consistency', () => {
    it('passes for consistent requirement_coverage', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Node.js backend',
            priority: 'must_have',
            evidence_selected: 'EPAM backend work',
            shown_in: 'experience[0].bullets[0]',
            strength: 'strong',
            reason_if_not_shown: null,
          },
          {
            requirement: 'TypeScript',
            priority: 'must_have',
            evidence_selected: 'None',
            shown_in: 'not_shown',
            strength: 'none',
            reason_if_not_shown: 'Not mentioned in the vacancy',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(violations).toHaveLength(0);
    });

    it('flags missing reason_if_not_shown when shown_in is "not_shown"', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Docker experience',
            priority: 'nice_to_have',
            evidence_selected: 'None',
            shown_in: 'not_shown',
            strength: 'none',
            reason_if_not_shown: null, // missing!
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(
        violations.some((v) => v.rule.includes('reason_if_not_shown required')),
      ).toBe(true);
    });

    it('flags reason_if_not_shown set when shown_in points to a real field', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Node.js',
            priority: 'must_have',
            evidence_selected: 'EPAM backend',
            shown_in: 'experience[0].bullets[0]',
            strength: 'strong',
            reason_if_not_shown: 'This should not be set',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(
        violations.some((v) =>
          v.rule.includes('reason_if_not_shown must be null'),
        ),
      ).toBe(true);
    });

    it('flags a shown_in path that does not resolve to any existing field', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Kafka experience',
            priority: 'nice_to_have',
            evidence_selected: 'None',
            shown_in: 'nonexistent_section[99].bullets[0]',
            strength: 'none',
            reason_if_not_shown: null,
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(
        violations.some((v) => v.rule.includes('shown_in must resolve')),
      ).toBe(true);
    });

    it('accepts top_skills as a valid shown_in path', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'TypeScript',
            priority: 'must_have',
            evidence_selected: 'Listed in top skills',
            shown_in: 'top_skills',
            strength: 'strong',
            reason_if_not_shown: null,
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(violations).toHaveLength(0);
    });

    it('accepts headline as a valid shown_in path', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Node.js backend engineer',
            priority: 'must_have',
            evidence_selected: 'Present in headline',
            shown_in: 'headline',
            strength: 'strong',
            reason_if_not_shown: null,
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'consistency');
      expect(violations).toHaveLength(0);
    });
  });

  // ── AC #6: Coverage gaps ──────────────────────────────────────────────────

  describe('AC#6 coverage gaps', () => {
    it('passes when all strong must-have requirements are shown', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Node.js',
            priority: 'must_have',
            evidence_selected: 'EPAM work',
            shown_in: 'experience[0].bullets[0]',
            strength: 'strong',
            reason_if_not_shown: null,
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'coverage_gap');
      expect(violations).toHaveLength(0);
    });

    it('flags a strong must-have left at not_shown', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Kubernetes',
            priority: 'must_have',
            evidence_selected: 'EPAM work — minimal',
            shown_in: 'not_shown',
            strength: 'strong',
            reason_if_not_shown: 'No production Kubernetes experience.',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'coverage_gap');
      expect(violations).toHaveLength(1);
      expect(violations[0].detail).toContain('strong');
    });

    it('flags a partial must-have left at not_shown', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'GraphQL schema design',
            priority: 'must_have',
            evidence_selected: 'EPAM BFF work',
            shown_in: 'not_shown',
            strength: 'partial',
            reason_if_not_shown: 'Worked on BFF changes but not schema design.',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'coverage_gap');
      expect(violations).toHaveLength(1);
      expect(violations[0].detail).toContain('partial');
    });

    it('does not flag a transferable requirement at not_shown', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Machine learning pipelines',
            priority: 'nice_to_have',
            evidence_selected: 'FastAPI personal project',
            shown_in: 'not_shown',
            strength: 'transferable',
            reason_if_not_shown: 'No direct ML experience.',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'coverage_gap');
      expect(violations).toHaveLength(0);
    });

    it('does not flag a none-strength requirement at not_shown', () => {
      const output = makeOutput({
        requirementCoverage: [
          {
            requirement: 'Kafka',
            priority: 'nice_to_have',
            evidence_selected: 'None',
            shown_in: 'not_shown',
            strength: 'none',
            reason_if_not_shown: 'No Kafka experience.',
          },
        ],
      });
      const violations = service
        .check(output)
        .violations.filter((v) => v.type === 'coverage_gap');
      expect(violations).toHaveLength(0);
    });
  });

  // ── Regression baseline ────────────────────────────────────────────────────
  // This test represents the "current state" of CV quality for a realistic
  // fixture with known violations. If the service behavior changes, this test
  // will fail, alerting that the baseline needs deliberate review.

  describe('regression baseline', () => {
    /**
     * Realistic CV fixture with a deliberately injected set of violations.
     * The expected violations below document the "current baseline" (ISSUE-282).
     */
    const baselineOutput: TargetedCvContentOutput = makeOutput({
      headline: 'Backend Developer | Node.js · TypeScript · Azure',
      summary: [
        'Backend-focused Software Engineer with strong commercial Node.js/TypeScript experience.',
        'Continued active software development after relocation to Germany.',
      ],
      cwbBullets: [
        // Good: exactly one JobFlow bullet
        'Built JobFlow CV Pipeline — a personal NestJS/TypeScript portfolio project for AI-assisted CV generation, with evidence-based claim validation, prompt versioning and artifact traceability.',
        'Continued Python/FastAPI backend learning through personal projects.',
        'Volunteered as IT Technician at HEY, ALTER! Köln e.V.',
        'Supported small Node.js/React improvements on an independent basis.',
      ],
      experience: [
        makeEpam([
          'Built a serverless product-sync microservice-based Azure serverless architecture for ProductsUp integration.',
          'Designed and maintained backend API integrations for catalog data flows.',
          'Implemented maintained/contributed to legacy data pipeline services.',
          'Handled async processing, batching and retry logic in backend workflows.',
          'Wrote Jest-tested services for the product synchronization flow.',
          'Supported production debugging and deployment coordination with DevOps.',
        ]),
        makeFactorIt([
          'Developed complex financial business logic in a production PHP backend.',
          'Maintained and extended legacy backend systems for improved reliability.',
          'Wrote database migrations and ensured data integrity in PostgreSQL.',
          'Managed backend API changes and PR-based code review participation.',
        ]),
        makeChi([
          'Completed Node.js internship tasks and basic backend training.',
        ]),
      ],
      requirementCoverage: [
        {
          requirement: 'Node.js backend',
          priority: 'must_have',
          evidence_selected: 'EPAM backend work',
          shown_in: 'experience[0].bullets[0]',
          strength: 'strong',
          reason_if_not_shown: null,
        },
        {
          requirement: 'Kubernetes orchestration',
          priority: 'must_have',
          evidence_selected: 'None — no production Kubernetes experience',
          shown_in: 'not_shown',
          strength: 'strong',
          reason_if_not_shown: 'No production Kubernetes experience.',
        },
        {
          requirement: 'Docker',
          priority: 'nice_to_have',
          evidence_selected: 'JobFlow personal project',
          shown_in: 'current_work_block.bullets[0]',
          strength: 'partial',
          reason_if_not_shown: null,
        },
      ],
    });

    it('produces the expected violation types for the baseline fixture', () => {
      const report = service.check(baselineOutput);
      const byType = (t: CvViolation['type']) =>
        report.violations.filter((v) => v.type === t);

      // BOP patterns detected:
      // - "continued active software development" in summary[1]
      // - "microservice-based Azure serverless architecture" in experience[0].bullets[0]
      // - "maintained/contributed" in experience[0].bullets[2]
      // - "Jest-tested services" in experience[0].bullets[4]
      // - "PR-based code review" in experience[3].bullets[3]
      // - "artifact traceability" in cwb bullet
      // - "evidence-based claim validation" in cwb bullet
      // - "evidence" (audit vocab) in cwb bullet
      expect(byType('bop_pattern').length).toBeGreaterThan(0);

      // Coverage gap: Kubernetes (strength=strong, shown_in=not_shown)
      expect(byType('coverage_gap').length).toBeGreaterThanOrEqual(1);

      // No banned-claims or canonical-name violations (no knowledge sources passed)
      expect(byType('banned_claim')).toHaveLength(0);
      expect(byType('canonical_name')).toHaveLength(0);

      // No consistency violations in the baseline
      expect(byType('consistency')).toHaveLength(0);

      // No structural violations: cwb=4, EPAM=6, Factor-IT=4, CHI=1, 1 JobFlow
      expect(byType('structural')).toHaveLength(0);
    });

    it('baseline BOP violations include specific known patterns', () => {
      const report = service.check(baselineOutput);
      const bopDetails = report.violations
        .filter((v) => v.type === 'bop_pattern')
        .map((v) => v.detail);

      expect(
        bopDetails.some((d) =>
          d.includes('continued active software development'),
        ),
      ).toBe(true);
      expect(
        bopDetails.some((d) =>
          d.includes('microservice-based Azure serverless architecture'),
        ),
      ).toBe(true);
      expect(bopDetails.some((d) => d.includes('maintained/contributed'))).toBe(
        true,
      );
      expect(bopDetails.some((d) => d.includes('Jest-tested services'))).toBe(
        true,
      );
      expect(bopDetails.some((d) => d.includes('artifact traceability'))).toBe(
        true,
      );
    });
  });

  // ── Regression baseline against real generated CVs ────────────────────────
  // Reads the six golden-dataset CV samples from
  // project-management/golden-dataset/generated-cv-samples/ and runs the
  // guard against each one without knowledge-source texts (checks #1, #4, #5
  // and #6 only). Expected counts are the ISSUE-282 baseline — any change to
  // these numbers means the service behaviour has regressed or deliberately
  // changed and this baseline must be reviewed.

  describe('regression baseline against real generated CVs', () => {
    const samplesDir = path.join(
      __dirname,
      '../../../../project-management/golden-dataset/generated-cv-samples',
    );

    function loadSample(filename: string): TargetedCvContentOutput {
      const raw = JSON.parse(
        fs.readFileSync(path.join(samplesDir, filename), 'utf-8'),
      ) as Record<string, unknown>;
      // requirement_coverage and manual_note_forced_claims are absent in some
      // older golden-dataset files — default to empty so the service does not
      // throw on .entries() below.
      return {
        ...raw,
        requirement_coverage: (raw['requirement_coverage'] as unknown[]) ?? [],
        manual_note_forced_claims:
          (raw['manual_note_forced_claims'] as unknown[]) ?? [],
      } as unknown as TargetedCvContentOutput;
    }

    function countByType(report: CvQualityReport): {
      bop: number;
      structural: number;
      consistency: number;
      coverage_gap: number;
    } {
      const n = (t: CvViolation['type']) =>
        report.violations.filter((v) => v.type === t).length;
      return {
        bop: n('bop_pattern'),
        structural: n('structural'),
        consistency: n('consistency'),
        coverage_gap: n('coverage_gap'),
      };
    }

    // bjak — 9 BOP:
    //   stable_intro: "continued active software development" + "structured upskilling"
    //   JobFlow bullet: "evidence-based claim validation" + "human-in-the-loop AI
    //     workflow concepts" + "artifact traceability" + "backend HTML-to-PDF export
    //     without AI token usage" (4 BOP patterns) + "evidence" (audit vocab, 1)
    //   summary[3]: "personal-project evidence" (audit vocab "evidence", 1)
    //   EPAM bullet: "maintained/contributed" (1)
    it('bjak_20260823_full_stack_engineer: bop=9, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('bjak_20260823_full_stack_engineer.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 9,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    // cello — 8 BOP (same common content as bjak except no "evidence" in summary):
    //   stable_intro: "continued active software development" + "structured upskilling" (2)
    //   JobFlow bullet: 4 BOP patterns + audit "evidence" (5)
    //   EPAM bullet: "maintained/contributed" (1)
    it('cello_20260823_software_engineer: bop=8, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('cello_20260823_software_engineer.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 8,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    // galaktica — 1 BOP only:
    //   Different stable_intro (no BOP patterns)
    //   Different JobFlow bullet (no BOP patterns, no "evidence")
    //   EPAM bullet: "maintained/contributed" (1)
    it('galaktica_20260824_full_stack_developer: bop=1, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('galaktica_20260824_full_stack_developer.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 1,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    // jobgether — 8 BOP (same common content as cello):
    //   stable_intro: "continued active software development" + "structured upskilling" (2)
    //   JobFlow bullet: 4 BOP patterns + audit "evidence" (5)
    //   EPAM bullet: "maintained/contributed" (1)
    it('jobgether_20260823_backend_developer: bop=8, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('jobgether_20260823_backend_developer.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 8,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    // motion — 8 BOP (same common content as cello):
    //   stable_intro: "continued active software development" + "structured upskilling" (2)
    //   JobFlow bullet: 4 BOP patterns + audit "evidence" (5)
    //   EPAM bullet: "maintained/contributed" (1)
    it('motion_20260823_senior_backend: bop=8, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('motion_20260823_senior_backend.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 8,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    // pixel — 4 BOP (different stable_intro, shorter JobFlow bullet):
    //   Different stable_intro: 0 BOP
    //   JobFlow bullet: "evidence-based claim validation" + "artifact traceability" (2 BOP)
    //     + audit "evidence" (1)
    //   EPAM bullet: "maintained/contributed" (1)
    it('pixel_systems_20260825_ai_implementation_specialist: bop=4, no structural/consistency/coverage violations', () => {
      const report = service.check(
        loadSample('pixel_systems_20260825_ai_implementation_specialist.json'),
      );
      expect(countByType(report)).toEqual({
        bop: 4,
        structural: 0,
        consistency: 0,
        coverage_gap: 0,
      });
    });

    it('all six samples parse and run without throwing', () => {
      const files = fs
        .readdirSync(samplesDir)
        .filter((f) => f.endsWith('.json'));
      expect(files).toHaveLength(6);
      for (const file of files) {
        expect(() => service.check(loadSample(file))).not.toThrow();
      }
    });
  });
});
