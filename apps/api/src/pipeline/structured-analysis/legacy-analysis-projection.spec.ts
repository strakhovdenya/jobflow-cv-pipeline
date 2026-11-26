import { PortfolioProject } from '../../evidence/career-registry.parser';
import { validateVacancyAnalysisJson } from '../schemas/vacancy-analysis.schema';
import { AnalysisDecision } from './analysis-decision.schema';
import { runDecisionPolicy } from './decision-policy';
import { buildEvidenceCatalog } from './evidence-catalog';
import { FitAssessment } from './fit-assessment.schema';
import {
  LegacyProjectionInput,
  USER_FORCED_STATUS,
  findKeysOutsideLegacySchema,
  projectToLegacyVacancyAnalysis,
} from './legacy-analysis-projection';
import { VacancyRequirements } from './vacancy-requirements.schema';

const SNAPSHOT = 'snapshot-a';
const VACANCY =
  'Required: Node.js services. Required: SQL tuning. Nice: Cloud. Bonus: talks. Fluent German for client calls is required.';

const project: PortfolioProject = {
  id: 'alpha-service',
  title: 'Alpha Service',
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
  allowedWording: ['Sample wording'],
  prohibitedClaims: [],
};

const catalog = buildEvidenceCatalog({
  snapshotId: SNAPSHOT,
  careerCasesText:
    '# Case 1 — Example commercial work\n## 1. Context\n## 2. Result\n# Case 2 — Example cloud work\n## 1. Context\n',
  projects: [project],
  credentials: [],
});

const commercial = (
  ref: string,
  strength: 'strong' | 'partial' = 'strong',
) => ({
  ref,
  snapshot_id: SNAPSHOT,
  strength,
  provenance: 'commercial' as const,
  offered_for_display: true,
});

const requirementsFixture = (): VacancyRequirements => ({
  contract_version: '1.0',
  seniority: { level: 'unspecified', quote: null },
  requirements: [
    {
      id: 'R1',
      kind: 'must_have',
      text: 'Node.js services',
      quote: 'Node.js services',
    },
    { id: 'R2', kind: 'must_have', text: 'SQL tuning', quote: 'SQL tuning' },
    { id: 'R3', kind: 'nice_to_have', text: 'Cloud', quote: 'Cloud' },
    { id: 'R4', kind: 'wishlist', text: 'Talks', quote: 'talks' },
  ],
  facts: [],
  languages: [],
  hidden_role_logic: ['Production ownership of integrations'],
});

const judgement = () => ({ value: false, reason: '', cited_ids: [] });

const assessmentFixture = (): FitAssessment => ({
  contract_version: '1.0',
  snapshot_id: SNAPSHOT,
  coverage: [
    {
      requirement_id: 'R1',
      is_core: true,
      basis: 'commercial',
      evidence: [
        commercial('case:1#section-1'),
        commercial('case:1#section-2'),
      ],
      notes: 'Main stack',
    },
    {
      requirement_id: 'R2',
      is_core: true,
      basis: 'none',
      evidence: [
        {
          ref: 'manual_note:note-1',
          snapshot_id: null,
          strength: 'strong',
          provenance: 'manual_note',
          offered_for_display: true,
        },
      ],
      notes: 'Forced by the manual note',
    },
    {
      requirement_id: 'R3',
      is_core: false,
      basis: 'commercial_transferable',
      evidence: [commercial('case:2#section-1', 'partial')],
      notes: '',
    },
    {
      requirement_id: 'R4',
      is_core: false,
      basis: 'none',
      evidence: [],
      notes: 'Optional',
    },
  ],
  eligibility: {
    work_authorisation: { value: 'compatible', note: '' },
    remote_location: { value: 'undetermined', note: 'Office city not stated' },
    mandatory_language: { value: 'compatible', note: '' },
    other: [],
  },
  risks: [
    {
      cause_id: 'K1',
      category: 'core_stack',
      level: 'high',
      language: null,
      requirement_ids: ['R2'],
      reason: 'No SQL tuning evidence',
    },
    {
      cause_id: 'G1',
      category: 'language',
      level: 'medium',
      language: 'german',
      requirement_ids: [],
      reason: 'German for internal meetings',
    },
  ],
  score_deductions: [{ cause_id: 'K1', category: 'tech_stack', points: 6 }],
  category_scores: {
    tech_stack: 18,
    production_backend: 12,
    domain_product: 5,
    seniority: 14,
    language_location: 12,
    evidence_quality: 10,
  },
  judgements: {
    requires_overstretch: judgement(),
    ownership_unsupported: judgement(),
    core_stack_close: { value: true, reason: 'Close', cited_ids: ['R1'] },
    main_risk_manageable: {
      value: true,
      reason: 'Manageable',
      cited_ids: ['K1'],
    },
    reached_by_core_gaps: judgement(),
    product_evidence_strong: judgement(),
    all_fits_very_strong: judgement(),
    strategic_exception: judgement(),
    role_family: { value: 'backend', reason: '', cited_ids: [] },
    defining_requirement: { requirement_id: null, reason: '', cited_ids: [] },
  },
  quality_score: 82,
  summary: 'Backend role with one forced claim.',
  top_reasons: ['Strong Node.js evidence'],
  recommended_next_action: 'Pause for manual review before deciding',
  evidence_risks: [{ claim: 'SQL tuning', status: USER_FORCED_STATUS }],
  manual_note_forced_claims: [
    { location: 'must_have[1]', text: 'I tuned SQL queries' },
  ],
});

const decide = (
  requirements: VacancyRequirements,
  assessment: FitAssessment,
  advisory: 'apply' | 'maybe' | 'skip' = 'apply',
): AnalysisDecision =>
  runDecisionPolicy(
    { vacancyText: VACANCY, requirements, assessment, catalog },
    advisory,
  );

const inputFixture = (): LegacyProjectionInput => {
  const requirements = requirementsFixture();
  const assessment = assessmentFixture();
  return {
    workspace: {
      company_name_original: 'Example GmbH',
      company_slug: 'example_gmbh',
      role_title_original: 'Backend Engineer',
      role_slug: 'backend_engineer',
    },
    requirements,
    assessment,
    decision: decide(requirements, assessment),
  };
};

// Every key path of a JSON value, with array positions written as [].
const keyPaths = (value: unknown, path = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => keyPaths(item, `${path}[]`));
  }
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return [childPath, ...keyPaths(child, childPath)];
  });
};

// Written out from `VacancyAnalysis` in `vacancy-analysis.schema.ts`, independently of the
// projection's own key tree.
const LEGACY_KEY_PATHS = new Set([
  'schema_version',
  'step',
  'workspace',
  'workspace.company_name_original',
  'workspace.company_slug',
  'workspace.role_title_original',
  'workspace.role_slug',
  'decision',
  'score',
  'quality_score',
  'summary',
  'must_have',
  ...['requirement', 'match_level', 'evidence_status', 'risk', 'notes'].flatMap(
    (key) => [`must_have[].${key}`, `nice_to_have[].${key}`],
  ),
  'nice_to_have',
  'wishlist',
  'wishlist[].requirement',
  'wishlist[].note',
  'hidden_role_logic',
  'tech_stack_match',
  'tech_stack_match.strong',
  'tech_stack_match.transferable',
  'tech_stack_match.weak_or_missing',
  'language_risk',
  'language_risk.risk_level',
  'language_risk.notes',
  'location_risk',
  'location_risk.risk_level',
  'location_risk.notes',
  'evidence_risks',
  'evidence_risks[].claim',
  'evidence_risks[].status',
  'top_reasons',
  'recommended_next_action',
  'manual_review_required',
  'manual_note_forced_claims',
  'manual_note_forced_claims[].location',
  'manual_note_forced_claims[].text',
]);

describe('projection to the legacy 01 vacancy analysis', () => {
  it('projects to a valid legacy vacancy analysis', () => {
    const input = inputFixture();
    const projected = projectToLegacyVacancyAnalysis(input);

    const validation = validateVacancyAnalysisJson(JSON.stringify(projected));
    expect(validation.success).toBe(true);

    // decision and score come from 01c, not from the advisory decision
    expect(input.decision.decision).toBe('maybe');
    expect(input.decision.advisory_decision).toBe('apply');
    expect(projected.decision).toBe('maybe');
    expect(projected.score).toBe(input.decision.score);
    expect(projected.manual_review_required).toBe(true);

    // must-have rows from 01a, in 01a order, with the map's evidence
    expect(projected.must_have).toEqual([
      {
        requirement: 'Node.js services',
        match_level: 'strong',
        evidence_status: 'supported',
        risk: 'low',
        notes: 'Main stack',
      },
      {
        requirement: 'SQL tuning',
        match_level: 'none',
        evidence_status: USER_FORCED_STATUS,
        risk: 'high',
        notes: 'Forced by the manual note',
      },
    ]);
    expect(projected.nice_to_have).toEqual([
      {
        requirement: 'Cloud',
        match_level: 'partial',
        evidence_status: 'supported',
        risk: 'low',
        notes: '',
      },
    ]);
    expect(projected.wishlist).toEqual([
      { requirement: 'Talks', note: 'Optional' },
    ]);
    expect(projected.hidden_role_logic).toEqual([
      'Production ownership of integrations',
    ]);
    expect(projected.manual_note_forced_claims).toEqual([
      { location: 'must_have[1]', text: 'I tuned SQL queries' },
    ]);
    expect(projected.tech_stack_match).toEqual({
      strong: ['Node.js services'],
      transferable: ['Cloud'],
      weak_or_missing: ['SQL tuning'],
    });
    expect(projected.language_risk).toEqual({
      risk_level: 'medium',
      notes: 'German for internal meetings',
    });
    expect(projected.location_risk).toEqual({
      risk_level: 'unknown',
      notes: 'Undetermined — manual review. Office city not stated',
    });
    expect(projected.workspace).toEqual(input.workspace);
    expect(projected.quality_score).toBe(82);
  });

  it('marks an H1 decision as a language blocker', () => {
    const requirements = requirementsFixture();
    requirements.languages.push({
      id: 'L1',
      language: 'german',
      level: 'fluent',
      need: 'mandatory',
      usage: 'external',
      quote: 'Fluent German for client calls is required',
    });
    const assessment = assessmentFixture();
    const decision = decide(requirements, assessment);
    expect(decision.deciding_rule).toBe('H1');
    const projected = projectToLegacyVacancyAnalysis({
      ...inputFixture(),
      requirements,
      assessment,
      decision,
    });
    expect(projected.decision).toBe('skip');
    expect(projected.language_risk.risk_level).toBe('blocker');
  });

  it('emits no key outside the legacy schema', () => {
    const input = inputFixture();
    const extra = { experimental_note: 'x', nested: { deep: [{ id: 1 }] } };
    const withExtras = JSON.parse(
      JSON.stringify(input),
    ) as LegacyProjectionInput & Record<string, unknown>;
    Object.assign(withExtras.requirements, extra);
    Object.assign(withExtras.requirements.requirements[0], extra);
    Object.assign(withExtras.assessment, extra);
    Object.assign(withExtras.assessment.coverage[0], extra);
    Object.assign(withExtras.assessment.coverage[0].evidence[0], extra);
    Object.assign(withExtras.assessment.risks[0], extra);
    Object.assign(withExtras.assessment.evidence_risks[0], extra);
    Object.assign(withExtras.assessment.manual_note_forced_claims[0], extra);
    Object.assign(withExtras.decision, extra);
    Object.assign(withExtras.decision.counts, extra);
    Object.assign(withExtras.workspace, extra);

    const projected = projectToLegacyVacancyAnalysis(withExtras);
    const outside = keyPaths(projected).filter(
      (path) => !LEGACY_KEY_PATHS.has(path),
    );
    expect(outside).toEqual([]);
    expect(findKeysOutsideLegacySchema(projected)).toEqual([]);
    // the experimental contracts' own fields never reach the legacy shape
    const text = JSON.stringify(projected);
    for (const marker of [
      'experimental_note',
      'trace',
      'deciding_rule',
      'snapshot',
      'borderline',
    ]) {
      expect({ marker, found: text.includes(marker) }).toEqual({
        marker,
        found: false,
      });
    }
  });

  it('reports every key outside the legacy schema at any depth', () => {
    const projected = projectToLegacyVacancyAnalysis(inputFixture());
    const polluted = JSON.parse(JSON.stringify(projected));
    polluted.deciding_rule = 'B2';
    polluted.workspace.snapshot_id = SNAPSHOT;
    polluted.must_have[1].evidence = [];
    polluted.manual_note_forced_claims[0].provenance = 'manual_note';
    polluted.top_reasons = [{ reason: 'object where a string belongs' }];
    expect(findKeysOutsideLegacySchema(polluted)).toEqual([
      'workspace.snapshot_id',
      'must_have[1].evidence',
      'top_reasons[0] (structured value where a leaf is expected)',
      'manual_note_forced_claims[0].provenance',
      'deciding_rule',
    ]);
  });
});
